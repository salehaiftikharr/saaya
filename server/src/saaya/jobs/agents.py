"""The model-backed planner and step executor. Imported lazily from app
wiring, like agent assembly, so hermetic tests never import providers.
Prompts are code and live in prompts/ (F15), loaded the same way the chat
identity is."""

from pathlib import Path
from typing import Any, cast

from deepagents import create_deep_agent  # pyright: ignore[reportUnknownVariableType]
from langchain.chat_models import init_chat_model

from saaya.config import Settings
from saaya.jobs.runner import PlanStep, parse_plan
from saaya.jobs.store import ApprovalStore, JobStore, JobView
from saaya.jobs.tools import build_job_tools

PROMPTS_DIR = Path(__file__).parent / "prompts"
PLAN_PROMPT = (PROMPTS_DIR / "plan.md").read_text(encoding="utf-8")
EXECUTE_PROMPT = (PROMPTS_DIR / "execute.md").read_text(encoding="utf-8")


def build_planner(settings: Settings) -> Any:
    provider, _, model_name = settings.chat_model.partition(":")
    model = init_chat_model(model_name, model_provider=provider, api_key=settings.claude_api_key)

    async def plan(goal: str, workspace: Path) -> list[PlanStep]:
        response = await model.ainvoke(PLAN_PROMPT.replace("{goal}", goal))
        text = response.text() if callable(getattr(response, "text", None)) else str(response)
        cleaned = text.strip().removeprefix("```json").removeprefix("```").removesuffix("```")
        return parse_plan(cleaned)

    return plan


def build_executor(settings: Settings, store: JobStore, approvals: ApprovalStore) -> Any:
    provider, _, model_name = settings.chat_model.partition(":")
    model = init_chat_model(model_name, model_provider=provider, api_key=settings.claude_api_key)

    async def execute(step: PlanStep, workspace: Path, job: JobView, note: str) -> str:
        # checkpointer=False keeps each step invocation genuinely fresh:
        # without it, deepagents inherits the job graph's checkpointer through
        # LangGraph config propagation and a resumed step replays its own
        # finished conversation instead of doing the work (F1). The runner has
        # already executed any owner-approved commands and hands us `note`.
        agent = create_deep_agent(  # pyright: ignore[reportUnknownVariableType]
            model=model,
            tools=build_job_tools(workspace, store, approvals, job.id),
            system_prompt=EXECUTE_PROMPT.format(
                goal=job.goal,
                intent=step.get("intent", ""),
                creates=", ".join(step.get("creates", [])) or "none",
            ),
            checkpointer=False,
        )
        opening = "Execute the step now."
        if note:
            opening = f"{opening}\n\n{note}"
        result = await agent.ainvoke(  # pyright: ignore[reportUnknownMemberType]
            {"messages": [{"role": "user", "content": opening}]},
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
