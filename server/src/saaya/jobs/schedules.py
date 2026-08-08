"""User-owned schedules (ADR-010). A fire creates a normal Job, so
scheduled work inherits the ledger, budgets, approvals, and recovery. The
reflection heartbeat stays a separate, silent clock.

Misfire policy: a past-due schedule fires once and advances from now, never
from the missed slots, so downtime cannot pile up runs. While a schedule's
previous job is still live, the fire is skipped and recorded."""

import asyncio
import logging
import uuid
from datetime import datetime, timedelta

from pydantic import BaseModel
from sqlalchemy import Connection, select
from sqlalchemy.ext.asyncio import AsyncEngine
from sqlalchemy.orm import Session

from saaya.db.models import UserSchedule
from saaya.jobs import states
from saaya.jobs.store import Clock, JobStore, utc_now

logger = logging.getLogger(__name__)

MIN_INTERVAL_S = 60
BUSY_STATES = frozenset(
    {states.QUEUED, states.PLANNING, states.RUNNING, states.RETRYING, states.WAITING_APPROVAL}
)


class ScheduleView(BaseModel):
    id: str
    name: str
    task: str
    kind: str
    at_time: str | None
    interval_s: int | None
    enabled: bool
    last_fired_at: str | None
    next_fire_at: str
    last_job_id: str | None


def _view(row: UserSchedule) -> ScheduleView:
    return ScheduleView(
        id=str(row.id),
        name=row.name,
        task=row.task,
        kind=row.kind,
        at_time=row.at_time.isoformat() if row.at_time else None,
        interval_s=row.interval_s,
        enabled=row.enabled,
        last_fired_at=row.last_fired_at.isoformat() if row.last_fired_at else None,
        next_fire_at=row.next_fire_at.isoformat(),
        last_job_id=str(row.last_job_id) if row.last_job_id else None,
    )


def initial_fire(
    kind: str, at_time: datetime | None, interval_s: int | None, now: datetime
) -> datetime:
    if kind == "at":
        if at_time is None:
            raise ValueError("an at schedule needs at_time")
        return at_time
    if kind == "every":
        if interval_s is None or interval_s < MIN_INTERVAL_S:
            raise ValueError(f"an every schedule needs interval_s >= {MIN_INTERVAL_S}")
        return now + timedelta(seconds=interval_s)
    raise ValueError(f"unknown schedule kind {kind}")


def next_fire(kind: str, interval_s: int | None, now: datetime) -> datetime | None:
    """After a fire: every advances from now; at is one-shot and parks."""
    if kind == "every" and interval_s is not None:
        return now + timedelta(seconds=interval_s)
    return None


