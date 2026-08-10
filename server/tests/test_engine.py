"""URL translation tests: the one place database URLs are rewritten must
handle managed-Postgres connection strings exactly."""

from saaya.db.engine import to_async_url


def test_plain_url_gains_asyncpg_driver() -> None:
    assert (
        to_async_url("postgresql://saaya:saaya@localhost:5433/saaya")
        == "postgresql+asyncpg://saaya:saaya@localhost:5433/saaya"
    )


def test_neon_style_url_translates_ssl_params() -> None:
    neon = (
        "postgresql://user:pass@ep-calm-sea-123.us-east-1.aws.neon.tech/saaya"
        "?sslmode=require&channel_binding=require"
    )
    assert to_async_url(neon) == (
        "postgresql+asyncpg://user:pass@ep-calm-sea-123.us-east-1.aws.neon.tech/saaya?ssl=require"
    )


def test_explicit_driver_url_passes_through_untouched() -> None:
    explicit = "postgresql+psycopg://saaya@localhost/saaya?sslmode=require"
    assert to_async_url(explicit) == explicit


def test_url_without_query_gains_no_stray_separator() -> None:
    assert not to_async_url("postgresql://saaya@localhost/saaya").endswith("?")
