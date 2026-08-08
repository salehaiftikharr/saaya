---
id: P-009
title: Dynamic reusable capabilities
type: progress
status: complete
created: 2026-08-08
updated: 2026-08-08
tags:
  - tools
  - security
related:
  - journal/progress/P-008-deployment.md
  - docs/dynamic-tools.md
  - journal/roadmap.md
supersedes: []
---

# P-009: Dynamic reusable capabilities

## Objective

Roadmap item 11: Saaya proposes reusable capabilities; a human approves
them; approved tools run safely, survive restarts, and can be disabled or
rolled back. No marketplace.

## Work completed

- dynamic_tools and dynamic_tool_versions tables (Alembic); metadata and
  lifecycle in Postgres, script on disk only while active.
- Deterministic validation (name/params/description/script caps, syntax
  compile, TOOL_INPUT contract, credential patterns); rejected proposals
  never land.
- Lifecycle: propose -> draft -> owner approval -> active; any change or
  rollback demotes to draft until re-approved; every change appends a
  version row.
- Scrubbed-env subprocess runner (PATH/HOME/LANG/TOOL_INPUT only, 30s hard
  timeout, output cap) with a canary test proving a planted CLAUDE_API_KEY
  is invisible to tool scripts.
- Agent bridge: propose_tool plus one StructuredTool per active tool;
  rebuild_agent became async and now re-registers active tools on every
  lifecycle change, reflection apply, and rollback.
- API (list/activate/disable/rollback), Tools view in the web app with
  script inspection before approval, ToolRow stories (draft/active/
  disabled), threat model in docs/dynamic-tools.md.

## Root causes found by verification

- An earlier sed-style patch to app.py silently failed to apply (ruff had
  reflowed its anchor), so the agent briefly lacked propose_tool; caught
  live, fixed with a verified edit. Patch scripts now assert their anchors.
- The axe gate caught muted-on-muted contrast on the disabled badge; fixed
  with a bordered badge that passes in both themes.

## Verification

- Gates: ruff, pyright strict 0 errors, pytest 60; biome, tsc, vitest 27
  with the axe gate, next build.
- Full acceptance live: agent proposed reverse_text via propose_tool ->
  draft in registry -> activated over the API (script materialized) -> used
  in a fresh turn (wodahs) -> server restarted -> used again (rekrowoc) ->
  Tools panel verified in the browser showing the active tool with script
  inspection.

## Next step

Production posture notes (finish item 12), then the standing debts:
committed e2e spec, markdown rendering, thread list, restore confirmation,
social PNG.
