"""External MCP servers become agent tools.

The operator declares servers in workspace/mcp-servers.json; every declared
tool is loaded at agent build. Missing file means no external tools. An
unreachable server is skipped with a warning: an external dependency being
down must never prevent Saaya from booting.
"""

import json
import logging
from pathlib import Path
from typing import Any

from langchain_core.tools import BaseTool
from langchain_mcp_adapters.client import MultiServerMCPClient

logger = logging.getLogger(__name__)


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
    tools: list[BaseTool] = []
    for name, config in servers.items():
        try:
            client = MultiServerMCPClient({name: config})  # pyright: ignore[reportArgumentType]
            tools.extend(await client.get_tools())
        except Exception as error:
            logger.warning("external MCP server %r unavailable, skipping: %s", name, error)
    return tools
