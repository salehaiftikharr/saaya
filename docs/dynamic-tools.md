# Dynamic tools: design and threat model

## Contract

A dynamic tool is a small Python script plus metadata (name, description,
flat parameter schema). The script reads one JSON object from the TOOL_INPUT
environment variable and prints its result to stdout. Metadata and lifecycle
live in Postgres (dynamic_tools, dynamic_tool_versions); the script exists on
disk under workspace/tools/ only while the tool is active.

## Lifecycle

Proposed (by the agent or a person) -> draft -> activated by the owner in the
Tools panel -> usable by the agent -> disabled or rolled back at any time.
Any change to an active tool demotes it to draft until re-approved. Every
change appends a version row; rollback restores an earlier version's content
as a new draft version. The agent's tool set rebuilds on every lifecycle
change, so activation and disabling take effect immediately and survive
restarts.

## Deterministic validation (accident prevention)

Name and parameter-name pattern, parameter types limited to string, number,
boolean; description and script size caps; Python syntax check; the
TOOL_INPUT contract must appear; credential patterns are rejected. No LLM
takes part in validation.

## Execution boundary

Scripts run as a subprocess with a scrubbed environment (PATH, HOME, LANG,
TOOL_INPUT only; verified by a test that plants a canary key and asserts the
script cannot see it), a 30 second hard timeout, working directory
workspace/tools/, and a 10k character output cap.

## Residual risk, stated plainly

An activated script runs with the server process's operating system
privileges: it can use the network and touch files the process user can
touch. Validation is not a sandbox. The security boundary is the human
approval step: the owner reads the script in the Tools panel before
activating it. Do not activate a tool you have not read. A container-level
sandbox per tool is the tracked hardening path if Saaya ever runs tools it
did not co-author with its owner.

## Non-goals

No marketplace, no plugin ecosystem, no tool sharing between installations,
and no exposure of dynamic tools over the MCP server while the approval
model is single-owner.
