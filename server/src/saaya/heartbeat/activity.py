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

    async def mark_active(self, thread_id: str) -> None:
        now = self._clock()
        statement = (
            insert(Thread)
            .values(id=thread_id, last_activity_at=now)
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

    async def recent_web_threads(self, *, limit: int) -> list[tuple[str, datetime]]:
        """Bare-uuid ids are the web surface; every other namespace carries a
        prefix (slack:, mcp-, sched:)."""

        def _query(sync_conn: Connection) -> list[tuple[str, datetime]]:
            with Session(bind=sync_conn) as session:
                rows = session.execute(
                    select(Thread).order_by(Thread.last_activity_at.desc())
                ).scalars()
                web = [
                    (row.id, row.last_activity_at)
                    for row in rows
                    if ":" not in row.id and not row.id.startswith(("mcp-", "test-"))
                ]
                return web[:limit]

        async with self._engine.connect() as connection:
            return await connection.run_sync(_query)
