# Tasks: Branching from History Point

**Input**: Design documents from `/specs/075-branching/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included per the project constitution (Article VI: services require unit tests).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. These are used in PR descriptions, documentation, and future blog posts.

**Evidence Directory**: `specs/075-branching/evidence/`
**Media Directory**: `specs/075-branching/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Vitest results for branch service unit tests | After all tests pass |
| usage-example.md | Code example demonstrating branchFrom() API | After branch service complete |
| branch-creation-flow.md | Step-by-step flow: create branch, verify links, verify trimmed Log | After US1 complete |
| sample-branch-geojson.json | Example branch plot GeoJSON with BranchOrigin | After US1 complete |

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

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the branch service module skeleton and extend the type system

- [x] T001 [US1] Add BranchOrigin interface to session-state types `services/session-state/src/log/types.ts`
- [x] T002 [P][US1] Add BranchResult, BranchFromOptions, BranchPointLocation, BranchErrorCode types `services/session-state/src/log/types.ts`
- [x] T003 [P][US1] Add BranchServiceDeps interface to session-state types `services/session-state/src/log/types.ts`
- [x] T004 [US1] Extend SystemRecordProperties with branchOrigin field `services/session-state/src/log/types.ts`
- [x] T005 [US1] Create branchService.ts module skeleton with factory function `services/session-state/src/log/branchService.ts`

**Checkpoint**: Type system extended, service skeleton exists. All existing tests still pass.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement pure helper functions that all user stories depend on

**CRITICAL**: No user story work can begin until these helpers are complete

- [x] T006 [P][US1] Implement findEntryInFeatures() — search for activityId across feature provenance arrays `services/session-state/src/log/branchService.ts`
- [x] T007 [P][US1] Implement trimProvenanceToEntry() — deep-copy FeatureCollection and trim provenance to branch point `services/session-state/src/log/branchService.ts`
- [x] T008 [P][US1] Implement createBranchRecord() — build source-side BranchRecord `services/session-state/src/log/branchService.ts`
- [x] T009 [P][US1] Implement createBranchOrigin() — build branch-side BranchOrigin `services/session-state/src/log/branchService.ts`
- [x] T010 [P][US1] Implement createBranchProvEntry() — build FileProvEntry for branch events `services/session-state/src/log/branchService.ts`
- [x] T011 [test] Write unit tests for pure helper functions `services/session-state/tests/unit/log/branchService.test.ts`

**Checkpoint**: Foundation ready — all pure helpers tested and working. User story implementation can now begin.

---

## Phase 3: User Story 1 — Branch from a Log Entry (Priority: P1) MVP

**Goal**: Create a new independent plot when the analyst selects a Log entry in the current segment and chooses "Branch from here." The branch plot contains state at the branch point with a trimmed Log. Source and branch maintain two-way links via system records.

**Independent Test**: Create a plot with 5 Log entries, branch from entry 3, verify: (a) branch has 3 entries, (b) source unchanged, (c) two-way links correct, (d) branch stored as separate STAC Item.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T012 [test][US1] Test branchFrom() with mid-point entry — branch has trimmed Log `services/session-state/tests/unit/log/branchService.test.ts`
- [x] T013 [P][test][US1] Test branchFrom() with first entry — branch has single entry `services/session-state/tests/unit/log/branchService.test.ts`
- [x] T014 [P][test][US1] Test branchFrom() with last entry — branch is full duplicate `services/session-state/tests/unit/log/branchService.test.ts`
- [x] T015 [P][test][US1] Test two-way links — source BranchRecord matches branch BranchOrigin `services/session-state/tests/unit/log/branchService.test.ts`
- [x] T016 [P][test][US1] Test source unchanged after branch — all original entries intact `services/session-state/tests/unit/log/branchService.test.ts`
- [x] T017 [P][test][US1] Test file-level provenance — both system records have FileProvEntry type "branch" `services/session-state/tests/unit/log/branchService.test.ts`
- [x] T018 [P][test][US1] Test entry not found — error thrown with ENTRY_NOT_FOUND code `services/session-state/tests/unit/log/branchService.test.ts`
- [x] T019 [P][test][US1] Test markDirty called after successful branch `services/session-state/tests/unit/log/branchService.test.ts`

