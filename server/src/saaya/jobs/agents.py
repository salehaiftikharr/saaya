"""The model-backed planner and step executor. Imported lazily from app
wiring, like agent assembly, so hermetic tests never import providers."""

from pathlib import Path
from typing import Any, cast

from deepagents import create_deep_agent  # pyright: ignore[reportUnknownVariableType]
from langchain.chat_models import init_chat_model

from saaya.config import Settings
from saaya.jobs.runner import PlanStep, parse_plan
from saaya.jobs.store import ApprovalStore, JobStore, JobView
from saaya.jobs.tools import build_job_tools

PLAN_PROMPT = """You are planning a bounded job for Saaya, a careful AI \
coworker working inside one controlled workspace directory.

Goal:
{goal}

Produce a JSON object: {{"steps": [{{"intent": "...", "creates": ["relative/path.md"]}}]}}.
Rules: between 1 and 6 steps; each intent is one concrete action a worker can
finish in one sitting using only files inside the workspace; creates lists the
relative paths that step must leave existing (empty list if none). The final
step must leave a written result in the workspace. No network access exists.
Answer with the JSON only."""

EXECUTE_PROMPT = """You are Saaya's job worker. You execute exactly one step
of a plan inside a controlled workspace. You can only act through your
tools: workspace files, allowlisted read commands, gated write commands
that need owner approval, and artifact registration. There is no network.
If a command answers APPROVAL_REQUIRED, end the step immediately with a
short note; the job resumes after the owner decides. Do the step fully,
create any files the step promises, and finish with a two-sentence summary
of what you did. Do not start other steps.

Job goal:
{goal}

Current step:
{intent}

Files this step must leave existing: {creates}"""


def build_planner(settings: Settings) -> Any:
    provider, _, model_name = settings.chat_model.partition(":")
    model = init_chat_model(model_name, model_provider=provider, api_key=settings.claude_api_key)

    async def plan(goal: str, workspace: Path) -> list[PlanStep]:
        response = await model.ainvoke(PLAN_PROMPT.format(goal=goal))
        text = response.text() if callable(getattr(response, "text", None)) else str(response)
        cleaned = text.strip().removeprefix("```json").removeprefix("```").removesuffix("```")
        return parse_plan(cleaned)

    return plan


def build_executor(settings: Settings, store: JobStore, approvals: ApprovalStore) -> Any:
    provider, _, model_name = settings.chat_model.partition(":")
    model = init_chat_model(model_name, model_provider=provider, api_key=settings.claude_api_key)

    async def execute(step: PlanStep, workspace: Path, job: JobView) -> str:
        # A step that re-runs after an approval decision must know it: the
        # fresh invocation would otherwise see finished files and skip the
        # gated command the owner just approved.
        notes = ""
        cleared: list[str] = []
        for a in await approvals.for_job(job.id):
            if a.decision != "approved" or a.consumed_at is not None:
                continue
            argv = a.payload.get("argv", [])
            items = cast("list[object]", argv) if isinstance(argv, list) else []
            parts = [str(item) for item in items]
            cleared.append(f"`{' '.join(parts)}`")
        if cleared:
            notes = (
                "\n\nThe owner has APPROVED these previously gated commands; "
                "run them now with run_command before finishing the step: " + ", ".join(cleared)
            )
        agent = create_deep_agent(  # pyright: ignore[reportUnknownVariableType]
            model=model,
            tools=build_job_tools(workspace, store, approvals, job.id),
            system_prompt=EXECUTE_PROMPT.format(
                goal=job.goal,
                intent=step.get("intent", ""),
                creates=", ".join(step.get("creates", [])) or "none",
            ),
        )
        result = await agent.ainvoke(  # pyright: ignore[reportUnknownMemberType]
            {"messages": [{"role": "user", "content": f"Execute the step now.{notes}"}]},
            config={"recursion_limit": 40},
        )
        messages = result.get("messages", [])
        final = messages[-1] if messages else None
        content = getattr(final, "content", "")
        if isinstance(content, list):
            parts = cast("list[object]", content)
            content = " ".join(
                str(cast("dict[str, object]", part).get("text", ""))
                for part in parts
                if isinstance(part, dict)
            )
        return str(content)[:2000]

    return execute
