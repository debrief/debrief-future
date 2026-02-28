# Tasks: Result View Auto-Refresh on Logical ID Change

**Input**: Design documents from `/specs/001-result-auto-refresh/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included — Constitution Article VI.2 requires unit tests for all service code.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. These are used in PR descriptions, documentation, and future blog posts.

**Evidence Directory**: `specs/001-result-auto-refresh/evidence/`
**Media Directory**: `specs/001-result-auto-refresh/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Vitest results for controller, hook, and viewport tests | After all tests pass |
| usage-example.md | Code example showing controller + hook integration | After core implementation complete |
| screenshots/auto-refresh-active.png | Chart panel with active auto-refresh indicator | After UI integration |
| screenshots/auto-refresh-paused.png | Chart panel with paused indicator and pending badge | After pause/resume works |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | During /speckit.plan (done) |
| media/linkedin-planning.md | LinkedIn summary for planning | During /speckit.plan (done) |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup

**Purpose**: Create the module structure and type definitions for the auto-refresh feature.

- [x] T001 Create auto-refresh types module `services/session-state/src/refresh/types.ts`
- [x] T002 [P] Create auto-refresh module index with public exports `services/session-state/src/refresh/index.ts`
- [x] T003 [P] Create useAutoRefresh hook file `shared/components/src/hooks/useAutoRefresh.ts`

---

## Phase 2: Foundation (Blocking Prerequisites)

**Purpose**: Core auto-refresh controller and ChartRenderer viewport extension that ALL user stories depend on.

**CRITICAL**: No user story work can begin until this phase is complete.

### Tests for Foundation

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T004 [test] Write controller unit tests: register, dispose, event forwarding `services/session-state/tests/unit/refresh/controller.test.ts`
- [x] T005 [P][test] Write viewport capture/restore unit tests `shared/components/src/ChartRenderer/viewport.test.ts`

### Implementation for Foundation

- [x] T006 Implement AutoRefreshController: register/unregister, event subscription, state management `services/session-state/src/refresh/controller.ts`
- [x] T007 Extend ChartRenderer with useImperativeHandle exposing ChartRendererHandle (captureViewport, restoreViewport) `shared/components/src/ChartRenderer/ChartRenderer.tsx`
- [x] T008 Implement useAutoRefresh React hook: register on mount, unregister on unmount, expose state/pause/resume/toggle `shared/components/src/hooks/useAutoRefresh.ts`

**Checkpoint**: Controller can register views, subscribe to registry events, and forward change events. ChartRenderer exposes viewport capture/restore. Hook bridges controller to React lifecycle.

---

## Phase 3: User Story 1 - Auto-Refresh on Tool Re-Run (Priority: P1)

**Goal**: When an analyst has a result chart open and re-runs the tool, the chart auto-refreshes with new data.

**Independent Test**: Open a result view, modify the underlying dataset file, verify the view updates automatically.

### Tests for User Story 1

- [x] T009 [test] Write controller test: change event triggers onRefresh callback `services/session-state/tests/unit/refresh/controller.test.ts`
- [x] T010 [P][test] Write controller test: file path change triggers refresh with new path `services/session-state/tests/unit/refresh/controller.test.ts`

### Implementation for User Story 1

- [x] T011 Implement controller event handling: subscribe to registry per resultId, invoke onRefresh callback on change `services/session-state/src/refresh/controller.ts`
- [x] T012 Integrate useAutoRefresh hook into ChartPanelWrapper: bind active tab to auto-refresh, reload data on refresh callback `shared/components/src/panels/ChartPanelWrapper.tsx`
- [x] T013 Wire AutoRefreshController in VS Code extension: create controller, pass registry, connect to webview panel `apps/vscode/src/extension.ts`
- [x] T014 Add provenance logging for refresh events via LogService (FR-012) `services/session-state/src/refresh/controller.ts`

**Checkpoint**: Result views auto-refresh when registry emits a change event. Provenance is recorded.

---

## Phase 4: User Story 2 - Viewport Preservation Across Refreshes (Priority: P1)

**Goal**: Zoom and pan state are preserved when a chart auto-refreshes with new data.

**Independent Test**: Open a result view, zoom/pan to a region, trigger a data update, verify viewport is unchanged.

### Tests for User Story 2

- [x] T015 [test] Write viewport test: signals captured before re-render, restored after `shared/components/src/ChartRenderer/viewport.test.ts`
- [x] T016 [P][test] Write controller test: refresh callback receives viewport state from captureViewport `services/session-state/tests/unit/refresh/controller.test.ts`

