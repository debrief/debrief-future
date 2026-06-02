# Usage Example: Trail-Mode Playback in an Exported Briefing

This walks through how a **Trail** scene now grows in the standalone
briefing renderer, and how to reproduce it from the dev fixture.

## What changed, in one sentence

The briefing renderer reads each Scene's captured `display_mode`; on a
`trail` Scene every time-stamped track is drawn only from its start up to
the current playback time — a snail-trail that grows as the slider advances
— instead of always showing the complete `LineString`.

## The contract in plain terms

`displayCoords(coords, epochsMs, isTrail, nowMs)` decides what to draw:

| Mode (`isTrail`) | What the viewer sees |
|------------------|----------------------|
| `false` (Full / absent / unrecognised `display_mode`) | the **whole track**, at every time |
| `true`, `nowMs` before the track's first time | **nothing yet** (the track appears once playback reaches it) |
| `true`, `nowMs` within the track window | the track **grown to the nearest sample** at/below `nowMs` |
| `true`, `nowMs` at/after the last time | the **full track** (the trail has finished growing) |

`isTrail` is derived once per Scene: `display_mode === 'trail'`. Everything
else maps to Full — the safe, non-destructive default for legacy briefings
exported before `display_mode` was captured (#258).

Trail trimming reuses `@debrief/utils.sliceTrackToTime` — the *exact* helper
the main application uses — so the exported briefing's trail is visually
identical to the in-app preview (no algorithm to drift out of sync).

## Try it in the dev fixture

```sh
cd apps/briefing-renderer
pnpm dev            # boots the SPA with the synthetic Channel-crossing briefing
```

The dev fixture ships four Scenes:

1. **Exercise overview** — `display_mode: 'full'` → both routes shown whole.
2. **Track-Alpha approaches** — *legacy* (no `display_mode`) → whole track.
3. **Convergence — Dover Strait** — *legacy* → whole track.
4. **Trail scrub — the snail-trail grows** — `display_mode: 'trail'`, a
   time-range Scene bound to the full exercise window.

Step to **Scene 4** (the slider appears). Drag the slider from left to right:

- At the **left edge**, only the moving dots are visible — the trails are
  near-zero (`trail-start.png`).
- **Mid-window**, each track has grown a tail behind its dot
  (`trail-growth.png`).
- At the **right edge**, the complete tracks are drawn (`trail-end.png`).

Drag back to the left and the trails shrink again — the visible geometry is
a pure function of the slider position and the Scene's mode.

## Reproduce the evidence with Playwright

```sh
cd apps/briefing-renderer
pnpm build                              # produce dist/
node run-playwright.mjs briefing-zip-trail-mode
```

This drives the built SPA end-to-end, samples the rendered trail length at
the slider's start / middle / end, asserts it increases monotonically, and
writes `trail-start.png`, `trail-growth.png`, `trail-end.png` into
`specs/280-briefing-trail-mode/evidence/screenshots/`.

## How it maps to the success criteria

| Success Criterion | Demonstrated by |
|-------------------|-----------------|
| **SC-001** trail grows from ~0% to 100% | US1 E2E: Alpha vertex count 1 → 5 → 8 across the slider; `startLen ≤ 2` |
| **SC-002** Full track constant | US2 E2E: constant vertex count at start/mid/end on the Full Scene |
| **SC-003** legacy plays with no error | US2 E2E: legacy Scene shows full track, zero console errors |
| **SC-004** parity with the main app | Unit: `displayCoords` equals `sliceTrackToTime` across a time sweep |
| **SC-005** defect no longer reproduces | US1 + US3 E2E: every Trail Scene grows on playback |
