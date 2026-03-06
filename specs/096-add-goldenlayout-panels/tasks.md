# Tasks: GoldenLayout Panel Management

**Input**: Design documents from `/specs/096-add-goldenlayout-panels/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

---

## Evidence Requirements

**Evidence Directory**: `specs/096-add-goldenlayout-panels/evidence/`
**Media Directory**: `specs/096-add-goldenlayout-panels/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Vitest + Playwright results with pass/fail/coverage | After all tests pass |
| usage-example.md | How to register a new panel type and see it in the layout | After Panel Registry works |
| screenshots/default-layout.png | Screenshot of the 5-panel default layout | After US1 complete |
| screenshots/drag-dock.png | Screenshot showing drag-and-dock in progress | After US2 complete |
| screenshots/popout-window.png | Screenshot showing a popped-out panel window | After US3 complete |
| screenshots/layout-persistence.png | Before/after reload showing preserved layout | After US4 complete |
| e2e-summary.md | Playwright E2E test summary with theme variants | After E2E tests pass |

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

**Purpose**: Install dependencies, create directory structure, import GoldenLayout CSS

- [ ] T001 Install `golden-layout` and `shared-zustand` dependencies `apps/web-shell/package.json`
- [ ] T002 [P] Create PanelWorkspace module directory `shared/components/src/PanelWorkspace/index.ts`
- [ ] T003 [P] Create panels wrapper directory `shared/components/src/panels/`
- [ ] T004 Import GoldenLayout base CSS in web-shell entry point `apps/web-shell/src/main.tsx`

---

## Phase 2: Foundation (Blocking Prerequisites)

**Purpose**: Core infrastructure that ALL user stories depend on — Panel Registry, GoldenLayout React bridge, default layout config, and GoldenLayout theme

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 [test] Write unit tests for Panel Registry `shared/components/src/__tests__/panelRegistry.test.ts`
- [ ] T006 Implement Panel Registry (register, unregister, get, has, getAll, getTypes) `shared/components/src/PanelWorkspace/panelRegistry.ts`
- [ ] T007 [test] Write unit tests for layout persistence (save, load, version mismatch, corrupt data, localStorage unavailable) `shared/components/src/__tests__/layoutPersistence.test.ts`
- [ ] T008 Implement layout persistence module (save, load, validate, version check) `shared/components/src/PanelWorkspace/layoutPersistence.ts`
- [ ] T009 Define default 5-panel layout config (sidebar column 25% + content column 75%) `shared/components/src/PanelWorkspace/defaultLayout.ts`
- [ ] T010 Implement GoldenLayout React bridge (bindComponentEvent, createRoot, unbindComponentEvent, unmount) `shared/components/src/PanelWorkspace/goldenLayoutBridge.ts`
- [ ] T011 Create GoldenLayout dark theme CSS using existing VS Code CSS variables `shared/components/src/PanelWorkspace/PanelWorkspace.css`
- [ ] T012 Create PanelWorkspace component shell (mounts GoldenLayout, loads default layout, wires bridge) `shared/components/src/PanelWorkspace/PanelWorkspace.tsx`
- [ ] T013 Export PanelWorkspace and Panel Registry from shared components barrel `shared/components/src/index.ts`

**Checkpoint**: Foundation ready — PanelWorkspace renders GoldenLayout with default layout; Panel Registry and persistence tested

---

## Phase 3: User Story 1 — Resizable Panel Layout (Priority: P1)

**Goal**: Replace the fixed flexbox layout in the analysis view with GoldenLayout showing 5 resizable panels mirroring the current design. Map auto-resizes on panel border drag.

**Independent Test**: Open any plot; verify all 5 panels render; drag a panel border and confirm panels resize smoothly; confirm map fills its new dimensions.

### Panel Wrappers

- [ ] T014 [P] [US1] Create NavigationPanel wrapper (StacFileTree) `shared/components/src/panels/NavigationPanel.tsx`
- [ ] T015 [P] [US1] Create ActivityPanelWrapper (passes through ActivityPanel props) `shared/components/src/panels/ActivityPanelWrapper.tsx`
- [ ] T016 [P] [US1] Create LogPanelWrapper (passes through LogPanel props) `shared/components/src/panels/LogPanelWrapper.tsx`
- [ ] T017 [P] [US1] Create MapPanel wrapper (MapView + container resize → invalidateSize with 50ms debounce) `shared/components/src/panels/MapPanel.tsx`
- [ ] T018 [P] [US1] Create ChartPanelWrapper (ChartRenderer + resize handling) `shared/components/src/panels/ChartPanelWrapper.tsx`
- [ ] T019 [US1] Create PanelErrorBoundary for catching panel content errors `shared/components/src/PanelWorkspace/PanelErrorBoundary.tsx`

### Panel Registration

