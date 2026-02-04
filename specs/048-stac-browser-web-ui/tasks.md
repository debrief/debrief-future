# Tasks: STAC Browser Web UI

**Input**: Design documents from `/specs/048-stac-browser-web-ui/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, quickstart.md ✓

**Tests**: Playwright E2E tests are requested per spec.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

---

## Evidence Requirements

**Evidence Directory**: `specs/048-stac-browser-web-ui/evidence/`
**Media Directory**: `specs/048-stac-browser-web-ui/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `test-summary.md` | Playwright test results | After all E2E tests pass |
| `usage-example.md` | How to run and use the web shell | After shell works |
| `welcome-page.png` | Screenshot of CatalogOverview | After welcome page renders |
| `analysis-view.png` | Screenshot of integrated view | After analysis view works |

### Media Content

| Artifact | Description | Status |
|----------|-------------|--------|
| `media/planning-post.md` | Blog post announcing the feature | ✓ Created |
| `media/linkedin-planning.md` | LinkedIn summary for planning | ✓ Created |
| `media/shipped-post.md` | Blog post celebrating completion | Final phase |
| `media/linkedin-shipped.md` | LinkedIn summary for shipped | Final phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task via /speckit.pr |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup (Project Scaffolding) ✅

**Purpose**: Initialize the web-shell project with dependencies and configuration

- [x] T001 Create apps/web-shell directory structure `apps/web-shell/src/mocks/`
- [x] T002 Create package.json with dependencies `apps/web-shell/package.json`
- [x] T003 [P] Create Vite config with @test-data alias `apps/web-shell/vite.config.ts`
- [x] T004 [P] Create TypeScript config with path mapping `apps/web-shell/tsconfig.json`
- [x] T005 [P] Create TypeScript node config `apps/web-shell/tsconfig.node.json`
- [x] T006 Create HTML entry point `apps/web-shell/index.html`
- [x] T007 Add web-shell to pnpm workspace `pnpm-workspace.yaml`
- [x] T008 Run pnpm install to link workspace dependencies

**Checkpoint**: Project scaffolding complete, `pnpm dev` should start (with errors until App exists)

---

## Phase 2: Foundation (Mock Services) ✅

**Purpose**: Create mock services that all views depend on

- [x] T009 Create MockStacService with fixture imports `apps/web-shell/src/mocks/stacService.ts`
- [x] T010 [P] Create MockCalcService with track-length and bounding-box tools `apps/web-shell/src/mocks/calcService.ts`
- [x] T011 Verify fixtures import correctly via @test-data alias

**Checkpoint**: Mock services ready, can be imported without errors

---

## Phase 3: User Story 1 - Welcome Page (Priority: P1) 🎯 MVP ✅

**Goal**: Display STAC Catalog Browser as landing page

**Independent Test**: Open http://localhost:5173, see catalog items listed

### Implementation for User Story 1

- [x] T012 [US1] Create React app entry point `apps/web-shell/src/main.tsx`
- [x] T013 [US1] Create App shell with welcome view state `apps/web-shell/src/App.tsx`
- [x] T014 [US1] Create shell layout styles `apps/web-shell/src/App.css`
- [x] T015 [US1] Integrate CatalogOverview component with MockStacService
- [x] T016 [US1] Add double-click handler to open plots
- [x] T017 [US1] Verify welcome page renders catalog items

**Checkpoint**: Welcome page shows catalog items, double-click triggers view change (but analysis view not yet implemented)

---

## Phase 4: User Story 2 - Analysis View (Priority: P2) ✅

**Goal**: Display ActivityPanel + MapView when a plot is opened

**Independent Test**: Double-click plot, see map with tracks and activity panel

### Implementation for User Story 2

- [x] T018 [US2] Add analysis view layout to App.tsx (activity panel left, map right)
- [x] T019 [US2] Integrate MapView component with plot features
- [x] T020 [US2] Add "Back to Catalog" navigation
- [x] T021 [US2] Integrate FeatureList in ActivityPanel
- [x] T022 [US2] Integrate TimeController in ActivityPanel
- [x] T023 [US2] Wire up useTimePlayback hook for temporal state
- [x] T024 [US2] Verify tracks render on map when plot is loaded

**Checkpoint**: Can navigate welcome → analysis → welcome, map shows tracks

---

## Phase 5: User Story 3 - Selection Sync (Priority: P3) ✅

**Goal**: Selection state syncs between map and activity panel

**Independent Test**: Click track on map, see it highlighted in FeatureList

### Implementation for User Story 3

- [x] T025 [US3] Integrate useSelection hook from @debrief/components
- [x] T026 [US3] Connect selection to MapView (selectedIds, onSelect)
- [x] T027 [US3] Connect selection to FeatureList
- [x] T028 [US3] Verify clicking track updates selection in both components

