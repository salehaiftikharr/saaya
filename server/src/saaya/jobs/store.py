"""Job persistence: the jobs row and its append-only ledger. Every write
that changes state appends its event in the same transaction, so the ledger
is never behind the row (ADR-003)."""

import json
import uuid
from collections.abc import Callable
from datetime import UTC, datetime
from typing import TypeVar

from pydantic import BaseModel
from sqlalchemy import Connection, select, update
from sqlalchemy.ext.asyncio import AsyncEngine
from sqlalchemy.orm import Session

from saaya.db.models import Job, JobEvent
from saaya.jobs import states
from saaya.jobs.states import check_transition

Clock = Callable[[], datetime]
T = TypeVar("T")


def utc_now() -> datetime:
    return datetime.now(UTC)


class JobView(BaseModel):
    id: str
    thread_id: str | None
    goal: str
    state: str
    error: str | None
    step_budget: int
    wall_clock_budget_s: int
    workspace: str
    last_event_seq: int
    created_at: str
    updated_at: str
    started_at: str | None
    finished_at: str | None


class JobEventView(BaseModel):
    seq: int
    at: str
    actor: str
    type: str
    payload: dict[str, object]


def _view(job: Job) -> JobView:
    return JobView(
        id=str(job.id),
        thread_id=job.thread_id,
        goal=job.goal,
        state=job.state,
        error=job.error,
        step_budget=job.step_budget,
        wall_clock_budget_s=job.wall_clock_budget_s,
        workspace=job.workspace,
        last_event_seq=job.last_event_seq,
        created_at=job.created_at.isoformat(),
        updated_at=job.updated_at.isoformat(),
        started_at=job.started_at.isoformat() if job.started_at else None,
        finished_at=job.finished_at.isoformat() if job.finished_at else None,
    )


def _event_view(event: JobEvent) -> JobEventView:
    return JobEventView(
        seq=event.seq,
        at=event.at.isoformat(),
        actor=event.actor,
        type=event.type,
        payload=json.loads(event.payload_json),
    )


def _append(
    session: Session,
    job: Job,
    type: str,
    payload: dict[str, object],
    actor: str,
) -> int:
    """Allocate the next seq from the row we already hold and insert the
    event. Callers commit; the unique (job_id, seq) constraint turns any
    double-writer race into a loud failure instead of duplicated history."""
    job.last_event_seq += 1
    session.add(
        JobEvent(
            job_id=job.id,
            seq=job.last_event_seq,
            actor=actor,
            type=type,
            payload_json=json.dumps(payload),
        )
    )
    return job.last_event_seq


