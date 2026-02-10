# Tasks: Move Shape Tool Spec + Implementation

**Input**: Design documents from `/specs/056-move-shape/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Tests**: Python golden-example tests required. TypeScript validated against same golden fixtures.

**Organization**: Tasks are grouped by user story. Each story adds annotation kinds to the tool spec, Python implementation, and TypeScript implementation with corresponding golden examples and tests.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the tool specification and implementations are complete, consistent, and correct.

**Evidence Directory**: `specs/056-move-shape/evidence/`
**Media Directory**: `specs/056-move-shape/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | pytest results + golden validation + spec checklist | After all tests pass |
| usage-example.md | Python and TypeScript usage examples showing tool invocation | After implementations complete |
| golden-validation.md | Cross-language golden I/O comparison (Python output vs TypeScript output vs expected) | After both implementations pass |

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

**Purpose**: Create directory structure for spec, Python, and TypeScript

- [ ] T001 Create tool spec directory `shared/tools/shape/manipulation/`
- [ ] T002 [P] Create Python package directories with __init__.py files `services/calc/debrief_calc/tools/shape/manipulation/__init__.py`
- [ ] T003 [P] Create Python test directory `services/calc/tests/tools/shape/manipulation/`
- [ ] T004 [P] Create VS Code tool directory `apps/vscode/src/tools/shape/manipulation/`
- [ ] T005 [P] Create web-shell tool directory `apps/web-shell/src/tools/shape/manipulation/`

**Checkpoint**: All directories exist. Python `__init__.py` files in place for `shape/` and `shape/manipulation/`.

---

## Phase 2: Foundation (Blocking Prerequisites)

**Purpose**: Write the tool spec skeleton, shared great-circle helper, and Python/TypeScript scaffolding that all user stories depend on.

### Tool Spec Foundation

- [ ] T006 Create spec file with YAML front matter and all 9 section headings `shared/tools/shape/manipulation/move-shape.1.0.md`
- [ ] T007 Write MCP section (description, when-to-use, parameters, returns) `shared/tools/shape/manipulation/move-shape.1.0.md`
- [ ] T008 [P] Write Inputs section (schema refs to annotations.yaml, constraints, defaults) `shared/tools/shape/manipulation/move-shape.1.0.md`
- [ ] T009 [P] Write Outputs section (ToolResponse, result type `mutation/shape/translated`, annotations) `shared/tools/shape/manipulation/move-shape.1.0.md`
- [ ] T010 Write Algorithm section: `translate_point` helper (Vincenty destination formula) and main `move_shape` skeleton with input validation and kind dispatch `shared/tools/shape/manipulation/move-shape.1.0.md`

### Python Foundation

- [ ] T011 Implement `translate_point(lat, lon, bearing, distance_km)` helper function using `math` module `services/calc/debrief_calc/tools/shape/manipulation/move_shape.py`
- [ ] T012 Implement `move_shape` function scaffold with `@tool` decorator, input validation, feature loop, and kind dispatch `services/calc/debrief_calc/tools/shape/manipulation/move_shape.py`
- [ ] T013 Register shape tools: update `services/calc/debrief_calc/tools/__init__.py` to import `shape` module
- [ ] T014 [P] Write `shape/__init__.py` to import manipulation subpackage `services/calc/debrief_calc/tools/shape/__init__.py`
- [ ] T015 [P] Write `shape/manipulation/__init__.py` to import move_shape `services/calc/debrief_calc/tools/shape/manipulation/__init__.py`

### TypeScript Foundation

- [ ] T016 Implement `translatePoint(lat, lon, bearing, distanceKm)` helper and `execute(features, params)` scaffold with `MCPToolDefinition` `apps/vscode/src/tools/shape/manipulation/moveShape.ts`
- [ ] T017 [P] Copy TypeScript implementation for web-shell `apps/web-shell/src/tools/shape/manipulation/moveShape.ts`
- [ ] T018 Register move-shape in web-shell toolService `apps/web-shell/src/services/toolService.ts`

**Checkpoint**: `translate_point` helper works in both languages. `@tool` decorator registered in Python. `MCPToolDefinition` exported in TypeScript. Both frontends know about the tool.

---

## Phase 3: User Story 1 — Translate Polygon Annotations (Priority: P1)

