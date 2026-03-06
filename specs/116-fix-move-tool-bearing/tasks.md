# Tasks: PROV Log Input Snapshot for Mutation Replay

**Input**: Design documents from `/specs/116-fix-move-tool-bearing/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/log-entry-schema-diff.md

**Tests**: Included — Constitution Article VII (test-driven) requires acceptance tests before implementation.

**Organization**: Tasks grouped by user story. US1 and US2 are co-equal P1 and delivered together (US2 is the data model, US1 is the behavior it enables).

---

## Evidence Requirements

**Evidence Directory**: `specs/116-fix-move-tool-bearing/evidence/`
**Media Directory**: `specs/116-fix-move-tool-bearing/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | pytest results for all new and existing tests | After all tests pass |
| usage-example.md | Python code demonstrating inputState capture on move-shape | After executor wired |
| round-trip-evidence.md | Python LogEntry → JSON → back round-trip proof | After model complete |

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

## Phase 1: Foundation — Schema & Model (Blocking)

**Purpose**: Add `InputFeatureState` to the canonical schema and Python model. All user stories depend on these types existing.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### LinkML Schema

- [x] T001 Add `InputFeatureState` class to LinkML schema `shared/schemas/src/linkml/log-entry.yaml`
- [x] T002 Add `input_state` attribute to `LogEntry` class in `shared/schemas/src/linkml/log-entry.yaml`

### Python Model

- [x] T003 Add `InputFeatureState` Pydantic model to `services/calc/debrief_calc/models.py`
- [x] T004 Add `input_state` field to `LogEntry` model in `services/calc/debrief_calc/models.py`

### Golden Fixture

- [x] T005 Create golden fixture with inputState `shared/schemas/src/fixtures/valid/circle-annotation-input-state-01.json`

### Provenance Function

- [x] T006 Add `input_state` parameter to `create_log_entry()` in `services/calc/debrief_calc/provenance.py`

### Foundation Tests

- [x] T007 [test] Test `InputFeatureState` model creation and serialization `services/calc/tests/test_provenance.py`
- [x] T008 [test] Test `LogEntry` with inputState serializes to camelCase JSON `services/calc/tests/test_provenance.py`
- [x] T009 [test] Test `create_log_entry()` with input_state parameter `services/calc/tests/test_provenance.py`
- [x] T010 [test] Test `create_log_entry()` without input_state returns null `services/calc/tests/test_provenance.py`
- [x] T011 [test] Test LogEntry round-trip: Python → JSON → Python preserves inputState `services/calc/tests/test_provenance.py`

**Checkpoint**: InputFeatureState exists in schema, Python model, and provenance function. All serialization tests pass.

---

## Phase 2: US1 + US2 — Executor Capture & Input Snapshot (Priority: P1)

**Goal**: The Python executor captures pre-tool geometry for mutation tools BEFORE the handler executes, and attaches it to the PROV log entry. This simultaneously delivers:
- **US1**: Correct replay (inputState provides the anchor geometry)
- **US2**: Input snapshot stored in PROV log entry

**Independent Test**: Execute move-shape on a circle, inspect the output feature's provenance — the last entry must contain `inputState` with pre-move geometry and center.

### Tests (write FIRST — must FAIL before implementation)

- [x] T012 [test] Test `_capture_input_state` captures geometry and non-provenance properties `services/calc/tests/test_executor.py`
- [x] T013 [test] Test `_capture_input_state` excludes provenance from captured properties `services/calc/tests/test_executor.py`
- [x] T014 [test] Test `_capture_input_state` handles feature missing id (uses "unknown") `services/calc/tests/test_executor.py`
- [x] T015 [test] Test executor attaches inputState to provenance for mutation tool `services/calc/tests/test_executor.py`
- [x] T016 [test] Test executor sets inputState=null for non-mutation tool `services/calc/tests/test_executor.py`
- [x] T017 [test] Test capture happens BEFORE handler (pre-mutation geometry, not post) `services/calc/tests/test_executor.py`
- [x] T018 [test] Test move-shape circle: inputState contains original center and polygon geometry `services/calc/tests/tools/shape/manipulation/test_move_shape.py`
- [x] T019 [P][test] Test move-shape vector: inputState contains original origin property `services/calc/tests/tools/shape/manipulation/test_move_shape.py`
- [x] T020 [P][test] Test move-shape text: inputState contains original Point geometry `services/calc/tests/tools/shape/manipulation/test_move_shape.py`

### Implementation

- [x] T021 Add `_capture_input_state()` helper function to `services/calc/debrief_calc/executor.py`
- [x] T022 Wire inputState capture into `run()` BEFORE `_execute_handler()` in `services/calc/debrief_calc/executor.py`
- [x] T023 Pass `input_state` to `create_log_entry()` call in `services/calc/debrief_calc/executor.py`
- [x] T024 Run all executor and move-shape tests to verify `services/calc/tests/`

**Checkpoint**: After executing move-shape, the output feature's provenance entry contains inputState with pre-operation geometry. Non-mutation tools have inputState=null.

---

## Phase 3: US3 — General Convention for Mutation Tools (Priority: P2)

**Goal**: Verify the inputState convention works automatically for all `mutation/` tools — not just move-shape. No code changes needed; the executor already handles all mutation tools via the `output_kind.startswith("mutation/")` check.

**Independent Test**: Execute a non-spatial mutation tool (e.g., set-track-color) and verify it gets inputState captured. Execute a non-mutation tool and verify it does not.

### Tests

- [x] T025 [test] Test set-track-color (mutation tool) gets inputState captured automatically `services/calc/tests/test_executor.py`
- [x] T026 [test] Test track-stats (non-mutation tool) gets inputState=null `services/calc/tests/test_executor.py`

