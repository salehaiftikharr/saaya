"""Thread liveness registry: the chat path marks activity, reflection marks
having looked. Worthiness compares the two."""

from collections.abc import Callable
from datetime import UTC, datetime

from sqlalchemy import Connection, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncEngine
from sqlalchemy.orm import Session

from saaya.db.models import Thread

Clock = Callable[[], datetime]


def utc_now() -> datetime:
    return datetime.now(UTC)


class ThreadActivity:
    def __init__(self, engine: AsyncEngine, clock: Clock = utc_now) -> None:
        self._engine = engine
        self._clock = clock

    async def mark_active(self, thread_id: str, first_text: str | None = None) -> None:
        """Upsert liveness; the title is written once, at creation, from the
        first user-authored text, and never overwritten here."""
        from saaya.api.titles import derive_title

        now = self._clock()
        title = derive_title(first_text) if first_text else None
        statement = (
            insert(Thread)
            .values(id=thread_id, last_activity_at=now, title=title)
            .on_conflict_do_update(index_elements=[Thread.id], set_={"last_activity_at": now})
        )

        def _upsert(sync_conn: Connection) -> None:
            with Session(bind=sync_conn) as session:
                session.execute(statement)
                session.commit()

        async with self._engine.connect() as connection:
            await connection.run_sync(_upsert)

    async def settled_unreflected(
        self, *, quiet_seconds: int, limit: int
    ) -> list[tuple[str, datetime]]:
        """Threads with activity reflection has not seen, whose conversation
        has been quiet long enough to be worth reflecting on. Returns the
        activity timestamp alongside the id so the caller can record exactly
        what it saw."""
        cutoff_ts = self._clock().timestamp() - quiet_seconds

        def _query(sync_conn: Connection) -> list[tuple[str, datetime]]:
            with Session(bind=sync_conn) as session:
                rows = session.execute(select(Thread)).scalars().all()
                worthy = [
                    (row.id, row.last_activity_at)
                    for row in rows
                    if row.last_activity_at.timestamp() <= cutoff_ts
                    and (
                        row.last_reflected_at is None
                        or row.last_reflected_at < row.last_activity_at
                    )
                ]
                return sorted(worthy)[:limit]

        async with self._engine.connect() as connection:
            return await connection.run_sync(_query)

    async def mark_reflected(self, thread_id: str, seen_activity_at: datetime) -> None:
        """Record the activity timestamp reflection saw, never the current
        time: activity arriving during the reflection stays unseen and makes
        the thread worthy again."""

        def _update(sync_conn: Connection) -> None:
            with Session(bind=sync_conn) as session:
                thread = session.get(Thread, thread_id)
                if thread is not None:
                    thread.last_reflected_at = seen_activity_at
                    session.commit()

        async with self._engine.connect() as connection:
            await connection.run_sync(_update)

    async def recent_threads(self, *, limit: int) -> list[Thread]:
        """Every conversational surface, newest first; scheduler and test
        namespaces stay out, as do archived conversations."""

        def _query(sync_conn: Connection) -> list[Thread]:
            with Session(bind=sync_conn, expire_on_commit=False) as session:
                rows = session.execute(
                    select(Thread)
                    .where(Thread.archived_at.is_(None))
                    .order_by(Thread.last_activity_at.desc())
                ).scalars()
                keep = [
                    row for row in rows if not row.id.startswith(("sched:", "test-", "first-hour:"))
                ]
                return keep[:limit]

        async with self._engine.connect() as connection:
            return await connection.run_sync(_query)

    async def set_title(self, thread_id: str, title: str) -> bool:
        def _update(sync_conn: Connection) -> bool:
            with Session(bind=sync_conn) as session:
                thread = session.get(Thread, thread_id)
                if thread is None:
                    return False
                thread.title = title
                session.commit()
                return True

        async with self._engine.connect() as connection:
            return await connection.run_sync(_update)

    async def archive(self, thread_id: str) -> bool:
        now = self._clock()

        def _update(sync_conn: Connection) -> bool:
            with Session(bind=sync_conn) as session:
                thread = session.get(Thread, thread_id)
                if thread is None:
                    return False
                thread.archived_at = now
                session.commit()
                return True

        async with self._engine.connect() as connection:
            return await connection.run_sync(_update)

    async def restore(self, thread_id: str) -> bool:
        """Archival's inverse; nothing was deleted, so nothing is rebuilt."""

        def _update(sync_conn: Connection) -> bool:
            with Session(bind=sync_conn) as session:
                thread = session.get(Thread, thread_id)
                if thread is None:
                    return False
                thread.archived_at = None
                session.commit()
                return True

        async with self._engine.connect() as connection:
            return await connection.run_sync(_update)

    async def archived_threads(self, *, limit: int = 100) -> list[Thread]:
        def _query(sync_conn: Connection) -> list[Thread]:
            with Session(bind=sync_conn, expire_on_commit=False) as session:
                rows = session.execute(
                    select(Thread)
                    .where(Thread.archived_at.is_not(None))
                    .order_by(Thread.archived_at.desc())
                ).scalars()
                keep = [
                    row for row in rows if not row.id.startswith(("sched:", "test-", "first-hour:"))
                ]
                return keep[:limit]

        async with self._engine.connect() as connection:
            return await connection.run_sync(_query)

    async def record_tool_timing(
        self, thread_id: str, call_id: str, name: str, duration_ms: int
    ) -> None:
        """Upsert one measured tool duration (F12); the stream may replay a
        call id on reconnect, and last write wins."""
        from saaya.db.models import ToolTiming

        statement = (
            insert(ToolTiming)
            .values(call_id=call_id, thread_id=thread_id, name=name, duration_ms=duration_ms)
            .on_conflict_do_update(
                index_elements=[ToolTiming.call_id], set_={"duration_ms": duration_ms}
            )
        )

        def _upsert(sync_conn: Connection) -> None:
            with Session(bind=sync_conn) as session:
                session.execute(statement)
                session.commit()

        async with self._engine.connect() as connection:
            await connection.run_sync(_upsert)

    async def tool_timings(self, thread_id: str) -> dict[str, int]:
        from saaya.db.models import ToolTiming

        def _query(sync_conn: Connection) -> dict[str, int]:
            with Session(bind=sync_conn) as session:
                rows = session.execute(
                    select(ToolTiming.call_id, ToolTiming.duration_ms).where(
                        ToolTiming.thread_id == thread_id
                    )
                ).all()
                return {str(call_id): int(ms) for call_id, ms in rows}

        async with self._engine.connect() as connection:
            return await connection.run_sync(_query)
