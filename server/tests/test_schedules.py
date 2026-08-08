"""Schedule tests on a fake clock: fires create Jobs, busy skips are
recorded, downtime never piles up runs, and one-shot schedules park."""

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.ext.asyncio import AsyncEngine

from saaya.jobs import states
from saaya.jobs.schedules import (
    ScheduleStore,
    ScheduleTicker,
    initial_fire,
    next_fire,
)
from saaya.jobs.store import JobStore

T0 = datetime(2026, 8, 8, 12, 0, 0, tzinfo=UTC)


class FakeClock:
    def __init__(self, now: datetime = T0) -> None:
        self.now = now

    def __call__(self) -> datetime:
        return self.now


def test_initial_and_next_fire_are_pure() -> None:
    assert initial_fire("every", None, 300, T0) == T0 + timedelta(seconds=300)
    at = T0 + timedelta(hours=2)
    assert initial_fire("at", at, None, T0) == at
    with pytest.raises(ValueError):
        initial_fire("every", None, 5, T0)
    with pytest.raises(ValueError):
        initial_fire("at", None, None, T0)
    with pytest.raises(ValueError):
        initial_fire("cron", None, None, T0)
    assert next_fire("every", 300, T0) == T0 + timedelta(seconds=300)
    assert next_fire("at", None, T0) is None


async def test_due_fire_creates_a_job_with_the_task_as_goal(engine: AsyncEngine) -> None:
    clock = FakeClock()
    schedules = ScheduleStore(engine, clock=clock)
    jobs = JobStore(engine)
    ticker = ScheduleTicker(schedules, jobs, clock=clock)
    created = await schedules.create(
        name="Morning notes", task="Write the morning notes file", kind="every", interval_s=300
    )

    assert await ticker.tick() == 0, "not due yet"
    clock.now = T0 + timedelta(seconds=301)
    assert await ticker.tick() == 1

    job_list = await jobs.list_jobs()
    assert job_list[0].goal == "Write the morning notes file"
    assert job_list[0].thread_id is None
    events = await jobs.events(job_list[0].id)
    assert any(e.type == "schedule_fired" for e in events)

    after = await schedules.get(created.id)
    assert after is not None
    assert after.last_job_id == job_list[0].id
    assert after.next_fire_at == (clock.now + timedelta(seconds=300)).isoformat()


async def test_busy_schedule_skips_and_records(engine: AsyncEngine) -> None:
    clock = FakeClock()
    schedules = ScheduleStore(engine, clock=clock)
    jobs = JobStore(engine)
    ticker = ScheduleTicker(schedules, jobs, clock=clock)
    created = await schedules.create(name="Busy", task="busy task", kind="every", interval_s=300)

    clock.now = T0 + timedelta(seconds=301)
    assert await ticker.tick() == 1
    first_job = (await jobs.list_jobs())[0]
    assert first_job.state == states.QUEUED, "still queued: the worker is not running here"

    clock.now = clock.now + timedelta(seconds=301)
    assert await ticker.tick() == 0, "previous job still live, so the fire skips"
    assert len(await jobs.list_jobs()) == 1
    events = await jobs.events(first_job.id)
    assert any(e.type == "schedule_skipped_busy" for e in events)
    after = await schedules.get(created.id)
    assert after is not None
    assert after.next_fire_at == (clock.now + timedelta(seconds=300)).isoformat()


async def test_disabled_never_fires_and_reenable_counts_from_now(
    engine: AsyncEngine,
) -> None:
    clock = FakeClock()
    schedules = ScheduleStore(engine, clock=clock)
    jobs = JobStore(engine)
    ticker = ScheduleTicker(schedules, jobs, clock=clock)
    created = await schedules.create(name="Off", task="never", kind="every", interval_s=300)
    await schedules.set_enabled(created.id, False)

    clock.now = T0 + timedelta(hours=5)
    assert await ticker.tick() == 0
    assert await jobs.list_jobs() == []

    reenabled = await schedules.set_enabled(created.id, True)
    assert reenabled is not None
    assert reenabled.next_fire_at == (clock.now + timedelta(seconds=300)).isoformat()


async def test_past_due_after_downtime_fires_exactly_once(engine: AsyncEngine) -> None:
    clock = FakeClock()
    schedules = ScheduleStore(engine, clock=clock)
    jobs = JobStore(engine)
    ticker = ScheduleTicker(schedules, jobs, clock=clock)
    await schedules.create(name="Downtime", task="catch up", kind="every", interval_s=300)

    # Three hours of downtime pass; dozens of slots were missed.
    clock.now = T0 + timedelta(hours=3)
    assert await ticker.tick() == 1, "one fire, not one per missed slot"
    assert await ticker.tick() == 0, "advanced from now, so nothing is due"
    assert len(await jobs.list_jobs()) == 1


async def test_at_schedule_fires_once_then_parks(engine: AsyncEngine) -> None:
    clock = FakeClock()
    schedules = ScheduleStore(engine, clock=clock)
    jobs = JobStore(engine)
    ticker = ScheduleTicker(schedules, jobs, clock=clock)
    created = await schedules.create(
        name="One shot",
        task="single run",
        kind="at",
        at_time=T0 + timedelta(minutes=10),
    )

    clock.now = T0 + timedelta(minutes=11)
    assert await ticker.tick() == 1
    after = await schedules.get(created.id)
    assert after is not None
    assert not after.enabled, "one-shot schedules park; nothing is deleted"
    clock.now = clock.now + timedelta(hours=1)
    assert await ticker.tick() == 0
