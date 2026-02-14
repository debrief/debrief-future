# Tasks: Logical Result ID Registry

**Input**: Design documents from `/specs/087-logical-result-id-registry/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included — Constitution VII mandates test-driven development for services.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. These are used in PR descriptions, documentation, and future blog posts.

**Evidence Directory**: `specs/087-logical-result-id-registry/evidence/`
**Media Directory**: `specs/087-logical-result-id-registry/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Vitest results with pass/fail counts and coverage | After all tests pass |
| usage-example.md | TypeScript code demonstrating registry API | After registry implementation complete |
| api-contract-validation.md | Confirmation that implementation matches contract | After integration complete |

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

**Purpose**: Create the registry module structure and type definitions

- [x] T001 Create registry module directory and barrel export `services/session-state/src/registry/index.ts`
- [x] T002 [P] Define ResultIdMapping and ResultIdChangeEvent types `services/session-state/src/registry/types.ts`
- [x] T003 [P] Define StacAssetForHydration type `services/session-state/src/registry/types.ts`
- [x] T004 [P] Define ResultIdChangeCallback type and ResultIdRegistry interface `services/session-state/src/registry/types.ts`
- [x] T005 Re-export registry types and factory from session-state package index `services/session-state/src/index.ts`

**Checkpoint**: Type definitions compile, barrel exports resolve, no runtime code yet

---

## Phase 2: Foundation (Core Registry Logic)

**Purpose**: Implement the core in-memory map and change event emission that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundation

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T006 [test] Write tests for createResultIdRegistry factory and initial state `services/session-state/tests/registry/resultIdRegistry.test.ts`
- [x] T007 [P][test] Write tests for resolve() returning undefined for unknown IDs `services/session-state/tests/registry/resultIdRegistry.test.ts`
- [x] T008 [P][test] Write tests for clear() removing all mappings `services/session-state/tests/registry/resultIdRegistry.test.ts`
- [x] T009 [P][test] Write tests for size property `services/session-state/tests/registry/resultIdRegistry.test.ts`

### Implementation for Foundation

- [x] T010 Implement createResultIdRegistry factory with internal Map, resolve, listAll, size, clear `services/session-state/src/registry/resultIdRegistry.ts`
- [x] T011 Implement internal _register method that updates Map and emits change events to subscribers `services/session-state/src/registry/resultIdRegistry.ts`
- [x] T012 Verify foundation tests pass

**Checkpoint**: Factory creates registry, resolve/listAll/size/clear work, change events emitted internally

---

## Phase 3: User Story 1 — Register and Resolve Result IDs (Priority: P1) MVP

**Goal**: Log entries with `generatedResultId` automatically populate the registry; consumers can resolve result IDs to file paths

**Independent Test**: Register a result from a LogEntry, then query the registry and verify the correct path is returned

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T013 [test] Write tests for registerFromLogEntry with valid generatedResultId `services/session-state/tests/registry/resultIdRegistry.test.ts`
- [x] T014 [P][test] Write tests for registerFromLogEntry with null/undefined generatedResultId (no-op) `services/session-state/tests/registry/resultIdRegistry.test.ts`
- [x] T015 [P][test] Write tests for registerFromRecordResult delegating to registerFromLogEntry `services/session-state/tests/registry/resultIdRegistry.test.ts`
- [x] T016 [P][test] Write tests for registerFromReplayResult processing ArtifactVersion array `services/session-state/tests/registry/resultIdRegistry.test.ts`

### Implementation for User Story 1

- [x] T017 Implement registerFromLogEntry: extract generatedResultId and generated[0] path from LogEntry, call _register `services/session-state/src/registry/resultIdRegistry.ts`
- [x] T018 Implement registerFromRecordResult: iterate entries, delegate to registerFromLogEntry `services/session-state/src/registry/resultIdRegistry.ts`
- [x] T019 Implement registerFromReplayResult: iterate ArtifactVersion[], call _register for each `services/session-state/src/registry/resultIdRegistry.ts`
- [x] T020 Verify User Story 1 tests pass

**Checkpoint**: LogEntry and RecordResult registration works. resolve() returns correct paths. No-op for entries without generatedResultId.

---

## Phase 4: User Story 2 — Track Result Updates on Re-Run (Priority: P1)

**Goal**: When a result ID mapping is updated (re-run produces new version), change events are emitted to all active subscribers

