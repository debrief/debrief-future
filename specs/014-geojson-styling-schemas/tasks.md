# Tasks: GeoJSON Styling Properties Schemas

**Input**: Design documents from `/specs/014-geojson-styling-schemas/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md

**Tests**: Tests are REQUIRED per Constitution Article VI (Schema tests gate merges) and Article VII (Test-Driven AI).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. These are used in PR descriptions, documentation, and future blog posts.

**Evidence Directory**: `specs/014-geojson-styling-schemas/evidence/`
**Media Directory**: `specs/014-geojson-styling-schemas/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | pytest results with golden fixture and round-trip tests | After all tests pass |
| usage-example.md | Python and TypeScript validation examples | After schemas generate |
| sample-fixtures.json | Example valid styling objects | After fixtures created |
| schema-diagram.md | Entity relationship diagram | After schemas defined |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | During /speckit.plan (DONE) |
| media/linkedin-planning.md | LinkedIn summary for planning | During /speckit.plan (DONE) |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the schema workspace and add new enums to common.yaml

- [ ] T001 Add PointShapeEnum to common.yaml `shared/schemas/src/linkml/common.yaml`
- [ ] T002 [P] Add LineCapEnum to common.yaml `shared/schemas/src/linkml/common.yaml`
- [ ] T003 [P] Add LineJoinEnum to common.yaml `shared/schemas/src/linkml/common.yaml`
- [ ] T004 Create styling.yaml module `shared/schemas/src/linkml/styling.yaml`
- [ ] T005 Update debrief.yaml to import styling module `shared/schemas/src/linkml/debrief.yaml`

**Checkpoint**: Enums defined, styling module created and imported

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define core styling schemas that all feature updates depend on

**⚠️ CRITICAL**: No feature schema updates can begin until styling schemas are complete

### Golden Fixtures for Styling Schemas (Test-First)

> **NOTE: Write fixtures FIRST, they will FAIL validation until schemas are implemented**

- [ ] T006 [P][test] Create valid PointProperties fixtures `shared/schemas/src/fixtures/valid/point-properties-valid-01.json`
- [ ] T007 [P][test] Create valid PointProperties fixture (alternate shape) `shared/schemas/src/fixtures/valid/point-properties-valid-02.json`
- [ ] T008 [P][test] Create valid PointProperties fixture (boundary values) `shared/schemas/src/fixtures/valid/point-properties-valid-03.json`
- [ ] T009 [P][test] Create invalid PointProperties fixture (bad radius) `shared/schemas/src/fixtures/invalid/point-properties-invalid-radius.json`
- [ ] T010 [P][test] Create invalid PointProperties fixture (bad shape) `shared/schemas/src/fixtures/invalid/point-properties-invalid-shape.json`
- [ ] T011 [P][test] Create invalid PointProperties fixture (bad opacity) `shared/schemas/src/fixtures/invalid/point-properties-invalid-opacity.json`
- [ ] T012 [P][test] Create valid LineProperties fixtures `shared/schemas/src/fixtures/valid/line-properties-valid-01.json`
- [ ] T013 [P][test] Create valid LineProperties fixture (with dash) `shared/schemas/src/fixtures/valid/line-properties-valid-02.json`
- [ ] T014 [P][test] Create valid LineProperties fixture (boundary values) `shared/schemas/src/fixtures/valid/line-properties-valid-03.json`
- [ ] T015 [P][test] Create invalid LineProperties fixture (bad weight) `shared/schemas/src/fixtures/invalid/line-properties-invalid-weight.json`
- [ ] T016 [P][test] Create invalid LineProperties fixture (bad cap) `shared/schemas/src/fixtures/invalid/line-properties-invalid-cap.json`
- [ ] T017 [P][test] Create invalid LineProperties fixture (bad opacity) `shared/schemas/src/fixtures/invalid/line-properties-invalid-opacity.json`
- [ ] T018 [P][test] Create valid PolygonProperties fixtures `shared/schemas/src/fixtures/valid/polygon-properties-valid-01.json`
- [ ] T019 [P][test] Create valid PolygonProperties fixture (no fill) `shared/schemas/src/fixtures/valid/polygon-properties-valid-02.json`
- [ ] T020 [P][test] Create valid PolygonProperties fixture (dashed border) `shared/schemas/src/fixtures/valid/polygon-properties-valid-03.json`
- [ ] T021 [P][test] Create invalid PolygonProperties fixture (bad fill opacity) `shared/schemas/src/fixtures/invalid/polygon-properties-invalid-fill.json`
- [ ] T022 [P][test] Create invalid PolygonProperties fixture (bad stroke opacity) `shared/schemas/src/fixtures/invalid/polygon-properties-invalid-opacity.json`
- [ ] T023 [P][test] Create invalid PolygonProperties fixture (bad stroke weight) `shared/schemas/src/fixtures/invalid/polygon-properties-invalid-stroke.json`
- [ ] T024 [P][test] Create valid TrackStyle fixture (composite) `shared/schemas/src/fixtures/valid/track-style-valid-01.json`

