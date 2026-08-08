"""The semantic memory store on pgvector.

Embedding is injected as a plain callable so the store stays testable without
network access and indifferent to the provider.
"""

import uuid
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime

from pydantic import BaseModel
from sqlalchemy import Connection, select, update
from sqlalchemy.ext.asyncio import AsyncEngine
from sqlalchemy.orm import Session

from saaya.db.models import MemoryItem

Embedder = Callable[[str], Awaitable[list[float]]]

MEMORY_KINDS = frozenset({"fact", "preference", "constraint", "entity"})


class RememberedItem(BaseModel):
    id: str
    kind: str
    text: str
    confidence: float
    reinforcement_count: int
    learned_at: str


class RecalledItem(RememberedItem):
    distance: float


class SemanticMemoryStore:
    def __init__(self, engine: AsyncEngine, embed: Embedder) -> None:
        self._engine = engine
        self._embed = embed

    async def remember(
        self,
        *,
        text: str,
        kind: str,
        why_retained: str,
        source_thread_id: str | None,
        source_kind: str = "conversation",
        confidence: float = 0.7,
    ) -> RememberedItem:
        if kind not in MEMORY_KINDS:
            raise ValueError(f"kind must be one of {sorted(MEMORY_KINDS)}")
        vector = await self._embed(text)
        item = MemoryItem(
            id=uuid.uuid4(),
            kind=kind,
            text=text,
            why_retained=why_retained,
            confidence=confidence,
            embedding=vector,
            source_kind=source_kind,
            source_thread_id=source_thread_id,
        )

        def _insert(sync_conn: Connection) -> RememberedItem:
            # expire_on_commit=False keeps attributes readable after commit;
            # refresh pulls the server-side learned_at default.
            with Session(bind=sync_conn, expire_on_commit=False) as session:
                session.add(item)
                session.commit()
                session.refresh(item)
                return RememberedItem(
                    id=str(item.id),
                    kind=item.kind,
                    text=item.text,
                    confidence=item.confidence,
                    reinforcement_count=item.reinforcement_count,
                    learned_at=item.learned_at.isoformat(),
                )

        async with self._engine.connect() as connection:
            return await connection.run_sync(_insert)

    async def list_recent(self, *, limit: int = 50) -> list[RememberedItem]:
        statement = (
            select(MemoryItem)
            .where(MemoryItem.superseded_by.is_(None), MemoryItem.forgotten_at.is_(None))
            .order_by(MemoryItem.learned_at.desc())
            .limit(limit)
        )

        def _list(sync_conn: Connection) -> list[RememberedItem]:
            with Session(bind=sync_conn, expire_on_commit=False) as session:
                items = session.execute(statement).scalars().all()
                return [
                    RememberedItem(
                        id=str(item.id),
                        kind=item.kind,
                        text=item.text,
                        confidence=item.confidence,
                        reinforcement_count=item.reinforcement_count,
                        learned_at=item.learned_at.isoformat(),
                    )
                    for item in items
                ]

        async with self._engine.connect() as connection:
            return await connection.run_sync(_list)

    async def recall(self, query: str, *, limit: int = 5) -> list[RecalledItem]:
        """Nearest live memories; recalling reinforces what was recalled."""
        vector = await self._embed(query)
        distance = MemoryItem.embedding.cosine_distance(vector)
        statement = (
            select(MemoryItem, distance.label("distance"))
            .where(MemoryItem.superseded_by.is_(None), MemoryItem.forgotten_at.is_(None))
            .order_by(distance)
            .limit(limit)
        )

        def _query(sync_conn: Connection) -> list[RecalledItem]:
            session = Session(bind=sync_conn, expire_on_commit=False)
            rows = session.execute(statement).all()
            recalled: list[RecalledItem] = []
            ids: list[uuid.UUID] = []
            for row in rows:
                item: MemoryItem = row[0]
                ids.append(item.id)
                recalled.append(
                    RecalledItem(
                        id=str(item.id),
                        kind=item.kind,
                        text=item.text,
                        confidence=item.confidence,
                        reinforcement_count=item.reinforcement_count,
                        learned_at=item.learned_at.isoformat(),
                        distance=float(row[1]),
                    )
                )
            if ids:
                session.execute(
                    update(MemoryItem)
                    .where(MemoryItem.id.in_(ids))
                    .values(
                        reinforcement_count=MemoryItem.reinforcement_count + 1,
                        last_reinforced_at=datetime.now(UTC),
                    )
                )
            session.commit()
            session.close()
            return recalled

        async with self._engine.connect() as connection:
            return await connection.run_sync(_query)

    async def forget(self, item_id: str) -> bool:
        """The item leaves recall and every future prompt; the row stays as a
        private record."""

        def _update(sync_conn: Connection) -> bool:
            with Session(bind=sync_conn) as session:
                item = session.get(MemoryItem, uuid.UUID(item_id))
                if item is None:
                    return False
                item.forgotten_at = datetime.now(UTC)
                session.commit()
                return True

        async with self._engine.connect() as connection:
            return await connection.run_sync(_update)

    async def supersede(self, item_id: str, new_text: str) -> RememberedItem | None:
        """A correction: the new item takes over retrieval; the old row stays
        linked to it as the audit trail."""
        replacement = await self.remember(
            text=new_text,
            kind="fact",
            why_retained="user correction",
            source_thread_id=None,
            source_kind="correction",
        )

        def _link(sync_conn: Connection) -> bool:
            with Session(bind=sync_conn) as session:
                old = session.get(MemoryItem, uuid.UUID(item_id))
                if old is None:
                    return False
                old.superseded_by = uuid.UUID(replacement.id)
                new = session.get(MemoryItem, uuid.UUID(replacement.id))
                if new is not None:
                    new.kind = old.kind
                session.commit()
                return True

        async with self._engine.connect() as connection:
            linked = await connection.run_sync(_link)
        return replacement if linked else None
