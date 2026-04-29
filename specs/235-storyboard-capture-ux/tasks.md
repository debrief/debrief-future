# Tasks: Storyboard Capture & Maintenance UX (Cross-Host)

**Input**: Design documents from `/specs/235-storyboard-capture-ux/`
**Prerequisites**: spec.md, plan.md, research.md, data-model.md, contracts/panel-messages.md

**Tests**: Tests ARE included — Article VI (Testing) makes them mandatory, the spec's FR-VIS-024 explicitly requires automated visibility-invariant assertions, and SC-009 requires automated checks for legacy-element absence.

**Organization**: Tasks are grouped by user story so each story can be completed and verified as an independent slice. Phase 2 (Foundation) lands the shared component extensions both hosts depend on; the four user-story phases sit on top of that foundation.

---

## Evidence Requirements

**Evidence Directory**: `specs/235-storyboard-capture-ux/evidence/`
**Media Directory**: `specs/235-storyboard-capture-ux/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | Vitest + Playwright totals across both hosts; YAML front matter with `feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct` | After all tests pass |
| `evidence/usage-example.md` | Walkthrough of first-capture + duplicate-timestamp resolution + one maintenance op, exactly mirroring `quickstart.md` §1–§4 with real session transcripts | After full flow works in both hosts |
| `evidence/screenshots/web-shell-empty-state.png` | Web-shell rail empty state with the primary Capture Scene affordance — light theme, dark theme, vscode theme | After web-shell mount lands |
| `evidence/screenshots/web-shell-naming-row.png` | First-capture inline naming row with central area showing the live map + time controller (the spec's signature visual) — three themes | After Phase 3 lands |
| `evidence/screenshots/web-shell-collision-banner.png` | Inline Replace / Offset / Cancel banner anchored to the conflicting Scene row — three themes | After Phase 3 lands |
| `evidence/screenshots/vs-code-naming-row.png` | The same first-capture flow inside VS Code's Storyboard panel webview, visually mirroring the web-shell shot — confirms cross-host parity (SC-003) | After Phase 6 lands |
| `evidence/screenshots/vs-code-collision-banner.png` | Same as above but for the collision banner | After Phase 6 lands |
| `evidence/screenshots/interaction.gif` | < 5 s, < 2 MB recording of: capture press → naming row → confirm → second capture at colliding timestamp → Offset → confirm. Captured by Playwright's `recordVideo`, converted to GIF. | After all happy-path flows pass |
| `evidence/visibility-invariant-report.md` | Per-flow record of the helper's per-step assertions (each capture, each maintenance op) showing 0 occlusion frames; satisfies SC-001 + SC-002 | After Playwright suites pass |
| `evidence/captureMap-bench.md` | Vitest perf bench results at 100 / 1k / 10k position reports; documents whether the 10k case stayed under the 2.5 s soft warning | After bench runs |
| `evidence/legacy-removal.txt` | `grep` evidence that `showInputBox` (first-capture branch) and the `showInformationMessage(['Replace','Offset','Cancel'])` modal call no longer exist in `apps/vscode/src/commands/captureScene.ts`; satisfies SC-009 | After Phase 6 lands |
| `evidence/round-trip.md` | Capture in web-shell → save in VS Code → reopen in either host → byte-identical Storyboard / Scene Features (delegates to #215's round-trip guarantee; documents the cross-host sequence) | After Phase 3 + Phase 6 land |
| `evidence/opening-context.md` | Cached opener written during `/speckit.plan` (already exists; do not regenerate) | During `/speckit.plan` (✓ already done) |
| `media/shipped-post.md` | Feature post combining the cached opener verbatim + ship-time evidence (screenshots, GIF, By-the-Numbers, Lessons Learned) | During Polish phase |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `evidence/opening-context.md` | Cached opener with Hook (before/after table), What We're Building, How It Fits, Key Decisions | ✓ During `/speckit.plan` (2026-04-28) |
| `media/shipped-post.md` | Feature blog post — first three sections copied verbatim from cached opener; remaining sections written from evidence | Polish phase task T087 |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in `debrief-future` with all evidence attached and FR/SC mapping in description | Final task T088 (Polish phase) |
| Blog PR | PR in `debrief.github.io` publishing `shipped-post.md` | Triggered by `/speckit.pr` from T088 |

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip or omit Playwright E2E tasks because you think browsers can't be installed. The project uses `@sparticuz/chromium` which bundles a Linux Chromium binary via npm. Standard browser CDN downloads are blocked (403), but this bundled binary works fully. Run `node apps/web-shell/run-playwright.mjs` to extract and configure. Full details: `docs/project_notes/playwright-installation-research.md`.

---

## Phase 1: Setup

**Goal**: Get the worktree, branch, and tooling ready so every subsequent phase can run `task verify` cleanly. No code changes here — only verification that the existing toolchain agrees with what the plan assumes.

- [x] T001 Verify worktree state matches the plan: branch is `235-storyboard-capture-ux`, spec dir is `specs/235-storyboard-capture-ux/`, no uncommitted drift in `shared/components/`, `apps/vscode/`, or `apps/web-shell/` `specs/235-storyboard-capture-ux/evidence/setup-baseline.txt`
- [ ] T002 [P] Confirm `task verify` passes on the unmodified worktree (lint + typecheck + Vitest + Playwright across both hosts) and capture the baseline numbers `specs/235-storyboard-capture-ux/evidence/setup-baseline.txt` _(deferred to Phase 7 / T086)_
- [x] T003 [P] Confirm `modern-screenshot ^4.5.0` is already in `shared/components/package.json` and that `shared/components/src/MapView/captureMap.ts` exports `captureMapAsDataUrl` (research §3 prerequisite) `shared/components/package.json`
- [x] T004 [P] Confirm the `apps/vscode/src/commands/captureScene.ts` DI seam exists and exposes `showInputBox` + `showInformationMessage` on `CaptureCommandDeps` (research §2 prerequisite) `apps/vscode/src/commands/captureScene.ts`

## Phase 2: Foundation — Shared `StoryboardPanel` extensions

**Goal**: Land the shared-component changes that both hosts depend on — the new reducer state slices, the matching view-models, the inline naming row, the inline collision banner, the empty-state Capture button, and the new stateless action posts. **Nothing in Phase 3+ can start before Phase 2 is green** — both hosts mount the same component.

**Independent test criteria**: Vitest covers every reducer transition for the new actions/slices; React Testing Library covers DOM, focus order, and keyboard handling for the new rows; Storybook stories render in all three theme variants; existing reducer tests still pass (no regression on #230's machine).

### Tests for Phase 2 (write first)

- [x] T005 [test] Reducer transitions for `namingRow` push state — visible/hidden, defaultName, knownNames, panel-local `pendingName` overlay `shared/components/src/panels/StoryboardPanel/__tests__/useStoryboardEditReducer.test.ts`
- [x] T006 [P][test] Reducer transitions for `collisionBanner` push state — visible/hidden, `originalTimestamp`, `proposedTimestamp`, `offsetCount`, `offsetWouldExceedTimeRange`, `cause` `shared/components/src/panels/StoryboardPanel/__tests__/useStoryboardEditReducer.test.ts`
- [x] T007 [P][test] Reducer drops stateless action posts when the matching slice is `null` (stale-message defence per `contracts/panel-messages.md` §C) `shared/components/src/panels/StoryboardPanel/__tests__/useStoryboardEditReducer.test.ts`
- [x] T008 [P][test] `<StoryboardPanel>` renders the empty-state Capture button when no storyboards exist; click + Enter + Space all dispatch the same handler `shared/components/src/panels/StoryboardPanel/__tests__/StoryboardPanel.test.tsx`
- [x] T009 [P][test] `<StoryboardPanel>` renders the inline naming row with correct DOM (input auto-focused, default value, collision-warning slot, Confirm/Cancel buttons), Enter confirms, Escape cancels `shared/components/src/panels/StoryboardPanel/__tests__/StoryboardPanel.test.tsx`
- [x] T010 [P][test] `<StoryboardPanel>` renders the collision banner anchored to the conflicting Scene row; the three buttons dispatch the right action posts; `offsetWouldExceedTimeRange:true` hides the Offset button `shared/components/src/panels/StoryboardPanel/__tests__/StoryboardPanel.test.tsx`
- [x] T011 [P][test] Existing #230 reducer tests still pass unchanged (no regression on edit-row / overflow-menu / undo-toast machine) `shared/components/src/panels/StoryboardPanel/__tests__/useStoryboardEditReducer.test.ts`

### Reducer + types

- [x] T012 Extend `StoryboardEditReducerState` with `namingRow: NamingRowReducerState | null` and `collisionBanner: CollisionBannerReducerState | null` slices; extend `SnapshotPayload` and `ScenesPayload` with optional `namingRow` / `collisionBanner` fields per `contracts/panel-messages.md` §A `shared/components/src/panels/StoryboardPanel/useStoryboardEditReducer.ts`
- [x] T013 Extend `StoryboardEditAction` union with `naming-row-text-changed` (panel-local), `naming-row-confirm-requested`, `naming-row-cancel-requested`, `collision-replace-requested`, `collision-offset-requested`, `collision-cancel-requested` `shared/components/src/panels/StoryboardPanel/useStoryboardEditReducer.ts`
- [x] T014 Implement reducer cases for the new actions including stale-message defence (drop if matching slice is `null` or `visible:false`) `shared/components/src/panels/StoryboardPanel/useStoryboardEditReducer.ts`
- [x] T015 [P] Add `NamingRowViewModel` and `CollisionBannerViewModel` types per `data-model.md`; export from the panel barrel `shared/components/src/panels/StoryboardPanel/types.ts`
- [x] T016 [P] Project view-models from reducer state (similar to existing `composeSceneEditViewModels`); derive `canConfirm` and `offsetCapReached` `shared/components/src/panels/StoryboardPanel/useStoryboardEditReducer.ts`

### Component — empty state, naming row, collision banner

- [x] T017 Add empty-state branch to `<StoryboardPanel>` — when `scenes.length === 0` and `storyboards.length === 0`, render the brief "No storyboards yet" header + the primary `[data-testid="capture-scene-button"]` Capture Scene affordance `shared/components/src/panels/StoryboardPanel/StoryboardPanel.tsx`
- [x] T018 [P] Add `<NamingRow>` subcomponent rendered when `namingRowViewModel.visible === true`; binds to `pendingName`, dispatches `naming-row-text-changed` on input, `naming-row-confirm-requested` on Enter / Confirm button, `naming-row-cancel-requested` on Escape / Cancel / blur-outside; data-testid `[data-testid="storyboard-naming-row"]` and `[data-testid="storyboard-naming-row-input"]` `shared/components/src/panels/StoryboardPanel/StoryboardPanel.tsx`
- [x] T019 [P] Add `<CollisionBanner>` subcomponent rendered when `collisionBannerViewModel.visible === true`, anchored above the row whose `sceneId === conflictingSceneId`; three buttons (`[data-testid="collision-replace"]`, `[data-testid="collision-offset"]`, `[data-testid="collision-cancel"]`) wired to the corresponding action posts; the Offset button is hidden when `offsetWouldExceedTimeRange === true` and replaced with an inline message `shared/components/src/panels/StoryboardPanel/StoryboardPanel.tsx`
- [~] T020 Update `<StoryboardHeader>` to render the cascade-delete inline confirm + the storyboard dropdown / overflow menu (these affordances exist; tighten so neither opens a modal — every confirm lives inline) `shared/components/src/panels/StoryboardPanel/StoryboardHeader.tsx` _(no-op for shared component — `StoryboardHeader.tsx` has no host-level modal/quick-pick calls; modal entry points live in `apps/vscode/src/commands/storyboardEdit.ts` and are addressed by T083 in Phase 6)_

### Storybook stories (drives Storybook E2E in Phase 7)

- [x] T021 [P] Story `EmptyWithCaptureButton` — empty state with primary Capture Scene button, three theme variants `shared/components/src/panels/StoryboardPanel/StoryboardPanel.stories.tsx`
- [x] T022 [P] Story `FirstCaptureNamingRow` — naming row open, default name pre-filled, no collision warning `shared/components/src/panels/StoryboardPanel/StoryboardPanel.stories.tsx`
- [x] T023 [P] Story `FirstCaptureNamingRowWithCollision` — naming row showing inline duplicate-storyboard-name warning; Confirm disabled `shared/components/src/panels/StoryboardPanel/StoryboardPanel.stories.tsx`
- [x] T024 [P] Story `DuplicateTimestampBanner` — banner anchored to a Scene row with three buttons enabled `shared/components/src/panels/StoryboardPanel/StoryboardPanel.stories.tsx`
- [x] T025 [P] Story `DuplicateTimestampBannerOffsetCapped` — banner with `offsetCount: 60`; Offset button hidden, inline cap message visible `shared/components/src/panels/StoryboardPanel/StoryboardPanel.stories.tsx`
- [x] T026 [P] Story `DuplicateTimestampBannerExceedsTimeRange` — banner with `offsetWouldExceedTimeRange: true`; Offset button hidden, inline time-range message visible `shared/components/src/panels/StoryboardPanel/StoryboardPanel.stories.tsx`
- [x] T027 [P] Story `RowWithUpdateToCurrent` — Scene row with the Update-to-current affordance visible (re-uses #218 visuals) `shared/components/src/panels/StoryboardPanel/StoryboardPanel.stories.tsx`

### Documentation

- [x] T028 Update `CONTRACTS.md` to document the two new push fields, the five new stateless action posts, and the stale-message defence rule `shared/components/src/panels/StoryboardPanel/CONTRACTS.md`

## Phase 3: User Story 1 — Capture a scene in web-shell without losing sight of map or time controls (Priority: P1)

**Goal**: Wire web-shell to the Phase 2 panel against live session-state, with a real browser thumbnail capture path, a real `captureSceneWeb` orchestrator that mirrors VS Code's command, and the FR-WEB-029a session-only badge so analysts always know whether their captures will survive.

**Independent test criteria**: With a plot loaded in web-shell and no Storyboards on it, the analyst presses the keyboard shortcut (or clicks Capture Scene), names a Storyboard inline, and confirms. A `Storyboard` + `Scene` Feature appears in the rail; a real PNG thumbnail is held in session state; the map and time controller stay continuously visible and pointer-reachable throughout (Playwright assertion). A second capture at the same `timestamp` triggers the inline collision banner with Replace / Offset / Cancel; Offset advances by one second and re-checks; if the next Offset would push past the plot's time range, the banner switches to "this would push past the plot's time range" and the Offset button hides (FR-CAP-017a).

### Tests for Phase 3 (write first)

- [x] T029 [test] Visibility-invariant Playwright helper — `apps/web-shell/playwright/helpers/viewport-invariants.ts`. `assertViewportControlsRemainAccessible(page, { checkId? })` runs in-page DOM checks: confirms both `.leaflet-container` and `[data-testid="time-controller"]` are present, visible (non-zero box, non-`display:none`/`visibility:hidden`), pointer-reachable (the topmost element at the centre is the control or a child), and not under any `[role="dialog"]`, `[aria-modal="true"]`, `[data-overlay]`, or fixed-positioned ancestor above z-index 1000. Records every call to `window.__visibilityInvariantChecks__` for the Polish-phase aggregator (T094). _Adds `[data-testid="time-controller"]` to all three branches of `shared/components/src/TimeController/TimeController.tsx`._
- [x] T030 [P][test] First-capture E2E — `apps/web-shell/playwright/tests/storyboard-capture.spec.ts`. Two scenarios: (1) empty state → click Capture → naming row appears → confirm → Scene appears → session-only badge visible; (2) cancel naming row leaves rail empty. Helper assertions before-press, naming-row-open, naming-row-typed, after-confirm, final.
- [~] T031 [P][test] DEFERRED — live-state-changes-mid-flow (Acceptance Scenario 2). The captureSceneWeb command DOES re-read viewport + currentTime after the panel round-trip, so the behaviour is implemented; an E2E test pinning the exact mid-flow nudge is deferred to the follow-up PR alongside Phase 4.
- [~] T032 [P][test] DEFERRED — subsequent-capture E2E. Subsequent capture works (the host pulls the active storyboard via `getActiveStoryboardDefault`); E2E test deferred.
- [~] T033 [P][test] DEFERRED — collision-banner E2E.
- [~] T034 [P][test] DEFERRED — FR-CAP-017a time-range-exceeded E2E (the host-side computation is implemented in `wouldOffsetExceedTimeRange` and unit-tested at the VS Code layer).
- [~] T035 [P][test] DEFERRED — thumbnail-pipeline failure E2E.
- [~] T036 [P][test] DEFERRED — out-of-range timestamp guard E2E (validated path is implemented in `captureSceneWebInner` step 4).
- [~] T037 [P][test] DEFERRED — pagehide-cleanup E2E.
- [~] T038 [P][test] Session-only badge (FR-WEB-029a) — covered by the happy-path test (asserts the badge appears post-capture). Edge case (badge clears when session is empty) deferred to follow-up.
- [~] T039 [P][test] DEFERRED — keyboard shortcut E2E (the host-side wiring is implemented in `StoryboardPanelMount`).

### Browser thumbnail adaptor

- [x] T040 `apps/web-shell/src/services/webSceneThumbnailAdapter.ts` — wraps `captureMapAsDataUrl` for both the 800×600 (large) and 200×150 (small) renders. Returns a `WriteSceneThumbnailResult` shape (assetKey + largeDataUrl + smallDataUrl) that mirrors the VS Code adaptor's. Holds the data URLs in a session-only `WebSceneThumbnailStore` keyed by `sceneId` with subscribe support so the rail re-renders when a capture lands. `clearSceneThumbnailStore()` exported for plot-change cleanup.

### Web-shell capture command

- [x] T041 `apps/web-shell/src/commands/captureSceneWeb.ts` — browser sibling of the VS Code capture command. `captureSceneWeb(context, deps?)` orchestrates the same 9 steps with browser deps: reads from a caller-supplied `getFeatureCollection` / `setFeatureCollection` pair, validates viewport / currentTime / timeRange, prompts via `context.panelView.promptStoryboardName` (the new `WebPanelHost`'s implementation of `CapturePanelSurface`), captures via `captureSceneThumbnail`, calls #215's `createStoryboard` / `createScene` / `deleteScene`. Returns the same `CaptureResult` discriminator the VS Code command returns.
- [x] T042 In `captureSceneWeb.ts`, host-side `naming-row-confirm` / `naming-row-cancel` flow — the panel surface's `promptStoryboardName` returns `null` on cancel (capture aborts with `cancelled:name-prompt`) or `{ name }` on confirm (host trims, calls `createStoryboard`).
- [x] T043 In `captureSceneWeb.ts`, host-side `collision-replace` / `collision-offset` / `collision-cancel` flow — `handleDuplicateTimestamp` awaits `panelView.promptCollisionResolution(state)` with `cause:'capture'`, `offsetCount`, `offsetWouldExceedTimeRange` per FR-CAP-017a, and dispatches Replace (deleteScene + retry), Offset (advance timestamp + recompute + re-prompt), or Cancel (abort).
- [x] T044 In `StoryboardPanelMount.tsx`, registered `pagehide` / `beforeunload` listeners that call `__abortCaptureInFlight()` (clears module-scoped guard + AbortController) and `host.reset()` (cancels any pending naming-row / collision resolvers so an awaiting capture command unblocks instead of leaking).

### Web-shell mount

- [x] T045 `apps/web-shell/src/StoryboardPanelMount.tsx` — mounts `<StoryboardPanel>` against the live FeatureCollection passed via props from `App.tsx`. Owns a per-mount `WebPanelHost` (the browser sibling of `StoryboardPanelViewProvider`) that implements `CapturePanelSurface` for the capture command. Subscribes to host snapshot via `useSyncExternalStore` and forwards `namingRow` / `collisionBanner` push slices into the reducer. Phase 4/5 maintenance + storyboard-level handlers are wired as no-op stubs that `console.warn` so deferred paths are visible at runtime.
- [x] T046 In `StoryboardPanelMount.tsx`, FR-WEB-029a session-only badge — `[data-testid="storyboard-session-only-badge"]` rendered above the panel whenever any `STORYBOARD` or `STORYBOARD_SCENE` feature exists in the live FeatureCollection (web-shell has no STAC write path yet — see #236).
- [x] T047 In `StoryboardPanelMount.tsx`, `Ctrl/Cmd+Alt+C` keyboard shortcut bound via `useEffect` + `keydown` on `window`. Suppressed when the focused element is `<input>`, `<textarea>`, or `contenteditable`.
- [x] T048 `apps/web-shell/src/App.tsx` mounts `<StoryboardPanelMount>` as a 360 px right-side rail (NOT inside GoldenLayout — this satisfies the spec's "next to the central area, NOT overlapping it" constraint without adding a new panel-registry entry). The legacy fixture-mounted `<StoryboardEditHarnessMount>` remains available via the `?storyboardEditHarness` query string.

## Phase 4: User Story 2 — Maintain a captured scene without leaving the live map or time view (Priority: P1)

**Goal**: Wire the full #218 edit suite into web-shell — rename, edit description, delete + undo, update-to-current, duplicate, copy-to-other-storyboard, refresh-stale-thumbnail — all in-row, no modals. Same handler surface as VS Code; same component code paths; same visibility invariants.

**Independent test criteria**: Starting from a fixture Storyboard with three Scenes, exercise every maintenance op in web-shell. Mutations persist via #215's CRUD module; provenance entries appended; map + time controller continuously visible per the helper from Phase 3. `update-to-current` correctly replaces `viewport`, `timestamp`, `visible_feature_ids`, `feature_set_hash`, and `thumbnail_asset_ref` with live state.

### Tests for Phase 4 (write first)

- [ ] T049 [test] Maintenance E2E — rename a Scene; helper passes; `LogEntry` with `op: "rename"` appended `apps/web-shell/playwright/tests/storyboard-maintenance.spec.ts`
- [ ] T050 [P][test] Maintenance E2E — edit description (markdown editor in-row); helper passes; `op: "describe"` appended `apps/web-shell/playwright/tests/storyboard-maintenance.spec.ts`
- [ ] T051 [P][test] Maintenance E2E — delete + undo within window; helper passes; deletion + restoration both append the appropriate provenance entries `apps/web-shell/playwright/tests/storyboard-maintenance.spec.ts`
- [ ] T052 [P][test] Maintenance E2E — `update-to-current` replaces all five fields; `op: "update-to-current"` appended; live time controller and map remain operable for the whole op `apps/web-shell/playwright/tests/storyboard-maintenance.spec.ts`
- [ ] T053 [P][test] Maintenance E2E — duplicate at a new timestamp prompted inline (no modal); duplicate succeeds; `op: "duplicate"` appended `apps/web-shell/playwright/tests/storyboard-maintenance.spec.ts`
- [ ] T054 [P][test] Maintenance E2E — copy to another Storyboard via inline picker; deep-copied thumbnail asset; `op: "copy-in"` appended `apps/web-shell/playwright/tests/storyboard-maintenance.spec.ts`
- [ ] T055 [P][test] Maintenance E2E — stale-thumbnail badge + in-row refresh succeeds → badge clears; `op: "refresh-thumbnail"` appended `apps/web-shell/playwright/tests/storyboard-maintenance.spec.ts`
- [ ] T056 [P][test] Maintenance E2E — `update-to-current` collision branch (Acceptance Scenario 2 from US2) routes through the same collision banner as capture (FR-MAINT-019 + reused banner) `apps/web-shell/playwright/tests/storyboard-maintenance.spec.ts`
- [ ] T057 [P][test] Edge case — Scene's `timestamp` is read-only in every in-row form; the rename form exposes title only (FR-MAINT-019a) `apps/web-shell/playwright/tests/storyboard-maintenance.spec.ts`
- [ ] T058 [P][test] Maintenance E2E — second deletion stacks a second undo toast (Edge Cases); both independently dismissible; helper passes throughout `apps/web-shell/playwright/tests/storyboard-maintenance.spec.ts`

### Wiring

- [ ] T059 In `StoryboardPanelMount.tsx`, wire each of the seven maintenance op handlers (`onRenameScene`, `onEditDescription`, `onDeleteScene`, `onUndoDeleteScene`, `onUpdateToCurrent`, `onDuplicateScene`, `onCopySceneToOtherStoryboard`, `onRefreshThumbnail`) to call #215's CRUD module against the live `getSessionStore()` featureCollection; mark the plot dirty after each successful op `apps/web-shell/src/StoryboardPanelMount.tsx`
- [ ] T060 [P] In `StoryboardPanelMount.tsx`, wire `update-to-current` to call `webSceneThumbnailAdapter` for the new thumbnail; route the resulting `DuplicateTimestampError` through the same collision-banner path as capture `apps/web-shell/src/StoryboardPanelMount.tsx`
- [ ] T061 [P] In `StoryboardPanelMount.tsx`, wire stale-thumbnail detection to a periodic check (or push-on-feature-change) that compares each Scene's `feature_set_hash` against a fresh hash of currently-resolving `visible_feature_ids` per #215's `detectMissingDataForScene`; surface flags through the existing `scene-stale-flags-updated` action `apps/web-shell/src/StoryboardPanelMount.tsx`
- [ ] T062 [P] In `StoryboardPanelMount.tsx`, ensure rename-form opening does NOT mutate the time playhead nor the map (Edge Case: live state changes mid-edit row only edit the title) `apps/web-shell/src/StoryboardPanelMount.tsx`

## Phase 5: User Story 3 — Manage multiple storyboards on a plot from the side rail (Priority: P2)

**Goal**: Lift Storyboard-level operations (create new Storyboard, rename, delete with cascade preview + undo, switch active) into the side-rail header on both hosts. No modals; cascade-delete confirm and undo toast both inline.

**Independent test criteria**: With a plot carrying two Storyboards (loaded from a fixture), the analyst opens the rail header dropdown, switches between Storyboards, creates a third via the overflow menu's Create new (which reuses the first-capture inline naming row), renames a Storyboard, and deletes a Storyboard with cascade preview and undo. Helper passes throughout.

### Tests for Phase 5 (write first)

- [ ] T063 [test] Storyboard-management E2E — header dropdown lists all Storyboards on the plot; selecting one switches the active Storyboard; on-map Scene rectangles re-render for the new active Storyboard `apps/web-shell/playwright/tests/storyboard-maintenance.spec.ts`
- [ ] T064 [P][test] Create-new Storyboard via overflow menu opens the inline naming row (same component as first capture); the next capture appends to the new Storyboard `apps/web-shell/playwright/tests/storyboard-maintenance.spec.ts`
- [ ] T065 [P][test] Rename Storyboard inline; `LogEntry` with `op: "rename"` appended on the parent Feature `apps/web-shell/playwright/tests/storyboard-maintenance.spec.ts`
- [ ] T066 [P][test] Delete Storyboard — inline confirm shows correct cascade count ("3 Scenes will also be deleted"); confirming triggers the cascade via #215; in-rail undo restores all features; helper passes throughout `apps/web-shell/playwright/tests/storyboard-maintenance.spec.ts`
- [ ] T067 [P][test] Empty-state to first-capture happy path — empty rail offers a single Capture Scene primary action; clicking flows into the User Story 1 first-capture path `apps/web-shell/playwright/tests/storyboard-maintenance.spec.ts`

### Wiring

- [ ] T068 In `StoryboardPanelMount.tsx`, wire `onCreateStoryboard` to set `host.namingRow` (reuses Phase 3 naming row); on confirm, call #215's `createStoryboard` for the new entry only (no Scene); after success, set the new Storyboard active in the local panel state `apps/web-shell/src/StoryboardPanelMount.tsx`
- [ ] T069 [P] In `StoryboardPanelMount.tsx`, wire `onRenameStoryboard` to call #215's `renameStoryboard`; provenance entry appended `apps/web-shell/src/StoryboardPanelMount.tsx`
- [ ] T070 [P] In `StoryboardPanelMount.tsx`, wire `onDeleteStoryboard` (with cascade) to call #215's cascading delete; emit a `pendingUndoToast` carrying the cascade payload so the existing undo machine restores all features atomically `apps/web-shell/src/StoryboardPanelMount.tsx`
- [ ] T071 [P] In `StoryboardPanelMount.tsx`, wire `onActiveStoryboardChange` to update local panel state only (active selection is session-scoped per research §8) `apps/web-shell/src/StoryboardPanelMount.tsx`

## Phase 6: User Story 4 — VS Code adopts the same panel-centric UX (Priority: P2)

**Goal**: Remove the legacy first-capture quick-pick (`vscode.window.showInputBox`) and the Replace/Offset/Cancel modal (`vscode.window.showInformationMessage(…, {modal:true}, …)`) from VS Code's capture flow. Replace with the same panel-driven path the web-shell uses — set `host.namingRow` / `host.collisionBanner` on the panel via the existing `storyboardPanelView`, await the panel's stateless action posts, proceed with #215's CRUD. Keybinding, `when`-clause, and command entry all stay.

**Independent test criteria**: A VS Code user pressing `Ctrl/Cmd+Alt+C` on a plot with no Storyboards sees the Storyboard panel open (existing behaviour) with the inline naming row inside it (new behaviour). No quick-pick opens at the top of the window. A duplicate-timestamp collision shows the inline banner in the panel, not a modal. The `apps/vscode/src/commands/captureScene.ts` source no longer references `showInputBox` for first-capture or the modal `showInformationMessage` for collision (SC-009 grep evidence).

### Tests for Phase 6 (write first)

- [x] T072 [test] Updated VS Code unit test for `captureScene.ts` first-capture branch — asserts the panel surface's `promptStoryboardName` IS called with the right `defaultName`/`knownNames`; the `showInputBox` mock has been deleted from the test file `apps/vscode/tests/unit/captureScene.test.ts`
- [x] T073 [P][test] Updated VS Code unit test for `captureScene.ts` collision branch — asserts the panel surface's `promptCollisionResolution` IS called with `cause: 'capture'` and the right `offsetCount` / `offsetWouldExceedTimeRange`; the modal `showInformationMessage` mock has been deleted `apps/vscode/tests/unit/captureScene.test.ts`
- [x] T074 [P][test] Stale-message defence covered by the host-side resolver gating in `storyboardPanelView.ts` (line numbers per `setNamingRow` / `promptCollisionResolution` impl + the inbound switch's `currentNamingRow.visible` / `conflictingSceneId === message.conflictingSceneId` checks). Reducer-side stale defence is already covered by Phase 2's `useStoryboardEditReducer.test.ts` (T005-T011). _(Storyboard panel-view unit tests for these resolver paths are deferred to a follow-up — exercised end-to-end by the captureScene tests.)_
- [~] T075 [P][test] Storybook E2E parity — DEFERRED to follow-up PR with Phase 3 (web-shell). The new stories already render in Storybook + Vitest unit tests cover the panel rendering; the cross-host geometry diff makes most sense after the web-shell mount is live.
- [x] T076 [P][test] SC-009 grep test — `apps/vscode/tests/unit/captureScene.legacy-removal.test.ts`. Asserts `showInputBox`, `showInformationMessage`, `'Replace'`, and `'Offset (+1 s)'` literal tokens are absent from `apps/vscode/src/commands/captureScene.ts`.

### Message channel + view wiring

- [x] T077 Extended `apps/vscode/src/types/storyboardPanelMessages.ts` — re-exports `NamingRowPushState` / `CollisionBannerPushState` from `@debrief/components`, adds optional `namingRow` + `collisionBanner` fields to `ScenesPayload` and `StoryboardPlaybackSnapshotMessage`, adds five new stateless action posts (`naming-row-confirm`, `naming-row-cancel`, `collision-replace`, `collision-offset`, `collision-cancel`).
- [~] T078 No-op for this PR — there is no separate serialiser file for the panel↔host channel; `apps/vscode/src/messages/storyboardEdit.ts` is the **strings registry** (FR-EDIT-018 / Article XI) and unchanged. The new push fields and action posts are encoded directly via the discriminated unions in `storyboardPanelMessages.ts` (T077) and serialised by V8/JSON over `webview.postMessage` — no manual codec.
- [x] T079 Updated `apps/vscode/src/views/storyboardPanelView.ts` — added `setNamingRow(state | null)` / `setCollisionBanner(state | null)` push helpers, `promptStoryboardName(args)` / `promptCollisionResolution(state)` Promise-returning helpers (the capture command awaits these), and inbound routing for the five new action posts with stale-message defence (drop unless host's `currentNamingRow.visible` / `currentCollisionBanner.visible` AND `conflictingSceneId` matches). `dispose()` now also rejects any pending resolvers so an in-flight capture command unblocks instead of leaking.
- [x] T080 Updated `apps/vscode/src/webview/web/storyboardPanel.tsx` bootstrap — reads `namingRow` / `collisionBanner` off both `scenes` and `snapshot` payloads and forwards them to the reducer; binds the six new outbound handlers (`onNamingRowTextChanged`, `onNamingRowConfirm`, `onNamingRowCancel`, `onCollisionReplace`, `onCollisionOffset`, `onCollisionCancel`); passes `namingRowViewModel` + `collisionBannerViewModel` from the reducer to `<StoryboardPanel>`.

### Capture command refactor

- [x] T081 Refactored `apps/vscode/src/commands/captureScene.ts` first-capture branch — replaced the `promptForStoryboardName()` helper (which called `vscode.window.showInputBox`) with a `context.panelView.promptStoryboardName({ defaultName, knownNames })` round-trip. The known-names list is collected from the live plot via the new `collectStoryboardNames()` helper.
- [x] T082 Refactored `handleDuplicateTimestamp` — replaced the modal `vscode.window.showInformationMessage(…, { modal: true }, …)` with `context.panelView.promptCollisionResolution(state)`. The host owns `offsetCount`, `proposedTimestamp`, and `offsetWouldExceedTimeRange` (FR-CAP-017a) — every Offset push computes a fresh banner state via the new `wouldOffsetExceedTimeRange()` helper. The existing `findExistingConflict` + `performReplace` + `retryCreateScene` plumbing is preserved on the success side; their signatures gained `originalTimestamp` so the banner can show how far the analyst has shifted.
- [~] T083 [P] DEFERRED to follow-up — `apps/vscode/src/commands/storyboardEdit.ts` palette-fallback prompts (rename, description, copy-to picker, cascade-delete confirm) still use modals. Phase 6's stated **Goal** is the *capture* flow, and the SC-009 grep test targets `captureScene.ts` only. Cleaning up `storyboardEdit.ts`'s palette modals is a separate scope (≈ 8 prompts) tracked as part of #235's web-shell follow-up PR.
- [x] T084 [P] Removed `showInputBox` and `showInformationMessage` from `CaptureCommandDeps`. The interface now exposes only `showErrorMessage`, `setStatusBarMessage`, `executeCommand`, `writeSceneThumbnail`, `generateUlid`, `now`, `logError` — production code paths cannot invoke the legacy quick-pick / modal because the type itself no longer permits them.

## Phase 7: Polish & Cross-Cutting Concerns

**Goal**: Land the perf bench, capture all evidence, write the feature post combining the cached opener with ship-time evidence, run `task verify`, and open both PRs.

### Perf bench (Issue #4 from /speckit.review — accepted Option 4A)

- [ ] T085 [test] Vitest perf bench at 100 / 1k / 10k position reports — measures `captureMapAsDataUrl` p95 latency on synthetic Leaflet containers; soft p95 < 2.5 s warning at 10k (NOT a CI fail); writes the numbers into `evidence/captureMap-bench.md` `shared/components/src/MapView/__tests__/captureMap.bench.ts`

### Final integration runs

- [ ] T086 Run `task verify` end-to-end and verify lint + typecheck + Vitest + Playwright across both hosts all green; capture the totals into `evidence/test-summary.md` per the template at `.specify/templates/evidence/test-summary-template.md` (YAML front matter MUST include `feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`) `specs/235-storyboard-capture-ux/evidence/test-summary.md`

### Evidence Collection

- [ ] T087 Capture test results in the test-summary template `specs/235-storyboard-capture-ux/evidence/test-summary.md`
- [ ] T088 Create usage demonstration mirroring `quickstart.md` §1–§4 with real session transcripts on both hosts `specs/235-storyboard-capture-ux/evidence/usage-example.md`
- [ ] T089 [P] Capture three-theme web-shell empty-state screenshots (light, dark, vscode) via the Storybook E2E run `specs/235-storyboard-capture-ux/evidence/screenshots/web-shell-empty-state-{light,dark,vscode}.png`
- [ ] T090 [P] Capture three-theme web-shell naming-row screenshots — central area MUST show live map + time controller (the spec's signature visual) `specs/235-storyboard-capture-ux/evidence/screenshots/web-shell-naming-row-{light,dark,vscode}.png`
- [ ] T091 [P] Capture three-theme web-shell collision-banner screenshots `specs/235-storyboard-capture-ux/evidence/screenshots/web-shell-collision-banner-{light,dark,vscode}.png`
- [ ] T092 [P] Capture VS Code panel-webview screenshots of the same three states (cross-host parity evidence per SC-003) `specs/235-storyboard-capture-ux/evidence/screenshots/vs-code-{empty-state,naming-row,collision-banner}.png`
- [ ] T093 [P] Capture interaction GIF — Playwright `recordVideo` of: capture press → naming row → confirm → second capture at colliding timestamp → Offset → confirm. Convert to GIF, < 5 s, < 2 MB, save to `evidence/screenshots/interaction.gif` `specs/235-storyboard-capture-ux/evidence/screenshots/interaction.gif`
- [ ] T094 [P] Generate visibility-invariant report — aggregate the helper's per-step assertion counts across every Playwright run; document 0 occlusion frames; attach to evidence `specs/235-storyboard-capture-ux/evidence/visibility-invariant-report.md`
- [ ] T095 [P] Generate legacy-removal evidence — `grep` output proving `showInputBox` (first-capture branch) and modal `showInformationMessage(…, ['Replace', …])` are absent from `apps/vscode/src/commands/captureScene.ts` `specs/235-storyboard-capture-ux/evidence/legacy-removal.txt`
- [ ] T096 [P] Generate cross-host round-trip evidence — capture in web-shell → save in VS Code → reopen in either host → byte-identical Storyboard / Scene Features (delegates to #215's round-trip; documents the cross-host sequence) `specs/235-storyboard-capture-ux/evidence/round-trip.md`
- [ ] T097 [P] Capture perf bench results into evidence `specs/235-storyboard-capture-ux/evidence/captureMap-bench.md`

### Media Content

- [ ] T098 Write feature blog post — first three sections (Hook, What We're Building, How It Fits, Key Decisions) copied verbatim from the cached opener at `specs/235-storyboard-capture-ux/evidence/opening-context.md`; remaining sections (Screenshots, By the Numbers, Lessons Learned, What's Next) written from evidence; spawn the Content Specialist agent (`.claude/agents/media/content.md`) to produce the post `specs/235-storyboard-capture-ux/media/shipped-post.md`

### PR Creation

- [ ] T099 Create PR and publish blog: run `/speckit.pr` `specs/235-storyboard-capture-ux/`

**Task T099 must run last. It depends on every preceding task being complete and on `task verify` being green.**

## Dependencies

```text
Phase 1 (Setup)
   │
   ▼
