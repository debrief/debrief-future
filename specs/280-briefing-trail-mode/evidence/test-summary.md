---
feature: "280-briefing-trail-mode"
captured_at: "2026-06-01T21:07:17Z"
git_sha: "ee8579e"
tests_passed: 24
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

# Test Summary: Briefing Renderer Honours Trail Display Mode

## Results

| Metric | Value |
|--------|-------|
| Total Tests (feature) | 24 |
| Passed | 24 |
| Failed | 0 |
| Skipped | 0 |
| Coverage | n/a (pure helpers fully exercised; render wiring covered by E2E) |

The 24 are the feature's own tests: 20 unit (`trackDisplay.test.ts`) + 4
Playwright (`briefing-zip-trail-mode.spec.ts`). They run inside the wider
briefing-renderer suites, which stay green (see Regression below), and the
full repo gate (ruff, eslint, pyright, `tsc`, pytest 2162✓, vitest) passes.

## Test Breakdown

### Unit — `src/components/__tests__/trackDisplay.test.ts` (Contracts A & B)

| Test | Status |
|------|--------|
| Full mode returns the whole track at any time (0/20/40/1000) | Pass |
| Full mode returns the same coords reference (no copy) | Pass |
| Trail mode shows nothing before the track start (`t=-5` → `[]`) | Pass |
| Trail mode shows only the first vertex at the start (`t=0` → `[A]`) | Pass |
| Trail mode grows to the nearest sample (`t=20` → `[A,B,C]`) | Pass |
| Trail mode nearest-sample boundary (`t=22`, nearer C → `[A,B,C]`) | Pass |
| Trail mode full track at last time (`t=40`) | Pass |
| Trail mode full track after last time (`t=1000`) | Pass |
| `displayCoords` matches `@debrief/utils.sliceTrackToTime` exactly (FR-008) | Pass |
| Trail length grows monotonically over time (SC-001) | Pass |
| `classifyTemporalTrack` qualifies LineString + parallel timestamps | Pass |
| Falls back to feature id + default colour when omitted | Pass |
| Rejects LineString with no timestamps (FR-007) | Pass |
| Rejects mismatched timestamps/coords length (FR-007) | Pass |
| Rejects an unparseable timestamp (FR-007) | Pass |
| Rejects a single-vertex LineString (≥2 required) | Pass |
| Rejects a Polygon (FR-009) | Pass |
| Rejects a Point (FR-009) | Pass |
| Mode predicate: only `'trail'` is trail; `full`/absent/unknown → full | Pass |
| Full/absent/unrecognised mode shows the whole track | Pass |

### E2E — `playwright/tests/briefing-zip-trail-mode.spec.ts` (Contract C)

| Test | Status |
|------|--------|
| US1 — Trail Scene: track grows start→full (C1–C3) + evidence PNGs | Pass |
| US2 — Full Scene: track length constant at start/mid/end (C4) | Pass |
| US2 — legacy Scene (no `display_mode`): full track, no console error (C5) | Pass |
| US3 — mixed briefing applies the right mode per Scene (FR-005) | Pass |

### Regression — existing renderer suites stay green with the new fixture

| Suite | Result |
|-------|--------|
| `briefing-zip-playback.spec.ts` ("1 / 4", slider visibility) | 3/3 Pass |
| `slider-drag.spec.ts` (drag updates value + markers) | 2/2 Pass |

No assertions in the existing suites were invalidated by adding `display_mode`
to the dev fixture — the 4-scene count is unchanged and the time-range Scene
remains slider-driven (its window was widened to the full exercise so the
trail grows from near-zero, which does not affect the `max > min` assertion).

## Key Scenarios Verified

- **The reported defect is fixed (US1/SC-001/SC-005)**: on a Trail Scene the
  rendered trail vertex count increases strictly start → mid → end (measured
  1 → 5 → 8 for the 8-point Alpha track) and is near-zero at the window start.
  The evidence PNGs (`trail-start` → `trail-growth` → `trail-end`) show the
  snail-trail growing behind the moving dot.
- **Regression guard (US2/SC-002/SC-003)**: Full-mode and legacy (absent
  `display_mode`) Scenes show the whole track at every playback time, with no
  console error — verified via the resolved `data-mode="full"` and a constant
  vertex count across start/mid/end.
- **Per-Scene re-evaluation (US3/FR-005)**: navigating Trail → Full → Trail in
  one session re-derives the mode each time (trail grows, full is whole, trail
  grows again from the time origin).
- **Parity with the main app (FR-008)**: `displayCoords` delegates to the same
  `@debrief/utils.sliceTrackToTime` the main app uses — asserted equal across a
  sweep of times, so the exported briefing's trail is identical by construction.
- **Graceful fallback (FR-007/FR-009)**: tracks without usable per-vertex
  timing, and all polygons/points, are excluded from time-driven rendering and
  render in full in both modes.

## Known Issues

- None. The unit `coverage_pct` is left null: the pure helpers are exhaustively
  unit-tested and the render wiring is covered end-to-end by Playwright; no
  numeric coverage gate is configured for this app.

## Environment

- Runner: vitest (unit) + Playwright via `run-playwright.mjs` (`@sparticuz/chromium`)
- Branch: `claude/speckit-implement-280-RhIFI` (active feature `280-briefing-trail-mode`)
- Date: 2026-06-01