**Goal**: Add CIRCLE and RECTANGLE support to spec + both implementations + first golden example.

**Independent Test**: Golden input (CircleAnnotation at [0, 50], direction=90, distance=5 km) produces expected output with all vertices and `center` shifted East.

### Tests for User Story 1

- [ ] T019 [test] [US1] Write pytest golden example test for circle translation `services/calc/tests/tools/shape/manipulation/test_move_shape.py`
- [ ] T020 [P] [test] [US1] Write pytest test for rectangle translation `services/calc/tests/tools/shape/manipulation/test_move_shape.py`

### Spec for User Story 1

- [ ] T021 [US1] Add CIRCLE branch to algorithm pseudocode: translate polygon vertices + update `center` `shared/tools/shape/manipulation/move-shape.1.0.md`
- [ ] T022 [P] [US1] Add RECTANGLE branch to algorithm pseudocode: translate polygon vertices `shared/tools/shape/manipulation/move-shape.1.0.md`

### Implementation for User Story 1

- [ ] T023 [US1] Implement CIRCLE handling in Python: translate all polygon vertices + update `center` property `services/calc/debrief_calc/tools/shape/manipulation/move_shape.py`
- [ ] T024 [P] [US1] Implement RECTANGLE handling in Python: translate all polygon vertices `services/calc/debrief_calc/tools/shape/manipulation/move_shape.py`
- [ ] T025 [US1] Implement CIRCLE + RECTANGLE handling in TypeScript (VS Code) `apps/vscode/src/tools/shape/manipulation/moveShape.ts`
- [ ] T026 [P] [US1] Sync TypeScript implementation to web-shell `apps/web-shell/src/tools/shape/manipulation/moveShape.ts`

### Golden Example for User Story 1

- [ ] T027 [US1] Create golden input: CircleAnnotation at [0, 50], direction=90, distance_km=5 `shared/tools/shape/manipulation/move-shape.basic-polygon.input.json`
- [ ] T028 [US1] Create golden output: ToolResponse with translated circle (pre-computed Vincenty coordinates) `shared/tools/shape/manipulation/move-shape.basic-polygon.output.json`

**Checkpoint**: Python tests pass for CIRCLE and RECTANGLE. TypeScript produces identical output for golden input. SC-001 partially satisfied.

---

## Phase 4: User Story 2 — Translate Line and Vector Annotations (Priority: P2)

**Goal**: Add LINE and VECTOR support to spec + both implementations + second golden example.

**Independent Test**: Golden input (VectorAnnotation at [0, 50], direction=0, distance=10 km) produces expected output with `origin` shifted and `range`/`bearing` preserved.

### Tests for User Story 2

- [ ] T029 [test] [US2] Write pytest golden example test for vector translation (origin updated, range/bearing preserved) `services/calc/tests/tools/shape/manipulation/test_move_shape.py`
- [ ] T030 [P] [test] [US2] Write pytest test for line translation `services/calc/tests/tools/shape/manipulation/test_move_shape.py`

### Spec for User Story 2

- [ ] T031 [US2] Add LINE branch to algorithm pseudocode: translate LineString coordinates `shared/tools/shape/manipulation/move-shape.1.0.md`
- [ ] T032 [US2] Add VECTOR branch to algorithm pseudocode: translate geometry + update `origin`, preserve `range`/`bearing` `shared/tools/shape/manipulation/move-shape.1.0.md`

### Implementation for User Story 2

- [ ] T033 [US2] Implement LINE handling in Python `services/calc/debrief_calc/tools/shape/manipulation/move_shape.py`
- [ ] T034 [US2] Implement VECTOR handling in Python: update `origin`, preserve `range`/`bearing` `services/calc/debrief_calc/tools/shape/manipulation/move_shape.py`
- [ ] T035 [US2] Implement LINE + VECTOR handling in TypeScript (VS Code) `apps/vscode/src/tools/shape/manipulation/moveShape.ts`
- [ ] T036 [P] [US2] Sync TypeScript implementation to web-shell `apps/web-shell/src/tools/shape/manipulation/moveShape.ts`

### Golden Example for User Story 2

