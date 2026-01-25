# Tasks: Session State Management

**Input**: Design documents from `/specs/024-document-session-state/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

**Evidence Directory**: `specs/024-document-session-state/evidence/`
**Media Directory**: `specs/024-document-session-state/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Vitest + Playwright test results | After all tests pass |
| usage-example.md | TypeScript + Python code examples | After MCP integration works |
| mcp-session.json | Sample MCP tool calls with responses | After server complete |
| state-overview.png | Dashboard showing all four slices | Playwright e2e test |
| selection-empty.png | Dashboard with no selection | Playwright e2e test |
| selection-single.png | Dashboard with single feature selected | Playwright e2e test |
| selection-multi.png | Dashboard with multiple features | Playwright e2e test |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | Already exists from /speckit.plan |
| media/linkedin-planning.md | LinkedIn summary for planning | Already exists from /speckit.plan |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependencies, and schema definition

- [ ] T001 Create TypeScript service package `services/session-state/package.json`
- [ ] T002 [P] Create TypeScript config `services/session-state/tsconfig.json`
- [ ] T003 [P] Create Vitest config `services/session-state/vitest.config.ts`
- [ ] T004 Create LinkML schema `shared/schemas/src/session-state.yaml`
- [ ] T005 [P] Create Python client package `services/session-state-py/pyproject.toml`
- [ ] T006 [P] Create debug dashboard directory `tools/debug-dashboard/`
- [ ] T007 [P] Create Playwright config `tools/debug-dashboard/playwright.config.ts`

**Checkpoint**: Project scaffolding complete - ready for foundation

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types and store infrastructure that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Type Definitions

- [ ] T008 Generate TypeScript types from LinkML `services/session-state/src/types/index.ts`
- [ ] T009 [P] Define TimeInstant and TimeRange types `services/session-state/src/types/temporal.ts`
- [ ] T010 [P] Define ViewportPolygon type `services/session-state/src/types/spatial.ts`
- [ ] T011 [P] Define FeatureSelection type `services/session-state/src/types/features.ts`

### Store Infrastructure

- [ ] T012 Create store factory with Zustand `services/session-state/src/store/index.ts`
- [ ] T013 [P] Create temporal slice `services/session-state/src/store/slices/temporal.ts`
- [ ] T014 [P] Create spatial slice `services/session-state/src/store/slices/spatial.ts`
- [ ] T015 [P] Create features slice `services/session-state/src/store/slices/features.ts`
- [ ] T016 [P] Create document slice `services/session-state/src/store/slices/document.ts`

### Foundation Tests

