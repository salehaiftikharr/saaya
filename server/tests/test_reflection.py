"""Reflection tests: pure validation rules and the staged run. Hermetic."""

from pathlib import Path

import pytest

from saaya.reflection.runner import ReflectionRunner
from saaya.reflection.validate import validate_change
from saaya.reflection.versions import VersionLedger

IDENTITY = "# Saaya identity (protected)\n\n- rules\n"
HOW = "# How I work\n\n## Preferences\n"


@pytest.fixture()
def memory_dir(tmp_path: Path) -> Path:
    (tmp_path / "identity.md").write_text(IDENTITY, encoding="utf-8")
    (tmp_path / "how-i-work.md").write_text(HOW, encoding="utf-8")
    return tmp_path


def _no_protected_change() -> tuple[dict[str, str], dict[str, str]]:
    return {"identity.md": IDENTITY}, {"identity.md": IDENTITY}


class TestValidation:
    def test_clean_addition_passes(self) -> None:
        before, after = _no_protected_change()
        result = validate_change("how-i-work.md", HOW, HOW + "- prefers tabs\n", before, after)
        assert result == []

    def test_protected_file_is_never_writable(self) -> None:
        before, after = _no_protected_change()
        result = validate_change("identity.md", IDENTITY, IDENTITY + "x", before, after)
        assert any(v.rule == "protected-file" for v in result)

    def test_unknown_file_is_rejected(self) -> None:
        before, after = _no_protected_change()
        result = validate_change("notes.md", "", "content", before, after)
        assert any(v.rule == "allowlist" for v in result)

    def test_protected_drift_is_caught_even_for_valid_target(self) -> None:
        result = validate_change(
            "how-i-work.md",
            HOW,
            HOW + "- fine\n",
            {"identity.md": IDENTITY},
            {"identity.md": IDENTITY + "tampered"},
        )
        assert any(v.rule == "protected-changed" for v in result)

    def test_growth_cap(self) -> None:
        before, after = _no_protected_change()
        grown = HOW + "".join(f"- line {i}\n" for i in range(41))
        result = validate_change("how-i-work.md", HOW, grown, before, after)
        assert any(v.rule == "growth-cap" for v in result)

    def test_shrink_guard(self) -> None:
        before, after = _no_protected_change()
        long_before = "\n".join(f"- keep {i}" for i in range(20))
        result = validate_change("how-i-work.md", long_before, "- one", before, after)
        assert any(v.rule == "shrink-guard" for v in result)

    def test_credential_patterns_are_blocked(self) -> None:
        before, after = _no_protected_change()
        for leak in (
            "api_key = sk-abc12345678",
            "password: hunter2secret",
            "xoxb-12345678-abcdefgh",
        ):
            result = validate_change("how-i-work.md", HOW, HOW + leak + "\n", before, after)
            assert any(v.rule == "credential" for v in result), leak

    def test_unbalanced_fences_are_rejected(self) -> None:
        before, after = _no_protected_change()
        result = validate_change("how-i-work.md", HOW, HOW + "```python\n", before, after)
        assert any(v.rule == "markdown-fences" for v in result)


class TestRunner:
    async def test_applied_proposal_writes_and_versions(self, memory_dir: Path) -> None:
        async def propose(current: str, transcript: str) -> str:
            return current + "- saleha prefers tabs\n"

        runner = ReflectionRunner(memory_dir, propose)
        result = await runner.run("transcript", "learned a preference")
        assert result.outcome == "applied"
        assert "prefers tabs" in (memory_dir / "how-i-work.md").read_text()
        entries = runner.ledger.entries()
        assert [e.version for e in entries] == [1, 2]
        assert entries[0].reason.startswith("baseline")

    async def test_rejected_proposal_changes_nothing(self, memory_dir: Path) -> None:
        async def propose(current: str, transcript: str) -> str:
            return current + "api_key = sk-abc12345678\n"

        runner = ReflectionRunner(memory_dir, propose)
        result = await runner.run("transcript", "attempted leak")
        assert result.outcome == "rejected"
        assert (memory_dir / "how-i-work.md").read_text() == HOW
        assert runner.ledger.current_version() == 1

    async def test_skip_when_proposer_returns_none(self, memory_dir: Path) -> None:
        async def propose(current: str, transcript: str) -> None:
            return None

        runner = ReflectionRunner(memory_dir, propose)
        result = await runner.run("transcript", "nothing new")
        assert result.outcome == "skipped"

    async def test_rollback_restores_and_records(self, memory_dir: Path) -> None:
        async def propose(current: str, transcript: str) -> str:
            return current + "- new learning\n"

        runner = ReflectionRunner(memory_dir, propose)
        await runner.run("transcript", "learned")
        assert "new learning" in (memory_dir / "how-i-work.md").read_text()
        runner.ledger.rollback_to(1)
        assert (memory_dir / "how-i-work.md").read_text() == HOW
        assert runner.ledger.current_version() == 3


class TestLedger:
    def test_file_at_reads_snapshots(self, memory_dir: Path) -> None:
        ledger = VersionLedger(memory_dir)
        ledger.record("baseline", ["how-i-work.md"])
        assert ledger.file_at(1, "how-i-work.md") == HOW
        assert ledger.file_at(9, "how-i-work.md") is None
