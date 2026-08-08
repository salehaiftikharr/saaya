"""Version ledger for procedural memory: snapshot, record, roll back.

Byte-exact snapshots per version; an append-only JSONL ledger describes each
change. Rollback restores a snapshot and records that as a new version.
"""

import json
import shutil
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path


@dataclass(frozen=True)
class VersionEntry:
    version: int
    reason: str
    changed_files: list[str]
    recorded_at: str


class VersionLedger:
    def __init__(self, memory_dir: Path) -> None:
        self._memory_dir = memory_dir
        self._versions_dir = memory_dir / ".versions"
        self._ledger_path = self._versions_dir / "ledger.jsonl"

    def entries(self) -> list[VersionEntry]:
        if not self._ledger_path.exists():
            return []
        entries: list[VersionEntry] = []
        for line in self._ledger_path.read_text(encoding="utf-8").splitlines():
            if line.strip():
                raw = json.loads(line)
                entries.append(
                    VersionEntry(
                        version=int(raw["version"]),
                        reason=str(raw["reason"]),
                        changed_files=list(raw["changed_files"]),
                        recorded_at=str(raw["recorded_at"]),
                    )
                )
        return entries

    def current_version(self) -> int:
        entries = self.entries()
        return entries[-1].version if entries else 0

    def _memory_files(self) -> list[Path]:
        return sorted(
            path for path in self._memory_dir.iterdir() if path.is_file() and path.suffix == ".md"
        )

    def snapshot(self, version: int) -> Path:
        """Copy every memory file into the numbered snapshot directory."""
        target = self._versions_dir / str(version)
        target.mkdir(parents=True, exist_ok=True)
        for path in self._memory_files():
            shutil.copy2(path, target / path.name)
        return target

    def record(self, reason: str, changed_files: list[str]) -> VersionEntry:
        version = self.current_version() + 1
        self.snapshot(version)
        entry = VersionEntry(
            version=version,
            reason=reason,
            changed_files=changed_files,
            recorded_at=datetime.now(UTC).isoformat(),
        )
        self._versions_dir.mkdir(parents=True, exist_ok=True)
        with self._ledger_path.open("a", encoding="utf-8") as ledger:
            ledger.write(
                json.dumps(
                    {
                        "version": entry.version,
                        "reason": entry.reason,
                        "changed_files": entry.changed_files,
                        "recorded_at": entry.recorded_at,
                    }
                )
                + "\n"
            )
        return entry

    def file_at(self, version: int, filename: str) -> str | None:
        path = self._versions_dir / str(version) / filename
        return path.read_text(encoding="utf-8") if path.exists() else None

    def rollback_to(self, version: int) -> VersionEntry:
        """Restore a snapshot's files, recorded as a new version on the ledger."""
        source = self._versions_dir / str(version)
        if not source.exists():
            raise ValueError(f"no snapshot for version {version}")
        restored: list[str] = []
        for path in sorted(source.iterdir()):
            if path.suffix == ".md":
                shutil.copy2(path, self._memory_dir / path.name)
                restored.append(path.name)
        return self.record(f"rollback to version {version}", restored)
