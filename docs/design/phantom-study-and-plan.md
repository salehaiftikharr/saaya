---
id: DES-001
title: Phantom rendered-site study, Saaya audit, and design plan
type: research
status: accepted
created: 2026-08-08
updated: 2026-08-08
tags:
  - design
  - brand
  - ui
related:
  - brand/BRAND.md
  - journal/roadmap.md
supersedes: []
---

# Phantom study, Saaya audit, and the design plan

Studied at ghostwright.dev/phantom, rendered in Playwright at 1440x900,
animations settled, six scroll depths captured, computed styles read from
the live DOM. This document records what makes it excellent, where Saaya
falls short, and exactly what we change. We match the care, never the
appearance.

## What the rendered page actually does

Measured typography: hero is Instrument Serif 400 at 72px with -1.8px
tracking and ~1.02 line height; section headings the same serif at 48px,
-1.2px; all reading copy is Inter at 16-18px; eyebrows and metadata are
uppercase monospace with wide tracking ("THE DASHBOARD", "DAY 2 RECAP - 24
HOURS LATER", "DRAFT 1 OF 4"). Stat numerals inside product panels are set
in the display serif ("3 of 4", "2"), which makes outcomes feel editorial.

Measured surface: warm paper rgb(250,248,244), near-black ink rgb(26,26,26),
white cards with hairline borders and very soft shadows, 8px radii, a
floating pill nav. Accent is nearly absent: pastel persona avatars, one
green italic role label, one cyan tag; primary buttons are simply ink.

Product proof: the page repeats real product surfaces, not illustrations. A
browser-chrome frame with a URL bar wraps the dashboard; filter chips carry
honest counts including "Failed (0)"; draft cards have working-looking
Send/Edit/Skip; a "DAY 2 RECAP" panel shows DRAFTS SENT 3 of 4, EDITS
BEFORE SEND 1, MEETINGS BOOKED 2; a day-3 plan is written in the agent's
voice; config appears as real YAML in mono.

Narrative: banner, hero, three ownership claims (own computer, own URL, own
Slack identity), "This is what you get on day one" over the real dashboard,
"30 seconds to your first co-worker" setup, "Day one looks like this"
drafts, a day-2 recap and day-3 plan showing compounding, the sidekick,
"Seven roles" team grid, trust, begin. Chronological, no feature repeated
without advancing the story. Dense panels alternate with spacious editorial
sections.

## Saaya audit against those patterns

What already holds: honest state everywhere (heartbeat "quiet is normal",
rejected reflections with reasons, tool approval that shows the script),
both themes designed, the axe gate, calm copy, one accent.

Gaps, ranked by impact:

1. No display voice. Everything is Geist Sans at near-uniform sizes; there
   is no type scale, no eyebrow/metadata layer, no editorial register
   anywhere, so the product reads as a competent scaffold, not a designed
   thing.
2. No marketing surface at all, and inside the app the premise is invisible
   at rest: nothing shows continuity (what Saaya carried into this
   conversation, what it learned last time) unless you dig into panels.
3. Outcomes are under-told. Memory rows lead with kind/confidence
   (infrastructure); nothing says "Saaya remembered how you format release
   notes" or "nothing needed you during the last heartbeat".
4. Density rhythm is flat: the chat empty state is airy but panels use one
   card pattern with identical padding and borders everywhere; metadata
   hierarchy inside rows is weak (name, badge, and time compete).
5. Motion explains nothing yet: no working-trail, no heartbeat pulse, no
   saved/reverted confirmation; streaming just appears.

## Saaya design principles (original, shadow-rooted)

1. The echo is the voice. The brand atom (body + dusk echo) is the loading
   language, the working indicator, and the continuity mark: what follows
   you is what remembers you.
2. Two registers, one product. A serif display voice for moments of meaning
   (section openings, recap numerals, the coworker speaking about its own
   memory) and the working sans for everything operational. The display
   voice never appears inside dense operational rows.
3. Presence, not gloom. Dusk stays the only accent; depth comes from soft
   offset shadows (the echo motif) on paper-quiet surfaces, never from
   darkness or gradients.
4. Proof or silence. Any claim a surface makes must be demonstrated by a
   real component in a real state; fixtures come from genuine product
   output, never invented dashboards.
5. Outcomes first, mechanics on demand. Rows lead with what happened for
   the user; provenance and internals expand beneath.

## Type scale (both apps; marketing may scale up one step)

- Display serif: Fraunces (variable, soft warmth, nothing like Instrument
  Serif's sharp editorial cut). Hero 64px/1.05/-1.5px opsz high; section
  40px/-0.8px; panel-recap numerals 28px.
- UI sans: Geist Sans (already ours). Body 15px/1.6; panel headings 13px
  600 tracking-tight; labels 12px.
- Eyebrow/metadata: Geist Mono 11px uppercase +0.08em tracking, muted.
- Code and technical state: Geist Mono 12px.

## Token refinements

Light stays the Dusk system; add: --surface-raised (white), --shadow-echo
(0 1px 2px rgb(27 29 34 / 0.04), 4px 4px 0 -1px accent-soft) used sparingly
on hero cards as the offset-echo motif; hairline borders stay. Dark is
re-derived by hand: background #101114 holds, surfaces warm one step
(#17181c -> #191a1f), borders soften, echo shadow becomes accent-soft at
40%. Radii: 10px cards, 8px controls, 6px chips. No third radius.

## Prioritized implementation plan

1. Type foundation: add Fraunces via next/font, extend tokens.css and
   globals.css with the scale and eyebrow/metadata classes; restyle the
   app shell (sidebar wordmark, section headings, panel headers) to the
   two-register system. Verify all states both themes.
2. Continuity surface in chat: a quiet "carried into this conversation"
   strip (real recall data) atop resumed threads, outcome-first wording;
   the echo working-trail replaces the plain skeleton while Saaya works.
3. Outcome-first rows: memory, heartbeat, version, and tool rows lead with
   the outcome sentence; provenance/mechanics collapse beneath (expand on
   demand); serif recap numerals in the memory panel header (facts
   remembered, versions, reinforcements).
4. Motion with purpose: echo slide on send, heartbeat dot pulse (once, on
   completion appearing), saved/reverted confirmations, reconnect feedback;
   all gated on prefers-reduced-motion; stories cover reduced-motion.
5. Marketing page (app route /about for now): the continuity narrative in
   nine beats using REAL components with realistic fixtures (restart-
   surviving thread, tool progression, memory with provenance, protected
   file, diff/rollback, silent heartbeat, thread identities, MCP health,
   tool lifecycle, honest failure); browser-frame device treatment; dense
   proof alternating with editorial air.
6. Full matrix verification per the directive (four widths, both themes,
   reduced motion, keyboard, empty/streaming/failure/overflow), screenshots
   compared across iterations.
