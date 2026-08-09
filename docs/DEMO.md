# The five-minute demonstration

This walkthrough proves the product rather than opening a chat page: a
durable job with a controlled failure, an approval that actually withholds
execution, a restart mid-run, and a conversation that uses the result.
It needs only the two required keys (`CLAUDE_API_KEY`,
`OPENAI_API_KEY`) and the local stack from the README's Run locally
section.

Everything below uses fictional Atlas fixture content; nothing touches
real data.

## 1. Ask for the job

Open http://localhost:3000, start a conversation, and ask in your own
words for a background job, for example:

> Run a release readiness review for the Atlas sample project as a
> background job. Build a small fixture with an intentionally failing
> check, run the checks, fix what fails, and stop for my approval before
> any git write. Register a readiness report as an artifact.

The agent calls `start_job`, the sidebar row gains a live dot, and the
workbench reveals itself beside the transcript with the plan and the
event ledger.

## 2. Watch honest work

In the workbench Progress block you will see the plan recorded, steps
starting and completing, a `command_executed` row with exit code 1 when
the intentional check failure hits, and the fix and clean re-run after
it. If the agent tries a command off the allowlist, the refusal shows as
its own row.

## 3. Decide at the gate

When the job reaches the git write, an amber card appears: what will run,
verbatim, with Approve and Reject. The job state is `waiting_approval`
and it cannot proceed; the runner only executes after your recorded
decision. Approve it (or reject it and watch the agent adapt).

## 4. Kill it mid-run

While a step is running, kill the API listener and restart it:

```console
kill -9 $(lsof -ti tcp:8000 -sTCP:LISTEN)
cd server && uv run uvicorn --factory saaya.api.app:create_app --port 8000
```

Reload the app. The job resumed from its checkpoint: a `job_recovered`
row sits in the ledger, the interrupted step re-ran, and completed steps
did not repeat. If you killed it while the approval was waiting, the gate
is exactly where you left it, with no spurious recovery row, because a
parked job needs a decision, not a resume.

## 5. Use the result

When the job completes, the artifact opens rendered from the workbench.
Then ask in the same conversation:

> What does the readiness report say? Give me the two most important
> takeaways.

The agent reads its own registered artifact (readable only from this
conversation) and answers from its content.

## Optional doors

With Slack configured, DM the bot or mention it in a thread: same
coworker, same memory, distinct thread identity. With `MCP_TOKEN` set,
connect Claude Code to `http://localhost:8000/mcp` with the bearer token
and reach the same memory from your editor.