**Independent Test**: Register a result, subscribe to its ID, update the result, verify change event received with old and new paths

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T021 [test] Write tests for subscribe() receiving change events on update `services/session-state/tests/registry/resultIdRegistry.test.ts`
- [x] T022 [P][test] Write tests for subscribeAll() receiving all change events `services/session-state/tests/registry/resultIdRegistry.test.ts`
- [x] T023 [P][test] Write tests for unsubscribe preventing further callbacks `services/session-state/tests/registry/resultIdRegistry.test.ts`
- [x] T024 [P][test] Write tests for change event containing resultId, previousPath, newPath `services/session-state/tests/registry/resultIdRegistry.test.ts`
- [x] T025 [P][test] Write tests for multiple subscribers receiving independent notifications `services/session-state/tests/registry/resultIdRegistry.test.ts`
- [x] T026 [P][test] Write tests for per-ID subscriber NOT receiving events for other IDs `services/session-state/tests/registry/resultIdRegistry.test.ts`

### Implementation for User Story 2

- [x] T027 Implement subscribe(): add per-ID callback to internal Set, return unsubscribe function `services/session-state/src/registry/resultIdRegistry.ts`
- [x] T028 Implement subscribeAll(): add global callback to internal Set, return unsubscribe function `services/session-state/src/registry/resultIdRegistry.ts`
- [x] T029 Wire _register to emit ResultIdChangeEvent to per-ID and global subscribers `services/session-state/src/registry/resultIdRegistry.ts`
- [x] T030 Ensure clear() removes all subscriptions in addition to mappings `services/session-state/src/registry/resultIdRegistry.ts`
- [x] T031 Verify User Story 2 tests pass

**Checkpoint**: Subscriptions work. Change events emitted on first registration and on update. Unsubscribe stops callbacks. Per-ID filtering correct.

---

## Phase 5: User Story 3 — Populate Registry from Existing Plot (Priority: P2)

**Goal**: On plot load, the registry hydrates from STAC Item assets with `debrief:resultId` metadata, selecting the highest version per result ID

**Independent Test**: Construct a STAC asset map with multiple versioned assets, call hydrateFromAssets, verify registry contains correct latest-version mappings

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T032 [test] Write tests for hydrateFromAssets with single result ID, single version `services/session-state/tests/registry/hydration.test.ts`
- [x] T033 [P][test] Write tests for hydrateFromAssets selecting highest version from multiple versions `services/session-state/tests/registry/hydration.test.ts`
- [x] T034 [P][test] Write tests for hydrateFromAssets with multiple distinct result IDs `services/session-state/tests/registry/hydration.test.ts`
- [x] T035 [P][test] Write tests for hydrateFromAssets ignoring assets without debrief:resultId `services/session-state/tests/registry/hydration.test.ts`
- [x] T036 [P][test] Write tests for hydrateFromAssets with empty asset map (no error) `services/session-state/tests/registry/hydration.test.ts`
- [x] T037 [P][test] Write tests that hydrateFromAssets does NOT emit change events `services/session-state/tests/registry/hydration.test.ts`

### Implementation for User Story 3

- [x] T038 Implement hydrateFromAssets: scan assets, group by debrief:resultId, select highest debrief:version, populate Map without emitting events `services/session-state/src/registry/resultIdRegistry.ts`
- [x] T039 Verify User Story 3 tests pass

**Checkpoint**: Hydration works. Highest version selected. Legacy assets ignored. No change events during hydration.

---

## Phase 6: User Story 4 — Subscribe to Specific Result IDs (Priority: P2)

**Goal**: Views can subscribe to individual result IDs for targeted notifications (refine the subscription API proven in Phase 4 with edge cases)

**Independent Test**: Subscribe to one result ID, update a different result ID, confirm the subscriber is NOT notified. Then update the subscribed ID and confirm notification arrives.

### Tests for User Story 4

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T040 [test] Write tests for rapid successive updates producing correctly ordered events `services/session-state/tests/registry/resultIdRegistry.test.ts`
- [x] T041 [P][test] Write tests for registering after hydration (hydrate then register new version) `services/session-state/tests/registry/resultIdRegistry.test.ts`
- [x] T042 [P][test] Write tests for clear() during active subscriptions (no callbacks after clear) `services/session-state/tests/registry/resultIdRegistry.test.ts`

### Implementation for User Story 4

- [x] T043 Handle edge case: rapid successive updates emit sequential change events `services/session-state/src/registry/resultIdRegistry.ts`
- [x] T044 Handle edge case: registering after hydration triggers change event (old path from hydration, new from LogEntry) `services/session-state/src/registry/resultIdRegistry.ts`
- [x] T045 Verify User Story 4 tests pass

**Checkpoint**: All edge cases handled. Subscriptions work correctly across hydration + live updates. Clear during active subscriptions is safe.

---

## Phase 7: VS Code Extension Integration

**Purpose**: Wire the registry into the VS Code extension's plot lifecycle and tool execution flow

### Tests for Integration

- [x] T046 [test] Write integration test: mock LogService RecordResult → registry populated `services/session-state/tests/registry/resultIdRegistry.test.ts`
- [x] T047 [P][test] Write integration test: mock STAC assets → hydrate → registry populated `services/session-state/tests/registry/hydration.test.ts`