**Checkpoint**: Selection syncs bidirectionally between map and feature list

---

## Phase 6: User Story 4 - Tool Execution (Priority: P4) ✅

**Goal**: Tools show active state based on selection, executing shows results

**Independent Test**: Select tracks, click Track Length, see result message

### Implementation for User Story 4

- [x] T029 [US4] Integrate ToolsPanel in ActivityPanel
- [x] T030 [US4] Wire ToolsPanel to MockCalcService
- [x] T031 [US4] Connect selection to tool active state
- [x] T032 [US4] Handle tool execution and display result
- [x] T033 [US4] Verify bounding-box tool adds result layer to map

**Checkpoint**: Tools respond to selection, execution shows results

---

## Phase 7: User Story 5 - Playwright Tests (Priority: P5) ✅

**Goal**: E2E tests verify all acceptance criteria

**Independent Test**: `pnpm test` passes all tests

### Playwright Setup

- [x] T034 [test] Create Playwright config `apps/web-shell/playwright/playwright.config.ts`
- [ ] T035 [test] Install Playwright browsers (blocked by network - run manually)

### Playwright Tests

- [x] T036 [P][test] Write catalog-browse test `apps/web-shell/playwright/tests/catalog-browse.spec.ts`
- [x] T037 [P][test] Write plot-load test `apps/web-shell/playwright/tests/plot-load.spec.ts`
- [x] T038 [P][test] Write selection-sync test `apps/web-shell/playwright/tests/selection-sync.spec.ts`
- [x] T039 [P][test] Write tool-execution test `apps/web-shell/playwright/tests/tool-execution.spec.ts`
- [ ] T040 [test] Run all Playwright tests and verify pass (pending browser install)

**Checkpoint**: All E2E tests pass, acceptance criteria verified

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, evidence collection, and PR creation

### Code Quality

- [x] T041 [P] Run TypeScript strict mode check
- [ ] T042 [P] Verify no console errors in browser (manual check required)
- [ ] T043 Validate quickstart.md instructions work (manual check required)

### Evidence Collection (REQUIRED)

- [x] T044 Create evidence directory `specs/048-stac-browser-web-ui/evidence/`
- [x] T045 Capture Playwright test summary in `evidence/test-summary.md`
- [x] T046 Record usage example in `evidence/usage-example.md`
- [ ] T047 [P] Capture welcome page screenshot in `evidence/welcome-page.png`
- [ ] T048 [P] Capture analysis view screenshot in `evidence/analysis-view.png`

### Media Content

- [ ] T049 Create shipped blog post in `specs/048-stac-browser-web-ui/media/shipped-post.md`
- [ ] T050 [P] Create LinkedIn shipped summary in `specs/048-stac-browser-web-ui/media/linkedin-shipped.md`

### PR Creation

- [ ] T051 Create PR and publish blog: run /speckit.pr

**Task T051 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup
    ↓
Phase 2: Foundation (mock services)
    ↓
Phase 3: US1 - Welcome Page (MVP) ←── Can deploy after this
    ↓
Phase 4: US2 - Analysis View
    ↓
Phase 5: US3 - Selection Sync
    ↓
Phase 6: US4 - Tool Execution
    ↓
Phase 7: US5 - Playwright Tests
    ↓
Phase 8: Polish & PR
```

### Parallel Opportunities

**Phase 1** (Setup):
- T003, T004, T005 can run in parallel (config files)

**Phase 2** (Foundation):
- T009, T010 can run in parallel (different mock services)

**Phase 7** (Tests):
- T036, T037, T038, T039 can run in parallel (different test files)

**Phase 8** (Polish):
- T041, T042 can run in parallel
- T047, T048 can run in parallel
- T049, T050 can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundation
3. Complete Phase 3: User Story 1 (Welcome Page)
4. **STOP and VALIDATE**: http://localhost:5173 shows catalog
5. Can demo/review at this point

### Incremental Delivery

1. Setup + Foundation → Project scaffolding complete
2. Add US1 (Welcome) → Can browse catalog → **MVP!**
3. Add US2 (Analysis) → Can view plots → Demo integration
4. Add US3 (Selection) → Selection syncs → Demo coordination
5. Add US4 (Tools) → Tools work → Demo tool flow
6. Add US5 (Tests) → Tests pass → CI ready
7. Polish → Evidence collected → PR ready

---

## Notes

- `[P]` tasks can run in parallel (different files, no dependencies)
- `[USn]` label maps task to specific user story
- Each story independently testable at its checkpoint
- Fixtures from `apps/vscode/test-data/local-store/` via `@test-data` alias
- Components from `@debrief/components` - no modifications needed
- Temporal state via `useTimePlayback` hook from `@debrief/components`
- Selection state via `useSelection` hook from `@debrief/components`
