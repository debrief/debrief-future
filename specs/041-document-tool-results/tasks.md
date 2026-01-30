# Tasks: Tool Results Architecture

**Input**: Design documents from `/specs/041-document-tool-results/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included as required by the Constitution (Article VI.2: "Services require unit tests").

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. These are used in PR descriptions, documentation, and future blog posts.

**Evidence Directory**: `specs/041-document-tool-results/evidence/`
**Media Directory**: `specs/041-document-tool-results/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | pytest + vitest results across all packages | After all tests pass |
| usage-example.md | Python code building and persisting a tool result | After persistence complete |
| sample-mutation.json | MCP response for a mutation result | After result builder works |
| sample-addition.json | MCP response for an addition result | After result builder works |
| sample-deletion.json | MCP response for a deletion result | After result builder works |
| sample-artifact.json | MCP response for an artifact result | After result builder works |
| diff-output.json | FeatureCollectionDiff output example | After diff utility works |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project scaffolding and schema definition

- [ ] T001 Create LinkML result type schema `shared/schemas/src/linkml/tool-result.yaml`
- [ ] T002 [P] Create valid golden fixture for mutation result `shared/schemas/fixtures/tool-result/valid/mutation.json`
- [ ] T003 [P] Create valid golden fixture for addition result `shared/schemas/fixtures/tool-result/valid/addition.json`
- [ ] T004 [P] Create valid golden fixture for deletion result `shared/schemas/fixtures/tool-result/valid/deletion.json`
- [ ] T005 [P] Create valid golden fixture for artifact result `shared/schemas/fixtures/tool-result/valid/artifact.json`
- [ ] T006 [P] Create invalid golden fixtures (missing annotations, bad top-level type) `shared/schemas/fixtures/tool-result/invalid/`
- [ ] T007 Create evidence and media directories `specs/041-document-tool-results/evidence/`

---

## Phase 2: Foundation (Blocking Prerequisites)

**Purpose**: Core types and utilities that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T008 [test] Write ResultTopType and ResultTypePath unit tests `services/calc/tests/test_result_types.py`
- [ ] T009 Implement ResultTopType enum and ResultTypePath class `services/calc/debrief_calc/result_types.py`
- [ ] T010 [test] Write provenance writing tests `services/stac/tests/test_provenance.py`
- [ ] T011 Implement write_provenance() function `services/stac/src/debrief_stac/provenance.py`

**Checkpoint**: Foundation ready — result type classification and provenance writing available for all stories

---

## Phase 3: User Story 1 — Tool Returns Typed Result (Priority: P1) 🎯 MVP

**Goal**: Tools return MCP-compliant responses with Debrief annotations classifying results into one of four types

**Independent Test**: Invoke any calc tool and verify response contains valid MCP content with `debrief:resultType`, `debrief:sourceFeatures`, and `debrief:label` annotations

### Tests for User Story 1

- [ ] T012 [P][test] Write build_mutation tests `services/calc/tests/test_result_builder.py`
- [ ] T013 [P][test] Write build_addition tests `services/calc/tests/test_result_builder.py`
- [ ] T014 [P][test] Write build_deletion tests `services/calc/tests/test_result_builder.py`
- [ ] T015 [P][test] Write build_artifact tests `services/calc/tests/test_result_builder.py`
- [ ] T016 [P][test] Write build_error tests `services/calc/tests/test_result_builder.py`

### Implementation for User Story 1

- [ ] T017 Implement build_mutation() `services/calc/debrief_calc/result_builder.py`
- [ ] T018 Implement build_addition() `services/calc/debrief_calc/result_builder.py`
- [ ] T019 Implement build_deletion() `services/calc/debrief_calc/result_builder.py`
- [ ] T020 Implement build_artifact() `services/calc/debrief_calc/result_builder.py`
- [ ] T021 Implement build_error() `services/calc/debrief_calc/result_builder.py`
- [ ] T022 Update MCP server to use result_builder for tool responses `services/calc/debrief_calc/mcp/server.py`
- [ ] T023 Verify all US1 tests pass

