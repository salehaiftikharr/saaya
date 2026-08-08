---
id: RES-004
title: Saaya architecture decisions
type: decision
status: accepted
created: 2026-08-07
updated: 2026-08-07
tags:
  - architecture
  - langchain
  - deepagents
  - decisions
related:
  - docs/research/phantom.md
  - docs/research/mistri.md
  - docs/research/rendi.md
supersedes: []
---

# Saaya architecture decisions

Phase 0 output. Every entry states what we do and why. Individual decisions that
prove contentious later graduate to their own ADR under `journal/decisions/`.

## System architecture

```
                       Browser (Next.js web app)
                    chat | status | memory | history
                              |  SSE + JSON
                              v
 +--------------------------- FastAPI (server/) ---------------------------+
 |                                                                         |
 |  /api/chat (SSE)   /api/threads   /api/memory   /api/heartbeats   /mcp  |
 |        |                                                           |    |
 |        v                                                           |    |
 |  typed event adapter  <--  astream_events                      FastMCP  |
 |        |                                                                |
 |        v                                                                |
 |  Deep Agent (create_deep_agent)          Reflection run (restricted)    |
 |   planning, subagents, filesystem,        observe -> write updates ->   |
 |   tools, external MCP via adapters        deterministic validation ->   |
 |        |                                  version or rollback           |
 |        |                                        |                       |
 |  Heartbeat runner (durable, idempotent) --------+                       |
 |        |                                                                |
 +--------|----------------------------------------------------------------+
          v
   PostgreSQL + pgvector (one container)
   checkpoints (episodic) | store + embeddings (semantic) | app tables
   procedural memory files (versioned workspace, snapshot + rollback)
```

## Adopt (take the concept and its shape)

- **Deep Agents as the primary harness** (`create_deep_agent`): planning,
  subagents, filesystem backends, context management, interrupts. Verified
  current at deepagents >= 0.7, Python. Reason: it replaces the largest
  Claude-SDK dependency in Phantom (the harness prompt and tool conventions)
  with LangChain's supported equivalent.
- **LangGraph checkpointing for conversation state** (Postgres checkpointer,
  one thread per conversation). Reason: durable resume across restarts is the
  product premise; owning history enables explicit summarization and honest
  continuity, where Phantom had to work around SDK-owned compaction.
- **LangChain store on pgvector for semantic memory** with provenance columns.
  Reason: one database for all durable state; semantic search built in.
- **Phantom's deterministic safety spine**: invariant checks as pure functions,
  byte-exact snapshot/rollback versioning, bounded writes, a protected
  constitution file, failure ceiling with a poison queue. Reason: production
  Phantom already proved this beats LLM judges; it is also the brief's rule.
- **Mistri's engineering discipline and Rendi's UI discipline** as repo law in
  AGENTS.md (small focused files, hermetic tests, registry-first UI, colocated
  stories, axe as a release gate, both themes designed together).
- **Rendi's product-contract pattern**: AGENTS.md opens with falsifiable
  product law.
- **Prompt-as-file, tool-per-file layout** from Rendi's trigger directory.
- **FastAPI serving the compiled graph ourselves**, with FastMCP mounted in the
  same app. Reason: the langgraph-api server layer is Elastic-licensed and
  requires a license key in production; our path keeps the project cleanly
  open source. LangSmith Deployments remains an upgrade path.

## Adapt (keep the idea, change the mechanism)

- **Streaming wire format.** Phantom's 32-event union is the right idea
  (typed, persisted, replayable by sequence) but half its events mirror Claude
  SDK internals. Saaya defines a smaller union (roughly 12-16 events: session
  lifecycle, text delta, working state, tool call stages, subagent progress,
  memory update, heartbeat, error) produced by one adapter over
  `astream_events`, persisted per frame for reconnect/replay.
- **Reflection trigger.** Phantom gates with a cheap LLM call. Saaya uses
  deterministic worthiness rules (session ended plus thresholds on turns, tool
  activity, corrections detected, elapsed time). Reason: cheaper, testable, and
  the brief bans judge-shaped machinery; an LLM deciding "worth learning from"
  is the first step back toward one.
- **Reflection isolation.** Phantom runs reflection as an OS subprocess for
  hard-kill timeout semantics. Saaya starts with an in-process reflection run
  with a restricted file backend, staged writes into a temp directory, and
  validation before any file is promoted, which gives the same rollback
  guarantee transactionally. If we later need hard kills, we promote it to a
  subprocess and record the ADR.
- **Memory ranking.** Adopt importance x reinforcement x recency decay and
  contradiction supersession from Phantom, but store provenance the brief
  requires (source, reason retained, confidence, reinforcement count,
  superseded-by, version introduced) as first-class columns.
- **Heartbeat.** Phantom's scheduler wakes the full brain on cron. Saaya's
  heartbeat is a first-class durable system per the brief: explicit purpose,
  stable task identity, idempotent, overlap-guarded, recorded start/finish,
  silent when nothing meaningful happened, restart-safe, testable with a fake
  clock. Start with exactly one heartbeat capability, not a platform.
- **Dynamic capabilities.** Phantom's runtime tool registry survives because
  tools are rows plus script files with a scrubbed env. Saaya adapts this
  after MCP lands, with the same posture (no inline eval, allowlisted env)
  behind an approval interrupt.
