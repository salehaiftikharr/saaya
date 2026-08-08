"""Heartbeat tests with an injected clock: no real time passes, no model runs.
Uses the local Postgres like the store tests; skips when it is down. Every
row a test writes is deleted afterward; the dev database is shared."""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.ext.asyncio import AsyncEngine

from saaya.heartbeat.activity import ThreadActivity
from saaya.heartbeat.runner import ReflectHeartbeat


class FakeClock:
    def __init__(self) -> None:
        self.now = datetime(2026, 8, 8, 12, 0, 0, tzinfo=UTC)

    def __call__(self) -> datetime:
        return self.now

    def advance(self, seconds: int) -> None:
        self.now += timedelta(seconds=seconds)


@pytest.fixture()
def clock() -> FakeClock:
    return FakeClock()


def _heartbeat(
    engine: AsyncEngine, activity: ThreadActivity, clock: FakeClock, log: list[str]
) -> ReflectHeartbeat:
    async def reflect(thread_id: str) -> str:
        log.append(thread_id)
        return "applied"

    return ReflectHeartbeat(engine, activity, reflect, clock=clock, quiet_seconds=600)


async def test_idle_heartbeat_is_silent(engine: AsyncEngine, clock: FakeClock) -> None:
    activity = ThreadActivity(engine, clock=clock)
    reflected: list[str] = []
    heartbeat = _heartbeat(engine, activity, clock, reflected)
    outcome = await heartbeat.tick()
    assert outcome.ran is False
    assert reflected == []


async def test_active_thread_waits_for_quiet_then_reflects_once(
    engine: AsyncEngine, clock: FakeClock
) -> None:
    activity = ThreadActivity(engine, clock=clock)
    reflected: list[str] = []
    heartbeat = _heartbeat(engine, activity, clock, reflected)
    thread_id = f"test-{uuid.uuid4().hex[:12]}"

    await activity.mark_active(thread_id)
    outcome = await heartbeat.tick()
    assert outcome.ran is False, "still inside the quiet period"

    clock.advance(601)
    outcome = await heartbeat.tick()
    assert outcome.ran is True
    assert reflected == [thread_id]

    outcome = await heartbeat.tick()
    assert outcome.ran is False, "idempotent: same activity never reflects twice"
    assert reflected == [thread_id]


async def test_new_activity_makes_a_thread_worthy_again(
    engine: AsyncEngine, clock: FakeClock
) -> None:
    activity = ThreadActivity(engine, clock=clock)
    reflected: list[str] = []
    heartbeat = _heartbeat(engine, activity, clock, reflected)
    thread_id = f"test-{uuid.uuid4().hex[:12]}"

    await activity.mark_active(thread_id)
    clock.advance(601)
    await heartbeat.tick()
    await activity.mark_active(thread_id)
    clock.advance(601)
    await heartbeat.tick()
    assert reflected == [thread_id, thread_id]