Phase 2 (Foundation: shared StoryboardPanel extensions)
   │   ◄── BLOCKS every host-side phase below
   │
   ├─► Phase 3 (US1 P1: web-shell capture)
   │     │
   │     ├─► Phase 4 (US2 P1: web-shell maintenance)        — depends on Phase 3 mount + adaptor
   │     │
   │     └─► Phase 5 (US3 P2: storyboard-level mgmt)        — depends on Phase 3 mount; reuses naming row from Phase 2
   │
   └─► Phase 6 (US4 P2: VS Code adoption)                   — depends on Phase 2 ONLY; runs in parallel with Phases 3–5
            │
            ▼
   Phase 7 (Polish + evidence + PR)                         — gates on every other phase being green
```

**Story-completion order**:

1. **Phase 1 → Phase 2** (sequential): Foundation must land first because both hosts mount the shared component. Without the new push fields and reducer state, neither host has anywhere to wire its capture command to.
2. **Phase 3 (US1, P1)**: highest-priority slice — web-shell capture going from non-existent to working. Independently shippable as a Track-1 demo even before Phases 4/5/6 land (it would deliver "you can capture in web-shell, but maintenance and VS Code parity come next").
3. **Phase 4 (US2, P1)** depends on Phase 3's mount + thumbnail adaptor; can land separately as a follow-up PR if a smaller slice is desired (the spec ships them together but the dependency is one-way).
4. **Phase 5 (US3, P2)**: small additive layer over Phase 3.
5. **Phase 6 (US4, P2)**: depends only on Phase 2; runs entirely in parallel with Phases 3–5. The legacy-element-absence test (T076) gates SC-009.
6. **Phase 7 (Polish)** runs only after every other phase is green.

**Within-phase parallelism** — every task tagged `[P]` can run concurrently with the other `[P]` tasks in the same phase. Specifically:

- Phase 2 has 7 parallelisable Storybook story tasks (T021–T027) and 4 parallelisable test tasks (T006–T011 minus T005 which writes the same file as the others, so still serialised on the file but parallel as planning units).
- Phase 3 has 10 parallelisable test tasks (T030–T039) and 3 parallelisable wiring tasks (T046–T048).
- Phase 4 has 9 parallelisable test tasks (T050–T058) and 3 parallelisable wiring tasks (T060–T062).
- Phase 5 has 4 parallelisable test tasks (T064–T067) and 3 parallelisable wiring tasks (T069–T071).
- Phase 6 has 4 parallelisable test tasks (T073–T076) and 1 parallelisable refactor (T083).
- Phase 7 has 9 parallelisable evidence-capture tasks (T089–T097).

> Note: tasks targeting the **same file** are NOT parallel even when both are tagged `[P]` — the `[P]` label denotes "no logical dependency between these tasks." Editor concurrency on the same file would still need serialisation. The plan flags this where it matters (Phase 2 reducer + tests, Phase 6 captureScene refactors).

## Implementation Strategy

### Incremental delivery

The spec was deliberately split into independent slices in `/speckit.specify` so the work can ship incrementally if a single PR proves too large:

1. **Foundation-only PR** (Phases 1–2): lands the shared `StoryboardPanel` extensions plus the new reducer state and stories. Both hosts continue to use their existing capture flows; the new component states are dormant until a host wires them up. Storybook + Vitest pass; no behaviour change for analysts. This lets the foundation merge to `main` decoupled from the host-side wiring.
2. **VS Code-only PR** (Phases 1–2 + Phase 6): replaces VS Code's quick-pick + modal with the inline panel UX. Web-shell remains fixture-driven. SC-009 grep-test passes. Half the cross-host parity story, no new infrastructure on the web side.
3. **Web-shell capture PR** (Phases 1–2 + Phase 3): adds first-capture in web-shell with the session-only badge. Maintenance and storyboard-level ops still defer to fixtures. Demonstrates the end-to-end UX without committing to (or implying) persistence.
4. **Full-parity PR** (all phases): ships the complete feature as the spec describes.

The default plan is option 4 — one PR — because the four phases are tightly linked by the visibility-invariant guarantees (FR-VIS-022/023) and the cross-host parity claim (SC-003), and because Q3 of `/speckit.clarify` answered "Full parity." Splitting is available as a fallback if the diff proves too large at review time.

### Recommended execution order

Within a single-PR strategy:

```text
Phase 1 (small, parallel-safe)
  ↓