### Implementation for User Story 2

- [x] T017 Implement captureViewport: read Vega view signals matching VIEWPORT_SIGNAL_PREFIXES `shared/components/src/ChartRenderer/ChartRenderer.tsx`
- [x] T018 Implement restoreViewport: write signals back to Vega view and run dataflow `shared/components/src/ChartRenderer/ChartRenderer.tsx`
- [x] T019 Update ChartPanelWrapper refresh flow: capture viewport before data reload, restore after re-render `shared/components/src/panels/ChartPanelWrapper.tsx`

**Checkpoint**: Zooming into a chart, triggering an update, and verifying the zoom level is preserved.

---

## Phase 5: User Story 3 - Multiple Simultaneous Result Views (Priority: P2)

**Goal**: Only the view(s) bound to the changed logical ID refresh; other views stay undisturbed.

**Independent Test**: Open two result views with different logical IDs, update one, verify only the affected view refreshes.

### Tests for User Story 3

- [x] T020 [test] Write controller test: two views registered to different IDs, change event for one ID triggers only that view's callback `services/session-state/tests/unit/refresh/controller.test.ts`
- [x] T021 [P][test] Write controller test: two views bound to same ID both receive refresh independently `services/session-state/tests/unit/refresh/controller.test.ts`

### Implementation for User Story 3

- [x] T022 Implement per-resultId subscription in controller: each register() creates an independent subscription, multiple views per ID supported `services/session-state/src/refresh/controller.ts`
- [x] T023 Implement debouncing per logical result ID (300ms trailing edge) in controller (FR-005) `services/session-state/src/refresh/controller.ts`
- [x] T024 Implement visibility-deferred refresh: setVisible(false) sets stale flag, setVisible(true) flushes stale (FR-006) `services/session-state/src/refresh/controller.ts`
- [x] T025 Connect tab activation to setVisible in ChartPanelWrapper: active tab = visible, inactive tabs = not visible `shared/components/src/panels/ChartPanelWrapper.tsx`

**Checkpoint**: Multiple result views work independently. Debouncing prevents burst re-renders. Background tabs defer refresh.

---

## Phase 6: User Story 4 - Pause and Resume Auto-Refresh (Priority: P3)

**Goal**: Analysts can pause auto-refresh per view and resume to get latest data.

**Independent Test**: Pause auto-refresh, update data, verify no change, resume, verify view updates.

### Tests for User Story 4

- [x] T026 [test] Write controller test: pause() suppresses refresh, pending event captured `services/session-state/tests/unit/refresh/controller.test.ts`
- [x] T027 [P][test] Write controller test: resume() flushes pending event, triggers refresh `services/session-state/tests/unit/refresh/controller.test.ts`
- [x] T028 [P][test] Write hook test: toggle() switches between paused/active, hasPendingUpdate reflects state `shared/components/src/hooks/useAutoRefresh.test.ts`

### Implementation for User Story 4

- [x] T029 Implement pause/resume in controller: pause stores pendingEvent, resume flushes it (FR-007, FR-008) `services/session-state/src/refresh/controller.ts`
- [x] T030 Implement onStateChange subscription in controller for UI reactivity `services/session-state/src/refresh/controller.ts`
- [x] T031 Add pause/resume icon button to ChartPanelWrapper tab header (next to close button) `shared/components/src/panels/ChartPanelWrapper.tsx`
- [x] T032 Add pending update badge to tab header when paused with pending event `shared/components/src/panels/ChartPanelWrapper.tsx`
- [x] T033 Handle error/unavailable states: display warning banner with last-known data (FR-009, FR-010) `shared/components/src/panels/ChartPanelWrapper.tsx`

**Checkpoint**: Pause/resume toggle visible in tab header. Pending badge appears when paused with updates. Error states show warning banners.

---

## Phase 7: Storybook & E2E

**Purpose**: Add Storybook stories for the auto-refresh feature and E2E tests.

> **PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip these tests. The project uses `@sparticuz/chromium` (bundled Linux Chromium via npm). Run `node apps/web-shell/run-playwright.mjs` to extract and configure. Full details: `docs/project_notes/playwright-installation-research.md`

### Storybook Stories

- [ ] T034 Add auto-refresh Storybook story: simulates data updates with viewport preservation `shared/components/src/ChartRenderer/ChartRenderer.stories.tsx`
- [ ] T035 [P] Add pause/resume Storybook story: demonstrates toggle and pending badge `shared/components/src/ChartRenderer/ChartRenderer.stories.tsx`

### E2E Tests