**Checkpoint**: Tools return typed, annotated MCP responses — US1 independently functional

---

## Phase 4: User Story 2 — Result Persisted to STAC Catalog (Priority: P1) 🎯 MVP

**Goal**: debrief-stac persists all four result types with provenance recording

**Independent Test**: Send each result type to debrief-stac and verify FeatureCollection, item.json, and results/ directory are correctly updated

### Tests for User Story 2

- [ ] T024 [P][test] Write update_features tests `services/stac/tests/test_features.py`
- [ ] T025 [P][test] Write delete_features tests `services/stac/tests/test_features.py`
- [ ] T026 [test] Write persist_result routing tests (all four types) `services/stac/tests/test_results.py`
- [ ] T027 [test] Write artifact file persistence tests `services/stac/tests/test_results.py`

### Implementation for User Story 2

- [ ] T028 Implement update_features() in features module `services/stac/src/debrief_stac/features.py`
- [ ] T029 Implement delete_features() in features module `services/stac/src/debrief_stac/features.py`
- [ ] T030 Implement persist_result() routing by result type `services/stac/src/debrief_stac/results.py`
- [ ] T031 Implement artifact file write + STAC Item asset update in persist_result `services/stac/src/debrief_stac/results.py`
- [ ] T032 Integrate provenance writing into persist_result for all types `services/stac/src/debrief_stac/results.py`
- [ ] T033 Add persist_result MCP tool to stac server `services/stac/src/debrief_stac/mcp/server.py`
- [ ] T034 Verify all US2 tests pass

**Checkpoint**: Full compute-persist pipeline works — US1 + US2 form the MVP

---

## Phase 5: User Story 3 — Frontend Renders Result Changes (Priority: P2)

**Goal**: Shared diff utility computes added/removed/modified features between two FeatureCollections

**Independent Test**: Provide two FeatureCollections to the diff utility and verify correct change sets

### Tests for User Story 3

- [ ] T035 [test] Write diffFeatureCollections tests (add, remove, modify, identical, empty) `shared/components/diff/tests/diffFeatureCollections.test.ts`

### Implementation for User Story 3

- [ ] T036 Create diff package scaffolding (package.json, tsconfig) `shared/components/diff/`
- [ ] T037 Implement diffFeatureCollections() `shared/components/diff/src/diffFeatureCollections.ts`
- [ ] T038 Export public API from package index `shared/components/diff/src/index.ts`
- [ ] T039 Verify all US3 tests pass

**Checkpoint**: Diff utility available for frontends — US3 independently functional

---

## Phase 6: User Story 4 — Hierarchical Type Degradation (Priority: P2)

**Goal**: Consumers match result types at any depth, degrading gracefully to shallower matches

**Independent Test**: Present a deep sub-type to consumers at different depths and verify each handles it at its level

### Tests for User Story 4

- [ ] T040 [test] Write TypeScript matchesResultType and getTopLevelType tests `shared/components/diff/tests/resultTypes.test.ts`

### Implementation for User Story 4

- [ ] T041 Implement matchesResultType() and getTopLevelType() in TypeScript `shared/components/diff/src/resultTypes.ts`
- [ ] T042 Export result type utilities from package index `shared/components/diff/src/index.ts`
- [ ] T043 Verify all US4 tests pass

**Checkpoint**: Hierarchical type degradation works in both Python and TypeScript — US4 independently functional

---

## Phase 7: User Story 5 — Artifact Notification and Viewing (Priority: P3)

**Goal**: Analyst receives notification when artifact is generated and can open it

**Independent Test**: Generate an artifact, verify notification appears, click to open in configured location

*Note: This story requires VS Code extension integration which may be deferred. Tasks below define the data contract only.*

### Implementation for User Story 5

- [ ] T044 Define artifact notification event interface in TypeScript `shared/components/diff/src/artifactEvent.ts`
- [ ] T045 Export artifact event types from package index `shared/components/diff/src/index.ts`

