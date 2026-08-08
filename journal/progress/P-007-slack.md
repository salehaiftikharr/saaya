---
id: P-007
title: Slack channel over Socket Mode
type: progress
status: complete
created: 2026-08-08
updated: 2026-08-08
tags:
  - slack
  - channels
related:
  - journal/progress/P-006-mcp.md
  - journal/roadmap.md
supersedes: []
---

# P-007: Slack channel over Socket Mode

## Objective

Roadmap item 10: a second communication surface. DMs with Saaya are one
continuous conversation on the same brain, memory, and thread durability as
the web app.

## Work completed

- SlackChannel on slack-bolt AsyncApp + AsyncSocketModeHandler, started in
  the app lifespan when both tokens are set, closed on shutdown.
- Pure decision helpers with hermetic tests: human non-edited DMs only;
  bots, subtypes, and channel chatter filtered; mentions handled separately
  with the leading mention stripped; DM thread id slack:<channel> (one
  continuous conversation), mention thread id slack:<channel>:<thread_ts>.
- Turns mark thread activity, so Slack conversations feed the reflect
  heartbeat exactly like web threads. Errors reply honestly in-channel.

## Root cause found by verification

DB-backed tests originally shared the development database; a live product
row made the idle-heartbeat test flake. Tests now run against a dedicated
saaya_test database created on demand (conftest fixture: create database,
vector extension, metadata create_all, truncate on teardown). Suite passes
twice consecutively.

## Verification

- Gates green: ruff, pyright strict 0 errors, pytest 45 (x2 runs).
- Live: bot token auth.test ok (bot user saaya, workspace Saaya); Socket
  Mode capability confirmed via apps.connections.open returning a wss
  ticket; app boots with the channel connected and shuts down cleanly.
- Interactive round-trip pending an inbound DM: bot scopes are
  app_mentions:read, chat:write, im:history (no users:read), so Saaya
  cannot discover the owner to send the first DM. Owner verification step:
  DM @saaya once; optional scope addition if Saaya should ever DM first.

## Next step

Roadmap item 12 (deployment hardening) next for a runnable final product;
item 11 (dynamic tool creation) follows.
