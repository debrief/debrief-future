# Tasks: REP File Special Comments

**Input**: Design documents from `/specs/007-rep-special-comments/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Tests are included - the spec requires validation against Pydantic models and regression testing.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

**Evidence Directory**: `specs/007-rep-special-comments/evidence/`
**Media Directory**: `specs/007-rep-special-comments/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | pytest results with pass/fail counts | After all tests pass |
| usage-example.md | Python code parsing REP file with annotations | After parser complete |
| sample-fixtures.json | Sample GeoJSON output from shapes.rep | After basic shapes work |
| schema-diagram.md | Diagram showing annotation type hierarchy | After all types implemented |

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

**Purpose**: Project structure and schema updates

- [ ] T001 Add `legacy_style` attribute to PointProperties in `shared/schemas/src/linkml/styling.yaml`
- [ ] T002 Regenerate Pydantic models from LinkML schemas `shared/schemas/src/generated/python/`
- [ ] T003 [P] Regenerate JSON Schema from LinkML `shared/schemas/src/generated/json-schema/`
- [ ] T004 [P] Regenerate TypeScript types from LinkML `shared/schemas/src/generated/typescript/`
- [ ] T005 Create annotations submodule structure `services/io/src/debrief_io/handlers/annotations/__init__.py`
- [ ] T006 [P] Create test directory structure `services/io/tests/test_annotations/__init__.py`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T007 Create symbology module with color mapping (A-Q → CSS) `services/io/src/debrief_io/symbology.py`
- [ ] T008 [test] Write symbology tests `services/io/tests/test_annotations/test_symbology.py`
- [ ] T009 Extract DMS coordinate parsing to shared module `services/io/src/debrief_io/handlers/annotations/coordinates.py`
- [ ] T010 [P] Extract timestamp parsing to shared module `services/io/src/debrief_io/handlers/annotations/timestamps.py`
- [ ] T011 [test] Write coordinate parsing tests `services/io/tests/test_annotations/test_coordinates.py`
- [ ] T012 [P][test] Write timestamp parsing tests `services/io/tests/test_annotations/test_timestamps.py`
- [ ] T013 Create symbol parsing module (parse @X[LAYER=Y,SYMBOL=Z]) `services/io/src/debrief_io/handlers/annotations/symbols.py`
- [ ] T014 [test] Write symbol parsing tests `services/io/tests/test_annotations/test_symbols.py`
- [ ] T015 Create base annotation parser structure `services/io/src/debrief_io/handlers/annotations/parser.py`
- [ ] T016 Add annotation-specific error codes to exceptions `services/io/src/debrief_io/exceptions.py`
- [ ] T017 Create invalid annotation test fixtures `services/io/tests/fixtures/invalid/bad_annotations.rep`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Parse Narrative Annotations (Priority: P1) 🎯 MVP

**Goal**: Extract NARRATIVE and NARRATIVE2 entries with timestamp, track association, and text content

**Independent Test**: Load a REP file with NARRATIVE entries and verify they appear as structured data with timestamp, track association, and text content

### Tests for User Story 1

- [ ] T018 [test] Write NARRATIVE parsing tests `services/io/tests/test_annotations/test_narrative.py`

### Implementation for User Story 1

- [ ] T019 Create NARRATIVE regex pattern `services/io/src/debrief_io/handlers/annotations/patterns.py`
- [ ] T020 Implement NarrativeEntry builder `services/io/src/debrief_io/handlers/annotations/builders.py`
- [ ] T021 Integrate NARRATIVE parsing into annotation parser `services/io/src/debrief_io/handlers/annotations/parser.py`
- [ ] T022 Wire annotation parser to REP handler `services/io/src/debrief_io/handlers/rep.py`

**Checkpoint**: NARRATIVE annotations parse correctly

---

## Phase 4: User Story 2 - Parse Shape Annotations (Priority: P1)

**Goal**: Extract CIRCLE, RECT, LINE shapes with geometry and styling

**Independent Test**: Load a REP file with CIRCLE, RECT, and LINE entries and verify they produce GeoJSON features with correct geometry and properties

### Tests for User Story 2

- [ ] T023 [test] Write CIRCLE parsing tests `services/io/tests/test_annotations/test_shapes.py`
- [ ] T024 [P][test] Add RECT parsing tests to test_shapes.py
- [ ] T025 [P][test] Add LINE parsing tests to test_shapes.py

### Implementation for User Story 2