class JobStore:
    def __init__(self, engine: AsyncEngine, clock: Clock = utc_now) -> None:
        self._engine = engine
        self._clock = clock

    async def _run(self, fn: Callable[[Connection], T]) -> T:
        async with self._engine.connect() as connection:
            return await connection.run_sync(fn)

    async def create(
        self,
        goal: str,
        thread_id: str | None = None,
        step_budget: int = 12,
        wall_clock_budget_s: int = 600,
        actor: str = "user",
    ) -> JobView:
        job_id = uuid.uuid4()

        def _create(sync_conn: Connection) -> JobView:
            with Session(bind=sync_conn) as session:
                job = Job(
                    id=job_id,
                    thread_id=thread_id,
                    goal=goal,
                    state=states.QUEUED,
                    step_budget=step_budget,
                    wall_clock_budget_s=wall_clock_budget_s,
                    workspace=str(job_id),
                )
                session.add(job)
                session.flush()
                _append(
                    session,
                    job,
                    "job_created",
                    {"goal": goal, "thread_id": thread_id, "state": states.QUEUED},
                    actor,
                )
                session.commit()
                session.refresh(job)
                return _view(job)

        return await self._run(_create)

    async def get(self, job_id: str) -> JobView | None:
        def _get(sync_conn: Connection) -> JobView | None:
            with Session(bind=sync_conn) as session:
                job = session.get(Job, uuid.UUID(job_id))
                return _view(job) if job else None

        return await self._run(_get)

    async def list_jobs(self, limit: int = 50) -> list[JobView]:
        def _list(sync_conn: Connection) -> list[JobView]:
            with Session(bind=sync_conn) as session:
                rows = session.scalars(
                    select(Job).order_by(Job.created_at.desc()).limit(limit)
                ).all()
                return [_view(job) for job in rows]

        return await self._run(_list)

    async def events(self, job_id: str, after_seq: int = 0) -> list[JobEventView]:
        def _events(sync_conn: Connection) -> list[JobEventView]:
            with Session(bind=sync_conn) as session:
                rows = session.scalars(
                    select(JobEvent)
                    .where(JobEvent.job_id == uuid.UUID(job_id), JobEvent.seq > after_seq)
                    .order_by(JobEvent.seq)
                ).all()
                return [_event_view(event) for event in rows]

        return await self._run(_events)

    async def append_event(
        self,
        job_id: str,
        type: str,
        payload: dict[str, object] | None = None,
        actor: str = "saaya",
    ) -> int:
        def _do(sync_conn: Connection) -> int:
            with Session(bind=sync_conn) as session:
                job = session.get(Job, uuid.UUID(job_id), with_for_update=True)
                if job is None:
                    raise LookupError(f"unknown job {job_id}")
                seq = _append(session, job, type, payload or {}, actor)
                session.commit()
                return seq

        return await self._run(_do)

    async def transition(
        self,
        job_id: str,
        target: str,
        actor: str = "saaya",
        payload: dict[str, object] | None = None,
        error: str | None = None,
    ) -> JobView:
        """Validate legality, append the state_changed event, and update the
        row, all in one transaction."""
        now = self._clock()

        def _do(sync_conn: Connection) -> JobView:
            with Session(bind=sync_conn) as session:
                job = session.get(Job, uuid.UUID(job_id), with_for_update=True)
                if job is None:
                    raise LookupError(f"unknown job {job_id}")
                check_transition(job.state, target)
                body: dict[str, object] = {"from": job.state, "to": target}
                if payload:
                    body.update(payload)
                _append(session, job, "state_changed", body, actor)
                job.state = target
                if error is not None:
                    job.error = error
                if target == states.RUNNING and job.started_at is None:
                    job.started_at = now
                if target in states.TERMINAL:
                    job.finished_at = now
                session.commit()
                session.refresh(job)
                return _view(job)

        return await self._run(_do)

    async def claim_queued(self) -> JobView | None:
        """Claim the oldest queued job by moving it to planning. FOR UPDATE
        SKIP LOCKED keeps a second worker instance from double-claiming."""

        def _claim(sync_conn: Connection) -> JobView | None:
            with Session(bind=sync_conn) as session:
                job = session.scalars(
                    select(Job)
                    .where(Job.state == states.QUEUED)
                    .order_by(Job.created_at)
                    .limit(1)
                    .with_for_update(skip_locked=True)
                ).first()
                if job is None:
                    return None
                check_transition(job.state, states.PLANNING)
                _append(
                    session,
                    job,
                    "state_changed",
                    {"from": job.state, "to": states.PLANNING},
                    "system",
                )
                job.state = states.PLANNING
                session.commit()
                session.refresh(job)
                return _view(job)

        return await self._run(_claim)

    async def stranded_live(self) -> list[JobView]:
        """Jobs a previous process left mid-flight; the worker resumes these
        on boot from their checkpoints (ADR-009)."""

        def _stranded(sync_conn: Connection) -> list[JobView]:
            with Session(bind=sync_conn) as session:
                rows = session.scalars(
                    select(Job).where(Job.state.in_(states.LIVE)).order_by(Job.created_at)
                ).all()
                return [_view(job) for job in rows]

        return await self._run(_stranded)

    async def update_budgets(self, job_id: str, step_budget: int) -> None:
        def _do(sync_conn: Connection) -> None:
            with Session(bind=sync_conn) as session:
                session.execute(
                    update(Job).where(Job.id == uuid.UUID(job_id)).values(step_budget=step_budget)
                )
                session.commit()

        await self._run(_do)
