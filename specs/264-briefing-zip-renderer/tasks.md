---
description: "Implementation tasks for 264 — Air-Gapped Briefing Zip — Storyboard Renderer (SPA)"
---

# Tasks: Air-Gapped Briefing Zip — Storyboard Renderer (SPA)

**Input**: Design documents from `specs/264-briefing-zip-renderer/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md
**Feature branch**: `claude/start-spec-264-57xbA` (PR #639)
**Active feature dir**: `specs/264-briefing-zip-renderer/`

> Generated 2026-05-20 by `/speckit.tasks` after `/speckit.review` decisions
> were applied to plan + contracts (commit 8a18768). Tasks reflect:
> - The 15 follow-ups captured in plan.md § Open follow-ups (T-HOIST,
>   T-SPA-SHELL, T-ADAPTERS, T-LOADER, T-CHROME, T-EXPORT-PURE,
>   T-EXPORT-COMMAND, T-EXPORT-INTEGRATION, T-RESOURCE-SYNC,
>   T-PLAYWRIGHT-*, T-DOCS).
> - The three additional follow-ups added during `/speckit.review`:
>   T-MAPVIEW-EXT (Foundation), T-FAILURE-MODES-ADAPTERS,
>   T-FAILURE-MODES-TWEEN (US2 robustness gates).
>
> ---
>
> ## Implementation status (Milestone B — 2026-05-20)
>
> `/speckit.implement 264` delivered the **MVP briefing** milestone:
> Phases 1, 2 (T-MAPVIEW-EXT), 3, 4, 5 (chrome + Storybook stories),
> 6, and 7 (evidence + ADR + blog post). 73 of 89 tasks complete.
>
> Test totals at ship time: **840 vitest cases in `apps/vscode`**
> (including 60 new briefing-zip-export cases), **42 briefing-renderer
> vitest cases** (loader, probes, adapters, playback driver, halted
> state, TransportBar), **31 MapView vitest cases** (including 9 new
> briefing-prop cases), and **12 Playwright E2E specs** (file://
> origin, network isolation, instant Scene playback, 10× mode toggle,
> failure-mode surfaces, evidence-screenshot producers) — all pass.
>
> Evidence captured at `specs/264-briefing-zip-renderer/evidence/`:
> 6 real PNG screenshots (Minimal × 2, Present, Empty, Error, Halted)
> taken by Playwright against the built SPA loaded from a `file://`
> origin in a real Chromium; 853 KB `sample-briefing.zip` produced
> by the export pipeline; full `test-summary.md` and
> `webview-e2e-summary.md`.
>
> ### Deferred (out of this session)
>
> - **T-HOIST (T010-T015)** — hoisting the 983-line
>   `StoryboardPlaybackService` out of `apps/vscode/` requires
>   extracting its `vscode.Event` coupling behind shared interfaces.
>   The briefing renderer instead composes a ~150-line SPA-local
>   driver (`apps/briefing-renderer/src/playback/playbackDriver.ts`)
>   that wraps the host-agnostic `runTimeRangeTween` primitive from
>   #263. ADR-NEW (2026-05-20) records the trade-off; when the full
>   hoist lands as a follow-up the briefing renderer can swap in the
>   shared service and delete the local driver.
> - **T018-T019** — Storybook story + Storybook E2E spec for the new
>   `MapView` props. The props themselves are covered by the 9 new
>   vitest cases (`MapView.test.tsx`); the visual-regression Storybook
>   pass is incremental polish.
> - **T079** — end-to-end "real export → real unzip → real play"
>   Playwright spec. The current suite drives the SPA directly using
>   the dev fixture; the export pipeline is covered separately by
>   `export.integration.test.ts`. Wiring the two halves into a single
>   Playwright spec is meaningful future work but not required to
>   verify SC-001 / SC-002 / SC-005.
>
> ### Verification at this milestone
>
> ```sh
> # All green at commit-time SHA.
> pnpm -r typecheck                                                  # clean across all workspaces
> pnpm --filter @debrief/components test -- MapView.test             # 31 passed
> pnpm --filter @debrief/briefing-renderer test                      # 42 passed
> pnpm --filter @debrief/briefing-renderer build                     # 315 KB JS, no network refs
> pnpm --filter debrief-vscode test                                  # 840 passed
> cd apps/briefing-renderer && node run-playwright.mjs               # 12 passed
> ```

---

## Evidence Requirements

> **Purpose**: Capture artifacts that prove the briefing zip works end-to-end on the recipient side, with zero external network traffic, in the supported browsers.

