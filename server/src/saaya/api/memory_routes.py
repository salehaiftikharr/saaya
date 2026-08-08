"""Memory and reflection API: inspect, run reflection, roll back."""

from fastapi import APIRouter, Request
from pydantic import BaseModel

from saaya.api.history import to_transcript
from saaya.memory.store import RememberedItem
from saaya.reflection.validate import PROTECTED_FILES

memory_router = APIRouter()


class ProceduralFile(BaseModel):
    name: str
    content: str
    protected: bool


class VersionInfo(BaseModel):
    version: int
    reason: str
    changed_files: list[str]
    recorded_at: str


class MemoryOverview(BaseModel):
    procedural: list[ProceduralFile]
    versions: list[VersionInfo]
    semantic: list[RememberedItem]


class ReflectRequest(BaseModel):
    thread_id: str


class ReflectResponse(BaseModel):
    outcome: str
    version: int
    violations: list[str]


class RollbackRequest(BaseModel):
    version: int


@memory_router.get("/api/memory")
async def memory_overview(request: Request) -> MemoryOverview:
    state = request.app.state
    memory_dir = state.settings.workspace_dir / "memory"
    procedural = [
        ProceduralFile(
            name=path.name,
            content=path.read_text(encoding="utf-8"),
            protected=path.name in PROTECTED_FILES,
        )
        for path in sorted(memory_dir.glob("*.md"))
    ]
    versions = [
        VersionInfo(
            version=entry.version,
            reason=entry.reason,
            changed_files=entry.changed_files,
            recorded_at=entry.recorded_at,
        )
        for entry in state.reflection_runner.ledger.entries()
    ]
    semantic = await state.memory_store.list_recent()
    return MemoryOverview(procedural=procedural, versions=versions, semantic=semantic)


@memory_router.post("/api/reflection/run")
async def run_reflection(request: Request, body: ReflectRequest) -> ReflectResponse:
    state = request.app.state
    graph_state = await state.agent.aget_state({"configurable": {"thread_id": body.thread_id}})
    transcript = "\n".join(
        f"{message.role}: {message.text}"
        for message in to_transcript(graph_state.values.get("messages", []))
    )
    result = await state.reflection_runner.run(
        transcript, f"reflection over thread {body.thread_id}"
    )
    if result.outcome == "applied":
        state.rebuild_agent()
    return ReflectResponse(
        outcome=result.outcome,
        version=result.version,
        violations=[f"{v.rule}: {v.detail}" for v in result.violations],
    )


@memory_router.post("/api/memory/rollback")
async def rollback(request: Request, body: RollbackRequest) -> ReflectResponse:
    state = request.app.state
    entry = state.reflection_runner.ledger.rollback_to(body.version)
    state.rebuild_agent()
    return ReflectResponse(outcome="rolled-back", version=entry.version, violations=[])


class HeartbeatRunInfo(BaseModel):
    name: str
    outcome: str
    detail: str
    started_at: str
    finished_at: str | None


@memory_router.get("/api/heartbeats")
async def heartbeat_history(request: Request) -> list[HeartbeatRunInfo]:
    from saaya.heartbeat.runner import recent_runs

    runs = await recent_runs(request.app.state.heartbeat_engine)
    return [
        HeartbeatRunInfo(
            name=run.name,
            outcome=run.outcome,
            detail=run.detail,
            started_at=run.started_at.isoformat(),
            finished_at=run.finished_at.isoformat() if run.finished_at else None,
        )
        for run in runs
    ]
