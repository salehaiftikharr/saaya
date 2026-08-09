"""Saaya server: agent, memory, reflection, heartbeats, MCP, and API."""

__version__ = "0.1.0"


def main() -> None:
    """The golden first command (F11): `uv run saaya` migrates and serves,
    matching what the container does, so a newcomer's obvious try works."""
    import subprocess
    import sys

    upgraded = subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"])
    if upgraded.returncode != 0:
        sys.exit(upgraded.returncode)

    import uvicorn

    uvicorn.run("saaya.api.app:create_app", factory=True, host="127.0.0.1", port=8000)
