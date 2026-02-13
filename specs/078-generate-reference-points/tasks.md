# Tasks: Generate Reference Points Tool

**Input**: Design documents from `/specs/078-generate-reference-points/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/tool-api.md

**Tests**: Tests are included — the spec requires unit tests for both Python and TypeScript implementations (Art VI.2), golden I/O examples (FR-014), and cross-language parity (SC-006).

**Organization**: Tasks are grouped by user story. US1 (grid) is the MVP. US2 (scatter) adds the second pattern. US3 (downstream compatibility) validates integration.

---

## Evidence Requirements

**Evidence Directory**: `specs/078-generate-reference-points/evidence/`
**Media Directory**: `specs/078-generate-reference-points/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | pytest + vitest results with pass/fail counts | After all tests pass |
| usage-example.md | Python + TypeScript code generating grid/scatter points | After both implementations complete |
| cross-language-parity.md | Proof that Python and TypeScript produce identical output for same inputs | After parity tests pass |
| golden-grid-output.json | Sample grid output (3x4 in [-5,49,1,52]) | After golden examples written |

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

**Purpose**: Create directory structure and scaffold all files

- [ ] T001 Create tool spec directory `shared/tools/reference/generation/`
- [ ] T002 [P] Create Python tool package `services/calc/debrief_calc/tools/reference/__init__.py`
- [ ] T003 [P] Create Python test package `services/calc/tests/tools/reference/__init__.py`
- [ ] T004 [P] Create TypeScript tool directory `apps/vscode/src/tools/reference/generation/`
- [ ] T005 [P] Create TypeScript test directory `apps/vscode/tests/unit/tools/reference/`

---

## Phase 2: Foundation (Blocking Prerequisites)

**Purpose**: Schema update, cross-language LCG, tool spec document, and golden examples — all must be complete before implementation begins

**CRITICAL**: No user story work can begin until this phase is complete

### Schema Update

- [ ] T006 Update ReferenceLocation geometry to allow MultiPoint in LinkML schema `shared/schemas/src/linkml/geojson.yaml`
- [ ] T007 Add PointMetadataEntry class and pointMetadata attribute to ReferenceLocationProperties `shared/schemas/src/linkml/geojson.yaml`
- [ ] T008 Regenerate derived schemas (Pydantic, JSON Schema, TypeScript types) from updated LinkML

### Tool Spec Document (FR-001)

- [ ] T009 Write language-neutral tool spec with all 9 required sections `shared/tools/reference/generation/generate-reference-points.1.0.md`

### Golden I/O Examples (FR-014)

- [ ] T010 [P] Write grid golden input example (3×4, bounds [-5,49,1,52]) `shared/tools/reference/generation/generate-reference-points.grid.input.json`
- [ ] T011 [P] Write grid golden output example (12-coordinate MultiPoint) `shared/tools/reference/generation/generate-reference-points.grid.output.json`
- [ ] T012 [P] Write scatter golden input example (count=20, seed=42, same bounds) `shared/tools/reference/generation/generate-reference-points.scatter.input.json`
- [ ] T013 [P] Write scatter golden output example (20-coordinate MultiPoint) `shared/tools/reference/generation/generate-reference-points.scatter.output.json`

### Cross-Language LCG PRNG

- [ ] T014 Document LCG constants and algorithm in tool spec (multiplier=1664525, increment=1013904223, mod=2^32)

**Checkpoint**: Schema updated, tool spec written, golden examples ready — implementation can begin

---

## Phase 3: User Story 1 — Grid Pattern (Priority: P1) MVP

**Goal**: Generate a single MultiPoint feature with evenly spaced coordinates in a grid pattern within a bounding box

**Independent Test**: Provide bounds [-5,49,1,52] with rows=3, cols=4; verify output has 12 coordinates at correct positions

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T015 [test] [US1] Write Python grid unit tests: basic 3x4 grid, 1x1 centre point, 5x5 even spacing `services/calc/tests/tools/reference/test_generation.py`
- [ ] T016 [test] [US1] Write Python grid edge case tests: zero-area bounds, negative rows/cols, south>north `services/calc/tests/tools/reference/test_generation.py`
- [ ] T017 [P][test] [US1] Write TypeScript grid unit tests mirroring Python tests `apps/vscode/tests/unit/tools/reference/generateReferencePoints.test.ts`

