# Tasks: Load Existing Result Files into Attachments Dropdown

**Input**: Design documents from `/specs/051-load-result-attachments/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md

**Tests**: Unit tests included as this is a service-layer feature with clear testable interfaces.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected.

**Evidence Directory**: `specs/051-load-result-attachments/evidence/`
**Media Directory**: `specs/051-load-result-attachments/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Jest test results for extraction methods | After all tests pass |
| usage-example.md | Code example showing extraction usage | After implementation complete |
| sample-stac-item.json | Example STAC item with result assets | After US1 complete |
| loaded-results.md | Sample console output showing loaded files | After integration works |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | Completed during /speckit.plan |
| media/linkedin-planning.md | LinkedIn summary for planning | Completed during /speckit.plan |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup

**Purpose**: Verify existing infrastructure and create test structure

- [x] T001 Verify stacService exists `apps/vscode/src/services/stacService.ts`
- [x] T002 Verify activityPanelView exists `apps/vscode/src/views/activityPanelView.ts`
- [x] T003 Create test directory structure `apps/vscode/src/test/services/`

**Checkpoint**: Infrastructure verified - foundation phase can begin

---

## Phase 2: Foundation (Core Extraction Logic)

**Purpose**: Core infrastructure that MUST be complete before user story integration

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Add helper function to parse multi-suffix viewer type (e.g., `.2d.json` → `2d`) `apps/vscode/src/services/stacService.ts`
- [x] T005 Add helper function to transform STAC asset to AssociatedFile interface `apps/vscode/src/services/stacService.ts`
- [x] T006 Add `getResultFilesFromItem()` method to stacService `apps/vscode/src/services/stacService.ts`
- [x] T007 Add result role detection (`roles.includes('result')`) `apps/vscode/src/services/stacService.ts`
- [x] T008 Add filename pattern fallback detection (`debrief:toolId` check) `apps/vscode/src/services/stacService.ts`

**Checkpoint**: Foundation ready - user story implementation can begin

---

## Phase 3: User Story 1 - View Existing Results on Plot Open (Priority: P1) MVP

**Goal**: When a plot opens, all existing result files from its assets appear in the Attachments dropdown

**Independent Test**: Create a result file in a plot's assets folder with `roles: ["result"]`, close and reopen the plot, verify the file appears in Attachments dropdown

### Tests for User Story 1

- [x] T009 [P] [test] [US1] Unit test for `getResultFilesFromItem()` with result role assets `apps/vscode/tests/unit/stacService.test.ts`
- [x] T010 [P] [test] [US1] Unit test for `getResultFilesFromItem()` with multiple result files `apps/vscode/tests/unit/stacService.test.ts`
- [x] T011 [P] [test] [US1] Unit test for multi-suffix viewer type parsing `apps/vscode/tests/unit/stacService.test.ts`

### Implementation for User Story 1

- [x] T012 [US1] Call `getResultFilesFromItem()` when plot data is set in activityPanelView `apps/vscode/src/views/activityPanelView.ts`
- [x] T013 [US1] Populate `_resultFiles` array with extracted results `apps/vscode/src/views/activityPanelView.ts`
- [x] T014 [US1] Ensure `_sendLayersUpdate()` includes loaded result files `apps/vscode/src/views/activityPanelView.ts`

**Checkpoint**: User Story 1 complete - existing results appear on plot open

---

## Phase 4: User Story 2 - Persistent Results Across Sessions (Priority: P2)

**Goal**: Newly generated results persist alongside previously-loaded results after session restart

**Independent Test**: Generate a new result via tool execution, close plot, reopen plot, confirm both new and old results appear

### Tests for User Story 2

- [x] T015 [P] [test] [US2] Unit test for deduplication when merging loaded and runtime results `apps/vscode/tests/unit/stacService.test.ts`
- [ ] T016 [P] [test] [US2] Unit test for chronological ordering of merged results `apps/vscode/tests/unit/stacService.test.ts`

### Implementation for User Story 2

- [x] T017 [US2] Add deduplication logic when merging loaded results with runtime results `apps/vscode/src/views/activityPanelView.ts`
- [ ] T018 [US2] Add sorting by modification time (most recent first) `apps/vscode/src/views/activityPanelView.ts`
- [x] T019 [US2] Ensure runtime-added results don't duplicate already-loaded files `apps/vscode/src/views/activityPanelView.ts`

**Checkpoint**: User Story 2 complete - results from all sessions persist

---

## Phase 5: User Story 3 - Clear Indication of Empty State (Priority: P3)

**Goal**: Plots with no result files show appropriate empty state message; non-result assets are excluded

