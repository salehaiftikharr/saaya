"""Turns checkpointed graph messages into a UI transcript.

Reads message shape structurally (type, text, content) so tests need no
framework objects and version drift in message classes stays contained.
"""

from typing import Any, Literal, cast

from pydantic import BaseModel


class TranscriptActivity(BaseModel):
    name: str
    output_preview: str


class TranscriptMessage(BaseModel):
    role: Literal["user", "assistant"]
    text: str
    activities: list[TranscriptActivity] = []


def _text_of(message: Any) -> str:
    text = getattr(message, "text", "")
    # BaseMessage.text is a str property in current langchain-core and a
    # method in older releases; check str first to avoid the deprecation shim.
    if not isinstance(text, str) and callable(text):
        text = text()
    if isinstance(text, str) and text:
        return text
    content = getattr(message, "content", "")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        blocks: list[str] = []
        for raw in cast("list[Any]", content):
            if not isinstance(raw, dict):
                continue
            block = cast("dict[str, Any]", raw)
            if block.get("type") == "text":
                blocks.append(str(block.get("text", "")))
        return "".join(blocks)
    return ""


def to_transcript(messages: list[Any]) -> list[TranscriptMessage]:
    """User and assistant turns; tool calls and their result previews ride
    the assistant turn that produced them, so a restored conversation shows
    the same work the live stream did."""
    transcript: list[TranscriptMessage] = []
    pending: list[TranscriptActivity] = []
    tool_names: dict[str, str] = {}
    for message in messages:
        kind = getattr(message, "type", "")
        if kind == "human":
            pending = []
            transcript.append(TranscriptMessage(role="user", text=_text_of(message)))
        elif kind == "ai":
            for raw_call in cast("list[Any]", getattr(message, "tool_calls", None) or []):
                if not isinstance(raw_call, dict):
                    continue
                call = cast("dict[str, Any]", raw_call)
                tool_names[str(call.get("id", ""))] = str(call.get("name", "tool"))
            text = _text_of(message)
            if text:
                transcript.append(
                    TranscriptMessage(role="assistant", text=text, activities=pending)
                )
                pending = []
        elif kind == "tool":
            call_id = str(getattr(message, "tool_call_id", ""))
            pending.append(
                TranscriptActivity(
                    name=tool_names.get(call_id, "tool"),
                    output_preview=_text_of(message)[:200],
                )
            )
    return transcript


def context_query(transcript: list[TranscriptMessage]) -> str | None:
    """The last thing the user said anchors what memory is relevant here."""
    for message in reversed(transcript):
        if message.role == "user" and message.text.strip():
            return message.text
    return None