class ScheduleStore:
    def __init__(self, engine: AsyncEngine, clock: Clock = utc_now) -> None:
        self._engine = engine
        self._clock = clock

    async def create(
        self,
        name: str,
        task: str,
        kind: str,
        at_time: datetime | None = None,
        interval_s: int | None = None,
    ) -> ScheduleView:
        fire_at = initial_fire(kind, at_time, interval_s, self._clock())

        def _create(sync_conn: Connection) -> ScheduleView:
            with Session(bind=sync_conn) as session:
                row = UserSchedule(
                    name=name,
                    task=task,
                    kind=kind,
                    at_time=at_time,
                    interval_s=interval_s,
                    next_fire_at=fire_at,
                )
                session.add(row)
                session.commit()
                session.refresh(row)
                return _view(row)

        async with self._engine.connect() as connection:
            return await connection.run_sync(_create)

    async def list_all(self) -> list[ScheduleView]:
        def _list(sync_conn: Connection) -> list[ScheduleView]:
            with Session(bind=sync_conn) as session:
                rows = session.scalars(select(UserSchedule).order_by(UserSchedule.created_at)).all()
                return [_view(row) for row in rows]

        async with self._engine.connect() as connection:
            return await connection.run_sync(_list)

    async def get(self, schedule_id: str) -> ScheduleView | None:
        def _get(sync_conn: Connection) -> ScheduleView | None:
            with Session(bind=sync_conn) as session:
                row = session.get(UserSchedule, uuid.UUID(schedule_id))
                return _view(row) if row else None

        async with self._engine.connect() as connection:
            return await connection.run_sync(_get)

    async def set_enabled(self, schedule_id: str, enabled: bool) -> ScheduleView | None:
        """Disabling parks the clock; re-enabling an every schedule counts
        from now, so a long-disabled schedule cannot fire immediately."""
        now = self._clock()

        def _set(sync_conn: Connection) -> ScheduleView | None:
            with Session(bind=sync_conn) as session:
                row = session.get(UserSchedule, uuid.UUID(schedule_id), with_for_update=True)
                if row is None:
                    return None
                row.enabled = enabled
                if enabled and row.kind == "every" and row.interval_s is not None:
                    row.next_fire_at = now + timedelta(seconds=row.interval_s)
                session.commit()
                session.refresh(row)
                return _view(row)

        async with self._engine.connect() as connection:
            return await connection.run_sync(_set)

    async def due(self, now: datetime) -> list[ScheduleView]:
        def _due(sync_conn: Connection) -> list[ScheduleView]:
            with Session(bind=sync_conn) as session:
                rows = session.scalars(
                    select(UserSchedule)
                    .where(UserSchedule.enabled.is_(True), UserSchedule.next_fire_at <= now)
                    .order_by(UserSchedule.next_fire_at)
                ).all()
                return [_view(row) for row in rows]

        async with self._engine.connect() as connection:
            return await connection.run_sync(_due)

    async def mark_fired(
        self,
        schedule_id: str,
        job_id: str | None,
        fired_at: datetime,
    ) -> None:
        """Advance the clock after a fire or a busy skip. One-shot schedules
        park themselves by disabling; nothing is deleted."""

        def _mark(sync_conn: Connection) -> None:
            with Session(bind=sync_conn) as session:
                row = session.get(UserSchedule, uuid.UUID(schedule_id), with_for_update=True)
                if row is None:
                    return
                row.last_fired_at = fired_at
                if job_id is not None:
                    row.last_job_id = uuid.UUID(job_id)
                upcoming = next_fire(row.kind, row.interval_s, fired_at)
                if upcoming is None:
                    row.enabled = False
                else:
                    row.next_fire_at = upcoming
                session.commit()

        async with self._engine.connect() as connection:
            await connection.run_sync(_mark)


class ScheduleTicker:
    """The loop that turns due schedules into Jobs. tick() is the testable
    unit; the loop just calls it on a cadence."""

    def __init__(
        self,
        schedules: ScheduleStore,
        jobs: JobStore,
        clock: Clock = utc_now,
        poll_seconds: float = 5.0,
    ) -> None:
        self._schedules = schedules
        self._jobs = jobs
        self._clock = clock
        self._poll = poll_seconds
        self._task: asyncio.Task[None] | None = None
        self._stopping = asyncio.Event()

    async def start(self) -> None:
        self._task = asyncio.create_task(self._loop())

    async def stop(self) -> None:
        self._stopping.set()
        if self._task is not None:
            self._task.cancel()
            await asyncio.gather(self._task, return_exceptions=True)

    async def _loop(self) -> None:
        while not self._stopping.is_set():
            try:
                await self.tick()
            except Exception:
                logger.exception("schedule tick failed; next tick retries")
            await asyncio.sleep(self._poll)

    async def tick(self) -> int:
        now = self._clock()
        fired = 0
        for schedule in await self._schedules.due(now):
            if await self._busy(schedule):
                await self._jobs.append_event(
                    str(schedule.last_job_id),
                    "schedule_skipped_busy",
                    {"schedule_id": schedule.id, "name": schedule.name},
                    actor="system",
                )
                await self._schedules.mark_fired(schedule.id, None, now)
                continue
            job = await self._jobs.create(goal=schedule.task, thread_id=None, actor="system")
            await self._jobs.append_event(
                job.id,
                "schedule_fired",
                {"schedule_id": schedule.id, "name": schedule.name},
                actor="system",
            )
            await self._schedules.mark_fired(schedule.id, job.id, now)
            fired += 1
        return fired

    async def _busy(self, schedule: ScheduleView) -> bool:
        if schedule.last_job_id is None:
            return False
        job = await self._jobs.get(schedule.last_job_id)
        return job is not None and job.state in BUSY_STATES
