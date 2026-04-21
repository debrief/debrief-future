# Tasks: Storyboarding — Panel + Playback

**Feature Branch**: `217-storyboarding-playback`
**Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Research**: [research.md](research.md)

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip or omit Playwright E2E tasks because you think browsers can't be installed. The project uses `@sparticuz/chromium` which bundles a Linux Chromium binary via npm. Standard browser CDN downloads are blocked (403), but this bundled binary works fully. Run `node apps/web-shell/run-playwright.mjs` to extract and configure. Full details: `docs/project_notes/playwright-installation-research.md`

## Evidence Requirements

**Evidence Directory**: `specs/217-storyboarding-playback/evidence/`
**Media Directory**: `specs/217-storyboarding-playback/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `test-summary.md` | Aggregated vitest + Playwright results (YAML front matter: feature, captured_at, git_sha, tests_passed, tests_failed, tests_skipped, coverage_pct) | After all tests pass |
| `usage-example.md` | Walk-through of opening a plot, stepping through a Storyboard, hitting a hard-block, switching Storyboards | After US1 + US2 complete |
| `screenshots/storyboard-panel-transport-light.png` | TransportRow story in light theme (Storybook capture) | After T330 Storybook E2E |
| `screenshots/storyboard-panel-transport-dark.png` | TransportRow story in dark theme | After T330 Storybook E2E |
| `screenshots/storyboard-panel-transport-vscode.png` | TransportRow story in vscode theme | After T330 Storybook E2E |
| `screenshots/storyboard-panel-multi-light.png` | WithMultipleStoryboards story in light theme | After T330 Storybook E2E |
| `screenshots/storyboard-panel-multi-dark.png` | WithMultipleStoryboards story in dark theme | After T330 Storybook E2E |
| `screenshots/storyboard-panel-multi-vscode.png` | WithMultipleStoryboards story in vscode theme | After T330 Storybook E2E |
| `screenshots/storyboard-panel-hardblock-light.png` | HardBlockModal story in light theme | After T330 Storybook E2E |
| `screenshots/storyboard-panel-hardblock-dark.png` | HardBlockModal story in dark theme | After T330 Storybook E2E |
| `screenshots/storyboard-panel-hardblock-vscode.png` | HardBlockModal story in vscode theme | After T330 Storybook E2E |
| `screenshots/interaction.gif` | 3-5 s GIF of forward-through-storyboard in code-server: Forward click → map flyTo → time slider advance → rectangle highlight update | Captured during webview E2E run, converted from Playwright video |
| `screenshots/e2e-hardblock.png` | Code-server screenshot of the native VS Code modal surfaced by a missing-feature hard-block | After T340 webview E2E |
| `screenshots/e2e-dropdown-switch.png` | Code-server screenshot of dropdown switch with Scene rectangles updating | After T340 webview E2E |
| `feature-integration.md` | Integration diagram + brief — shows how `StoryboardPlaybackService` composes with `#215 CRUD`, `MapPanel`, `TimeRangeViewProvider`, `SessionManager` | After US1 + US2 complete |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `media/planning-post.md` | Blog post announcing the feature | ✅ Already created during `/speckit.plan` |
| `media/linkedin-planning.md` | LinkedIn summary for planning | ✅ Already created during `/speckit.plan` |
| `media/shipped-post.md` | Blog post celebrating completion (What We Built, Screenshots, Lessons Learned, What's Next) | During Polish phase |
| `media/linkedin-shipped.md` | LinkedIn shipped summary (150–200 words, hook + link to full post) | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in `debrief/debrief-future` with evidence attached | Final task in Polish phase |
| Blog PR | PR in `debrief/debrief.github.io` with shipped post | Triggered by `/speckit.pr` |

---

## Phase 1: Setup

**Goal**: Scaffolding that unblocks implementation — evidence directories, media directory, and a preflight check that #216 is merged to main.

- [x] T001 Create evidence directory tree `specs/217-storyboarding-playback/evidence/screenshots/.gitkeep`
- [x] T002 [P] Preflight: verify `@debrief/components/storyboard` exports `isSceneFeature`, `isStoryboardFeature`, `listScenesOrdered`, `getScene`, `getStoryboard`, `detectMissingDataForScene`, `validatePlot`, `createStoryboard`, `renameStoryboard`, `deleteStoryboard`, `formatDtg` (fails fast if #215 is not on the branch — read-only check) `shared/components/src/storyboard/index.ts`
- [x] T003 [P] Preflight: verify `StoryboardPanel` (#216) is present with its current 6-prop shape (`scenes`, `activeStoryboardName`, `captureInFlight`, `onCaptureClick`, `onSceneRowClick` — see `shared/components/src/panels/StoryboardPanel/types.ts`) so design-fix 3 (optional+defaulted new props) can proceed without breaking #216 tests `shared/components/src/panels/StoryboardPanel/types.ts`
- [x] T004 [P] Preflight: `TimeScrubber` exposes a single `timeExtent: TimeExtent` prop (not separate `dataStart`/`dataEnd` + `start`/`end` pairs). However, the extension ↔ webview message `updateTimeExtent` already carries both pairs (`apps/vscode/src/views/timeRangeView.ts:125-131`). The R2 extension-side override (T151) therefore works as designed — narrowing `start`/`end` in the outbound message shrinks the scrubber's clickable track, enforcing FR-PLAY-012. Minor UX compromise: scrubber visually shrinks to the Scene window rather than showing the full data range with a narrowed handle. Recorded for T552. `shared/components/src/TimeController/TimeScrubber.tsx`

**Parallel opportunity**: T002 / T003 / T004 are pure read checks on independent files — run them in parallel with T001.

## Phase 2: Foundation

**Goal**: Ship the shared primitives that both user stories consume — the new #215 query, the `MapPanel` / `TimeRangeView` extensions, the `MapView` additions, the shared helper, the view-model type extensions, the webview message types, and the VS Code command contribution skeleton. No user-visible behaviour yet; every extension point is verified by a unit test before US1 lands its integration.

**Independent test criteria for this phase**: every unit test added below passes in isolation; `pnpm -r typecheck` passes; no user flow exists yet (merely the primitives).

### 2.1 #215 query addition (Fix B / R7)

- [ ] T101 [test] Add unit tests for new `getMostRecentlyModifiedStoryboard` query — empty plot → null, single Storyboard, multiple Storyboards with distinct `provenance[last].timestamp`, tie-break on equal timestamps → ULID ascending `shared/components/src/storyboard/__tests__/queries.test.ts`
- [ ] T102 Implement `getMostRecentlyModifiedStoryboard(plot: Plot): StoryboardFeature | null` — scans `provenance[last].timestamp` per Storyboard; ties broken by `storyboard.properties.id` ascending `shared/components/src/storyboard/queries.ts`
- [ ] T103 [P] Re-export `getMostRecentlyModifiedStoryboard` from the package entrypoint `shared/components/src/storyboard/index.ts`

### 2.2 Shared extension helper (design-fix 4)

- [ ] T110 [P][test] Add unit tests for `plotFromFeatures(features: DebriefFeature[]): StoryboardPlot` — wraps a feature array as a throwaway `FeatureCollection`; identity on empty; preserves references (no deep copy) `apps/vscode/src/services/__tests__/plotFromFeatures.test.ts`
- [ ] T111 Implement `plotFromFeatures` helper — returns `{ type: 'FeatureCollection', features }`; the single source of truth for the boundary between `DebriefFeature[]` and #215's `Plot` type `apps/vscode/src/services/plotFromFeatures.ts`

### 2.3 View-model type extensions (design-fix 3)

- [ ] T120 Extend `StoryboardPanelProps` with **optional+defaulted** fields: `storyboards?: readonly StoryboardOptionViewModel[]`, `activeStoryboardId?: string | null`, `currentSceneId?: string | null`, `transport?: TransportViewModel`, `onActiveStoryboardChange?`, `onCreateStoryboard?`, `onRenameStoryboard?`, `onDeleteStoryboard?`, `onTransportForward?`, `onTransportBackward?`. `SceneRowViewModel` stays at `ok` / `pending` only (no `blocked` variant — design-fix 1). `shared/components/src/panels/StoryboardPanel/types.ts`
- [ ] T121 [P] Define new view-model types `StoryboardOptionViewModel` (storyboardId, name, sceneCount, lastModifiedIso), `TransportViewModel` (canGoBackward, canGoForward, sceneNumber, sceneTotal, transitionInFlight), `MissingDataReason` (discriminated union) in `shared/components/src/panels/StoryboardPanel/types.ts`
- [ ] T122 [P] Confirm existing `StoryboardPanel.test.tsx` still compiles (design-fix 3 check — every optional+defaulted field must be usable without explicit value) `shared/components/src/panels/StoryboardPanel/__tests__/StoryboardPanel.test.tsx`

### 2.4 MapPanel API extensions (arch-fix 2 + contracts/map-view-flyto.md)

- [ ] T130 [test] Unit tests for MapPanel additions — `flyToViewport` returns fresh monotonic token, posts `flyTo` webview message with correct args; `flyToViewport(..., 0)` posts `animate: false` equivalent; `setSceneRectangles(null, ...)` posts a clear message; `onFlyToComplete` fires with correct token; `onSceneRectangleClick` fires with sceneId; `onFeaturesChanged` fires on every `setFeatures` call `apps/vscode/src/webview/__tests__/mapPanel.test.ts`
- [ ] T131 Implement `MapPanel.flyToViewport(viewport, durationMs): number` — allocates fresh token, posts `flyTo` webview message with `{ token, center, zoom, durationMs }` `apps/vscode/src/webview/mapPanel.ts`
- [ ] T132 Implement `MapPanel.setSceneRectangles(scenes, activeStoryboardId, currentSceneId)` — posts `setSceneRectangles` webview message; serialises Scene features to `{ sceneId, viewport, timestamp }` view-model (no geometry duplication; webview uses `scene.geometry.coordinates`, see T142) `apps/vscode/src/webview/mapPanel.ts`
- [ ] T133 Implement `MapPanel.onSceneRectangleClick: vscode.Event<string>` — forwards inbound `sceneRectangleClicked` webview message; uses `vscode.EventEmitter<string>` following the existing pattern `apps/vscode/src/webview/mapPanel.ts`
- [ ] T134 Implement `MapPanel.onFlyToComplete: vscode.Event<number>` — forwards inbound `flyToComplete` webview message `apps/vscode/src/webview/mapPanel.ts`
- [ ] T135 Implement `MapPanel.onFeaturesChanged: vscode.Event<DebriefFeature[]>` — fired from `setFeatures` after the internal feature-list mutation and the `loadPlot` repost; mirrors the `logPanelView` `_onFeaturesChanged` pattern (`apps/vscode/src/views/logPanelView.ts:123`) `apps/vscode/src/webview/mapPanel.ts`
- [ ] T136 Extend `MapPanelMessage` + `MapPanelToExtensionMessage` discriminated unions with the new variants (`flyTo`, `setSceneRectangles`, `flyToComplete`, `sceneRectangleClicked`) `apps/vscode/src/webview/messages.ts`

### 2.5 MapView extensions (shared/components)

- [x] T140 [P][test] Add unit tests for `MapView.flyToTarget` — `durationMs > 0` triggers `L.Map.flyTo` with duration + easeLinearity; `durationMs === 0` triggers `L.Map.setView` with `animate: false`; new token during in-flight supersedes previous; `onFlyToComplete` callback invoked on `moveend` with correct token `shared/components/src/MapView/__tests__/flyTo.test.tsx`
- [x] T141 Extend `MapView` with `flyToTarget?: FlyToTarget | null` prop + `onFlyToComplete?(token: number)` callback; integrate into existing `MapController` child (the effect fires on `flyToTarget.token` change); passes `{ duration: durationMs / 1000, easeLinearity: 0.25 }` to Leaflet `shared/components/src/MapView/MapView.tsx`
- [x] T142 [P][test] Add unit tests for `SceneRectangleLayer` — renders nothing when `activeStoryboardId === null` or `scenes.length === 0`; renders one `<Polygon>` per Scene; positions derived from `scene.geometry.coordinates` (Fix D — NOT `viewport.corners`); opacity variation on overlapping rectangles; current Scene has bolder stroke; click fires `onSceneRectangleClick(sceneId)`; topmost wins on overlap click; antimeridian viewport renders as single best-effort polygon `shared/components/src/MapView/__tests__/SceneRectangleLayer.test.tsx`
- [x] T143 Implement `SceneRectangleLayer.tsx` — react-leaflet `<Polygon>` per Scene from `scene.geometry.coordinates`; `geoJsonPolygonToLeafletCoords` helper (lon,lat → lat,lon); opacity computed via overlap-rank helper; `L.DomEvent.stopPropagation` on click `shared/components/src/MapView/SceneRectangleLayer.tsx`
- [x] T144 Extend `MapView` to accept `sceneRectangles?: SceneRectangleLayerProps` and render `<SceneRectangleLayer {...sceneRectangles} />` inside the `<MapContainer>`; add base-layer GeoJSON `filter` that excludes `STORYBOARD` and `STORYBOARD_SCENE` features so rectangles only come from the scoped layer `shared/components/src/MapView/MapView.tsx`
- [x] T145 [P] Add theme tokens — `sceneRectangleStroke`, `sceneRectangleFill` — for light / dark / vscode themes `shared/components/src/ThemeProvider/tokens.ts`

### 2.6 TimeRangeView scrubbable-range override (arch-fix 1 / R2)

- [ ] T150 [test] Unit tests for `TimeRangeViewProvider.setScrubbableRange(start, end)` — posting `updateTimeExtent` overrides `start`/`end` but leaves `dataStart`/`dataEnd` at `state.timeRange`; `setScrubbableRange(null, null)` restores; override survives session-state `timeRange` updates (new extent still applies override); cleared on plot switch `apps/vscode/src/views/__tests__/timeRangeView.test.ts`
- [ ] T151 Implement `TimeRangeViewProvider.setScrubbableRange(start: number | null, end: number | null): void` — stores `scrubbableOverride: { start, end }` field; repost `updateTimeExtent` with `start`/`end` replaced while `dataStart`/`dataEnd` stay from `state.timeRange`; called by `StoryboardPlaybackService` on each transport step / dropdown switch / deactivation `apps/vscode/src/views/timeRangeView.ts`

### 2.7 Webview message types (panel-side)

- [ ] T160 Extend `StoryboardPanelMessage` (webview → extension) discriminated union with `active-storyboard-changed`, `transport-forward-clicked`, `transport-backward-clicked`, `create-storyboard-requested`, `rename-storyboard-requested`, `delete-storyboard-requested` `apps/vscode/src/types/storyboardPanelMessages.ts`
- [ ] T161 Extend `ExtensionToStoryboardPanelMessage` (extension → webview) with `snapshot` variant (full `StoryboardPlaybackSnapshot` projection); keep `scenes` + `captureInFlight` + `theme` for #216 backward compatibility `apps/vscode/src/types/storyboardPanelMessages.ts`

### 2.8 VS Code command + keybinding contributions (skeleton)

- [ ] T170 Add command contributions to `contributes.commands[]`: `debrief.storyboard.forward`, `.backward`, `.clickScene`, `.jumpPast`, `.editScene`, `.create`, `.rename`, `.delete`, `.openPanel` (latter reveals existing panel) `apps/vscode/package.json`
- [ ] T171 Add `menus.commandPalette` filter — hide `.clickScene`, `.jumpPast`, `.editScene` via `when: "false"`; gate `.forward`, `.backward` by `debrief.storyboardActive` `apps/vscode/package.json`
- [ ] T172 Add scoped keybinding contributions — `Left` / `Right` for `.backward` / `.forward` with `when: "debrief.storyboardActive && (debrief.mapFocused || focusedView == 'debrief.storyboardPanel')"` `apps/vscode/package.json`

### Parallel execution examples (Phase 2)

```
# Batch 2a — T101/T110/T120/T130/T140/T142/T150/T160 can all run in parallel (different files, no cross-deps)
[P] T101 queries.test.ts
[P] T110 plotFromFeatures.test.ts
[P] T120 types.ts (presentational)
[P] T130 mapPanel.test.ts
[P] T140 flyTo.test.tsx
[P] T142 SceneRectangleLayer.test.tsx
[P] T150 timeRangeView.test.ts
[P] T160 storyboardPanelMessages.ts

# Batch 2b — implementations (some serial within a file, but batches can run in parallel with other files)
T102 → T103          (queries.ts then re-export)
T111                 (plotFromFeatures.ts)
T131 → T132 → T133 → T134 → T135 → T136   (mapPanel.ts + messages.ts serial — all touch files)
T141                 (MapView.tsx)
T143 → T144          (SceneRectangleLayer.tsx then MapView integration)
T145                 (theme tokens)
T151                 (timeRangeView.ts)
T170 → T171 → T172   (package.json — same file, serial)
```

## Phase 3: US1 — Step through a storyboard to deliver a briefing (P1)

**Story goal**: An analyst with Scenes already captured (via #216) opens the Storyboard panel, picks a Storyboard from the header, and steps Forward and Backward through its Scenes using on-screen transport or scoped arrow keys. The map animates between Scenes; the time slider tweens; scrub is constrained to the current Scene segment. Scene viewport rectangles render on the map for the active Storyboard only. A Scene with unresolved feature IDs or out-of-range timestamp hard-blocks with a native modal offering *Jump past this scene* / *Open for editing*.

**Independent test**: Load a plot with a fixture Storyboard of at least three Scenes (no #216 capture run needed). Confirm (a) Forward button and scoped `Right`-arrow advance to the next Scene, (b) map performs animated `flyTo` + time slider tweens over `transition_duration_ms`, (c) scrub clamped to `[scene[N].t, scene[N+1].t]`, (d) Scene rectangles render only for active Storyboard, (e) stepping onto a deliberately-broken Scene hard-blocks with the modal, (f) *Jump past this scene* advances past the blocked Scene without animating into it.

### 3.1 Presentational components — TransportRow + HardBlockModal (tests first)

- [ ] T301 [P][test] Unit tests for `TransportRow` — renders Forward / Backward buttons and "Scene N of M" counter; buttons disabled at boundaries (N=1 Backward, N=M Forward); transitionInFlight disables both; aria-labels present; click fires corresponding callbacks `shared/components/src/panels/StoryboardPanel/__tests__/TransportRow.test.tsx`
- [ ] T302 [P][test] Unit tests for `HardBlockModal` (Storybook-only presentational) — renders body describing the scene + reason kind; two action buttons with labels; focus trap on dialog; `Escape` fires `onDismiss`; `role="dialog"` + `aria-modal="true"` present `shared/components/src/panels/StoryboardPanel/__tests__/HardBlockModal.test.tsx`
- [ ] T303 Implement `TransportRow.tsx` — consumes `TransportViewModel` + two click callbacks; renders Forward / Backward `<button>`s with vscrui icons; disabled state from `canGoForward` / `canGoBackward` / `transitionInFlight`; counter renders "Scene N of M" or empty when `sceneTotal === 0` `shared/components/src/panels/StoryboardPanel/TransportRow.tsx`
- [ ] T304 Implement `HardBlockModal.tsx` (presentational, Storybook-only) — consumes `sceneTitle`, `reason`, `jumpPastLabel`, `openForEditingLabel`; `<div role="dialog" aria-modal="true">`; body renders the missing-features list or "out-of-range" copy; two action `<button>`s wired to callbacks; `useEffect` for `Escape` key handler `shared/components/src/panels/StoryboardPanel/HardBlockModal.tsx`

### 3.2 Integrate TransportRow into StoryboardPanel

- [ ] T310 [test] Extend existing `StoryboardPanel.test.tsx` — TransportRow renders when `transport` prop provided; TransportRow hidden when `transport` undefined (design-fix 3); current-scene highlight applied to matching row via `currentSceneId` prop; `[data-active="true"]` attribute present on current row `shared/components/src/panels/StoryboardPanel/__tests__/StoryboardPanel.test.tsx`
- [ ] T311 Update `StoryboardPanel.tsx` to render `<TransportRow>` below the Scene list when `transport` prop is provided; apply `data-active="true"` to the Scene row matching `currentSceneId` (used by E2E + CSS highlight); retain #216 empty-state paths unchanged `shared/components/src/panels/StoryboardPanel/StoryboardPanel.tsx`
- [ ] T312 [P] Add `Transport` and `HardBlockModal` stories to Storybook — Transport story shows 3-Scene panel with transport enabled; HardBlockModal story shows missing-features variant with labels populated `shared/components/src/panels/StoryboardPanel/StoryboardPanel.stories.tsx`

### 3.3 StoryboardPlaybackService — transport state machine (tests first)

- [ ] T320 [test] Unit tests for `StoryboardPlaybackService` — state machine core (`apps/vscode/src/services/__tests__/storyboardPlayback.test.ts`):
  - `onPlotOpened` runs `validatePlot`; on throw, `plotValid = false`, single `showErrorMessage`, all subsequent forward/backward/goToScene are no-ops (design-fix 2)
  - `onPlotOpened` seeds `activeStoryboardId` from `getMostRecentlyModifiedStoryboard(plot)` (R7)
  - `onPlotOpened` calls `timeRangeView.setScrubbableRange(start, end)` for the Scene window
  - `onPlotClosed` calls `timeRangeView.setScrubbableRange(null, null)`
  - `forward` advances when `transitionId === null` AND not at last AND hard-block check passes
  - `forward` is no-op during in-flight transition (FR-PLAY-009)
  - `forward` is no-op at last scene (FR-PLAY-010)
  - `backward` mirrors forward at first scene
  - `goToScene(sceneId)` treats as transport — runs hard-block check; no-op during flight
  - `setActiveStoryboard` recomputes `sceneOrder`, `currentSceneIndex = 0`, calls `setScrubbableRange` for new window (FR-PLAY-003)
  - Scrub during in-flight cancels `transitionId`
  - `onDidChangeVisibility(false)` cancels `transitionId` (R8)
  - `durationMs + 250ms` safety timer fires when `moveend` never arrives (R8)
  - Plot-switch cancels old plot's `transitionId` (R8)
  - CRUD ops (Create / Rename / Delete) are rejected during in-flight transition (R9)
  - `detectMissingDataForScene` boundary receives ISO strings converted from `TemporalSlice.timeRange` epoch ms (arch-fix 4); `NaN` inputs handled gracefully
  - `resolveHardBlockByJumpingPast` advances past blocked Scene in requested direction
  - `resolveHardBlockByOpeningForEditing` surfaces `showInformationMessage` with read-only Scene details; transport unchanged
  - `onPlotFeaturesChanged` recomputes `sceneOrder`; if active Storyboard was deleted, falls back via `getMostRecentlyModifiedStoryboard`; if none remain, `activeStoryboardId = null`, clear context
  - `dispose` calls `setScrubbableRange(null, null)` for every plot with an active override (test-fix 4)

- [ ] T321 Implement `StoryboardPlaybackService` class skeleton — constructor accepts `{ sessionManager, mapPanel, panelView, timeRangeView, storyboardModule, modalPromptPort, visibilityPort, transitionController }`; per-plot `Map<documentUri, TransportState>`; `onSnapshotChange` event emitter; `getSnapshot(documentUri)` projection `apps/vscode/src/services/storyboardPlayback.ts`
- [ ] T322 Implement lifecycle methods — `onPlotOpened` (validatePlot gate + seed active + setScrubbableRange + set `debrief.storyboardActive` context); `onPlotClosed` (restore scrubbable range + clear context + remove entry); `onPlotFeaturesChanged` (recompute sceneOrder + fallback via getMostRecentlyModifiedStoryboard) `apps/vscode/src/services/storyboardPlayback.ts`
- [ ] T323 Implement transport methods — `forward`, `backward`, `goToScene`; each runs in-flight guard → boundary guard → hard-block check (ISO conversion) → `executeTransition` `apps/vscode/src/services/storyboardPlayback.ts`
- [ ] T324 Implement `executeTransition(documentUri, targetIndex, direction)` — sets `transitionId`; calls `mapPanel.flyToViewport(viewport, durationMs)`; starts RAF tween writing `session.setCurrentTime(lerp)` over `durationMs`; calls `timeRangeView.setScrubbableRange(sceneN.t, sceneN+1.t)`; wires three clear triggers (`onFlyToComplete`, `onDidChangeVisibility`, `durationMs+250ms` timer); idempotent — first trigger wins `apps/vscode/src/services/storyboardPlayback.ts`
- [ ] T325 Implement hard-block flow — `promptHardBlock(scene, classification, direction, documentUri)` calls `modalPromptPort.showInformationMessage({ modal: true }, jumpPastLabel, openForEditingLabel)`; route to `resolveHardBlockByJumpingPast` / `resolveHardBlockByOpeningForEditing` (showInformationMessage inline — no separate command registration) `apps/vscode/src/services/storyboardPlayback.ts`

### 3.4 Command handlers + package.json (US1 subset)

- [ ] T330 [test] Unit tests for US1 command handlers — forward/backward/clickScene/jumpPast dispatch to service with `documentUri = sessionManager.getActiveDocumentUri()`; return early when `documentUri === null` `apps/vscode/src/commands/__tests__/storyboardCommands.test.ts`
- [ ] T331 Implement `registerStoryboardTransportCommands(context, service, sessionManager)` — registers `debrief.storyboard.forward`, `.backward`, `.clickScene`, `.jumpPast` `apps/vscode/src/commands/storyboardTransport.ts`
- [ ] T332 [P] Note: `debrief.storyboard.editScene` is NOT registered as a command for this slice — the "Open for editing" modal action calls `showInformationMessage` inline from the service. This task is a documentation marker only (no code change) — confirm `resolveHardBlockByOpeningForEditing` surfaces a read-only `showInformationMessage` with Scene title + DTG `apps/vscode/src/services/storyboardPlayback.ts`

### 3.5 Extension host wiring (US1)

- [ ] T340 Wire `StoryboardPlaybackService` in `extension.ts` — instantiate after `SessionManager` + `MapPanel` + `StoryboardPanelViewProvider` + `TimeRangeViewProvider`; subscribe to `sessionManager.onActiveSessionChange` → `service.onPlotOpened / onPlotClosed`; subscribe to `mapPanel.onFeaturesChanged` → `service.onPlotFeaturesChanged`; subscribe to `mapPanel.onSceneRectangleClick` → `service.goToScene`; subscribe to `mapPanel.onFlyToComplete` → service's transition-clear path; register US1 transport commands; maintain `debrief.storyboardActive` context `apps/vscode/src/extension.ts`
- [ ] T341 Extend `StoryboardPanelViewProvider` to accept a `StoryboardPlaybackSnapshot` via a new `applySnapshot(snap)` method that posts a `snapshot` webview message; subscribe to `service.onSnapshotChange`; rewrite the stale `"#217 will replace with flyTo behaviour"` comment (design-fix 4) — the handler now delegates `scene-row-clicked` to `debrief.storyboard.clickScene`; use the new `plotFromFeatures` helper for any plot-reconstruction paths `apps/vscode/src/views/storyboardPanelView.ts`
- [ ] T342 Update `storyboardPanelView.ts` message handler to forward new inbound messages (`transport-forward-clicked`, `transport-backward-clicked`) via `vscode.commands.executeCommand('debrief.storyboard.forward' / '.backward')` — ensures button clicks and scoped arrow keys share the same code path `apps/vscode/src/views/storyboardPanelView.ts`
- [ ] T343 Update `storyboardPanel.tsx` webview entry — subscribe to the new `snapshot` inbound message and pass `storyboards`, `activeStoryboardId`, `currentSceneId`, `transport` to `StoryboardPanel`; wire `onTransportForward` / `onTransportBackward` / `onSceneRowClick` to `postMessage` variants `apps/vscode/src/webview/web/storyboardPanel.tsx`
- [ ] T344 [P] Update `mapView.tsx` webview — subscribe to inbound `flyTo` + `setSceneRectangles` messages; pass `flyToTarget` + `sceneRectangles` props to `<MapView>`; post outbound `flyToComplete` (on `onFlyToComplete`) + `sceneRectangleClicked` (on `onSceneRectangleClick`) `apps/vscode/src/webview/web/mapView.tsx`

### 3.6 E2E coverage (US1)

- [ ] T350 [test] Playwright E2E — forward through a populated Storyboard (SC-002 + FR-PLAY-005 / -007): open plot fixture with ≥ 3 Scenes → open Storyboard panel → press Forward × (N-1) → verify `flyTo` call count + time slider advances + current-Scene highlight (`[data-testid="scene-row"][data-active="true"]`) + transport counter advances `tests/e2e/test-storyboard-playback.spec.ts`
- [ ] T351 [test] Playwright E2E — scoped `Right` arrow (SC-007 + FR-PLAY-006): focus Map Panel (storyboard active), press `Right` → verify Forward fires; focus Log Panel, press `Right` → verify no transport change `tests/e2e/test-storyboard-playback.spec.ts`
- [ ] T352 [test] Playwright E2E — scrub-window lock (SC-004 + FR-PLAY-012/-013): position on Scene N, drag scrubber thumb past `scene[N+1].timestamp` → verify clamp at boundary; position on last Scene, verify scrub past its timestamp is disabled `tests/e2e/test-storyboard-playback.spec.ts`
- [ ] T353 [test] Playwright E2E — click Scene rectangle on map (FR-PLAY-017): click a non-current rectangle → verify panel selection jumps + map animates to that Scene's viewport `tests/e2e/test-storyboard-playback.spec.ts`
- [ ] T354 [test] Playwright E2E — hard-block on missing-feature (FR-PLAY-019/-020/-021): step onto a Scene whose `visible_feature_ids` has been deleted → verify native modal surfaces → click *Jump past this scene* → verify transport advanced past blocked Scene without animating into it `tests/e2e/test-storyboard-playback.spec.ts`

**Checkpoint**: US1 complete. An analyst can walk forward and backward through a single Storyboard end-to-end inside the Map Viewer. Scene rectangles render on the map for the active Storyboard. Hard-block surfaces on missing data with Jump past / Open for editing. This is the epic's stated core value — shippable independently of US2.

### Parallel execution examples (Phase 3)

```
# Batch 3a — tests can run in parallel
[P] T301 TransportRow.test.tsx
[P] T302 HardBlockModal.test.tsx
[P] T310 StoryboardPanel.test.tsx extensions
[P] T320 storyboardPlayback.test.ts
[P] T330 storyboardCommands.test.ts
[P] T350–T354 E2E — independent test files, same suite

# Batch 3b — presentational implementations (different files)
[P] T303 TransportRow.tsx
[P] T304 HardBlockModal.tsx
(T311 StoryboardPanel.tsx — depends on T303)
[P] T312 Stories file

# Batch 3c — service implementation (same file — serial)
T321 → T322 → T323 → T324 → T325

# Batch 3d — extension wiring (mostly same file — serial within file)
T340 (extension.ts) → T341 → T342 (storyboardPanelView.ts serial)
[P] T343 storyboardPanel.tsx
[P] T344 mapView.tsx
```

## Phase 4: US2 — Maintain multiple storyboards per plot (P2)

**Story goal**: A plot can carry several narratives — "commander's view", "ASW evidence", "training debrief". The analyst switches between them from the panel header dropdown; the Scene list, transport, and on-map rectangles all follow. The analyst can create a new Storyboard from the overflow menu, rename the active one, or delete a Storyboard (with cascade-delete confirmation). On plot re-open, the active selection defaults to the most-recently-modified Storyboard.

**Independent test**: With two Storyboards on a plot, switch between them via the header dropdown and confirm (a) Scene list updates to the selected Storyboard, (b) Scene viewport rectangles update to only those of the active Storyboard, (c) selection is not persisted across plot close/open — the most-recently-modified Storyboard is chosen on re-open. Create a new Storyboard from the overflow menu — confirm it appears in the dropdown and becomes the active selection. Delete a Storyboard with Scenes — confirm confirmation modal names Scene count; on confirm, Storyboard + Scenes removed via #215's cascade; dropdown refreshes; active selection falls back.

### 4.1 Presentational component — StoryboardHeader (tests first)

- [ ] T401 [P][test] Unit tests for `StoryboardHeader` — renders dropdown with all `storyboards` option; marks `activeStoryboardId` as selected; overflow menu opens on icon click; menu items present: Create, Rename, Delete; Rename / Delete hidden when no `activeStoryboardId`; `aria-expanded` / `role="menu"` accessibility attributes; empty `storyboards` hides dropdown (design-fix 3) `shared/components/src/panels/StoryboardPanel/__tests__/StoryboardHeader.test.tsx`
- [ ] T402 Implement `StoryboardHeader.tsx` — `<select>` dropdown populated from `storyboards[]` + overflow `<button>` that toggles a menu with Create / Rename / Delete items; vscrui icons; each menu item fires a prop callback or hides if callback is undefined `shared/components/src/panels/StoryboardPanel/StoryboardHeader.tsx`

### 4.2 Integrate StoryboardHeader into StoryboardPanel

- [ ] T410 [test] Extend `StoryboardPanel.test.tsx` — StoryboardHeader renders when `storyboards` prop provided and non-empty; hidden when `storyboards` undefined or empty (design-fix 3 — #216 tests still pass unchanged); dropdown change fires `onActiveStoryboardChange` with target `storyboardId` `shared/components/src/panels/StoryboardPanel/__tests__/StoryboardPanel.test.tsx`
- [ ] T411 Update `StoryboardPanel.tsx` to render `<StoryboardHeader>` above the Scene list when `storyboards` prop non-empty; pass through dropdown + overflow callbacks; keep the #216 static header fallback when `storyboards` empty `shared/components/src/panels/StoryboardPanel/StoryboardPanel.tsx`
- [ ] T412 [P] Add `WithMultipleStoryboards` story — 3 Storyboards, 5 Scenes on active, dropdown populated; play function opens overflow menu `shared/components/src/panels/StoryboardPanel/StoryboardPanel.stories.tsx`

### 4.3 StoryboardPlaybackService — management methods (tests extend T320 suite)

- [ ] T420 [test] Extend `storyboardPlayback.test.ts` with management tests — `setActiveStoryboard` switches within same microtask (SC-003); `createStoryboard` delegates to #215 CRUD, new Storyboard becomes active; `renameStoryboard` delegates; `deleteStoryboard` delegates (cascading delete handled by #215); external deletion via `onPlotFeaturesChanged` falls back to `getMostRecentlyModifiedStoryboard`; all three CRUD ops reject during in-flight transition (R9 / test-fix 1) `apps/vscode/src/services/__tests__/storyboardPlayback.test.ts`
- [ ] T421 Implement `setActiveStoryboard(documentUri, storyboardId | null)` — synchronous; updates per-plot map, recomputes `sceneOrder`, `currentSceneIndex = 0`, calls `setScrubbableRange` for new window, emits snapshot `apps/vscode/src/services/storyboardPlayback.ts`
- [ ] T422 Implement `createStoryboard(documentUri, name, description?)` — in-flight guard (reject with no side effect); calls `createStoryboard` from `@debrief/components/storyboard`; pushes new feature set back via `MapPanel.setFeatures`; sets new Storyboard as active; catches `DuplicateStoryboardName` → `showErrorMessage` `apps/vscode/src/services/storyboardPlayback.ts`
- [ ] T423 Implement `renameStoryboard(documentUri, storyboardId, newName)` — in-flight guard; calls `renameStoryboard` from `@debrief/components/storyboard`; pushes new features via `MapPanel.setFeatures`; catches `DuplicateStoryboardName` / `UnknownStoryboard` → `showErrorMessage` `apps/vscode/src/services/storyboardPlayback.ts`
- [ ] T424 Implement `deleteStoryboard(documentUri, storyboardId)` — in-flight guard; calls `deleteStoryboard` from `@debrief/components/storyboard` (cascade); pushes new features via `MapPanel.setFeatures`; if deleted Storyboard was active, re-seed via `getMostRecentlyModifiedStoryboard`; if no Storyboards remain, clear `debrief.storyboardActive` context + scrubbable override `apps/vscode/src/services/storyboardPlayback.ts`

### 4.4 Command handlers + package.json (US2 subset)

- [ ] T430 [test] Extend `storyboardCommands.test.ts` — Create command: `showInputBox` with `validateStoryboardName`; CRUD only invoked with non-empty trimmed name; Rename: pre-populates current name, validates uniqueness excluding self, no-op on unchanged name; Delete: non-empty Storyboard prompts `showWarningMessage` modal with Scene count; empty Storyboard skips confirmation; *Delete* confirmation fires CRUD; any other choice leaves state unchanged `apps/vscode/src/commands/__tests__/storyboardCommands.test.ts`
- [ ] T431 Implement `registerStoryboardManagementCommands` — registers `debrief.storyboard.create`, `.rename`, `.delete` with input-box + confirmation modals per contract §4.2 `apps/vscode/src/commands/storyboardManagement.ts`
- [ ] T432 [P] Implement `validateStoryboardName(candidate, existing, ignoreId?)` helper — trim + non-empty + ≤ 120 chars + no collision against `existing` (excluding `ignoreId`); returns the error string for `showInputBox.validateInput` or `null` for OK `apps/vscode/src/commands/storyboardManagement.ts`

### 4.5 Extension host wiring (US2)

- [ ] T440 Register management commands in `extension.ts` — call `registerStoryboardManagementCommands(context, service, sessionManager)` after `registerStoryboardTransportCommands` `apps/vscode/src/extension.ts`
- [ ] T441 Update `storyboardPanelView.ts` message handler — forward `active-storyboard-changed` → `service.setActiveStoryboard(documentUri, storyboardId)` synchronously; forward `create-storyboard-requested` → `vscode.commands.executeCommand('debrief.storyboard.create')`; same pattern for rename / delete `apps/vscode/src/views/storyboardPanelView.ts`
- [ ] T442 Update `storyboardPanel.tsx` webview entry — wire `onActiveStoryboardChange`, `onCreateStoryboard`, `onRenameStoryboard`, `onDeleteStoryboard` to their `postMessage` variants `apps/vscode/src/webview/web/storyboardPanel.tsx`

### 4.6 E2E coverage (US2)

- [ ] T450 [test] Playwright E2E — dropdown switch refreshes Scene list + rectangles (SC-003 + SC-006 + FR-PLAY-003): open plot with 2 Storyboards → switch dropdown → verify previous Storyboard's rectangles gone, new Storyboard's rectangles render; Scene list updated; all within the same user interaction (no visible stale state after dropdown closes) `tests/e2e/test-storyboard-playback.spec.ts`
- [ ] T451 [test] Playwright E2E — Create → new Storyboard becomes active (FR-PLAY-001 Create): open overflow menu → Create → enter name → confirm → verify dropdown includes new Storyboard and selection is the new one; panel shows empty Scene list `tests/e2e/test-storyboard-playback.spec.ts`
- [ ] T452 [test] Playwright E2E — Rename via overflow menu: open overflow → Rename → enter new name → verify dropdown updates with new name `tests/e2e/test-storyboard-playback.spec.ts`
- [ ] T453 [test] Playwright E2E — Delete non-empty Storyboard prompts confirmation with Scene count (FR-PLAY-004): open overflow → Delete → verify `showWarningMessage` modal body names Scene count → confirm → verify Storyboard gone from dropdown, Scenes removed, active selection falls back to most-recently-modified remaining `tests/e2e/test-storyboard-playback.spec.ts`
- [ ] T454 [test] Playwright E2E — External deletion refreshes silently: simulate external delete via test hook (directly calls `service.deleteStoryboard`) → verify dropdown refreshes, active selection falls back silently, no error toast `tests/e2e/test-storyboard-playback.spec.ts`

**Checkpoint**: US2 complete. An analyst can manage multiple Storyboards per plot. Combined with US1, this closes all functional requirements in the spec.

### Parallel execution examples (Phase 4)

```
# Batch 4a — tests first
[P] T401 StoryboardHeader.test.tsx
[P] T410 StoryboardPanel.test.tsx extensions
[P] T420 storyboardPlayback.test.ts extensions
[P] T430 storyboardCommands.test.ts extensions
[P] T450–T454 E2E — can be written in parallel

# Batch 4b — presentational
[P] T402 StoryboardHeader.tsx
(T411 depends on T402)
[P] T412 Stories

# Batch 4c — service (same file — serial)
T421 → T422 → T423 → T424

# Batch 4d — commands (same file — serial)
T431 → T432 (storyboardManagement.ts)

# Batch 4e — wiring (different files)
T440 (extension.ts)
[P] T441 storyboardPanelView.ts
[P] T442 storyboardPanel.tsx
```

## Phase 5: Polish & Cross-Cutting Concerns

**Goal**: Collect evidence, close out the schema-adherence / offline / strict-type gates, produce the shipped-post media, and open the PR. No new feature work.

### 5.1 Pre-PR CI gates

- [ ] T501 Run `task verify` (or fallback: `uv run ruff check . && pnpm lint && uv run pyright && pnpm -r typecheck && uv run pytest && pnpm --filter '!@debrief/web-shell' test`) — every step MUST pass before opening the PR (CLAUDE.md "Before Pushing")
- [ ] T502 Run web-shell Playwright suite — `cd apps/web-shell && node run-playwright.mjs && cd ../..` (bundled Chromium via `@sparticuz/chromium`)
- [ ] T503 Run VS Code webview E2E — `pnpm --filter @debrief/vscode-extension build && cd tests/e2e && pnpm exec playwright test test-storyboard-playback.spec.ts` — all nine T350–T354 + T450–T454 scenarios pass

### 5.2 Storybook E2E (theme capture)

- [ ] T510 [test] Storybook E2E — verify 3 stories × 3 theme variants × basic render + accessibility assertions `shared/components/e2e/StoryboardPanel.spec.ts` (extend existing file from #216)
- [ ] T511 [P] Run the Storybook build + E2E run (`pnpm --filter @debrief/components storybook:build && node apps/web-shell/run-playwright.mjs`); archive the nine PNGs into the evidence directory `specs/217-storyboarding-playback/evidence/screenshots/`

### 5.3 Interaction GIF capture

- [ ] T520 Record interaction GIF via Playwright — enable `recordVideo` in the webview E2E config for T350 (forward-through-storyboard); convert the WebM to ≤ 2MB / ≤ 5s GIF using `ffmpeg` with `scale=800:-1`; save to `specs/217-storyboarding-playback/evidence/screenshots/interaction.gif`

### 5.4 Evidence collection

- [ ] T530 Capture test results using the template (`.specify/templates/evidence/test-summary-template.md`) with YAML front matter (feature, captured_at, git_sha, tests_passed, tests_failed, tests_skipped, coverage_pct) — include counts for vitest unit tests + Playwright E2E + Storybook E2E `specs/217-storyboarding-playback/evidence/test-summary.md`
- [ ] T531 Create usage demonstration — walk-through of: open plot, open Storyboard panel, Forward through 3 Scenes, scrub within a segment, switch Storyboard via dropdown, hit a hard-block, jump past. Include screenshots at key steps `specs/217-storyboarding-playback/evidence/usage-example.md`
- [ ] T532 [P] Capture E2E screenshot — native VS Code hard-block modal in code-server (output from T354) `specs/217-storyboarding-playback/evidence/screenshots/e2e-hardblock.png`
- [ ] T533 [P] Capture E2E screenshot — dropdown switch with Scene rectangles updating (output from T450) `specs/217-storyboarding-playback/evidence/screenshots/e2e-dropdown-switch.png`
- [ ] T534 [P] Produce integration diagram + brief — Mermaid sequence diagram showing `StoryboardPanel` click → `storyboardPanelView` postMessage → `vscode.commands.executeCommand('debrief.storyboard.forward')` → `StoryboardPlaybackService.forward` → `#215 detectMissingDataForScene` → `MapPanel.flyToViewport` → `TimeRangeViewProvider.setScrubbableRange`; narrative explaining each hop `specs/217-storyboarding-playback/evidence/feature-integration.md`

### 5.5 Media content (shipped post + LinkedIn)

- [ ] T540 Create shipped blog post using the Content Specialist agent (`.claude/agents/media/content.md`) — sections: What We Built (delivery flow landed), Screenshots (embedded from T511 + T520 + T532 + T533), By the Numbers (metrics from T530's YAML front matter), Lessons Learned (R2 discovery about `timeFilter` vs `timeExtent`; the three-trigger transition-clear; the design-fix-1 "don't pre-compute row state" decision), What's Next (#218 edit suite) — front matter per agent spec: `layout: future-post`, `track: [credibility]`, `author: Ian`, `reading_time` calculated, `excerpt` under 150 chars `specs/217-storyboarding-playback/media/shipped-post.md`
- [ ] T541 [P] Create LinkedIn shipped summary (150–200 words) — strong hook (analyst walking into a briefing), one concrete implementation insight (three-trigger transition-clear or the `timeFilter` trap), link placeholder `{{POST_URL}}`, tags `#FutureDebrief #MaritimeAnalysis #OpenSource` `specs/217-storyboarding-playback/media/linkedin-shipped.md`

### 5.6 Documentation hygiene

- [ ] T550 Update `CHANGELOG.md` — add the #217 entry under "Unreleased" describing the Storyboard panel + playback transport landing (brief — links to the PR) `CHANGELOG.md`
- [ ] T551 [P] Log in `docs/project_notes/issues.md` with ticket #217 URL and evidence-dir reference `docs/project_notes/issues.md`
- [ ] T552 [P] Log the R2 research finding (`timeFilter` vs `timeExtent` — the scrubber doesn't consume `timeFilter`) in `docs/project_notes/bugs.md` so a future PR doesn't repeat the mistake `docs/project_notes/bugs.md`

### 5.7 PR creation

- [ ] T560 Create PR and publish blog: run `/speckit.pr`

**Task T560 must run last. It depends on T501–T552 being complete.** It will:
- Open the feature PR in `debrief/debrief-future` with the generated description + evidence links
- Open a companion PR in `debrief/debrief.github.io` publishing the shipped post
- Return both URLs for review

### Parallel execution examples (Phase 5)

```
# Batch 5a — verify gates (strictly serial — each catches the next)
T501 → T502 → T503 → T510

# Batch 5b — parallel evidence
[P] T511 archive Storybook PNGs
[P] T520 GIF capture
[P] T530 test-summary.md
[P] T531 usage-example.md
[P] T532 e2e-hardblock.png
[P] T533 e2e-dropdown-switch.png
[P] T534 feature-integration.md

# Batch 5c — media
T540 → T541 (content specialist delivers post first, then LinkedIn summary)

# Batch 5d — docs hygiene (different files — parallel)
[P] T550 CHANGELOG.md
[P] T551 issues.md
[P] T552 bugs.md

# Final
T560 /speckit.pr
```

## Dependencies

### Story completion order

1. **Phase 1 Setup** (T001–T004) must complete before any other work — evidence scaffolding + #216 / #215 / TimeScrubber preflight checks. Any preflight failure escalates before Foundation starts.
2. **Phase 2 Foundation** (T101–T172) must complete before US1 integration (§3.3 onwards) — US1 relies on:
   - `getMostRecentlyModifiedStoryboard` (T102) for onPlotOpened seeding
   - `plotFromFeatures` helper (T111) for the #215 module boundary
   - `MapPanel.flyToViewport / onFlyToComplete / onFeaturesChanged / onSceneRectangleClick` (T131–T135) for transition + rectangle + external-change plumbing
   - `MapView.flyToTarget` + `SceneRectangleLayer` (T141 / T143 / T144) for the render path
   - `TimeRangeViewProvider.setScrubbableRange` (T151) for scrub-window enforcement (R2)
   - Webview message-type extensions (T160 / T161) for the new `snapshot` + transport / management messages
   - Command + keybinding contributions (T170 / T171 / T172) — without these the commands don't appear in VS Code
3. **Phase 3 US1** (T301–T354) MUST complete as a standalone slice — it passes the P1 independent test without any US2 work. Within Phase 3:
   - Presentational (T301–T312) independent of service work — can land in parallel
   - Service (T320–T325) must land before extension wiring (T340–T344)
   - E2E (T350–T354) can be scripted after commands register but requires the service + wiring to pass
4. **Phase 4 US2** (T401–T454) depends on Phase 3 being **interaction-complete** — specifically on:
   - `StoryboardPanel.tsx` (T311) already rendering new optional props so `StoryboardHeader` can be layered on
   - `StoryboardPlaybackService` transitions working so T424's cascade-delete fallback has meaning
   - `storyboardPanelView.ts` postMessage handler wired (T342) — US2 message variants extend the same dispatch
   - Within Phase 4: service management ops (T421–T424) before command handlers (T431–T432) before extension wiring (T440–T442) before E2E (T450–T454).
5. **Phase 5 Polish** (T501–T560) depends on **both** stories being complete — every test must pass; every artefact must exist; PR is the terminal task.

### Cross-phase dependencies at a glance

```
Setup ──► Foundation ──► US1 ──► US2 ──► Polish ──► PR
 (4)       (~23)        (~17)   (~17)    (~18)     (1)
```

Total: ~80 tasks. See §5.7 for PR-creation gating.

## Implementation Strategy

### Incremental delivery

#217 is explicitly shippable in two tranches that correspond to the two user stories:

1. **Tranche 1 — US1 (P1 "Step through a storyboard")**: Phases 1 + 2 + 3. After this lands, an analyst with a single Storyboard captured via #216 can walk a stakeholder through it end-to-end: on-screen Forward / Backward transport, scoped arrow keys, `flyTo` + time-slider tween, scrub clamp per segment, on-map Scene rectangles, hard-block on missing data with *Jump past* / *Open for editing*. Delivers the epic's stated core value.
2. **Tranche 2 — US2 (P2 "Multiple storyboards")**: Phase 4. After this lands, the analyst can manage multiple Storyboards per plot via the dropdown + overflow (Create / Rename / Delete).

Either tranche can ship as its own PR if the programme manager prefers smaller review units. The default is a single PR covering both + Phase 5.

### MVP boundary

**MVP = Tranche 1**. A plot opened in VS Code with a captured Storyboard (from #216) becomes walkable on the map, with clean interaction semantics and a safety net for missing data. That is the minimum deliverable for the epic's "guided walk-through" goal.

Tranche 2 makes the capability *sustainable* across realistic analyst workflows (multiple narratives per plot), but is not required for the briefing-delivery flow itself.

### Test-first discipline (constitution VII)

Each phase's tests are authored before the corresponding implementation. For Phase 3:

- T301 / T302 before T303 / T304 (presentational tests before components)
- T310 before T311 (integration tests before panel integration)
- T320 before T321–T325 (service tests before service)
- T330 before T331 (command tests before commands)
- T350–T354 are scripted last (they require the end-to-end wiring to be in place)

Phase 4 follows the same pattern: T401 before T402, T410 before T411, T420 before T421–T424, T430 before T431–T432, T450–T454 after all wiring.

### Risk markers + mitigations (from /speckit.review)

| Risk | Mitigation | Task |
|---|---|---|
| `timeFilter` does not constrain the scrubber (R2) | `TimeRangeViewProvider.setScrubbableRange` overrides `start`/`end` at the view-provider layer — never touches session-state `timeFilter` | T151 |
| `getActiveStoryboardDefault` is "first by name ascending", not most-recently-modified (R7) | New `getMostRecentlyModifiedStoryboard` pure query added to #215 | T102 |
| `SessionManager` keys by `documentUri` (STAC URI), not `plotPath` (Fix C) | All service / command signatures use `documentUri` throughout | T321 + all command handlers |
| `SceneFeature.geometry.coordinates` holds the rectangle geometry, NOT `viewport.corners` (Fix D) | `SceneRectangleLayer.tsx` reads `scene.geometry.coordinates` via `geoJsonPolygonToLeafletCoords` | T143 |
| Leaflet `moveend` may not fire when webview is hidden (R8) | Three-trigger clear on `transitionId`: `onFlyToComplete` + `onDidChangeVisibility(false)` + `durationMs+250ms` safety timer | T324 |
| CRUD-during-flight could emit stale snapshot (R9) | Create / Rename / Delete reject during in-flight transition; panel overflow buttons disabled via `transport.transitionInFlight` | T422 / T423 / T424 |
| Corrupt plot (orphan Scene etc.) could crash mid-transport (design-fix 2) | `validatePlot` gate in `onPlotOpened`; on throw, disable transport + single error toast; `plotValid === false` makes all subsequent ops no-ops | T322 |
| ISO vs epoch mismatch at `detectMissingDataForScene` (arch-fix 4) | Service converts `TemporalSlice.timeRange` epoch ms → ISO-8601 at the #215 boundary; handles `NaN` gracefully | T323 (inside hard-block flow) |
| Existing #216 tests break when new optional props are added (design-fix 3) | All new `StoryboardPanelProps` fields are optional with sensible defaults; T122 confirms the existing suite still compiles | T120 + T122 |

### What's out of scope (recap from spec)

Deferred to #218: Scene editing (rename, description, delete+undo, update-to-current, duplicate, copy-to-other-storyboard); stale-thumbnail detection + refresh; Analysis Log (#176) integration. This slice does not create / update / delete Scenes — that is #216 (capture) and #218 (edit). It does create / delete Storyboards (FR-PLAY-001 / FR-PLAY-004).
