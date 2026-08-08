"""The reflection run: observe a transcript, propose one file update, validate
deterministically, then apply and version or discard entirely.

The proposer is injected as a callable so tests run without a model. No LLM
ever judges the proposal; validate.py rules decide alone.
"""

from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from pathlib import Path

from saaya.reflection.validate import PROTECTED_FILES, Violation, validate_change
from saaya.reflection.versions import VersionLedger

TARGET_FILE = "how-i-work.md"

Proposer = Callable[[str, str], Awaitable[str | None]]
"""(current_file_content, transcript) -> proposed content, or None to skip."""


@dataclass(frozen=True)
class ReflectionResult:
    outcome: str  # "applied" | "skipped" | "rejected"
    version: int
    violations: list[Violation]


class ReflectionRunner:
    def __init__(self, memory_dir: Path, propose: Proposer) -> None:
        self._memory_dir = memory_dir
        self._propose = propose
        self._ledger = VersionLedger(memory_dir)

    def _read(self, name: str) -> str:
        return (self._memory_dir / name).read_text(encoding="utf-8")

    def _protected_contents(self) -> dict[str, str]:
        return {name: self._read(name) for name in sorted(PROTECTED_FILES)}

    async def run(self, transcript: str, reason: str) -> ReflectionResult:
        if self._ledger.current_version() == 0:
            self._ledger.record("baseline before first reflection", [TARGET_FILE])

        before = self._read(TARGET_FILE)
        protected_before = self._protected_contents()

        proposed = await self._propose(before, transcript)
        if proposed is None or proposed.strip() == before.strip():
            return ReflectionResult("skipped", self._ledger.current_version(), [])

        violations = validate_change(
            TARGET_FILE,
            before,
            proposed,
            protected_before,
            self._protected_contents(),
        )
        if violations:
            return ReflectionResult("rejected", self._ledger.current_version(), violations)

        (self._memory_dir / TARGET_FILE).write_text(proposed, encoding="utf-8")
        entry = self._ledger.record(reason, [TARGET_FILE])
        return ReflectionResult("applied", entry.version, [])

    @property
    def ledger(self) -> VersionLedger:
        return self._ledger