- [ ] T026 Add CIRCLE regex pattern `services/io/src/debrief_io/handlers/annotations/patterns.py`
- [ ] T027 [P] Add RECT regex pattern `services/io/src/debrief_io/handlers/annotations/patterns.py`
- [ ] T028 [P] Add LINE regex pattern `services/io/src/debrief_io/handlers/annotations/patterns.py`
- [ ] T029 Implement CircleAnnotation builder (polygon approximation) `services/io/src/debrief_io/handlers/annotations/builders.py`
- [ ] T030 [P] Implement RectangleAnnotation builder `services/io/src/debrief_io/handlers/annotations/builders.py`
- [ ] T031 [P] Implement LineAnnotation builder `services/io/src/debrief_io/handlers/annotations/builders.py`
- [ ] T032 Integrate shape parsing into annotation parser `services/io/src/debrief_io/handlers/annotations/parser.py`

**Checkpoint**: Basic shape annotations (CIRCLE, RECT, LINE) parse correctly

---

## Phase 5: User Story 8 - Preserve Track Parsing (Priority: P1)

**Goal**: Ensure existing track parsing is unchanged by annotation additions

**Independent Test**: Load existing REP test files and verify track output is byte-for-byte identical to current output

### Tests for User Story 8

- [ ] T033 [test] Write track regression test `services/io/tests/test_annotations/test_track_regression.py`

### Implementation for User Story 8

- [ ] T034 Verify track parsing unchanged in REP handler `services/io/src/debrief_io/handlers/rep.py`
- [ ] T035 Add combined tracks + annotations integration test `services/io/tests/test_annotations/test_integration.py`

**Checkpoint**: P1 stories complete - track parsing unchanged, narratives and shapes work

---

## Phase 6: User Story 3 - Parse Text and Vector Annotations (Priority: P2)

**Goal**: Extract TEXT and VECTOR annotations with position, layer, and symbol attributes

**Independent Test**: Load a REP file with TEXT and VECTOR entries and verify correct position and properties

### Tests for User Story 3

- [ ] T036 [test] Write TEXT parsing tests `services/io/tests/test_annotations/test_text.py`
- [ ] T037 [P][test] Write VECTOR parsing tests `services/io/tests/test_annotations/test_vector.py`

### Implementation for User Story 3

- [ ] T038 Add TEXT regex pattern `services/io/src/debrief_io/handlers/annotations/patterns.py`
- [ ] T039 [P] Add VECTOR regex pattern `services/io/src/debrief_io/handlers/annotations/patterns.py`
- [ ] T040 Implement TextAnnotation builder `services/io/src/debrief_io/handlers/annotations/builders.py`
- [ ] T041 [P] Implement VectorAnnotation builder (compute endpoint from bearing/range) `services/io/src/debrief_io/handlers/annotations/builders.py`
- [ ] T042 Integrate TEXT/VECTOR parsing into annotation parser `services/io/src/debrief_io/handlers/annotations/parser.py`

**Checkpoint**: TEXT and VECTOR annotations parse correctly with layer/symbol attributes

---

## Phase 7: User Story 4 - Parse Polygon Annotations (Priority: P2)

**Goal**: Extract POLY and POLYLINE multi-vertex shapes

**Independent Test**: Load a REP file with POLY and POLYLINE entries and verify correct multi-vertex geometry

### Tests for User Story 4

- [ ] T043 [test] Write POLY parsing tests `services/io/tests/test_annotations/test_polygon.py`
- [ ] T044 [P][test] Add POLYLINE parsing tests to test_polygon.py

### Implementation for User Story 4

- [ ] T045 Add POLY regex pattern (variable vertices) `services/io/src/debrief_io/handlers/annotations/patterns.py`
- [ ] T046 [P] Add POLYLINE regex pattern `services/io/src/debrief_io/handlers/annotations/patterns.py`
- [ ] T047 Implement PolygonAnnotation builder (closed) `services/io/src/debrief_io/handlers/annotations/builders.py`
- [ ] T048 [P] Implement PolylineAnnotation builder (open) `services/io/src/debrief_io/handlers/annotations/builders.py`
- [ ] T049 Integrate POLY/POLYLINE parsing into annotation parser `services/io/src/debrief_io/handlers/annotations/parser.py`

**Checkpoint**: Multi-vertex shapes parse correctly

---

## Phase 8: User Story 5 - Parse Temporal Annotations (Priority: P2)

**Goal**: Extract TIMETEXT, PERIODTEXT, and ELLIPSE with time bounds

**Independent Test**: Load a REP file with TIMETEXT, PERIODTEXT, and ELLIPSE entries and verify temporal bounds are captured

### Tests for User Story 5

- [ ] T050 [test] Write TIMETEXT parsing tests `services/io/tests/test_annotations/test_temporal.py`
- [ ] T051 [P][test] Add PERIODTEXT parsing tests to test_temporal.py
- [ ] T052 [P][test] Add ELLIPSE parsing tests to test_temporal.py

