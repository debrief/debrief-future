# Tasks: Replay and Parameter Tuning

**Input**: Design documents from `/specs/076-replay-tune/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/replay-engine.ts

---

## Evidence Requirements

**Evidence Directory**: `specs/076-replay-tune/evidence/`
**Media Directory**: `specs/076-replay-tune/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | vitest results for session-state replay tests | After all tests pass |
| usage-example.md | Step-by-step tuning workflow in VS Code | After integration complete |
| storybook-screenshots/ | ParameterEditor in light, dark, vscode themes | After Storybook stories pass |
| e2e-summary.md | Playwright test results for ParameterEditor | After E2E tests pass |

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

**Purpose**: Project scaffolding and type extensions

- [x] T001 Add replay types to session-state types `services/session-state/src/log/types.ts`
- [x] T002 [P] Add `deleted?: boolean` field to existing LogEntry interface `services/session-state/src/log/types.ts`
- [x] T003 Create Replay Engine module skeleton `services/session-state/src/log/replayEngine.ts`
- [x] T004 [P] Add `includeDeleted` option to assembleTimeline `services/session-state/src/log/timeline.ts`
- [x] T005 Export new types and Replay Engine from package index `services/session-state/src/log/index.ts`
- [x] T006 [P] Add parameter validation utility module `services/session-state/src/log/parameterValidation.ts`

**Checkpoint**: Type system extended, module skeleton in place, ready for implementation.

---

## Phase 2: Foundation — Replay Engine (Blocking Prerequisites)

**Purpose**: Core replay infrastructure that ALL user stories depend on

**CRITICAL**: No user story work can begin until the Replay Engine is functional.

### Tests for Replay Engine

- [x] T007 [test] Write buildPlan unit tests — plan construction from timeline, tune target, deleted entries `services/session-state/tests/log/replayEngine.test.ts`
- [x] T008 [P][test] Write execute unit tests — sequential tool invocation with mock executor `services/session-state/tests/log/replayEngine.test.ts`
- [x] T009 [P][test] Write cancellation test — AbortController halts replay and restores state `services/session-state/tests/log/replayEngine.test.ts`
- [x] T010 [P][test] Write version mismatch test — replay halts before executing mismatched tool `services/session-state/tests/log/replayEngine.test.ts`
- [x] T011 [P][test] Write parameter validation tests — each type (float, integer, duration, enum, boolean, string) `services/session-state/tests/log/parameterValidation.test.ts`

### Implementation

- [x] T012 Implement parameter validation functions per type `services/session-state/src/log/parameterValidation.ts`
- [x] T013 Implement `createReplayEngine()` factory with dependency injection `services/session-state/src/log/replayEngine.ts`
- [x] T014 Implement `buildPlan()` — timeline analysis, entry ordering, tune target insertion `services/session-state/src/log/replayEngine.ts`
- [x] T015 Implement `execute()` — sequential tool invocation loop with version check, progress reporting, and AbortSignal support `services/session-state/src/log/replayEngine.ts`
- [x] T016 Implement rollback logic — deep-clone pre-replay state, restore on halt/cancel `services/session-state/src/log/replayEngine.ts`
- [x] T017 Extend `assembleTimeline()` to filter soft-deleted entries by default `services/session-state/src/log/timeline.ts`

**Checkpoint**: Replay Engine fully functional with mock executors. All foundation tests pass.

---

## Phase 3: User Story 1 — Tune a Parameter and See Updated Results (Priority: P1) MVP

**Goal**: Analysts can edit a parameter on a past Log entry, triggering automatic replay of all subsequent operations with the new value.

**Independent Test**: Record a sequence of tool operations, edit a parameter on one, verify all subsequent operations re-execute with updated results.

### Tests for User Story 1

- [x] T018 [test] Write tuneEntry unit tests — parameter change triggers replay, tune annotation appended `services/session-state/tests/log/tuneEntry.test.ts`
- [x] T019 [P][test] Write no-op tune test — tuning to same value does not trigger replay `services/session-state/tests/log/tuneEntry.test.ts`
- [x] T020 [P][test] Write artifact versioning test — new version created, previous preserved `services/session-state/tests/log/tuneEntry.test.ts`

### Implementation for User Story 1

