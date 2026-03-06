# Tasks: Move Track Tool

**Input**: Design documents from `/specs/079-move-track/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: Tests are required per Constitution Article VI.2 (services require unit tests).

**Organization**: Tasks grouped by user story for independent implementation and testing.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected.

**Evidence Directory**: `specs/079-move-track/evidence/`
**Media Directory**: `specs/079-move-track/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | pytest + vitest results across Python and TypeScript | After all tests pass |
| usage-example.md | Python and TypeScript code examples with output | After tool works end-to-end |
| sample-request.json | MCP tool invocation with direction + range_nm | After tool registered |
| sample-response.json | GeoJSON response with moved track | After tool produces output |

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

## Phase 1: Setup (Tool Specification & Scaffolding)

**Purpose**: Create the language-neutral tool spec and golden examples that define "done"

- [ ] T001 Create tool specification `shared/tools/track/manipulation/move-track.1.0.md`
- [ ] T002 [P] Create golden example input (LineString) `shared/tools/track/manipulation/move-track.basic.input.json`
- [ ] T003 [P] Create golden example output (LineString) `shared/tools/track/manipulation/move-track.basic.output.json`
- [ ] T004 [P] Create golden example input (MultiLineString) `shared/tools/track/manipulation/move-track.compound.input.json`
- [ ] T005 [P] Create golden example output (MultiLineString) `shared/tools/track/manipulation/move-track.compound.output.json`

**Checkpoint**: Tool spec and golden examples define the contract — implementation can begin.

---

## Phase 2: Foundation (Python Tool Implementation)

**Purpose**: Core Python implementation that all user stories depend on

**⚠️ CRITICAL**: Python tool is the source of truth; TypeScript mirrors it.

### Tests (write FIRST, verify they FAIL)

- [ ] T006 [test] Write golden example test (basic LineString) `services/calc/tests/tools/track/manipulation/test_move_track.py`
- [ ] T007 [P][test] Write golden example test (compound MultiLineString) `services/calc/tests/tools/track/manipulation/test_move_track.py`
- [ ] T008 [P][test] Write edge case tests (zero distance, negative distance, empty input, single position, direction normalisation, non-track skip, unexpected geometry raises) `services/calc/tests/tools/track/manipulation/test_move_track.py`

### Implementation

- [ ] T009 Implement move_track handler with @tool decorator and translate_point `services/calc/debrief_calc/tools/track/manipulation/move_track.py`
- [ ] T010 Register move_track in track manipulation __init__ `services/calc/debrief_calc/tools/track/manipulation/__init__.py`
- [ ] T011 Run Python tests and verify all pass: `uv run pytest services/calc/tests/tools/track/manipulation/test_move_track.py -v`

### Executor Integration Test

- [ ] T012 [test] Write executor provenance test (input_state capture, LogEntry attachment, parameters in provenance) `services/calc/tests/tools/track/manipulation/test_move_track.py`
- [ ] T013 Run executor test: `uv run pytest services/calc/tests/tools/track/manipulation/test_move_track.py -v -k executor`

**Checkpoint**: Python tool registered, all tests pass, provenance works.

---

## Phase 3: User Story 1 — Offset Track by Range and Bearing (Priority: P1)

**Goal**: TypeScript implementation mirrors Python tool for VS Code and web-shell frontends.

**Independent Test**: Invoke TypeScript execute() with same golden example input and verify output matches Python golden output within 0.1% tolerance.

### TypeScript Implementation (VS Code)

- [ ] T014 Implement moveTrack with toolDefinition and execute function `apps/vscode/src/tools/track/manipulation/moveTrack.ts`
- [ ] T015 Register moveTrack in track manipulation barrel `apps/vscode/src/tools/track/manipulation/index.ts`

### TypeScript Implementation (web-shell)

- [ ] T016 [P] Implement moveTrack (mirrors VS Code version) `apps/web-shell/src/tools/track/manipulation/moveTrack.ts`
- [ ] T017 [P] Create barrel index for web-shell track manipulation `apps/web-shell/src/tools/track/manipulation/index.ts`

### TypeScript Tests

- [ ] T018 [test] Write vitest tests for moveTrack (golden examples, edge cases) `apps/vscode/src/tools/track/manipulation/__tests__/moveTrack.test.ts`
- [ ] T019 Run TypeScript tests: `pnpm --filter '!@debrief/web-shell' test`

**Checkpoint**: Both Python and TypeScript implementations pass golden examples with matching output.

---

## Phase 4: User Story 2 — Precision Editing via PROV Log (Priority: P2)

**Goal**: Verify the tool is stateless and parameterised — re-invocation with different params produces different results, enabling PROV replay.

**Independent Test**: Invoke tool twice with different range/bearing on the same input; confirm outputs differ by the expected amount.

### Tests

- [ ] T020 [test] Write statelessness tests (same input, different params → different output; 3 combinations) `services/calc/tests/tools/track/manipulation/test_move_track.py`
- [ ] T021 Run statelessness tests: `uv run pytest services/calc/tests/tools/track/manipulation/test_move_track.py -v -k stateless`

**Checkpoint**: Tool demonstrated to be stateless and deterministic across parameter changes.

---

