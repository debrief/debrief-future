---
feature: "264-briefing-zip-renderer"
captured_at: "2026-05-20T07:15:00Z"
git_sha: "282880e"
tests_passed: 30
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

# Test Summary: Air-Gapped Briefing Zip — Storyboard Renderer (Milestone A)

## Status

**Milestone A — Plumbing in place** (`/speckit.implement 264`, partial).

The 30 passing tests below cover the Foundation surface (Phase 2's
`MapView` extension and the new `briefing-renderer` SPA's pure helpers).
This is the safe checkpoint defined in plan.md § Implementation Strategy:
existing tests still pass, the new SPA workspace builds cleanly, and
no behaviour ships to end-users yet.

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 30 (new) + 22 pre-existing (regression) |
| Passed | 30 |
| Failed | 0 |
| Skipped | 0 |
| Coverage | not measured (deferred to Milestone B) |

## Test Breakdown

### `shared/components` — MapView briefing tile-layer props (T-MAPVIEW-EXT)

| Test | Status |
|------|--------|
| Passes crossOrigin="anonymous" by default | Pass |
| Omits crossOrigin attribute when tileLayerCrossOrigin={false} | Pass |
| Passes through errorTileUrl when provided | Pass |
| Omits errorTileUrl by default | Pass |
| Passes through maxZoom when provided | Pass |
| Omits maxZoom by default | Pass |
| Passes noWrap=true when provided | Pass |
| Defaults noWrap to false | Pass |
| Passes through use-credentials when explicitly set | Pass |

### `apps/briefing-renderer` — inline-data loader

| Test | Status |
|------|--------|
| Returns null when all slots are empty | Pass |
| Loads a valid briefing payload | Pass |
| Orders Scenes by timestamp then creation_order | Pass |
| Throws when no StoryboardFeature is present | Pass |
| Throws when more than one StoryboardFeature is present | Pass |
| Throws when a Scene references a different storyboard_id | Pass |
| Throws on malformed JSON | Pass |
| Throws when item.json is missing required id | Pass |
| Throws when config is missing maxBundledZoom | Pass |

### `apps/briefing-renderer` — browser-compat probes

| Test | Status |
|------|--------|
| Accepts modern Chrome desktop UAs | Pass |
| Accepts modern Edge desktop UAs | Pass |
| Rejects Firefox UAs | Pass |
| Rejects Safari UAs | Pass |
| Returns false for empty UA | Pass |
| Returns true for inline JSON readable in jsdom | Pass |

### `apps/briefing-renderer` — TransportBar component

| Test | Status |
|------|--------|
| Renders the play/pause button and Scene counter | Pass |
| Advances the Scene index on Next click | Pass |
| Disables Prev at the first Scene | Pass |
| Shows the Replay button at the final Scene | Pass |
| Toggles play / pause on click | Pass |
| Resets to Scene 0 on Replay | Pass |

## Key Scenarios Verified

- **Boundary validation at the briefing inline-data load** — the
  loader narrows three independently parsed JSON blocks (features,
  item, config) to typed models and throws `InlineDataLoadError`
  with a clear slot identifier on every documented failure mode.
- **Article IV.5 compliance** — boundary types are derived
  (`BriefingFeatureCollection = StoryboardPlot`,
  `BriefingItemJson = Pick<StacItem, …>`) rather than re-listed.
- **Scene ordering invariant** — Scenes ship to the playback driver
  pre-sorted by `(timestamp ASC, creation_order ASC)` per data-model
  BR-5.
- **Supported-browser banner gate** — the probe surfaces a banner
  for Firefox / Safari / mobile UAs without blocking SPA mount
  (FR-014, Article I.3 — no silent failures).
- **MapView additive props** — `errorTileUrl`, `maxZoom`, `noWrap`,
  `tileLayerCrossOrigin` defaults preserve today's behaviour, so
  every existing MapView consumer (web-shell, VS Code, Storybook)
  is unaffected.

## Known Issues

- **T-HOIST deferred** — the briefing renderer cannot drive
  end-to-end playback (instant + time-range Scenes) until
  `StoryboardPlaybackService` is hoisted from
  `apps/vscode/src/services/storyboardPlayback.ts` to
  `shared/components/src/storyboardPlayback/service.ts`. The hoist
  blocks T044-T055 (browser port adapters + failure-mode
  surfaces), which in turn block the Playwright `file://` /
  network-isolation / playback / mode-toggle / failure-mode specs
  (T060-T063, T076).
- **`flavourCheck()` (#263 XOR validator) not yet wired** — the
  inline-data loader leaves the time-range XOR check to the
  playback driver (a placement decision documented in the loader's
  header). When T-HOIST lands, add a single `flavourCheck(scene)`
  call inside the Scene-entry path.
- **JSON Schema validator at boundary deferred** — `/speckit.review`
  decision 2A required the loader to run the
  `@debrief/schemas` JSON Schema validator before the local scoping
  guards. The validator surface isn't yet exposed to the SPA; the
  loader's scoping + sanity checks cover the gap for now. Wire
  the validator in once a runtime schema is available to the SPA.
- **No Playwright runs yet** — Phase 4-7 Playwright specs (file
  protocol, network isolation, playback, mode toggle, failure
  modes, end-to-end) are deferred to Milestone B.
- **No real export command yet** — Phase 3 (T020-T036:
  `scopeStoryboard`, `buildItemJson`, `computeTileCoverage`,
  `injectInlineData`, `zipAssembler`, `fetchTiles`, the orchestrator
  + menu entry + RESOURCE-SYNC build hook) is the next implementation
  block.

## Environment

- Runners: vitest 1.6.1 (Node 20.x, jsdom)
- Branch: `claude/implement-speckit-264-UvRfg`
- Commit: 282880e