### Styling Schema Implementation

- [ ] T025 Define PointProperties class in styling.yaml `shared/schemas/src/linkml/styling.yaml`
- [ ] T026 [P] Define LineProperties class in styling.yaml `shared/schemas/src/linkml/styling.yaml`
- [ ] T027 [P] Define PolygonProperties class in styling.yaml `shared/schemas/src/linkml/styling.yaml`
- [ ] T028 Define TrackStyle composite class in styling.yaml `shared/schemas/src/linkml/styling.yaml`
- [ ] T029 Run LinkML generator to produce Pydantic models `shared/schemas/scripts/generate.py`
- [ ] T030 Run LinkML generator to produce JSON Schema `shared/schemas/scripts/generate.py`
- [ ] T031 Run LinkML generator to produce TypeScript types `shared/schemas/scripts/generate.py`

### Test Infrastructure Update

- [ ] T032 Add styling schemas to ENTITY_MAP in test_golden.py `shared/schemas/tests/test_golden.py`
- [ ] T033 [P] Add styling schemas to ROUNDTRIP_ENTITY_MAP in test_roundtrip.py `shared/schemas/tests/test_roundtrip.py`
- [ ] T034 Run pytest to verify fixtures pass/fail as expected `shared/schemas/tests/`

**Checkpoint**: Foundation ready - all styling schemas defined, generated, and tested

---

## Phase 3: User Story 1 - Frontend Developer Renders Track with Consistent Styling (Priority: P1) 🎯 MVP

**Goal**: TrackFeature has a required `style` property with TrackStyle schema so frontends can render tracks consistently

**Independent Test**: Load a TrackFeature GeoJSON with `style.line` and `style.point` properties and verify validation passes

### Tests for User Story 1 ⚠️

> **NOTE: Write fixtures FIRST, ensure they FAIL before implementation**

- [ ] T035 [P][test] Update track-feature-valid-01.json with style property `shared/schemas/src/fixtures/valid/track-feature-valid-01.json`
- [ ] T036 [P][test] Update track-feature-valid-02.json with style property `shared/schemas/src/fixtures/valid/track-feature-valid-02.json`
- [ ] T037 [P][test] Create track-feature-missing-style.json (invalid - no style) `shared/schemas/src/fixtures/invalid/track-feature-missing-style.json`

### Implementation for User Story 1

- [ ] T038 Add style attribute to TrackProperties in geojson.yaml `shared/schemas/src/linkml/geojson.yaml`
- [ ] T039 Remove deprecated color attribute from TrackProperties `shared/schemas/src/linkml/geojson.yaml`
- [ ] T040 Regenerate Pydantic/JSON Schema/TypeScript for TrackFeature `shared/schemas/scripts/generate.py`
- [ ] T041 Run pytest to verify TrackFeature validation works `shared/schemas/tests/test_golden.py`

**Checkpoint**: TrackFeature now has required `style` property with TrackStyle - User Story 1 complete

---

## Phase 4: User Story 2 - Schema Generator Produces Validated Pydantic Models (Priority: P2)

**Goal**: LinkML generator produces valid Pydantic models with all constraints for ReferenceLocation and annotations

**Independent Test**: Run LinkML generator, validate sample styling objects against Pydantic models, verify constraints work

### Tests for User Story 2 ⚠️

