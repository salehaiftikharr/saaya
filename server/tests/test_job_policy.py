"""Command policy, gated approvals, artifacts, and the chat bridge. The
approval tests drive the real tool closures against the real stores, because
the enforcement point is the tool, not any client."""

import os
from pathlib import Path

from langchain_core.tools import BaseTool
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from sqlalchemy.ext.asyncio import AsyncEngine

from saaya.jobs import states
from saaya.jobs.commands import evaluate, run_command
from saaya.jobs.runner import JobRunner, PlanStep
from saaya.jobs.store import ApprovalStore, JobStore, JobView
from saaya.jobs.tools import APPROVAL_WAIT_TEXT, build_job_tools, make_start_job_tool
from saaya.jobs.workspace import job_workspace

# --- policy verdicts ------------------------------------------------------


def test_policy_allows_reads_and_python() -> None:
    assert evaluate(["ls", "-la"]).kind == "allowed"
    assert evaluate(["git", "status"]).kind == "allowed"
    assert evaluate(["python3", "-c", "print(1)"]).kind == "allowed"


def test_policy_gates_git_writes() -> None:
    assert evaluate(["git", "apply", "fix.patch"]).kind == "gated"
    assert evaluate(["git", "add", "notes.md"]).kind == "gated"
    assert evaluate(["git", "init"]).kind == "gated"


def test_policy_refuses_off_list_network_and_injection() -> None:
    assert evaluate(["curl", "example.test"]).kind == "refused"
    assert evaluate(["git", "fetch"]).kind == "refused"
    assert evaluate(["git", "clone", "somewhere"]).kind == "refused"
    assert evaluate(["git", "-c", "core.pager=x", "status"]).kind == "refused"
    assert evaluate(["cat", "/etc/hosts"]).kind == "refused"
    assert evaluate(["cat", "a/../../b"]).kind == "refused"
    assert evaluate(["/usr/bin/python3", "x.py"]).kind == "refused"
    assert evaluate([]).kind == "refused"


def test_run_command_executes_in_workspace_with_scrubbed_env(tmp_path: Path) -> None:
    ws = job_workspace(tmp_path, "cmd")
    os.environ["SAAYA_TEST_CANARY"] = "leaky"
    try:
        result = run_command(
            ws,
            [
                "python3",
                "-c",
                "import os; print(os.getcwd()); "
                "print(os.environ.get('SAAYA_TEST_CANARY', 'absent'))",
            ],
        )
    finally:
        del os.environ["SAAYA_TEST_CANARY"]
    assert result.exit_code == 0
    lines = result.stdout.strip().splitlines()
    assert lines[0] == str(ws.resolve())
    assert lines[1] == "absent", "server env must not reach commands"


# --- gated approval flow through the real tool ---------------------------


def _tool(tools: list[BaseTool], name: str) -> BaseTool:
    return next(tool for tool in tools if tool.name == name)


async def test_gated_command_requests_approval_then_runs(
    engine: AsyncEngine, tmp_path: Path
) -> None:
    store = JobStore(engine)
    approvals = ApprovalStore(engine)
    job = await store.create(goal="gated flow")
    await store.transition(job.id, states.PLANNING)
    await store.transition(job.id, states.RUNNING)
    ws = job_workspace(tmp_path, job.workspace)
    tools = build_job_tools(ws, store, approvals, job.id)
    run = _tool(tools, "run_command")

    first = await run.ainvoke({"command": ["git", "add", "notes.md"]})  # type: ignore[attr-defined]
    assert first == APPROVAL_WAIT_TEXT
    pending = await approvals.pending(job.id)
    assert pending is not None and "git add notes.md" in pending.preview

    # Asking again while pending does not duplicate the request.
    again = await run.ainvoke({"command": ["git", "add", "notes.md"]})  # type: ignore[attr-defined]
    assert again == APPROVAL_WAIT_TEXT
    assert len(await approvals.for_job(job.id)) == 1

    decided = await approvals.decide(pending.id, "approved")
    assert decided is not None
    assert await approvals.decide(pending.id, "rejected") is None, "one decision only"

    result = await run.ainvoke({"command": ["git", "add", "notes.md"]})  # type: ignore[attr-defined]
    assert str(result).startswith("exit "), "approved command executed"
    types = [e.type for e in await store.events(job.id)]
    assert "approval_requested" in types
    assert "approval_accepted" in types
    assert "command_executed" in types


