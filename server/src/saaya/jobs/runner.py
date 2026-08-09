"""The Job execution graph (ADR-005): plan, execute step by step, finalize.
Checkpointed under `job:<id>` so a worker restart resumes mid-run; budgets
and cancellation are checked at every step boundary, deterministically."""

import json
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, TypedDict, cast

from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.graph import END, START, StateGraph

from saaya.jobs import states
from saaya.jobs.store import ApprovalStore, JobStore, JobView
from saaya.jobs.tools import settle_decided_approvals
from saaya.jobs.workspace import job_workspace, list_files

# A step is data: what to do, and which files must exist afterwards. The
# creates list is the deterministic done-check; there are no judge models.
# The executor's fourth argument is the settled-approvals note (F1): what the
# runner already ran on the owner's behalf before this invocation.
PlanStep = dict[str, Any]
Planner = Callable[[str, Path], Awaitable[list[PlanStep]]]
Executor = Callable[[PlanStep, Path, JobView, str], Awaitable[str]]


class JobRunState(TypedDict, total=False):
    plan: list[PlanStep]
    current_step: int


class StepFailed(Exception):
    pass


class JobHalt(Exception):
    """Stops the graph mid-superstep on failure, block, or cancel. The
    checkpoint stays pending at the halted node, so a later retry resumes by
    re-running exactly that step instead of finding an ended graph."""

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


class JobRunner:
    def __init__(
        self,
        store: JobStore,
        checkpointer: BaseCheckpointSaver[Any],
        workspace_root: Path,
        planner: Planner,
        executor: Executor,
        approvals: ApprovalStore | None = None,
    ) -> None:
        self._store = store
        self._checkpointer = checkpointer
        self._root = workspace_root
        self._planner = planner
        self._executor = executor
        self._approvals = approvals

    def _graph(self, job_id: str) -> Any:
        store = self._store
        planner = self._planner
        executor = self._executor
        root = self._root
        approvals = self._approvals

        async def plan_node(state: JobRunState) -> JobRunState:
            job = await store.get(job_id)
            assert job is not None
            if state.get("plan"):
                # Resuming past planning; only the row transition may be owed.
                if job.state == states.PLANNING:
                    await store.transition(job_id, states.RUNNING)
                return {}
            workspace = job_workspace(root, job.workspace)
            steps = await planner(job.goal, workspace)
            await store.append_event(job_id, "plan_created", {"steps": steps, "count": len(steps)})
            if job.state == states.PLANNING:
                await store.transition(job_id, states.RUNNING)
            return {"plan": steps, "current_step": 0}

        async def execute_node(state: JobRunState) -> JobRunState:
            job = await store.get(job_id)
            assert job is not None
            if job.state == states.CANCELLED:
                raise JobHalt(states.CANCELLED)
            index = state.get("current_step", 0)
            plan = state.get("plan", [])
            if index >= job.step_budget:
                await store.append_event(
                    job_id,
                    "budget_exhausted",
                    {"kind": "steps", "budget": job.step_budget, "completed": index},
                )
                await store.transition(job_id, states.BLOCKED)
                raise JobHalt(states.BLOCKED)
            if job.started_at is not None:
                started = datetime.fromisoformat(job.started_at)
                elapsed = (datetime.now(UTC) - started).total_seconds()
                if elapsed > job.wall_clock_budget_s:
                    await store.append_event(
                        job_id,
                        "budget_exhausted",
                        {"kind": "wall_clock", "budget_s": job.wall_clock_budget_s},
                    )
                    await store.transition(job_id, states.BLOCKED)
                    raise JobHalt(states.BLOCKED)
            step = plan[index]
            workspace = job_workspace(self._root, job.workspace)
            await store.append_event(
                job_id,
                "step_started",
                {"n": index + 1, "of": len(plan), "intent": step.get("intent", "")},
            )
            try:
                # Owner decisions are honored here, in the runner, before the
                # model runs: an approved command is executed and recorded
                # deterministically, so a resumed step cannot skip it however
                # the model behaves (F1). The note tells the executor what
                # already ran.
                note = ""
                if approvals is not None:
                    note = await settle_decided_approvals(workspace, store, approvals, job_id)
                summary = await executor(step, workspace, job, note)
                if approvals is not None and await approvals.pending(job_id) is not None:
                    # The step asked for a fresh gated action; hold here. On
                    # resume the decision is settled deterministically above,
                    # then this step re-runs (ADR-007).
                    await store.transition(job_id, states.WAITING_APPROVAL)
                    raise JobHalt(states.WAITING_APPROVAL)
                missing = [
                    path for path in step.get("creates", []) if not (workspace / path).exists()
                ]
                if missing:
                    raise StepFailed(f"step did not create: {', '.join(missing)}")
            except JobHalt:
                raise
            except Exception as error:
                await store.append_event(
                    job_id,
                    "step_failed",
                    {"n": index + 1, "error": str(error)},
                )
                await store.transition(job_id, states.FAILED, error=str(error))
                raise JobHalt(states.FAILED) from error
            await store.append_event(
                job_id,
                "step_completed",
                {"n": index + 1, "summary": summary},
            )
            return {"current_step": index + 1}

        async def finalize_node(state: JobRunState) -> JobRunState:
            job = await store.get(job_id)
            assert job is not None
            workspace = job_workspace(root, job.workspace)
            await store.append_event(
                job_id,
                "job_completed",
                {
                    "steps_completed": state.get("current_step", 0),
                    "files": list_files(workspace),
                },
            )
            await store.transition(job_id, states.COMPLETED)
            return {}

        def route(state: JobRunState) -> str:
            if state.get("current_step", 0) >= len(state.get("plan", [])):
                return "finalize"
            return "execute"

        graph = StateGraph(JobRunState)
        graph.add_node("plan", plan_node)  # pyright: ignore[reportUnknownMemberType]
        graph.add_node("execute", execute_node)  # pyright: ignore[reportUnknownMemberType]
        graph.add_node("finalize", finalize_node)  # pyright: ignore[reportUnknownMemberType]
        graph.add_edge(START, "plan")
        graph.add_conditional_edges("plan", route, {"execute": "execute", "finalize": "finalize"})
        graph.add_conditional_edges(
            "execute", route, {"execute": "execute", "finalize": "finalize"}
        )
        graph.add_edge("finalize", END)
        return graph.compile(checkpointer=self._checkpointer)  # pyright: ignore[reportUnknownMemberType]

    async def run(self, job: JobView) -> None:
        """Drive a job to a terminal or waiting state. Fresh jobs start the
        graph; anything with a checkpoint resumes exactly where it stopped."""
        graph = self._graph(job.id)
        config = {"configurable": {"thread_id": f"job:{job.id}"}}
        snapshot = await graph.aget_state(config)
        if job.state in (states.RETRYING, states.WAITING_APPROVAL):
            await self._store.transition(job.id, states.RUNNING)
        try:
            if snapshot.values:
                await graph.ainvoke(None, config=config)
            else:
                await graph.ainvoke(JobRunState(plan=[], current_step=0), config=config)
        except JobHalt:
            # The halt already wrote its events and transition; the
            # checkpoint stays pending at the halted step for retry.
            pass