- [x] T021 Implement `tuneEntry()` in Log Service — validate param, build plan, execute replay, append TuneAnnotation `services/session-state/src/log/logService.ts`
- [x] T022 Update LogService interface — replace tuneEntry stub with new signature (storePath, itemPath, activityId, parameter, newValue) `services/session-state/src/log/types.ts`
- [x] T023 [P] Create ParameterEditor shared component — type-specific inline editing for float, integer, duration, enum, boolean, string `shared/components/src/LogPanel/ParameterEditor.tsx`
- [x] T024 [P] Create ParameterEditor CSS styles `shared/components/src/LogPanel/ParameterEditor.css`
- [x] T025 Add ParameterEditor Storybook stories — one story per parameter type, validation error states `shared/components/src/LogPanel/ParameterEditor.stories.tsx`
- [x] T026 [P] Create ReplayProgress shared component — progress bar, current tool, cancel button `shared/components/src/LogPanel/ReplayProgress.tsx`
- [x] T027 [P] Create ReplayProgress CSS styles `shared/components/src/LogPanel/ReplayProgress.css`
- [x] T028 Add tune/revert strings to LogPanel strings file `shared/components/src/LogPanel/strings.ts`
- [x] T029 Extend LogPanel types with onTune, onReplayProgress, onReplayResult callbacks `shared/components/src/LogPanel/types.ts`
- [x] T030 Modify LogEntry component — show tunable parameter editing affordances, tune annotation badge `shared/components/src/LogPanel/LogEntry.tsx`
- [x] T031 Wire Tune button in LogActionBar — enabled when entry selected, triggers parameter editor `shared/components/src/LogPanel/LogActionBar.tsx`
- [x] T032 Add Phase 6 message types to logPanelView — handle tune:request, replay:progress, replay:result, replay:cancel `apps/vscode/src/views/logPanelView.ts`
- [x] T033 Wire logPanelView to LogService.tuneEntry and Replay Engine deps (calcService, stacService, tool version resolver) `apps/vscode/src/views/logPanelView.ts`
- [x] T034 Update logPanel webview to forward tune:request messages and render ReplayProgress `apps/vscode/src/webview/web/logPanel.tsx`
- [x] T035 Export ParameterEditor and ReplayProgress from shared components index `shared/components/src/LogPanel/index.ts`

### E2E Tests for User Story 1

- [x] T036 [test] Create Playwright test for ParameterEditor — rendering, type inputs, validation `shared/components/e2e/ParameterEditor.spec.ts`
- [x] T037 [P][test] Add theme variant tests — light, dark, vscode `shared/components/e2e/ParameterEditor.spec.ts`
- [x] T038 [P][test] Add interaction tests — click to edit, enter value, commit, cancel `shared/components/e2e/ParameterEditor.spec.ts`

**Checkpoint**: Analyst can tune a parameter within the current segment. Replay executes and plot updates.

---

## Phase 4: User Story 2 — Revert to a Previous Point (Priority: P2)

**Goal**: Analysts can permanently discard all operations after a selected point, restoring the plot to that state.

**Independent Test**: Record several operations, revert to an earlier point, verify subsequent entries removed and plot state correct.

### Tests for User Story 2

- [x] T039 [test] Write revertTo unit tests — entries after target permanently removed from all features `services/session-state/tests/log/revertTo.test.ts`
- [x] T040 [P][test] Write revertTo edge case — revert to first operation warns about removing all data `services/session-state/tests/log/revertTo.test.ts`

### Implementation for User Story 2

- [x] T041 Implement `revertTo()` in Log Service — locate entry in timeline, remove all entries after it from all features' provenance arrays, markDirty `services/session-state/src/log/logService.ts`
- [x] T042 Update LogService interface — replace revertTo stub with new signature (storePath, itemPath, activityId) `services/session-state/src/log/types.ts`
- [x] T043 Wire Revert-to-Here button in LogActionBar — enabled when entry selected, shows confirmation dialog `shared/components/src/LogPanel/LogActionBar.tsx`
- [x] T044 [P] Add confirmation dialog for permanent revert — warn analyst this action is irreversible `shared/components/src/LogPanel/LogEntry.tsx`
- [x] T045 Handle revert-to:request message in logPanelView — call LogService.revertTo, refresh timeline `apps/vscode/src/views/logPanelView.ts`
- [x] T046 Update logPanel webview — send revert-to:request on button click with confirmation gate `apps/vscode/src/webview/web/logPanel.tsx`

**Checkpoint**: Analyst can revert to a point. Entries after that point are permanently gone.

---

## Phase 5: User Story 3 — Selectively Remove One Operation (Priority: P2)

**Goal**: Analysts can soft-delete a single entry and replay subsequent entries without it. Failed dependents halt replay.

**Independent Test**: Record independent operations, remove one from middle, verify others replay. Also test dependency failure halt.

### Tests for User Story 3

- [x] T047 [test] Write revertThis unit tests — soft-delete entry, replay subsequent entries `services/session-state/tests/log/revertThis.test.ts`
- [x] T048 [P][test] Write dependency failure test — replay halts when subsequent entry depends on deleted entry's output `services/session-state/tests/log/revertThis.test.ts`
- [x] T049 [P][test] Write restore test — restoring soft-deleted entry replays including it `services/session-state/tests/log/revertThis.test.ts`

