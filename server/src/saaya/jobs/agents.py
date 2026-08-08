"""The model-backed planner and step executor. Imported lazily from app
wiring, like agent assembly, so hermetic tests never import providers."""

import asyncio
import json
from pathlib import Path
from typing import Any, cast

from deepagents import create_deep_agent  # pyright: ignore[reportUnknownVariableType]
from langchain.chat_models import init_chat_model
from langchain_core.tools import BaseTool, StructuredTool

from saaya.config import Settings
from saaya.jobs.runner import PlanStep, parse_plan
from saaya.jobs.store import JobStore, JobView
from saaya.jobs.workspace import (
    WorkspaceViolation,
    guarded_read,
    guarded_write,
    list_files,
)

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
of a plan inside a controlled workspace. You can only touch files through
your tools; there is no network and no shell. Do the step fully, create any
files the step promises, and finish with a two-sentence summary of what you
did. Do not start other steps.

Job goal:
{goal}

Current step:
{intent}

Files this step must leave existing: {creates}"""


def _workspace_tools(workspace: Path, store: JobStore, job_id: str) -> list[BaseTool]:
    """File tools bound to one job workspace. Refusals are recorded in the
    ledger so a denied escape attempt is visible product behavior."""

    async def _refused(error: WorkspaceViolation) -> str:
        await store.append_event(job_id, "policy_refused", {"detail": str(error)}, actor="system")
        return f"Refused: {error}"

    async def write_file(path: str, content: str) -> str:
        try:
            await asyncio.to_thread(guarded_write, workspace, path, content)
        except WorkspaceViolation as error:
            return await _refused(error)
        return f"Wrote {path}."

    async def read_file(path: str) -> str:
        try:
            return await asyncio.to_thread(guarded_read, workspace, path)
        except WorkspaceViolation as error:
            return await _refused(error)

    async def list_workspace() -> str:
        rows = await asyncio.to_thread(list_files, workspace)
        return json.dumps(rows)

    return [
        StructuredTool.from_function(
            coroutine=write_file,
            name="write_file",
            description="Write a text file at a relative path inside the job workspace.",
        ),
        StructuredTool.from_function(
            coroutine=read_file,
            name="read_file",
            description="Read a text file at a relative path inside the job workspace.",
        ),
        StructuredTool.from_function(
            coroutine=list_workspace,
            name="list_workspace",
            description="List every file in the job workspace with sizes.",
        ),
    ]


def build_planner(settings: Settings) -> Any:
    provider, _, model_name = settings.chat_model.partition(":")
    model = init_chat_model(model_name, model_provider=provider, api_key=settings.claude_api_key)

    async def plan(goal: str, workspace: Path) -> list[PlanStep]:
        response = await model.ainvoke(PLAN_PROMPT.format(goal=goal))
        text = response.text() if callable(getattr(response, "text", None)) else str(response)
        cleaned = text.strip().removeprefix("```json").removeprefix("```").removesuffix("```")
        return parse_plan(cleaned)

    return plan


def build_executor(settings: Settings, store: JobStore) -> Any:
    provider, _, model_name = settings.chat_model.partition(":")
    model = init_chat_model(model_name, model_provider=provider, api_key=settings.claude_api_key)

    async def execute(step: PlanStep, workspace: Path, job: JobView) -> str:
        agent = create_deep_agent(  # pyright: ignore[reportUnknownVariableType]
            model=model,
            tools=_workspace_tools(workspace, store, job.id),
            system_prompt=EXECUTE_PROMPT.format(
                goal=job.goal,
                intent=step.get("intent", ""),
                creates=", ".join(step.get("creates", [])) or "none",
            ),
        )
        result = await agent.ainvoke(  # pyright: ignore[reportUnknownMemberType]
            {"messages": [{"role": "user", "content": "Execute the step now."}]},
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