- [ ] T020 [US1] Register all 5 panel types in a default registry factory function `shared/components/src/PanelWorkspace/createDefaultRegistry.ts`

### App Integration

- [ ] T021 [US1] Create React context for panel application state (plot data, callbacks, session store access) `apps/web-shell/src/contexts/PanelContext.tsx`
- [ ] T022 [US1] Update App.tsx analysis view: replace flexbox sidebar + right panel with PanelWorkspace `apps/web-shell/src/App.tsx`
- [ ] T023 [US1] Update App.css: remove fixed sidebar/right-panel layout rules; keep header and welcome view styles `apps/web-shell/src/App.css`

### E2E Tests for US1

- [ ] T024 [test] [US1] Playwright test: default layout shows 5 panels after opening a plot `apps/web-shell/playwright/tests/panel-layout.spec.ts`
- [ ] T025 [test] [US1] Playwright test: panel borders are draggable and content reflows `apps/web-shell/playwright/tests/panel-layout.spec.ts`

**Checkpoint**: Analysis view renders with GoldenLayout; all 5 panels visible; borders draggable; map resizes correctly; existing features (selection, time, tools, layers, drawing, chart) work inside panels

---

## Phase 4: User Story 2 — Drag, Dock, and Tab Panels (Priority: P2)

**Goal**: Enable full panel rearrangement — drag panels by their headers, dock at new positions with visual drop indicators, create tabbed groups, split areas.

**Independent Test**: Drag Log panel header to the centre of the Map panel; verify they merge into a tabbed group; drag a tab out to undock.

### Implementation

- [ ] T026 [US2] Enable GoldenLayout drag-and-dock features in PanelWorkspace config (ensure drag is not disabled, drop indicators enabled) `shared/components/src/PanelWorkspace/PanelWorkspace.tsx`
- [ ] T027 [US2] Style drop indicators and drag proxy to match dark theme `shared/components/src/PanelWorkspace/PanelWorkspace.css`
- [ ] T028 [US2] Add panel minimum size constraints from PanelDefinition to GoldenLayout component config `shared/components/src/PanelWorkspace/goldenLayoutBridge.ts`

### E2E Tests for US2

- [ ] T029 [test] [US2] Playwright test: drag panel header shows drop indicators `apps/web-shell/playwright/tests/panel-dock.spec.ts`
- [ ] T030 [test] [US2] Playwright test: dropping panel on centre creates tabbed group `apps/web-shell/playwright/tests/panel-dock.spec.ts`

**Checkpoint**: Panels can be dragged, docked, tabbed, split, and undocked with visual feedback

---

## Phase 5: User Story 3 — Pop-out Panels (Priority: P3)

**Goal**: Allow panels to be popped out into separate browser windows with synchronized state (selection, time, visibility).

**Independent Test**: Pop out the Map panel; change time position in the main window; verify the popped-out map updates in real time; close pop-out; verify panel reappears in main window.

### Cross-Window State Sync

- [ ] T031 [US3] Add `shared-zustand` BroadcastChannel sync for temporal, selection, and visibility slices `services/session-state/src/store/crossWindowSync.ts`
- [ ] T032 [US3] Integrate cross-window sync initialization in session store factory `services/session-state/src/store/index.ts`
- [ ] T033 [US3] Update web-shell session-state browser re-export to include sync setup `apps/web-shell/src/session-state-browser.ts`

### Pop-out Configuration

- [ ] T034 [US3] Enable pop-out in GoldenLayout config; add pop-out button to panel headers `shared/components/src/PanelWorkspace/PanelWorkspace.tsx`
- [ ] T035 [US3] Ensure GoldenLayout CSS and theme are injected into pop-out windows `shared/components/src/PanelWorkspace/goldenLayoutBridge.ts`
- [ ] T036 [US3] Handle pop-out window close: restore panel to last docked position `shared/components/src/PanelWorkspace/PanelWorkspace.tsx`

### Graceful Degradation

- [ ] T037 [US3] Check BroadcastChannel support; disable pop-out button when unavailable `shared/components/src/PanelWorkspace/PanelWorkspace.tsx`

### E2E Test for US3

- [ ] T038 [test] [US3] Playwright test: pop-out opens a new window and panel renders correctly `apps/web-shell/playwright/tests/panel-popout.spec.ts`

**Checkpoint**: Pop-out works; state syncs across windows; pop-out close restores panel; graceful degradation when BroadcastChannel unavailable

---

## Phase 6: User Story 4 — Layout Persistence (Priority: P4)

**Goal**: Persist user's panel layout to localStorage and restore on reload. Provide "Reset Layout" action. Handle stale layouts gracefully.

**Independent Test**: Rearrange panels; refresh the browser; verify layout is restored exactly; click "Reset Layout"; verify default 5-panel arrangement returns.