### Implementation for User Story 5

- [ ] T053 Add TIMETEXT regex pattern `services/io/src/debrief_io/handlers/annotations/patterns.py`
- [ ] T054 [P] Add PERIODTEXT regex pattern `services/io/src/debrief_io/handlers/annotations/patterns.py`
- [ ] T055 [P] Add ELLIPSE regex pattern `services/io/src/debrief_io/handlers/annotations/patterns.py`
- [ ] T056 [P] Add ELLIPSE2 regex pattern `services/io/src/debrief_io/handlers/annotations/patterns.py`
- [ ] T057 Implement TimeTextAnnotation builder `services/io/src/debrief_io/handlers/annotations/builders.py`
- [ ] T058 [P] Implement PeriodTextAnnotation builder `services/io/src/debrief_io/handlers/annotations/builders.py`
- [ ] T059 [P] Implement EllipseAnnotation builder (polygon approximation) `services/io/src/debrief_io/handlers/annotations/builders.py`
- [ ] T060 Integrate temporal annotations into parser `services/io/src/debrief_io/handlers/annotations/parser.py`

**Checkpoint**: P2 stories complete - all basic annotation types work

---

## Phase 9: User Story 6 - Parse Dynamic Annotations (Priority: P3)

**Goal**: Extract DYNAMIC_RECT, DYNAMIC_CIRCLE, DYNAMIC_POLY with time-indexed positions

**Independent Test**: Load a REP file with DYNAMIC_RECT entries sharing the same name and verify they are grouped as a single shape with multiple time positions

### Tests for User Story 6

- [ ] T061 [test] Write DYNAMIC_RECT parsing tests `services/io/tests/test_annotations/test_dynamic.py`
- [ ] T062 [P][test] Add DYNAMIC_CIRCLE parsing tests to test_dynamic.py
- [ ] T063 [P][test] Add DYNAMIC_POLY parsing tests to test_dynamic.py

### Implementation for User Story 6

- [ ] T064 Add DYNAMIC_RECT regex pattern `services/io/src/debrief_io/handlers/annotations/patterns.py`
- [ ] T065 [P] Add DYNAMIC_CIRCLE regex pattern `services/io/src/debrief_io/handlers/annotations/patterns.py`
- [ ] T066 [P] Add DYNAMIC_POLY regex pattern `services/io/src/debrief_io/handlers/annotations/patterns.py`
- [ ] T067 Implement DynamicRectAnnotation builder `services/io/src/debrief_io/handlers/annotations/builders.py`
- [ ] T068 [P] Implement DynamicCircleAnnotation builder `services/io/src/debrief_io/handlers/annotations/builders.py`
- [ ] T069 [P] Implement DynamicPolyAnnotation builder `services/io/src/debrief_io/handlers/annotations/builders.py`
- [ ] T070 Integrate dynamic annotations into parser `services/io/src/debrief_io/handlers/annotations/parser.py`

**Checkpoint**: Dynamic time-varying shapes parse correctly

---

## Phase 10: User Story 7 - Parse Sensor and TMA Data (Priority: P3)

**Goal**: Extract SENSOR, SENSOR2, TMA_POS, TMA_RB contact and solution data

**Independent Test**: Load a REP file with SENSOR and TMA entries and verify contact and solution data is captured

### Tests for User Story 7

- [ ] T071 [test] Write SENSOR parsing tests `services/io/tests/test_annotations/test_sensor.py`
- [ ] T072 [P][test] Add SENSOR2 parsing tests to test_sensor.py
- [ ] T073 [P][test] Write TMA_POS parsing tests `services/io/tests/test_annotations/test_tma.py`
- [ ] T074 [P][test] Add TMA_RB parsing tests to test_tma.py

### Implementation for User Story 7

- [ ] T075 Add SENSOR regex pattern `services/io/src/debrief_io/handlers/annotations/patterns.py`
- [ ] T076 [P] Add SENSOR2 regex pattern `services/io/src/debrief_io/handlers/annotations/patterns.py`
- [ ] T077 [P] Add TMA_POS regex pattern `services/io/src/debrief_io/handlers/annotations/patterns.py`
- [ ] T078 [P] Add TMA_RB regex pattern `services/io/src/debrief_io/handlers/annotations/patterns.py`
- [ ] T079 Implement SensorAnnotation builder `services/io/src/debrief_io/handlers/annotations/builders.py`
- [ ] T080 [P] Implement TMAAnnotation builder `services/io/src/debrief_io/handlers/annotations/builders.py`
- [ ] T081 Integrate sensor/TMA parsing into parser `services/io/src/debrief_io/handlers/annotations/parser.py`
- [ ] T082 Add WHEEL and TRACKSPLIT patterns (minor types) `services/io/src/debrief_io/handlers/annotations/patterns.py`

