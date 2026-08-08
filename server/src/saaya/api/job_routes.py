"""Job endpoints. The ledger is the wire format: the SSE tail streams the
same rows the detail endpoint returns, so nothing renders that is not
persisted (ADR-003)."""

import asyncio
import json
from collections.abc import AsyncIterator

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from saaya.jobs import states
from saaya.jobs.states import IllegalTransition
from saaya.jobs.store import JobEventView, JobStore, JobView

jobs_router = APIRouter()


class CreateJobBody(BaseModel):
    goal: str = Field(min_length=1, max_length=4000)
    thread_id: str | None = None
    step_budget: int = Field(default=12, ge=1, le=50)


class JobDetail(BaseModel):
    job: JobView
    events: list[JobEventView]


def _store(request: Request) -> JobStore:
    store = getattr(request.app.state, "job_store", None)
    if store is None:
        raise HTTPException(status_code=503, detail="jobs are not available")
    return store


@jobs_router.post("/api/jobs")
async def create_job(request: Request, body: CreateJobBody) -> JobView:
    return await _store(request).create(
        goal=body.goal, thread_id=body.thread_id, step_budget=body.step_budget
    )


@jobs_router.get("/api/jobs")
async def list_jobs(request: Request, limit: int = 50) -> list[JobView]:
    return await _store(request).list_jobs(limit=min(limit, 200))


@jobs_router.get("/api/jobs/{job_id}")
async def job_detail(request: Request, job_id: str) -> JobDetail:
    store = _store(request)
    job = await store.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="unknown job")
    return JobDetail(job=job, events=await store.events(job_id))


@jobs_router.post("/api/jobs/{job_id}/cancel")
async def cancel_job(request: Request, job_id: str) -> JobView:
    """Cooperative: the transition is recorded here; the runner notices at
    the next step boundary and stops without further transitions."""
    store = _store(request)
    if await store.get(job_id) is None:
        raise HTTPException(status_code=404, detail="unknown job")
    try:
        return await store.transition(job_id, states.CANCELLED, actor="user")
    except IllegalTransition as error:
        raise HTTPException(status_code=409, detail=str(error)) from error


@jobs_router.post("/api/jobs/{job_id}/retry")
async def retry_job(request: Request, job_id: str) -> JobView:
    store = _store(request)
    job = await store.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="unknown job")
    try:
        moved = await store.transition(job_id, states.RETRYING, actor="user")
    except IllegalTransition as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    worker = getattr(request.app.state, "job_worker", None)
    if worker is not None:
        await worker.resume(job_id)
    return moved


@jobs_router.get("/api/jobs/{job_id}/events")
async def job_events(request: Request, job_id: str, after_seq: int = 0) -> StreamingResponse:
    """Live ledger tail. Polls persistence and streams each new row once;
    ends when the job is terminal and the ledger is drained."""
    store = _store(request)
    if await store.get(job_id) is None:
        raise HTTPException(status_code=404, detail="unknown job")

    async def stream() -> AsyncIterator[str]:
        cursor = after_seq
        while True:
            rows = await store.events(job_id, after_seq=cursor)
            for row in rows:
                cursor = row.seq
                yield f"data: {json.dumps(row.model_dump())}\n\n"
            job = await store.get(job_id)
            if job is None or (job.state in states.TERMINAL and job.last_event_seq <= cursor):
                yield 'data: {"type": "end_of_stream"}\n\n'
                return
            if await request.is_disconnected():
                return
            yield ": keepalive\n\n"
            await asyncio.sleep(0.7)

    return StreamingResponse(stream(), media_type="text/event-stream")
