"""Per-Job workspace containment (ADR-004). One guard for every file and
command surface the runner exposes; a path that escapes is refused, and the
caller records the refusal as a ledger event so denials stay visible."""

from pathlib import Path

MAX_FILE_BYTES = 512 * 1024
MAX_WORKSPACE_BYTES = 8 * 1024 * 1024


class WorkspaceViolation(Exception):
    """A refused workspace operation. The message is safe to surface."""


def job_workspace(root: Path, job_id: str) -> Path:
    """The Job's directory, created on first use. The name is the job id,
    so cleanup is the removal of exactly one directory."""
    path = root / job_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def resolve_inside(workspace: Path, candidate: str) -> Path:
    """Resolve a model-supplied relative path and prove it stays inside the
    workspace. Cheap textual rejections first; the resolved-prefix check is
    the backstop that also catches symlink escapes."""
    if not candidate or "\x00" in candidate:
        raise WorkspaceViolation("empty or malformed path")
    raw = Path(candidate)
    if raw.is_absolute():
        raise WorkspaceViolation(f"absolute paths are not allowed: {candidate}")
    if ".." in raw.parts:
        raise WorkspaceViolation(f"parent traversal is not allowed: {candidate}")
    resolved = (workspace / raw).resolve()
    root = workspace.resolve()
    if resolved != root and root not in resolved.parents:
        raise WorkspaceViolation(f"path escapes the job workspace: {candidate}")
    return resolved


def _visible(workspace: Path, path: Path) -> bool:
    """Dot-directories (the scrubbed HOME, .git internals) are runtime
    machinery, not the job's work product."""
    return not any(part.startswith(".") for part in path.relative_to(workspace).parts)


def workspace_usage(workspace: Path) -> int:
    return sum(f.stat().st_size for f in workspace.rglob("*") if f.is_file())


def guarded_write(workspace: Path, candidate: str, content: str) -> Path:
    """Write a file inside the workspace under both size caps."""
    target = resolve_inside(workspace, candidate)
    data = content.encode("utf-8")
    if len(data) > MAX_FILE_BYTES:
        raise WorkspaceViolation(
            f"file exceeds the {MAX_FILE_BYTES // 1024} KiB per-file cap: {candidate}"
        )
    if workspace_usage(workspace) + len(data) > MAX_WORKSPACE_BYTES:
        raise WorkspaceViolation(
            f"write would exceed the {MAX_WORKSPACE_BYTES // (1024 * 1024)} MiB workspace cap"
        )
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")
    return target


def guarded_read(workspace: Path, candidate: str) -> str:
    target = resolve_inside(workspace, candidate)
    if not target.is_file():
        raise WorkspaceViolation(f"no such file in the job workspace: {candidate}")
    return target.read_text(encoding="utf-8")


def list_files(workspace: Path) -> list[dict[str, object]]:
    """Every file in the workspace, relative paths and sizes, sorted."""
    rows: list[dict[str, object]] = []
    for path in sorted(workspace.rglob("*")):
        if path.is_file() and _visible(workspace, path):
            rows.append({"path": str(path.relative_to(workspace)), "size": path.stat().st_size})
    return rows