**Independent Test**: Open a plot with no result files, verify empty state message appears. Open plot with only images in assets, verify no results shown.

### Tests for User Story 3

- [x] T020 [P] [test] [US3] Unit test for empty assets returns empty array `apps/vscode/tests/unit/stacService.test.ts`
- [x] T021 [P] [test] [US3] Unit test for filtering non-result assets (images, etc.) `apps/vscode/tests/unit/stacService.test.ts`

### Implementation for User Story 3

- [x] T022 [US3] Ensure `getResultFilesFromItem()` returns empty array when no assets exist `apps/vscode/src/services/stacService.ts`
- [x] T023 [US3] Filter out assets without result role or matching patterns `apps/vscode/src/services/stacService.ts`
- [x] T024 [US3] Verify empty state flows through to UI correctly `apps/vscode/src/views/activityPanelView.ts`

**Checkpoint**: User Story 3 complete - empty state and filtering work correctly

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, testing, documentation, and evidence collection

### Edge Case Handling

- [x] T025 [P] [test] Unit test for missing assets property in STAC item `apps/vscode/tests/unit/stacService.test.ts`
- [x] T026 [P] [test] Unit test for asset with invalid/missing href `apps/vscode/tests/unit/stacService.test.ts`
- [x] T027 Add warning log when skipping assets with invalid data `apps/vscode/src/services/stacService.ts`
- [ ] T028 Verify performance with 50+ assets (should be < 500ms) `apps/vscode/tests/unit/stacService.test.ts`

### Evidence Collection (REQUIRED)

- [x] T029 Create evidence directory `specs/051-load-result-attachments/evidence/`
- [x] T030 Capture test summary with pass/fail counts `specs/051-load-result-attachments/evidence/test-summary.md`
- [x] T031 Create usage example demonstrating extraction `specs/051-load-result-attachments/evidence/usage-example.md`
- [x] T032 [P] Capture sample STAC item with result assets `specs/051-load-result-attachments/evidence/sample-stac-item.json`

### Media Content (REQUIRED)

- [x] T033 Create shipped blog post `specs/051-load-result-attachments/media/shipped-post.md`
- [x] T034 [P] Create LinkedIn shipped summary `specs/051-load-result-attachments/media/linkedin-shipped.md`

### PR Creation (REQUIRED - must be final task)

- [x] T035 Create PR and publish blog: run /speckit.pr

**Task T035 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - can start immediately
- **Phase 2 (Foundation)**: Depends on Setup completion - BLOCKS all user stories
- **Phase 3-5 (User Stories)**: All depend on Foundation phase completion
  - User stories should be completed sequentially (P1 → P2 → P3)
- **Phase 6 (Polish)**: Depends on all user stories being complete

### Task Dependencies Within Phases

**Foundation (Phase 2)**:
- T004, T005 can run in parallel (helper functions)
- T006 depends on T004, T005 (uses helpers)
- T007, T008 extend T006 (detection methods)

**User Story 1 (Phase 3)**:
- T009, T010, T011 can run in parallel (tests)
- T012 → T013 → T014 sequential (integration flow)

**User Story 2 (Phase 4)**:
- T015, T016 can run in parallel (tests)
- T017 → T018 → T019 sequential (deduplication flow)

**User Story 3 (Phase 5)**:
- T020, T021 can run in parallel (tests)
- T022 → T023 → T024 sequential (filtering flow)

### Parallel Opportunities

```bash
# Foundation helpers in parallel:
Task: T004 (multi-suffix parser)
Task: T005 (asset transformer)

# US1 tests in parallel:
Task: T009, T010, T011

# US2 tests in parallel:
Task: T015, T016

# US3 tests in parallel:
Task: T020, T021

# Edge case tests in parallel:
Task: T025, T026

# Evidence artifacts in parallel:
Task: T032 (sample STAC)
Task: T034 (LinkedIn)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundation (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test US1 independently - existing results should appear
5. If MVP is sufficient, proceed to Polish

### Full Implementation

1. Complete Setup + Foundation → Core extraction works
2. Add User Story 1 → Test independently → Results load on plot open (MVP!)
3. Add User Story 2 → Test independently → Results persist across sessions
4. Add User Story 3 → Test independently → Empty state and filtering work
5. Complete Polish → Evidence and PR ready

---

## Notes

- [P] tasks = different files or independent test cases, no dependencies
- [US#] label maps task to specific user story for traceability
- [test] label indicates test task
- Each user story builds on previous but should be independently testable
- Verify tests pass after each implementation task
- Commit after each logical group of tasks
- **Evidence is required** - capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