### Implementation

- [ ] T039 [US4] Wire GoldenLayout `stateChanged` event to debounced save (500ms) in PanelWorkspace `shared/components/src/PanelWorkspace/PanelWorkspace.tsx`
- [ ] T040 [US4] Load and validate saved layout on PanelWorkspace mount (version check, panel type validation) `shared/components/src/PanelWorkspace/PanelWorkspace.tsx`
- [ ] T041 [US4] Add "Reset Layout" button to web-shell header bar `apps/web-shell/src/App.tsx`
- [ ] T042 [US4] Implement resetLayout in PanelWorkspace (clear localStorage, reload default config) `shared/components/src/PanelWorkspace/PanelWorkspace.tsx`
- [ ] T043 [US4] Save layout on PanelWorkspace unmount (transition back to welcome view) `shared/components/src/PanelWorkspace/PanelWorkspace.tsx`

### E2E Tests for US4

- [ ] T044 [test] [US4] Playwright test: layout persists across page reload `apps/web-shell/playwright/tests/panel-persistence.spec.ts`
- [ ] T045 [test] [US4] Playwright test: "Reset Layout" restores default arrangement `apps/web-shell/playwright/tests/panel-persistence.spec.ts`
- [ ] T046 [test] [US4] Playwright test: stale/corrupt saved layout falls back to default `apps/web-shell/playwright/tests/panel-persistence.spec.ts`

**Checkpoint**: Layout persists and restores; Reset Layout works; stale layouts handled gracefully

---

## Phase 7: User Story 5 — Welcome View Remains Standalone (Priority: P5)

**Goal**: CatalogOverview welcome view stays full-screen without GoldenLayout chrome. Clean transitions between welcome and analysis views.

**Independent Test**: Load application with no plot open; verify CatalogOverview renders full-screen; open a plot; verify GoldenLayout analysis view appears; click "Back to Catalog"; verify clean return to welcome view.

### Implementation

- [ ] T047 [US5] Verify welcome view renders without GoldenLayout DOM elements (no `.lm_goldenlayout` in DOM when `view === 'welcome'`) `apps/web-shell/src/App.tsx`
- [ ] T048 [US5] Verify GoldenLayout initializes on plot open and destroys on back-to-catalog `apps/web-shell/src/App.tsx`
- [ ] T049 [US5] Ensure no GoldenLayout CSS bleeding into welcome view `apps/web-shell/src/App.css`

### E2E Tests for US5

- [ ] T050 [test] [US5] Playwright test: welcome view renders full-screen without panel chrome `apps/web-shell/playwright/tests/panel-welcome.spec.ts`
- [ ] T051 [test] [US5] Playwright test: open plot transitions to GoldenLayout; back-to-catalog transitions back cleanly `apps/web-shell/playwright/tests/panel-welcome.spec.ts`

**Checkpoint**: Welcome view is clean; transitions are smooth; no GoldenLayout artifacts leak into welcome view

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Quality improvements, edge cases, evidence collection, media content, and PR creation

### Edge Cases

- [ ] T052 Handle "all panels closed" state: show Reset Layout prompt in empty workspace `shared/components/src/PanelWorkspace/PanelWorkspace.tsx`
- [ ] T053 [P] Add panel minimum size constraints to prevent unusable dimensions (FR-014) `shared/components/src/PanelWorkspace/defaultLayout.ts`
- [ ] T054 [P] Handle localStorage full/unavailable: silent fallback in save, console warning `shared/components/src/PanelWorkspace/layoutPersistence.ts`

### Storybook Story

- [ ] T055 Create PanelWorkspace Storybook story with default layout `shared/components/src/PanelWorkspace/PanelWorkspace.stories.tsx`

### Code Quality

- [ ] T056 Run existing web-shell E2E test suite to verify no regressions in existing features `apps/web-shell/playwright/tests/`
- [ ] T057 Run `pnpm build` for web-shell and verify clean build `apps/web-shell/`
- [ ] T058 Validate quickstart.md instructions match actual implementation `specs/096-add-goldenlayout-panels/quickstart.md`

### Evidence Collection

- [ ] T059 Create evidence directory `specs/096-add-goldenlayout-panels/evidence/`
- [ ] T060 Capture test summary (Vitest + Playwright results) `specs/096-add-goldenlayout-panels/evidence/test-summary.md`
- [ ] T061 Create usage example: registering a new panel type `specs/096-add-goldenlayout-panels/evidence/usage-example.md`
- [ ] T062 [P] Capture screenshot of default 5-panel layout `specs/096-add-goldenlayout-panels/evidence/screenshots/default-layout.png`
- [ ] T063 [P] Capture screenshot of drag-dock in action `specs/096-add-goldenlayout-panels/evidence/screenshots/drag-dock.png`
- [ ] T064 [P] Capture screenshot of popped-out panel `specs/096-add-goldenlayout-panels/evidence/screenshots/popout-window.png`
- [ ] T065 [P] Capture screenshot of restored layout after reload `specs/096-add-goldenlayout-panels/evidence/screenshots/layout-persistence.png`

