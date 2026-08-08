"""Store tests against the local pgvector Postgres with a deterministic fake
embedder: no network, no keys. Skipped when the database is not running."""

import hashlib
import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncEngine

from saaya.db.engine import to_async_url
from saaya.memory.store import SemanticMemoryStore


def fake_embedding(text: str) -> list[float]:
    """Deterministic pseudo-embedding: same text, same vector; word overlap
    moves vectors closer because shared words contribute shared components."""
    vector = [0.0] * 1536
    for word in text.lower().split():
        digest = hashlib.sha256(word.encode()).digest()
        index = int.from_bytes(digest[:4], "big") % 1536
        vector[index] += 1.0
    norm = sum(v * v for v in vector) ** 0.5 or 1.0
    return [v / norm for v in vector]


async def embed(text: str) -> list[float]:
    return fake_embedding(text)


def test_to_async_url_spells_the_driver() -> None:
    assert to_async_url("postgresql://u:p@h:5/d") == "postgresql+asyncpg://u:p@h:5/d"
    assert to_async_url("postgresql+asyncpg://x").startswith("postgresql+asyncpg://")


async def test_remember_rejects_unknown_kinds(engine: AsyncEngine) -> None:
    store = SemanticMemoryStore(engine, embed)
    with pytest.raises(ValueError, match="kind must be one of"):
        await store.remember(text="x", kind="vibe", why_retained="testing", source_thread_id=None)


async def test_recall_finds_the_related_memory_first(engine: AsyncEngine) -> None:
    store = SemanticMemoryStore(engine, embed)
    marker = uuid.uuid4().hex[:8]
    await store.remember(
        text=f"{marker} noor prefers tabs over spaces",
        kind="preference",
        why_retained="stated directly",
        source_thread_id="t-1",
    )
    await store.remember(
        text=f"{marker} the deploy runs on fridays",
        kind="fact",
        why_retained="stated directly",
        source_thread_id="t-1",
    )
    recalled = await store.recall(f"{marker} noor prefers tabs over spaces", limit=2)
    assert recalled[0].text.endswith("tabs over spaces")
    assert recalled[0].distance < recalled[1].distance


async def test_recall_reinforces_what_it_returns(engine: AsyncEngine) -> None:
    store = SemanticMemoryStore(engine, embed)
    marker = uuid.uuid4().hex[:8]
    await store.remember(
        text=f"{marker} the standup is at nine thirty",
        kind="fact",
        why_retained="stated directly",
        source_thread_id="t-2",
    )
    first = await store.recall(f"{marker} the standup is at nine thirty", limit=1)
    second = await store.recall(f"{marker} the standup is at nine thirty", limit=1)
    assert second[0].reinforcement_count == first[0].reinforcement_count + 1


async def test_forgotten_items_leave_recall_and_listing(engine: AsyncEngine) -> None:
    store = SemanticMemoryStore(engine, embed)
    marker = uuid.uuid4().hex[:8]
    item = await store.remember(
        text=f"{marker} the deploy window is friday",
        kind="fact",
        why_retained="stated",
        source_thread_id="t-3",
    )
    assert await store.forget(item.id) is True
    recalled = await store.recall(f"{marker} the deploy window is friday", limit=5)
    assert item.id not in [r.id for r in recalled]
    listed = await store.list_recent(limit=100)
    assert item.id not in [r.id for r in listed]


async def test_supersede_replaces_retrieval_and_keeps_the_trail(
    engine: AsyncEngine,
) -> None:
    from sqlalchemy import select

    from saaya.db.models import MemoryItem

    store = SemanticMemoryStore(engine, embed)
    marker = uuid.uuid4().hex[:8]
    old = await store.remember(
        text=f"{marker} demo happens on thursdays",
        kind="fact",
        why_retained="stated",
        source_thread_id="t-4",
    )
    replacement = await store.supersede(old.id, f"{marker} demo happens on fridays")
    assert replacement is not None
    recalled = await store.recall(f"{marker} demo happens", limit=5)
    ids = [r.id for r in recalled]
    assert replacement.id in ids and old.id not in ids

    def _trail(sync_conn: object) -> tuple[str | None, str]:
        from sqlalchemy.orm import Session

        with Session(bind=sync_conn) as session:  # type: ignore[arg-type]
            row = session.execute(
                select(MemoryItem).where(MemoryItem.text.contains("thursdays"))
            ).scalar_one()
            return (str(row.superseded_by), row.kind)

    async with engine.connect() as connection:
        superseded_by, _kind = await connection.run_sync(_trail)
    assert superseded_by == replacement.id
