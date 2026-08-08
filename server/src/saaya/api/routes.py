"""HTTP routes. Streaming responses speak the wire event union only."""

import json
import uuid
from collections.abc import AsyncIterator

from fastapi import APIRouter, HTTPException, Request
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


class JobsHealth(BaseModel):
    worker: str
    queued: int
    live: int
    waiting: int


class HealthResponse(BaseModel):
    status: str
    version: str
    surfaces: dict[str, str]
    jobs: JobsHealth | None = None


@router.get("/api/health")
async def health(request: Request) -> HealthResponse:
    state = request.app.state
    surfaces = {
        "web": "ok",
        "slack": "connected" if getattr(state, "slack_connected", False) else "off",
        "mcp": "enabled" if getattr(state, "mcp_enabled", False) else "off",
    }
    jobs_health: JobsHealth | None = None
    job_store = getattr(state, "job_store", None)
    if job_store is not None:
        counts = await job_store.counts()
        live = sum(counts.get(name, 0) for name in ("planning", "running", "retrying"))
        jobs_health = JobsHealth(
            worker="running" if getattr(state, "job_worker", None) is not None else "off",
            queued=counts.get("queued", 0),
            live=live,
            waiting=counts.get("waiting_approval", 0),
        )
        surfaces["jobs"] = (
            f"{jobs_health.waiting} waiting on you"
            if jobs_health.waiting
            else f"{jobs_health.live} live"
            if jobs_health.live
            else "idle"
            if jobs_health.worker == "running"
            else "off"
        )
    return HealthResponse(status="ok", version=__version__, surfaces=surfaces, jobs=jobs_health)


def _sse(event: WireEvent) -> str:
    return f"data: {json.dumps(event.model_dump())}\n\n"


@router.post("/api/chat")
async def chat(request: Request, body: ChatRequest) -> StreamingResponse:
    agent = request.app.state.agent
    thread_id = body.thread_id or str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}
    payload = {"messages": [{"role": "user", "content": body.text}]}
    await request.app.state.thread_activity.mark_active(
        thread_id, first_text=None if body.thread_id else body.text
    )

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


class ThreadInfo(BaseModel):
    id: str
    title: str
    source: str
    last_activity_at: str


class RenameBody(BaseModel):
    title: str = Field(min_length=1, max_length=80)


def thread_source(thread_id: str) -> str:
    if thread_id.startswith("mcp-"):
        return "mcp"
    if thread_id.startswith("slack:"):
        return "slack-thread" if thread_id.count(":") >= 2 else "slack-dm"
    return "web"


@router.get("/api/threads")
async def list_threads(request: Request, limit: int = 50) -> list[ThreadInfo]:
    """Every conversational surface, newest first. Titles missing from rows
    created before titling exist are backfilled once, from the first
    user-authored message in the checkpointed transcript, then persisted."""
    from saaya.api.titles import FALLBACK_TITLE, derive_title, first_user_text

    activity = request.app.state.thread_activity
    rows = await activity.recent_threads(limit=limit)
    result: list[ThreadInfo] = []
    for row in rows:
        title = row.title
        if title is None:
            state = await request.app.state.agent.aget_state(
                {"configurable": {"thread_id": row.id}}
            )
            text = first_user_text(to_transcript(state.values.get("messages", [])))
            title = derive_title(text) if text else FALLBACK_TITLE
            await activity.set_title(row.id, title)
        result.append(
            ThreadInfo(
                id=row.id,
                title=title,
                source=thread_source(row.id),
                last_activity_at=row.last_activity_at.isoformat(),
            )
        )
    return result


@router.patch("/api/threads/{thread_id}")
async def rename_thread(request: Request, thread_id: str, body: RenameBody) -> ThreadInfo:
    activity = request.app.state.thread_activity
    title = " ".join(body.title.split())
    if not title:
        raise HTTPException(status_code=422, detail="title cannot be blank")
    if not await activity.set_title(thread_id, title):
        raise HTTPException(status_code=404, detail="unknown thread")
    return ThreadInfo(
        id=thread_id,
        title=title,
        source=thread_source(thread_id),
        last_activity_at="",
    )


@router.post("/api/threads/{thread_id}/archive")
async def archive_thread(request: Request, thread_id: str) -> dict[str, str]:
    """Archival hides the conversation from the list; the checkpointed
    transcript and anything Saaya learned from it remain."""
    if not await request.app.state.thread_activity.archive(thread_id):
        raise HTTPException(status_code=404, detail="unknown thread")
    return {"status": "archived"}


@router.post("/api/threads/{thread_id}/restore")
async def restore_thread(request: Request, thread_id: str) -> dict[str, str]:
    if not await request.app.state.thread_activity.restore(thread_id):
        raise HTTPException(status_code=404, detail="unknown thread")
    return {"status": "restored"}


@router.get("/api/threads/archived")
async def archived_threads(request: Request) -> list[ThreadInfo]:
    from saaya.api.titles import FALLBACK_TITLE

    rows = await request.app.state.thread_activity.archived_threads()
    return [
        ThreadInfo(
            id=row.id,
            title=row.title or FALLBACK_TITLE,
            source=thread_source(row.id),
            last_activity_at=row.last_activity_at.isoformat(),
        )
        for row in rows
    ]
