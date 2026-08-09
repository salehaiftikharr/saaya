# Manual end-to-end test plan

A complete by-hand pass over every capability, with copy-paste prompts and
exact commands. Expect 60 to 90 minutes for the full pass and a small
model bill (each chat turn is cents; each job is a few cents). All
content is fictional Atlas material; nothing here deletes data.

Conventions: each case has **Do** and **Pass when**. Note the ID of
anything that fails (a screenshot helps) and report the list; do not stop
the pass for a failure unless the app is unusable. Where a terminal is
needed, the command is given verbatim.

## Suite 0: Setup and baseline

**0.1 Stack up.**
Do: with Docker running, from the repo root:

```console
docker compose up -d
cd server && uv run uvicorn --factory saaya.api.app:create_app --port 8000
# second terminal
cd web && pnpm dev
```

Pass when: http://localhost:8000/api/health returns ok and
http://localhost:3000 renders the app.

**0.2 Baseline chips.**
Do: look at the sidebar footer.
Pass when: `web` shows a filled dot; `jobs` shows idle with the worker
running; `slack` and `mcp` reflect whether you set their tokens (either
state is fine, just note which).

## Suite 1: Conversation and streaming

**1.1 Empty state.** Do: click New conversation. Pass when: the centered
mark, "Start a conversation", and three suggestion buttons render, and
the composer hint reads "Enter to send, Shift+Enter for a new line".

**1.2 First stream.** Prompt:

> What time is it right now?

Pass when: the reply streams in, a `current_datetime` tool card appears
with a duration (like `1ms`) and the result preview, and expanding the
card shows the call detail.

**1.3 Stop mid-stream.** Prompt:

> Count from 1 to 60 slowly, one number per line, no commentary.

Do: while it streams, press the stop button in the composer.
Pass when: streaming halts promptly, nothing spins afterward, and the
partial text stays honestly in place.

**1.4 Long output and Jump to latest.** Prompt:

> Write 60 numbered lines, each a one-sentence fictional status note for
> the Atlas project.

Do: while it streams, scroll up in the transcript.
Pass when: your scroll position holds (no yank to bottom), a "Jump to
latest" button appears, clicking it lands you at the newest text, and the
button then hides.

**1.5 Copy.** Do: hover a finished assistant reply.
Pass when: a Copy control appears, clicking flips it to Copied, and the
clipboard holds the message text.

**1.6 Shift+Enter.** Do: type two lines using Shift+Enter, then Enter.
Pass when: the newline is preserved in your sent bubble.

**1.7 Double-send guard.** Do: type a short prompt and hit Enter twice as
fast as you can.
Pass when: exactly one user bubble appears.

## Suite 2: History and identity

