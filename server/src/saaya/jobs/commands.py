"""The ADR-006 command policy and runner: argv lists only, deny by default,
scrubbed environment, no network-capable invocation on the allowlist. Every
verdict is data so the ledger can carry it."""

import subprocess
import time
from dataclasses import dataclass
from pathlib import Path

ALLOWED_BINARIES = frozenset({"python3", "ls", "cat", "wc", "head", "tail", "grep", "diff", "git"})
GIT_READ = frozenset({"status", "log", "diff", "show", "ls-files"})
GIT_GATED = frozenset({"init", "apply", "add", "commit", "restore", "mv", "rm"})
OUTPUT_CAP = 10_000
DEFAULT_TIMEOUT_S = 60


@dataclass(frozen=True)
class Verdict:
    kind: str  # "allowed" | "gated" | "refused"
    reason: str = ""


@dataclass(frozen=True)
class CommandResult:
    exit_code: int
    stdout: str
    stderr: str
    duration_ms: int
    truncated: bool


def evaluate(argv: list[str]) -> Verdict:
    """Deterministic policy. Refusals name their rule so the refusal event
    teaches the reader what the boundary is."""
    if not argv or not all(part for part in argv):
        return Verdict("refused", "argv must be a list of non-empty strings")
    binary = argv[0]
    if "/" in binary:
        return Verdict("refused", "binaries are named, never pathed")
    if binary not in ALLOWED_BINARIES:
        return Verdict("refused", f"{binary} is not on the command allowlist")
    for token in argv[1:]:
        if token.startswith("/"):
            return Verdict("refused", f"absolute paths are not allowed: {token}")
        if ".." in token.split("/"):
            return Verdict("refused", f"parent traversal is not allowed: {token}")
    if binary == "git":
        args = argv[1:]
        if any(token == "-c" or token.startswith("--config") for token in args):
            return Verdict("refused", "git config injection is not allowed")
        subcommand = next((token for token in args if not token.startswith("-")), "")
        if subcommand in GIT_READ:
            return Verdict("allowed")
        if subcommand in GIT_GATED:
            return Verdict("gated", f"git {subcommand} writes to the workspace")
        return Verdict(
            "refused",
            f"git {subcommand or '(none)'} is neither read-only nor a gated write",
        )
    return Verdict("allowed")


def scrubbed_env(workspace: Path) -> dict[str, str]:
    """Nothing inherited: provider keys and tokens in the server process are
    structurally invisible to commands."""
    return {
        "PATH": "/usr/bin:/bin",
        "HOME": str(workspace),
        "LANG": "C.UTF-8",
    }


def run_command(
    workspace: Path, argv: list[str], timeout_s: int = DEFAULT_TIMEOUT_S
) -> CommandResult:
    """Execute an already-permitted argv inside the workspace. Blocking;
    callers wrap in a thread (uvloop cannot fork from the loop)."""
    started = time.monotonic()
    try:
        completed = subprocess.run(
            argv,
            cwd=workspace,
            env=scrubbed_env(workspace),
            capture_output=True,
            text=True,
            timeout=timeout_s,
        )
        stdout, stderr = completed.stdout, completed.stderr
        exit_code = completed.returncode
    except subprocess.TimeoutExpired as expired:
        stdout = str(expired.stdout or "")
        stderr = f"timed out after {timeout_s}s"
        exit_code = -1
    duration_ms = int((time.monotonic() - started) * 1000)
    truncated = len(stdout) > OUTPUT_CAP or len(stderr) > OUTPUT_CAP
    return CommandResult(
        exit_code=exit_code,
        stdout=stdout[:OUTPUT_CAP],
        stderr=stderr[:OUTPUT_CAP],
        duration_ms=duration_ms,
        truncated=truncated,
    )