### Verification

- [x] T027 Run full test suite to verify no regressions: `uv run pytest services/calc/tests/ -v`

**Checkpoint**: All existing mutation tools automatically capture inputState. Convention is proven by tests, not just documentation.

---

## Phase 4: US4 — Chained Mutations Replay Correctly (Priority: P2)

**Goal**: When two sequential moves are applied, each stores its own inputState reflecting the geometry at that step. The second move's inputState is the intermediate position (after the first move).

**Independent Test**: Apply two sequential moves via the executor, inspect both provenance entries — the second entry's inputState should match the first entry's output geometry.

### Tests

- [x] T028 [test] Test chained moves: second inputState reflects post-first-move geometry `services/calc/tests/test_executor.py`

### Verification

- [x] T029 Run full calc test suite: `uv run pytest services/calc/tests/ -v`

**Checkpoint**: Chained mutations each capture their own inputState independently.

---

## Phase 5: Verification & CI

**Purpose**: Run the full CI verification to ensure nothing is broken across the monorepo.

- [x] T030 Run Python lint: `uv run ruff check .`
- [x] T031 [P] Run Python typecheck: `uv run pyright`
- [x] T032 [P] Run TypeScript lint: `pnpm lint`
- [x] T033 [P] Run TypeScript typecheck: `pnpm -r typecheck`
- [x] T034 Run full Python test suite: `uv run pytest`
- [x] T035 [P] Run full TypeScript test suite: `pnpm --filter '!@debrief/web-shell' test`

**Checkpoint**: All CI checks pass. Ready for evidence collection.

---

## Phase 6: Polish & Cross-Cutting Concerns

### Evidence Collection

- [x] T036 Capture test results using template (`.specify/templates/evidence/test-summary-template.md`) `specs/116-fix-move-tool-bearing/evidence/test-summary.md`
- [x] T037 Create usage demonstration `specs/116-fix-move-tool-bearing/evidence/usage-example.md`
- [x] T038 [P] Capture round-trip proof (Python LogEntry → JSON → Python) `specs/116-fix-move-tool-bearing/evidence/round-trip-evidence.md`

### Media Content

- [x] T039 Create shipped blog post `specs/116-fix-move-tool-bearing/media/shipped-post.md`
- [x] T040 [P] Create LinkedIn shipped summary `specs/116-fix-move-tool-bearing/media/linkedin-shipped.md`

### PR Creation

- [x] T041 Create PR and publish blog: run /speckit.pr

**Task T041 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundation)**: No dependencies — start immediately
- **Phase 2 (US1+US2)**: Depends on Phase 1 completion — BLOCKS core behavior
- **Phase 3 (US3)**: Depends on Phase 2 — verifies convention works across tools
- **Phase 4 (US4)**: Depends on Phase 2 — tests chained operation behavior
- **Phase 5 (Verification)**: Depends on Phases 2-4 — full CI check
- **Phase 6 (Polish)**: Depends on Phase 5 — evidence and PR

### User Story Dependencies

- **US1 + US2 (P1)**: Delivered together in Phase 2 — co-equal and tightly coupled
- **US3 (P2)**: Can start after Phase 2 — independent of US4
- **US4 (P2)**: Can start after Phase 2 — independent of US3
- **US3 and US4**: Can run in parallel after Phase 2

### Within Each Phase

- Tests MUST be written and FAIL before implementation (Article VII)
- Model changes before service changes
- Foundation before executor wiring

### Parallel Opportunities

- T001 + T002: Sequential (same file)
- T003 + T004: Sequential (same file)
- T007-T011: All [test] tasks can run in parallel (same file but different test classes)
- T018, T019, T020: T019 and T020 are [P] (different test classes, same assertions)
- T025 + T026: Sequential (same file)
- T030-T035: Lint/typecheck/test can run in parallel across languages
- T036-T040: Evidence and media tasks marked [P] can run in parallel

---

## Parallel Example: Phase 2

```bash
# Write tests first (can parallelize across files):
Agent: "Test _capture_input_state in test_executor.py"  # T012-T017
Agent: "Test move-shape inputState in test_move_shape.py"  # T018-T020

# Then implement (sequential — same file):
T021 → T022 → T023

# Verify:
T024: Run all tests
```

---

## Implementation Strategy

### Incremental Delivery

1. **Phase 1**: Schema + model + fixture → inputState type exists everywhere
2. **Phase 2**: Executor capture → move-shape provenance includes inputState
3. **Phase 3**: Convention tests → all mutation tools proven to work
4. **Phase 4**: Chained test → sequential operations validated
5. **Phase 5**: CI green → safe to merge
6. **Phase 6**: Evidence + media + PR → shipped

### Key Implementation Notes

- **Capture timing is CRITICAL**: `_capture_input_state()` MUST be called BEFORE `_execute_handler()` in `executor.py`. `move_shape` mutates `context.features` in-place — capturing after the handler gives post-mutation geometry (wrong).
- **No TypeScript changes needed**: The TS side already has `InputFeatureState` in `types.ts`, captures it in `executeTool.ts`, and restores from it in `logService.ts`.
- **No move-shape handler changes needed**: The executor captures inputState generically for all mutation tools. The handler is unaware.

---

## Notes

- [P] tasks = different files, no dependencies
- [test] tasks = write before implementation, verify they fail
- Constitution Article VII requires test-first approach
- Constitution Article II.1 requires LinkML schema to be the single source of truth
- Commit after each task or logical group
- Stop at any checkpoint to validate independently
- **Evidence is required** — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
