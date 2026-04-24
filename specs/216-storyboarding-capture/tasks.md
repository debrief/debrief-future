# Tasks: Storyboarding — Capture

**Input**: Design documents from `specs/216-storyboarding-capture/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (all present)
**Feature branch**: `216-storyboarding-capture`

**Tests**: Spec.md explicitly calls out unit + E2E coverage (Constitution Article VI). Every acceptance scenario and edge case maps to a named test in the capture-command / thumbnail-service / panel-component matrices. Test tasks are first-class deliverables, not optional.

**Organisation**: One P1 user story (US1 — "Capture a scene from the current map state"). Foundation phase lands the three shared prerequisites (MapPanel API surface, actor derivation, per-Scene thumbnail service) and the presentational Storyboard panel in `@debrief/components`. US1 then wires the command handler + WebviewViewProvider on top. Polish captures evidence, runs E2E, and ships the PR.

---

## Evidence Requirements

**Evidence Directory**: `specs/216-storyboarding-capture/evidence/`
**Media Directory**: `specs/216-storyboarding-capture/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|---|---|---|
| `test-summary.md` | YAML-front-matter test summary (unit + Storybook + webview E2E counts + coverage %) | After T401 suite passes |
| `usage-example.md` | Reproducible walk-through of first-capture + subsequent-capture + duplicate-resolution | After US1 complete |
| `screenshots/panel-empty.png` | Storybook `Empty` story — light theme | After T2C7 |
| `screenshots/panel-three-scenes-light.png` | Storybook `WithThreeScenes` — light theme | After T2C7 |
| `screenshots/panel-three-scenes-dark.png` | Storybook `WithThreeScenes` — dark theme | After T2C7 |
| `screenshots/panel-three-scenes-vscode.png` | Storybook `WithThreeScenes` — vscode theme | After T2C7 |
| `screenshots/capture-in-flight.png` | Storybook `Capturing` story | After T2C7 |
| `screenshots/interaction.gif` | Primary user flow — press shortcut, see Scene row appear (captured via Playwright video → gif, ≤ 5 s, ≤ 2 MB) | After T407 |
| `screenshots/duplicate-modal.png` | VS Code modal prompt (Replace / Offset / Cancel) captured during webview E2E | After T407 |
| `sample-output/item.json` | Snapshot of a plot's `item.json` after three captures — demonstrates the per-Scene asset entries | After T407 |
| `sample-output/scene.feature.json` | One captured Scene Feature pretty-printed — shows `viewport`, `timestamp`, `visible_feature_ids`, `feature_set_hash`, `thumbnail_asset_ref`, `provenance` | After T407 |

### Media Content

| Artifact | Description | Created When |
|---|---|---|
| `media/planning-post.md` | Blog post announcing the slice | /speckit.plan (already created) |
| `media/linkedin-planning.md` | LinkedIn summary for planning | /speckit.plan (already created) |
| `media/shipped-post.md` | Blog post celebrating completion | Polish phase |
| `media/linkedin-shipped.md` | LinkedIn summary for shipped | Polish phase |

### PR Creation

| Action | Description | Created When |
|---|---|---|
| Feature PR | PR in `debrief-future` with evidence + screenshots | Final task in Polish |
| Blog PR | PR in `debrief.github.io` with shipped-post.md | Triggered by `/speckit.pr` |

---

## Phase 1: Setup

