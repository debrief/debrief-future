# Contract: Trail-Mode Track Rendering

**Feature**: 280-briefing-trail-mode

This feature exposes no network API. Its contracts are (1) a pure display-coordinate
mapping the renderer computes, and (2) the observable rendering behaviour. Both are
expressed as testable contracts that drive the unit and Playwright tests
(Article VII — tests are the spec).

---

## Contract A — Display-coordinate mapping (pure, unit-tested)

**Subject**: the per-track display-coordinate computation in `BriefingMap`.

```
displayCoords(coords: [lon,lat][], epochsMs: number[], isTrail: boolean, nowMs: number) -> [lon,lat][]
```

- When `isTrail === false` → returns `coords` unchanged (reference-equal or
  structurally identical full track).
- When `isTrail === true` → returns `sliceTrackToTime(coords, epochsMs, nowMs)`.

### Required behaviour (FR-001, FR-002, FR-003)

Given a track `coords = [A,B,C,D,E]` with `epochsMs = [0,10,20,30,40]`:

| `isTrail` | `nowMs` | Returns | Maps to FR / SC |
|-----------|---------|---------|------------------|
| `false` | `0` | `[A,B,C,D,E]` | FR-002 / SC-002 |
| `false` | `40` | `[A,B,C,D,E]` | FR-002 / SC-002 |
| `false` | `1000` | `[A,B,C,D,E]` | FR-002 |
| `true` | `-5` (before start) | `[]` | edge: pre-start empty |
| `true` | `0` | `[A]` | FR-001 (US1 scenario 1) |
| `true` | `20` | `[A,B,C]` | FR-001 (growth) |
| `true` | `25` (between C,D; nearer C) | `[A,B,C]` | FR-001 — nearest-sample slice |
| `true` | `40` | `[A,B,C,D,E]` | FR-001 (US1 scenario 3) |
| `true` | `1000` (after end) | `[A,B,C,D,E]` | edge: post-end full |

> The slice boundary is whatever `@debrief/utils.sliceTrackToTime` produces
> (nearest sample ≤/at `nowMs`). The contract is **"identical to the main app's
> Trail slice"** (FR-008), so these expectations are derived from that helper, not
> re-invented.

### Monotonic-growth property (SC-001)

For `isTrail === true` and any `t1 < t2` within `[epochsMs[0], epochsMs[last]]`:
`displayCoords(…, t1).length <= displayCoords(…, t2).length`.

---

## Contract B — Temporal-track classification (FR-007, FR-009)

**Subject**: which features participate in time-driven rendering.

A feature is a **TemporalTrack** iff: `geometry.type === 'LineString'` AND
`properties.timestamps` is an array AND `timestamps.length === coordinates.length`
AND `coordinates.length >= 2` AND every `Date.parse(timestamps[i])` is finite.

| Feature | Classified as | Trail-mode render |
|---------|---------------|-------------------|
| LineString + valid parallel timestamps | TemporalTrack | grows (Contract A) |
| LineString, no `timestamps` | not temporal | full line, no dot (FR-007) |
| LineString, `timestamps.length !== coords.length` | not temporal | full line, no dot (FR-007) |
| LineString, an unparseable timestamp | not temporal | full line, no dot (FR-007) |
| Polygon / MultiLineString / MultiPolygon | not temporal | full, unchanged (FR-009) |
| Point | reference point | marker, unchanged (FR-009) |

Classification MUST be the **same gate** used for the moving dot, so a track
either shows both a growing trail and a moving dot, or neither.

---

## Contract C — Observable rendering behaviour (Playwright, evidence)

**Subject**: the briefing renderer SPA driven end-to-end.

| # | Given | When | Then |
|---|-------|------|------|
| C1 | A briefing whose current scene `display_mode = 'trail'` | playback at window start | rendered trail path has near-zero length (few/no vertices) |
| C2 | …same Trail scene | playback advanced toward window end | rendered trail path is **longer** than at C1 (the growth screenshot) |
| C3 | …same Trail scene | playback at/after window end | rendered trail equals the full track |
| C4 | A briefing whose current scene `display_mode = 'full'` | playback at start, middle, end | rendered track length is constant (full) at all three |
| C5 | A legacy briefing (scene has no `display_mode`) | loaded and played | full track shown, no console error |

- **Evidence**: C2 captures the "growth" screenshot the backlog requires, written
  to `specs/280-briefing-trail-mode/evidence/screenshots/trail-growth.png` (and a
  start/end pair, e.g. `trail-start.png` / `trail-end.png`, to make the growth
  legible in the post).
- **Measurement**: trail length is read from the rendered Leaflet polyline (vertex
  count or path bounding-box / `getTotalLength`-style measure via a `data-testid`
  on the trail layer), not by pixel diffing — keeping the assertion robust.

---

## Non-goals (explicitly not contracted here)

- The moving position dot's own behaviour (already correct) — only its
  *consistency* with the trail (shared classification gate, shared `currentTime`).
- Capture, scoping, export, schema, or host behaviour (FR-006 — out of scope).
- Full-mode rendering output beyond "the whole track is shown" (no pixel contract).
