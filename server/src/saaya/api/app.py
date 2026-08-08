"""FastAPI application factory and lifespan wiring."""

import contextlib
import os
from collections.abc import AsyncGenerator

from fastapi import FastAPI
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from psycopg import AsyncConnection
from psycopg.rows import DictRow, dict_row
from psycopg_pool import AsyncConnectionPool

from saaya.api.memory_routes import memory_router
from saaya.api.routes import router
from saaya.config import Settings, load_settings
from saaya.db.engine import create_engine
from saaya.heartbeat.activity import ThreadActivity
from saaya.heartbeat.service import build_reflect_heartbeat, start_scheduler
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
            from saaya.reflection.proposer import build_proposer
            from saaya.reflection.runner import ReflectionRunner

            def rebuild_agent() -> None:
                # Procedural memory rides the compiled system prompt, so an
                # applied reflection or rollback rebuilds the graph.
                app.state.agent = build_agent(resolved, saver, memory_store)

            rebuild_agent()
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
            try:
                yield
            finally:
                scheduler.shutdown(wait=False)
        finally:
            await pool.close()

    app = FastAPI(title="saaya", lifespan=lifespan)
    app.include_router(router)
    app.include_router(memory_router)
    return app
