# Tasks: Split Undo/Redo — UI-Only Undo, Data Changes via Log

**Input**: Design documents from `/specs/073-undo-redo-split/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included — the spec requires test-first validation (FR-009, SC-002, SC-003).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

---

## Evidence Requirements

**Evidence Directory**: `specs/073-undo-redo-split/evidence/`
**Media Directory**: `specs/073-undo-redo-split/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | vitest results with pass/fail counts | After all tests pass |
| usage-example.md | Code showing narrower StateSnapshot in action | After implementation complete |
| before-after-snapshot.md | StateSnapshot field comparison (12 → 10) | After core changes |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | Already created during /speckit.plan |
| media/linkedin-planning.md | LinkedIn summary for planning | Already created during /speckit.plan |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup (Verification)

**Purpose**: Verify prerequisites are met and all target files exist

- [x] T001 Verify #071 Log Recording Service is merged (check logService.ts exists and markDirty integration works) `services/session-state/src/log/logService.ts`
- [x] T002 [P] Read current StateSnapshot interface and document the 12-field baseline `services/session-state/src/store/index.ts`
- [x] T003 [P] Read current DIRTY_TRIGGER_FIELDS and document the 11-field baseline `services/session-state/src/store/middleware/dirty.ts`

**Checkpoint**: Prerequisites confirmed — implementation can begin

---

## Phase 2: Foundation (Test-First — Define Expected Shape)

**Purpose**: Write tests that define the target state BEFORE making changes. Tests should FAIL initially.

- [x] T004 [test] Add snapshot field-count assertion test: StateSnapshot must contain exactly 10 fields `services/session-state/tests/unit/undo.test.ts`
- [x] T005 [test] Add test that featureCollectionUri changes do NOT create undo history entries `services/session-state/tests/unit/undo.test.ts`
- [x] T006 [test] Add test that savePath changes do NOT create undo history entries `services/session-state/tests/unit/undo.test.ts`
- [x] T007 Run test suite and confirm new tests FAIL (existing tests still pass) `services/session-state/`

**Checkpoint**: New tests written and failing — target state is defined

---

## Phase 3: User Story 1 — Undo Only Reverses Display State (Priority: P1) MVP

**Goal**: Narrow StateSnapshot to 10 UI-only fields so Ctrl+Z only reverts display state

**Independent Test**: Perform display-state changes (pan, zoom, time, visibility, selection), press Ctrl+Z, verify only display fields revert with no side-effects on loaded data

### Implementation for User Story 1

- [x] T008 [US1] Remove `featureCollectionUri` and `savePath` from local StateSnapshot interface `services/session-state/src/store/index.ts`
- [x] T009 [US1] Update `createSnapshot()` to exclude removed fields (only capture 10 UI fields) `services/session-state/src/store/index.ts`
- [x] T010 [US1] Update `applySnapshot()` to not restore removed fields (only apply 10 UI fields) `services/session-state/src/store/index.ts`
- [x] T011 [US1] Simplify exported StateSnapshot type to `Omit<SessionState, 'document'>` `services/session-state/src/types/index.ts`
- [x] T012 [US1] Remove `featureCollectionUri` from DIRTY_TRIGGER_FIELDS `services/session-state/src/store/middleware/dirty.ts`
- [x] T013 [US1] Run test suite: new field-count test (T004) passes, existing undo tests pass `services/session-state/`

**Checkpoint**: StateSnapshot narrowed to 10 fields. Ctrl+Z only affects UI state. All tests green.

---

## Phase 4: User Story 2 — Tool Execution Not Undoable via Ctrl+Z (Priority: P2)

**Goal**: Verify that tool execution results are not affected by Ctrl+Z — they are tracked by the Log Service instead

**Independent Test**: Execute a tool that modifies data, press Ctrl+Z, verify tool output persists and only UI-state changes are undone

### Implementation for User Story 2

