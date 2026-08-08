"""Memory tools bound to a store instance; assembly wires them in."""

from typing import Annotated

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import BaseTool, InjectedToolArg, tool

from saaya.memory.store import SemanticMemoryStore


def _thread_id(config: RunnableConfig) -> str | None:
    value = config.get("configurable", {}).get("thread_id")
    return str(value) if value is not None else None


def make_memory_tools(store: SemanticMemoryStore) -> list[BaseTool]:
    @tool
    async def remember(
        text: str,
        kind: str,
        why_retained: str,
        config: Annotated[RunnableConfig, InjectedToolArg],
    ) -> str:
        """Store one durable thing about the user or their work so future
        conversations can use it. kind is one of: fact, preference,
        constraint, entity. why_retained is one short sentence on why this
        is worth keeping. Store single specific statements, not summaries."""
        item = await store.remember(
            text=text,
            kind=kind,
            why_retained=why_retained,
            source_thread_id=_thread_id(config),
        )
        return f"Remembered ({item.kind}): {item.text}"

    @tool
    async def recall_memories(query: str) -> str:
        """Search long-term memory for things learned in any earlier
        conversation. Use this before answering questions about the user,
        their preferences, or their work context."""
        items = await store.recall(query, limit=5)
        if not items:
            return "No memories found."
        lines = [
            f"- [{item.kind}, confidence {item.confidence:.1f}, "
            f"reinforced {item.reinforcement_count}x] {item.text}"
            for item in items
        ]
        return "\n".join(lines)

    return [remember, recall_memories]
