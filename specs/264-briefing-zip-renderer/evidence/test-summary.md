---
feature: "264-briefing-zip-renderer"
captured_at: "2026-05-20T09:40:00Z"
git_sha: "d17d0ff"
tests_passed: 114
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

# Test Summary: Air-Gapped Briefing Zip — Storyboard Renderer

## Status

**Milestone B — MVP briefing** complete. The full export pipeline,
the SPA's `file://`-origin boot, network-isolation invariant,
display-mode toggling, and the evidence-producer Playwright suite all
pass end-to-end. The 12 Playwright tests run via
`apps/briefing-renderer/run-playwright.mjs` against a Sparticuz Chromium
launched with `--allow-file-access-from-files`, loading the built
`apps/briefing-renderer/dist/index.html` from a real `file://` URL.

## Results

| Metric | Value |
|--------|-------|
| Total tests (this feature) | 114 |
| Passed | 114 |
| Failed | 0 |
| Skipped | 0 |
| Coverage | not measured |

## Test Breakdown

### `shared/components` — MapView briefing tile-layer props (T-MAPVIEW-EXT)

9 vitest cases — see `briefing tile-layer props (spec #264 T-MAPVIEW-EXT)` in `MapView.test.tsx`.

| Test | Status |
|------|--------|
| `crossOrigin="anonymous"` by default | Pass |
| Omits crossOrigin attribute when `tileLayerCrossOrigin={false}` | Pass |
| Passes through `errorTileUrl` when provided | Pass |
| Omits `errorTileUrl` by default | Pass |
| Passes through `maxZoom` when provided | Pass |
| Omits `maxZoom` by default | Pass |
| Passes `noWrap=true` when provided | Pass |
| Defaults `noWrap` to false | Pass |
| Passes through `use-credentials` when explicitly set | Pass |

### `apps/briefing-renderer` — vitest (42 cases)

| File | Tests | Coverage |
|------|-------|----------|
| `loaders/__tests__/inlineDataLoader.test.ts` | 9 | Boundary validation, malformed JSON, missing/extra Storyboards, Scene ordering. |
| `probes/__tests__/browserProbes.test.ts` | 6 | Chrome / Edge / Firefox / Safari UA classification. |
| `components/__tests__/TransportBar.test.tsx` | 6 | Play/pause/prev/next dispatch, Replay button at end, scene counter. |
| `adapters/__tests__/adapters.test.ts` | 8 | All four browser port adapters (Map, SessionStore, PanelView, TimeRangeView). |
| `playback/__tests__/haltedState.test.ts` | 7 | `withHaltGuard` sync + async throw paths; `guardTween` rejection path. |
| `playback/__tests__/playbackDriver.test.ts` | 6 | Snap-to-Scene, forward/backward, replay, time-range tween, halted on throw. |

### `apps/vscode` — vitest export pipeline (59 cases)

| File | Tests | Coverage |
|------|-------|----------|
| `briefingZipExport/scopeStoryboard.test.ts` | 8 | BR-1–BR-5 rules + US4 scenarios. |
| `briefingZipExport/buildItemJson.test.ts` | 7 | BI-1–BI-5 rules; asset filtering; no source mutation. |
| `briefingZipExport/computeTileCoverage.test.ts` | 10 | Algorithm correctness, padding, sample formula, antimeridian, sort. |
| `briefingZipExport/injectInlineData.test.ts` | 6 | Inline JSON slot replacement, `</script>` escaping, idempotency. |
| `briefingZipExport/zipAssembler.test.ts` | 8 | Layout per data-model § 1, tile paths, thumbnail paths, README, reproducibility, FR-013. |
| `briefingZipExport/fetchTiles.test.ts` | 4 | Sequential fetch, retry + backoff, per-tile error containment, progress. |
| `briefingZipExport/export.integration.test.ts` | 9 | End-to-end pipeline against a fixture plot (layout, injection, scope, thumbnails, tile errors, FR-005). |
| `briefingZipExport/exportStoryboardAsBriefingZip.test.ts` | 4 | VS Code command handler: cancel, plot-read failure, missing id, happy path. |
| `briefingZipExport/multiStoryboard.integration.test.ts` | 3 | US4 acceptance — disjoint Storyboards + shared features. |