async def test_rejected_command_never_executes(engine: AsyncEngine, tmp_path: Path) -> None:
    store = JobStore(engine)
    approvals = ApprovalStore(engine)
    job = await store.create(goal="rejection")
    ws = job_workspace(tmp_path, job.workspace)
    tools = build_job_tools(ws, store, approvals, job.id)
    run = _tool(tools, "run_command")

    await run.ainvoke({"command": ["git", "apply", "fix.patch"]})  # type: ignore[attr-defined]
    pending = await approvals.pending(job.id)
    assert pending is not None
    await approvals.decide(pending.id, "rejected")

    outcome = await run.ainvoke({"command": ["git", "apply", "fix.patch"]})  # type: ignore[attr-defined]
    assert "rejected" in outcome
    types = [e.type for e in await store.events(job.id)]
    assert "approval_rejected" in types
    assert "command_executed" not in types


async def test_runner_holds_in_waiting_approval_and_resumes(
    engine: AsyncEngine, saver: AsyncPostgresSaver, tmp_path: Path
) -> None:
    """The node-level seam: a step that requests approval parks the job in
    waiting_approval; after the decision, the same step re-runs and
    completes."""
    store = JobStore(engine)
    approvals = ApprovalStore(engine)
    created = await store.create(goal="approval seam")
    claimed = await store.claim_queued()
    assert claimed is not None

    async def planner(goal: str, ws: Path) -> list[PlanStep]:
        return [{"intent": "stage the note", "creates": ["notes.md"]}]

    async def executor(step: PlanStep, ws: Path, job: JobView) -> str:
        (ws / "notes.md").write_text("note")
        tools = build_job_tools(ws, store, approvals, job.id)
        run = _tool(tools, "run_command")
        outcome = await run.ainvoke({"command": ["git", "add", "notes.md"]})  # type: ignore[attr-defined]
        return str(outcome)[:60]

    runner = JobRunner(store, saver, tmp_path, planner, executor, approvals=approvals)
    await runner.run(claimed)
    held = await store.get(created.id)
    assert held is not None and held.state == states.WAITING_APPROVAL

    pending = await approvals.pending(created.id)
    assert pending is not None
    await approvals.decide(pending.id, "approved")
    resumed = await store.get(created.id)
    assert resumed is not None
    await runner.run(resumed)

    final = await store.get(created.id)
    assert final is not None and final.state == states.COMPLETED
    types = [e.type for e in await store.events(created.id)]
    assert "approval_accepted" in types and "command_executed" in types


# --- artifacts and the chat bridge ---------------------------------------


async def test_register_artifact_records_row_and_event(engine: AsyncEngine, tmp_path: Path) -> None:
    store = JobStore(engine)
    approvals = ApprovalStore(engine)
    job = await store.create(goal="artifact")
    ws = job_workspace(tmp_path, job.workspace)
    (ws / "report.md").write_text("# Findings\n")
    tools = build_job_tools(ws, store, approvals, job.id)
    register = _tool(tools, "register_artifact")

    outcome = await register.ainvoke({"path": "report.md", "title": "Findings"})  # type: ignore[attr-defined]
    assert "Artifact registered" in outcome
    rows = await approvals.artifacts_for_job(job.id)
    assert len(rows) == 1
    assert rows[0].content_type == "text/markdown"
    assert rows[0].size == len("# Findings\n")
    assert any(e.type == "artifact_created" for e in await store.events(job.id))


async def test_start_job_tool_links_the_thread(engine: AsyncEngine) -> None:
    store = JobStore(engine)
    tool = make_start_job_tool(store)
    outcome = await tool.ainvoke(  # type: ignore[attr-defined]
        {"goal": "compile the weekly notes"},
        config={"configurable": {"thread_id": "web-thread-9"}},
    )
    assert "Job started" in outcome
    jobs = await store.list_jobs()
    assert jobs[0].thread_id == "web-thread-9"
    assert jobs[0].state == states.QUEUED