- [ ] T017 [test] Unit tests for temporal slice `services/session-state/tests/unit/slices/temporal.test.ts`
- [ ] T018 [P][test] Unit tests for spatial slice `services/session-state/tests/unit/slices/spatial.test.ts`
- [ ] T019 [P][test] Unit tests for features slice `services/session-state/tests/unit/slices/features.test.ts`
- [ ] T020 [P][test] Unit tests for document slice `services/session-state/tests/unit/slices/document.test.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - UI Components Receive State Updates (Priority: P1) 🎯 MVP

**Goal**: Enable reactive state subscriptions so UI components display synchronized data

**Independent Test**: Open a plot and verify all UI components display synchronized data as the analyst changes time or viewport

### Tests for User Story 1

- [ ] T021 [test] Test reactive subscriptions `services/session-state/tests/unit/subscriptions.test.ts`
- [ ] T022 [P][test] Test selective subscriptions (SC-006) `services/session-state/tests/unit/selective.test.ts`

### Implementation for User Story 1

- [ ] T023 Implement subscribeWithSelector middleware `services/session-state/src/store/middleware/selector.ts`
- [ ] T024 [P] Add subscription helpers to store `services/session-state/src/store/subscriptions.ts`
- [ ] T025 Export public API for subscriptions `services/session-state/src/index.ts`
- [ ] T026 [test] Verify SC-001: updates within 100ms `services/session-state/tests/unit/performance.test.ts`

**Checkpoint**: US1 complete - reactive subscriptions work

---

## Phase 4: User Story 2 - Python Services Access State via MCP (Priority: P2)

**Goal**: Enable Python tools to read and modify session state via MCP/HTTP interface

**Independent Test**: Call session state tools from Python script and verify correct read/write behavior

### Server Infrastructure

- [ ] T027 Create Express server setup `services/session-state/src/server/index.ts`
- [ ] T028 [P] Implement CORS middleware (FR-038) `services/session-state/src/server/cors.ts`
- [ ] T029 Implement MCP tool handlers `services/session-state/src/server/mcp.ts`

### MCP Tools Implementation

- [ ] T030 Implement session.getState tool `services/session-state/src/server/tools/getState.ts`
- [ ] T031 [P] Implement session.setCurrentTime tool `services/session-state/src/server/tools/setCurrentTime.ts`
- [ ] T032 [P] Implement session.setViewport tool `services/session-state/src/server/tools/setViewport.ts`
- [ ] T033 [P] Implement session.setSelection tool `services/session-state/src/server/tools/setSelection.ts`
- [ ] T034 [P] Implement session.setHiddenFeatures tool `services/session-state/src/server/tools/setHiddenFeatures.ts`

### Python Client

- [ ] T035 Create Python MCP client wrapper `services/session-state-py/src/debrief_session/client.py`
- [ ] T036 [P] Generate Python types from LinkML `services/session-state-py/src/debrief_session/types.py`
- [ ] T037 [P] Create Python package init `services/session-state-py/src/debrief_session/__init__.py`

### Tests for User Story 2

- [ ] T038 [test] MCP tool integration tests `services/session-state/tests/integration/mcp.test.ts`
- [ ] T039 [P][test] Python client tests `services/session-state-py/tests/test_client.py`

**Checkpoint**: US2 complete - Python can read/write state via MCP

---

## Phase 5: User Story 3 - Analyst Performs Undo/Redo (Priority: P3)

**Goal**: Enable undo/redo for persistent state changes with 50-step history

**Independent Test**: Make state changes, perform undo operations, verify state reverts correctly

### Tests for User Story 3

- [ ] T040 [test] Undo middleware tests `services/session-state/tests/unit/middleware/undo.test.ts`
- [ ] T041 [P][test] Test 50-step limit (SC-005) `services/session-state/tests/unit/middleware/history-limit.test.ts`
- [ ] T042 [P][test] Test ephemeral exclusion (FR-023) `services/session-state/tests/unit/middleware/ephemeral.test.ts`

### Implementation for User Story 3

- [ ] T043 Implement Zundo undo middleware `services/session-state/src/store/middleware/undo.ts`
- [ ] T044 Configure partialize for ephemeral state exclusion `services/session-state/src/store/middleware/partialize.ts`
- [ ] T045 Add undo/redo MCP tools `services/session-state/src/server/tools/undoRedo.ts`
- [ ] T046 Verify SC-003: exact state restoration `services/session-state/tests/unit/middleware/restoration.test.ts`

**Checkpoint**: US3 complete - undo/redo works with 50-step history

---

## Phase 6: User Story 4 - Analyst Saves and Loads Sessions (Priority: P4)

**Goal**: Enable session persistence to/from JSON files

**Independent Test**: Configure session, save it, load it, verify all state restored

### Tests for User Story 4

- [ ] T047 [test] Save/load round-trip tests `services/session-state/tests/unit/persistence/roundtrip.test.ts`
- [ ] T048 [P][test] Schema version migration tests (SC-007) `services/session-state/tests/unit/persistence/migration.test.ts`
- [ ] T049 [P][test] Edge case: incompatible version rejection `services/session-state/tests/unit/persistence/version-error.test.ts`

### Implementation for User Story 4

- [ ] T050 Implement session save logic `services/session-state/src/persistence/save.ts`
- [ ] T051 [P] Implement session load logic `services/session-state/src/persistence/load.ts`
- [ ] T052 [P] Implement schema versioning `services/session-state/src/persistence/schema.ts`
- [ ] T053 Add save/load MCP tools `services/session-state/src/server/tools/persistence.ts`
- [ ] T054 Verify SC-002: 100% fidelity persistence `services/session-state/tests/unit/persistence/fidelity.test.ts`

**Checkpoint**: US4 complete - sessions save and load correctly

---

## Phase 7: User Story 5 - Document Dirty Tracking (Priority: P5)

**Goal**: Track unsaved changes and provide dirty flag

**Independent Test**: Make changes, verify dirty indicator, save, verify cleared

### Tests for User Story 5

- [ ] T055 [test] Dirty tracking middleware tests `services/session-state/tests/unit/middleware/dirty.test.ts`
- [ ] T056 [P][test] Test ephemeral changes don't trigger dirty `services/session-state/tests/unit/middleware/dirty-ephemeral.test.ts`

### Implementation for User Story 5

- [ ] T057 Implement dirty tracking middleware `services/session-state/src/store/middleware/dirty.ts`
- [ ] T058 Integrate dirty flag with save operation `services/session-state/src/persistence/save.ts` (update)
- [ ] T059 Clear history after save (FR-022) `services/session-state/src/persistence/save.ts` (update)

**Checkpoint**: US5 complete - dirty tracking works

---

## Phase 8: User Story 6 - Developer Debugs State via Web Dashboard (Priority: P6)

**Goal**: Provide standalone debug dashboard for real-time state visualization

**Independent Test**: Start server, open dashboard, verify state displays and updates in real-time

### SSE Implementation

- [ ] T060 Implement SSE endpoint `services/session-state/src/server/sse.ts`
- [ ] T061 [test] SSE integration tests `services/session-state/tests/integration/sse.test.ts`

### Dashboard Implementation

- [ ] T062 Create dashboard HTML structure `tools/debug-dashboard/index.html`
- [ ] T063 [P] Create dashboard styles `tools/debug-dashboard/styles.css`
- [ ] T064 Implement dashboard JavaScript `tools/debug-dashboard/app.js`
- [ ] T065 Implement SSE connection handling `tools/debug-dashboard/app.js` (update)
- [ ] T066 Implement inline editing (FR-044) `tools/debug-dashboard/app.js` (update)
- [ ] T067 Implement features tree view (FR-042) `tools/debug-dashboard/app.js` (update)
- [ ] T068 Implement connection status indicator (FR-048) `tools/debug-dashboard/app.js` (update)
- [ ] T069 Implement server URL configuration (FR-046, FR-047) `tools/debug-dashboard/app.js` (update)

### Playwright E2E Tests

- [ ] T070 Create Playwright test setup `tools/debug-dashboard/tests/dashboard.spec.ts`
- [ ] T071 Test dashboard connection and state display `tools/debug-dashboard/tests/dashboard.spec.ts` (update)
- [ ] T072 Test inline editing functionality `tools/debug-dashboard/tests/dashboard.spec.ts` (update)
- [ ] T073 Capture screenshot: state-overview.png `tools/debug-dashboard/screenshots/state-overview.png`
- [ ] T074 [P] Capture screenshot: selection-empty.png `tools/debug-dashboard/screenshots/selection-empty.png`
- [ ] T075 [P] Capture screenshot: selection-single.png `tools/debug-dashboard/screenshots/selection-single.png`
- [ ] T076 [P] Capture screenshot: selection-multi.png `tools/debug-dashboard/screenshots/selection-multi.png`

**Checkpoint**: US6 complete - debug dashboard works with Playwright screenshots

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, evidence collection, and media content

### Validation

- [ ] T077 Run quickstart.md validation `specs/024-document-session-state/quickstart.md`
- [ ] T078 Verify standalone server starts without VS Code (SC-009) `services/session-state/`
- [ ] T079 Verify dashboard updates within 200ms (SC-008) `tools/debug-dashboard/tests/`

### Evidence Collection

- [ ] T080 Create evidence directory `specs/024-document-session-state/evidence/`
- [ ] T081 Capture test summary in `specs/024-document-session-state/evidence/test-summary.md`
- [ ] T082 Create usage example in `specs/024-document-session-state/evidence/usage-example.md`
- [ ] T083 [P] Capture MCP session example in `specs/024-document-session-state/evidence/mcp-session.json`
- [ ] T084 [P] Copy Playwright screenshots to `specs/024-document-session-state/evidence/`

### Media Content

- [ ] T085 Create shipped blog post `specs/024-document-session-state/media/shipped-post.md`
- [ ] T086 [P] Create LinkedIn shipped summary `specs/024-document-session-state/media/linkedin-shipped.md`

### PR Creation

- [ ] T087 Create PR and publish blog: run /speckit.pr

**Task T087 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Stories (Phases 3-8)**: All depend on Foundational completion
  - Stories can proceed in priority order (P1 → P2 → P3 → P4 → P5 → P6)
  - Some parallelism possible between stories
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Foundational only - core reactive subscriptions
- **US2 (P2)**: Foundational + US1 - adds MCP/HTTP server
- **US3 (P3)**: Foundational + store - adds undo/redo middleware
- **US4 (P4)**: Foundational + store - adds persistence layer
- **US5 (P5)**: US4 (save integration) - adds dirty tracking
- **US6 (P6)**: US2 (server) + all slices - adds dashboard + Playwright

### Within Each User Story

- Tests should be written first when marked [test]
- Types before implementation
- Core logic before MCP tools
- Server endpoints before client code

### Parallel Opportunities

Within Phase 2 (Foundational):
```
T009 [P] + T010 [P] + T011 [P] - type definitions
T013 [P] + T014 [P] + T015 [P] + T016 [P] - all slices
T017 [P] + T018 [P] + T019 [P] + T020 [P] - slice tests
```

Within Phase 4 (MCP):
```
T031 [P] + T032 [P] + T033 [P] + T034 [P] - MCP tools
T036 [P] + T037 [P] - Python package files
```

Within Phase 8 (Dashboard):
```
T073 [P] + T074 [P] + T075 [P] + T076 [P] - screenshots
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (reactive subscriptions)
4. **STOP and VALIDATE**: Test subscriptions work
5. Deploy/demo reactive state management

### Incremental Delivery

1. Setup + Foundational → Store infrastructure ready
2. Add US1 → Reactive subscriptions work (MVP!)
3. Add US2 → Python can access state via MCP
4. Add US3 → Undo/redo with 50-step history
5. Add US4 → Session persistence works
6. Add US5 → Dirty tracking integrated
7. Add US6 → Debug dashboard with Playwright screenshots
8. Polish → Evidence + Media + PR

---

## Notes

- [P] tasks = different files, can run in parallel
- [test] tasks = test files, write before implementation
- Each user story should be independently testable
- Commit after each task or logical group
- Evidence is required - captures proof the feature works
- Run `/speckit.pr` after T087 to create PR with evidence