**2.1 Semantic title.** Pass when: the Suite 1 conversation appears in
the sidebar titled from your first words (like "What time is it right
now?"), never a timestamp.

**2.2 Rename.** Do: hover the row, open the three-dot menu, rename it to
`Streaming smoke test`. Pass when: the row and the breadcrumb both update.

**2.3 Search.** Do: type `smoke` in the sidebar search.
Pass when: the list filters to matches under a Matches label; clearing
restores the calendar groups (Today, Yesterday, and so on).

**2.4 Archive and restore.** Do: archive `Streaming smoke test` from the
row menu, confirm in the dialog; open the Archived disclosure at the
sidebar bottom; click Restore.
Pass when: the dialog states nothing is deleted; the row leaves the list,
appears under Archived, and returns intact after Restore.

**2.5 Command palette.** Do: press cmd-K; type part of a conversation
title; select it. Then cmd-K again and run Toggle theme from Actions.
Pass when: the palette opens, both selections work, and cmd-shift-O
starts a new conversation from anywhere.

**2.6 Draft preservation.** Do: type `draft that must survive` in the
composer without sending; switch to another conversation; switch back.
Pass when: the draft is exactly where you left it. Send or clear it.

## Suite 3: Memory

**3.1 Remember.** Prompt (new conversation):

> Remember that the Atlas weekly demo moved to Thursdays at 2pm.

Pass when: a `remember` tool card appears and the reply confirms.

**3.2 Cross-conversation recall.** Do: start another new conversation.
Prompt:

> When is the Atlas demo?

Pass when: the answer says Thursdays at 2pm, with a recall tool card, and
the top of the transcript shows the compact "memories carried in" strip;
expanding it shows the item with its kind.

**3.3 Provenance.** Do: open Memory from the sidebar; find the demo fact.
Pass when: the row shows kind, when it was learned, why retained, and a
reinforcement count that grew after 3.2's recall.

**3.4 Correct.** Do: on that memory row's menu choose Correct; change it
to Fridays at 10am; save. Then ask in a new conversation when the demo
is. Pass when: the answer says Fridays at 10am, and the Memory panel
shows the corrected item active with the old wording linked as
superseded, not erased.

**3.5 Forget.** Do: Correct's neighbor, Forget, on the corrected item;
confirm. Ask again in a new conversation.
Pass when: Saaya no longer knows the demo time, the item is gone from
recall and from the carried-in strip, and the panel copy is explicit that
the record is kept privately.

**3.6 Protected identity.** Do: in Memory, open the identity file card.
Pass when: it explains reflection can never write it and there is no edit
control.

**3.7 Version restore preview.** Do: in Version history, click Restore on
any non-current version.
Pass when: the confirm dialog shows a readable diff of what would leave
and arrive in `memory/how-i-work.md` before you decide. Choose Keep
current unless you want the restore; if you restore, verify the restore
itself appears as a new version, then restore back.

## Suite 4: Reflection heartbeat

**4.1 A quiet run is a result.** Do: after Suite 3, leave the app idle
for about 15 minutes (interval 300s, quiet threshold 600s), then open
Memory and scroll to Heartbeats.
Pass when: runs are recorded with honest outcomes; quiet runs say so;
nothing invented appears in memory. If a run did propose changes, the
version history shows a validated change with a diff.

## Suite 5: Dynamic tools

**5.1 Propose.** Prompt:

> Propose a tool called title_case that takes a text parameter and
> returns it in title case. I want to reuse this later.

Pass when: a `propose_tool` card confirms a draft, and the reply says it
waits for approval.

**5.2 Draft is inert.** Prompt, same conversation:

> Use title_case on "the atlas launch checklist".

Pass when: Saaya declines and says the tool awaits approval; nothing
executes.

**5.3 Approve and use.** Do: open Tools, expand the script, read it, and
approve. Then repeat the 5.2 prompt.
Pass when: the tool runs (card with the result "The Atlas Launch
Checklist") and the Tools row now shows availability plus last-used
evidence.

**5.4 Disable.** Do: disable it in Tools; ask 5.2's prompt again.
Pass when: it no longer runs and Saaya says so honestly.

**5.5 Version and rollback.** Do: re-approve, then prompt:

> Propose an update to title_case so it also trims surrounding
> whitespace.

Approve the new version in Tools. Pass when: the version number
increments, and a Roll back control appears; rolling back to the prior
version is recorded as another version (nothing erased).

## Suite 6: Jobs, the core loop

**6.1 Start from chat.** Prompt (new conversation):

> Run this as a background job: build a small fictional Atlas fixture
> with a checks script where one check intentionally fails, run the
> checks, fix the failure, re-run until clean, then write a short
> summary.md and register it as an artifact called Atlas check summary.

Pass when: a `start_job` card appears with the job id, the sidebar row
gains a pulsing dot, and the workbench reveals itself with the goal,
state badge, and Plan block.

**6.2 Honest work in the ledger.** Do: watch the Progress block.
Pass when: you see the plan recorded, steps starting and completing with
summaries, a command execution with exit code 1 at the intentional
failure, and the clean re-run after the fix. If the agent tries an
off-list command, the refusal is its own row.

**6.3 Workbench behaviors.** Do: while it runs, close the workbench with
its header control; note it stays closed; reopen from the topbar panel
button. Toggle the widen control; reload the page.
Pass when: close wins until you reopen, and the width choice survives the
reload.

**6.4 Cancel.** Do: start a second small job in another conversation:

> Run a background job that writes five short fictional Atlas status
> notes, one file per step.

Then open Work from the sidebar, open that job, and click Stop this job.
Pass when: the state becomes cancelled at the next step boundary, the
ledger records it, and no further steps run.

**6.5 Artifact rendering.** Do: when 6.1 completes, click the artifact.
Pass when: the markdown renders in the dialog, and the Outcome block
summarizes steps and artifacts.

**6.6 The conversation uses the result.** Prompt, same conversation as
6.1:

> What does the check summary say? Give me the single most important
> line.

Pass when: `check_jobs` and `read_job_artifact` cards appear and the
answer quotes the artifact's real content.

**6.7 Thread scoping.** Do: from a different conversation, ask:

> Read the job artifact called Atlas check summary.

Pass when: Saaya cannot read it from there (artifacts belong to their
conversation) and says so.

## Suite 7: Approvals

**7.1 The gate holds.** Prompt (new conversation):

> Run a background job: write a short fictional atlas-note.md, then
> initialize a git repository and stage everything. Both git commands
> need my approval; wait for it and then really run them. Register the
> note as an artifact.

Do: when the amber card appears, wait a minute before deciding.
Pass when: the job sits in waiting_approval and does not proceed; the
card preview names the exact command; amber shows in four places: the
workbench card, the conversation's sidebar dot, the Work nav dot, and
the echo mark's waiting state.

**7.2 Approve.** Do: click Approve and continue.
Pass when: the ledger shows your decision, then the accepted approval,
then the command executing with exit 0, and the job proceeds to the
second gate (`git add`).

**7.3 Reject.** Do: on the second amber card, click Reject.
Pass when: the rejection is recorded, the command never executes (no
`command_executed` for it), and the job adapts and finishes honestly,
with the artifact still registered.

## Suite 8: Restart survival

**8.1 Kill mid-run.** Do: start the 6.4-style five-notes job again.
When the ledger shows step 2 or 3 started, in a terminal:

```console
kill -9 $(lsof -ti tcp:8000 -sTCP:LISTEN)
cd server && uv run uvicorn --factory saaya.api.app:create_app --port 8000
```

Pass when: after the restart the job resumes by itself: exactly one
`job_recovered` row, the interrupted step re-runs, completed steps do not
repeat, and it finishes with every file present.

**8.2 Kill while parked.** Do: run the 7.1 job again; when the amber card
appears, kill and restart the API the same way, then reload the app.
Pass when: the job is still waiting_approval, the card is intact, and
there is no `job_recovered` row (a parked job needs a decision, not a
resume). Approve and let it finish.

## Suite 9: Schedules

**9.1 Create.** Do (terminal):

```console
curl -s -X POST localhost:8000/api/schedules -H 'content-type: application/json' \
  -d '{"name": "Probe note", "task": "Write one short fictional Atlas status line in status.md and register it as an artifact called Probe status.", "kind": "every", "interval_s": 120}'
```

Pass when: Work shows a Schedules section with "Every 2 minutes", a next
fire countdown, and an enabled switch.

**9.2 Fire.** Do: wait for the countdown.
Pass when: a job appears at the top of Work with a `schedule_fired` event
naming the schedule, runs, and completes; the schedule row gains a last
run link that opens it.

**9.3 Busy skip.** Do: while a probe job is still running (watch the
list), let the next fire come due (or create a second every-60s schedule
whose task is slow, like writing four files in four steps).
Pass when: no second concurrent job appears for that schedule and the
running job's ledger gains a `schedule_skipped_busy` row.

**9.4 Disable, always.** Do: flip the switch off on every schedule you
created.
Pass when: the toggle confirms, and nothing fires afterward. Do not leave
any schedule enabled when you finish.

## Suite 10: Slack (needs Slack tokens configured)

**10.1 DM capture.** Do: from Slack (phone works), DM the bot:

> Remember that Atlas retro notes live in the shared drive folder.

Pass when: it confirms, and the conversation appears in the web sidebar
with a Slack DM badge.

**10.2 Cross-surface memory.** Do: in the web app, new conversation:

> Where do the Atlas retro notes live?

Pass when: web answers from the Slack-captured memory.

**10.3 Distinct threads.** Pass when: the Slack DM transcript and your
web conversations remain separate rows; nothing merged.

**10.4 Job from Slack.** Do: DM:

> Run a background job that writes a two-line fictional Atlas note and
> registers it as an artifact.

Pass when: the job appears in the web Work view, linked to the Slack
conversation.

## Suite 11: MCP (needs MCP_TOKEN set)

**11.1 Connect.** Do: in a Claude Code session:

```console
claude mcp add saaya http://localhost:8000/mcp --transport http \
  --header "Authorization: Bearer <your MCP_TOKEN value>"
```

**11.2 Use.** Do: ask that session to query Saaya's memory for the Atlas
demo details.
Pass when: it answers through the MCP tools, and an MCP-badged
conversation appears in the web sidebar.

## Suite 12: Offline and recovery

**12.1 Offline truth.** Do (terminal):

```console
kill -9 $(lsof -ti tcp:8000 -sTCP:LISTEN)
```

Pass when: within seconds the echo mark fades to its offline state, the
footer shows Reconnecting, and the composer disables with "Reconnecting
to Saaya…". Nothing spins forever.

**12.2 Recovery.** Do: restart the server (Suite 8 command).
Pass when: chips return, the mark returns to idle, and the composer
re-enables without a reload.

## Suite 13: Interface sweep

**13.1 Dark.** Do: toggle theme; walk chat, Work, Memory, Tools, /about.
Pass when: everything is readable, badges and amber states included.

**13.2 Reduced motion.** Do: enable Reduce Motion in macOS System
Settings (Accessibility, Display); reload.
Pass when: the mark and dots hold still; nothing pulses.

**13.3 Keyboard only.** Do: without the mouse: cmd-shift-O, type and
send a prompt, cmd-K to the palette, arrow to a conversation, Enter.
Pass when: focus is always visible and nothing traps you.

**13.4 Mobile.** Do: in devtools, set 390x844. Use the topbar sidebar
trigger for history; open the workbench sheet from the briefcase button
during a job.
Pass when: no horizontal scrolling anywhere, both sheets scroll
internally, and the composer never covers the newest message.

**13.5 Marketing.** Do: open /about; click the header anchors including
Jobs; skim every example.
Pass when: anchors land correctly and every demonstration is fictional
Atlas and Noor material.

## Recording results

Note failed case IDs with a line on what you saw (screenshots help).
Everything else being green, the known-open items are listed in the
README's limitations section; anything outside that list is a bug I fix.