### E2E Evidence Collection

- [ ] T066 Run full Playwright E2E suite for panel tests `apps/web-shell/playwright/tests/`
- [ ] T067 [P] Capture theme variant screenshots `specs/096-add-goldenlayout-panels/evidence/screenshots/`
- [ ] T068 Document E2E results `specs/096-add-goldenlayout-panels/evidence/e2e-summary.md`

### Media Content

- [ ] T069 Create shipped blog post `specs/096-add-goldenlayout-panels/media/shipped-post.md`
- [ ] T070 [P] Create LinkedIn shipped summary `specs/096-add-goldenlayout-panels/media/linkedin-shipped.md`

### PR Creation

- [ ] T071 Create PR and publish blog: run /speckit.pr

**Task T071 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately
- **Phase 2 (Foundation)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1 — Resizable Layout)**: Depends on Phase 2 — foundational for all other stories
- **Phase 4 (US2 — Drag & Dock)**: Depends on Phase 3 (panels must exist to drag them)
- **Phase 5 (US3 — Pop-out)**: Depends on Phase 3 (panels must exist to pop out); can run in parallel with Phase 4
- **Phase 6 (US4 — Persistence)**: Depends on Phase 3 (layout must exist to save it); can run in parallel with Phase 4 and 5
- **Phase 7 (US5 — Welcome View)**: Depends on Phase 3 (analysis view with GoldenLayout must exist to verify transitions)
- **Phase 8 (Polish)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2 (Foundation) — no dependency on other stories
- **US2 (P2)**: Depends on US1 — panels must render before they can be dragged
- **US3 (P3)**: Depends on US1 — panels must render before they can be popped out; independent of US2
- **US4 (P4)**: Depends on US1 — layout must exist before it can be persisted; independent of US2 and US3
- **US5 (P5)**: Depends on US1 — analysis view with GoldenLayout must work to verify transitions

### Within Each User Story

- Tests written and verified to fail before implementation (when tests exist)
- Infrastructure (bridge, registry) before wrappers
- Wrappers before App integration
- Core implementation before edge cases

### Parallel Opportunities

- Phase 2: T005 and T007 (tests) can run in parallel; T006 and T008 then T009-T012 sequential
- Phase 3: T014-T018 (all 5 panel wrappers) can run in parallel; T020-T023 sequential
- Phase 5, 6, 7: US3, US4, US5 can run in parallel (all depend only on US1, not on each other)
- Phase 8: Evidence collection tasks T062-T065 can run in parallel; media tasks T069-T070 can run in parallel

---

## Parallel Example: Phase 3 — Panel Wrappers

```
# All panel wrappers are independent files, can be written in parallel:
Task T014: NavigationPanel.tsx    (StacFileTree wrapper)
Task T015: ActivityPanelWrapper.tsx (ActivityPanel passthrough)
Task T016: LogPanelWrapper.tsx    (LogPanel passthrough)
Task T017: MapPanel.tsx           (MapView + resize handling)
Task T018: ChartPanelWrapper.tsx  (ChartRenderer wrapper)
```

## Parallel Example: Phase 5+6+7 — Independent Stories

```
# US3, US4, US5 can proceed in parallel after US1 is complete:
Stream A: T031-T038 (Pop-out Panels)
Stream B: T039-T046 (Layout Persistence)
Stream C: T047-T051 (Welcome View Standalone)
```

---

## Implementation Strategy

### Incremental Delivery

1. Phase 1 + 2 → Foundation ready (Panel Registry, bridge, persistence, default layout, theme)
2. Phase 3 (US1) → 5-panel resizable layout replaces fixed CSS → **First visible result**
3. Phase 4 (US2) → Drag-and-dock adds VS Code-like flexibility
4. Phase 5-7 (US3, US4, US5) → Pop-out, persistence, welcome view (can be parallel)
5. Phase 8 → Polish, evidence, media, PR

### Key Risk Mitigations

- **GoldenLayout React integration**: Addressed in Phase 2 with dedicated bridge layer and tests
- **Map resize issues**: MapPanel wrapper (T017) includes debounced `invalidateSize()` from day one
- **Existing feature regression**: T056 runs full existing E2E suite to catch regressions
- **Pop-out state sync**: Isolated in Phase 5 with BroadcastChannel support check and graceful fallback

---

## Notes

- [P] tasks = different files, no dependencies
- [US#] label maps task to specific user story for traceability
- Each user story is independently completable and testable at its checkpoint
- Commit after each task or logical group
- Evidence is required — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