- [x] T014 [US2] Verify featureCollectionUri-change test (T005) now passes after Phase 3 changes `services/session-state/tests/unit/undo.test.ts`
- [x] T015 [US2] Verify savePath-change test (T006) now passes after Phase 3 changes `services/session-state/tests/unit/undo.test.ts`
- [x] T016 [US2] Run full test suite and confirm all tests pass `services/session-state/`

**Checkpoint**: Tool execution (via featureCollectionUri) confirmed non-undoable. Log Service handles data-change tracking.

---

## Phase 5: User Story 3 — Existing Undo Behaviour Preserved (Priority: P3)

**Goal**: Confirm all existing undo mechanics work identically: 50-step limit, duplicate suppression, ephemeral-field exclusion, redo stack clearing

**Independent Test**: Run existing undo test suite — all 12 original tests pass without logic changes

### Implementation for User Story 3

- [x] T017 [US3] Run existing undo tests: basic undo/redo, canUndo/canRedo, clearHistory `services/session-state/tests/unit/undo.test.ts`
- [x] T018 [US3] Run existing undo tests: 50-step history limit `services/session-state/tests/unit/undo.test.ts`
- [x] T019 [US3] Run existing undo tests: ephemeral field exclusion, cross-slice undo `services/session-state/tests/unit/undo.test.ts`
- [x] T020 [US3] Run complete session-state test suite (all packages) to check for regressions `services/session-state/`

**Checkpoint**: All existing undo/redo mechanics preserved. Zero regressions.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Evidence collection, media content, and PR creation

### Evidence Collection

- [x] T021 Capture test results in `specs/073-undo-redo-split/evidence/test-summary.md`
- [x] T022 Create usage demonstration in `specs/073-undo-redo-split/evidence/usage-example.md`
- [x] T023 [P] Document before/after StateSnapshot comparison in `specs/073-undo-redo-split/evidence/before-after-snapshot.md`

### Media Content

- [x] T024 Create shipped blog post in `specs/073-undo-redo-split/media/shipped-post.md`
- [x] T025 [P] Create LinkedIn shipped summary in `specs/073-undo-redo-split/media/linkedin-shipped.md`

### PR Creation

- [x] T026 Create PR and publish blog: run /speckit.pr (branch pushed; PR created manually — GitHub API auth unavailable in cloud env)

**Task T026 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — verify prerequisites immediately
- **Foundation (Phase 2)**: Depends on Setup — write failing tests first
- **User Story 1 (Phase 3)**: Depends on Foundation — core implementation
- **User Story 2 (Phase 4)**: Depends on User Story 1 — verification of non-undoable data changes
- **User Story 3 (Phase 5)**: Depends on User Story 1 — regression verification
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Core change. All other stories depend on this.
- **User Story 2 (P2)**: Verification only — can start after US1 is complete
- **User Story 3 (P3)**: Regression verification — can run in parallel with US2 after US1

### Parallel Opportunities

- T002, T003 can run in parallel (different files)
- T005, T006 can run in parallel (different test cases)
- T008-T012 are sequential (same file dependencies)
- T014, T015 can run in parallel (different assertions)
- T017-T019 can run in parallel (different test suites)
- T021-T023 evidence tasks can run in parallel
- T024, T025 media tasks can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Verify prerequisites
2. Complete Phase 2: Write failing tests (defines "done")
3. Complete Phase 3: Narrow StateSnapshot (4 files, ~30 lines)
4. **STOP and VALIDATE**: All tests green, field count = 10
5. This alone delivers the core value: undo only affects UI state

### Incremental Delivery

1. Setup + Foundation → Tests define expected behaviour
2. User Story 1 → Core change delivered → Test independently (MVP!)
3. User Story 2 → Data-change non-undoability confirmed
4. User Story 3 → Regression safety verified
5. Polish → Evidence captured, PR created

---

## Notes

- [P] tasks = different files, no dependencies
- [US*] label maps task to specific user story for traceability
- This is a low-complexity feature: 4 files modified, ~30 lines changed
- All existing 12 undo tests should continue passing — no test logic changes needed
- The 3 new tests (T004-T006) define the target state before implementation
- Evidence is required — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
