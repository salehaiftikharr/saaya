"""Shared database isolation: DB-backed tests run against saaya_test, never
the development database, so product rows and test rows cannot interact."""

from collections.abc import AsyncIterator

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from saaya.config import Settings
from saaya.db.engine import create_engine
from saaya.db.models import Base

TEST_DATABASE = "saaya_test"


@pytest.fixture()
async def engine() -> AsyncIterator[AsyncEngine]:
    settings = Settings()
    admin_engine = create_engine(settings.database_url)
    try:
        async with admin_engine.connect() as connection:
            await connection.execution_options(isolation_level="AUTOCOMMIT")
            exists = await connection.scalar(
                text("SELECT 1 FROM pg_database WHERE datname = :name"),
                {"name": TEST_DATABASE},
            )
            if not exists:
                await connection.execute(text(f"CREATE DATABASE {TEST_DATABASE}"))
    except Exception:
        pytest.skip("postgres is not running; start docker compose")
    finally:
        await admin_engine.dispose()

    base_url = settings.database_url.rsplit("/", 1)[0]
    test_engine = create_engine(f"{base_url}/{TEST_DATABASE}")
    async with test_engine.begin() as connection:
        await connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        # Recreate rather than create: model columns added since the last run
        # must reach the test schema, and this database holds nothing durable.
        await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)
    yield test_engine
    async with test_engine.begin() as connection:
        for table in reversed(Base.metadata.sorted_tables):
            await connection.execute(table.delete())
    await test_engine.dispose()
