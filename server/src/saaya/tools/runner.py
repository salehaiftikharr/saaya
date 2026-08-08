"""Runs an active tool script in a subprocess with a scrubbed environment.

The environment carries only PATH, HOME, LANG, and TOOL_INPUT; no process
secrets reach the script. Hard timeout; output capped. The subprocess runs
in a worker thread because uvloop (uvicorn's loop) does not spawn processes
the way plain asyncio does; subprocess.run is loop-agnostic.
"""

import asyncio
import json
import os
import subprocess
import sys
from pathlib import Path

TIMEOUT_SECONDS = 30
MAX_OUTPUT_CHARS = 10_000


def _run(script_path: Path, params: dict[str, object]) -> str:
    env = {
        "PATH": os.environ.get("PATH", ""),
        "HOME": os.environ.get("HOME", ""),
        "LANG": os.environ.get("LANG", "C.UTF-8"),
        "TOOL_INPUT": json.dumps(params),
    }
    try:
        completed = subprocess.run(
            [sys.executable, str(script_path)],
            env=env,
            cwd=script_path.parent,
            capture_output=True,
            timeout=TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired:
        return f"Tool timed out after {TIMEOUT_SECONDS} seconds."
    if completed.returncode != 0:
        detail = completed.stderr.decode(errors="replace")[:500]
        return f"Tool failed (exit {completed.returncode}): {detail}"
    return completed.stdout.decode(errors="replace")[:MAX_OUTPUT_CHARS].strip()


async def run_tool_script(script_path: Path, params: dict[str, object]) -> str:
    return await asyncio.to_thread(_run, script_path, params)