### Implementation for User Story 1

- [ ] T018 [US1] Implement Python grid generation: parameter validation, coordinate calculation, MultiPoint feature construction `services/calc/debrief_calc/tools/reference/generation.py`
- [ ] T019 [US1] Register tool with @tool decorator (name, input_kinds=[], output_kind, context_type=NONE, parameters) `services/calc/debrief_calc/tools/reference/generation.py`
- [ ] T020 [US1] Implement TypeScript grid generation: execute function + toolDefinition export `apps/vscode/src/tools/reference/generation/generateReferencePoints.ts`
- [ ] T021 [US1] Create TypeScript barrel export `apps/vscode/src/tools/reference/generation/index.ts`
- [ ] T022 [US1] Verify Python tests pass for grid pattern
- [ ] T023 [US1] Verify TypeScript tests pass for grid pattern
- [ ] T024 [test] [US1] Write cross-language grid parity test: Python and TypeScript produce identical output for grid golden example `services/calc/tests/tools/reference/test_generation.py`

**Checkpoint**: Grid pattern works in both Python and TypeScript with identical output

---

## Phase 4: User Story 2 — Scatter Pattern (Priority: P2)

**Goal**: Generate a single MultiPoint feature with randomly distributed coordinates using a deterministic LCG PRNG

**Independent Test**: Provide bounds [-5,49,1,52] with count=20, seed=42; verify 20 coordinates within bounds, and second invocation with same seed produces identical output

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T025 [test] [US2] Write Python scatter unit tests: basic count, seed reproducibility, different-without-seed `services/calc/tests/tools/reference/test_generation.py`
- [ ] T026 [test] [US2] Write Python scatter edge case tests: count=0, missing count, antimeridian crossing `services/calc/tests/tools/reference/test_generation.py`
- [ ] T027 [P][test] [US2] Write TypeScript scatter unit tests mirroring Python tests `apps/vscode/tests/unit/tools/reference/generateReferencePoints.test.ts`

### Implementation for User Story 2

- [ ] T028 [US2] Implement Python LCG PRNG helper function (Numerical Recipes constants) `services/calc/debrief_calc/tools/reference/generation.py`
- [ ] T029 [US2] Implement Python scatter generation: validate count, generate coordinates via LCG, build MultiPoint `services/calc/debrief_calc/tools/reference/generation.py`
- [ ] T030 [US2] Implement TypeScript LCG PRNG helper and scatter generation `apps/vscode/src/tools/reference/generation/generateReferencePoints.ts`
- [ ] T031 [US2] Implement antimeridian handling for both grid and scatter (west > east → wrap) in both languages
- [ ] T032 [US2] Verify Python tests pass for scatter pattern
- [ ] T033 [US2] Verify TypeScript tests pass for scatter pattern
- [ ] T034 [test] [US2] Write cross-language scatter parity test: Python and TypeScript produce identical output for scatter golden example with seed=42 `services/calc/tests/tools/reference/test_generation.py`

**Checkpoint**: Both grid and scatter work in both languages with cross-language parity

---

## Phase 5: User Story 3 — Downstream Compatibility (Priority: P3)

**Goal**: Validate that generated MultiPoint features are compatible with the project schema and downstream tool expectations

**Independent Test**: Generate reference points, validate output against JSON Schema, confirm pointMetadata structure is extensible by a mock classifier

### Tests for User Story 3

- [ ] T035 [test] [US3] Write Python schema validation test: output validates against generated JSON Schema `services/calc/tests/tools/reference/test_generation.py`
- [ ] T036 [test] [US3] Write Python downstream compatibility test: verify pointMetadata entries are extensible with zone/color fields `services/calc/tests/tools/reference/test_generation.py`

### Implementation for User Story 3

- [ ] T037 [US3] Verify golden output examples validate against project JSON Schema
- [ ] T038 [US3] Verify tool result type annotation is `addition/reference/generated_points`
- [ ] T039 [US3] Verify provenance label includes pattern type, bounds, and point count

**Checkpoint**: All user stories complete, both languages, schema-validated output

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Evidence collection, media content, and PR creation

