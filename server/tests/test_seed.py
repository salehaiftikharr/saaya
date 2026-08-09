"""Fresh-machine seeding (F5): the product creates its required files and
never overwrites existing ones."""

from pathlib import Path

from saaya.memory.seed import seed_memory_files


def test_seed_creates_missing_files(tmp_path: Path) -> None:
    written = seed_memory_files(tmp_path / "memory")
    assert sorted(written) == ["how-i-work.md", "identity.md"]
    assert (tmp_path / "memory" / "identity.md").read_text().startswith("# Saaya")


def test_seed_never_overwrites(tmp_path: Path) -> None:
    memory = tmp_path / "memory"
    memory.mkdir(parents=True)
    (memory / "how-i-work.md").write_text("owner content")
    written = seed_memory_files(memory)
    assert written == ["identity.md"]
    assert (memory / "how-i-work.md").read_text() == "owner content"
