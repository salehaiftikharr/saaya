"""Consumption config tests. Hermetic; the live tool-loading path is
exercised by the demo server verification in the journal."""

import json
from pathlib import Path

import pytest

from saaya.mcp.consumption import read_server_config


def test_missing_file_means_no_servers(tmp_path: Path) -> None:
    assert read_server_config(tmp_path / "absent.json") == {}


def test_reads_declared_servers(tmp_path: Path) -> None:
    path = tmp_path / "mcp-servers.json"
    path.write_text(
        json.dumps(
            {
                "servers": {
                    "demo": {
                        "transport": "stdio",
                        "command": "python",
                        "args": ["demo_mcp_server.py"],
                    }
                }
            }
        ),
        encoding="utf-8",
    )
    servers = read_server_config(path)
    assert servers["demo"]["transport"] == "stdio"


def test_rejects_malformed_servers_shape(tmp_path: Path) -> None:
    path = tmp_path / "mcp-servers.json"
    path.write_text(json.dumps({"servers": ["not", "an", "object"]}), encoding="utf-8")
    with pytest.raises(ValueError, match="must be an object"):
        read_server_config(path)


async def test_unreachable_server_is_skipped_not_fatal(tmp_path: Path) -> None:
    path = tmp_path / "mcp-servers.json"
    path.write_text(
        json.dumps(
            {
                "servers": {
                    "gone": {
                        "transport": "stdio",
                        "command": "/nonexistent/binary",
                        "args": [],
                    }
                }
            }
        ),
        encoding="utf-8",
    )
    from saaya.mcp.consumption import load_external_tools

    assert await load_external_tools(path) == []
