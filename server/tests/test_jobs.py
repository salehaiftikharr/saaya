"""Job slice tests: store legality and ledger, workspace containment, and
the checkpointed runner, including resume across runner instances, which is
the property that makes restart survival real."""

import asyncio
from pathlib import Path

import pytest
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from psycopg import AsyncConnection
from psycopg.rows import DictRow, dict_row
from psycopg_pool import AsyncConnectionPool
from sqlalchemy.ext.asyncio import AsyncEngine

from saaya.config import Settings
from saaya.jobs import states
from saaya.jobs.runner import JobRunner, PlanStep, parse_plan
from saaya.jobs.states import IllegalTransition
from saaya.jobs.store import JobStore, JobView
from saaya.jobs.worker import JobWorker
from saaya.jobs.workspace import (
    WorkspaceViolation,
    guarded_read,
    guarded_write,
    job_workspace,
    list_files,
    resolve_inside,
)

TEST_DATABASE = "saaya_test"  # kept in lockstep with conftest.py


# --- store ---------------------------------------------------------------


async def test_create_writes_the_first_ledger_row(engine: AsyncEngine) -> None:
    store = JobStore(engine)
    job = await store.create(goal="write a note", thread_id="web-1")
    events = await store.events(job.id)
    assert job.state == states.QUEUED
    assert [(e.seq, e.type) for e in events] == [(1, "job_created")]
    assert events[0].payload["goal"] == "write a note"


async def test_transitions_enforce_legality_and_append_events(engine: AsyncEngine) -> None:
    store = JobStore(engine)
    job = await store.create(goal="g")
    with pytest.raises(IllegalTransition):
        await store.transition(job.id, states.COMPLETED)
    await store.transition(job.id, states.PLANNING)
    await store.transition(job.id, states.RUNNING)
    done = await store.transition(job.id, states.COMPLETED)
    assert done.finished_at is not None
    types = [e.type for e in await store.events(job.id)]
    assert types == ["job_created", "state_changed", "state_changed", "state_changed"]


async def test_claim_moves_oldest_queued_to_planning(engine: AsyncEngine) -> None:
    store = JobStore(engine)
    first = await store.create(goal="first")
    await store.create(goal="second")
    claimed = await store.claim_queued()
    assert claimed is not None and claimed.id == first.id
    assert claimed.state == states.PLANNING
    assert claimed.id in {job.id for job in await store.stranded_live()}


async def test_terminal_states_cannot_move(engine: AsyncEngine) -> None:
    store = JobStore(engine)
    job = await store.create(goal="g")
    await store.transition(job.id, states.CANCELLED, actor="user")
    with pytest.raises(IllegalTransition):
        await store.transition(job.id, states.PLANNING)


# --- workspace containment ----------------------------------------------


def test_workspace_refuses_traversal_and_absolute(tmp_path: Path) -> None:
    ws = job_workspace(tmp_path, "job-a")
    with pytest.raises(WorkspaceViolation):
        resolve_inside(ws, "../outside.txt")
    with pytest.raises(WorkspaceViolation):
        resolve_inside(ws, "/etc/hosts")
    with pytest.raises(WorkspaceViolation):
        resolve_inside(ws, "a/../../b")


def test_workspace_refuses_symlink_escape(tmp_path: Path) -> None:
    ws = job_workspace(tmp_path, "job-b")
    outside = tmp_path / "outside"
    outside.mkdir()
    (ws / "leak").symlink_to(outside)
    with pytest.raises(WorkspaceViolation):
        resolve_inside(ws, "leak/secrets.txt")


def test_workspace_write_read_roundtrip_and_caps(tmp_path: Path) -> None:
    ws = job_workspace(tmp_path, "job-c")
    guarded_write(ws, "notes/plan.md", "hello")
    assert guarded_read(ws, "notes/plan.md") == "hello"
    assert list_files(ws) == [{"path": "notes/plan.md", "size": 5}]
    with pytest.raises(WorkspaceViolation):
        guarded_write(ws, "big.txt", "x" * (513 * 1024))


# --- runner --------------------------------------------------------------


def two_step_planner() -> list[PlanStep]:
    return [
        {"intent": "write the first file", "creates": ["a.md"]},
        {"intent": "write the second file", "creates": ["b.md"]},
    ]


async def test_runner_happy_path_records_full_ledger(
    engine: AsyncEngine, saver: AsyncPostgresSaver, tmp_path: Path
) -> None:
    store = JobStore(engine)
    created = await store.create(goal="two files")
    claimed = await store.claim_queued()
    assert claimed is not None

    async def planner(goal: str, ws: Path) -> list[PlanStep]:
        return two_step_planner()

    async def executor(step: PlanStep, ws: Path, job: JobView) -> str:
        (ws / step["creates"][0]).write_text("done")
        return f"wrote {step['creates'][0]}"

    runner = JobRunner(store, saver, tmp_path, planner, executor)
    await runner.run(claimed)

    final = await store.get(created.id)
    assert final is not None and final.state == states.COMPLETED
    types = [e.type for e in await store.events(created.id)]
    assert types == [
        "job_created",
        "state_changed",  # queued -> planning (claim)
        "plan_created",
        "state_changed",  # planning -> running
        "step_started",
        "step_completed",
        "step_started",
        "step_completed",
        "job_completed",
        "state_changed",  # running -> completed
    ]