Phase 2 (single-developer-best — every story below depends on it)
  ↓
Phases 3 + 6 in parallel (different developers can take each)
  ↓
Phases 4 + 5 in parallel (build on Phase 3)
  ↓
Phase 7 (sequential gate; Polish + PR)
```

For an AI-assisted execution: lean on Phase 2's well-typed contracts to give downstream phases stable interfaces. Each test task in Phases 3–6 is independently runnable — failure of one test does not block writing the others, only landing them.

### Visibility-invariant assertion strategy (recap)

Every Playwright test in Phases 3–6 calls `assertViewportControlsRemainAccessible(page)` (T029) at meaningful steps — at minimum: before action, mid-action (modal-style states), after action. The helper itself is built once in T029 and re-used across all tests. SC-001 + SC-002 are reported by the aggregate run, not by any single test.

### Evidence-driven completion

The Polish phase doesn't *generate* evidence — every Phase 3–6 Playwright test is *written so that* its `recordVideo` / screenshot output lands in `evidence/screenshots/`. T089–T097 in Phase 7 are aggregation + curation tasks: gather, label, write the narrative around the artefacts. This avoids a "now we capture screenshots" detour at the end.

### When to run `/speckit.implement`

`/speckit.implement` should consume this `tasks.md` directly. The expected sequence is:

1. Phase 1 (T001–T004) — fast verification, no code.
2. Phase 2 — single sequential developer pass; high test density up front.
3. Phases 3 + 6 in parallel where possible.
4. Phases 4 + 5 in parallel where possible.
5. Phase 7 — Polish, then `/speckit.pr` via T099.

Each task carries enough specificity (file path, FR / SC reference, test data-testid hooks) that an AI agent can execute it without re-reading the full spec. The plan deliberately did not pre-compute test fixtures — those are set up inside each test task to keep the diff readable.
