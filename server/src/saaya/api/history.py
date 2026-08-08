"""Turns checkpointed graph messages into a UI transcript.

Reads message shape structurally (type, text, content) so tests need no
framework objects and version drift in message classes stays contained.
"""

from typing import Any, Literal, cast

from pydantic import BaseModel


class TranscriptMessage(BaseModel):
    role: Literal["user", "assistant"]
    text: str


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
    """User and assistant text only; tool traffic is not part of the transcript."""
    transcript: list[TranscriptMessage] = []
    for message in messages:
        kind = getattr(message, "type", "")
        if kind == "human":
            transcript.append(TranscriptMessage(role="user", text=_text_of(message)))
        elif kind == "ai":
            text = _text_of(message)
            if text:
                transcript.append(TranscriptMessage(role="assistant", text=text))
    return transcript


def context_query(transcript: list[TranscriptMessage]) -> str | None:
    """The last thing the user said anchors what memory is relevant here."""
    for message in reversed(transcript):
        if message.role == "user" and message.text.strip():
            return message.text
    return None