### Implementation for User Story 3

- [x] T050 Implement `revertThis()` in Log Service — set deleted flag, build replay plan excluding entry, execute `services/session-state/src/log/logService.ts`
- [x] T051 Implement `restoreEntry()` in Log Service — remove deleted flag, rebuild plan including entry, execute replay `services/session-state/src/log/logService.ts`
- [x] T052 Update LogService interface — replace revertThis stub, add restoreEntry method `services/session-state/src/log/types.ts`
- [x] T053 Modify LogEntry component — visually distinguish soft-deleted entries (greyed out), show Restore button `shared/components/src/LogPanel/LogEntry.tsx`
- [x] T054 Wire Revert-This button in LogActionBar — enabled when entry selected `shared/components/src/LogPanel/LogActionBar.tsx`
- [x] T055 Handle revert-this:request and restore:request messages in logPanelView `apps/vscode/src/views/logPanelView.ts`
- [x] T056 Update logPanel webview — send revert-this:request and restore:request messages `apps/vscode/src/webview/web/logPanel.tsx`
- [x] T057 Update LogPanel Storybook stories — add soft-deleted entry, restore action scenarios `shared/components/src/LogPanel/LogPanel.stories.tsx`

**Checkpoint**: Analyst can remove a single operation. Dependents halt correctly. Restore works.

---

## Phase 6: User Story 4 — Tune Across Snapshot Boundaries (Priority: P3)

**Goal**: Analysts can tune parameters from earlier snapshot segments with full cross-snapshot replay.

**Independent Test**: Create plot with two snapshots, tune a parameter from the first segment, verify all operations across both segments replay correctly.

### Tests for User Story 4

- [x] T058 [test] Write cross-snapshot replay test — load snapshot, replay through boundary, reach current segment `services/session-state/tests/log/replayEngine.test.ts`
- [x] T059 [P][test] Write progress reporting test — progress indicates snapshot loading phase and entry count across boundaries `services/session-state/tests/log/replayEngine.test.ts`

### Implementation for User Story 4

- [x] T060 Extend `buildPlan()` to handle snapshot entries — set `startFromSnapshot` when tune target is in a previous snapshot segment `services/session-state/src/log/replayEngine.ts`
- [x] T061 Extend `execute()` to load snapshot GeoJSON as initial state before replaying `services/session-state/src/log/replayEngine.ts`
- [x] T062 Extend `execute()` to cross snapshot boundaries — continue replay through subsequent segments after boundary `services/session-state/src/log/replayEngine.ts`
- [x] T063 Add snapshot loading progress phase — report 'loading-snapshot' phase to UI `services/session-state/src/log/replayEngine.ts`
- [x] T064 Wire SnapshotLoader dependency in logPanelView — inject stacService.loadSnapshotGeoJson `apps/vscode/src/views/logPanelView.ts`

**Checkpoint**: Cross-snapshot tuning works. Progress indicator shows snapshot loading.

---

## Phase 7: User Story 5 — Version Mismatch Halts Replay (Priority: P3)

**Goal**: Replay detects tool version mismatches and halts with a clear report before executing.

**Independent Test**: Record operation with version X, simulate version mismatch, verify halt with descriptive error.

### Tests for User Story 5

- [x] T065 [test] Write version mismatch halt test — replay stops, reports tool name, recorded version, installed version `services/session-state/tests/log/replayEngine.test.ts`
- [x] T066 [P][test] Write version mismatch UI test — halt message shows entry position and resolution options `services/session-state/tests/log/replayEngine.test.ts`

### Implementation for User Story 5

- [x] T067 Implement version check before each entry execution — compare recorded vs installed, halt on mismatch `services/session-state/src/log/replayEngine.ts`
- [x] T068 Wire ToolVersionResolver dependency in logPanelView — extract version from calcService.listTools `apps/vscode/src/views/logPanelView.ts`
- [x] T069 Add version mismatch error display in ReplayProgress component — show tool name, versions, halt position `shared/components/src/LogPanel/ReplayProgress.tsx`
- [x] T070 Handle replay:error message in logPanel webview — display halt details with options `apps/vscode/src/webview/web/logPanel.tsx`

**Checkpoint**: Version mismatches are caught. Analyst sees clear report with resolution options.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final integration, evidence collection, media, and PR creation.

### Cross-Cutting

- [x] T071 Add edge case handling — tune to same value (no-op), revert first operation (confirmation warning) `services/session-state/src/log/logService.ts`
- [x] T072 [P] Add I18N-ready strings for all replay/tune/revert user-facing messages `shared/components/src/LogPanel/strings.ts`
- [x] T073 [P] Run quickstart.md validation — verify implementation matches planned file paths `specs/076-replay-tune/quickstart.md`