**Evidence Directory**: `specs/264-briefing-zip-renderer/evidence/`
**Media Directory**: `specs/264-briefing-zip-renderer/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `test-summary.md` | pytest + vitest + Playwright totals using `.specify/templates/evidence/test-summary-template.md` (YAML front matter with `feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`) | After all tests pass |
| `usage-example.md` | Analyst-side flow (invoke command, pick destination) + recipient-side flow (unzip, open in Chrome/Edge, play) | After US1 + US2 complete |
| `sample-briefing.zip` | A real exported briefing zip from the fixture plot | After US1 + US2 complete |
| `screenshots/briefing-minimal-light.png` | SPA in Minimal mode, light theme | Playwright capture |
| `screenshots/briefing-minimal-dark.png` | SPA in Minimal mode, dark theme | Playwright capture |
| `screenshots/briefing-minimal-vscode.png` | SPA in Minimal mode, VS Code theme | Playwright capture |
| `screenshots/briefing-present.png` | SPA in Present mode (chrome hidden) | Playwright capture |
| `screenshots/briefing-empty.png` | Empty-state ("This Storyboard has no Scenes to play") | Playwright capture |
| `screenshots/briefing-error.png` | Error-state (boundary validation failure) | Playwright capture |
| `screenshots/briefing-halted.png` | "Playback halted" state (T-FAILURE-MODES Article I.3 surface) | Playwright capture |
| `screenshots/briefing-network.png` | DevTools Network panel showing 0 external requests across the lifecycle | Playwright capture |
| `screenshots/interaction.gif` | Mode-toggle + playback interaction (< 5 s, < 2 MB) | Playwright `recordVideo` → ffmpeg |
| `webview-e2e-summary.md` | Summary of all Playwright suites (file-protocol, network-isolation, playback, mode-toggle, failure-modes, end-to-end) with pass counts | After Playwright runs |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `evidence/opening-context.md` | Cached opener (What We're Building, How It Fits, Key Decisions) | During `/speckit.plan` — already present |
| `media/shipped-post.md` | Feature post combining cached opener + ship-time evidence (Content Specialist agent writes this) | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with full evidence linked from description | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with `shipped-post.md` | Triggered by `/speckit.pr` |

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip or omit Playwright tasks because you think browsers can't be installed. The project uses `@sparticuz/chromium` which bundles a Linux Chromium binary via npm. Standard browser CDN downloads are blocked (403), but this bundled binary works fully. Run `node apps/briefing-renderer/run-playwright.mjs` to extract and configure. Full details: `docs/project_notes/playwright-installation-research.md`.

---

## Phase 1: Setup

Scaffold the new `apps/briefing-renderer/` SPA workspace and add the one new dependency (`jszip`) the VS Code extension needs. Nothing in this phase ships behaviour — it lays the structural groundwork that Phases 2–7 build on.

- [x] T001 Scaffold the new SPA workspace — root metadata and TS config `apps/briefing-renderer/package.json`
- [x] T002 [P] Add Vite config (React plugin, dev server on :5174, build output `dist/`) `apps/briefing-renderer/vite.config.ts`
- [x] T003 [P] Add TypeScript config extending the monorepo strict base `apps/briefing-renderer/tsconfig.json`
- [x] T004 [P] Add ESLint config matching `apps/spec-navigator/` `apps/briefing-renderer/.eslintrc.cjs`
- [x] T005 [P] Add Playwright config (Chromium-only project, screenshot + video on failure) `apps/briefing-renderer/playwright.config.ts`
- [x] T006 [P] Add the `@sparticuz/chromium`-based Playwright runner wrapper `apps/briefing-renderer/run-playwright.mjs`
- [x] T007 [P] Register the new workspace package in the root `pnpm-workspace.yaml` — **no-op**: `pnpm-workspace.yaml` already globs `apps/*`, so the new package is picked up automatically by `pnpm install`. Verified: `jszip` and the new workspace resolve cleanly.
- [x] T008 [P] Add `jszip ^3.10.x` to the VS Code extension's `dependencies` `apps/vscode/package.json`
- [x] T009 [P] Create the empty resource target directory `apps/vscode/resources/briefing-renderer-static/.gitkeep` so T-RESOURCE-SYNC has a stable destination

**Parallel execution example for Phase 1**: T001 must land first (it creates the package); T002–T009 can all be drafted in parallel as soon as T001 is on disk because they touch different files. Verify by running `pnpm install` after Phase 1 — the new workspace should resolve cleanly and `jszip` should appear in `pnpm-lock.yaml`.

---

## Phase 2: Foundation (blocks all user stories)

Two mechanical pieces of plumbing that every downstream story consumes — the playback-service hoist (so both the VS Code extension *and* the briefing SPA import the same engine) and the `MapView` extension (so the briefing SPA's `file://`-friendly tile-layer surface is fully expressed through the shared component). Both are net-zero behaviour changes for existing consumers; verify by running the full test suite before moving on to Phase 3.

### T-HOIST — Hoist `StoryboardPlaybackService` from the VS Code app into `@debrief/components`

- [ ] T010 Move the service file (no logic changes) `shared/components/src/storyboardPlayback/service.ts`
- [ ] T011 Extract the four port interfaces (`PlaybackMapPanel`, `PlaybackSessionManager`, `PlaybackPanelView`, `PlaybackTimeRangeView`) into their own file `shared/components/src/storyboardPlayback/ports.ts`
- [ ] T012 Add the barrel export so both consumers import from a stable path `shared/components/src/storyboardPlayback/index.ts`
- [ ] T013 Update the ~3 VS Code app imports to point at the new location (find via `grep -r "services/storyboardPlayback"`) `apps/vscode/src/services/storyboard*.ts`
- [ ] T014 Delete the now-obsolete VS Code copy `apps/vscode/src/services/storyboardPlayback.ts`
- [ ] T015 [test] Verify existing storyboard playback tests still pass against the hoisted service `apps/vscode/src/services/storyboardPlayback.test.ts`

### T-MAPVIEW-EXT — Extend `MapView` with four optional `file://`-friendly tile-layer props

- [x] T016 Add `errorTileUrl?: string`, `maxZoom?: number`, `noWrap?: boolean`, `tileLayerCrossOrigin?: 'anonymous' | 'use-credentials' | false` props (defaults match today's behaviour so existing consumers are unaffected) `shared/components/src/MapView/MapView.tsx`
- [x] T017 [P][test] Add vitest covering the four new props — defaults preserve current behaviour; each prop wired through to the underlying `<TileLayer>` `shared/components/src/MapView/MapView.test.tsx`
- [ ] T018 [P] Add a Storybook story exercising the `file://`-friendly prop bundle (`errorTileUrl`, `noWrap`, `maxZoom={12}`, `tileLayerCrossOrigin={false}`) so the visual regression layer covers the briefing surface `shared/components/src/MapView/MapView.stories.tsx`
- [ ] T019 [P][test] Storybook E2E spec capturing the new story in the three theme variants for evidence `shared/components/e2e/MapViewBriefingProps.spec.ts`

**Phase 2 verification gate**: `pnpm -r typecheck && pnpm -r lint && pnpm --filter '!@debrief/web-shell' test` MUST pass before any Phase 3+ task begins. The hoist is net-zero behaviour; the MapView props are additive. Any regression here surfaces immediately and is cheap to fix; later it would block multiple downstream stories.

---

## Phase 3: User Story 1 — Export a Storyboard as a briefing zip (P1)

**Story goal**: An analyst can invoke the new VS Code command from a Storyboard's overflow menu, pick a destination, and end up with a single `.zip` file on disk whose layout matches the contract in data-model § 1.

**Independent test criteria**: With a fixture plot containing at least one Storyboard, invoke `debrief.storyboard.exportAsBriefingZip` (programmatically in test, via the menu in dev). The integration test asserts: (a) one `.zip` file appears at the destination; (b) unpacking it reveals the layout from data-model § 1 — `index.html` at root, `assets/`, `features.geojson`, `item.json`, `scene-thumbnails/`, `tiles/`; (c) the source plot's `features.geojson` and `item.json` are byte-identical before and after (FR-005 — no source mutation). The SPA does not need to be complete for this story to pass — a placeholder bundle in `apps/vscode/resources/briefing-renderer-static/` suffices.

### Pure helpers (data-shaping + zip assembly)

- [x] T020 [P] Implement Storyboard scoping per data-model BR-1–BR-5 `apps/vscode/src/services/briefingZipExport/scopeStoryboard.ts`
- [x] T021 [P] Implement scoped `item.json` builder per data-model BI-1–BI-5 `apps/vscode/src/services/briefingZipExport/buildItemJson.ts`
- [x] T022 [P] Implement `computeTileCoverage` per `contracts/tile-coverage.md` (including the `max(8, ceil(transition_duration_ms / 1000))` sample formula from `/speckit.review` decision 4A) `apps/vscode/src/services/briefingZipExport/computeTileCoverage.ts`
- [x] T023 [P] Implement `injectInlineData` (writes the three `<script type="application/json">` blocks into the bundled `index.html` per data-model § 4) `apps/vscode/src/services/briefingZipExport/injectInlineData.ts`
- [x] T024 [P] Implement `zipAssembler` (orchestrates the JSZip build per `contracts/export-command.md` § 8) `apps/vscode/src/services/briefingZipExport/zipAssembler.ts`
- [x] T025 [P] Implement `fetchTiles` (uses VS Code's HTTPS client; sequential, 100 ms gap, 3 retries per tile — matches research.md R2) `apps/vscode/src/services/briefingZipExport/fetchTiles.ts`

### Pure-helper test coverage

- [x] T026 [P][test] Cover every BR-1–BR-5 rule, including the cross-Storyboard isolation case from US4 acceptance scenarios `apps/vscode/src/services/briefingZipExport/scopeStoryboard.test.ts`
- [x] T027 [P][test] Cover BI-1–BI-5, especially the asset-map filtering (BI-3) and the `links → self only` reduction (BI-5) `apps/vscode/src/services/briefingZipExport/buildItemJson.test.ts`
- [x] T028 [P][test] Cover all seven test obligations from `contracts/tile-coverage.md` plus the new sample-formula edge cases (sub-second tween floored at 8 samples; 30 s tween capped at ~30 samples) `apps/vscode/src/services/briefingZipExport/computeTileCoverage.test.ts`
- [x] T029 [P][test] Cover inline-block injection: the three JSON payloads are stringified into the right `<script>` ids; HTML is otherwise byte-stable `apps/vscode/src/services/briefingZipExport/injectInlineData.test.ts`
- [x] T030 [P][test] Cover zip assembly: required paths present, relative paths only (FR-013), zip is reproducible given identical inputs `apps/vscode/src/services/briefingZipExport/zipAssembler.test.ts`
- [x] T031 [P][test] Cover tile fetching: per-tile retry logic, accumulated errors don't abort the export, missing tiles surface as logged-not-thrown `apps/vscode/src/services/briefingZipExport/fetchTiles.test.ts`

### Command orchestrator + registration

- [x] T032 Implement `exportStoryboardAsBriefingZip` per `contracts/export-command.md` § Steps 1–11 (atomic build-then-write; cancellation no-op; per-tile failures don't abort) `apps/vscode/src/commands/exportStoryboardAsBriefingZip.ts`
- [x] T033 Register `debrief.storyboard.exportAsBriefingZip` in `contributes.commands` and add the Storyboard-overflow-menu entry under `contributes.menus` (key off the same `when` clause as `debrief.storyboard.rename`) `apps/vscode/package.json`
- [x] T034 [test] Stub `showSaveDialog → undefined` → command returns no-op; stub `readPlot` throw → `showError` called, no zip written; stub `storyboardId not found` → `showError` called `apps/vscode/src/commands/exportStoryboardAsBriefingZip.test.ts`
- [x] T035 [test] Integration test exercising the full pipeline against a fixture plot — fixture in tree, stubbed `fetchTile` returns synthetic 1×1 PNG bytes, assert resulting zip layout matches data-model § 1 `apps/vscode/src/services/briefingZipExport/export.integration.test.ts`

### Resource-sync wiring (T-RESOURCE-SYNC)

- [x] T036 Wire the VS Code extension build (esbuild post-step) to copy `apps/briefing-renderer/dist/**` into `apps/vscode/resources/briefing-renderer-static/` before `vsce package`; if `dist/` doesn't exist, copy a placeholder (Phase 4 fills `dist/` properly) `apps/vscode/build.mjs`

**Parallel execution example for Phase 3**: T020–T025 and their corresponding tests T026–T031 are six independent files. After T020 lands, write T026 in parallel with T021 + T027 + T022 + T028 etc. The command orchestrator T032 depends on the pure helpers being importable, so it lands after them. T033 (package.json registration) is independent of T032 implementation — it can land in parallel as a one-line entry.

---

## Phase 4: User Story 2 — Open the briefing zip and play the Storyboard with no installation (P1)

**Story goal**: A recipient unzips a briefing on a machine with no Debrief install (only current Chrome or Edge), double-clicks `index.html`, and the SPA loads from `file://`, renders Scene 0, and plays back the Storyboard with no network requests.

**Independent test criteria**: A Playwright spec opens an exported briefing zip directly from `file://`, verifies the SPA boots (no spinner stuck, no console errors), renders the first Scene, and observes zero external requests across load → play → mode toggle → replay. A second Playwright spec verifies time-range Scene playback matches the captured trajectory (viewport `viewport → viewport_end` and slider `t_start → t_end` advance in lock-step per `contracts/spa-loading.md` § Playback contract). A third spec verifies the failure-mode surfaces (T-FAILURE-MODES tasks below): adapter throws and tween rejections both surface a visible "playback halted" state, not silent freezing.

### SPA shell scaffolding (T-SPA-SHELL)

- [x] T037 Create the SPA entry point and React root `apps/briefing-renderer/src/main.tsx`
- [x] T038 Create the top-level `App` component with the `inlineData` test-injection prop per `contracts/spa-loading.md` § Public component surface `apps/briefing-renderer/src/App.tsx`
- [x] T039 Create the local Zustand store per data-model § 5 (features, item, scenes, currentSceneIndex, currentTime, playState, displayMode, modeToggleVisible) `apps/briefing-renderer/src/store.ts`
- [x] T040 Create the `index.html` template with the three `<script type="application/json">` slots per data-model § 4 (filled per-export by `injectInlineData`) `apps/briefing-renderer/index.html`
- [x] T041 [P] Add a local dev fixture (small synthetic Storyboard) so `pnpm dev` boots the SPA without needing a real export `apps/briefing-renderer/src/fixtures/dev-fixture.ts`

### Inline data loader with boundary validation (T-LOADER + decision 2A)

- [x] T042 Implement the inline-data loader: read each `<script>` block, JSON.parse, then run **local scoping guards** (exactly one Storyboard, every Scene matches `storyboard_id`, ordering); item & config sanity checks. **Deferred**: schema-validator integration (decision 2A) and `flavourCheck` (#263 cross-field XOR) — the schema-validator surface in `@debrief/schemas` is not yet exposed to the SPA, and `flavourCheck` lives in `@debrief/components/storyboard/validate` and is best applied at the playback driver site once T-HOIST lands. Documented in the loader's header. `apps/briefing-renderer/src/loaders/inlineDataLoader.ts`
- [x] T043 [test] Cover the loader-side rules: malformed JSON, missing Storyboard, multiple Storyboards, Scene `storyboard_id` mismatch, missing item.json id, missing config maxBundledZoom, deterministic Scene ordering by timestamp + creation_order. Schema-validator & flavourCheck rows deferred with T042. `apps/briefing-renderer/src/loaders/__tests__/inlineDataLoader.test.ts`

### Four browser port adapters (T-ADAPTERS)

- [x] T044 [P] Implement `BrowserMapAdapter` wrapping a `react-leaflet` `MapContainer` ref; `flyToViewport` calls `map.flyTo(...)` for tweens, `flyToViewport(durationMs=0)` for per-frame scrubbing `apps/briefing-renderer/src/adapters/BrowserMapAdapter.ts`
- [x] T045 [P] Implement `LocalSessionStoreAdapter` backed by the Zustand store (`setCurrentTime` / `getCurrentTime` slice) — no `@debrief/session-state` dependency `apps/briefing-renderer/src/adapters/LocalSessionStoreAdapter.ts`
- [x] T046 [P] Implement `BrowserPanelViewAdapter` (`notifySceneChange(sceneId)` writes to the store; React subscribes and updates the highlighted Scene) `apps/briefing-renderer/src/adapters/BrowserPanelViewAdapter.ts`
- [x] T047 [P] Implement `BrowserTimeRangeViewAdapter` (`setScrubbableRange(start, end)` updates slider bounds; `null/null` for instant Scenes) — port signature matches the #263 surface `apps/briefing-renderer/src/adapters/BrowserTimeRangeViewAdapter.ts`
- [x] T048 [P][test] Adapter unit tests — each adapter's port contract is verified in isolation `apps/briefing-renderer/src/adapters/BrowserMapAdapter.test.ts`
- [x] T049 [P][test] LocalSessionStoreAdapter unit test `apps/briefing-renderer/src/adapters/LocalSessionStoreAdapter.test.ts`
- [x] T050 [P][test] BrowserPanelViewAdapter unit test `apps/briefing-renderer/src/adapters/BrowserPanelViewAdapter.test.ts`
- [x] T051 [P][test] BrowserTimeRangeViewAdapter unit test `apps/briefing-renderer/src/adapters/BrowserTimeRangeViewAdapter.test.ts`

### Failure-mode surfaces (T-FAILURE-MODES-ADAPTERS + T-FAILURE-MODES-TWEEN)

> Surfaced during `/speckit.review`. Without these, an uncaught throw mid-tween silently freezes playback — Article I.3 violation. The SPA must transition to a visible "playback halted" state instead.

- [x] T052 Wrap each of the four port adapters in a try/catch that surfaces a visible "playback halted" Error state to the store; the visible state names the adapter that threw `apps/briefing-renderer/src/playback/halted-state.ts`
- [x] T053 Add a top-level catch on `runTimeRangeTween`'s async `done` Promise rejection in the SPA's playback driver — same Error state, naming the tween that rejected `apps/briefing-renderer/src/playback/playback-driver.ts`
- [x] T054 [test] Inject a throw from a mocked adapter into the SPA; assert the store transitions to `'halted'` and the user-visible message names the adapter `apps/briefing-renderer/src/playback/halted-state.test.ts`
- [x] T055 [test] Inject an adapter throw inside a time-range tween; assert the tween's `done` Promise rejection is caught and the store transitions to `'halted'` `apps/briefing-renderer/src/playback/playback-driver.test.ts`

### Browser-compat probes (boot-time)

- [x] T056 Implement boot-time browser-compat probes (`userAgentSupported` true only for current Chrome or Edge — Firefox / Safari / mobile fail), the supported-browser banner UI, and the banner text from `contracts/spa-loading.md` § Browser-compat probes. `relativeImgLoadable` / `leafletTilesLoadable` async probes are simplified to a synchronous boot probe + an `onError` fallback at tile-load time (sufficient for the boot-banner gate; the per-tile placeholder is wired via `MapView errorTileUrl`). `apps/briefing-renderer/src/probes/browserProbes.ts`
- [x] T057 [test] Probe unit tests — Chrome / Edge UAs return true; Firefox / Safari / empty UAs return false. `apps/briefing-renderer/src/probes/__tests__/browserProbes.test.ts`

### Map + chrome wiring (uses the extended MapView from Phase 2)

- [x] T058 Mount a direct `<MapContainer>` + `<TileLayer>` with the briefing prop bundle (`url="./tiles/{z}/{x}/{y}.png"`, `errorTileUrl="./tiles/placeholder.png"`, `noWrap`, `maxZoom={config.maxBundledZoom}`). **Note**: we use react-leaflet directly rather than `<MapView>` from `@debrief/components` to avoid pulling in MapView's drawing toolbar, scene rectangles, and sensor layers (none of which the briefing needs). The four new MapView props (T-MAPVIEW-EXT, T016) are available for a future migration. `apps/briefing-renderer/src/components/BriefingMap.tsx`
- [ ] T059 Wire the SPA boot sequence per `contracts/spa-loading.md` § Loading sequence: load → validate → mount → instantiate `StoryboardPlaybackService` with the four browser adapters → render Scene 0 at rest `apps/briefing-renderer/src/boot.ts`

### Playwright E2E for US2

- [x] T060 [test] SPA boots from `file://` and renders Scene 0 — the foundational `file://`-protocol gate `apps/briefing-renderer/playwright/tests/briefing-zip-file-protocol.spec.ts`
- [x] T061 [test] Zero external requests observed across load → play → toggle → replay — the headline FR-015 + SC-002 verification `apps/briefing-renderer/playwright/tests/briefing-zip-network-isolation.spec.ts`
- [x] T062 [test] Instant + time-range Scene playback matches expected slider/viewport trajectory; mixed Storyboard transitions don't glitch `apps/briefing-renderer/playwright/tests/briefing-zip-playback.spec.ts`
- [x] T063 [test] Failure-mode surfaces: injected adapter throw → halted state visible; injected tween rejection → halted state visible (T-FAILURE-MODES Playwright gate) `apps/briefing-renderer/playwright/tests/briefing-zip-failure-modes.spec.ts`

**Parallel execution example for Phase 4**: The four adapters (T044–T047) and their tests (T048–T051) are eight independent files — write all four adapters in parallel, then all four tests. T052–T055 (failure-mode work) depends on the adapters existing but is otherwise independent of the probes (T056–T057), the map (T058), and boot wiring (T059). The four Playwright specs (T060–T063) are independent of each other and of US3/US4 work — they're the parallelisable verification surface.

---

## Phase 5: User Story 3 — Toggle between Present and Minimal modes (P1)

**Story goal**: The recipient can flip between Present (chrome hidden, map fills viewport) and Minimal (transport + slider visible) without losing playback state. Default-on-first-open is Minimal so a first-time user always sees an affordance to start playback.

**Independent test criteria**: A Playwright spec opens the SPA, toggles between Present and Minimal at least 10 consecutive times during active playback, and asserts on every toggle that `currentSceneIndex`, `currentTime`, and `playState` are identical pre- and post-toggle (SC-005). A second assertion: the toggle remains reachable in Present mode via either the keyboard shortcut `P` or the hover-revealed corner control (FR-024) — the user is never trapped.

### Chrome components (T-CHROME)

- [x] T064 [P] `MinimalChrome` wrapper component (transport bar + time slider + current Scene index + "Enter Present" button visible) `apps/briefing-renderer/src/components/MinimalChrome.tsx`
- [x] T065 [P] `PresentChrome` wrapper component (no chrome by default; mouse-near-top-right reveals a discreet "Exit Present" affordance for 3 s) `apps/briefing-renderer/src/components/PresentChrome.tsx`
- [x] T066 [P] `TransportBar` (play / pause / prev Scene / next Scene + replay button at end-of-Storyboard per `contracts/spa-loading.md` § Replay behaviour) `apps/briefing-renderer/src/components/TransportBar.tsx`
- [x] T067 [P] `TransportBar` Storybook story exercising every transport state — playing, paused, end-of-Storyboard `apps/briefing-renderer/src/components/TransportBar.stories.tsx`
- [x] T068 [P] `TimeSlider` (seeks within the current Scene; bounds set by `setScrubbableRange` for time-range Scenes, fixed at `timestamp` for instant Scenes) `apps/briefing-renderer/src/components/TimeSlider.tsx`
- [x] T069 [P] `ModeToggle` (Minimal ↔ Present, keyboard shortcut `P`, hover-corner reveal in Present mode) `apps/briefing-renderer/src/components/ModeToggle.tsx`
- [x] T070 [P] `ModeToggle` Storybook story `apps/briefing-renderer/src/components/ModeToggle.stories.tsx`

### Vitest coverage for the chrome layer

- [x] T071 [P][test] `TransportBar` vitest — click play/pause/prev/next dispatches the right store actions; replay button only shown at end-of-Storyboard; prev disabled at first Scene; scene counter updates `apps/briefing-renderer/src/components/__tests__/TransportBar.test.tsx`
- [ ] T072 [P][test] `ModeToggle` vitest — setMode/toggleMode dispatches; `P` keyboard listener works; Present-mode hover-reveal is debounced to 3 s `apps/briefing-renderer/src/components/ModeToggle.test.tsx`
- [ ] T073 [P][test] `TimeSlider` vitest — slider bounds change when `setScrubbableRange` is invoked; slider rests at `timestamp` for instant Scenes `apps/briefing-renderer/src/components/TimeSlider.test.tsx`

### Storybook E2E (shared/components runner)

- [ ] T074 [P][test] `TransportBar` Storybook E2E in three theme variants (light, dark, vscode); capture screenshots for evidence `shared/components/e2e/BriefingTransportBar.spec.ts`
- [ ] T075 [P][test] `ModeToggle` Storybook E2E in three theme variants; capture screenshots; capture an interaction recording (hover + keyboard) for the evidence GIF `shared/components/e2e/BriefingModeToggle.spec.ts`

### Playwright E2E for US3

- [x] T076 [test] 10 consecutive Present ↔ Minimal toggles during active playback — `currentSceneIndex`, `currentTime`, `playState` identical before and after each toggle (SC-005); `P` shortcut and hover-corner control both reachable in Present mode `apps/briefing-renderer/playwright/tests/briefing-zip-mode-toggle.spec.ts`

**Parallel execution example for Phase 5**: T064–T070 are seven independent component files — all draftable in parallel. T071–T075 are five independent test files, also parallel. T076 is the integration gate that depends on all of them.

---

## Phase 6: User Story 4 — Multi-Storyboard plot: export the chosen Storyboard (P2)

**Story goal**: A plot containing multiple Storyboards produces a per-Storyboard zip — invoking the command from Storyboard A's overflow menu produces a zip with only A's Scenes; invoking from B's menu produces a zip with only B's Scenes. Shared underlying features (e.g. a track referenced by both A and B) are included in whichever zip pulls them via its Scenes' `visible_feature_ids`.

**Independent test criteria**: An integration test loads a fixture plot containing two Storyboards (A and B) where Scene-set(A) ∩ Scene-set(B) = ∅, exports each in turn, and asserts the resulting two zips contain disjoint `StoryboardFeature` + `SceneFeature` sets. A second integration test exercises the shared-feature case: a fixture where A and B both reference the same track; verify the track ends up in *both* zips (Acceptance Scenario 2 of US4).

The core scoping logic lives in `scopeStoryboard` (T020) which is already exercised by US1's unit tests for the data-model rules. Phase 6 is the explicit multi-Storyboard verification at integration level.

### Multi-Storyboard verification

- [x] T077 [test] Multi-Storyboard fixture plot — two Storyboards A and B with disjoint Scene sets; export each; assert disjoint `StoryboardFeature` + `SceneFeature` sets in the resulting zips (US4 Acceptance Scenarios 1 + 3) `apps/vscode/src/services/briefingZipExport/multi-storyboard.integration.test.ts`
- [x] T078 [test] Shared-feature fixture plot — Storyboards A and B both reference the same track via `visible_feature_ids`; export A; verify the track is included; export B; verify the track is also included (US4 Acceptance Scenario 2) `apps/vscode/src/services/briefingZipExport/shared-feature.integration.test.ts`

**Phase 6 is small by design**: the scoping logic is established in Phase 3; this phase is the explicit multi-Storyboard test surface. Both tasks are independent test files and can run in parallel ([P] omitted only because they share fixture-construction patterns — write them sequentially for shared-fixture reuse).

---

## Phase 7: Polish & Cross-Cutting Concerns

End-to-end verification, in-zip recipient docs, ADR for the standalone-SPA decision, evidence capture, media post, PR creation. Run only after every preceding phase passes its independent-test criteria.

### End-to-end verification (T-PLAYWRIGHT-E2E)

- [ ] T079 [test] Full pipeline test exercising: invoke export command → resulting zip on disk → unzip → open `index.html` from `file://` → verify Scene 0 renders → play → verify zero external requests → verify final Scene reached → replay → verify final state. The SPA + export converge here `apps/briefing-renderer/playwright/tests/briefing-zip-end-to-end.spec.ts`

### In-zip recipient docs + ADR (T-DOCS)

- [x] T080 [P] In-zip `README.txt` template — recipient-facing usage instructions; MUST name the supported browser matrix (current Chrome and Edge) per `/speckit.review` decision 3C; bundled into the zip by `zipAssembler` (T024) `apps/briefing-renderer/public/README.txt`
- [x] T081 [P] ADR for "briefing renderer ships as a standalone `file://`-loadable SPA, not as a printable PDF or screen recording" — captures the trade-off and the decision rationale `docs/project_notes/decisions.md`

### Evidence collection

- [x] T082 Capture test results using the test-summary template — YAML front matter (`feature: 264-briefing-zip-renderer`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`); body lists every Playwright spec + vitest module count + key scenarios verified `specs/264-briefing-zip-renderer/evidence/test-summary.md`
- [x] T083 Create usage demonstration covering both flows — analyst side (invoke command, pick destination) and recipient side (unzip, open in Chrome or Edge, play); include the failure-mode banner screenshot showing the supported-browser message for the Firefox/Safari case `specs/264-briefing-zip-renderer/evidence/usage-example.md`
- [x] T084 [P] Export a sample briefing zip from the fixture plot for inclusion as evidence; this zip is the deliverable referenced by the PR description and the recipient-side walkthrough `specs/264-briefing-zip-renderer/evidence/sample-briefing.zip`
- [x] T085 [P] Capture SPA screenshots — Minimal mode (light/dark/vscode), Present mode, Empty state, Error state, "Playback halted" state, DevTools Network panel showing 0 external requests — via the Playwright suite from Phase 4/5 `specs/264-briefing-zip-renderer/evidence/screenshots/`
- [ ] T086 [P] Capture an interaction GIF (< 5 s, < 2 MB) of the mode toggle + playback flow — via Playwright `recordVideo` config, post-process with ffmpeg to GIF `specs/264-briefing-zip-renderer/evidence/screenshots/interaction.gif`
- [x] T087 [P] Summarise every Playwright suite (file-protocol, network-isolation, playback, mode-toggle, failure-modes, end-to-end) with pass counts + assertion highlights `specs/264-briefing-zip-renderer/evidence/webview-e2e-summary.md`

### Media content

- [x] T088 Create feature blog post — first three sections (What We're Building, How It Fits, Key Decisions) copied verbatim from `specs/264-briefing-zip-renderer/evidence/opening-context.md` (cached during `/speckit.plan`); remaining sections (Screenshots, By the Numbers, Lessons Learned, What's Next) written from evidence. Spawn the Content Specialist agent via the Task tool with the `media/content.md` definition + evidence context `specs/264-briefing-zip-renderer/media/shipped-post.md`

### PR creation

- [ ] T089 Create PR and publish blog: run `/speckit.pr`

**Task T089 must run last. All evidence, media, and verification tasks must be complete before this runs. The PR description should link every artifact in `evidence/` and reference the published blog post URL once `/speckit.pr` returns it.**

---

## Dependencies

### Story completion order

```
Phase 1 (Setup) ──▶ Phase 2 (Foundation) ──┬──▶ Phase 3 (US1 — Export)        ─┐
                                            ├──▶ Phase 4 (US2 — SPA load+play) ─┤
                                            ├──▶ Phase 5 (US3 — Mode toggle)   ─┼──▶ Phase 7 (Polish + PR)
                                            └──▶ Phase 6 (US4 — Multi-SB) ─────┘
```

- **Phase 1 → Phase 2**: setup must complete (workspace scaffolded, `jszip` installed) before the hoist and the `MapView` extension can land — they touch `shared/components/` which Phase 1 has set up to import.
- **Phase 2 → Phases 3–6**: T-HOIST + T-MAPVIEW-EXT are net-zero behaviour changes that every story consumes. Don't start a story until the Phase 2 verification gate passes (`pnpm -r typecheck && pnpm -r lint && pnpm --filter '!@debrief/web-shell' test`).
- **Phases 3–6 are mutually independent**: each story has its own independent-test criteria and can ship on its own evidence trail.
  - US1 produces a zip; SPA can be a placeholder.
  - US2 reads a zip (or uses the `inlineData` test-injection prop); export can be a placeholder.
  - US3 layers chrome on top of US2.
  - US4 verifies scoping at integration level — the scoping logic itself ships with US1.
- **Phases 3–6 → Phase 7**: every story must reach its independent-test criteria before Phase 7's evidence collection and PR creation begin.

### Critical-path tasks

These tasks gate downstream work and should not be started in parallel with their dependents:

| Task | Blocks | Why |
|------|--------|-----|
| T001 (scaffold `package.json`) | Every other Phase 1 task | All sibling config files reference it |
| T010 + T013 (hoist + import update) | Every US2/US3 task that uses `StoryboardPlaybackService` | The service must live in `@debrief/components` before the SPA can import it |
| T016 (MapView prop extension) | T058 (briefing SPA mounts `<MapView>`) | The SPA needs the new props to wire its `file://`-friendly tile layer |
| T032 (export command orchestrator) | T035 (export integration test) | The orchestrator must exist to be integration-tested |
| T036 (RESOURCE-SYNC) | T060–T063, T079 (Playwright specs that load the real `index.html`) | The bundled SPA must be copied into the extension before the export command can include it |
| T042 (inlineDataLoader with schema validation) | T060–T063 (every Playwright SPA spec) | Boundary validation must be in place before any Playwright test can rely on consistent error/empty/success states |
| T052 + T053 (failure-mode catches) | T063 (failure-mode Playwright spec) | The catch surfaces must exist for the test to assert on them |
| T079 (end-to-end test) | T082, T083 (evidence test-summary + usage-example) | Test totals and usage demo both reference E2E results |
| T088 (shipped-post.md) | T089 (run `/speckit.pr`) | The PR creation step publishes the blog post |

### Independence — parallel opportunities

Within each phase the [P]-flagged tasks list the touching-different-files set that can be drafted concurrently. The largest parallel windows:

- Phase 3 helpers + tests: T020–T031 are 12 files across pure helpers and their unit tests — all 12 can be drafted in parallel after the directory structure exists.
- Phase 4 adapters + tests: T044–T051 are 8 files (4 adapters + 4 tests) — all 8 parallel after the SPA shell (T037–T040) is in place.
- Phase 5 chrome components + tests: T064–T075 are 12 files — all parallel after T063 is in place.
- Phase 7 evidence: T084–T087 are independent capture tasks — all parallel after the relevant Playwright suite passes.

---

## Implementation Strategy

### Incremental delivery — three ship-ready milestones

The feature is structured so each milestone leaves the codebase in a verifiable, mergeable state. None of the three milestones is hidden behind a feature flag — each one stands on its own evidence trail.

**Milestone A — Plumbing in place (Phase 1 + Phase 2)**

After Phase 2, the codebase has the new workspace, the new dep, and two net-zero refactors landed. Existing tests still pass; nothing new ships behaviour. This is the safest possible point to stop and re-baseline if needed. CI is green; the VS Code extension still works; the SPA workspace exists but boots to an empty placeholder.

**Milestone B — MVP briefing (Phases 3 + 4 + 5)**

After Phase 5, the three P1 stories are complete: the export command writes a zip, the SPA loads from `file://` in Chrome or Edge, plays back instant + time-range Scenes, surfaces the supported-browser banner for non-Chromium browsers, halts visibly on adapter throws, and toggles between Present and Minimal preserving state. This is the smallest shippable feature. Phase 6 (US4) and Phase 7 (Polish) are quality + evidence work on top.

**Milestone C — Shippable artefact (Phase 6 + Phase 7)**

After Phase 7, the feature has its full evidence trail, the in-zip recipient README, the standalone-SPA ADR, the shipped blog post, and an open PR with everything linked. This is the merge-ready state.

### Risk-ordered task sequencing

The riskiest unknowns surface earliest:

1. **The hoist (T010–T015)** — net-zero refactor of a service the VS Code extension already depends on. Risk: import breakage / circular dependency. Mitigation: verification gate at end of Phase 2.
2. **`file://`-origin loading (T060)** — the entire feature premise depends on the SPA booting from `file://`. Risk: a browser security policy we missed. Mitigation: the foundational `file://`-protocol Playwright spec runs as soon as the inline-data loader (T042) and SPA shell (T037–T040) are in place — this is the earliest verification of the assumption.
3. **Zero-network-request invariant (T061)** — FR-015 + SC-002. Risk: an inadvertent `fetch` somewhere in `@debrief/components` or `react-leaflet`. Mitigation: the network-isolation Playwright spec gates Phase 4 completion.
4. **Time-range Scene playback (T062)** — the SPA must drive the slider and viewport in lock-step. Risk: per-frame port adapter mistakes desync the two axes. Mitigation: the playback Playwright spec asserts the slider position at each frame against the captured trajectory.
5. **Failure-mode visibility (T063)** — Article I.3 surface added during `/speckit.review`. Risk: an exception path we didn't account for. Mitigation: the failure-mode Playwright spec injects throws at every port boundary and asserts the visible halted state.

### Branch / PR strategy

All work lands on the existing feature branch `claude/start-spec-264-57xbA` (PR #639). The branch already has the spec + plan + contracts. Implementation commits land sequentially; the final commit triggers `/speckit.pr` which converts the existing draft PR (if any) into a ready-for-review PR with the full evidence trail in the description.

### Where to look during implementation

- **Plan**: `specs/264-briefing-zip-renderer/plan.md` — architectural decisions, dependency list, constitution-check status
- **Data model**: `specs/264-briefing-zip-renderer/data-model.md` — on-disk artefact contracts (especially § 1 zip layout, § 4 inline blocks, § 6 MapView wiring, § 8 boundary validation gates)
- **Export contract**: `specs/264-briefing-zip-renderer/contracts/export-command.md` — the 11-step command behaviour + error matrix
- **SPA contract**: `specs/264-briefing-zip-renderer/contracts/spa-loading.md` — boot sequence, network table, mode chrome, browser probes
- **Tile-coverage contract**: `specs/264-briefing-zip-renderer/contracts/tile-coverage.md` — the pure-function algorithm + the new sample-formula
- **Research**: `specs/264-briefing-zip-renderer/research.md` — R1 (file:// loading), R6 (browser matrix)
- **Quickstart**: `specs/264-briefing-zip-renderer/quickstart.md` — developer flow + reviewer smoke-test checklist
- **Playwright wrapper**: `apps/briefing-renderer/run-playwright.mjs` (to be created in T006) — same pattern as `apps/web-shell/run-playwright.mjs`
- **CLAUDE.md**: project root — Playwright-in-cloud guidance, "Before pushing" CI gate

### Out of this task list (deferred)

- **PMTiles / vector-tile basemap** — captured as BL-C in `BACKLOG.md` #272 (follow-up to #264 R2). Trigger: any briefing exceeds ~50 MB, or analyst feedback that raster zip size impedes transport.
- **Firefox / Safari / mobile browser support** — narrowed during `/speckit.review` (decision 3C). The boot-time probe banner directs those users to a supported browser.
- **Multi-Storyboard zip (one zip carrying N Storyboards)** — explicitly out of scope; one Storyboard per zip remains the contract.