- [ ] T042 [P][test] Update reference-location-valid-01.json with style property `shared/schemas/src/fixtures/valid/reference-location-valid-01.json`
- [ ] T043 [P][test] Update reference-location-valid-02.json with style property `shared/schemas/src/fixtures/valid/reference-location-valid-02.json`
- [ ] T044 [P][test] Update narrative-entry-valid-01.json with style property `shared/schemas/src/fixtures/valid/narrative-entry-valid-01.json`
- [ ] T045 [P][test] Update narrative-entry-valid-02.json with style property `shared/schemas/src/fixtures/valid/narrative-entry-valid-02.json`
- [ ] T046 [P][test] Update circle-annotation-valid-01.json with style property `shared/schemas/src/fixtures/valid/circle-annotation-valid-01.json`
- [ ] T047 [P][test] Update rectangle-annotation-valid-01.json with style property `shared/schemas/src/fixtures/valid/rectangle-annotation-valid-01.json`
- [ ] T048 [P][test] Update line-annotation-valid-01.json with style property `shared/schemas/src/fixtures/valid/line-annotation-valid-01.json`
- [ ] T049 [P][test] Update text-annotation-valid-01.json with style property `shared/schemas/src/fixtures/valid/text-annotation-valid-01.json`
- [ ] T050 [P][test] Update vector-annotation-valid-01.json with style property `shared/schemas/src/fixtures/valid/vector-annotation-valid-01.json`

### Implementation for User Story 2

- [ ] T051 Add style attribute to ReferenceLocationProperties `shared/schemas/src/linkml/geojson.yaml`
- [ ] T052 Remove deprecated color from ReferenceLocationProperties `shared/schemas/src/linkml/geojson.yaml`
- [ ] T053 Add style attribute to NarrativeEntryProperties `shared/schemas/src/linkml/annotations.yaml`
- [ ] T054 [P] Add style attribute to CircleAnnotationProperties `shared/schemas/src/linkml/annotations.yaml`
- [ ] T055 [P] Add style attribute to RectangleAnnotationProperties `shared/schemas/src/linkml/annotations.yaml`
- [ ] T056 [P] Add style attribute to LineAnnotationProperties `shared/schemas/src/linkml/annotations.yaml`
- [ ] T057 [P] Add style attribute to TextAnnotationProperties `shared/schemas/src/linkml/annotations.yaml`
- [ ] T058 [P] Add style attribute to VectorAnnotationProperties `shared/schemas/src/linkml/annotations.yaml`
- [ ] T059 Remove deprecated color from all annotation Properties classes `shared/schemas/src/linkml/annotations.yaml`
- [ ] T060 Regenerate all Pydantic/JSON Schema/TypeScript `shared/schemas/scripts/generate.py`
- [ ] T061 Run pytest to verify all feature schemas validate correctly `shared/schemas/tests/test_golden.py`

**Checkpoint**: All feature schemas updated with required `style` property - User Story 2 complete

---

## Phase 5: User Story 3 - Round-Trip Serialization Preserves Styling Data (Priority: P3)

**Goal**: Styling properties survive round-trip serialization across Python and TypeScript without data loss

**Independent Test**: Create styled feature in Python, serialize to JSON, validate in TypeScript, deserialize back, compare

### Tests for User Story 3 ⚠️

- [ ] T062 [test] Add PointProperties to round-trip test entity map `shared/schemas/tests/test_roundtrip.py`
- [ ] T063 [P][test] Add LineProperties to round-trip test entity map `shared/schemas/tests/test_roundtrip.py`
- [ ] T064 [P][test] Add PolygonProperties to round-trip test entity map `shared/schemas/tests/test_roundtrip.py`
- [ ] T065 [P][test] Add TrackStyle to round-trip test entity map `shared/schemas/tests/test_roundtrip.py`

### Implementation for User Story 3

- [ ] T066 Create round-trip test for styling schemas `shared/schemas/tests/test_roundtrip.py`
- [ ] T067 Run pytest to verify round-trip serialization works `shared/schemas/tests/test_roundtrip.py`
- [ ] T068 Verify TypeScript JSON Schema validation matches Python `shared/schemas/tests/validate-jsonschema.js`

**Checkpoint**: Round-trip tests pass with zero data loss - User Story 3 complete

---

## Phase 6: User Story 4 - Analyst Sets Custom Styling for Exported Data (Priority: P4)

**Goal**: Styling properties are expressive enough for tactical analysis (colors, patterns, shapes)

**Independent Test**: Create features with various styling combinations and verify schema accepts them

### Tests for User Story 4 ⚠️

