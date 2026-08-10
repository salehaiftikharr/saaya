"""Slack delivery of terminal job results.

The deferral trigger fired: with a deployed instance, the owner is often
not at the web app when a job lands. A job born in a Slack conversation
reports back to that exact thread; web and schedule jobs go to the
owner's DM when SLACK_OWNER_ID is set. Delivery is best-effort and never
affects the job itself: the ledger already holds the truth, and a failed
post only logs."""

import logging
from collections.abc import Awaitable, Callable

from saaya.jobs import states
from saaya.jobs.store import ApprovalStore, JobStore, JobView

logger = logging.getLogger(__name__)

# (channel, thread_ts or None, text) -> posted
Poster = Callable[[str, str | None, str], Awaitable[None]]

_STATE_LINE = {
    states.COMPLETED: "finished",
    states.FAILED: "failed",
    states.CANCELLED: "was cancelled",
}


def slack_target(thread_id: str | None, owner_id: str) -> tuple[str, str | None] | None:
    """Where a job's report belongs: its origin Slack thread, the owner's
    DM, or nowhere (no Slack origin and no owner configured)."""
    if thread_id and thread_id.startswith("slack:"):
        parts = thread_id.split(":", 2)
        channel = parts[1]
        thread_ts = parts[2] if len(parts) > 2 else None
        return (channel, thread_ts)
    if owner_id:
        return (owner_id, None)
    return None


async def deliver_job_result(
    job: JobView,
    store: JobStore,
    approvals: ApprovalStore,
    owner_id: str,
    post: Poster,
) -> bool:
    """Compose and post the terminal summary. Returns whether a post was
    attempted, so tests can assert routing without a Slack client."""
    if job.state not in _STATE_LINE:
        return False
    target = slack_target(job.thread_id, owner_id)
    if target is None:
        return False
    goal = job.goal if len(job.goal) <= 140 else job.goal[:137] + "..."
    lines = [f"Job {_STATE_LINE[job.state]}: {goal}"]
    if job.state == states.FAILED and job.error:
        error = job.error if len(job.error) <= 200 else job.error[:197] + "..."
        lines.append(f"What went wrong: {error}")
        lines.append("Retry from where it stopped in the Work panel.")
    artifacts = await approvals.artifacts_for_job(job.id)
    if artifacts:
        titles = ", ".join(artifact.title for artifact in artifacts[:5])
        lines.append(f"Artifacts: {titles}")
    events = await store.events(job.id)
    steps_done = sum(1 for event in events if event.type == "step_completed")
    if job.state == states.COMPLETED:
        lines.append(f"{steps_done} steps, full ledger in the workbench.")
    channel, thread_ts = target
    try:
        await post(channel, thread_ts, "\n".join(lines))
    except Exception:
        logger.exception("job result delivery failed for %s", job.id)
        return False
    return True