**Checkpoint**: P3 stories complete - all annotation types implemented

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, performance, and documentation

### Final Validation

- [ ] T083 Run full shapes.rep parsing test (SC-001) `services/io/tests/test_annotations/test_shapes_rep.py`
- [ ] T084 Verify schema validation for all annotation types (SC-003) `services/io/tests/test_annotations/test_schema_validation.py`
- [ ] T085 Performance benchmark vs track-only parsing (SC-005) `services/io/tests/test_annotations/test_performance.py`
- [ ] T086 Run full test suite and verify all pass `services/io/`

### Documentation

- [ ] T087 Update pyproject.toml version `services/io/pyproject.toml`
- [ ] T088 [P] Add annotation parsing to module docstrings `services/io/src/debrief_io/handlers/annotations/__init__.py`

### Evidence Collection (REQUIRED)

- [ ] T089 Capture test results in `specs/007-rep-special-comments/evidence/test-summary.md`
- [ ] T090 Create usage demonstration in `specs/007-rep-special-comments/evidence/usage-example.md`
- [ ] T091 [P] Capture sample GeoJSON output in `specs/007-rep-special-comments/evidence/sample-fixtures.json`
- [ ] T092 [P] Create schema diagram in `specs/007-rep-special-comments/evidence/schema-diagram.md`

### Media Content

- [ ] T093 Create shipped blog post in `specs/007-rep-special-comments/media/shipped-post.md`
- [ ] T094 [P] Create LinkedIn shipped summary in `specs/007-rep-special-comments/media/linkedin-shipped.md`

### PR Creation

- [ ] T095 Create PR and publish blog: run /speckit.pr

**Task T095 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-10)**: All depend on Foundational phase completion
  - P1 stories (3, 4, 5) should complete before P2 stories
  - P2 stories (6, 7, 8) should complete before P3 stories
  - P3 stories (9, 10) are optional for MVP
- **Polish (Phase 11)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (Narrative)**: Can start after Foundational - No dependencies
- **User Story 2 (Shapes)**: Can start after Foundational - No dependencies
- **User Story 8 (Track Regression)**: Should run after US1 and US2 to verify no regression
- **User Story 3-7**: Can start after Foundational - Build on patterns established in US1/US2

### Parallel Opportunities

Within Phase 2 (Foundational):
- T009 + T010 (coordinate + timestamp extraction) in parallel
- T011 + T012 (coordinate + timestamp tests) in parallel

Within User Story phases:
- All tests marked [P] can run in parallel
- Pattern additions marked [P] can run in parallel
- Builder implementations marked [P] can run in parallel

---

## Parallel Example: Phase 2

```bash
# Launch coordinate and timestamp extraction together:
Task: "Extract DMS coordinate parsing" services/io/src/debrief_io/handlers/annotations/coordinates.py
Task: "Extract timestamp parsing" services/io/src/debrief_io/handlers/annotations/timestamps.py

# Launch their tests together:
Task: "Write coordinate parsing tests" services/io/tests/test_annotations/test_coordinates.py
Task: "Write timestamp parsing tests" services/io/tests/test_annotations/test_timestamps.py
```

---

## Implementation Strategy

### MVP First (P1 Stories Only)

1. Complete Phase 1: Setup (schema update)
2. Complete Phase 2: Foundational (symbology, coordinates, timestamps, symbols)
3. Complete Phase 3: User Story 1 (NARRATIVE)
4. Complete Phase 4: User Story 2 (CIRCLE, RECT, LINE)
5. Complete Phase 5: User Story 8 (Track Regression)
6. **STOP and VALIDATE**: All P1 stories work independently
7. Deploy/demo if ready - annotations now parse alongside tracks

### Incremental Delivery

1. MVP (P1) → Narratives + Basic Shapes + Track Preservation
2. Add P2 → TEXT, VECTOR, POLY, POLYLINE, TIMETEXT, PERIODTEXT, ELLIPSE
3. Add P3 → DYNAMIC_*, SENSOR, TMA (optional, for advanced users)
4. Each increment adds annotation types without breaking earlier work

---

## Notes

- [P] tasks = different files, no dependencies
- [test] tasks should be written FIRST and FAIL before implementation
- Symbol code validation uses fail-fast - invalid codes raise ParseError immediately
- All annotations require explicit symbol codes (no defaults)
- shapes.rep in fixtures is the canonical test reference
- **Evidence is required** - capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
