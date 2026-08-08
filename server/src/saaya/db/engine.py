"""Async engine construction. The one place database URLs are translated."""

from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine


def to_async_url(database_url: str) -> str:
    """Settings carry a plain postgresql:// URL; SQLAlchemy async needs the
    asyncpg driver spelled out."""
    if database_url.startswith("postgresql+"):
        return database_url
    return database_url.replace("postgresql://", "postgresql+asyncpg://", 1)


def create_engine(database_url: str) -> AsyncEngine:
    return create_async_engine(to_async_url(database_url), pool_size=5)