async def test_failed_step_resumes_from_checkpoint_in_a_new_runner(
    engine: AsyncEngine, saver: AsyncPostgresSaver, tmp_path: Path
) -> None:
    """The restart-survival property: a fresh runner and a fresh saver over
    the same Postgres resume at the failed step; completed work never
    re-executes."""
    store = JobStore(engine)
    created = await store.create(goal="two files, one crash")
    claimed = await store.claim_queued()
    assert claimed is not None
    executed: list[str] = []
    crash = {"armed": True}

    async def planner(goal: str, ws: Path) -> list[PlanStep]:
        return two_step_planner()

    async def executor(step: PlanStep, ws: Path, job: JobView) -> str:
        executed.append(step["creates"][0])
        if step["creates"][0] == "b.md" and crash["armed"]:
            crash["armed"] = False
            raise RuntimeError("simulated mid-run crash")
        (ws / step["creates"][0]).write_text("done")
        return "ok"

    runner = JobRunner(store, saver, tmp_path, planner, executor)
    await runner.run(claimed)
    mid = await store.get(created.id)
    assert mid is not None and mid.state == states.FAILED
    assert mid.error == "simulated mid-run crash"

    # A brand-new saver over a brand-new pool: nothing survives in memory.
    base = Settings().database_url.rsplit("/", 1)[0]
    pool: AsyncConnectionPool[AsyncConnection[DictRow]] = AsyncConnectionPool(
        conninfo=f"{base}/{TEST_DATABASE}",
        open=False,
        connection_class=AsyncConnection[DictRow],
        kwargs={"autocommit": True, "row_factory": dict_row},
    )
    await pool.open()
    try:
        fresh_saver = AsyncPostgresSaver(pool)
        await store.transition(created.id, states.RETRYING, actor="user")
        retried = await store.get(created.id)
        assert retried is not None
        second = JobRunner(store, fresh_saver, tmp_path, planner, executor)
        await second.run(retried)
    finally:
        await pool.close()

    final = await store.get(created.id)
    assert final is not None and final.state == states.COMPLETED
    assert executed == ["a.md", "b.md", "b.md"], "step one must not re-execute"
    types = [e.type for e in await store.events(created.id)]
    assert types.count("step_failed") == 1
    assert types.count("job_completed") == 1


async def test_step_budget_blocks_and_retry_continues(
    engine: AsyncEngine, saver: AsyncPostgresSaver, tmp_path: Path
) -> None:
    store = JobStore(engine)
    created = await store.create(goal="budget", step_budget=1)
    claimed = await store.claim_queued()
    assert claimed is not None

    async def planner(goal: str, ws: Path) -> list[PlanStep]:
        return two_step_planner()

    async def executor(step: PlanStep, ws: Path, job: JobView) -> str:
        (ws / step["creates"][0]).write_text("done")
        return "ok"

    runner = JobRunner(store, saver, tmp_path, planner, executor)
    await runner.run(claimed)
    blocked = await store.get(created.id)
    assert blocked is not None and blocked.state == states.BLOCKED
    assert any(e.type == "budget_exhausted" for e in await store.events(created.id))

    await store.update_budgets(created.id, step_budget=5)
    await store.transition(created.id, states.RETRYING, actor="user")
    retried = await store.get(created.id)
    assert retried is not None
    await runner.run(retried)
    final = await store.get(created.id)
    assert final is not None and final.state == states.COMPLETED


async def test_cancel_stops_at_the_next_step_boundary(
    engine: AsyncEngine, saver: AsyncPostgresSaver, tmp_path: Path
) -> None:
    store = JobStore(engine)
    created = await store.create(goal="cancel me")
    claimed = await store.claim_queued()
    assert claimed is not None

    async def planner(goal: str, ws: Path) -> list[PlanStep]:
        return two_step_planner()

    async def executor(step: PlanStep, ws: Path, job: JobView) -> str:
        (ws / step["creates"][0]).write_text("done")
        if step["creates"][0] == "a.md":
            await store.transition(created.id, states.CANCELLED, actor="user")
        return "ok"

    runner = JobRunner(store, saver, tmp_path, planner, executor)
    await runner.run(claimed)
    final = await store.get(created.id)
    assert final is not None and final.state == states.CANCELLED
    types = [e.type for e in await store.events(created.id)]
    assert types.count("step_started") == 1, "no step runs after a cancel"


async def test_worker_recovers_stranded_jobs(
    engine: AsyncEngine, saver: AsyncPostgresSaver, tmp_path: Path
) -> None:
    store = JobStore(engine)
    created = await store.create(goal="stranded")
    await store.claim_queued()  # planning, no owner: a crashed process

    async def planner(goal: str, ws: Path) -> list[PlanStep]:
        return [{"intent": "one file", "creates": ["a.md"]}]

    async def executor(step: PlanStep, ws: Path, job: JobView) -> str:
        (ws / "a.md").write_text("done")
        return "ok"

    worker = JobWorker(store, JobRunner(store, saver, tmp_path, planner, executor))
    await worker.start()
    try:
        for _ in range(80):
            job = await store.get(created.id)
            assert job is not None
            if job.state == states.COMPLETED:
                break
            await asyncio.sleep(0.05)
        final = await store.get(created.id)
        assert final is not None and final.state == states.COMPLETED
        assert any(e.type == "job_recovered" for e in await store.events(created.id))
    finally:
        await worker.stop()


# --- plan validation ------------------------------------------------------


def test_parse_plan_accepts_the_documented_shape() -> None:
    steps = parse_plan('{"steps": [{"intent": "do it", "creates": ["out.md"]}]}')
    assert steps == [{"intent": "do it", "creates": ["out.md"]}]


def test_parse_plan_rejects_empty_and_shapeless() -> None:
    with pytest.raises(ValueError):
        parse_plan("[]")
    with pytest.raises(ValueError):
        parse_plan('[{"creates": []}]')
    with pytest.raises(ValueError):
        parse_plan('"just a string"')
