"""Translates LangGraph stream events into wire events.

The only place framework event shapes are known. Consumes astream_events
items as plain dicts so tests need no framework objects.
"""

import time
from collections.abc import AsyncIterator
from typing import Any

from saaya.api.events import TextDelta, ToolFinished, ToolStarted, WireEvent

_PREVIEW_CHARS = 200


def _tool_output_preview(output: Any) -> str:
    text = getattr(output, "content", output)
    return str(text)[:_PREVIEW_CHARS]


async def to_wire_events(
    stream: AsyncIterator[dict[str, Any]],
) -> AsyncIterator[WireEvent]:
    started_at: dict[str, float] = {}
    async for item in stream:
        kind = item.get("event")
        if kind == "on_chat_model_stream":
            chunk = item.get("data", {}).get("chunk")
            text = getattr(chunk, "text", None)
            # AIMessageChunk.text is a str property on current langchain-core
            # and a method on older ones; the isinstance check first avoids
            # invoking the deprecated callable-str compatibility shim.
            if not isinstance(text, str) and callable(text):
                text = text()
            if isinstance(text, str) and text:
                yield TextDelta(text=text)
        elif kind == "on_tool_start":
            started_at[str(item.get("run_id", ""))] = time.monotonic()
            yield ToolStarted(name=item.get("name", "tool"))
        elif kind == "on_tool_end":
            began = started_at.pop(str(item.get("run_id", "")), None)
            output = item.get("data", {}).get("output")
            yield ToolFinished(
                name=item.get("name", "tool"),
                output_preview=_tool_output_preview(output),
                duration_ms=(int((time.monotonic() - began) * 1000) if began is not None else None),
                call_id=str(getattr(output, "tool_call_id", "")) or None,
            )