## Phase 5: User Story 3 — Map Drag (Rapid Re-invocations) (Priority: P3)

**Goal**: Verify the tool handles rapid sequential invocations correctly (simulating drag).

**Independent Test**: Invoke tool 5 times in sequence with different params; each result reflects its specific parameters.

### Tests

- [ ] T022 [test] Write rapid re-invocation test (5 sequential calls, verify each) `services/calc/tests/tools/track/manipulation/test_move_track.py`
- [ ] T023 Run rapid invocation tests: `uv run pytest services/calc/tests/tools/track/manipulation/test_move_track.py -v -k rapid`

**Checkpoint**: Tool handles rapid re-invocation without state leakage.

---

## Phase 6: CI Verification

**Purpose**: Full CI suite must pass before any evidence collection

- [ ] T024 Run full lint check: `task lint` (or `uv run ruff check . && pnpm lint`)
- [ ] T025 Run full type check: `task typecheck` (or `uv run pyright && pnpm -r typecheck`)
- [ ] T026 Run full test suite: `task test` (or `uv run pytest && pnpm --filter '!@debrief/web-shell' test`)

**Checkpoint**: CI-equivalent verification passes — ready for evidence and PR.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Clean up spec artifacts (per review findings), collect evidence, create media

### Spec Cleanup (from review)

- [ ] T027 Remove altitude/timestamp references from FR-004, SC-003, and edge cases in spec.md (coordinates are 2-element [lon, lat] only) `specs/079-move-track/spec.md`
- [ ] T028 [P] Remove `coord[2]`/`coord[3]` comment from data-model.md pseudocode `specs/079-move-track/data-model.md`

### Evidence Collection (REQUIRED)

- [ ] T029 Capture test results using template (.specify/templates/evidence/test-summary-template.md) `specs/079-move-track/evidence/test-summary.md`
- [ ] T030 Create usage demonstration `specs/079-move-track/evidence/usage-example.md`
- [ ] T031 [P] Capture sample MCP request JSON `specs/079-move-track/evidence/sample-request.json`
- [ ] T032 [P] Capture sample MCP response JSON `specs/079-move-track/evidence/sample-response.json`

### Media Content

- [ ] T033 Create shipped blog post `specs/079-move-track/media/shipped-post.md`
- [ ] T034 [P] Create LinkedIn shipped summary `specs/079-move-track/media/linkedin-shipped.md`

### PR Creation

- [ ] T035 Create PR and publish blog: run /speckit.pr

**Task T035 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Python Foundation)**: Depends on Phase 1 golden examples
- **Phase 3 (TypeScript US1)**: Depends on Phase 2 (Python is source of truth)
- **Phase 4 (US2 PROV)**: Depends on Phase 2 (Python tool)
- **Phase 5 (US3 Drag)**: Depends on Phase 2 (Python tool)
- **Phase 6 (CI)**: Depends on Phases 2–5
- **Phase 7 (Polish)**: Depends on Phase 6

### User Story Dependencies

- **US1 (P1)**: Phase 3 — TypeScript mirrors Python; depends on Phase 2
- **US2 (P2)**: Phase 4 — Can start after Phase 2, in parallel with Phase 3
- **US3 (P3)**: Phase 5 — Can start after Phase 2, in parallel with Phases 3–4

### Within Each Phase

- Tests written FIRST, verified to FAIL before implementation
- [P] tasks within a phase can run in parallel
- Run commands verify the phase checkpoint

### Parallel Opportunities

- T002–T005 (golden examples) can all run in parallel
- T006–T008 (Python tests) can run in parallel
- T014–T015 (VS Code) and T016–T017 (web-shell) can run in parallel
- Phases 3, 4, and 5 can run in parallel after Phase 2 completes
- T031–T032 (evidence) and T033–T034 (media) can run in parallel

---

## Parallel Example: Phase 2

```bash
# Write all test files in parallel:
Task: T006 "Golden example test (basic)"
Task: T007 "Golden example test (compound)"
Task: T008 "Edge case tests"

# Then implement:
Task: T009 "move_track handler"
Task: T010 "Register in __init__"

# Then verify:
Task: T011 "Run tests"
```

---

## Implementation Strategy

### Incremental Delivery

1. Phase 1: Golden examples define the contract
2. Phase 2: Python tool passes all tests → core value delivered
3. Phase 3: TypeScript mirrors Python → frontend-ready
4. Phases 4–5: Statelessness and rapid invocation verified
5. Phase 6: CI green
6. Phase 7: Evidence + media + PR

### Key Constraint

The Python implementation is the **source of truth**. TypeScript implementations must produce output matching the golden examples within 0.1% floating-point tolerance. This ensures both languages are interchangeable for the E03 cascade.

---

## Notes

- [P] tasks = different files, no dependencies
- Tests are required per Constitution Article VI.2
- Golden examples from Phase 1 are the acceptance oracle
- Coordinates are 2-element `[lon, lat]` only (no altitude/timestamp)
- Error message for negative distance: "Distance must be non-negative" (natural language, per review decision 7B)
- Unexpected geometry type on TRACK raises ValueError (per review decision 8B)
- Run `/speckit.pr` after all tasks complete to create PR with evidence
