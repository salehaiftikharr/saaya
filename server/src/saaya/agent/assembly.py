"""Builds the Saaya deep agent. Assembly only; behavior lives in prompts/ and tools."""

from collections.abc import Sequence
from pathlib import Path
from typing import Any

# deepagents 0.7 ships partially typed generics; the ignores below isolate
# those unknowns here instead of relaxing strict mode for the whole package.
from deepagents import create_deep_agent  # pyright: ignore[reportUnknownVariableType]
from langchain.chat_models import init_chat_model
from langgraph.checkpoint.base import BaseCheckpointSaver

from saaya.agent.tools import current_datetime
from saaya.config import Settings
from saaya.memory.store import SemanticMemoryStore
from saaya.memory.tools import make_memory_tools
from saaya.tools.agent_tools import build_dynamic_tools, make_propose_tool
from saaya.tools.registry import ToolInfo, ToolRegistry

PROMPTS_DIR = Path(__file__).parent / "prompts"


def load_system_prompt(settings: Settings) -> str:
    """Identity, then procedural memory: the constitution and the learned
    working file both ride in the system prompt."""
    sections = [(PROMPTS_DIR / "identity.md").read_text(encoding="utf-8")]
    memory_dir = settings.workspace_dir / "memory"
    for name in ("identity.md", "how-i-work.md"):
        path = memory_dir / name
        if path.exists():
            sections.append(path.read_text(encoding="utf-8"))
    return "\n\n".join(sections)


def build_agent(
    settings: Settings,
    checkpointer: BaseCheckpointSaver[Any],
    memory_store: SemanticMemoryStore,
    external_tools: Sequence[Any] = (),
    tool_registry: ToolRegistry | None = None,
    active_dynamic: Sequence[ToolInfo] = (),
) -> Any:
    """Compile the Saaya graph with durable checkpointing."""
    provider, _, model_name = settings.chat_model.partition(":")
    model = init_chat_model(
        model_name,
        model_provider=provider,
        api_key=settings.claude_api_key,
    )
    return create_deep_agent(  # pyright: ignore[reportUnknownVariableType]
        model=model,
        tools=[
            current_datetime,
            *make_memory_tools(memory_store),
            *external_tools,
            *(
                [
                    make_propose_tool(tool_registry),
                    *build_dynamic_tools(list(active_dynamic), tool_registry),
                ]
                if tool_registry is not None
                else []
            ),
        ],
        system_prompt=load_system_prompt(settings),
        checkpointer=checkpointer,
    )
