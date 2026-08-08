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

from saaya.db.models import Job, JobApproval, JobArtifact, JobEvent
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


class ApprovalView(BaseModel):
    id: str
    job_id: str
    kind: str
    preview: str
    payload: dict[str, object]
    requested_at: str
    decided_at: str | None
    decision: str | None
    consumed_at: str | None


class ArtifactView(BaseModel):
    id: str
    job_id: str
    path: str
    kind: str
    title: str
    content_type: str
    size: int
    created_at: str


def _approval_view(row: JobApproval) -> ApprovalView:
    return ApprovalView(
        id=str(row.id),
        job_id=str(row.job_id),
        kind=row.kind,
        preview=row.preview,
        payload=json.loads(row.payload_json),
        requested_at=row.requested_at.isoformat(),
        decided_at=row.decided_at.isoformat() if row.decided_at else None,
        decision=row.decision,
        consumed_at=row.consumed_at.isoformat() if row.consumed_at else None,
    )


def _artifact_view(row: JobArtifact) -> ArtifactView:
    return ArtifactView(
        id=str(row.id),
        job_id=str(row.job_id),
        path=row.path,
        kind=row.kind,
        title=row.title,
        content_type=row.content_type,
        size=row.size,
        created_at=row.created_at.isoformat(),
    )


class ApprovalStore:
    """Approval and artifact persistence, kept beside JobStore so the runner
    wires one seam. Decisions are recorded once; execution consumes them."""

    def __init__(self, engine: AsyncEngine, clock: Clock = utc_now) -> None:
        self._engine = engine
        self._clock = clock

    async def _run(self, fn: Callable[[Connection], T]) -> T:
        async with self._engine.connect() as connection:
            return await connection.run_sync(fn)

    async def create_approval(
        self, job_id: str, kind: str, preview: str, payload: dict[str, object]
    ) -> ApprovalView:
        def _do(sync_conn: Connection) -> ApprovalView:
            with Session(bind=sync_conn) as session:
                row = JobApproval(
                    job_id=uuid.UUID(job_id),
                    kind=kind,
                    preview=preview,
                    payload_json=json.dumps(payload),
                )
                session.add(row)
                session.commit()
                session.refresh(row)
                return _approval_view(row)

        return await self._run(_do)

    async def decide(self, approval_id: str, decision: str) -> ApprovalView | None:
        """Record a decision exactly once; a second decision is refused by
        returning None so the route can 409."""
        now = self._clock()

        def _do(sync_conn: Connection) -> ApprovalView | None:
            with Session(bind=sync_conn) as session:
                row = session.get(JobApproval, uuid.UUID(approval_id), with_for_update=True)
                if row is None or row.decision is not None:
                    return None
                row.decision = decision
                row.decided_at = now
                session.commit()
                session.refresh(row)
                return _approval_view(row)

        return await self._run(_do)

    async def get(self, approval_id: str) -> ApprovalView | None:
        def _do(sync_conn: Connection) -> ApprovalView | None:
            with Session(bind=sync_conn) as session:
                row = session.get(JobApproval, uuid.UUID(approval_id))
                return _approval_view(row) if row else None

        return await self._run(_do)

    async def for_job(self, job_id: str) -> list[ApprovalView]:
        def _do(sync_conn: Connection) -> list[ApprovalView]:
            with Session(bind=sync_conn) as session:
                rows = session.scalars(
                    select(JobApproval)
                    .where(JobApproval.job_id == uuid.UUID(job_id))
                    .order_by(JobApproval.requested_at)
                ).all()
                return [_approval_view(row) for row in rows]

        return await self._run(_do)

    async def pending(self, job_id: str) -> ApprovalView | None:
        def _do(sync_conn: Connection) -> ApprovalView | None:
            with Session(bind=sync_conn) as session:
                row = session.scalars(
                    select(JobApproval)
                    .where(
                        JobApproval.job_id == uuid.UUID(job_id),
                        JobApproval.decision.is_(None),
                    )
                    .order_by(JobApproval.requested_at)
                    .limit(1)
                ).first()
                return _approval_view(row) if row else None

        return await self._run(_do)

    async def decided_unconsumed(
        self, job_id: str, payload: dict[str, object]
    ) -> ApprovalView | None:
        """The execution-side check (ADR-007): an exact-payload match that
        has a decision and has not been consumed yet."""
        wanted = json.dumps(payload)

        def _do(sync_conn: Connection) -> ApprovalView | None:
            with Session(bind=sync_conn) as session:
                rows = session.scalars(
                    select(JobApproval)
                    .where(
                        JobApproval.job_id == uuid.UUID(job_id),
                        JobApproval.decision.is_not(None),
                        JobApproval.consumed_at.is_(None),
                    )
                    .order_by(JobApproval.requested_at)
                ).all()
                for row in rows:
                    if row.payload_json == wanted:
                        return _approval_view(row)
                return None

        return await self._run(_do)

    async def consume(self, approval_id: str) -> None:
        now = self._clock()

        def _do(sync_conn: Connection) -> None:
            with Session(bind=sync_conn) as session:
                row = session.get(JobApproval, uuid.UUID(approval_id), with_for_update=True)
                if row is not None and row.consumed_at is None:
                    row.consumed_at = now
                    session.commit()

        await self._run(_do)

    async def create_artifact(
        self,
        job_id: str,
        path: str,
        kind: str,
        title: str,
        content_type: str,
        size: int,
        event_seq: int,
    ) -> ArtifactView:
        def _do(sync_conn: Connection) -> ArtifactView:
            with Session(bind=sync_conn) as session:
                row = JobArtifact(
                    job_id=uuid.UUID(job_id),
                    path=path,
                    kind=kind,
                    title=title,
                    content_type=content_type,
                    size=size,
                    event_seq=event_seq,
                )
                session.add(row)
                session.commit()
                session.refresh(row)
                return _artifact_view(row)

        return await self._run(_do)

    async def artifacts_for_job(self, job_id: str) -> list[ArtifactView]:
        def _do(sync_conn: Connection) -> list[ArtifactView]:
            with Session(bind=sync_conn) as session:
                rows = session.scalars(
                    select(JobArtifact)
                    .where(JobArtifact.job_id == uuid.UUID(job_id))
                    .order_by(JobArtifact.created_at)
                ).all()
                return [_artifact_view(row) for row in rows]

        return await self._run(_do)

    async def get_artifact(self, artifact_id: str) -> ArtifactView | None:
        def _do(sync_conn: Connection) -> ArtifactView | None:
            with Session(bind=sync_conn) as session:
                row = session.get(JobArtifact, uuid.UUID(artifact_id))
                return _artifact_view(row) if row else None

        return await self._run(_do)
