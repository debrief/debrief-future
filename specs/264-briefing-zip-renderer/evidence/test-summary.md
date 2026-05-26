---
feature: "264-briefing-zip-renderer"
captured_at: "2026-05-20T18:32:00Z"
git_sha: "f3e432d"
tests_passed: 935
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

# Test Summary: Air-Gapped Briefing Zip — Storyboard Renderer

## Status

**Milestone C — all 89 tasks delivered.** Phases 1, 2 (T-MAPVIEW-EXT and
T-HOIST), 3, 4, 5, 6, and 7 all complete. The previously-deferred
follow-ups — T-HOIST (T010-T015), MapView Storybook story + E2E
(T018-T019), `boot.ts` (T059), TimeSlider/ModeToggle vitest
(T072-T073), component Storybook E2E (T074-T075), end-to-end
real-export Playwright (T079), and interaction GIF (T086) — were
delivered in this session.

The only remaining task is **T089** (`/speckit.pr`), which is
user-triggered.

## Results

| Metric | Value |
|--------|-------|
| Total tests (this feature + regressions) | 935 |
| Passed | 935 |
| Failed | 0 |
| Skipped | 0 |
| Coverage | not measured |

## Test Breakdown

### `apps/vscode` — vitest (840 cases, 62 files)

All pre-existing vscode tests continue to pass against the hoisted
`StoryboardPlaybackService` (T010-T015). Includes:

- 60 new cases for the briefing-zip export pipeline (`scopeStoryboard`,
  `buildItemJson`, `computeTileCoverage`, `injectInlineData`,
  `zipAssembler`, `fetchTiles`, the orchestrator, the command handler,
  the multi-Storyboard integration, the sample-briefing.zip artefact
  emitter).
- 49 pre-existing storyboardPlayback tests, now running against the
  shared `@debrief/components/storyboardPlayback` module via the
  thin re-export shim at `apps/vscode/src/services/storyboardPlayback.ts`.
  The hoist (T-HOIST) is net-zero behaviour: every pre-existing test
  passes unchanged.

### `apps/briefing-renderer` — vitest (58 cases, 9 files)

| File | Tests | Coverage |
|------|-------|----------|
| `__tests__/boot.test.ts` | 3 | T059 — boot sequence: inlineData / dev-fixture / error paths. |
| `loaders/__tests__/inlineDataLoader.test.ts` | 9 | Boundary validation, malformed JSON, missing/extra Storyboards, Scene ordering. |
| `probes/__tests__/browserProbes.test.ts` | 6 | Chrome / Edge / Firefox / Safari UA classification. |
| `components/__tests__/TransportBar.test.tsx` | 6 | Play/pause/prev/next, Replay button at end, scene counter. |
| `components/__tests__/ModeToggle.test.tsx` | 6 | T072 — toggle click, P key, mode-flip both ways, hover-reveal debounce. |
| `components/__tests__/TimeSlider.test.tsx` | 7 | T073 — slider bounds, scrub dispatch, instant-Scene disable, ISO formatting. |
| `adapters/__tests__/adapters.test.ts` | 8 | All four browser port adapters. |
| `playback/__tests__/haltedState.test.ts` | 7 | `withHaltGuard` sync/async throw paths; `guardTween` rejection path. |
| `playback/__tests__/playbackDriver.test.ts` | 6 | Snap-to-Scene, forward/backward, replay, time-range tween, halted on throw. |

### `shared/components` — MapView vitest (31 cases)

9 new cases for the briefing tile-layer props (T-MAPVIEW-EXT) +
22 pre-existing MapView tests, all green.

### `apps/briefing-renderer/playwright` — E2E (16 specs, all pass)

