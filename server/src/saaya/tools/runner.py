"""Runs an active tool script in a subprocess with a scrubbed environment.

The environment carries only PATH, HOME, LANG, and TOOL_INPUT; no process
secrets reach the script. Hard timeout; output capped.
"""

import asyncio
import json
import os
import sys
from pathlib import Path

TIMEOUT_SECONDS = 30
MAX_OUTPUT_CHARS = 10_000


async def run_tool_script(script_path: Path, params: dict[str, object]) -> str:
    env = {
        "PATH": os.environ.get("PATH", ""),
        "HOME": os.environ.get("HOME", ""),
        "LANG": os.environ.get("LANG", "C.UTF-8"),
        "TOOL_INPUT": json.dumps(params),
    }
    process = await asyncio.create_subprocess_exec(
        sys.executable,
        str(script_path),
        env=env,
        cwd=script_path.parent,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=TIMEOUT_SECONDS)
    except TimeoutError:
        process.kill()
        return f"Tool timed out after {TIMEOUT_SECONDS} seconds."
    if process.returncode != 0:
        detail = stderr.decode(errors="replace")[:500]
        return f"Tool failed (exit {process.returncode}): {detail}"
    return stdout.decode(errors="replace")[:MAX_OUTPUT_CHARS].strip()
