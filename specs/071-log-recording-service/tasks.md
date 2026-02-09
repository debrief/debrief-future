# Tasks: Log Recording Service

**Input**: Design documents from `/specs/071-log-recording-service/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. These are used in PR descriptions, documentation, and future blog posts.

**Evidence Directory**: `specs/071-log-recording-service/evidence/`
**Media Directory**: `specs/071-log-recording-service/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Vitest results for all Log Service unit + integration tests | After all tests pass |
| usage-example.md | Code example: recordToolResult + getTimeline roundtrip | After US1 + US2 complete |
| log-entry-sample.json | Sample PROV-aligned Log entry JSON | After entry builder works |
| timeline-sample.json | Sample timeline output (deduplicated, sorted) | After timeline assembly works |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | During /speckit.plan |
| media/linkedin-planning.md | LinkedIn summary for planning | During /speckit.plan |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup

**Purpose**: Create directory structure and base files for the Log Service module

- [ ] T001 Create log module directory and index `services/session-state/src/log/index.ts`
- [ ] T002 [P] Create log types file `services/session-state/src/log/types.ts`
- [ ] T003 [P] Create test directory structure `services/session-state/tests/unit/log/`

**Checkpoint**: Directory structure ready, type foundations in place

---

## Phase 2: Foundation (Blocking Prerequisites)

**Purpose**: Core types and pure functions that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 [US-all] Define LogEntry, WasGeneratedBy, ParameterValue, TuneAnnotation types in `services/session-state/src/log/types.ts`
- [ ] T005 [P] [US-all] Define ExpandedToolResultFields, ModifiedFeature, PropertyDelta, CreatedAsset types in `services/session-state/src/log/types.ts`
- [ ] T006 [P] [US-all] Define RecordResult, TimelineOptions, LogService interface in `services/session-state/src/log/types.ts`
- [ ] T007 [US-all] Implement buildLogEntry() pure function in `services/session-state/src/log/entryBuilder.ts`
- [ ] T008 [test] Write entryBuilder unit tests `services/session-state/tests/unit/log/entryBuilder.test.ts`
- [ ] T009 [US-all] Implement msToIsoDuration() helper for duration conversion in `services/session-state/src/log/entryBuilder.ts`
- [ ] T010 [US-all] Export log module types from `services/session-state/src/index.ts`

**Checkpoint**: Foundation ready -- LogEntry types defined, entry builder tested, duration conversion working

---

## Phase 3: User Story 1 -- Record Every Tool Execution (Priority: P1)

**Goal**: Every successful tool execution produces a PROV-aligned Log entry on every affected feature

**Independent Test**: Execute a tool, inspect affected features' `properties.provenance` arrays for correctly structured Log entries with shared `activityId`

### Implementation for User Story 1

- [ ] T011 [US1] Add appendProvenance() method to stacService `apps/vscode/src/services/stacService.ts`
- [ ] T012 [US1] Implement createLogService() factory and recordToolResult() in `services/session-state/src/log/logService.ts`
- [ ] T013 [US1] Handle legacy provenance format (single object -> array wrapping) in logService `services/session-state/src/log/logService.ts`
- [ ] T014 [US1] Add Phase 4-6 stub methods (tuneEntry, revertTo, revertThis, createSnapshot, branchFrom) in `services/session-state/src/log/logService.ts`
- [ ] T015 [US1] Export LogService factory from `services/session-state/src/log/index.ts`
- [ ] T016 [test] Write logService unit tests (mock stacService and store) `services/session-state/tests/unit/log/logService.test.ts`
- [ ] T017 [test] Write integration test with real stacService and temp files `services/session-state/tests/integration/logIntegration.test.ts`

**Checkpoint**: Core recording works -- tool results produce Log entries on features, markDirty() fires, entries persist via stacService

---

## Phase 4: User Story 2 -- Assemble Global Timeline (Priority: P2)

**Goal**: Collect Log entries from all features, deduplicate on activityId, return sorted by timestamp

**Independent Test**: Record multiple tool executions (including multi-feature operations), call getTimeline(), verify deduplication and sort order

### Implementation for User Story 2

- [ ] T018 [US2] Implement assembleTimeline() pure function in `services/session-state/src/log/timeline.ts`
- [ ] T019 [US2] Integrate getTimeline() into LogService using stacService to load GeoJSON `services/session-state/src/log/logService.ts`
- [ ] T020 [test] Write timeline unit tests (dedup, sort, empty case) `services/session-state/tests/unit/log/timeline.test.ts`

**Checkpoint**: Timeline assembly works -- entries deduplicated on activityId, sorted ascending by timestamp, empty plot returns empty array

---

## Phase 5: User Story 3 -- Expanded ToolResult Parsing (Priority: P3)

**Goal**: Parse new MCP annotations (toolVersion, modifiedFeatures, createdAssets, parameters) and map to Log entry fields with graceful fallback for legacy tools

**Independent Test**: Construct MCP responses with and without expanded fields, verify parsing produces correct ExpandedToolResultFields (or undefined for legacy)