**Goal**: Scaffold the package.json contributions, create the new directory structure under `apps/vscode/src/` and `shared/components/src/panels/`, and add the `ulid` import path to the extension workspace (already a dep of `@debrief/components` via #215 — no install required).

- [ ] T001 Add the `debrief.captureScene` command contribution to `apps/vscode/package.json` under `contributes.commands` with `title: "Capture Scene to Storyboard"`, `category: "Debrief"`, `icon: "$(device-camera)"` `apps/vscode/package.json`
- [ ] T002 Add the `Ctrl+Alt+C` / `Cmd+Alt+C` keybinding contribution with `when: "debrief.mapFocused && debrief.plotOpen"` to `apps/vscode/package.json` under `contributes.keybindings` `apps/vscode/package.json`
- [ ] T003 Add the `debrief.storyboardPanel` view contribution under `contributes.views.debrief` with `type: "webview"`, `when: "debrief.plotOpen"`, `icon: "$(device-camera-video)"` `apps/vscode/package.json`
- [ ] T004 Add the view-toolbar menu contribution (`view/title` → capture command) scoped to `view == debrief.storyboardPanel && debrief.mapFocused && debrief.plotOpen` `apps/vscode/package.json`
- [ ] T005 [P] Create the extension source directories `apps/vscode/src/commands/__tests__/`, `apps/vscode/src/services/__tests__/`, `apps/vscode/src/views/`, and `apps/vscode/src/webview/web/` (empty `.gitkeep` if any is missing) `apps/vscode/src/`
- [ ] T006 [P] Create the shared component directory `shared/components/src/panels/StoryboardPanel/__tests__/` (empty `.gitkeep` if missing) `shared/components/src/panels/StoryboardPanel/`
- [ ] T007 [P] Create the evidence + media directories `specs/216-storyboarding-capture/evidence/screenshots/` and `specs/216-storyboarding-capture/evidence/sample-output/` (empty `.gitkeep` files) `specs/216-storyboarding-capture/evidence/`

**Parallel opportunity**: T005, T006, T007 are independent directory scaffolds and run together.

---

## Phase 2: Foundation (blocks US1)

**Goal**: Ship the three pieces US1 assembles on top of — (2A) the MapPanel feature-setter + getter so capture can swap the CRUD-returned FeatureCollection features back into the webview; (2B) the per-Scene thumbnail service + actor derivation; (2C) the presentational `StoryboardPanel` React component in `@debrief/components` with all theme variants and its Storybook stories. Nothing here opens the user-visible capture loop — that's US1 — but every piece must land first.

### Phase 2A — MapPanel feature-setter API

- [ ] T201 [test] Add failing vitest unit test `setFeatures replaces currentFeatures and posts a loadPlot-style update to the webview` + `getCurrentFeatures returns the live array` `apps/vscode/src/webview/__tests__/mapPanel-setFeatures.test.ts`
- [ ] T202 Add the public method `setFeatures(features: DebriefFeature[]): void` to `MapPanel` — replaces the private `currentFeatures`, re-posts the `loadPlot`-equivalent payload to the webview so `<mapView>` rerenders, preserves `currentPlot` (STAC metadata) unchanged `apps/vscode/src/webview/mapPanel.ts`
- [ ] T203 Add the public getter `getCurrentFeatures(): DebriefFeature[]` returning a shallow copy of the private `currentFeatures` field (defensive against accidental caller mutation) `apps/vscode/src/webview/mapPanel.ts`
- [ ] T204 Confirm the unit tests from T201 pass `apps/vscode/src/webview/__tests__/mapPanel-setFeatures.test.ts`

### Phase 2B — Scene thumbnail service + actor

- [ ] T205 [P][test] Write failing unit tests for `sceneThumbnailService` covering all 13 rows in `contracts/scene-thumbnail-service.md §7`: happy path, `scene-thumbnails/` lazy dir creation, preserves existing plot-level thumbnail assets, preserves other-Scene assets, returns correct `assetKey`, `empty-png` validation, `invalid-scene-id` ULID rejection, `stac-item-not-found`, `item-json-malformed`, atomicity under induced fs failure, idempotency on repeat write, `deleteSceneThumbnail` happy path, `deleteSceneThumbnail` `unknown-scene` rejection `apps/vscode/src/services/__tests__/sceneThumbnailService.test.ts`
- [ ] T206 [P] Implement `SceneThumbnailError` class with the 8-code discriminated error taxonomy from `contracts/scene-thumbnail-service.md §6` `apps/vscode/src/services/sceneThumbnailError.ts`
- [ ] T207 Implement `writeSceneThumbnail(stacItemPath, sceneId, largePngBase64, smallPngBase64): Promise<WriteSceneThumbnailResult>` with the rename-on-tmp + item.json-last atomicity order from `contracts/scene-thumbnail-service.md §3` `apps/vscode/src/services/sceneThumbnailService.ts`
- [ ] T208 Implement `deleteSceneThumbnail(stacItemPath, sceneId): Promise<void>` (affordance for #218; throws `unknown-scene` if asset entries absent) `apps/vscode/src/services/sceneThumbnailService.ts`
- [ ] T209 Confirm all 13 thumbnail-service unit tests pass `apps/vscode/src/services/__tests__/sceneThumbnailService.test.ts`
- [ ] T210 [P] Add `actor` field to `SessionManager` — resolved once at extension activation via `os.userInfo().username` with `"vscode-user"` fallback on throw (research R6a); cached as a string property on the manager `apps/vscode/src/services/sessionManager.ts`
- [ ] T211 [P][test] Unit test — `actor` falls back to `"vscode-user"` when `os.userInfo` throws `apps/vscode/src/services/__tests__/sessionManager-actor.test.ts`

### Phase 2C — `StoryboardPanel` React component (presentational, headless of VS Code)

- [ ] T2C1 [P] Create the `SceneRowViewModel` + `StoryboardPanelProps` types per `contracts/storyboard-panel-view.md §6` + `data-model.md §4` `shared/components/src/panels/StoryboardPanel/types.ts`
- [ ] T2C2 [P][test] Write failing vitest tests for the 8-case unit matrix in `contracts/storyboard-panel-view.md §7`: empty-state copy, empty-Storyboard copy, renders one row per scene, renders in timestamp order, renders pending row when captureInFlight, capture button invokes `onCaptureClick`, scene row invokes `onSceneRowClick` with sceneId, each row renders thumbnail + DTG + timestamp, a11y attributes present `shared/components/src/panels/StoryboardPanel/__tests__/StoryboardPanel.test.tsx`
- [ ] T2C3 Implement `<SceneRow/>` — a single scene row (thumbnail `<img loading="lazy" width/height>` + DTG label + secondary timestamp line + `role="listitem" aria-label data-testid="scene-row"`) `shared/components/src/panels/StoryboardPanel/SceneRow.tsx`
- [ ] T2C4 Implement `<SceneList/>` — iterates scenes; prepends a pending row when `captureInFlight === true` `shared/components/src/panels/StoryboardPanel/SceneList.tsx`
- [ ] T2C5 Implement `<StoryboardPanel/>` — header (Storyboard name + Scene count), `<SceneList/>`, capture button with `data-testid="capture-button"`; empty-state copy when `activeStoryboardName === null`; no VS Code imports; themeable via existing `ThemeProvider` tokens `shared/components/src/panels/StoryboardPanel/StoryboardPanel.tsx`
- [ ] T2C6 Re-export `StoryboardPanel` + `StoryboardPanelProps` + `SceneRowViewModel` from `@debrief/components` `shared/components/src/index.ts` and `shared/components/src/panels/StoryboardPanel/index.ts`
- [ ] T2C7 [P] Write Storybook stories covering `Empty`, `EmptyStoryboard`, `WithOneScene`, `WithThreeScenes`, `Capturing` per `plan.md §Media Components` `shared/components/src/panels/StoryboardPanel/StoryboardPanel.stories.tsx`
- [ ] T2C8 Confirm all 8 component unit tests pass `shared/components/src/panels/StoryboardPanel/__tests__/StoryboardPanel.test.tsx`

**Parallel opportunity**:
- Phase 2A, 2B, 2C are independent (different files, different test suites) — all three sub-phases can run in parallel.
- Within 2A: T201 before T202/T203 (TDD); T204 last.
- Within 2B: T205 + T206 + T210 + T211 in parallel; T207 + T208 after T206; T209 last.
- Within 2C: T2C1 + T2C2 in parallel, then T2C3 → T2C4 → T2C5 → T2C6; T2C7 parallel with T2C5; T2C8 last.

---

## Phase 3: US1 — Capture a scene from the current map state (P1)

**User story goal**: An analyst reviewing a plot in the Map Viewer presses `Ctrl/Cmd+Alt+C`. Current viewport + time-slider instant + visible-feature set are frozen as a new schema-validated Scene inside a Storyboard attached to the plot. First capture on a plot prompts for a Storyboard name; subsequent captures append to the active Storyboard. A thumbnail is written synchronously as a STAC asset. The minimal Storyboard panel auto-opens to confirm persistence.

**Independent test criterion**: With a plot open in the Map Viewer, pressing `Ctrl/Cmd+Alt+C` on a plot that has no Storyboards (a) prompts for a Storyboard name, (b) on confirmation persists one Storyboard plus one Scene via #215's CRUD, (c) marks the plot dirty, (d) surfaces the new Scene in the Storyboard panel, (e) save-close-reopen restores the Scene byte-identical (schema round-trip via #215). All five acceptance scenarios from spec.md and the seven edge cases exercise this single story.

### Tests (TDD — land failing tests before implementation)

- [ ] T301 [P][test] Write failing unit tests for `captureScene.ts` covering the 19-row matrix in `contracts/capture-command.md §6` (plus the review-added atomicity test): happy path first-capture, happy path subsequent, dismissed name prompt, out-of-range timestamp, viewport-null, thumbnail-failure, duplicate modal shows, duplicate-Replace branch, duplicate-Offset branch, duplicate-Offset 5× safety cap, duplicate-Cancel branch, duplicate Storyboard name `validateInput`, in-flight silent ignore, `markDirty` exactly once on happy path, `markDirty` never on failure, panel.focus fires on success, panel `captureInFlight:false` posted on success, scene title defaults to DTG, `createScene` failure after PNG write leaves dirty flag untouched (Finding #3) `apps/vscode/src/commands/__tests__/captureScene.test.ts`
- [ ] T302 [P][test] Write failing vitest unit tests for `StoryboardPanelViewProvider` covering: resolves webview on first visibility, posts initial `scenes` message on `ready`, recomputes scene list on plot-change, sorts by timestamp ascending, forwards `capture-clicked` to `vscode.commands.executeCommand('debrief.captureScene')`, ignores `scene-row-clicked` (no-op in #216), resolves `thumbnailHref` via `asWebviewUri`, posts `captureInFlight` messages from `setCaptureInFlight()` `apps/vscode/src/views/__tests__/storyboardPanelView.test.ts`

### Command handler implementation

- [ ] T303 Implement `CaptureCommandContext` + `CaptureResult` + `CancelReason` + `RejectReason` types per `data-model.md §3` (6-variant collapsed union, review Finding #2) `apps/vscode/src/commands/captureScene.ts`
- [ ] T304 Implement the module-scoped `captureInFlight` guard (research R6b) — boolean reset in `finally`; status-bar hint (not toast) on concurrent press `apps/vscode/src/commands/captureScene.ts`
- [ ] T305 Implement the snapshot-read block (step 3 of `contracts/capture-command.md §3`) — `sessionStore.getState()` → viewport/currentTime/hiddenIds; `mapPanel.getCurrentFeatures()` → feature list; throw `InvariantViolation` if when-clause invariants fail (unreachable but asserted) `apps/vscode/src/commands/captureScene.ts`
- [ ] T306 Implement the validate block (step 4) — viewport-unavailable / currenttime-unavailable / currenttime-out-of-range (SC-004: thumbnail MUST NOT be invoked on this branch) `apps/vscode/src/commands/captureScene.ts`
- [ ] T307 Implement the derive-Scene-inputs block (step 5) — `timestampIso`, `center = calculateViewportCenter(viewport)`, `zoom = viewport.zoom` (authoritative slot, no helper), `visibleIds` from `features.filter(...).map(f => f.properties.id)`, wrap into throwaway `FeatureCollection` for #215's CRUD boundary `apps/vscode/src/commands/captureScene.ts`
- [ ] T308 Implement the resolve-active-Storyboard block (step 6) — call `getActiveStoryboardDefault(fc)`; on null, run `promptForStoryboardName(fc)` with `showInputBox` + `validateInput` (research R4 — inline collision feedback, `ignoreFocusOut: true`); on dismiss return `cancelled: "name-prompt"`; on confirm call `createStoryboard(fc, {name, actor})` then `mapPanel.setFeatures(fc1.features)` `apps/vscode/src/commands/captureScene.ts`
- [ ] T309 Implement the thumbnail-capture block (step 7) — `mapPanel.requestThumbnailCapture(5000)`; on null result return `rejected: "thumbnail-failed"` `apps/vscode/src/commands/captureScene.ts`
- [ ] T310 Implement the per-Scene PNG-write block (step 8) — pre-generate `sceneId = ulid()`, call `sceneThumbnailService.writeSceneThumbnail(stacItemPath, sceneId, large, small)`; on throw propagate as `rejected: "thumbnail-failed"` `apps/vscode/src/commands/captureScene.ts`
- [ ] T311 Implement the `createScene` + Feature-swap + dirty block (step 9) — rewrap `mapPanel.getCurrentFeatures()` into a fresh `FeatureCollection`, call `createScene(fcLatest, {..., idOverride: sceneId})`, on success `mapPanel.setFeatures(fcNext.features)` + `sessionStore.getState().markDirty()` + `commands.executeCommand("debrief.storyboardPanel.focus")`; catch `DuplicateTimestampError` and delegate to T312; catch other errors and surface as `rejected: "unexpected"` with stack routed to the Debrief output channel `apps/vscode/src/commands/captureScene.ts`
- [ ] T312 Implement `handleDuplicateTimestamp(err, inputs, retries = 0)` — 5-retry cap with dedicated `duplicate-offset-limit-exceeded` toast; `showInformationMessage(msg, {modal: true}, "Replace", "Offset (+1 s)")`; Replace = `deleteScene` + retry `createScene`; Offset = recurse with `timestamp + 1000ms` and `retries+1`; `undefined` choice = `cancelled: "duplicate-prompt"` `apps/vscode/src/commands/captureScene.ts`
- [ ] T313 Implement the error-to-UI mapping from `contracts/capture-command.md §5` — one toast per reject code with user-visible copy as specified; silent returns for user-dismiss cancels; status-bar hint for in-flight cancel `apps/vscode/src/commands/captureScene.ts`
- [ ] T314 Confirm all 19 command-handler unit tests pass `apps/vscode/src/commands/__tests__/captureScene.test.ts`

### Storyboard panel view provider + webview entry

- [ ] T315 Implement `StoryboardPanelViewProvider` class per `contracts/storyboard-panel-view.md §2` — `resolveWebviewView`, CSP + nonce HTML shell (mirror `logPanelView.ts`), bidirectional message routing, `refresh()` + `setCaptureInFlight()` methods, SessionManager subscription for plot-change events `apps/vscode/src/views/storyboardPanelView.ts`
- [ ] T316 Implement the webview React entry `storyboardPanel.tsx` — mounts `<StoryboardPanel/>` from `@debrief/components`, wires `window.postMessage` listener, `acquireVsCodeApi()` to send, `ThemeProvider` driven by the `theme` message `apps/vscode/src/webview/web/storyboardPanel.tsx`
- [ ] T317 [P] Create the typed message unions `StoryboardPanelMessage` (webview → extension) + `ExtensionMessage` (extension → webview) per `data-model.md §5` — strict-mode discriminated unions, zero `any` `apps/vscode/src/types/storyboardPanelMessages.ts`
- [ ] T318 Wire the esbuild entry so `storyboardPanel.tsx` bundles into `dist/webview/storyboardPanel.js`, mirroring the existing `logPanel.tsx` entry `apps/vscode/esbuild.js`
- [ ] T319 Confirm all 8 view-provider unit tests pass `apps/vscode/src/views/__tests__/storyboardPanelView.test.ts`

### Extension activation wiring

- [ ] T320 Register `debrief.captureScene` command handler in `extension.ts` — constructs `CaptureCommandContext` at invoke time (pulls `mapPanel`, `sessionStore`, `sessionManager`, `stacItemPath`, `actor` from the activation-level composition root) `apps/vscode/src/extension.ts`
- [ ] T321 Register `StoryboardPanelViewProvider` via `vscode.window.registerWebviewViewProvider('debrief.storyboardPanel', provider)` in `extension.ts` `apps/vscode/src/extension.ts`
- [ ] T322 Wire the capture command to call `provider.refresh()` + `provider.setCaptureInFlight(...)` on state transitions (single dependency-injection point; no circular import) `apps/vscode/src/extension.ts`
- [ ] T323 [P] Update `apps/vscode/src/commands/index.ts` to export `registerCaptureSceneCommand(...)` following the existing factory pattern `apps/vscode/src/commands/index.ts`

### Webview E2E (runs last — depends on all wiring above)

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip the E2E tasks below because you think browsers cannot be installed. The project uses `@sparticuz/chromium` (bundled Linux Chromium via npm). Run `node tests/e2e/run-playwright.mjs` to extract and configure. Full details: `docs/project_notes/playwright-installation-research.md`.

- [ ] T324 [test] Write Playwright E2E covering the 6 workflows from `plan.md §VS Code Webview E2E Testing`: first capture on empty plot, subsequent capture appends, duplicate-Offset resolution, save/close/reopen round-trip (SC-005), out-of-range timestamp rejected before #174 (SC-004), scoped-shortcut negative case (SC-006) `tests/e2e/test-storyboard-capture.spec.ts`
- [ ] T325 Apply any webview patches needed for the new view id (`debrief.storyboardPanel`) in `tests/e2e/scripts/patch-webview.sh` + `tests/e2e/helpers/webview-injector.ts` `tests/e2e/scripts/patch-webview.sh`
- [ ] T326 Confirm the E2E suite runs green via `node tests/e2e/run-playwright.mjs test-storyboard-capture` `tests/e2e/run-playwright.mjs`

### Storybook E2E (panel-component only; independent of extension wiring — can run in parallel with T315–T326)

- [ ] T327 [P][test] Write Storybook Playwright tests covering the 4 stories × 3 theme variants from `plan.md §Storybook E2E Testing` + a11y asserts (`data-testid`, `aria-label`) `shared/components/e2e/StoryboardPanel.spec.ts`
- [ ] T328 [P] Confirm the Storybook E2E suite runs green via `node shared/components/run-playwright.mjs StoryboardPanel` (or equivalent runner) `shared/components/e2e/StoryboardPanel.spec.ts`

**Parallel opportunity**:
- T301, T302, T317, T323, T327, T328 are all independent of the implementation path; they are the first things to write.
- T303 through T314 are a strict sequence in one file (`captureScene.ts`) — cannot parallelise.
- T315 ↔ T316 touch different files and can run in parallel after T317 is written.
- T324 depends on T320 + T321 + T322; runs after activation wiring is in place.

**Checkpoint**: after T326 + T328 green, US1 is independently shippable and every acceptance scenario + edge case from spec.md is covered by an automated test.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Goal**: Capture reproducible evidence of the feature working, write the shipped-announcement media, run the full CI gate, and create the feature + blog PR.

### Evidence Collection

- [ ] T401 Run `task verify` (lint + typecheck + unit + Playwright E2E) and capture pass/fail counts + coverage % `specs/216-storyboarding-capture/evidence/test-summary.md`
- [ ] T402 Populate `test-summary.md` using the template at `.specify/templates/evidence/test-summary-template.md` — MUST include YAML front matter (`feature: 216-storyboarding-capture`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`); body must list key scenarios verified per user story (all 5 acceptance scenarios + 7 edge cases) `specs/216-storyboarding-capture/evidence/test-summary.md`
- [ ] T403 [P] Create `usage-example.md` demonstrating first-capture + subsequent-capture + duplicate-Offset resolution end-to-end, with code-quoted snippets that a reviewer can follow step-by-step `specs/216-storyboarding-capture/evidence/usage-example.md`
- [ ] T404 [P] Copy the 5 Storybook screenshots produced during T328 into `specs/216-storyboarding-capture/evidence/screenshots/` (`panel-empty.png`, `panel-three-scenes-light.png`, `panel-three-scenes-dark.png`, `panel-three-scenes-vscode.png`, `capture-in-flight.png`) `specs/216-storyboarding-capture/evidence/screenshots/`
- [ ] T405 [P] During the webview E2E run (T326), enable Playwright `recordVideo`, then convert the resulting `.webm` of the first-capture happy path to a ≤ 5 s, ≤ 2 MB GIF saved as `interaction.gif`. Use `ffmpeg -i video.webm -vf "fps=10,scale=720:-1" -t 5 interaction.gif` `specs/216-storyboarding-capture/evidence/screenshots/interaction.gif`
- [ ] T406 [P] Capture `duplicate-modal.png` during the webview E2E duplicate-Offset test (T324) using `page.screenshot` on the modal prompt `specs/216-storyboarding-capture/evidence/screenshots/duplicate-modal.png`
- [ ] T407 [P] Capture `sample-output/item.json` (snapshot after 3 captures — shows per-Scene asset entries keyed `scene-thumbnail-{sceneId}` + `-sm`) and `sample-output/scene.feature.json` (one Scene Feature pretty-printed — shows `viewport`, `timestamp`, `visible_feature_ids`, `feature_set_hash`, `thumbnail_asset_ref`, `provenance`) `specs/216-storyboarding-capture/evidence/sample-output/`

### Media Content

- [ ] T408 Spawn the Content Specialist (`.claude/agents/media/content.md`) via the Task tool to draft `shipped-post.md` following the Shipped Post template — sections: What We Built, Screenshots (embed `interaction.gif` + 3 theme variants), Lessons Learned (scope reduction via reuse; plot-type conflation caught in review; per-Scene STAC asset extension), What's Next (#217 playback); ~700 words; British spelling; no emojis `specs/216-storyboarding-capture/media/shipped-post.md`
- [ ] T409 [P] Spawn the Content Specialist to draft `linkedin-shipped.md` — 150–200 words, hook-led, `{{POST_URL}}` placeholder, at most 2–3 tasteful hashtags `specs/216-storyboarding-capture/media/linkedin-shipped.md`

### Cross-cutting cleanup

- [ ] T410 [P] Update the spec.md `Status` header from `Draft — ready for quality-checklist validation` to `Complete` and add the completion date `specs/216-storyboarding-capture/spec.md`
- [ ] T411 [P] Mark item `#216` in `BACKLOG.md` as `complete` with row strikethrough (follow the existing `~~…~~` pattern for completed items) `BACKLOG.md`
- [ ] T412 Append an entry to `docs/project_notes/issues.md` referencing the PR URL + evidence directory `docs/project_notes/issues.md`
- [ ] T413 [P] If any decisions worth preserving emerged during implementation (e.g. swapping `showInputBox` for a different prompt primitive), append a `decisions.md` ADR entry `docs/project_notes/decisions.md`

### PR Creation (must run last)

- [ ] T414 Create PR and publish blog: run `/speckit.pr`

**T414 is the final task.** It depends on every evidence, media, and cross-cutting-cleanup task being complete. It (a) creates the feature PR in `debrief-future`, (b) publishes `shipped-post.md` to `debrief.github.io` via cross-repo PR, (c) returns both PR URLs for review.

---

## Dependencies

**External (already shipped)**:
- #215 (Storyboarding: schema + CRUD core) — complete. Provides `createStoryboard`, `createScene`, `deleteScene`, `getActiveStoryboardDefault`, `formatDtg`, `DuplicateTimestampError`, generated `SceneProperties`/`StoryboardProperties`/`Viewport` types.
- #174 (Thumbnail capture pipeline) — complete. Provides `MapPanel.requestThumbnailCapture(timeoutMs)` returning base64 PNG pair.
- #203 (Spatial types consolidation) — complete. Provides `calculateViewportCenter` in `@debrief/utils` and the `ViewportPolygon.zoom` authoritative slot.
- `@debrief/session-state` — provides `SessionStoreApi.getState()`, spatial/temporal/features slices, `markDirty()` middleware.

**Inter-phase order**:

```
Phase 1 (Setup)  ─────►  Phase 2A (MapPanel API)  ┐
                 ─────►  Phase 2B (Thumbnail)     ├──►  Phase 3 (US1)  ──►  Phase 4 (Polish) ──►  T414 /speckit.pr
                 ─────►  Phase 2C (Panel)         ┘
```

- **Phase 1 → Phase 2**: package.json contributions (T001–T004) must land before any command registration in T320–T322 succeeds. Directory scaffolds (T005–T007) are a hard prerequisite for every subsequent file-creating task.
- **Phase 2A, 2B, 2C → Phase 3**: All three sub-phases land independently but all three must be green before Phase 3 can start. T314 (command-handler tests passing) requires 2A (T202/T203), 2B (T207/T208/T210), and 2C (T2C5/T2C6) all to exist. T319 (view-provider tests) requires T2C5/T2C6. T326 (E2E) requires every earlier task complete.
- **Phase 3 → Phase 4**: Polish evidence depends on working implementation. T401 (`task verify`) requires T314 + T319 + T326 + T328 all green.
- **T414 is last**: every other task in T001–T413 must be complete before `/speckit.pr` runs.

**Within-phase checkpoints**:

- **After T007**: scaffolds ready; nothing else blocking.
- **After T204**: MapPanel exposes the feature-setter + getter used by the command handler.
- **After T209**: thumbnail service green; captureScene can call it.
- **After T211**: actor value stable + fallback-tested.
- **After T2C8**: presentational panel green in vitest; still needs the webview bundle (T318) and provider wiring (T315) before it runs in VS Code.
- **After T314**: command handler green in vitest mocks; still needs T320–T322 activation wiring.
- **After T326 + T328**: full E2E green; feature is shippable.
- **After T413**: evidence + media + housekeeping done; only PR creation remains.

---

## Implementation Strategy

**Incremental delivery**: the plan is deliberately shaped so that each phase lands a committable, verifiable increment.

1. **Phase 1 (Setup)** — single commit. Repo is "ready to build" but no user-visible change. Lint + typecheck still pass; no new tests yet.
2. **Phase 2A (MapPanel API)** — single commit. The new `setFeatures` / `getCurrentFeatures` methods compile and have tests; no user-visible change because nothing calls them yet.
3. **Phase 2B (Thumbnail service + actor)** — single commit, or split into two if the reviewer prefers (service alone, then actor). Service green in isolation; still unreachable from a user action.
4. **Phase 2C (Panel component)** — single commit. `<StoryboardPanel/>` renders in Storybook with all theme variants + passes unit tests + passes Storybook E2E. Developers can inspect it visually without touching the extension.
5. **Phase 3 (US1)** — one commit per major stage: (a) types + TDD tests (T301–T303); (b) command handler body (T304–T314); (c) view provider + webview entry + types + bundler (T315–T319); (d) extension activation wiring (T320–T323); (e) E2E (T324–T328). Each intermediate commit leaves CI green — the command is not reachable until T320 registers it, so partial merges are safe.
6. **Phase 4 (Polish)** — evidence + media + housekeeping commits, then a final commit running `/speckit.pr`.

**Rationale for this ordering**:

- **Foundation before feature**: the three Phase-2 sub-phases are independent of each other but all prerequisites for Phase 3. Running them in parallel (different engineers, different files) minimises critical-path time.
- **TDD at every layer**: unit tests land before implementation (T201 before T202; T205 before T207; T301 before T303; T302 before T315; T324 before T326). Constitution Article VI.2 — "no service code merged without corresponding tests".
- **Presentational-before-container**: `<StoryboardPanel/>` (Phase 2C) is fully testable in Storybook before any VS Code wiring exists. Encourages clean prop boundaries and keeps the extension thin (Article IV).
- **E2E last**: the full webview E2E (T324–T326) depends on the whole stack and runs last in Phase 3. Running it earlier would catch nothing that the unit tests don't already catch, at much higher runtime cost.
- **PR task runs `/speckit.pr`, not `gh pr create`**: the skill handles cross-repo publish (feature PR + blog post PR to debrief.github.io), so a single invocation at T414 covers both.

**Rollback strategy**: every intermediate commit leaves `main` green. If a later phase surfaces a design flaw (e.g. #215's API turns out to not fit capture cleanly), the foundation phases remain useful and can be reused by a revised Phase 3.

---

## Format validation

Every task in this file follows the strict checklist format: `- [ ] T### [labels] Description` `` `path/to/file.ext` ``. Labels used:

- `[P]` — parallel-safe within the phase
- `[test]` — test task (TDD lands before implementation)
- `[P][test]` — both

Total tasks: **68**. Phase breakdown: Phase 1 Setup = 7 (T001–T007); Phase 2 Foundation = 19 (T201–T211, T2C1–T2C8); Phase 3 US1 = 28 (T301–T328); Phase 4 Polish = 14 (T401–T414). US1 owns 28 of them (41 %). Task IDs are non-contiguous by phase (T2C* for Phase 2C; T3* for Phase 3; T4* for Phase 4) to keep the provenance legible; every ID is unique.
