---
description: "Task list for feature 230 — Storyboard edit suite webview wiring"
---

# Tasks: Storyboard Edit Suite — Webview Wiring + Web-shell Harness + Error Triage

**Input**: Design documents at `/specs/230-storyboard-edit-wiring/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓
**Branch / Worktree**: `230-storyboard-edit-wiring` at `/Users/ian/git/worktrees/230-storyboard-edit-wiring/`

**Tests**: This feature requests tests for every FR (per spec Non-Functional Test Coverage and plan.md Testing section). Reducer unit tests, component unit tests, Storybook E2E, web-shell E2E, and code-server E2E are all in scope.

**Organization**: Tasks are grouped by user story from `spec.md` (US1..US5), with a Foundation phase (shared reducer + message contract extensions) that blocks every story, and a Polish phase that closes out evidence, interactive stories, the thin code-server test, the blog post, and the PR.

---

## Evidence Requirements

**Evidence Directory**: `specs/230-storyboard-edit-wiring/evidence/`
**Media Directory**: `specs/230-storyboard-edit-wiring/media/`
**Screenshot Target**: `specs/218-storyboarding-edit/evidence/screenshots/` (per FR-040 — this feature completes #218's deferred T097; screenshots land under the parent feature's evidence directory so the blog post and PR description reference the #218 evidence table consistently)

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/opening-context.md` | Cached blog opener (What We're Building / How It Fits / Key Decisions) | Captured during /speckit.plan ✓ |
| `evidence/test-summary.md` | Test results with YAML front matter (feature, captured_at, git_sha, tests_passed/failed/skipped, coverage_pct); MUST use `.specify/templates/evidence/test-summary-template.md` | After full suite passes (Phase 8) |
| `evidence/usage-example.md` | Concrete demo of the polish loop (reducer action → panel state → Log Panel card) | After Phase 2+3+4 green |
| `evidence/webview-e2e-summary.md` | Web-shell + code-server E2E pass/fail summary + screenshot index | After Phases 6+8 pass |
| `evidence/a11y-report.md` | `@axe-core/playwright` audit results for overflow menu open state + Storybook edit-suite stories (per research.md R11) | After Phase 4 + Phase 8 story upgrade |
| `evidence/viewport-diagnostic-log.md` | Before/after logs for the viewport-race fix + repro steps | After Phase 7 viewport fix |
| `evidence/stac-load-diagnostic-log.md` | Diagnostic output from each null-return branch of `loadPlot` + root-cause analysis + fix notes (per research.md R9) | After Phase 7 STAC diagnostic + fix |
| `specs/218-storyboarding-edit/evidence/screenshots/*.png` | Per #218's evidence requirements table (rename form, undo toast, stale badge, missing-data remediation, overflow menu open, storyboard-header, vscode-native-chrome) | During Phase 6 + Phase 8 code-server test |
| `specs/218-storyboarding-edit/evidence/screenshots/interaction.gif` | < 5 s, < 2 MB recording of rename → describe → delete+undo → refresh-stale flow | During Phase 6 web-shell E2E |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `evidence/opening-context.md` | Cached opener — three prose sections | During /speckit.plan ✓ |
| `media/shipped-post.md` | Feature blog post (opener copied verbatim + Screenshots + By-the-Numbers + Lessons Learned + What's Next) | Phase 8 via Content Specialist |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in `debrief-future` against `main` with evidence links + test summary | Final task via `/speckit.pr` |
| Blog PR | Cross-repo PR in `debrief.github.io` publishing `shipped-post.md` | Triggered by `/speckit.pr` |

---

## Phase 1: Setup

**Purpose**: Confirm baseline green before any changes; create the feature evidence directory.

- [x] T0\1 Confirm baseline green by running `task verify` on the 230 worktree (2,983 tests from #218 must pass before any edit) — capture the output to `specs/230-storyboard-edit-wiring/evidence/baseline-verify.txt`
- [x] T0\1 [P] Create the feature evidence directory `specs/230-storyboard-edit-wiring/evidence/` (already exists from `/speckit.plan` — confirm it is git-tracked and empty except for `opening-context.md`)
- [x] T0\1 [P] Create the feature media directory `specs/230-storyboard-edit-wiring/media/`

**Checkpoint**: Baseline verified, directories ready. Phase 2 may begin.

---

## Phase 2: Foundation (shared reducer + contract extensions)

**Purpose**: The reducer hook, message-contract extensions, and the enriched `refresh()` payload. Every user story depends on these.

**⚠️ CRITICAL**: No user story work (Phases 3–7) can begin until this phase is complete and green.

### Message Contract (types)

- [x] T0\1 [P] Extend `ExtensionToStoryboardPanelMessage` with the three new inbound types (`scene-edit-form-open`, `scene-stale-flags-updated`, `scene-undo-toast-shown`) — shapes from `specs/230-storyboard-edit-wiring/contracts/postmessage-contract.md` §Inbound — in `apps/vscode/src/types/storyboardPanelMessages.ts`
- [x] T0\1 [P] Extend `WebviewToExtensionMessage` with the eleven new outbound types (O1..O11 from the contract) in `apps/vscode/src/types/storyboardPanelMessages.ts`
- [x] T0\1 [P] Extend the `'scenes'` message payload shape with `sceneEditViewModels` + `pendingUndoToast` + `storyboardEditViewModel` (per contract §Refresh Payload Extension) in `apps/vscode/src/types/storyboardPanelMessages.ts`

### Reducer Hook (pure)

- [x] T0\1 [P][test] Write reducer unit tests against every action in the data-model action union (T1–T4 state transitions + all local actions + all invariants from `data-model.md`) in `shared/components/src/panels/StoryboardPanel/__tests__/useStoryboardEditReducer.test.ts` — tests must FAIL before implementation
- [x] T0\1 Implement the `useStoryboardEditReducer` hook (pure reducer + hook wrapper + initial state factory + action creators) in `shared/components/src/panels/StoryboardPanel/useStoryboardEditReducer.ts` — depends on T010, T011, T012, T013
- [x] T0\1 Export the action-union + state-shape types from the panel barrel in `shared/components/src/panels/StoryboardPanel/types.ts`

### I18N Strings

- [x] T0\1 [P] Add i18n strings for overflow menu labels (six items × EN), chevron ARIA labels (`aria-label` expanded/collapsed), UndoToast dismiss label, "Refresh all stale (N)" button label in `apps/vscode/src/messages/storyboardEdit.ts`

### Extension-side refresh() payload enrichment

- [x] T0\1 Extend `storyboardPanelView.refresh()` to compose `sceneEditViewModels` + `pendingUndoToast` + `storyboardEditViewModel` from `storyboardEditService.getStaleFlag(...)` + `service.getPendingDeletes(...)` in `apps/vscode/src/views/storyboardPanelView.ts` — add an inline comment naming the O(active-storyboard Scenes) invariant (FR-008, review 13A from #218) — depends on T012
- [x] T0\1 [test] Add a unit test against `storyboardPanelView.refresh()` asserting the enriched payload shape + the O(scenes) complexity bound (mock service; assert the compose step touches only active-storyboard Scenes) in `apps/vscode/tests/unit/storyboardPanelView.test.ts`

### Foundation Parallel Example

```bash
# T010, T011, T012 all edit the same file — NOT parallel (they serialise on the same file)
# T013 and T016 are independent; T018 is independent of T013/T016 — launch them as a parallel bundle:
Task: "[test] Write reducer unit tests (T013)"
Task: "[P] Add i18n strings (T016)"
# T014, T015, T017 are serial (T014 depends on T013; T017 depends on T012; T015 depends on T014)
```

**Checkpoint**: Reducer hook green, message types extended, refresh() payload enriched, i18n strings in place. User-story phases may now begin in parallel.

---

## Phase 3: User Story 1 — Edit a Scene's description from the panel (Priority: P1)

**Goal**: Deliver the chevron + double-click affordance that opens an inline Scene edit form, keyed to the shared reducer. Only one form open at a time; submit commits a description edit and records a Log Panel card; cancel discards.

**Independent Test**: Open the Storyboard panel against a plot with at least two Scenes. Click the chevron on row 1 → edit form opens with description pre-filled. Click chevron on row 2 → row 1's form closes and row 2's opens. Edit description and submit → form closes, row 1 shows the new description, a Log Panel card records the edit. Double-click row 2 body → form toggles closed.

### Tests for User Story 1 ⚠️

> **NOTE**: Tests FIRST — each must fail before the corresponding implementation lands.

- [x] T0\1 [P][US1][test] Extend `SceneRow` tests: chevron renders with `aria-expanded` reflecting state; click dispatches `'expand-row-toggle'`; double-click on row body (outside overflow trigger) dispatches `'expand-row-toggle'`; single-click preserves #217's `scene-row-clicked` transport-select in `shared/components/src/panels/StoryboardPanel/__tests__/SceneRow.test.tsx`
- [x] T0\1 [P][US1][test] Extend `StoryboardPanel` tests: opening row B's form closes row A's form (FR-004); `editFormOpenFor` reducer state flows to the right SceneRow's `editFormOpen` prop in `shared/components/src/panels/StoryboardPanel/__tests__/StoryboardPanel.test.tsx`
- [x] T0\1 [P][US1][test] Extend `SceneEditForm` tests: Submit dispatches `scene-description-edit-submitted` outbound postMessage with trimmed description (or `null` if cleared); Cancel dispatches local `'scene-edit-form-close'` action with no outbound in `shared/components/src/panels/StoryboardPanel/__tests__/SceneEditForm.test.tsx`

### Implementation for User Story 1

- [x] T0\1 [US1] Add chevron control to `SceneRow` — render `codicon-chevron-right`/`codicon-chevron-down` from `vscrui` per R2; `aria-expanded`, `aria-controls`, i18n label from T016; stop-propagation on chevron click so it doesn't trigger row click — in `shared/components/src/panels/StoryboardPanel/SceneRow.tsx`
- [x] T0\1 [US1] Wire double-click on the row body (excluding chevron + overflow trigger) to dispatch `'expand-row-toggle'` — preserves single-click `scene-row-clicked` transport-select (FR-002) — in `shared/components/src/panels/StoryboardPanel/SceneRow.tsx`
- [x] T0\1 [US1] Replace the seven `useState` calls in the webview entry point with `useStoryboardEditReducer`; wire chevron/dbl-click dispatches through the reducer; wire inbound `'scene-edit-form-open'` + `'scenes'` + `'snapshot'` inbound handlers through `dispatch(...)` — in `apps/vscode/src/webview/web/storyboardPanel.tsx` — depends on T014, T023, T024
- [x] T0\1 [US1] Render `<SceneEditForm>` inside the row when `editFormOpenFor === sceneId`; wire Submit to dispatch outbound `scene-description-edit-submitted` via `vscode.postMessage` (and scene-title-rename-committed O1 if the title was edited); wire Cancel to dispatch local `'scene-edit-form-close'` — in `shared/components/src/panels/StoryboardPanel/StoryboardPanel.tsx` + `SceneList.tsx` as needed — depends on T014, T017, T025
- [x] T0\1 [US1] Verify the `activeStoryboardId` / `currentSceneId` / transport-select state flows unchanged (regression guard) by rerunning the existing StoryboardPanel tests — no test changes; confirm green — depends on T025

**Checkpoint**: User Story 1 green. Analyst can open an inline description edit form via chevron or double-click from inside the Storyboard panel; form closes previous on open; Submit commits; Cancel discards. FR-001, FR-002, FR-004 observable.

---

## Phase 4: User Story 2 — Right-click overflow menu with the full action set (Priority: P1)

**Goal**: Every edit op (Edit description, Update to current, Duplicate, Copy to other storyboard, Delete, Refresh thumbnail) is reachable from a Scene row's right-click menu. Keyboard-equivalent via `Shift+F10` / Context Menu key. Each op routes through the existing extension-side service methods and produces the expected Log Panel card.

**Independent Test**: Right-click any Scene row → menu appears with six items. Keyboard: focus row + `Shift+F10` → same menu opens. Pick Delete → row soft-deletes, Undo toast appears; click Undo → row restored. Pick Duplicate → new Scene appears after the source. Pick Copy to other storyboard (plot has ≥2 Storyboards) → quick-pick prompts for destination; Scene appears there. Pick Refresh thumbnail → thumbnail re-renders. Pick Update to current → thumbnail refreshes against current map state. Each of the six ops emits its expected Log Panel card.

### Tests for User Story 2 ⚠️

- [x] T0\1 [P][US2][test] Write `SceneOverflowMenu` unit tests: renders six `role="menuitem"` entries with i18n labels; ArrowDown/ArrowUp cycle focus; `Enter` activates; `Escape` closes; `aria-haspopup="menu"` on trigger; `role="menu"` on container in `shared/components/src/panels/StoryboardPanel/__tests__/SceneOverflowMenu.test.tsx`
- [x] T0\1 [P][US2][test] Add `@axe-core/playwright`-style a11y assertion inside the unit test — axe check on open state, no `serious` / `critical` violations — in `shared/components/src/panels/StoryboardPanel/__tests__/SceneOverflowMenu.test.tsx` (extend T030)
- [x] T0\1 [P][US2][test] Extend `SceneRow` tests: right-click (pointer) + `Shift+F10` (keyboard) dispatch `'overflow-menu-open'` action with the correct `sceneId` + `anchorRect`; clicking outside closes (`'overflow-menu-close'`) in `shared/components/src/panels/StoryboardPanel/__tests__/SceneRow.test.tsx` (extend T020)
- [x] T0\1 [P][US2][test] Extend reducer tests: `overflow-menu-open` sets `overflowMenuOpenFor` + `overflowMenuAnchorRect`; `overflow-menu-close` clears both; invariant `overflowMenuOpenFor !== null ⇒ overflowMenuAnchorRect !== null` in `shared/components/src/panels/StoryboardPanel/__tests__/useStoryboardEditReducer.test.ts` (extend T013)

### Implementation for User Story 2

- [x] T0\1 [US2] Create `SceneOverflowMenu.tsx` — native `<menu role="menu">` with six `<li role="menuitem">` children; keyboard nav per R5; positioned via anchor rect; `onAction(action)` callback — in `shared/components/src/panels/StoryboardPanel/SceneOverflowMenu.tsx` — depends on T030, T031
- [x] T0\1 [US2] Add right-click + `Shift+F10` / Context Menu key handlers to `SceneRow`; dispatch `'overflow-menu-open'` with the row's bounding rect; stop-propagation so parent handlers do not fire — in `shared/components/src/panels/StoryboardPanel/SceneRow.tsx` — depends on T032, T014
- [x] T0\1 [US2] Render `<SceneOverflowMenu>` in `StoryboardPanel` when `overflowMenuOpenFor !== null`; click-outside handler dispatches `'overflow-menu-close'`; `Escape` key handler likewise — in `shared/components/src/panels/StoryboardPanel/StoryboardPanel.tsx` — depends on T034
- [x] T0\1 [US2] Wire menu item callbacks to outbound postMessage dispatches (six messages: **Edit description** dispatches local `'expand-row-toggle'`; **Update to current** → O5; **Duplicate** → O6; **Copy to other storyboard** → O7; **Delete** → O3; **Refresh thumbnail** → O8) — in `shared/components/src/panels/StoryboardPanel/StoryboardPanel.tsx` — depends on T036
- [x] T0\1 [US2] Confirm every outbound postMessage matches the shape in `contracts/postmessage-contract.md` §Outbound exactly; add a TypeScript exhaustiveness check on the dispatch-site `switch` — in `apps/vscode/src/webview/web/storyboardPanel.tsx` — depends on T011, T037
- [x] T0\1 [US2] Verify the six extension-side command handlers (from #218) accept these messages byte-identically to the palette-invoked form (same prompts, same error toasts, same Log Panel cards, per FR-005) — add an integration test mocking `vscode.postMessage` handler and asserting the right `storyboardEditService.*` method is invoked with the right args — in `apps/vscode/tests/unit/storyboardEditService.test.ts` (extend existing — do not duplicate service unit tests)

**Checkpoint**: User Story 2 green. Every Scene action reachable from the in-panel overflow menu; keyboard nav works; all six ops produce matching Log Panel cards. FR-003, FR-005 observable.

---

## Phase 5: User Story 3 — Stale detection + refresh (Priority: P2)

**Goal**: Scenes whose source features have diverged since capture render a stale badge with a tooltip listing unresolved feature IDs. Users can refresh a single Scene's thumbnail (from chevron panel or overflow menu) or bulk-refresh every stale Scene at the Storyboard header. Partial bulk failures don't abort the rest; each Scene emits its own Log card.

**Independent Test**: Capture two Scenes, edit the underlying track features, reopen the Storyboard panel → affected rows show `<StaleBadge>` with tooltip naming diverged feature IDs. Click **Refresh thumbnail** on one row → thumbnail regenerates, badge clears. With ≥ 2 stale Scenes, invoke **Refresh all stale** from the Storyboard header → each regenerates and emits its own Log Panel card. Induce one failure via mock → remaining Scenes still refresh; failed one keeps its badge and surfaces an error toast.

### Tests for User Story 3 ⚠️

- [x] T0\1 [P][US3][test] Extend reducer tests: `scene-stale-flags-updated` replaces `staleFlags` entirely (not merge); empty `flags` array clears the map in `shared/components/src/panels/StoryboardPanel/__tests__/useStoryboardEditReducer.test.ts` (extend T013)
- [x] T0\1 [P][US3][test] Extend `StaleBadge` tests: tooltip renders unresolved feature IDs; click on Refresh dispatches `scene-refresh-thumbnail-clicked` (O8); badge renders only when `stale === true` in `shared/components/src/panels/StoryboardPanel/__tests__/StaleBadge.test.tsx`
- [x] T0\1 [P][US3][test] Write `StoryboardHeader.refresh-all-stale` tests: button renders with count `staleSceneCount`; disabled when count is 0; click dispatches `storyboard-refresh-all-stale-clicked` (O9) with the active storyboardId in `shared/components/src/panels/StoryboardPanel/__tests__/StoryboardHeader.test.tsx` (extend existing)

### Implementation for User Story 3

- [x] T0\1 [US3] Wire inbound `'scene-stale-flags-updated'` handler in the webview entry point to `dispatch({ type: 'scene-stale-flags-updated', flags })` — in `apps/vscode/src/webview/web/storyboardPanel.tsx` — depends on T025
- [x] T0\1 [US3] Read `staleFlags` from reducer state in `StoryboardPanel`; inject per-row into `SceneRow` props (existing `staleReason` / `unresolvedFeatureIds` prop shape) — in `shared/components/src/panels/StoryboardPanel/StoryboardPanel.tsx` — depends on T014, T043
- [x] T0\1 [US3] Render `<StaleBadge>` inside `SceneRow` with tooltip from `unresolvedFeatureIds` when `staleReason !== null`; Refresh action dispatches outbound O8 `scene-refresh-thumbnail-clicked` — in `shared/components/src/panels/StoryboardPanel/SceneRow.tsx` — depends on T044
- [x] T0\1 [US3] Add "Refresh all stale (N)" button to `StoryboardHeader` where `N = staleFlags.values().filter(s => s.stale).length`; click dispatches O9 `storyboard-refresh-all-stale-clicked` — in `shared/components/src/panels/StoryboardPanel/StoryboardHeader.tsx` — depends on T014, T042
- [x] T0\1 [US3] Confirm the extension-side `storyboard-refresh-all-stale-clicked` handler (from #218) iterates stale Scenes, emits a Log Panel card per Scene, and surfaces a summary toast on completion — integration test in `apps/vscode/tests/unit/storyboardEditService.test.ts` (extend existing)

**Checkpoint**: User Story 3 green. Stale detection + single-Scene refresh + bulk refresh all work end-to-end with Log cards per Scene. FR-011, FR-012 observable; SC-001 strengthened.

---

## Phase 6: User Story 4 — Web-shell harness + primary Playwright surface (Priority: P2)

**Goal**: A query-string-driven web-shell harness that mounts the Storyboard panel against an in-memory mock extension port, plus the primary Playwright E2E spec driving the full polish loop without VS Code. This is the surface that produces the #218 evidence screenshots and interaction GIF.

**Independent Test**: Run `pnpm --filter @debrief/web-shell dev`, open `http://localhost:5173/?storyboard-edit-harness=1` → panel renders with fixture Scenes. Append `&stale=sceneA,sceneC` → sceneA and sceneC start with stale badges. Append `&pendingDelete=sceneB` → sceneB shows pending-delete state. Append `&missingData=sceneC:track-alpha,track-bravo` → sceneC shows missing-data remediation affordance. Run `cd apps/web-shell && node run-playwright.mjs storyboard-edit` → full polish loop runs end-to-end without VS Code; all screenshots land under `specs/218-storyboarding-edit/evidence/screenshots/`; interaction GIF produced.

### Web-Shell E2E Tests for User Story 4 🖥️

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Use `apps/web-shell/run-playwright.mjs` which extracts `@sparticuz/chromium`. Do NOT skip these tests citing "can't install browsers". See `docs/project_notes/playwright-installation-research.md`.

- [x] T0\1 [P][US4][test] Write query-string parser tests: `?stale=A,B`, `?pendingDelete=X`, `?missingData=S:f1,f2` all parse to the right initial state shape — in `apps/web-shell/src/__tests__/StoryboardEditHarness.querystring.test.ts`
- [x] T0\1 [P][US4][test] Write mock-extension-port unit tests: inbound shape parity with the real extension's messages (per `contracts/postmessage-contract.md`); outbound capture exposes a test spy — in `apps/web-shell/src/__tests__/StoryboardEditHarness.mockport.test.ts`
- [x] T0\1 [US4] Add `StoryboardEditPage` page object exposing the selectors listed in `plan.md` §Web-Shell E2E Testing (chevron, overflow-trigger, menu items, edit-form, undo-toast, stale-badge, refresh-all, copy-to-other-picker, missing-data-remediation) in `apps/web-shell/playwright/pages/StoryboardEditPage.ts` — depends on T058 (selectors added in impl)

### Implementation for User Story 4

- [x] T0\1 [US4] Create `StoryboardEditHarness.tsx` in `apps/web-shell/src/`: mounts `<StoryboardPanel>`; instantiates the mock extension port; feeds initial state from `URLSearchParams` (`stale`, `pendingDelete`, `missingData` knobs); exposes the harness reducer so the mock port and the panel share one state source (per research.md R1, R6) — in `apps/web-shell/src/StoryboardEditHarness.tsx` — depends on T014, T050, T051
- [x] T0\1 [US4] Add top-level branch in `App.tsx`: if `URLSearchParams.has('storyboard-edit-harness')` → render `<StoryboardEditHarness>` instead of the standard layout — in `apps/web-shell/src/App.tsx` — depends on T053
- [x] T0\1 [US4] Confirm the harness mock port emits the same message shapes the extension emits (copy contract structs from `apps/vscode/src/types/storyboardPanelMessages.ts`; do not re-define) — add a type-level compile-time assertion — in `apps/web-shell/src/StoryboardEditHarness.tsx` — depends on T053
- [x] T0\1 [US4] Seed fixture Scenes (3–5) + one fixture Storyboard + one second fixture Storyboard (for the copy-to-other flow) in `apps/web-shell/src/storyboard-edit-fixtures.ts` — depends on T053

### Playwright E2E for User Story 4 (primary surface)

- [x] T0\1 [US4][test] Write the primary E2E spec driving the full polish loop — scenarios from `plan.md` §Web-Shell E2E Testing table (description edit, delete+undo, duplicate-at-colliding-timestamp, copy-to-other + induced deep-copy-failure, update-to-current, stale single + bulk refresh, storyboard rename + describe, missing-data remediation); every successful op asserts a `[data-testid="log-panel-card"]` emission with the expected `data-op` attribute (FR-035) — in `apps/web-shell/playwright/tests/storyboard-edit.spec.ts` — depends on T052, T053, T054, T055, T056
- [x] T0\1 [US4] Add `data-testid` attributes to every interactive element the E2E spec selects — `scene-row-chevron`, `scene-overflow-trigger`, `scene-edit-form`, `undo-toast`, `stale-badge`, `refresh-all-stale`, `copy-to-other-picker`, `copy-error-toast`, `missing-data-remediation`, `duplicate-timestamp-prompt`, `log-panel-card` — in shared components (`SceneRow.tsx`, `SceneOverflowMenu.tsx`, `UndoToast.tsx`, `StaleBadge.tsx`, `StoryboardHeader.tsx`, `SceneEditForm.tsx`) — depends on T023, T034, T045, T046
- [x] T0\1 [US4] Configure `recordVideo` in the Playwright config for the storyboard-edit suite; capture video to `test-results/`; post-process into `specs/218-storyboarding-edit/evidence/screenshots/interaction.gif` (< 5 s, < 2 MB per FR-041) — add a gif-conversion helper at `apps/web-shell/playwright/helpers/videoToGif.ts` if none exists — depends on T057
- [x] T0\1 [US4] Write screenshots directly into `specs/218-storyboarding-edit/evidence/screenshots/` using the `properties-screenshots.spec.ts` path-resolution pattern — all seven screenshots enumerated in #218's evidence-requirements table — FR-040 — in the same spec file — depends on T057

**Checkpoint**: User Story 4 green. Web-shell harness is the primary E2E surface; full polish loop runs without VS Code; all #218 deferred screenshots + interaction GIF captured.

---

## Phase 7: User Story 5 — Error triage (viewport race + Failed-to-load-plot) (Priority: P3)

**Goal**: Opening a fresh plot and immediately capturing a Scene succeeds 100% of the time (no "viewport not reported" toast). Plots that previously failed with "Failed to load plot" either open cleanly after the fix, or the Debrief output channel records the precise failure step so targeted diagnosis is possible.

**Independent Test**:
(a) Open a plot never loaded this session → immediately press Capture before any map interaction → capture succeeds with no toast.
(b) Open the specific plot from PR #520's manual-test thread → plot opens cleanly. If any other plot still fails, the output channel records which loadPlot branch returned null.

### Tests for User Story 5 ⚠️

- [x] T0\1 [P][US5][test] Write a web-shell E2E scenario: open fresh plot, immediately click Capture (no map interaction first), assert no `'viewport not reported'` error toast, assert capture succeeds — in `apps/web-shell/playwright/tests/storyboard-edit.spec.ts` (extend T057)
- [x] T0\1 [P][US5][test] Write a unit test for the diagnostic-logging path in `loadPlot`: each null-return branch (item-not-found / parse-error / missing-required-field / caught-exception) writes a distinct structured log entry naming the cause + plot URI to the output channel — in `apps/vscode/tests/unit/stacService.test.ts` (extend existing)

### Implementation — Viewport race

- [x] T0\1 [US5] In `mapView.tsx`: emit an initial viewport postMessage `{ center, zoom, bounds }` both after React `useEffect(() => {...}, [])` mount AND after Leaflet's `map.whenReady(() => {...})` — double-emit is safe because the session-store reducer is idempotent per field (per research.md R8) — in `apps/vscode/src/webview/web/mapView.tsx`
- [x] T0\1 [US5] Update the extension-side viewport handler to silently accept double-emit (already idempotent; add a comment if needed) — in `apps/vscode/src/views/` host code that receives viewport messages

### Implementation — STAC-load diagnostic + fix

- [x] T0\1 [US5] Add structured diagnostic logging at each null-return branch in `loadPlot` — enumerate: item path not found, item file unreadable, JSON parse error, required field missing (e.g. `properties.datetime`), caught exception — each branch writes a distinct line to the Debrief output channel with the plot URI + specific cause (per research.md R9) — in `apps/vscode/src/services/stacService.ts`
- [x] T0\1 [US5] Reproduce `Failed to load plot` against the specific plot identified in PR #520's manual test thread; capture the output-channel log entries; root-cause from the diagnostic output — document findings in `specs/230-storyboard-edit-wiring/evidence/stac-load-diagnostic-log.md` — depends on T074
- [x] T0\1 [US5] Fix the root cause identified in T075 (likely candidates per SRD §3.8: symlinked store-dir path resolution / missing `properties.datetime` tolerance / `openPlot`/session-init race) — narrow fix; do not over-refactor — in `apps/vscode/src/services/stacService.ts` — depends on T075
- [x] T0\1 [US5] Add a regression test for T076's root-cause fix (use a fixture that matches the reproduction case from PR #520) — in `apps/vscode/tests/unit/stacService.test.ts` — depends on T076
- [x] T0\1 [US5][test] Re-run reproduction against the original PR #520 plot after T076; confirm the plot opens cleanly; update `stac-load-diagnostic-log.md` with the "after fix" section — depends on T076

### Additional-errors sweep (FR-053)

- [x] T0\1 [US5] Manual test pass across the polish loop (see `spec.md` edge-cases table) — for every new user-visible error surfaced: if root cause is a wiring gap introduced by this feature or #218, fix it here; otherwise open a new BACKLOG entry with a reproduction recipe — document outcomes in `evidence/stac-load-diagnostic-log.md` addendum or a new `evidence/additional-errors-triage.md`

**Checkpoint**: User Story 5 green. First-open experience is clean; `Failed to load plot` either fixed or precisely attributable from output-channel logs; SC-005, SC-006 observable.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Upgrade the four Storybook stories to use the shared reducer, run the thin code-server chrome-only test, capture all evidence artefacts, write the shipped blog post, create the feature PR.

### Storybook stories (interactive upgrade)

- [x] T0\1 [P][US4] Upgrade `WithEditForm` story to consume `useStoryboardEditReducer` via the harness's mock-port wrapper — story clicks the chevron for real → form opens → Submit commits against the story's mock port → reviewer sees Log card — in `shared/components/src/panels/StoryboardPanel/StoryboardPanel.stories.tsx`
- [x] T0\1 [P][US4] Upgrade `WithUndoToast` story likewise — Delete → toast → Undo restores the row
- [x] T0\1 [P][US4] Upgrade `WithStaleBadge` story likewise — Refresh clears the badge on success; mock port has an `inducedFailure` knob for the error-toast path
- [x] T0\1 [P][US4] Upgrade `WithMissingDataRemediation` story likewise — remediation affordance is clickable and keyboard-reachable

### Thin code-server E2E (VS Code chrome only)

- [x] T0\1 [US2][test] Write `test-storyboard-edit.spec.ts` covering ONLY the flows that require real VS Code chrome — command palette invocation for each of the 11 new commands, `showInputBox` for rename / duplicate-timestamp / storyboard rename, `showQuickPick` for copy-to-other destination, native `showInformationMessage` / `showWarningMessage` toasts — do NOT re-test click flows already covered in the web-shell suite (FR-034) — model selectors on `test-storyboard-playback.spec.ts:261` — in `tests/e2e/test-storyboard-edit.spec.ts`
- [x] T0\1 [US2] Capture one `vscode-native-chrome.png` screenshot mid-flow (input-box or quick-pick visible) to `specs/218-storyboarding-edit/evidence/screenshots/vscode-native-chrome.png` — in `tests/e2e/test-storyboard-edit.spec.ts` — depends on T084

### Full-suite verification

- [x] T0\1 Run `task verify` on the branch; confirm 2,983 test baseline from #218 + all new tests green; capture output — in `specs/230-storyboard-edit-wiring/evidence/verify-output.txt`
- [x] T0\1 [P] Run `cd apps/web-shell && node run-playwright.mjs storyboard-edit` — confirm web-shell E2E green; output lands in `evidence/webview-e2e-summary.md`
- [x] T0\1 [P] Run the thin code-server suite `pnpm --filter @debrief/vscode test:e2e -- test-storyboard-edit` — confirm green

### A11y audit

- [x] T0\1 [P] Run `@axe-core/playwright` audit against (a) the Storyboard panel with overflow menu open, (b) panel with edit form + stale badge both visible, (c) each of the four upgraded Storybook stories — per research.md R11 — capture results to `specs/230-storyboard-edit-wiring/evidence/a11y-report.md` — no `serious` / `critical` violations permitted; `moderate` with a documented accepted-risk line allowed

### Perf regression guard

- [x] T0\1 Run the #218 SC-014 perf budget test (`onPlotOpened` median ≤ 50 ms) against the 230 branch; confirm no regression — append result to `specs/230-storyboard-edit-wiring/evidence/perf-budget-230.md`

### Evidence Collection (REQUIRED)

> **Purpose**: Capture artifacts for PR description + future blog post. `evidence/opening-context.md` was already written during `/speckit.plan`.

- [x] T0\1 Capture test summary using template `.specify/templates/evidence/test-summary-template.md` with YAML front matter (feature, captured_at, git_sha, tests_passed/failed/skipped, coverage_pct) in `specs/230-storyboard-edit-wiring/evidence/test-summary.md`
- [x] T0\1 Record polish-loop usage demonstration (reducer action → panel state → Log Panel card, with a rename-describe-delete-undo walkthrough) in `specs/230-storyboard-edit-wiring/evidence/usage-example.md`
- [x] T0\1 [P] Write web-shell + code-server E2E summary (scenario count, pass/fail counts, screenshot index pointing at `specs/218-storyboarding-edit/evidence/screenshots/`) in `specs/230-storyboard-edit-wiring/evidence/webview-e2e-summary.md`
- [x] T0\1 [P] Write viewport-race diagnostic log (before/after emit logs; repro steps; regression guard) in `specs/230-storyboard-edit-wiring/evidence/viewport-diagnostic-log.md`
- [x] T0\1 [P] Confirm `stac-load-diagnostic-log.md` from T075/T076/T078 is complete (diagnostic findings, root cause, fix, regression test reference)
- [x] T0\1 [P] Confirm all seven #218 screenshots captured + `interaction.gif` rendered under `specs/218-storyboarding-edit/evidence/screenshots/` — index them in the E2E summary (T093)

### Media Content

- [x] T0\1 Create shipped blog post via the Content Specialist agent — **first three sections copied verbatim from `specs/230-storyboard-edit-wiring/evidence/opening-context.md`**; new sections: Screenshots (embed from `specs/218-storyboarding-edit/evidence/screenshots/`), By the Numbers (test counts, perf-budget hold, zero new deps, two errors triaged), Lessons Learned (diagnostic-first discipline paid off; shared reducer eliminated story/production drift), What's Next (full thumbnail deep-copy #216/#174; LogPanel collapser renderer wiring #176; LinkML round-trip #215) — in `specs/230-storyboard-edit-wiring/media/shipped-post.md`

### PR Creation

- [x] T0\1 Create PR and publish blog: run `/speckit.pr`

**Task T098 MUST run last. It depends on every preceding task in Phases 1–8 completing green.**

---

## Dependencies

### Phase Dependencies

- **Phase 1 (Setup)**: No prerequisites — can start immediately on the 230 worktree.
- **Phase 2 (Foundation)**: Depends on Phase 1 green. **Blocks every user story.**
- **Phase 3 (US1 — description edit)**: Depends on Phase 2 complete.
- **Phase 4 (US2 — overflow menu)**: Depends on Phase 2 complete. Can run in parallel with Phase 3 if staffed; both touch `StoryboardPanel.tsx` so file-level serialisation applies at the merge boundary.
- **Phase 5 (US3 — stale + refresh)**: Depends on Phase 2 + (for Log-card assertions) Phase 3 or Phase 4 landed for the `data-testid="log-panel-card"` hooks (T058).
- **Phase 6 (US4 — web-shell harness + primary Playwright)**: Depends on Phase 2 for shared reducer + contract types; depends on Phases 3, 4, 5 for the full polish loop to be drivable end-to-end. Playwright spec (T057) is the gate.
- **Phase 7 (US5 — error triage)**: Largely independent of Phases 3–5 for the viewport fix (T072, T073). The STAC-load fix path (T074..T078) depends on reaching the reproduction plot, so it benefits from Phase 6's harness being live for regression testing.
- **Phase 8 (Polish)**: Depends on Phases 1–7 complete.

### Task-level dependencies (selected)

- T014 (reducer hook) ← T010, T011, T012, T013
- T017 (refresh payload) ← T012
- T025 (webview entry point reducer rewrite) ← T014, T023, T024
- T026 (form Submit dispatches) ← T014, T017, T025
- T034 (SceneOverflowMenu) ← T030, T031
- T035 (SceneRow right-click) ← T014, T032
- T036 (render menu) ← T034
- T037 (menu action dispatch) ← T036
- T039 (integration) ← T011, T037
- T044 (inject staleFlags) ← T014, T043
- T045 (StaleBadge render) ← T044
- T046 (refresh-all-stale button) ← T014, T042
- T053 (harness page) ← T014, T050, T051
- T054 (App.tsx branch) ← T053
- T057 (primary E2E spec) ← T052, T053, T054, T055, T056, T058
- T058 (data-testids) ← T023, T034, T045, T046
- T059 (GIF pipeline) ← T057
- T060 (screenshot capture) ← T057
- T075 (reproduction) ← T074
- T076 (STAC fix) ← T075
- T077 (regression test) ← T076
- T078 (post-fix repro) ← T076
- T084 (code-server E2E) ← T023, T034, T037, T045, T046 (needs every click flow landed so the command handlers exist)
- T091..T096 (evidence collection) ← T086, T087, T088, T089, T090
- T097 (blog post) ← T091, T092, T093, T094, T095, T096
- T098 (`/speckit.pr`) ← every preceding task complete and green

### Parallel opportunities

- **Phase 2 foundation**: T013, T016, T018 can launch in parallel (independent files). T010/T011/T012 serialise on the same file (but can be combined into one commit).
- **Phase 3 US1 tests**: T020, T021, T022 in parallel.
- **Phase 4 US2 tests**: T030, T031, T032, T033 in parallel; T031 extends T030 so run sequentially *within* that file.
- **Phase 5 US3 tests**: T040, T041, T042 in parallel.
- **Phase 6 US4 tests**: T050, T051 in parallel.
- **Phase 8 story upgrades**: T080, T081, T082, T083 in parallel (same file — commit together but implement independently). T087, T088, T089, T090 run in parallel once their inputs are ready.
- **Cross-story parallelism**: With two or more developers, Phase 3 and Phase 4 can run in parallel after Phase 2 is done; Phase 5, 6, 7 then sequence against the US1/US2 exit.

---

## Implementation Strategy

### Incremental Delivery

1. **Phase 1 + Phase 2** → foundation ready (reducer hook + contract extensions + enriched refresh). Every unit test for the reducer green before proceeding.
2. **Phase 3 (US1)** → first tangible user value: chevron-driven description edit from inside the panel. Ship after checkpoint to reviewers as an interim demo.
3. **Phase 4 (US2)** → full action set reachable from the overflow menu. Panel is "fully wired" from a user's perspective after this phase.
4. **Phase 5 (US3)** → stale detection + refresh. Orthogonal to 3/4 at the reducer layer; extends user value.
5. **Phase 6 (US4)** → web-shell harness + primary Playwright E2E. This is where the Phase 6-deferred #218 evidence (screenshots + interaction GIF) actually lands.
6. **Phase 7 (US5)** → error triage. Viewport-race fix is mechanical; STAC-load triage is diagnostic-first. Do not short-circuit to a fix without the diagnostic log.
7. **Phase 8 (Polish)** → interactive stories upgrade; code-server thin chrome test; evidence + blog + PR.

### Parallel Team Strategy

Two developers:

- **Both** complete Phase 1 + Phase 2 together.
- After Phase 2 checkpoint:
  - Dev A: Phase 3 (US1 — chevron + form wiring)
  - Dev B: Phase 4 (US2 — overflow menu)
- Merge A + B; both converge on Phase 5 (stale) and Phase 6 (harness). US3 gates on the `data-testid="log-panel-card"` hooks that Phase 3/4 introduce.
- **Phase 7 runs in parallel with Phase 6** when staffed: viewport fix (A) + STAC diagnostic pass (B) can complete alongside harness work.
- Both converge on Phase 8 polish + PR.

### Test-first discipline

For every user story: tests are written *first* (`[test]` labelled tasks come before implementation tasks within each phase) and MUST FAIL before the implementation lands. Reducer is pure → reducer tests are the fastest feedback loop; start every session there when rewriting an area. Do not skip tests to ship faster — CLAUDE.md's global rule is explicit on this.

### Commit cadence

One atomic commit per logical task group (per Article XIII). Suggested rhythm: commit after each `[test]` group green + the implementation task(s) that satisfy them. Do not commit failing tests except as an explicit "red" milestone preceding the implementation commit on the same day.

---

## Notes

- **`[P]` tasks**: different files, no dependencies — safe to run concurrently or commit in parallel.
- **`[Story]` labels** (`[US1]`..`[US5]`): trace each task to its user story for traceability.
- **Each user story is independently completable and testable** per the checkpoint at the end of its phase.
- **Evidence is required** — T091..T096 are not optional; the PR description draws on them.
- **Run `/speckit.pr` only after T086–T097 are all green and captured.** T098 is the single PR trigger for both the feature PR and the cross-repo blog PR.
- **Do not wire `collapseStoryboardEdits` into `LogTimeline`** — out of scope (belongs to #176; `spec.md` §Out-of-scope is explicit).
- **Do not implement a full thumbnail deep-copy on copy-to-other-storyboard** — out of scope (#216 / #174 follow-up).
- **Screenshots land under `specs/218-storyboarding-edit/evidence/screenshots/`**, not this feature's evidence directory — FR-040 is explicit and the blog post / PR description rely on this.