def parse_plan(raw: str) -> list[PlanStep]:
    """Deterministic validation of a model-produced plan: JSON, a non-empty
    list, each step an object with a non-empty intent and a creates list of
    relative paths. Anything else is rejected loudly."""
    parsed: object = json.loads(raw)
    if isinstance(parsed, dict):
        parsed = cast("dict[str, object]", parsed).get("steps")
    if not isinstance(parsed, list) or not parsed:
        raise ValueError("plan must be a non-empty list of steps")
    steps: list[PlanStep] = []
    for item in cast("list[object]", parsed)[:8]:
        if not isinstance(item, dict):
            raise ValueError("every step must be an object")
        entry = cast("dict[str, object]", item)
        intent = str(entry.get("intent", "")).strip()
        if not intent:
            raise ValueError("every step needs an intent")
        creates_raw = entry.get("creates", [])
        if not isinstance(creates_raw, list):
            raise ValueError("creates must be a list")
        creates: list[str] = []
        for path_obj in cast("list[object]", creates_raw):
            path = str(path_obj).strip()
            # An empty or trailing-slash entry is unambiguously not a file
            # and fails loudly at planning time (F3). Dotfiles like
            # .gitignore stay legal; the runtime done-check uses exists(),
            # so a directory the work genuinely produces still validates.
            if not path or path.endswith("/"):
                raise ValueError(f"creates entries must be file paths: {path!r}")
            creates.append(path)
        steps.append({"intent": intent, "creates": creates})
    return steps