### Implementation for User Story 1

- [x] T020 [US1] Implement stacService.createBranchItem() — create new STAC Item directory with item.json and plot.geojson `apps/vscode/src/services/stacService.ts`
- [x] T021 [US1] Implement locateBranchPoint() — search current segment for activityId `services/session-state/src/log/branchService.ts`
- [x] T022 [US1] Implement branchFrom() core logic — deep-copy, trim, write branch, update source, mark dirty `services/session-state/src/log/branchService.ts`
- [x] T023 [US1] Wire branchFrom() into Log Service — replace stub thrown by #071 `services/session-state/src/log/logService.ts`
- [x] T024 [US1] Add golden fixture for branched system record `shared/schemas/fixtures/system-record/valid/branched-system-record.json`
- [x] T025 [US1] Extend LinkML system-record schema with BranchOrigin class and branchOrigin slot `shared/schemas/src/linkml/system-record.yaml`
- [x] T026 [US1] Run schema generators to update derived types from LinkML changes
- [x] T027 [US1] Verify all existing tests pass (session-state, schema adherence)

**Checkpoint**: User Story 1 fully functional — branch from any entry in current segment, two-way links, stored as STAC Item.

---

## Phase 4: User Story 2 — Two-Way Navigation Between Source and Branch (Priority: P2)

**Goal**: Both source and branch plots expose their relationship through the system record, enabling the analyst to discover and navigate between linked plots.

**Independent Test**: Create a branch, then call getBranches() on source and getBranchOrigin() on branch. Verify both return correct metadata with matching branchIds.

### Tests for User Story 2

- [x] T028 [test][US2] Test getBranches() returns all branch records from source `services/session-state/tests/unit/log/branchService.test.ts`
- [x] T029 [P][test][US2] Test getBranchOrigin() returns origin from branch plot `services/session-state/tests/unit/log/branchService.test.ts`
- [x] T030 [P][test][US2] Test multiple branches from same source — all listed correctly `services/session-state/tests/unit/log/branchService.test.ts`
- [x] T031 [P][test][US2] Test getBranches() on plot with no branches — returns empty array `services/session-state/tests/unit/log/branchService.test.ts`
- [x] T032 [P][test][US2] Test getBranchOrigin() on original plot — returns null `services/session-state/tests/unit/log/branchService.test.ts`

### Implementation for User Story 2

- [x] T033 [US2] Implement getBranches() — read system record branches[] array `services/session-state/src/log/branchService.ts`
- [x] T034 [US2] Implement getBranchOrigin() — read system record branchOrigin field `services/session-state/src/log/branchService.ts`
- [x] T035 [US2] Test multiple branches: create two branches from different points, verify both listed `services/session-state/tests/unit/log/branchService.test.ts`

**Checkpoint**: Navigation API complete — consumers (Log Panel, future features) can discover and traverse branch relationships.

---

## Phase 5: User Story 3 — Branch from a Point Before Current Snapshot (Priority: P3)

**Goal**: Support branching from snapshot boundaries in the snapshot chain, reconstructing state by loading the appropriate snapshot.

**Independent Test**: Create a plot with a snapshot boundary, branch from the snapshot boundary, verify: (a) branch contains correct state from snapshot, (b) branch has clean Log (snapshot features have empty provenance), (c) two-way links correct.

### Tests for User Story 3

- [x] T036 [test][US3] Test locateBranchPoint() walks snapshot chain to find entry `services/session-state/tests/unit/log/branchService.test.ts`
- [x] T037 [P][test][US3] Test branchFrom() at snapshot boundary — branch contains snapshot state `services/session-state/tests/unit/log/branchService.test.ts`
- [x] T038 [P][test][US3] Test branchFrom() at pre-snapshot arbitrary entry — REPLAY_NOT_AVAILABLE error `services/session-state/tests/unit/log/branchService.test.ts`
- [x] T039 [P][test][US3] Test branchFrom() when snapshot file missing — SNAPSHOT_NOT_FOUND error `services/session-state/tests/unit/log/branchService.test.ts`

