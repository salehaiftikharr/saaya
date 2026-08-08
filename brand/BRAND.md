# Saaya brand

Saaya (saa-yaa), Urdu for shadow. A shadow stays beside you without asking for
attention: it follows, it remembers your shape, and it is always there when
you look. The brand expresses quiet presence and continuity, never darkness or
horror.

> The coworker that stays.

Status: provisional. The geometry, palette, and lockup are real and usable,
and every rule below is in force, but the wordmark is set in a system font
stack inside the SVG rather than drawn as paths. Replacing it means swapping
`saaya-wordmark*.svg` for drawn-path versions with the same viewBox and
keeping the echo geometry; nothing else in the product needs to change.

## The mark

`saaya-mark.svg` (light surfaces) and `saaya-mark-dark.svg` (dark surfaces).
A body and its echo: a solid ink circle with a dusk-colored twin offset
behind it toward the lower right.

Why this form: Saaya is the presence that accompanies you. The body is your
work, the present moment; the echo is Saaya - the same shape, one step
behind, holding what came before. The echo never leads and never leaves.
Identical geometry is the argument: a shadow is not a different thing, it is
your own shape carried along. Offset toward the lower right because that is
where a shadow falls when the light reads left-to-right, the direction of
work in progress. The crescent that remains visible is deliberate restraint:
presence you can see without it demanding attention.

The same grammar recurs through the product: the echo trail while Saaya
works, the offset drop-shadow on the story page's hero mark, the continuity
strip carrying past context under the current conversation. The mark is the
system, small.

Explored refinement (recorded, not yet adopted): tightening the echo offset
from 10/64 to 8/64 of the canvas and raising its opacity from 0.9 to 1.0
reads better below 20px but flattens the layered-depth feel at hero sizes;
a size-dependent pair (tight echo for the favicon form, current geometry
above 24px) is the likely v2 and would change only the SVG files.

- The ink circle carries the theme's ink color; the echo is always dusk.
- At 16 pixels (`favicon.svg`) both circles survive; the favicon's ink adapts
  to the browser theme via `prefers-color-scheme`, the echo stays dusk.
- The atomic form, when even the favicon is too large, is the crescent alone.

## The wordmark

`saaya-wordmark.svg` and `saaya-wordmark-dark.svg`: the mark locked up with
lowercase "saaya". Lowercase always; Saaya does not shout. Do not set the
name in a different weight or squeeze the letter spacing.

## Color: the Dusk system

Defined in `tokens.css`, light and dark designed together. One accent (dusk,
a muted violet); it never competes with a second brand color.

| Token | Light | Dark |
| --- | --- | --- |
| Background | #FAF9F7 | #101114 |
| Surface | #FFFFFF | #17181C |
| Ink | #1B1D22 | #E9E8E4 |
| Muted | #6B6E76 | #9A9CA3 |
| Line | #E7E5E0 | #26282E |
| Accent (dusk) | #5A50BF | #948AEA |
| Accent soft | #EDEBF8 | #1F2030 |

Contrast: ink on background is 15.9:1 light and 14.9:1 dark; accent on
background is 6.9:1 light and 6.7:1 dark. All pass WCAG AA for text.

## Motion

The echo is the motion language: on first appearance a surface's mark may
slide its echo out from behind the body, once, quickly, and settle. The echo
never pulses, orbits, or loops. Every echo animation respects
`prefers-reduced-motion: reduce` by rendering the settled state immediately.
An animated logo variant is optional and not yet shipped; when it ships it
follows this rule and lives beside the static files, which remain the default
everywhere.

## Rules

- The echo is the brand atom. It is always dusk, always behind the body,
  always offset toward the lower right.
- Static assets are the default; animation is an enhancement, at most once
  per surface.
- Never recolor the echo, never place the body behind the echo, never add a
  second accent.
- The mark and wordmark are the only custom vectors in the product; product
  icons come from Lucide.
- Social preview: `saaya-social.png` (1200x630), the mark with its echo
  shadow beside the lowercase wordmark and tagline on the paper token. The
  app serves it as `web/app/opengraph-image.png` (the Next convention wires
  the OpenGraph tags); regenerate both together.
