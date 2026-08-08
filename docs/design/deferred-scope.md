# Deferred scope, recorded once

Explicit deferrals from the Jobs and workbench phases, so absence reads as a
decision, not an oversight. Each entry names the trigger that would revisit
it.

| Deferred | Why | Revisit when |
| --- | --- | --- |
| User schedules (at, every, cron) | ADR-010 designed them; a schedule fire creates a normal Job. Building them before the Job surface settled would have doubled the review area. | The workbench and dashboard have been stable for a phase (J3). |
| Slack delivery of job results | Jobs are visible in web today; the thread identity system already spans Slack, so delivery is a formatter, not an architecture. | A job whose owning thread is a Slack thread completes and someone is not at the web app. |
| Public shareable pages for artifacts | Phantom serves public URLs from its VM; Saaya's stance is authenticated-only until a real sharing need exists. Public surfaces also raise the privacy stakes the repo rules pin. | The owner asks to share an artifact with someone who has no login. |
| Telegram, email, Discord, webhook channels | Three verified doors (web, Slack, MCP) already prove the one-coworker-many-doors architecture. | A concrete daily workflow needs a fourth door. |
| Multi-tenancy | Saaya is a single-operator product; tenancy would tax every table and every query for a user count of one. | A second real operator exists. |
| VM provisioning and fleets | The audit rejected "its own computer" framing in favor of a controlled workspace inside the deployed stack. | Never, in this product's current thesis. |
| Additional model providers | One provider keeps the judge-free validation story simple and testable. | A capability or cost reason names a specific second provider. |
| Magic links | No public pages means no anonymous auth need. | Public artifact sharing lands. |
| LLM judge validation | Rejected permanently (ADR-005): a gate that cannot be explained deterministically cannot be audited. | Never. |
| Kernel-level per-job isolation | The workspace guard, command allowlist, and scrubbed env are the honest boundary at this scale; the container stack is the outer wall. | Jobs start running untrusted third-party code. |
| Offline echo-mark auto-wiring | The offline state exists in the mark and its motion grammar; wiring needs one shared connection signal instead of a second health poll. | The next pass over SurfaceStatus lifts its health state into a shared hook. |
