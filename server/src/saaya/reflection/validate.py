"""Deterministic validation of a proposed procedural-memory change.

Pure functions, no LLM anywhere. A proposal passes every rule or it is
discarded; there is no partial application.
"""

import re
from dataclasses import dataclass

PROTECTED_FILES = frozenset({"identity.md"})
WRITABLE_FILES = frozenset({"how-i-work.md"})
MAX_ADDED_LINES = 40
MAX_TOTAL_LINES = 400
MAX_SHRINK_RATIO = 0.5

CREDENTIAL_PATTERNS = (
    re.compile(r"sk-[A-Za-z0-9_-]{8,}"),
    re.compile(r"gh[pousr]_[A-Za-z0-9]{16,}"),
    re.compile(r"xox[baprs]-[A-Za-z0-9-]{8,}"),
    re.compile(r"(?i)(api[_-]?key|secret|token|password)\s*[:=]\s*\S+"),
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
)


@dataclass(frozen=True)
class Violation:
    rule: str
    detail: str


def validate_change(
    filename: str,
    before: str,
    after: str,
    protected_before: dict[str, str],
    protected_after: dict[str, str],
) -> list[Violation]:
    """Every rule that fails, not just the first; the caller logs them all."""
    violations: list[Violation] = []

    if filename in PROTECTED_FILES:
        violations.append(Violation("protected-file", f"{filename} is never writable"))
    elif filename not in WRITABLE_FILES:
        violations.append(Violation("allowlist", f"{filename} is not a writable memory file"))

    for name, original in protected_before.items():
        if protected_after.get(name) != original:
            violations.append(Violation("protected-changed", f"{name} changed during the run"))

    before_lines = before.splitlines()
    after_lines = after.splitlines()
    added = len(after_lines) - len(before_lines)
    if added > MAX_ADDED_LINES:
        violations.append(
            Violation("growth-cap", f"added {added} lines; the cap is {MAX_ADDED_LINES}")
        )
    if len(after_lines) > MAX_TOTAL_LINES:
        violations.append(
            Violation("size-cap", f"{len(after_lines)} lines; the cap is {MAX_TOTAL_LINES}")
        )
    if before_lines and len(after_lines) < len(before_lines) * MAX_SHRINK_RATIO:
        violations.append(
            Violation(
                "shrink-guard",
                f"shrank from {len(before_lines)} to {len(after_lines)} lines",
            )
        )
    if after.strip() == "":
        violations.append(Violation("empty-file", "the result would be empty"))

    if after.count("```") % 2 != 0:
        violations.append(Violation("markdown-fences", "unbalanced code fences"))

    # The reflection contract says keep the structure; a proposal that loses
    # the file's headings is prose, not the file.
    before_headings = {line for line in before.splitlines() if line.startswith("#")}
    after_lines = set(after.splitlines())
    missing = sorted(h for h in before_headings if h not in after_lines)
    if missing:
        violations.append(Violation("structure", f"missing headings: {', '.join(missing[:3])}"))

    for pattern in CREDENTIAL_PATTERNS:
        match = pattern.search(after)
        if match:
            violations.append(
                Violation("credential", f"matches credential pattern {pattern.pattern!r}")
            )
            break

    return violations
