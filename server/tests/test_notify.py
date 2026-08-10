"""Job result delivery: routing and composition, with a fake poster."""

from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncEngine

from saaya.jobs import states
from saaya.jobs.notify import deliver_job_result, slack_target
from saaya.jobs.store import ApprovalStore, JobStore
from saaya.jobs.workspace import job_workspace


def test_slack_target_routing() -> None:
    assert slack_target("slack:C123:1700.42", "U9") == ("C123", "1700.42")
    assert slack_target("slack:C123", "U9") == ("C123", None)
    assert slack_target("web-thread", "U9") == ("U9", None)
    assert slack_target(None, "U9") == ("U9", None)
    assert slack_target("web-thread", "") is None
    assert slack_target(None, "") is None


async def test_completed_job_delivers_to_origin_thread(engine: AsyncEngine, tmp_path: Path) -> None:
    store = JobStore(engine)
    approvals = ApprovalStore(engine)
    job = await store.create(goal="write the atlas note", thread_id="slack:C42:99.1")
    await store.transition(job.id, states.PLANNING)
    await store.transition(job.id, states.RUNNING)
    await store.append_event(job.id, "step_completed", {"n": 1, "summary": "done"})
    ws = job_workspace(tmp_path, job.workspace)
    (ws / "note.md").write_text("note")
    await approvals.create_artifact(
        job.id,
        path="note.md",
        kind="report",
        title="Atlas note",
        content_type="text/markdown",
        size=4,
        event_seq=1,
    )
    done = await store.transition(job.id, states.COMPLETED)

    posted: list[tuple[str, str | None, str]] = []

    async def fake_post(channel: str, thread_ts: str | None, text: str) -> None:
        posted.append((channel, thread_ts, text))

    delivered = await deliver_job_result(done, store, approvals, "U9", fake_post)
    assert delivered
    channel, thread_ts, text = posted[0]
    assert channel == "C42" and thread_ts == "99.1"
    assert "Job finished" in text and "Atlas note" in text and "1 steps" in text


async def test_failed_job_dms_the_owner_with_the_error(
    engine: AsyncEngine,
) -> None:
    store = JobStore(engine)
    approvals = ApprovalStore(engine)
    job = await store.create(goal="doomed", thread_id="web-1")
    await store.transition(job.id, states.PLANNING)
    await store.transition(job.id, states.RUNNING)
    failed = await store.transition(job.id, states.FAILED, error="step 2 exploded")

    posted: list[tuple[str, str | None, str]] = []

    async def fake_post(channel: str, thread_ts: str | None, text: str) -> None:
        posted.append((channel, thread_ts, text))

    assert await deliver_job_result(failed, store, approvals, "U9", fake_post)
    channel, thread_ts, text = posted[0]
    assert channel == "U9" and thread_ts is None
    assert "failed" in text and "step 2 exploded" in text and "Retry" in text


async def test_live_job_and_unroutable_job_do_not_post(engine: AsyncEngine) -> None:
    store = JobStore(engine)
    approvals = ApprovalStore(engine)
    live = await store.create(goal="still going", thread_id="web-1")

    async def never(channel: str, thread_ts: str | None, text: str) -> None:
        raise AssertionError("must not post")

    assert not await deliver_job_result(live, store, approvals, "U9", never)
    done = await store.create(goal="no route", thread_id="web-2")
    await store.transition(done.id, states.CANCELLED)
    settled = await store.get(done.id)
    assert settled is not None
    assert not await deliver_job_result(settled, store, approvals, "", never)