- [ ] T037 [US2] Create golden input: VectorAnnotation at [0, 50], direction=0 (North), distance_km=10 `shared/tools/shape/manipulation/move-shape.vector.input.json`
- [ ] T038 [US2] Create golden output: ToolResponse with translated vector (origin shifted, range/bearing unchanged) `shared/tools/shape/manipulation/move-shape.vector.output.json`

**Checkpoint**: Python tests pass for all 4 geometry-bearing kinds. Both golden example pairs validate. SC-002 satisfied.

---

## Phase 5: User Story 3 — Translate Text and Point Annotations (Priority: P3)

**Goal**: Add TEXT kind (single Point) to spec + both implementations.

**Independent Test**: Pass a TextAnnotation through move_shape and verify Point coordinate shifts correctly.

### Tests for User Story 3

- [ ] T039 [test] [US3] Write pytest test for text annotation translation `services/calc/tests/tools/shape/manipulation/test_move_shape.py`

### Spec + Implementation for User Story 3

- [ ] T040 [US3] Add TEXT branch to algorithm pseudocode: translate Point coordinate `shared/tools/shape/manipulation/move-shape.1.0.md`
- [ ] T041 [US3] Implement TEXT handling in Python `services/calc/debrief_calc/tools/shape/manipulation/move_shape.py`
- [ ] T042 [US3] Implement TEXT handling in TypeScript (VS Code) `apps/vscode/src/tools/shape/manipulation/moveShape.ts`
- [ ] T043 [P] [US3] Sync TypeScript implementation to web-shell `apps/web-shell/src/tools/shape/manipulation/moveShape.ts`

**Checkpoint**: Algorithm covers all 5 annotation kinds. SC-003 satisfied.

---

## Phase 6: Edge Cases & Error Handling

**Purpose**: Implement edge case handling and complete error paths in both languages.

### Tests

- [ ] T044 [test] Write pytest test for zero distance (no-op) `services/calc/tests/tools/shape/manipulation/test_move_shape.py`
- [ ] T045 [P] [test] Write pytest test for empty feature collection (error) `services/calc/tests/tools/shape/manipulation/test_move_shape.py`
- [ ] T046 [P] [test] Write pytest test for non-annotation features (skip silently) `services/calc/tests/tools/shape/manipulation/test_move_shape.py`
- [ ] T047 [P] [test] Write pytest test for antimeridian crossing (longitude wrap) `services/calc/tests/tools/shape/manipulation/test_move_shape.py`

### Spec

- [ ] T048 Write Edge Cases table (empty input, zero distance, antimeridian, polar, non-annotations, missing properties) `shared/tools/shape/manipulation/move-shape.1.0.md`

### Implementation

- [ ] T049 Implement edge case handling in Python (zero distance, longitude wrap, non-annotation skip) `services/calc/debrief_calc/tools/shape/manipulation/move_shape.py`
- [ ] T050 [P] Implement matching edge case handling in TypeScript `apps/vscode/src/tools/shape/manipulation/moveShape.ts`
- [ ] T051 [P] Sync TypeScript edge cases to web-shell `apps/web-shell/src/tools/shape/manipulation/moveShape.ts`

**Checkpoint**: All edge case tests pass. SC-004 satisfied.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Complete remaining spec sections, run full test suite, collect evidence, create media content.

### Spec Completion

- [ ] T052 Write inline Examples section with abbreviated input/output and references to golden files `shared/tools/shape/manipulation/move-shape.1.0.md`
- [ ] T053 [P] Write Changelog section (1.0, 2026-02-10) `shared/tools/shape/manipulation/move-shape.1.0.md`
- [ ] T054 [P] Write References section (schemas, template, related tools) `shared/tools/shape/manipulation/move-shape.1.0.md`
- [ ] T055 Run quickstart.md validation checklist against completed spec

### Full Test Run

- [ ] T056 Run full pytest suite for move-shape and capture output `services/calc/tests/tools/shape/manipulation/test_move_shape.py`
- [ ] T057 [P] Validate golden I/O JSON files are well-formed

### Evidence Collection (REQUIRED)

- [ ] T058 Create evidence directory `specs/056-move-shape/evidence/`
- [ ] T059 Capture test summary: pytest results, golden validation, spec section checklist `specs/056-move-shape/evidence/test-summary.md`
- [ ] T060 Create usage examples showing Python and TypeScript invocation `specs/056-move-shape/evidence/usage-example.md`
- [ ] T061 [P] Capture cross-language golden validation (Python output == TypeScript output == expected) `specs/056-move-shape/evidence/golden-validation.md`