- [ ] T069 [test] Create fixture with dashed line styling `shared/schemas/src/fixtures/valid/line-properties-dashed-01.json`
- [ ] T070 [P][test] Create fixture with triangle point marker `shared/schemas/src/fixtures/valid/point-properties-triangle-01.json`
- [ ] T071 [P][test] Create fixture with tactical color scheme `shared/schemas/src/fixtures/valid/track-style-tactical-01.json`

### Implementation for User Story 4

- [ ] T072 Verify dash_array string format works for complex patterns `shared/schemas/tests/test_golden.py`
- [ ] T073 Verify all three point shapes (circle, square, triangle) validate `shared/schemas/tests/test_golden.py`
- [ ] T074 Verify various CSS color formats validate correctly `shared/schemas/tests/test_golden.py`

**Checkpoint**: All tactical styling combinations validate correctly - User Story 4 complete

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation, and evidence collection

### Final Validation

- [ ] T075 Run full pytest suite with coverage `shared/schemas/tests/`
- [ ] T076 Run TypeScript validation tests `shared/schemas/tests/validate-jsonschema.js`
- [ ] T077 Verify quickstart.md examples work `specs/014-geojson-styling-schemas/quickstart.md`

### Evidence Collection (REQUIRED)

> **Purpose**: Capture artifacts for PR description and future documentation

- [ ] T078 Create evidence directory `specs/014-geojson-styling-schemas/evidence/`
- [ ] T079 Capture test summary with pass/fail counts `specs/014-geojson-styling-schemas/evidence/test-summary.md`
- [ ] T080 Create usage demonstration showing Python and TypeScript validation `specs/014-geojson-styling-schemas/evidence/usage-example.md`
- [ ] T081 [P] Capture sample styling fixtures `specs/014-geojson-styling-schemas/evidence/sample-fixtures.json`
- [ ] T082 [P] Create entity relationship diagram `specs/014-geojson-styling-schemas/evidence/schema-diagram.md`

### Media Content (REQUIRED)

- [ ] T083 Create shipped blog post `specs/014-geojson-styling-schemas/media/shipped-post.md`
- [ ] T084 [P] Create LinkedIn shipped summary `specs/014-geojson-styling-schemas/media/linkedin-shipped.md`

### PR Creation (REQUIRED - MUST BE FINAL TASK)

- [ ] T085 Create PR and publish blog: run /speckit.pr

**Task T085 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational - TrackFeature only
- **User Story 2 (Phase 4)**: Depends on Foundational - can run parallel to US1
- **User Story 3 (Phase 5)**: Depends on US1 and US2 (needs all schemas updated)
- **User Story 4 (Phase 6)**: Depends on US1 and US2 (needs all schemas for expressive testing)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

| Story | Depends On | Can Parallel With |
|-------|------------|-------------------|
| US1 (P1) | Foundation | US2 |
| US2 (P2) | Foundation | US1 |
| US3 (P3) | US1, US2 | US4 |
| US4 (P4) | US1, US2 | US3 |

### Parallel Opportunities

**Phase 1 (Setup)**: T002, T003 can run parallel to T001
**Phase 2 (Foundation)**: All fixture tasks (T006-T024) can run in parallel
**Phase 3 (US1)**: T035-T037 can run in parallel
**Phase 4 (US2)**: T042-T050 can run in parallel; T054-T058 can run in parallel
**Phase 5 (US3)**: T063-T065 can run in parallel
**Phase 6 (US4)**: T070-T071 can run in parallel
**Phase 7 (Polish)**: T081-T082 can run in parallel; T084 can run parallel to T083

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (enums, styling.yaml)
2. Complete Phase 2: Foundational (styling schemas with fixtures)
3. Complete Phase 3: User Story 1 (TrackFeature with style)
4. **STOP and VALIDATE**: Test TrackFeature independently
5. Deploy/demo TrackFeature styling

### Incremental Delivery

1. Setup + Foundational → Styling schemas ready
2. Add User Story 1 → TrackFeature has styling → Demo
3. Add User Story 2 → All features have styling → Demo
4. Add User Story 3 → Round-trip tests pass → Integration verified
5. Add User Story 4 → Tactical styling verified → Full feature ready

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [test] tasks = golden fixtures or test code
- Fixtures MUST be created FIRST (test-driven per Constitution Article VII)
- Run `make generate` in shared/schemas/ to regenerate all outputs
- Run `pytest` in shared/schemas/ to verify golden fixtures
- Commit after each logical group of tasks
- **Evidence is required** - capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
