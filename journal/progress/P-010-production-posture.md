---
id: P-010
title: Production posture and container hardening
type: progress
status: complete
created: 2026-08-08
updated: 2026-08-08
tags:
  - deployment
  - hardening
related:
  - journal/progress/P-009-dynamic-tools.md
  - docs/deployment.md
  - journal/roadmap.md
supersedes: []
---

# P-010: Production posture and container hardening

## Objective

Finish roadmap item 12: non-root containers, deployment guidance, and a
verified end-to-end conversation through the hardened containerized stack.

## Work completed

- Both images run non-root (server as saaya uid 999, web as node), verified
  with id inside the running containers.
- docs/deployment.md: small-VM guide, Caddy TLS reverse proxy, postgres and
  workspace backup commands, upgrade and health notes.
- WORKSPACE_DIR is explicit in compose; the REPO_ROOT heuristic is only for
  checkout-based development.

## Three production bugs found and root-caused by verification

1. uvloop (uvicorn's loop) fails create_subprocess_exec where plain asyncio
   succeeds, so dynamic tools worked on the host and failed in the
   container. Fix: the tool runner uses subprocess.run in a worker thread,
   loop-agnostic, same scrubbed env and timeout; canary test still passes.
2. In the installed container the REPO_ROOT-derived workspace path resolved
   into the site-packages tree, so workspace files silently pointed at the
   wrong location. Fix: WORKSPACE_DIR env in compose.
3. An unreachable declared external MCP server (the demo entry carries host
   paths) killed application startup. Fix: per-server loading that skips
   unreachable servers with one warning; regression test added.

## Verification

- Full gate suite green: ruff, pyright strict 0 errors, pytest 61; biome,
  tsc, vitest 27 with the axe gate, production next build.
- Containerized e2e conversation through the web container: reverse_text
  executed inside the non-root server container (probe6 -> 6eborp) and the
  degraded external server produced exactly one warning; /api/health
  reports all surfaces.

## Remaining work (tracked, next session)

Standing debts: committed Playwright e2e spec (SAAYA_LIVE ring), markdown
rendering for assistant messages, thread list UI over GET /api/threads,
restore-confirmation dialog, brand social PNG. Owner-blocked: first Slack
DM to @saaya (inbound round-trip evidence); optional users:read scope if
Saaya should DM first.