### Evidence Collection

- [ ] T074 Capture test summary with pass/fail counts `specs/076-replay-tune/evidence/test-summary.md`
- [ ] T075 Create usage demonstration — step-by-step tuning workflow `specs/076-replay-tune/evidence/usage-example.md`
- [ ] T076 [P] Capture Storybook screenshots for ParameterEditor (light, dark, vscode) `specs/076-replay-tune/evidence/screenshots/`

### E2E Evidence Collection

- [x] T077 Run full e2e suite for ParameterEditor and LogPanel tune stories
- [x] T078 [P] Capture theme variant screenshots to `specs/076-replay-tune/evidence/screenshots/`
- [ ] T079 Document e2e results `specs/076-replay-tune/evidence/e2e-summary.md`

### Media Content

- [x] T080 Create shipped blog post `specs/076-replay-tune/media/shipped-post.md`
- [x] T081 [P] Create LinkedIn shipped summary `specs/076-replay-tune/media/linkedin-shipped.md`

### PR Creation

- [ ] T082 Create PR and publish blog: run /speckit.pr

**Task T082 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundation)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1 — Tune)**: Depends on Phase 2 — MVP scope
- **Phase 4 (US2 — Revert To)**: Depends on Phase 2 — can run in parallel with Phase 3
- **Phase 5 (US3 — Revert This)**: Depends on Phase 2 — can run in parallel with Phase 3/4
- **Phase 6 (US4 — Cross-Snapshot)**: Depends on Phase 3 (tuning must work first)
- **Phase 7 (US5 — Version Mismatch)**: Depends on Phase 2 (replay engine must exist)
- **Phase 8 (Polish)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1 — Tune)**: Depends only on Foundation. No other story dependencies.
- **US2 (P2 — Revert To)**: Depends only on Foundation. Independent of US1.
- **US3 (P2 — Revert This)**: Depends only on Foundation. Independent of US1/US2. Uses Replay Engine from Phase 2.
- **US4 (P3 — Cross-Snapshot)**: Depends on US1 (extends tuning with cross-snapshot support).
- **US5 (P3 — Version Mismatch)**: Depends only on Foundation. Independent of other stories.

### Within Each User Story

- Tests written FIRST, ensure they FAIL before implementation
- Types/interfaces before services
- Services before UI components
- Session-state before shared-components before vscode extension
- Story checkpoint before moving to next priority

### Parallel Opportunities

- **Phase 1**: T002, T004, T006 can run in parallel (different files)
- **Phase 2 tests**: T008, T009, T010, T011 can run in parallel
- **Phase 3**: T023/T024 (ParameterEditor), T026/T027 (ReplayProgress) can run in parallel with T021 (LogService)
- **Phase 4 + 5**: Can run in parallel with Phase 3 (independent user stories)
- **Phase 7**: Can run in parallel with Phase 6 (independent concerns)

---

## Parallel Example: Phase 3 (User Story 1)

```bash
# Tests first (parallel):
Task: T018 "tuneEntry unit tests"
Task: T019 "no-op tune test"
Task: T020 "artifact versioning test"

# Implementation (parallel where possible):
Task: T021 "Implement tuneEntry in LogService"        # session-state
Task: T023 "Create ParameterEditor component"          # shared-components (parallel)
Task: T026 "Create ReplayProgress component"           # shared-components (parallel)

# Integration (sequential):
Task: T032 "Add Phase 6 messages to logPanelView"
Task: T033 "Wire logPanelView to LogService"
Task: T034 "Update logPanel webview"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (type extensions)
2. Complete Phase 2: Foundation (Replay Engine)
3. Complete Phase 3: User Story 1 (Tune a Parameter)
4. **STOP and VALIDATE**: Tune a parameter in VS Code, verify plot updates
5. Demo if ready

### Incremental Delivery

1. Setup + Foundation  Foundation ready
2. Add US1 (Tune)  Test independently  MVP!
3. Add US2 (Revert To) + US3 (Revert This)  Test independently  Revert capability
4. Add US4 (Cross-Snapshot) + US5 (Version Mismatch)  Full feature  Deploy/Demo
5. Polish phase  Evidence + Media + PR

### Key Technical Risks

- **Replay Engine sequential execution**: Tool re-invocation must produce consistent results. Mock executors in tests may not capture all real-world edge cases.
- **Cross-snapshot state reconstruction**: Loading snapshot GeoJSON and replaying from scratch may be slow for large feature collections. Progress indication is critical.
- **State rollback fidelity**: Deep cloning the entire Zustand store feature state must capture all relevant state. Verify this is complete early.

---

## Notes

- [P] tasks = different files, no dependencies
- [test] tasks = write tests FIRST, verify they FAIL
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Evidence is required — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