### Evidence Collection (REQUIRED)

- [ ] T040 Create evidence directory `specs/078-generate-reference-points/evidence/`
- [ ] T041 Capture test summary with pass/fail counts from pytest and vitest `specs/078-generate-reference-points/evidence/test-summary.md`
- [ ] T042 Create usage demonstration showing both grid and scatter in Python and TypeScript `specs/078-generate-reference-points/evidence/usage-example.md`
- [ ] T043 [P] Capture cross-language parity proof (identical output comparison) `specs/078-generate-reference-points/evidence/cross-language-parity.md`
- [ ] T044 [P] Copy golden grid output as sample evidence `specs/078-generate-reference-points/evidence/golden-grid-output.json`

### Media Content

- [ ] T045 Create shipped blog post `specs/078-generate-reference-points/media/shipped-post.md`
- [ ] T046 [P] Create LinkedIn shipped summary `specs/078-generate-reference-points/media/linkedin-shipped.md`

### PR Creation

- [ ] T047 Create PR and publish blog: run /speckit.pr

**Task T047 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundation (Phase 2)**: Depends on Setup; schema update + tool spec + golden examples BLOCK all user stories
- **US1 Grid (Phase 3)**: Depends on Foundation — MVP, implement first
- **US2 Scatter (Phase 4)**: Depends on Foundation — can run parallel with US1 but recommended after US1 (shared validation code)
- **US3 Downstream (Phase 5)**: Depends on US1 and US2 — validates complete output
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundation (Phase 2) — Grid generation only
- **User Story 2 (P2)**: Can start after Foundation (Phase 2) — Scatter generation. Shares validation code with US1 but is independently testable
- **User Story 3 (P3)**: Depends on US1 + US2 — validates complete tool output against schema

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Python implementation before TypeScript (golden examples guide both)
- Cross-language parity test after both implementations
- Verify all tests pass before marking story complete

### Parallel Opportunities

- T002/T003/T004/T005 (Phase 1 scaffolding) can all run in parallel
- T010/T011/T012/T013 (golden examples) can all run in parallel
- T015/T016 and T017 (US1 tests) can run in parallel
- T025/T026 and T027 (US2 tests) can run in parallel
- T043/T044 (evidence collection) can run in parallel
- T045/T046 (media content) can run in parallel
- **Python and TypeScript implementations within a story should be sequential** (Python first, TypeScript mirrors)

---

## Parallel Example: User Story 1

```bash
# Write all US1 tests in parallel:
Task: "Python grid unit tests" (T015)
Task: "Python grid edge case tests" (T016)
Task: "TypeScript grid unit tests" (T017)

# Then implement sequentially:
Task: "Python grid generation" (T018) → "Register tool" (T019)
Task: "TypeScript grid generation" (T020) → "Barrel export" (T021)

# Verify in parallel:
Task: "Python tests pass" (T022)
Task: "TypeScript tests pass" (T023)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (scaffolding)
2. Complete Phase 2: Foundation (schema, tool spec, golden examples)
3. Complete Phase 3: User Story 1 — Grid Pattern
4. **STOP and VALIDATE**: Run grid golden example through both Python and TypeScript
5. Grid pattern is independently useful for buffer zone analysis

### Incremental Delivery

1. Setup + Foundation → Golden examples + schema ready
2. Add User Story 1 (Grid) → Test in both languages → MVP complete
3. Add User Story 2 (Scatter) → Test + cross-language parity → Full tool
4. Add User Story 3 (Downstream) → Schema validation → Integration-ready
5. Each story adds capability without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundation together
2. Once Foundation is done:
   - Developer A: Python implementation (US1 → US2)
   - Developer B: TypeScript implementation (US1 → US2)
3. US3 validates after both developers complete

---

## Notes

- [P] tasks = different files, no dependencies
- [US1/US2/US3] labels map tasks to specific user stories for traceability
- Golden examples are the single source of truth for expected output
- Cross-language LCG constants MUST be identical in Python and TypeScript
- Schema regeneration (T008) may require running LinkML generators — ensure uv environment is set up
- Commit after each phase or logical group of tasks
- Run `/speckit.pr` after all tasks complete to create PR with evidence
