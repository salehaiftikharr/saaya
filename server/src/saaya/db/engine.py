"""Async engine construction. The one place database URLs are translated."""

from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine


def to_async_url(database_url: str) -> str:
    """Settings carry a plain postgresql:// URL; SQLAlchemy async needs the
    asyncpg driver spelled out. asyncpg also speaks its own dialect of query
    parameters: libpq's sslmode arrives as ssl, and channel_binding is not
    understood at all. Managed hosts (Neon and friends) put both on their
    connection strings, so they are translated here rather than asking every
    deployment to hand-edit its URL."""
    if database_url.startswith("postgresql+"):
        return database_url
    url = urlsplit(database_url.replace("postgresql://", "postgresql+asyncpg://", 1))
    params = [
        ("ssl" if key == "sslmode" else key, value)
        for key, value in parse_qsl(url.query)
        if key != "channel_binding"
    ]
    return urlunsplit(url._replace(query=urlencode(params)))


def create_engine(database_url: str) -> AsyncEngine:
    # pre_ping because managed Postgres suspends idle databases and kills
    # pooled connections; each checkout revalidates so the first request
    # after a quiet stretch reconnects instead of failing.
    return create_async_engine(to_async_url(database_url), pool_size=5, pool_pre_ping=True)
