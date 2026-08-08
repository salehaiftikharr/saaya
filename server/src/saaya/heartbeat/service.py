"""Builds the reflect heartbeat against real collaborators and schedules it."""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncEngine

from saaya.api.history import to_transcript
from saaya.heartbeat.activity import ThreadActivity
from saaya.heartbeat.runner import ReflectHeartbeat


def build_reflect_heartbeat(
    app: FastAPI, engine: AsyncEngine, activity: ThreadActivity, quiet_seconds: int
) -> ReflectHeartbeat:
    async def reflect_thread(thread_id: str) -> str:
        state = await app.state.agent.aget_state({"configurable": {"thread_id": thread_id}})
        transcript = "\n".join(
            f"{message.role}: {message.text}"
            for message in to_transcript(state.values.get("messages", []))
        )
        result = await app.state.reflection_runner.run(
            transcript, f"heartbeat reflection over thread {thread_id}"
        )
        if result.outcome == "applied":
            app.state.rebuild_agent()
        if result.violations:
            rules = ",".join(v.rule for v in result.violations)
            return f"{result.outcome} ({rules})"
        return result.outcome

    return ReflectHeartbeat(engine, activity, reflect_thread, quiet_seconds=quiet_seconds)


def start_scheduler(heartbeat: ReflectHeartbeat, interval_seconds: int) -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler()
    scheduler.add_job(  # pyright: ignore[reportUnknownMemberType]
        heartbeat.tick, "interval", seconds=interval_seconds, id="reflect"
    )
    scheduler.start()
    return scheduler
