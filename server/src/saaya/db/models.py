"""SQLAlchemy models. Schema changes here, then alembic autogenerate."""

import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

EMBEDDING_DIMENSIONS = 1536


class Base(DeclarativeBase):
    pass


class MemoryItem(Base):
    """One remembered thing, with enough provenance to answer: what was
    learned, where it came from, when, why retained, how confident, whether
    reinforced or superseded, and which version introduced it."""

    __tablename__ = "memory_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kind: Mapped[str] = mapped_column(String(32))
    text: Mapped[str] = mapped_column(Text)
    why_retained: Mapped[str] = mapped_column(Text)
    confidence: Mapped[float] = mapped_column(default=0.7)
    embedding: Mapped[list[float]] = mapped_column(Vector(EMBEDDING_DIMENSIONS))
    source_kind: Mapped[str] = mapped_column(String(32))
    source_thread_id: Mapped[str | None] = mapped_column(String(64), default=None)
    learned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_reinforced_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )
    reinforcement_count: Mapped[int] = mapped_column(Integer, default=0)
    superseded_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("memory_items.id"), default=None
    )
    version_introduced: Mapped[int] = mapped_column(Integer, default=0)


class Thread(Base):
    """Conversation registry: who was active when, and when reflection last
    looked. The checkpointer owns message content; this row owns liveness."""

    __tablename__ = "threads"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_activity_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    last_reflected_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )


class HeartbeatRun(Base):
    """One heartbeat execution: what ran, when, and what actually happened."""

    __tablename__ = "heartbeat_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(64))
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    outcome: Mapped[str] = mapped_column(String(32), default="running")
    detail: Mapped[str] = mapped_column(Text, default="")


class DynamicTool(Base):
    """A reusable capability: metadata and lifecycle here, script on disk
    once active. status is draft until a human activates it."""

    __tablename__ = "dynamic_tools"

    name: Mapped[str] = mapped_column(String(40), primary_key=True)
    description: Mapped[str] = mapped_column(Text)
    params_json: Mapped[str] = mapped_column(Text, default="{}")
    script: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(16), default="draft")
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class DynamicToolVersion(Base):
    """Append-only history of every tool change; rollback re-points the tool
    and records that as a new version."""

    __tablename__ = "dynamic_tool_versions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(40))
    version: Mapped[int] = mapped_column(Integer)
    description: Mapped[str] = mapped_column(Text)
    params_json: Mapped[str] = mapped_column(Text)
    script: Mapped[str] = mapped_column(Text)
    reason: Mapped[str] = mapped_column(Text, default="")
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
