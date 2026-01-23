# Tasks: VS Code Extension Hide Default Activities

**Input**: Design documents from `/specs/017-vscode-hide-activities/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: Included per Constitution Article VI.2 (Services require unit tests).

**Organization**: Tasks grouped by user story for independent implementation.

---

## Evidence Requirements

**Evidence Directory**: `specs/017-vscode-hide-activities/evidence/`
**Media Directory**: `specs/017-vscode-hide-activities/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Vitest results for ActivityBarService | After all tests pass |
| usage-example.md | Extension activation sequence demo | After hiding works |
| settings-screenshot.png | VS Code settings showing debrief.hideActivities | After config added |
| activity-bar-before.png | Activity bar with all default activities | Before hiding applied |
| activity-bar-after.png | Activity bar with only Explorer + Debrief | After hiding applied |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | During /speckit.plan (DONE) |
| media/linkedin-planning.md | LinkedIn summary for planning | During /speckit.plan (DONE) |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup

**Purpose**: Configuration schema and project structure

- [x] T001 Add hideActivities settings schema to contributes.configuration `apps/vscode/package.json`
- [x] T002 [P] Create evidence directory `specs/017-vscode-hide-activities/evidence/`

---

## Phase 2: Foundational

**Purpose**: Core ActivityBarService class that all user stories depend on

- [x] T003 Create ActivityBarService class skeleton `apps/vscode/src/services/activityBarService.ts`
- [x] T004 [test] Write unit tests for ActivityBarService `apps/vscode/tests/unit/activityBarService.test.ts`
- [x] T005 Add service types and interfaces `apps/vscode/src/services/activityBarService.ts`

**Checkpoint**: Foundation ready - service class exists with test structure

---

## Phase 3: User Story 1 - Focused Analysis Environment (Priority: P1) 🎯 MVP

**Goal**: Hide default activities (Search, Source Control, Debug, Extensions, Testing) on extension activation, leaving only Explorer and Debrief visible.

**Independent Test**: Activate extension in fresh workspace, verify only Explorer and Debrief activities visible.

### Tests for User Story 1

- [x] T006 [test][US1] Test applyDefaults() hides target activities `apps/vscode/tests/unit/activityBarService.test.ts`
- [x] T007 [P][test][US1] Test isEnabled() reads setting correctly `apps/vscode/tests/unit/activityBarService.test.ts`
- [x] T008 [P][test][US1] Test getTargetViewIds() returns default list `apps/vscode/tests/unit/activityBarService.test.ts`

### Implementation for User Story 1

- [x] T009 [US1] Implement getTargetViewIds() with default view IDs `apps/vscode/src/services/activityBarService.ts`
- [x] T010 [US1] Implement isEnabled() to check debrief.hideActivities.enabled `apps/vscode/src/services/activityBarService.ts`
- [x] T011 [US1] Implement applyDefaults() to modify workbench.activity.pinnedViewlets2 `apps/vscode/src/services/activityBarService.ts`
- [x] T012 [US1] Initialize ActivityBarService in extension.ts activate() `apps/vscode/src/extension.ts`
- [x] T013 [US1] Call applyDefaults() after service initialization `apps/vscode/src/extension.ts`

**Checkpoint**: Extension hides activities on first activation

---

## Phase 4: User Story 2 - New Debrief Activity (Priority: P1)

**Goal**: Register and display the Debrief activity with icon in activity bar.

**Independent Test**: Activate extension, verify Debrief activity appears with correct icon and tooltip.

**Note**: The Debrief activity already exists in package.json viewsContainers. This story verifies it remains visible after hiding others.

### Tests for User Story 2

- [x] T014 [test][US2] Test that Debrief activity is NOT in hidden list `apps/vscode/tests/unit/activityBarService.test.ts`
- [x] T015 [P][test][US2] Test that Explorer activity is NOT in hidden list `apps/vscode/tests/unit/activityBarService.test.ts`

### Implementation for User Story 2

- [x] T016 [US2] Add validation: never hide 'workbench.view.explorer' or 'debrief' `apps/vscode/src/services/activityBarService.ts`
- [x] T017 [US2] Log warning if user adds Explorer to custom viewIds list `apps/vscode/src/services/activityBarService.ts`

**Checkpoint**: Explorer and Debrief guaranteed visible after hiding

---

## Phase 5: User Story 3 - Restore Hidden Activities (Priority: P2)

**Goal**: Allow users to re-enable hidden activities through settings, with changes persisted across restarts.

**Independent Test**: Hide activities, manually re-enable one in VS Code settings, restart, verify it remains visible.

### Tests for User Story 3

- [x] T018 [test][US3] Test detectUserOverrides() identifies re-enabled activities `apps/vscode/tests/unit/activityBarService.test.ts`
- [x] T019 [P][test][US3] Test that user-enabled activities are not re-hidden `apps/vscode/tests/unit/activityBarService.test.ts`
- [x] T020 [P][test][US3] Test setting enabled=false restores all activities `apps/vscode/tests/unit/activityBarService.test.ts`