**Checkpoint**: Artifact notification contract defined — extension integration deferred to a follow-on feature

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Evidence collection, documentation, and PR creation

### Validation

- [ ] T046 Run quickstart.md validation end-to-end
- [ ] T047 Run all Python tests across services/calc and services/stac
- [ ] T048 [P] Run all TypeScript tests in shared/components/diff

### Evidence Collection

- [ ] T049 Capture test summary in `specs/041-document-tool-results/evidence/test-summary.md`
- [ ] T050 Create usage demonstration in `specs/041-document-tool-results/evidence/usage-example.md`
- [ ] T051 [P] Capture sample MCP responses (mutation, addition, deletion, artifact) in `specs/041-document-tool-results/evidence/`
- [ ] T052 [P] Capture sample diff output in `specs/041-document-tool-results/evidence/diff-output.json`

### Media Content

- [ ] T053 Create shipped blog post in `specs/041-document-tool-results/media/shipped-post.md`
- [ ] T054 [P] Create LinkedIn shipped summary in `specs/041-document-tool-results/media/linkedin-shipped.md`

### PR Creation

- [ ] T055 Create PR and publish blog: run /speckit.pr

**Task T055 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundation (Phase 2)**: Depends on Phase 1 (LinkML schema) — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 (ResultTypePath, ResultTopType)
- **US2 (Phase 4)**: Depends on Phase 2 (provenance) and Phase 3 (result builder produces inputs)
- **US3 (Phase 5)**: Depends on Phase 2 only — can run in parallel with US1/US2
- **US4 (Phase 6)**: Depends on Phase 2 (ResultTypePath concept) — can run in parallel with US1/US2/US3
- **US5 (Phase 7)**: Depends on Phase 4 (artifact persistence) — minimal work, contracts only
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: After Foundation — no other story dependencies
- **US2 (P1)**: After Foundation + US1 (consumes result builder output)
- **US3 (P2)**: After Foundation — independent of US1/US2
- **US4 (P2)**: After Foundation — independent of US1/US2/US3
- **US5 (P3)**: After US2 (artifact persistence) — contracts only

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Models/types before builders/services
- Core implementation before MCP integration
- Story complete before moving to next priority

### Parallel Opportunities

- T002–T006 (golden fixtures) can all run in parallel
- T008+T010 (foundation tests) can run in parallel
- T012–T016 (US1 builder tests) can all run in parallel
- T024+T025 (US2 feature operation tests) can run in parallel
- US3 (Phase 5) and US4 (Phase 6) can run entirely in parallel with each other
- T047+T048 (final test runs) can run in parallel
- T051+T052 (evidence capture) can run in parallel
- T053+T054 (media content) can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all US1 builder tests in parallel:
Task: "Write build_mutation tests"     (T012)
Task: "Write build_addition tests"     (T013)
Task: "Write build_deletion tests"     (T014)
Task: "Write build_artifact tests"     (T015)
Task: "Write build_error tests"        (T016)
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (schema + fixtures)
2. Complete Phase 2: Foundation (types + provenance)
3. Complete Phase 3: US1 — Tool Returns Typed Result
4. Complete Phase 4: US2 — Result Persisted to STAC
5. **STOP and VALIDATE**: End-to-end flow: tool → typed result → persist → verify
6. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundation → Schema and types ready
2. Add US1 → Tools return typed results → Demo (MVP Part 1)
3. Add US2 → Results persist with provenance → Demo (MVP Part 2)
4. Add US3 → Diff utility available → Demo
5. Add US4 → Type degradation works → Demo
6. Add US5 → Artifact contracts defined → Demo
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundation together
2. Once Foundation is done:
   - Developer A: US1 (result builder) → US2 (persistence)
   - Developer B: US3 (diff utility) + US4 (type degradation)
3. US5 handled after US2 completes

---

## Notes

- [P] tasks = different files, no dependencies
- [US#] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **Evidence is required** — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
