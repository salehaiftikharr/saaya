"""HTTP routes. Streaming responses speak the wire event union only."""

import json
import uuid
from collections.abc import AsyncIterator

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from saaya import __version__
from saaya.api.adapter import to_wire_events
from saaya.api.events import ThreadStarted, TurnDone, TurnError, WireEvent
from saaya.api.history import TranscriptMessage, to_transcript

router = APIRouter()


class ChatRequest(BaseModel):
    text: str = Field(min_length=1, max_length=32_000)
    thread_id: str | None = None


class HealthResponse(BaseModel):
    status: str
    version: str


@router.get("/api/health")
async def health() -> HealthResponse:
    return HealthResponse(status="ok", version=__version__)


def _sse(event: WireEvent) -> str:
    return f"data: {json.dumps(event.model_dump())}\n\n"


@router.post("/api/chat")
async def chat(request: Request, body: ChatRequest) -> StreamingResponse:
    agent = request.app.state.agent
    thread_id = body.thread_id or str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}
    payload = {"messages": [{"role": "user", "content": body.text}]}
    await request.app.state.thread_activity.mark_active(thread_id)

    async def stream() -> AsyncIterator[str]:
        yield _sse(ThreadStarted(thread_id=thread_id))
        try:
            events = agent.astream_events(payload, config=config, version="v2")
            async for wire_event in to_wire_events(events):
                yield _sse(wire_event)
            yield _sse(TurnDone())
        except Exception as error:
            # The client gets an honest terminal frame; the re-raise keeps the
            # failure visible in server logs instead of swallowing it.
            yield _sse(TurnError(message=str(error)))
            raise

    return StreamingResponse(stream(), media_type="text/event-stream")


@router.get("/api/chat/{thread_id}/messages")
async def thread_messages(request: Request, thread_id: str) -> list[TranscriptMessage]:
    agent = request.app.state.agent
    state = await agent.aget_state({"configurable": {"thread_id": thread_id}})
    return to_transcript(state.values.get("messages", []))
