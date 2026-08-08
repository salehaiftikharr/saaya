---
id: DES-003
title: Marketing completeness comparison and pass plan
type: research
status: accepted
created: 2026-08-08
updated: 2026-08-08
tags:
  - design
  - marketing
  - brand
related:
  - docs/design/phantom-study-and-plan.md
supersedes: []
---

# Why Saaya's page feels less complete, and the pass plan

Rendered comparison (Playwright, both pages scrolled and probed).

Phantom at rest: a fixed floating navigation carrying the product family,
GitHub, and a persistent Get started; an announcement strip with its own
CTA; a hero subtitle that is concrete product truth ("gets its own
computer, its own URL, and its own Slack identity. It DMs you the first
drafts to approve."); Get started repeated at every scroll depth; an
animated identity carried by media rather than CSS.

Saaya at rest: no header of any kind, a conceptual hero with no action, no
CTA until a quiet footer link, a static mark, and one false claim (open
source, while the repository is private).

## Ranked gaps

1. Navigation absence: without a header the page reads as a design essay,
   not a product's front door. (Fix: original product header, anchor nav,
   Open Saaya CTA, mobile sheet, scroll elevation.)
2. Action absence: no way into the product from the hero; the single exit
   is below the fold at the very end. (Fix: hero CTA pair and a real
   closing conversion section.)
3. Motion absence: the mark never behaves, so the brand never feels alive.
   (Fix: the echo motion-state system, one shared component, original
   physics: the echo follows, stretches, settles; never a mascot.)
4. Hero credibility: the concept line lands but nothing states what Saaya
   concretely is or proves it immediately. (Fix: honest subtitle, compact
   capability strip, then the existing proof beats.)
5. Truth and depth debt: the open-source claim is false; trust,
   architecture, and getting-started landmarks are missing versus roughly
   twelve on Phantom. (Fix now: claim corrected and closing rebuilt; the
   remaining landmarks land in the following increments.)

Solutions stay Saaya's own: the header is a quiet bar, not Phantom's
floating pill family switcher; motion is shadow physics, not a character;
proof density comes from the real component library.
