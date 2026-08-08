"""A tiny stdio MCP server used to verify external tool consumption.

Run by Saaya via workspace/mcp-servers.json; also usable standalone:
uv run python examples/demo_mcp_server.py
"""

from mcp.server.fastmcp import FastMCP

server = FastMCP(name="demo-tools")


@server.tool(description="Count the words in a text.")
def word_count(text: str) -> int:
    return len(text.split())


if __name__ == "__main__":
    server.run("stdio")
