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
from saaya.api.history import TranscriptMessage, context_query, to_transcript

router = APIRouter()


class ChatRequest(BaseModel):
    text: str = Field(min_length=1, max_length=32_000)
    thread_id: str | None = None


class HealthResponse(BaseModel):
    status: str
    version: str
    surfaces: dict[str, str]


@router.get("/api/health")
async def health(request: Request) -> HealthResponse:
    state = request.app.state
    surfaces = {
        "web": "ok",
        "slack": "connected" if getattr(state, "slack_connected", False) else "off",
        "mcp": "enabled" if getattr(state, "mcp_enabled", False) else "off",
    }
    return HealthResponse(status="ok", version=__version__, surfaces=surfaces)


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


class ContextItem(BaseModel):
    kind: str
    text: str


@router.get("/api/chat/{thread_id}/context")
async def thread_context(request: Request, thread_id: str) -> list[ContextItem]:
    """What Saaya carries into a resumed conversation: the memories nearest
    to where the conversation left off. Surfacing them reinforces them,
    deliberately: shown context is used context."""
    agent = request.app.state.agent
    state = await agent.aget_state({"configurable": {"thread_id": thread_id}})
    transcript = to_transcript(state.values.get("messages", []))
    query = context_query(transcript)
    if query is None:
        return []
    items = await request.app.state.memory_store.recall(query, limit=3)
    return [ContextItem(kind=item.kind, text=item.text) for item in items]