- [ ] T036 Create Playwright test for auto-refresh rendering across theme variants `shared/components/e2e/ChartAutoRefresh.spec.ts`
- [ ] T037 [P] Add interaction tests: data update trigger, pause/resume toggle, zoom-then-refresh `shared/components/e2e/ChartAutoRefresh.spec.ts`
- [ ] T038 Run e2e tests: `pnpm --filter @debrief/components test:e2e ChartAutoRefresh`

**Checkpoint**: Storybook stories demonstrate auto-refresh behaviour. E2E tests capture screenshots across themes.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Evidence collection, media content, and PR creation.

### Evidence Collection

- [ ] T039 Create evidence directory `specs/001-result-auto-refresh/evidence/`
- [ ] T040 Capture test summary with pass/fail counts `specs/001-result-auto-refresh/evidence/test-summary.md`
- [ ] T041 [P] Create usage example showing controller + hook integration `specs/001-result-auto-refresh/evidence/usage-example.md`
- [ ] T042 [P] Capture screenshots of auto-refresh states `specs/001-result-auto-refresh/evidence/screenshots/`

### E2E Evidence Collection

- [ ] T043 Run full e2e suite: `pnpm --filter @debrief/components test:e2e`
- [ ] T044 [P] Capture theme variant screenshots `specs/001-result-auto-refresh/evidence/screenshots/`
- [ ] T045 Document e2e results `specs/001-result-auto-refresh/evidence/e2e-summary.md`

### Media Content

- [ ] T046 Create shipped blog post `specs/001-result-auto-refresh/media/shipped-post.md`
- [ ] T047 [P] Create LinkedIn shipped summary `specs/001-result-auto-refresh/media/linkedin-shipped.md`

### PR Creation

- [ ] T048 Create PR and publish blog: run /speckit.pr

**Task T048 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundation (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Phase 2 — core auto-refresh
- **User Story 2 (Phase 4)**: Depends on Phase 2 — viewport preservation (can run in parallel with Phase 3)
- **User Story 3 (Phase 5)**: Depends on Phase 3 — multi-view + debounce builds on basic refresh
- **User Story 4 (Phase 6)**: Depends on Phase 2 — pause/resume (can run in parallel with Phases 3-5)
- **Storybook & E2E (Phase 7)**: Depends on Phases 3-6 complete
- **Polish (Phase 8)**: Depends on all phases complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundation — no dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundation — no dependencies on other stories (parallel with US1)
- **User Story 3 (P2)**: Depends on US1 completion — builds on basic refresh with multi-view isolation and debouncing
- **User Story 4 (P3)**: Can start after Foundation — no dependencies on other stories (parallel with US1/US2)

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Types and contracts before service logic
- Service logic before UI integration
- Core implementation before edge case handling

### Parallel Opportunities

- Phase 1: All setup tasks marked [P] can run in parallel
- Phase 2: T004 and T005 (tests) can run in parallel
- Phase 3 & Phase 4: User Stories 1 and 2 can run in parallel (both depend only on Foundation)
- Phase 6: Can run in parallel with Phases 3-5 (depends only on Foundation)
- Phase 8: Evidence tasks marked [P] can run in parallel

---

## Parallel Example: Phases 3 & 4

```bash
# US1 (auto-refresh) and US2 (viewport) can run in parallel:
# Stream A: Phase 3 tasks T009 → T014
# Stream B: Phase 4 tasks T015 → T019

# Within Phase 5, tests can run in parallel:
Task T020: "controller test: two views, different IDs"
Task T021: "controller test: two views, same ID"
```

---

## Implementation Strategy

### Incremental Delivery

1. Complete Setup + Foundation → Controller shell, viewport API, hook shell
2. Add User Story 1 → Basic auto-refresh works end-to-end
3. Add User Story 2 → Viewport preserved across refreshes
4. Add User Story 3 → Multi-view isolation + debouncing
5. Add User Story 4 → Pause/resume UI toggle
6. Storybook + E2E → Visual testing and evidence
7. Polish → Evidence, media, PR

### Single Developer Strategy

1. Phase 1 + Phase 2 (Setup + Foundation)
2. Phase 3 (US1 — core auto-refresh)
3. Phase 4 (US2 — viewport preservation)
4. Phase 5 (US3 — multi-view + debounce)
5. Phase 6 (US4 — pause/resume)
6. Phase 7 (Storybook + E2E)
7. Phase 8 (Polish + PR)

---

## Notes

- [P] tasks = different files, no dependencies
- [test] = test task, write before implementation
- Each user story is independently testable at its checkpoint
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **Evidence is required** — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
