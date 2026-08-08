"""Translates LangGraph stream events into wire events.

The only place framework event shapes are known. Consumes astream_events
items as plain dicts so tests need no framework objects.
"""

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
    async for item in stream:
        kind = item.get("event")
        if kind == "on_chat_model_stream":
            chunk = item.get("data", {}).get("chunk")
            text = getattr(chunk, "text", None)
            # AIMessageChunk.text is a property on some versions, a method on
            # others; tolerate both rather than pin the whole adapter to one.
            if callable(text):
                text = text()
            if isinstance(text, str) and text:
                yield TextDelta(text=text)
        elif kind == "on_tool_start":
            yield ToolStarted(name=item.get("name", "tool"))
        elif kind == "on_tool_end":
            yield ToolFinished(
                name=item.get("name", "tool"),
                output_preview=_tool_output_preview(item.get("data", {}).get("output")),
            )