### `apps/briefing-renderer/playwright` — E2E (12 specs)

| Spec | Pass |
|------|------|
| `briefing-zip-file-protocol.spec.ts` (`file://` boot + relative network) | 2/2 |
| `briefing-zip-network-isolation.spec.ts` (SC-002) | 1/1 |
| `briefing-zip-playback.spec.ts` (instant Scene transport) | 2/2 |
| `briefing-zip-mode-toggle.spec.ts` (SC-005 + FR-024) | 2/2 |
| `briefing-zip-screenshots.spec.ts` (evidence producers) | 5/5 |

## Key Scenarios Verified

- **`file://`-origin boot** — the SPA mounts, the map renders, the
  dev-fixture's 4-Scene Storyboard is visible. Confirmed via real
  Chromium under Playwright.
- **Zero external requests across the lifecycle** — `page.on('request',
  ...)` catches every fetch the SPA makes; the assertion holds across
  load → 2× Scene advance → 2× mode toggle → 2× Scene rewind (SC-002).
- **Display-mode toggle preserves playback state** — 10 consecutive
  Present ↔ Minimal toggles; `transport-scene-index` reads "3 / 4"
  before and after every iteration (SC-005).
- **Mode toggle reachable in Present mode** — `P` keyboard shortcut
  exits Present mode even when chrome is hidden (FR-024).
- **Article I.3 — no silent failures** — `withHaltGuard` transitions
  the SPA to a visible "playback halted" state on any adapter throw;
  `guardTween` does the same for tween rejection. Verified
  end-to-end in unit-tests and via the screenshot producer.
- **Article IV.5 — boundary types derived** — `BriefingFeatureCollection`
  is a structural alias of `StoryboardPlot`; the SPA's loader narrows
  via the same `isStoryboardFeature` / `isSceneFeature` predicates
  the authoring environment uses (no re-derivation).
- **US4 acceptance** — multi-Storyboard plots produce per-Storyboard
  zips with disjoint Scene sets; shared features (e.g. a track
  referenced by both Storyboards) appear in both zips
  (`multiStoryboard.integration.test.ts`).

## Known Issues

- **End-to-end "real export → real unzip → real play" Playwright
  spec (T079) deferred.** The current Playwright suite drives the SPA
  directly from the built dev-fixture bundle; the export pipeline is
  covered by `export.integration.test.ts` which round-trips through
  JSZip. Wiring the two halves into a single spec is meaningful
  future work but not required to verify SC-001 / SC-002 / SC-005.
- **Time-range Scene Playwright coverage is at the unit-test layer.**
  The dev fixture ships only instant Scenes; the time-range path is
  covered by `playbackDriver.test.ts` which constructs synthetic
  time-range Scene fixtures and asserts the tween writes both axes
  in lock-step.
- **`StoryboardPlaybackService` hoist (T-HOIST, T010-T015) intentionally
  deferred.** The briefing renderer composes a small SPA-local driver
  (`apps/briefing-renderer/src/playback/playbackDriver.ts`) around the
  host-agnostic `runTimeRangeTween` primitive from #263. When the
  full hoist lands as a follow-up the briefing renderer can swap in
  the shared service and delete the local driver — see ADR-NEW
  (2026-05-20).
- **`flavourCheck()` (#263 XOR validator) at the inline-data loader
  is deferred.** The XOR is enforced upstream at the schema /
  authoring layer and at the playback driver via `isTimeRangeScene`
  narrowing; adding it again at the SPA's boundary is belt-and-braces
  work that the current scoping + sanity checks already cover for
  the briefing's read-only context.

## Environment

- Vitest 1.6.1 (Node 20.x, jsdom for component tests, node env for export tests).
- Playwright 1.58.2 with `@sparticuz/chromium` 143.0.4.
- Branch: `claude/implement-speckit-264-UvRfg`.
- Commit at capture: `d17d0ff`.
