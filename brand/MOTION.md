# The echo motion system

The mark is a body and its echo. Motion belongs to the echo: it follows,
stretches, settles, and catches up. The body moves only when Saaya is
listening. No eyes, no face, no mascot behavior, ever.

One shared component renders every instance: `web/components/brand/
echo-mark.tsx` (`EchoMark`, prop `state`). Keyframes live in the app's
global stylesheet under the `echo-*` names. The static SVGs in this
directory share the exact geometry, so favicon, sidebar, Slack avatar, and
social sizes all remain the same mark at rest.

## States

| State | Echo behavior | Loop |
| --- | --- | --- |
| idle | drifts under half a pixel; nearly imperceptible | 6s, infinite |
| listening | body breathes slightly; echo still | 2.4s, infinite |
| thinking | echo wanders a pixel around its offset | 1.8s, infinite |
| tool | echo stretches toward the lower right, working | 1.2s, infinite |
| working | echo carries a slow vertical bob; sustained background work | 2.8s, infinite |
| waiting-approval | echo reaches apart once and holds there; waiting is a still state | 1.2s, once, holds |
| remembering | echo rises to the body and settles back | once |
| heartbeat | echo pulses apart and returns, two beats | once |
| success | echo catches up to the body, holds, releases | once |
| reconnecting | echo compresses toward the body repeatedly | 1s, infinite |
| offline | no motion; echo fades to 15 percent, body to half | static |
| failure | no motion; echo dims to 45 percent | static |

## Constraints

- `prefers-reduced-motion: reduce` disables all of it; every state renders
  its settled geometry.
- A hidden tab pauses every animation (`data-tab-hidden` on the root,
  set by the app shell).
- Transforms only; no layout-affecting properties, no animation libraries.
- Accessible name tracks the state ("Saaya is thinking"), so the motion is
  never the only signal.
