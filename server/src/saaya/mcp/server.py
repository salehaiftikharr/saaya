"""Saaya's MCP server: ask, search memory, status. Mounted into FastAPI."""

# Tools register through decorators and are invoked by the MCP runtime, so
# pyright's unused-function rule does not apply in this module. FastMCP's
# decorators are partially typed in mcp 1.29 (the version the
# langchain-mcp-adapters ecosystem resolves), hence the two targeted waivers.
# pyright: reportUnusedFunction=false, reportUnknownMemberType=false, reportUntypedFunctionDecorator=false

import uuid
from collections.abc import Callable
from typing import Any

from mcp.server.auth.settings import AuthSettings
from mcp.server.fastmcp import FastMCP
from pydantic import AnyHttpUrl
from starlette.applications import Starlette

from saaya import __version__
from saaya.mcp.auth import StaticTokenVerifier
from saaya.memory.store import SemanticMemoryStore


def build_mcp_app(
    *,
    token: str,
    public_url: str,
    memory_store: SemanticMemoryStore,
    get_agent: Callable[[], Any],
) -> Starlette:
    server = FastMCP(
        name="saaya",
        instructions=(
            "Saaya is a persistent AI coworker. ask_saaya runs a full agent "
            "turn; search_memory reads long-term memory; status reports health."
        ),
        token_verifier=StaticTokenVerifier(token),
        auth=AuthSettings(
            issuer_url=AnyHttpUrl(public_url),
            resource_server_url=AnyHttpUrl(f"{public_url}/mcp"),
            required_scopes=["operator"],
        ),
        streamable_http_path="/",
        stateless_http=True,
    )

    @server.tool(description="Saaya's version and readiness.")
    async def status() -> dict[str, str]:
        return {"status": "ok", "version": __version__}

    @server.tool(
        description=(
            "Search Saaya's long-term memory for durable facts, preferences, "
            "and context learned across conversations."
        )
    )
    async def search_memory(query: str) -> list[dict[str, str | float | int]]:
        items = await memory_store.recall(query, limit=8)
        return [
            {
                "kind": item.kind,
                "text": item.text,
                "confidence": item.confidence,
                "reinforced": item.reinforcement_count,
            }
            for item in items
        ]

    @server.tool(
        description=(
            "Ask Saaya to do something or answer something; runs a full agent "
            "turn with tools and memory. Optional thread_id continues an "
            "existing conversation."
        )
    )
    async def ask_saaya(text: str, thread_id: str | None = None) -> dict[str, str]:
        agent = get_agent()
        thread = thread_id or f"mcp-{uuid.uuid4()}"
        result = await agent.ainvoke(
            {"messages": [{"role": "user", "content": text}]},
            config={"configurable": {"thread_id": thread}},
        )
        messages = result.get("messages", [])
        final = messages[-1] if messages else None
        text_out = str(getattr(final, "text", "") or getattr(final, "content", ""))
        return {"thread_id": thread, "reply": text_out}

    return server.streamable_http_app()
