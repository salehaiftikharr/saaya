"""External MCP servers become agent tools.

The operator declares servers in workspace/mcp-servers.json; every declared
tool is loaded at agent build. Missing file means no external tools.
"""

import json
from pathlib import Path
from typing import Any

from langchain_core.tools import BaseTool
from langchain_mcp_adapters.client import MultiServerMCPClient


def read_server_config(path: Path) -> dict[str, dict[str, Any]]:
    if not path.exists():
        return {}
    raw = json.loads(path.read_text(encoding="utf-8"))
    servers = raw.get("servers", {})
    if not isinstance(servers, dict):
        raise ValueError("mcp-servers.json: 'servers' must be an object")
    return servers  # pyright: ignore[reportUnknownVariableType]


async def load_external_tools(config_path: Path) -> list[BaseTool]:
    servers = read_server_config(config_path)
    if not servers:
        return []
    client = MultiServerMCPClient(servers)  # pyright: ignore[reportArgumentType]
    return await client.get_tools()