- **Slack.** Adopt the emoji-status plus live-progress-message pattern when the
  channel lands (scope priority 10, after the core).

## Reject (with reasons)

- **LLM judge or evaluation pipelines in any form**, including a
  worthiness-judging LLM gate. Product decision in the brief; independently
  validated by Phantom deleting its own judge engine over cost and reliability.
- **Skills/subagents/plugins/hooks CRUD subsystems** (~6,100 lines of Phantom):
  they edit Claude Code's native file formats, meaningless off that SDK.
- **Provider env-var translation layer**: replaced entirely by
  `init_chat_model`.
- **Qdrant + Ollama sidecars and the hand-rolled fake-BM25 sparse vectors**:
  one Postgres with pgvector; dense embeddings honestly.
- **The langgraph-api server layer**: licensing, above.
- **Multitenancy, metadata gateways, persona catalog, first-hour theater**:
  cloud-operator product, not the coworker premise.
- **A Python component library imitating shadcn**: the web app owns UI.

## Postpone (real, but after the core proves itself)

- Slack channel (priority 10), MCP consumption of third-party servers beyond a
  first demo server, dynamic tool creation (priority 11), secrets collection
  with magic links, shareable public pages, web push, Telegram, email, deploy
  hardening beyond Compose (priority 12).

## Repository structure (proposed)

```
saaya/
  AGENTS.md                 repo constitution (Phase 1)
  README.md                 includes Rebuild from scratch section
  LICENSE                   MIT
  docker-compose.yaml       postgres (pgvector) + server + web
  .env.example              names and descriptions only
  brand/                    BRAND.md, tokens.css, marks, favicon, social
  docs/
    research/               this study
  journal/
    index.md  progress/  decisions/  experiments/
  memory/                   project memory (not Saaya runtime memory)
    index.md  glossary.md  architecture.md
  server/                   Python, uv-managed
    pyproject.toml
    src/saaya/
      api/                  FastAPI app, SSE routes, event adapter
      agent/                deep agent assembly; prompts/ as .md files
      memory/               semantic store, provenance, retrieval, ranking
      reflection/           observe, write, validate, versions, rollback
      heartbeat/            durable heartbeat runner + history
      mcp/                  FastMCP server; external MCP client config
      db/                   SQLAlchemy models; alembic migrations
    tests/                  hermetic by default; live ring behind env flag
  web/                      Next.js, TypeScript strict, pnpm
    app/  components/  hooks/  lib/  e2e/
  workspace/                Saaya's runtime home (gitignored contents):
                            procedural memory files, versions, artifacts
```

Runtime agent memory lives in `workspace/` and Postgres; `memory/` at the repo
root is the project's own documentation memory per the brief. The name
collision is resolved by this paragraph and a note in both indexes.

## Scaffolding commands (to run in Phase 1, in order)

```console
git init saaya && cd saaya
uv init server --package --python 3.13
cd server && uv add deepagents langgraph langchain langchain-anthropic \
  langgraph-checkpoint-postgres fastapi "uvicorn[standard]" sqlalchemy \
  alembic asyncpg pydantic-settings
uv add --dev pytest pytest-asyncio ruff pyright
uv run alembic init src/saaya/db/migrations
cd .. && pnpm create next-app@latest web --typescript --tailwind --app \
  --no-src-dir --import-alias "@/*" --use-pnpm
cd web && pnpm dlx shadcn@latest init
pnpm dlx storybook@latest init
pnpm add -D @biomejs/biome @storybook/addon-a11y && pnpm dlx @biomejs/biome init
pnpm create playwright
```

Exact flags get re-verified against each generator's current prompts when run;
any divergence is recorded in the journal entry for Phase 1. Docker Compose is
hand-written (no official generator exists); this is the documented exception,
using image `pgvector/pgvector:pg17`.

## Risks, licensing, assumptions

- **deepagents is pre-1.0**: API churn risk. Mitigation: pin versions, isolate
  harness assembly in `agent/`, keep the event adapter as the only streaming
  seam.
- **Licensing**: langchain/langgraph/deepagents libraries MIT; we avoid the
  Elastic-licensed server layer. Phantom is Apache 2.0 and we adapt concepts
  with attribution in this study, copying no code files. Mistri and Rendi are
  MIT; we adopt written conventions, not code.
- **Embeddings require a non-Anthropic provider** (Anthropic has no embeddings
  API). Default: OpenAI text-embedding-3-small. Alternative: Voyage, or local
  Ollama at the cost of a sidecar container.
- **Assumption**: LangGraph checkpointer + store `.setup()` manage their own
  tables; Alembic owns only Saaya's application tables. Verified against
  langgraph-checkpoint-postgres docs before Phase 1 migrations.
- **Assumption**: one Postgres instance serves checkpoints, store, and app
  tables in separate schemas without contention at single-user scale.

## Decisions requiring owner input

1. Embedding provider (default proposed: OpenAI text-embedding-3-small).
2. Default chat model (proposed: claude-sonnet-4-6 for development, opus
   available by config for showcase).
3. GitHub repository visibility and timing (proposed: private until the Phase 2
   slice is verified, then public).
4. License (proposed: MIT, matching Mistri and Rendi).
