"""Job endpoints. The ledger is the wire format: the SSE tail streams the
same rows the detail endpoint returns, so nothing renders that is not
persisted (ADR-003)."""

import asyncio
import json
from collections.abc import AsyncIterator
from datetime import datetime

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import PlainTextResponse, StreamingResponse
from pydantic import BaseModel, Field

from saaya.jobs import states
from saaya.jobs.schedules import ScheduleStore, ScheduleView
from saaya.jobs.states import IllegalTransition
from saaya.jobs.store import (
    ApprovalStore,
    ApprovalView,
    ArtifactView,
    JobEventView,
    JobStore,
    JobView,
)
from saaya.jobs.workspace import WorkspaceViolation, guarded_read, job_workspace

jobs_router = APIRouter()


class CreateJobBody(BaseModel):
    goal: str = Field(min_length=1, max_length=4000)
    thread_id: str | None = None
    step_budget: int = Field(default=12, ge=1, le=50)


class JobDetail(BaseModel):
    job: JobView
    events: list[JobEventView]
    approvals: list[ApprovalView]
    artifacts: list[ArtifactView]


class DecisionBody(BaseModel):
    decision: str = Field(pattern="^(approved|rejected)$")


def _store(request: Request) -> JobStore:
    store = getattr(request.app.state, "job_store", None)
    if store is None:
        raise HTTPException(status_code=503, detail="jobs are not available")
    return store


def _approvals(request: Request) -> ApprovalStore:
    store = getattr(request.app.state, "approval_store", None)
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
    approvals = _approvals(request)
    job = await store.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="unknown job")
    return JobDetail(
        job=job,
        events=await store.events(job_id),
        approvals=await approvals.for_job(job_id),
        artifacts=await approvals.artifacts_for_job(job_id),
    )


@jobs_router.post("/api/jobs/{job_id}/approvals/{approval_id}")
async def decide_approval(
    request: Request, job_id: str, approval_id: str, body: DecisionBody
) -> ApprovalView:
    """Record the decision once, then wake the runner; the gated action
    executes only after the tool re-reads this row (ADR-007)."""
    store = _store(request)
    approvals = _approvals(request)
    approval = await approvals.get(approval_id)
    if approval is None or approval.job_id != job_id:
        raise HTTPException(status_code=404, detail="unknown approval")
    decided = await approvals.decide(approval_id, body.decision)
    if decided is None:
        raise HTTPException(status_code=409, detail="already decided")
    await store.append_event(
        job_id,
        "approval_decided",
        {"approval_id": approval_id, "decision": body.decision},
        actor="user",
    )
    worker = getattr(request.app.state, "job_worker", None)
    if worker is not None:
        await worker.resume(job_id)
    return decided


@jobs_router.get("/api/jobs/{job_id}/artifacts/{artifact_id}")
async def artifact_content(request: Request, job_id: str, artifact_id: str) -> PlainTextResponse:
    store = _store(request)
    approvals = _approvals(request)
    job = await store.get(job_id)
    artifact = await approvals.get_artifact(artifact_id)
    if job is None or artifact is None or artifact.job_id != job_id:
        raise HTTPException(status_code=404, detail="unknown artifact")
    root = request.app.state.settings.jobs_workspace_dir
    workspace = job_workspace(root, job.workspace)
    try:
        content = guarded_read(workspace, artifact.path)
    except WorkspaceViolation as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    return PlainTextResponse(content, media_type=artifact.content_type)


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

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            # no-transform keeps compression middleware (the Next dev proxy's
            # gzip, nginx, CDNs) from buffering the stream to death (F4);
            # X-Accel-Buffering covers proxies that ignore Cache-Control.
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
        },
    )


class CreateScheduleBody(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    task: str = Field(min_length=1, max_length=4000)
    kind: str = Field(pattern="^(at|every)$")
    at_time: datetime | None = None
    interval_s: int | None = Field(default=None, ge=60, le=7 * 24 * 3600)


class EnabledBody(BaseModel):
    enabled: bool


def _schedules(request: Request) -> "ScheduleStore":
    store = getattr(request.app.state, "schedule_store", None)
    if store is None:
        raise HTTPException(status_code=503, detail="schedules are not available")
    return store


@jobs_router.post("/api/schedules")
async def create_schedule(request: Request, body: CreateScheduleBody) -> "ScheduleView":
    try:
        return await _schedules(request).create(
            name=" ".join(body.name.split()),
            task=body.task,
            kind=body.kind,
            at_time=body.at_time,
            interval_s=body.interval_s,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@jobs_router.get("/api/schedules")
async def list_schedules(request: Request) -> "list[ScheduleView]":
    return await _schedules(request).list_all()


@jobs_router.patch("/api/schedules/{schedule_id}")
async def set_schedule_enabled(
    request: Request, schedule_id: str, body: EnabledBody
) -> "ScheduleView":
    updated = await _schedules(request).set_enabled(schedule_id, body.enabled)
    if updated is None:
        raise HTTPException(status_code=404, detail="unknown schedule")
    return updated
