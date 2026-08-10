"""The in-process job worker (ADR-009): a claim loop over queued jobs, a
boot-time recovery scan for jobs a previous process left mid-flight, and one
job running at a time. Restart survival lives in the checkpoint and the
ledger, not in this process."""

import asyncio
import logging
from collections.abc import Awaitable, Callable

from saaya.jobs import states
from saaya.jobs.runner import JobRunner
from saaya.jobs.states import IllegalTransition
from saaya.jobs.store import JobStore, JobView

logger = logging.getLogger(__name__)


TerminalHook = Callable[[JobView], Awaitable[None]]


class JobWorker:
    def __init__(
        self,
        store: JobStore,
        runner: JobRunner,
        poll_seconds: float = 2.0,
        on_terminal: TerminalHook | None = None,
    ) -> None:
        self._store = store
        self._runner = runner
        self._poll = poll_seconds
        self._on_terminal = on_terminal
        self._tasks: set[asyncio.Task[None]] = set()
        self._loop_task: asyncio.Task[None] | None = None
        self._stopping = asyncio.Event()

    @property
    def busy(self) -> bool:
        return bool(self._tasks)

    async def start(self) -> None:
        await self._recover()
        self._loop_task = asyncio.create_task(self._claim_loop())

    async def stop(self) -> None:
        """Cancel everything without marking jobs failed: a cancelled run is
        exactly the mid-flight state the boot recovery scan resumes from."""
        self._stopping.set()
        pending: list[asyncio.Task[None]] = list(self._tasks)
        if self._loop_task is not None:
            pending.append(self._loop_task)
        for task in pending:
            task.cancel()
        await asyncio.gather(*pending, return_exceptions=True)

    async def _recover(self) -> None:
        for job in await self._store.stranded_live():
            await self._store.append_event(
                job.id, "job_recovered", {"from_state": job.state}, actor="system"
            )
            self._spawn(job)

    async def _claim_loop(self) -> None:
        while not self._stopping.is_set():
            claimed = None
            if not self._tasks:
                try:
                    claimed = await self._store.claim_queued()
                except Exception:
                    logger.exception("job claim failed; retrying")
            if claimed is not None:
                self._spawn(claimed)
            await asyncio.sleep(self._poll)

    def _spawn(self, job: JobView) -> None:
        task = asyncio.create_task(self._run(job))
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)

    async def resume(self, job_id: str) -> bool:
        """Kick a parked job immediately: retry, or an approval decision."""
        job = await self._store.get(job_id)
        resumable = (states.RETRYING, states.QUEUED, states.WAITING_APPROVAL)
        if job is None or job.state not in resumable:
            return False
        self._spawn(job)
        return True

    async def _run(self, job: JobView) -> None:
        try:
            await self._runner.run(job)
            if self._on_terminal is not None:
                settled = await self._store.get(job.id)
                if settled is not None and settled.state in states.TERMINAL:
                    # Best-effort delivery; the ledger already holds the truth.
                    try:
                        await self._on_terminal(settled)
                    except Exception:
                        logger.exception("terminal hook failed for %s", job.id)
        except asyncio.CancelledError:
            # Shutdown mid-run: leave the job live; recovery resumes it.
            raise
        except Exception as error:
            logger.exception("job %s crashed in the worker", job.id)
            try:
                await self._store.append_event(
                    job.id, "worker_error", {"error": str(error)}, actor="system"
                )
                await self._store.transition(job.id, states.FAILED, error=str(error))
            except IllegalTransition:
                pass  # already terminal; the ledger has the story
            except Exception:
                logger.exception("job %s could not be marked failed", job.id)
