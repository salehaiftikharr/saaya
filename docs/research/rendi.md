---
id: RES-003
title: Rendi source study
type: research
status: complete
created: 2026-08-07
updated: 2026-08-07
tags:
  - research
  - rendi
  - ui
  - brand
related:
  - docs/research/architecture-decisions.md
supersedes: []
---

# Rendi source study

Studied at github.com/mcheemaa/rendi (MIT). Rendi is a chat agent whose answers
are live, steerable interfaces (instruments) over ClickHouse, running on
Trigger.dev durable sessions, with a Next.js front end. Saaya adopts its UI and
brand discipline, not its analytics product or its ClickHouse/Trigger.dev spine
(which Rendi's own AGENTS.md declares load-bearing for Rendi specifically).

## The product contract pattern

Rendi's AGENTS.md opens with a four-line product contract labeled product law,
and every change is measured against it. This is the single best convention in
either repo: a falsifiable definition of the product at the top of the
constitution. Saaya's AGENTS.md must open the same way, with Saaya's own
contract (durable coworker, memory that compounds, visible work, reversible
memory changes).

## Stack observed (versions from package.json, verified in lockfile)

Next.js 16.2, React 19.2, TypeScript 5 strict, Tailwind 4, shadcn 4.x on the
base-nova style with Base UI primitives, Lucide icons, Storybook 10.5 with
addon-vitest and addon-a11y, Vitest 4 with the Playwright browser provider,
Biome 2.5, Drizzle ORM on Neon Postgres, pnpm. This is a current, coherent
reference stack for Saaya's web app, minus Drizzle/Neon (Saaya's durable state
lives on the Python side) and minus Trigger.dev.

## UI discipline adopted

- Registry first, hard requirement: before authoring any UI element, check the
  shadcn registry; if it exists, `pnpm dlx shadcn@latest add <name>` and
  customize the installed file. This includes small things: kbd, spinner, empty
  states, input groups. Patterns shadcn documents but does not ship are adopted
  from their docs, not reinvented from memory.
- Read the installed source under `components/ui/` before composing against it.
  Base UI composition happens through render props, not Radix `asChild`.
- Every component ships a colocated `*.stories.tsx`. The Storybook vitest
  project runs interaction tests plus an axe accessibility gate set to error:
  accessibility violations fail the run and block release.
- Dark and light designed together, never dark as an afterthought. The bar
  named in the constitution: Linear, Vercel, Stripe.
- Icons only from Lucide through shadcn conventions; never hand-rolled.
- UI copy speaks outcomes, never internals.

## Brand as product behavior

`brand/` contains BRAND.md, tokens.css, static and animated wordmark and mark,
favicon, social asset, and vendor marks. What makes it worth studying:

- The identity performs the product. The wordmark is a monoline script that
  writes itself, ending when the dot of the i lands as an amber datapoint;
  Rendi means "you render," and the logo renders. The draw animation doubles as
  the product's loading language, so brand motion is functional, not
  decorative.
- One accent (amber), with a documented rule that it never competes with a
  second brand color. The brand atom (the dot) is defined down to 16px favicon
  size, where the atomic form is the dot alone.
- Every asset ships static-first: the static SVG renders identically in any
  consumer; the animated variant (SMIL) is an addition, and in-app inline
  surfaces use a CSS draw that respects `prefers-reduced-motion`.
- Tokens define light and dark palettes side by side in one file, and chart
  colors pass a documented six-check validation (lightness band, chroma floor,
  colorblind separation, surface contrast) per mode.
- The wordmark animation restraint rule ("draws itself at most once per
  surface; after that it rests") is a motion policy, written down.

Saaya's brand must copy this discipline: BRAND.md that explains meaning and
rules, tokens designed in pairs, static-first assets, one accent, a mark that
survives 16px, reduced-motion respected. Saaya must not copy the script
wordmark, the amber dot, or the Ember palette. Saaya's concept comes from
shadow: a form that follows, echoes, or softly mirrors another form.

## Agent architecture patterns worth carrying

- The system prompt lives in its own file (`trigger/rendi/agent.md`) with YAML
  front matter declaring the model and the tool list; every tool lives in its
  own file under `trigger/tools/`; agent definitions only wire pieces together.
  Saaya mirrors this: prompt sections as files, one tool per module, assembly
  code that only assembles.
- The prompt teaches judgment, not ceremony: survey before concluding, never
  guess a column name, the renderer owns colors and theming, "text is garnish."
  Saaya's prompts should have this quality of specific, earned instruction.
- Migration discipline: edit the schema source, run the generator, apply.
  Handwriting or editing generated migration SQL is called a defect by name.
- Upstream honesty: three Trigger.dev SDK bugs were root-caused here, filed
  upstream with regression tests, and the workarounds are documented in the
  constitution with links and removal conditions. Root-cause culture, recorded.

## Rendi-specific things Saaya does not carry

- ClickHouse, Trigger.dev, instruments/canvas, the unrestricted-read-surface
  rule (an analytics-product decision), Drizzle/Neon on the front end, and the
  pnpm patch for the Playwright build extension (Trigger.dev-specific).
