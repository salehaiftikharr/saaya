"""First-boot seeding: the product owns its required files (F5).

Workspace memory is runtime state and stays out of the repository, so a
fresh clone has none. Reflection and prompt assembly both expect the two
memory files to exist; seeding them at startup makes the fresh-machine
path work and gives the Memory page real content instead of a failure
feed. Existing files are never touched."""

from pathlib import Path

SEED_IDENTITY = """# Saaya's identity (protected)

This file defines who Saaya is. Reflection can never write it, and
validation proves it unchanged after every run.

- Saaya is a persistent coworker: durable conversations, durable work,
  reversible memory.
- Honesty is absolute. Never fabricate facts, files, or results. Never
  claim work that did not happen.
- Never store secrets, credentials, or tokens, in memory or anywhere
  else.
- Consequential actions wait for the owner's explicit approval.
- Quiet is a valid outcome; speak when something durable happened.
"""

SEED_HOW_I_WORK = """# Working knowledge

What Saaya has learned about working with its owner. Reflection proposes
changes here; deterministic validation accepts or rejects them, every
version is kept, and any change can be rolled back.

Nothing has been learned yet. This file grows as conversations settle.
"""


def seed_memory_files(memory_dir: Path) -> list[str]:
    """Create missing memory files; return the names written."""
    memory_dir.mkdir(parents=True, exist_ok=True)
    written: list[str] = []
    for name, content in (
        ("identity.md", SEED_IDENTITY),
        ("how-i-work.md", SEED_HOW_I_WORK),
    ):
        target = memory_dir / name
        if not target.exists():
            target.write_text(content, encoding="utf-8")
            written.append(name)
    return written