### Implementation for User Story 3

- [ ] T021 [US3] Add expanded fields to ToolExecutionResult type `apps/vscode/src/types/tool.ts`
- [ ] T022 [P] [US3] Add expanded annotation keys to DebriefAnnotations type `apps/vscode/src/types/tool.ts`
- [ ] T023 [US3] Parse new MCP annotations in calcService.executeToolOnMcp() `apps/vscode/src/services/calcService.ts`
- [ ] T024 [US3] Update buildLogEntry() to use expanded fields when available `services/session-state/src/log/entryBuilder.ts`
- [ ] T025 [test] Add entryBuilder tests for expanded vs legacy ToolResult `services/session-state/tests/unit/log/entryBuilder.test.ts`

**Checkpoint**: Expanded parsing works -- new fields extracted from MCP, mapped to Log entries, legacy tools still produce valid entries

---

## Phase 6: User Story 4 -- Transparent Integration (Priority: P4)

**Goal**: Wire Log Service into executeTool.ts, update web-shell, verify dirty tracking and save workflow

**Independent Test**: Run full tool execution end-to-end, verify dirty flag set, trigger save, confirm GeoJSON contains Log entries

### Implementation for User Story 4

- [ ] T026 [US4] Integrate logService.recordToolResult() call into executeTool.ts `apps/vscode/src/commands/executeTool.ts`
- [ ] T027 [US4] Create and wire LogService instance in VS Code extension activation `apps/vscode/src/extension.ts`
- [ ] T028 [US4] Update web-shell toolService to handle expanded ToolResult fields `apps/web-shell/src/services/toolService.ts`
- [ ] T029 [US4] Verify existing tool execution tests still pass (no regressions)
- [ ] T030 [test] Write integration test: full flow from executeTool through Log Service `services/session-state/tests/integration/logIntegration.test.ts`

**Checkpoint**: Full integration works -- tool execution triggers recording, dirty flag set, web-shell handles new fields without errors, existing tests pass

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Evidence collection, media content, and PR creation

### Evidence Collection

- [ ] T031 Capture test summary with pass/fail counts in `specs/071-log-recording-service/evidence/test-summary.md`
- [ ] T032 Create usage demonstration in `specs/071-log-recording-service/evidence/usage-example.md`
- [ ] T033 [P] Capture sample Log entry JSON in `specs/071-log-recording-service/evidence/log-entry-sample.json`
- [ ] T034 [P] Capture sample timeline output in `specs/071-log-recording-service/evidence/timeline-sample.json`

### Media Content

- [ ] T035 Create shipped blog post in `specs/071-log-recording-service/media/shipped-post.md`
- [ ] T036 [P] Create LinkedIn shipped summary in `specs/071-log-recording-service/media/linkedin-shipped.md`

### PR Creation

- [ ] T037 Create PR and publish blog: run /speckit.pr

**Task T037 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies -- can start immediately
- **Foundation (Phase 2)**: Depends on Setup -- BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundation -- core recording capability
- **US2 (Phase 4)**: Depends on Foundation -- timeline assembly (can run parallel with US1)
- **US3 (Phase 5)**: Depends on Foundation -- expanded parsing (can run parallel with US1/US2)
- **US4 (Phase 6)**: Depends on US1 + US3 -- wires everything together
- **Polish (Phase 7)**: Depends on all user stories complete

### Within Each Phase

- Types/interfaces before implementations
- Pure functions before service wiring
- Unit tests after implementation (within same phase)
- Integration tests after all phase components ready

### Parallel Opportunities

- T002 + T003: Types and test dirs can be created in parallel
- T005 + T006: Expanded types and service interface can be defined in parallel
- US1, US2, US3 (Phases 3-5) can proceed in parallel after Foundation
- T033 + T034: Evidence artifacts can be captured in parallel
- T035 + T036: Media content can be created in parallel

---

## Parallel Example: Foundation Phase

```bash
# Types can be defined in parallel:
Task: "Define ExpandedToolResultFields types" [T005]
Task: "Define LogService interface types" [T006]

# After types, entry builder is next:
Task: "Implement buildLogEntry()" [T007]
Task: "Write entryBuilder tests" [T008]
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundation (types + entry builder)
3. Complete Phase 3: US1 (recording)
4. **STOP and VALIDATE**: Tool execution produces Log entries on features
5. This alone delivers the core Phase 1 value

### Incremental Delivery

1. Setup + Foundation -> Types and pure functions ready
2. US1 (Recording) -> Core capability working -> MVP
3. US2 (Timeline) -> Timeline assembly for future Log Panel
4. US3 (Expanded parsing) -> Rich Log entries from modern tools
5. US4 (Integration) -> Full end-to-end wiring
6. Polish -> Evidence, media, PR

---

## Notes

- [P] tasks = different files, no dependencies
- [US] labels map tasks to specific user stories for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- No new npm dependencies needed
- All tests use Vitest (existing framework)
- Feature complexity is **High** -- use **opus** model for implementation agents