### Media Content

- [ ] T062 Create shipped blog post `specs/056-move-shape/media/shipped-post.md`
- [ ] T063 [P] Create LinkedIn shipped summary `specs/056-move-shape/media/linkedin-shipped.md`

### PR Creation

- [ ] T064 Create PR and publish blog: run /speckit.pr

**Task T064 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundation (Phase 2)**: Depends on Phase 1 (directories created)
- **US1 (Phase 3)**: Depends on Phase 2 (translate_point helper, @tool scaffold, MCPToolDefinition)
- **US2 (Phase 4)**: Depends on Phase 2. Can run in parallel with US1 (different annotation kinds, different golden files)
- **US3 (Phase 5)**: Depends on Phase 2. Can run in parallel with US1/US2
- **Edge Cases (Phase 6)**: Depends on Phases 3-5 (all annotation kinds in place)
- **Polish (Phase 7)**: Depends on Phase 6 (all tests passing)

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2 only — no cross-story dependencies
- **US2 (P2)**: Depends on Phase 2 only — independent of US1
- **US3 (P3)**: Depends on Phase 2 only — independent of US1/US2

### Within Each User Story

- Tests written first (must fail before implementation)
- Spec pseudocode before implementation
- Python implementation before TypeScript (Python is the reference)
- VS Code TypeScript before web-shell sync (copy)
- Golden input before golden output

### Parallel Opportunities

- T002-T005 (directory creation) all in parallel
- T008/T009 (Inputs/Outputs spec sections) in parallel
- T014/T015 (Python __init__.py files) in parallel
- T016/T017 (TypeScript VS Code/web-shell) in parallel
- Phases 3, 4, 5 can run in parallel (different annotation kinds)
- T019/T020 (circle/rectangle tests) in parallel
- T029/T030 (vector/line tests) in parallel
- T044-T047 (edge case tests) in parallel
- T052-T054 (spec completion sections) in parallel
- T062/T063 (shipped post + LinkedIn) in parallel

---

## Parallel Example: User Story 1

```bash
# Launch tests first (must fail):
Task: "Write pytest golden example test for circle translation"
Task: "Write pytest test for rectangle translation"

# Then spec + implementation in parallel:
Task: "Add CIRCLE branch to algorithm pseudocode"
Task: "Add RECTANGLE branch to algorithm pseudocode"
Task: "Implement CIRCLE handling in Python"
Task: "Implement RECTANGLE handling in Python"

# Then TypeScript:
Task: "Implement CIRCLE + RECTANGLE handling in TypeScript"
Task: "Sync TypeScript to web-shell"

# Then golden examples:
Task: "Create golden input (circle)"
Task: "Create golden output (circle)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (directories)
2. Complete Phase 2: Foundation (helpers, scaffold, registration)
3. Complete Phase 3: User Story 1 (CIRCLE + RECTANGLE in Python + TypeScript + golden example)
4. **STOP and VALIDATE**: pytest passes, TypeScript matches golden output
5. Tool appears in VS Code sidebar and web-shell Run dropdown for annotation selections

### Incremental Delivery

1. Setup + Foundation → Tool registered in all 3 frontends (no kinds handled yet)
2. Add US1 → Polygon translation works → First golden example (MVP)
3. Add US2 → Vector/line works → Second golden example
4. Add US3 → Text/point works → All 5 kinds covered
5. Edge Cases → Antimeridian, zero distance, error paths tested
6. Polish → Evidence, media, PR

---

## Notes

- [P] tasks = different files or independent sections, no dependencies
- [US#] label maps task to specific user story
- [test] tasks must be written and fail before the corresponding implementation
- Python is the reference implementation; TypeScript mirrors it
- Web-shell TypeScript is a copy of VS Code TypeScript (same `execute` function)
- Golden output JSON must contain pre-computed Vincenty coordinates (not rounded approximations)
- Standard library `math` only — no numpy, geopy, or external geo packages
- Commit after each phase completion
- Run `/speckit.pr` (T064) only after all evidence and media tasks complete
