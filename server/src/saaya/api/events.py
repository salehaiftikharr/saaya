"""The wire event union: the only vocabulary the UI ever sees.

Kept deliberately small; grows only when the UI renders a new concept.
"""

from typing import Literal

from pydantic import BaseModel


class ThreadStarted(BaseModel):
    event: Literal["thread.started"] = "thread.started"
    thread_id: str


class TextDelta(BaseModel):
    event: Literal["text.delta"] = "text.delta"
    text: str


class ToolStarted(BaseModel):
    event: Literal["tool.started"] = "tool.started"
    name: str


class ToolFinished(BaseModel):
    event: Literal["tool.finished"] = "tool.finished"
    name: str
    output_preview: str
    duration_ms: int | None = None
    call_id: str | None = None


class TurnDone(BaseModel):
    event: Literal["turn.done"] = "turn.done"


class TurnError(BaseModel):
    event: Literal["turn.error"] = "turn.error"
    message: str


WireEvent = ThreadStarted | TextDelta | ToolStarted | ToolFinished | TurnDone | TurnError
