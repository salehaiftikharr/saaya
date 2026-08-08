---
id: ADR-001
title: Choose Deep Agents as the primary harness
type: decision
status: accepted
created: 2026-08-07
updated: 2026-08-07
tags:
  - architecture
  - langchain
  - agents
related:
  - docs/research/phantom.md
  - docs/research/architecture-decisions.md
supersedes: []
---

# ADR-001: Deep Agents as the primary harness

## Decision

Saaya's main agent is built with `create_deep_agent` from the deepagents
package (Python, >= 0.7). Raw LangGraph primitives are used only where Deep
Agents cannot express a need cleanly, and each drop-down is justified where it
happens. Confirmed drop-downs so far: the reflection run (restricted file
tools, staged writes, deterministic validation) and the typed streaming event
adapter over `astream_events`.

## Why

- Phantom demonstrates that a coworker product is mostly a harness plus
  discipline. Its harness is the Claude Agent SDK; Deep Agents is the
  LangChain-native equivalent, providing planning, subagents, pluggable
  filesystem backends, context management, and human-in-the-loop interrupts as
  maintained middleware rather than code we own.
- The largest Claude-SDK dependency in Phantom is the system-prompt preset and
  tool conventions. Deep Agents ships that layer; rebuilding it on bare
  LangGraph would be a project in itself with no product payoff.
- Deep Agents returns a compiled LangGraph graph, so choosing it does not wall
  off checkpointers, stores, streaming modes, or custom graphs.

## Consequences

- deepagents is pre-1.0; versions are pinned and the harness assembly is
  isolated in `server/src/saaya/agent/` so churn lands in one place.
- Procedural memory rides the Deep Agents filesystem backend convention
  (AGENTS.md loaded at startup), which aligns with the brief's file-based
  procedural memory.