| Spec | Pass | Notes |
|------|------|-------|
| `briefing-zip-file-protocol.spec.ts` | 2/2 | `file://`-origin boot + relative network |
| `briefing-zip-network-isolation.spec.ts` | 1/1 | SC-002 |
| `briefing-zip-playback.spec.ts` | 2/2 | Instant Scene transport + slider disabled for instants |
| `briefing-zip-mode-toggle.spec.ts` | 2/2 | SC-005 + FR-024 (10 toggles preserve state) |
| `briefing-zip-screenshots.spec.ts` | 5/5 | Evidence producers — Minimal / Present / Empty / Error / Halted |
| `briefing-component-stories.spec.ts` | 2/2 | **T074/T075** — TransportBar + ModeToggle in story-mode (`?story=…`) |
| `briefing-zip-end-to-end.spec.ts` | 1/1 | **T079** — real export → real unzip → real play full pipeline |
| `briefing-zip-interaction-gif.spec.ts` | 1/1 | **T086** — captures mode-toggle + playback flow into interaction.gif |

### `shared/components/e2e` — MapView Storybook (3 specs)

| Spec | Pass | Notes |
|------|------|-------|
| `MapViewBriefingProps.spec.ts` (light) | 1/1 | **T019** — captures `BriefingTileLayerProps` story in light theme |
| `MapViewBriefingProps.spec.ts` (dark) | 1/1 | **T019** — captures in dark theme |
| `MapViewBriefingProps.spec.ts` (vscode) | 1/1 | **T019** — captures in vscode theme |

## Key Scenarios Verified

- **`file://`-origin boot** — the SPA mounts, the map renders, the
  dev-fixture's 4-Scene Storyboard is visible.
- **Zero external requests across the lifecycle** — `page.on('request',
  ...)` catches every fetch the SPA makes; the assertion holds across
  load → Scene advances → mode toggles → Scene rewinds (SC-002).
- **End-to-end real export → real unzip → real play (T079)** — the
  Playwright spec invokes the actual export pipeline, unzips the result
  into a temp dir, opens `file:///tmp/.../index.html`, advances through
  all 4 Scenes, presses Replay, and verifies zero external requests
  for the entire flow. The SPA + export converge here.
- **Display-mode toggle preserves playback state (SC-005)** — 10
  consecutive Present ↔ Minimal toggles preserve current Scene index.
- **Article I.3 — no silent failures** — `withHaltGuard` transitions
  the SPA to a visible "playback halted" state on any adapter throw;
  `guardTween` does the same for tween rejections.
- **T-HOIST end-to-end** — every pre-existing storyboardPlayback test
  passes against the hoisted shared service; the VS Code app wires
  the three vscode-backed ports (`showErrorMessage`, `setContext`,
  `showInformationMessage`) at the instantiation site rather than
  inside the service.
- **MapView briefing props in three themes** — `BriefingTileLayerProps`
  story renders the actual Leaflet map with the four file://-friendly
  props in light, dark, and vscode theme — captured as evidence PNGs.
- **TransportBar + ModeToggle isolation captures (T074-T075)** — the
  briefing renderer's `?story=transport-bar` and `?story=mode-toggle`
  query-param modes render each component on a neutral canvas; the
  Playwright spec captures four PNGs (TransportBar idle + replay surface;
  ModeToggle minimal + present).
- **Interaction GIF (T086)** — Playwright's `recordVideo` captures the
  mode-toggle + playback flow; ffmpeg post-process converts to
  `interaction.gif` (~100 KB, well under the 2 MB target; ~4 s at 12 fps,
  inside the < 5 s budget).

## Known Issues

None. The previously-deferred follow-ups all landed in this session.

The remaining `/speckit.pr` task (T089) is user-triggered and not
covered by this implementation.

## Environment

- Vitest 1.6.1 (Node 20.x; jsdom for components, node env for export).
- Playwright 1.58.2 with `@sparticuz/chromium` 143.0.4 and
  `--allow-file-access-from-files`.
- Storybook 8.6.15 (shared/components Storybook E2E build).
- ffmpeg 7.1.1 (interaction GIF conversion).
- Branch: `claude/implement-speckit-264-UvRfg`.
- Commit at capture: `f3e432d`.
