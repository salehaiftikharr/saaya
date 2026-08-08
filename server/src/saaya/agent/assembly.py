"""Builds the Saaya deep agent. Assembly only; behavior lives in prompts/ and tools."""

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

PROMPTS_DIR = Path(__file__).parent / "prompts"


def load_system_prompt() -> str:
    return (PROMPTS_DIR / "identity.md").read_text(encoding="utf-8")


def build_agent(
    settings: Settings,
    checkpointer: BaseCheckpointSaver[Any],
    memory_store: SemanticMemoryStore,
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
        tools=[current_datetime, *make_memory_tools(memory_store)],
        system_prompt=load_system_prompt(),
        checkpointer=checkpointer,
    )
