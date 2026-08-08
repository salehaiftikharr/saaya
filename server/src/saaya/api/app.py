"""FastAPI application factory and lifespan wiring."""

import contextlib
import os
from collections.abc import AsyncGenerator

from fastapi import FastAPI
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from psycopg import AsyncConnection
from psycopg.rows import DictRow, dict_row
from psycopg_pool import AsyncConnectionPool

from saaya.api.job_routes import jobs_router
from saaya.api.memory_routes import memory_router
from saaya.api.routes import router
from saaya.api.tools_routes import tools_router
from saaya.config import Settings, load_settings
from saaya.db.engine import create_engine
from saaya.heartbeat.activity import ThreadActivity
from saaya.heartbeat.service import build_reflect_heartbeat, start_scheduler
from saaya.mcp.server import build_mcp_app
from saaya.memory.embedder import build_embedder
from saaya.memory.store import SemanticMemoryStore


def _export_langsmith_env(settings: Settings) -> None:
    # LangSmith configures itself from process env only; this is the one
    # sanctioned hand-off from our settings boundary into that contract.
    if settings.langsmith_tracing and settings.langsmith_api_key:
        os.environ.setdefault("LANGSMITH_TRACING", "true")
        os.environ.setdefault("LANGSMITH_API_KEY", settings.langsmith_api_key)
        os.environ.setdefault("LANGSMITH_PROJECT", settings.langsmith_project)


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved = settings or load_settings()

    @contextlib.asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
        _export_langsmith_env(resolved)
        # A pool, not a single connection: one psycopg connection cannot
        # serve concurrent chat streams.
        pool: AsyncConnectionPool[AsyncConnection[DictRow]] = AsyncConnectionPool(
            conninfo=resolved.database_url,
            open=False,
            connection_class=AsyncConnection[DictRow],
            kwargs={"autocommit": True, "row_factory": dict_row},
        )
        await pool.open()
        try:
            saver = AsyncPostgresSaver(pool)
            await saver.setup()
            engine = create_engine(resolved.database_url)
            memory_store = SemanticMemoryStore(engine, build_embedder(resolved))
            # Imported here so hermetic API tests never import model providers.
            from saaya.agent.assembly import build_agent
            from saaya.mcp.consumption import load_external_tools
            from saaya.reflection.proposer import build_proposer
            from saaya.reflection.runner import ReflectionRunner

            external_tools = await load_external_tools(resolved.workspace_dir / "mcp-servers.json")
            from saaya.tools.registry import ToolRegistry

            tool_registry = ToolRegistry(engine, resolved.workspace_dir / "tools")

            from saaya.jobs.store import ApprovalStore as _ApprovalStore
            from saaya.jobs.store import JobStore as _JobStore
            from saaya.jobs.tools import (
                make_check_jobs_tool,
                make_read_artifact_tool,
                make_start_job_tool,
            )

            _chat_jobs = _JobStore(engine)
            _chat_approvals = _ApprovalStore(engine)
            chat_job_tools = [
                make_start_job_tool(_chat_jobs),
                make_check_jobs_tool(_chat_jobs, _chat_approvals),
                make_read_artifact_tool(_chat_jobs, _chat_approvals, resolved.jobs_workspace_dir),
            ]

            async def rebuild_agent() -> None:
                # Procedural memory rides the compiled system prompt and the
                # active tool set is part of the graph, so reflection applies,
                # rollbacks, and tool lifecycle changes all rebuild it.
                active = await tool_registry.active_tools()
                app.state.agent = build_agent(
                    resolved,
                    saver,
                    memory_store,
                    [*external_tools, *chat_job_tools],
                    tool_registry,
                    active,
                )

            await rebuild_agent()
            app.state.tool_registry = tool_registry
            app.state.settings = resolved
            app.state.memory_store = memory_store
            app.state.reflection_runner = ReflectionRunner(
                resolved.workspace_dir / "memory", build_proposer(resolved)
            )
            app.state.rebuild_agent = rebuild_agent
            activity = ThreadActivity(engine)
            app.state.thread_activity = activity
            app.state.heartbeat_engine = engine
            heartbeat = build_reflect_heartbeat(
                app, engine, activity, resolved.heartbeat_quiet_seconds
            )
            scheduler = start_scheduler(heartbeat, resolved.heartbeat_interval_seconds)
            from saaya.jobs.store import ApprovalStore, JobStore
            from saaya.jobs.worker import JobWorker

            job_store = JobStore(engine)
            approval_store = ApprovalStore(engine)
            app.state.job_store = job_store
            app.state.approval_store = approval_store
            job_worker = None
            if resolved.jobs_worker_enabled and resolved.claude_api_key:
                from saaya.jobs.agents import build_executor, build_planner
                from saaya.jobs.runner import JobRunner

                job_runner = JobRunner(
                    job_store,
                    saver,
                    resolved.jobs_workspace_dir,
                    planner=build_planner(resolved),
                    executor=build_executor(resolved, job_store, approval_store),
                    approvals=approval_store,
                )
                job_worker = JobWorker(job_store, job_runner)
                await job_worker.start()
            app.state.job_worker = job_worker
            from saaya.jobs.schedules import ScheduleStore, ScheduleTicker

            schedule_store = ScheduleStore(engine)
            app.state.schedule_store = schedule_store
            schedule_ticker = None
            if job_worker is not None:
                schedule_ticker = ScheduleTicker(schedule_store, job_store)
                await schedule_ticker.start()
            app.state.mcp_enabled = mcp_app is not None
            app.state.slack_connected = False
            slack = None
            if resolved.slack_bot_token and resolved.slack_app_token:
                from saaya.channels.slack import SlackChannel

                slack = SlackChannel(
                    bot_token=resolved.slack_bot_token,
                    app_token=resolved.slack_app_token,
                    get_agent=lambda: app.state.agent,
                    activity=activity,
                )
                await slack.connect()
                app.state.slack_connected = True
            try:
                if mcp_app is not None:
                    async with mcp_app.router.lifespan_context(mcp_app):
                        yield
                else:
                    yield
            finally:
                scheduler.shutdown(wait=False)
                if schedule_ticker is not None:
                    await schedule_ticker.stop()
                if job_worker is not None:
                    await job_worker.stop()
                if slack is not None:
                    await slack.close()
        finally:
            await pool.close()

    # Built outside the lifespan so the mount exists before startup; the
    # lifespan above runs its session manager only when a token enables it.
    mcp_app = None
    if resolved.mcp_token != "":
        from saaya.memory.embedder import build_embedder as _embedder
        from saaya.memory.store import SemanticMemoryStore as _Store

        mcp_engine = create_engine(resolved.database_url)
        mcp_app = build_mcp_app(
            token=resolved.mcp_token,
            public_url=resolved.public_url,
            memory_store=_Store(mcp_engine, _embedder(resolved)),
            get_agent=lambda: app.state.agent,
            activity_mark=lambda thread, text: app.state.thread_activity.mark_active(
                thread, first_text=text
            ),
        )

    app = FastAPI(title="saaya", lifespan=lifespan)
    app.include_router(router)
    app.include_router(memory_router)
    app.include_router(tools_router)
    app.include_router(jobs_router)
    if mcp_app is not None:
        app.mount("/mcp", mcp_app)
    return app
