"""Adapter tests: framework dicts in, wire events out. Hermetic."""

from collections.abc import AsyncIterator
from typing import Any

from saaya.api.adapter import to_wire_events
from saaya.api.events import WireEvent


class FakeChunk:
    def __init__(self, text: str) -> None:
        self.text = text


async def _stream(items: list[dict[str, Any]]) -> AsyncIterator[dict[str, Any]]:
    for item in items:
        yield item


async def _collect(items: list[dict[str, Any]]) -> list[WireEvent]:
    return [event async for event in to_wire_events(_stream(items))]


async def test_model_chunks_become_text_deltas() -> None:
    events = await _collect(
        [
            {"event": "on_chat_model_stream", "data": {"chunk": FakeChunk("Hel")}},
            {"event": "on_chat_model_stream", "data": {"chunk": FakeChunk("lo")}},
        ]
    )
    assert [e.model_dump() for e in events] == [
        {"event": "text.delta", "text": "Hel"},
        {"event": "text.delta", "text": "lo"},
    ]


async def test_empty_chunks_are_dropped() -> None:
    events = await _collect([{"event": "on_chat_model_stream", "data": {"chunk": FakeChunk("")}}])
    assert events == []


async def test_tool_lifecycle_is_visible() -> None:
    events = await _collect(
        [
            {"event": "on_tool_start", "name": "current_datetime", "data": {}},
            {
                "event": "on_tool_end",
                "name": "current_datetime",
                "data": {"output": "Friday, August 07, 2026"},
            },
        ]
    )
    assert events[0].model_dump() == {"event": "tool.started", "name": "current_datetime"}
    finished = events[1].model_dump()
    assert finished["event"] == "tool.finished"
    assert finished["output_preview"].startswith("Friday")


async def test_long_tool_output_is_truncated() -> None:
    events = await _collect([{"event": "on_tool_end", "name": "t", "data": {"output": "x" * 5000}}])
    preview = events[0].model_dump()["output_preview"]
    assert len(preview) == 200


async def test_unknown_events_are_ignored() -> None:
    events = await _collect([{"event": "on_chain_start", "data": {}}])
    assert events == []