### Implementation for User Story 3

- [x] T040 [US3] Extend locateBranchPoint() to walk snapshot chain via snapshotService `services/session-state/src/log/branchService.ts`
- [x] T041 [US3] Extend branchFrom() to handle snapshot-boundary branch points `services/session-state/src/log/branchService.ts`
- [x] T042 [US3] Add REPLAY_NOT_AVAILABLE error for pre-snapshot arbitrary entries `services/session-state/src/log/branchService.ts`
- [x] T043 [US3] Test nested branching: branch from a branch plot `services/session-state/tests/unit/log/branchService.test.ts`

**Checkpoint**: All user stories functional — branching works for current segment and snapshot boundaries, with clear error for unsupported cases.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Evidence collection, media content, and PR creation

### Evidence Collection (REQUIRED)

- [x] T044 Create evidence directory `specs/075-branching/evidence/`
- [x] T045 Capture test summary with pass/fail counts `specs/075-branching/evidence/test-summary.md`
- [x] T046 Create usage demonstration showing branchFrom() API `specs/075-branching/evidence/usage-example.md`
- [x] T047 [P] Capture sample branch plot GeoJSON `specs/075-branching/evidence/sample-branch-geojson.json`
- [x] T048 [P] Document branch creation flow step-by-step `specs/075-branching/evidence/branch-creation-flow.md`

### Media Content

- [x] T049 Create shipped blog post `specs/075-branching/media/shipped-post.md`
- [x] T050 [P] Create LinkedIn shipped summary `specs/075-branching/media/linkedin-shipped.md`

### PR Creation

- [x] T051 Create PR and publish blog: run /speckit.pr (code pushed; PR creation requires `gh auth login`)

**Task T051 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundation (Phase 2) — MVP target
- **User Story 2 (Phase 4)**: Depends on Foundation (Phase 2) — can run after or in parallel with US1 (reads branch data written by US1 tests)
- **User Story 3 (Phase 5)**: Depends on US1 (Phase 3) — extends branchFrom() and locateBranchPoint()
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundation — no dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundation — reads system records written by US1 but is independently testable
- **User Story 3 (P3)**: Depends on US1 — extends the branchFrom() implementation with snapshot chain support

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Pure helpers before service methods
- Service methods before integration wiring
- Core implementation before edge case handling
- Story complete before moving to next priority

### Parallel Opportunities

- All Foundation tasks marked [P] can run in parallel (different pure helper functions)
- All test tasks within a story marked [P] can run in parallel (independent test cases)
- US1 and US2 can be worked on in parallel after Foundation
- Evidence collection tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (they should all fail initially):
Task: "Test branchFrom() with mid-point entry" (T012)
Task: "Test branchFrom() with first entry" (T013)
Task: "Test branchFrom() with last entry" (T014)
Task: "Test two-way links" (T015)
Task: "Test source unchanged" (T016)
Task: "Test file-level provenance" (T017)
Task: "Test entry not found error" (T018)
Task: "Test markDirty called" (T019)

# Then implement sequentially:
T020 → T021 → T022 → T023 → T024 → T025 → T026 → T027
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (types, module skeleton)
2. Complete Phase 2: Foundation (pure helpers)
3. Complete Phase 3: User Story 1 (branchFrom current segment)
4. **STOP and VALIDATE**: Test branching independently
5. Demo: create a plot, add entries, branch, verify two-way links

### Incremental Delivery

1. Complete Setup + Foundation → Type system and helpers ready
2. Add User Story 1 → Branch from current segment (MVP!)
3. Add User Story 2 → Navigation API for branch discovery
4. Add User Story 3 → Snapshot-boundary branching
5. Each story adds capability without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundation together
2. Once Foundation is done:
   - Developer A: User Story 1 (core branching)
   - Developer B: User Story 2 (navigation API) — can start with mock data
3. User Story 3 follows after US1 is complete

---

## Notes

- [P] tasks = different files or independent functions, no dependencies
- [US*] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **Pre-snapshot arbitrary branching** is explicitly out of scope for the initial implementation — blocked on Phase 6 replay engine
- **Evidence is required** — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