### Implementation for User Story 3

- [x] T021 [US3] Track initialization state in context.globalState `apps/vscode/src/services/activityBarService.ts`
- [x] T022 [US3] Store last-applied visibility snapshot on first run `apps/vscode/src/services/activityBarService.ts`
- [x] T023 [US3] Implement detectUserOverrides() comparing current vs last-applied `apps/vscode/src/services/activityBarService.ts`
- [x] T024 [US3] Skip re-hiding for activities user has manually re-enabled `apps/vscode/src/services/activityBarService.ts`
- [x] T025 [US3] Add restore command to package.json (Debrief: Restore Default Activities) `apps/vscode/package.json`
- [x] T026 [US3] Implement restore command handler `apps/vscode/src/commands/restoreActivities.ts`
- [x] T027 [US3] Register restore command in extension.ts `apps/vscode/src/extension.ts`

**Checkpoint**: User overrides persist; restore command works

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Quality, evidence, documentation, media, and PR

### Quality

- [x] T028 Run full test suite and verify all pass `apps/vscode/`
- [x] T029 [P] Run ESLint and fix any issues `apps/vscode/src/services/activityBarService.ts`
- [x] T030 [P] Validate quickstart.md instructions work `specs/017-vscode-hide-activities/quickstart.md`

### Evidence Collection

- [x] T031 Capture test summary in `specs/017-vscode-hide-activities/evidence/test-summary.md`
- [x] T032 Create usage example in `specs/017-vscode-hide-activities/evidence/usage-example.md`
- [ ] T033 [P] Capture activity bar screenshot (before hiding) in `specs/017-vscode-hide-activities/evidence/activity-bar-before.png` (SKIPPED - requires running VS Code)
- [ ] T034 [P] Capture activity bar screenshot (after hiding) in `specs/017-vscode-hide-activities/evidence/activity-bar-after.png` (SKIPPED - requires running VS Code)
- [ ] T035 [P] Capture settings UI screenshot in `specs/017-vscode-hide-activities/evidence/settings-screenshot.png` (SKIPPED - requires running VS Code)

### Media Content

- [x] T036 Create shipped blog post in `specs/017-vscode-hide-activities/media/shipped-post.md`
- [x] T037 [P] Create LinkedIn shipped summary in `specs/017-vscode-hide-activities/media/linkedin-shipped.md`

### PR Creation

- [x] T038 Create PR and publish blog: run /speckit.pr

**Task T038 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - start immediately
- **Phase 2 (Foundational)**: Depends on T001 (settings schema)
- **Phase 3 (US1)**: Depends on Phase 2 completion
- **Phase 4 (US2)**: Can run in parallel with Phase 3 (both P1 priority)
- **Phase 5 (US3)**: Depends on Phases 3+4 (builds on hiding logic)
- **Phase 6 (Polish)**: Depends on all user stories complete

### User Story Dependencies

| Story | Depends On | Can Parallel With |
|-------|------------|-------------------|
| US1 (Focused Environment) | Phase 2 | US2 |
| US2 (Debrief Activity) | Phase 2 | US1 |
| US3 (Restore Activities) | US1, US2 | - |

### Parallel Opportunities

**Phase 1:**
- T001 and T002 can run in parallel

**Phase 2:**
- T004 and T005 can run in parallel after T003

**Phase 3 (US1):**
- T007 and T008 can run in parallel (tests)
- T009 and T010 can run in parallel (implementation)

**Phase 4 (US2):**
- T014 and T015 can run in parallel (tests)

**Phase 5 (US3):**
- T019 and T020 can run in parallel (tests)
- T021 and T022 can run sequentially (state tracking)
- T025-T027 can run in parallel with T021-T024

**Phase 6 (Polish):**
- T029 and T030 can run in parallel
- T033, T034, T035 can run in parallel (screenshots)
- T036 and T037 can run in parallel (media)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Foundational (T003-T005)
3. Complete Phase 3: User Story 1 (T006-T013)
4. **STOP and VALIDATE**: Verify activities hide on activation
5. If working: proceed to US2+US3

### Incremental Delivery

1. Setup + Foundational → Service class ready
2. Add US1 → Activities hide → Validate (MVP!)
3. Add US2 → Explorer/Debrief always visible → Validate
4. Add US3 → User overrides work → Validate
5. Polish → Evidence collected → PR created

---

## Notes

- All tests follow TDD: write failing test, then implement
- Service pattern matches existing services/ structure
- Uses VS Code internal setting (workbench.activity.pinnedViewlets2)
- Graceful degradation if setting not found
- Offline by default (no network calls)
- ~150-200 LOC total for ActivityBarService
