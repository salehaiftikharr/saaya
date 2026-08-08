"""The reflect heartbeat: look at settled conversations reflection has not
seen, reflect on each, and record what happened. Silent when idle: no run row
is written unless there was something to do."""

import asyncio
import uuid
from collections.abc import Awaitable, Callable
from dataclasses import dataclass

from sqlalchemy import Connection, select
from sqlalchemy.ext.asyncio import AsyncEngine
from sqlalchemy.orm import Session

from saaya.db.models import HeartbeatRun
from saaya.heartbeat.activity import Clock, ThreadActivity, utc_now

ReflectThread = Callable[[str], Awaitable[str]]
"""thread_id -> reflection outcome ("applied" | "skipped" | "rejected")."""

QUIET_SECONDS = 600
THREADS_PER_RUN = 3


@dataclass(frozen=True)
class HeartbeatOutcome:
    ran: bool
    detail: str


class ReflectHeartbeat:
    def __init__(
        self,
        engine: AsyncEngine,
        activity: ThreadActivity,
        reflect_thread: ReflectThread,
        clock: Clock = utc_now,
        quiet_seconds: int = QUIET_SECONDS,
    ) -> None:
        self._engine = engine
        self._activity = activity
        self._reflect_thread = reflect_thread
        self._clock = clock
        self._quiet_seconds = quiet_seconds
        # In-process overlap guard; a second instance would need a DB lease.
        self._running = asyncio.Lock()

    async def tick(self) -> HeartbeatOutcome:
        if self._running.locked():
            return HeartbeatOutcome(ran=False, detail="previous run still active")
        async with self._running:
            worthy = await self._activity.settled_unreflected(
                quiet_seconds=self._quiet_seconds, limit=THREADS_PER_RUN
            )
            if not worthy:
                return HeartbeatOutcome(ran=False, detail="nothing to reflect on")

            run_id = uuid.uuid4()
            await self._record_start(run_id)
            outcomes: list[str] = []
            try:
                for thread_id, seen_activity_at in worthy:
                    outcome = await self._reflect_thread(thread_id)
                    # Reflected even when skipped or rejected: the run looked,
                    # decided, and must not revisit the same activity forever.
                    await self._activity.mark_reflected(thread_id, seen_activity_at)
                    outcomes.append(f"{thread_id[:8]}: {outcome}")
                detail = "; ".join(outcomes)
                await self._record_finish(run_id, "completed", detail)
                return HeartbeatOutcome(ran=True, detail=detail)
            except Exception as error:
                await self._record_finish(run_id, "failed", str(error))
                raise

    async def _record_start(self, run_id: uuid.UUID) -> None:
        run = HeartbeatRun(id=run_id, name="reflect", started_at=self._clock())

        def _insert(sync_conn: Connection) -> None:
            with Session(bind=sync_conn) as session:
                session.add(run)
                session.commit()

        async with self._engine.connect() as connection:
            await connection.run_sync(_insert)

    async def _record_finish(self, run_id: uuid.UUID, outcome: str, detail: str) -> None:
        now = self._clock()

        def _update(sync_conn: Connection) -> None:
            with Session(bind=sync_conn) as session:
                run = session.get(HeartbeatRun, run_id)
                if run is not None:
                    run.finished_at = now
                    run.outcome = outcome
                    run.detail = detail[:2000]
                    session.commit()

        async with self._engine.connect() as connection:
            await connection.run_sync(_update)


async def recent_runs(engine: AsyncEngine, *, limit: int = 20) -> list[HeartbeatRun]:
    statement = select(HeartbeatRun).order_by(HeartbeatRun.started_at.desc()).limit(limit)

    def _query(sync_conn: Connection) -> list[HeartbeatRun]:
        with Session(bind=sync_conn, expire_on_commit=False) as session:
            return list(session.execute(statement).scalars().all())

    async with engine.connect() as connection:
        return await connection.run_sync(_query)