### Implementation for Integration

- [x] T048 Add registerFromRecordResult call after logService.recordToolResult in executeTool command `apps/vscode/src/commands/executeTool.ts`
- [x] T049 Add registerFromReplayResult call after replay/tune operations in logPanelView `apps/vscode/src/views/logPanelView.ts`
- [x] T050 Add hydrateFromAssets call in openPlot command (reads STAC item JSON directly) `apps/vscode/src/commands/openPlot.ts`
- [x] T051 Create registry instance in extension activation and wire to commands and log panel `apps/vscode/src/extension.ts`
- [x] T052 Export createResultIdRegistry from session-state barrel if not already done `services/session-state/src/index.ts`
- [x] T053 Verify existing tests still pass (no regression) — 521 tests pass, 0 failures

**Checkpoint**: Registry is wired end-to-end in VS Code extension. Tool executions populate registry. Plot load hydrates registry. Plot close clears registry.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Evidence, documentation, media content, and PR creation

### Evidence Collection

- [x] T054 Create evidence directory `specs/087-logical-result-id-registry/evidence/`
- [x] T055 Capture test results in `specs/087-logical-result-id-registry/evidence/test-summary.md`
- [x] T056 Create usage demonstration in `specs/087-logical-result-id-registry/evidence/usage-example.md`
- [x] T057 [P] Validate implementation matches API contract in `specs/087-logical-result-id-registry/evidence/api-contract-validation.md`

### Media Content

- [x] T058 Create shipped blog post in `specs/087-logical-result-id-registry/media/shipped-post.md`
- [x] T059 [P] Create LinkedIn shipped summary in `specs/087-logical-result-id-registry/media/linkedin-shipped.md`

### PR Creation

- [x] T060 Create PR and publish blog: run /speckit.pr

**Task T060 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately
- **Phase 2 (Foundation)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1: Register/Resolve)**: Depends on Phase 2
- **Phase 4 (US2: Change Events)**: Depends on Phase 3 (needs registration to test updates)
- **Phase 5 (US3: Hydration)**: Depends on Phase 2 (independent of US1/US2)
- **Phase 6 (US4: Subscription Edge Cases)**: Depends on Phase 4 (needs subscription infrastructure)
- **Phase 7 (Integration)**: Depends on Phases 3, 4, 5 (all user stories)
- **Phase 8 (Polish)**: Depends on Phase 7

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundation (Phase 2) — defines core registration
- **User Story 2 (P1)**: Depends on US1 — needs registration to test update events
- **User Story 3 (P2)**: Can start after Foundation (Phase 2) — independent of US1/US2 for hydration
- **User Story 4 (P2)**: Depends on US2 — refines subscription edge cases

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Types before logic
- Core methods before edge cases
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 1**: T002, T003, T004 can run in parallel (separate type groups in same file)
- **Phase 2**: T007, T008, T009 test tasks can run in parallel
- **Phase 3**: T014, T015, T016 test tasks can run in parallel
- **Phase 4**: T022–T026 test tasks can run in parallel
- **Phase 5**: T033–T037 test tasks can run in parallel; Phase 5 can run in parallel with Phase 3/4 if staffed
- **Phase 7**: T046, T047 test tasks can run in parallel; T048, T049, T050, T051 touch different files
- **Phase 8**: T057, T059 can run in parallel with T055, T056

---

## Parallel Example: Phase 4 Tests

```bash
# Launch all subscription tests in parallel:
Task: "Write tests for subscribeAll() receiving all change events"
Task: "Write tests for unsubscribe preventing further callbacks"
Task: "Write tests for change event containing resultId, previousPath, newPath"
Task: "Write tests for multiple subscribers receiving independent notifications"
Task: "Write tests for per-ID subscriber NOT receiving events for other IDs"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (types and exports)
2. Complete Phase 2: Foundation (core Map + change events)
3. Complete Phase 3: User Story 1 (register and resolve)
4. Complete Phase 4: User Story 2 (change event subscriptions)
5. **STOP and VALIDATE**: Registry can register from LogEntry, resolve by ID, and notify subscribers on update

### Incremental Delivery

1. Setup + Foundation → Types compile, factory works
2. Add US1 → Register/resolve works → Validates core value prop
3. Add US2 → Change events work → Validates auto-refresh foundation
4. Add US3 → Hydration works → Validates session continuity
5. Add US4 → Edge cases handled → Validates robustness
6. Integration → Wired into VS Code → End-to-end functional
7. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [test] label = write tests first, verify they fail before implementing
- All registry operations are synchronous — no async concerns
- The registry has zero external dependencies — purely internal to @debrief/session-state
- Existing Log Service and tool execution tests must continue passing (T053)
- Evidence is required — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
