---
id: P-006
title: MCP server and external MCP consumption
type: progress
status: complete
created: 2026-08-08
updated: 2026-08-08
tags:
  - mcp
related:
  - journal/progress/P-005-heartbeat.md
  - journal/roadmap.md
supersedes: []
---

# P-006: MCP server and external MCP consumption

## Objective

Roadmap item 9: external clients can talk to Saaya over MCP, and Saaya can
use tools from external MCP servers.

## Work completed

- MCP server (mcp SDK, streamable HTTP, stateless) mounted at /mcp inside
  the FastAPI app, enabled only when MCP_TOKEN is set. Bearer auth via a
  constant-time StaticTokenVerifier with operator scope. Tools: status,
  search_memory (recall with provenance fields), ask_saaya (full agent turn
  on a real thread).
- External consumption: workspace/mcp-servers.json declares servers;
  langchain-mcp-adapters loads their tools into the agent at build.
  examples/demo_mcp_server.py is a stdio demo server proving the path.
- Dependency conflict found and resolved: langchain-mcp-adapters resolves
  mcp 1.29, whose server API is FastMCP, not the newer MCPServer; the server
  module is written against 1.29 with the waivers documented in-module.

## Verification

- Gates green: ruff, pyright strict 0 errors, pytest 35.
- Server: 401 without a token; with a real streamable HTTP MCP client
  (bearer via httpx), tools/list returned all three, status ok,
  search_memory returned genuinely remembered items, ask_saaya ran a full
  turn that itself recalled long-term memory.
- Consumption: with the demo server declared, the chat agent called
  word_count and returned the correct count through the UI event stream.

## Open risks

- The MCP token is a single static operator credential; scoped multi-client
  tokens are future work.
- External servers load at startup only; hot reload arrives with dynamic
  tool creation (roadmap 11).

## Next step

Roadmap item 10: Slack channel over Socket Mode using the provided tokens.
