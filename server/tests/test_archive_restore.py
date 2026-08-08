"""Archive and restore are inverses over the same row; nothing is deleted."""

from sqlalchemy.ext.asyncio import AsyncEngine

from saaya.heartbeat.activity import ThreadActivity


async def test_archive_then_restore_roundtrip(engine: AsyncEngine) -> None:
    activity = ThreadActivity(engine)
    await activity.mark_active("web-arch-1", first_text="archive me")

    assert await activity.archive("web-arch-1")
    recent = [row.id for row in await activity.recent_threads(limit=50)]
    assert "web-arch-1" not in recent
    archived = [row.id for row in await activity.archived_threads()]
    assert "web-arch-1" in archived

    assert await activity.restore("web-arch-1")
    recent_after = [row.id for row in await activity.recent_threads(limit=50)]
    assert "web-arch-1" in recent_after
    assert [row.id for row in await activity.archived_threads()] == []


async def test_restore_unknown_thread_is_false(engine: AsyncEngine) -> None:
    activity = ThreadActivity(engine)
    assert not await activity.restore("missing")
