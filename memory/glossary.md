---
id: MEM-GLOSSARY
title: Glossary
type: reference
status: active
created: 2026-08-07
updated: 2026-08-07
tags:
  - memory
  - reference
related:
  - memory/architecture.md
supersedes: []
---

# Glossary

- **Saaya**: saa-yaa, Urdu for shadow. The product: a persistent AI coworker.
- **Thread**: one durable conversation, checkpointed by LangGraph, resumable
  across restarts. Identified by a stable thread id.
- **Episodic memory**: what happened; thread history plus records of completed
  work and outcomes.
- **Semantic memory**: durable facts, preferences, entities, and constraints
  in Postgres/pgvector, searchable across threads, with provenance.
- **Procedural memory**: how Saaya should work; readable versioned files in
  the workspace, loaded into agent context at startup.
- **Provenance**: the metadata every memory item carries: what was learned,
  source, when, why retained, confidence, reinforcement, supersession, and the
  version that introduced it.
- **Reflection**: the process that turns observed interactions into staged
  memory updates, validated deterministically, then promoted or discarded.
- **Validation**: deterministic rules only (schemas, bounds, permissions,
  diffs, protected files). Never an LLM judging an LLM.
- **Version**: a numbered snapshot of procedural memory; diffable and
  rollbackable.
- **Heartbeat**: a durable, idempotent, purpose-specific scheduled run with
  recorded history, silent when nothing meaningful happened.
- **Workspace**: Saaya's runtime home (`workspace/`): procedural memory files,
  versions, artifacts. Not project documentation.
- **Wire event**: one frame of the typed streaming union the server emits and
  the web app renders; persisted for replay and reconnect.
