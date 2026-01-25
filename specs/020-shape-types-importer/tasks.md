# Tasks: Add Remaining Shape Type Importers with Storybook Verification

**Input**: Design documents from `/specs/020-shape-types-importer/`
**Prerequisites**: plan.md (complete), spec.md (complete), research.md (complete), data-model.md (complete)

**Tests**: Unit tests required per spec (VI.2 Constitution: "Services require unit tests")

---

## Evidence Requirements

**Evidence Directory**: `specs/020-shape-types-importer/evidence/`
**Media Directory**: `specs/020-shape-types-importer/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | pytest results for all shape builders | After all tests pass |
| usage-example.md | Python code parsing REP file with shapes | After parsers complete |
| sample-input.rep | REP file with all shape types | After all-shapes.rep created |
| sample-output.json | GeoJSON output from parsing | After fixture generator works |
| storybook-screenshot.png | Visual verification of shapes on map | After Storybook story works |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | Complete (/speckit.plan) |
| media/linkedin-planning.md | LinkedIn summary for planning | Complete (/speckit.plan) |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

---

## Phase 1: Setup

**Purpose**: Create test fixtures and helper infrastructure

- [ ] T001 Create comprehensive REP test fixture `services/io/tests/fixtures/valid/all-shapes.rep`
- [ ] T002 Add `_approximate_ellipse()` helper function `services/io/src/debrief_io/handlers/annotations/builders.py`

---

## Phase 2: Foundation - Phase 2 Shape Builders (Priority: P1) 🎯 MVP

**Goal**: Implement 7 common shape types that complete the core annotation parser

**Independent Test**: `uv run pytest services/io/tests/test_annotations/test_shapes.py -k "poly or ellipse or wheel or timetext" -v`

### Tests for Phase 2 Shapes

- [ ] T003 [test] Write POLY builder tests `services/io/tests/test_annotations/test_phase2_shapes.py`
- [ ] T004 [P][test] Write POLYLINE builder tests `services/io/tests/test_annotations/test_phase2_shapes.py`
- [ ] T005 [P][test] Write ELLIPSE builder tests `services/io/tests/test_annotations/test_phase2_shapes.py`
- [ ] T006 [P][test] Write ELLIPSE2 builder tests `services/io/tests/test_annotations/test_phase2_shapes.py`
- [ ] T007 [P][test] Write TIMETEXT builder tests `services/io/tests/test_annotations/test_phase2_shapes.py`
- [ ] T008 [P][test] Write PERIODTEXT builder tests `services/io/tests/test_annotations/test_phase2_shapes.py`
- [ ] T009 [P][test] Write WHEEL builder tests `services/io/tests/test_annotations/test_phase2_shapes.py`

### Implementation for Phase 2 Shapes

- [ ] T010 Implement `build_polygon()` for POLY shapes `services/io/src/debrief_io/handlers/annotations/builders.py`
- [ ] T011 [P] Implement `build_polyline()` for POLYLINE shapes `services/io/src/debrief_io/handlers/annotations/builders.py`
- [ ] T012 Implement `build_ellipse()` for ELLIPSE shapes (uses _approximate_ellipse) `services/io/src/debrief_io/handlers/annotations/builders.py`
- [ ] T013 [P] Extend `build_ellipse()` for ELLIPSE2 time-range variant `services/io/src/debrief_io/handlers/annotations/builders.py`
- [ ] T014 [P] Implement `build_timetext()` for TIMETEXT shapes `services/io/src/debrief_io/handlers/annotations/builders.py`
- [ ] T015 [P] Implement `build_periodtext()` for PERIODTEXT shapes `services/io/src/debrief_io/handlers/annotations/builders.py`
- [ ] T016 Implement `build_wheel()` for WHEEL annular shapes `services/io/src/debrief_io/handlers/annotations/builders.py`

**Checkpoint**: Phase 2 shapes parse correctly, tests pass

---

## Phase 3: Phase 3 Shape Builders (Priority: P2)

**Goal**: Implement 8 specialized shape types for dynamic and sensor annotations

**Independent Test**: `uv run pytest services/io/tests/test_annotations/test_shapes.py -k "dynamic or sensor or tma or tracksplit" -v`

### Tests for Phase 3 Shapes

- [ ] T017 [test] Write DYNAMIC_RECT builder tests `services/io/tests/test_annotations/test_phase3_shapes.py`
- [ ] T018 [P][test] Write DYNAMIC_CIRCLE builder tests `services/io/tests/test_annotations/test_phase3_shapes.py`
- [ ] T019 [P][test] Write DYNAMIC_POLY builder tests `services/io/tests/test_annotations/test_phase3_shapes.py`
- [ ] T020 [P][test] Write SENSOR builder tests `services/io/tests/test_annotations/test_phase3_shapes.py`
- [ ] T021 [P][test] Write SENSOR2 builder tests `services/io/tests/test_annotations/test_phase3_shapes.py`
- [ ] T022 [P][test] Write TMA_POS builder tests `services/io/tests/test_annotations/test_phase3_shapes.py`
- [ ] T023 [P][test] Write TMA_RB builder tests `services/io/tests/test_annotations/test_phase3_shapes.py`
- [ ] T024 [P][test] Write TRACKSPLIT builder tests `services/io/tests/test_annotations/test_phase3_shapes.py`

### Implementation for Phase 3 Shapes

- [ ] T025 Implement `build_dynamic_rect()` for DYNAMIC_RECT shapes `services/io/src/debrief_io/handlers/annotations/builders.py`
- [ ] T026 [P] Implement `build_dynamic_circle()` for DYNAMIC_CIRCLE shapes `services/io/src/debrief_io/handlers/annotations/builders.py`
- [ ] T027 [P] Implement `build_dynamic_poly()` for DYNAMIC_POLY shapes `services/io/src/debrief_io/handlers/annotations/builders.py`
- [ ] T028 Implement `build_sensor()` for SENSOR shapes `services/io/src/debrief_io/handlers/annotations/builders.py`
- [ ] T029 [P] Extend `build_sensor()` for SENSOR2 variant `services/io/src/debrief_io/handlers/annotations/builders.py`
- [ ] T030 Implement `build_tma()` for TMA_POS shapes (reuses _approximate_ellipse) `services/io/src/debrief_io/handlers/annotations/builders.py`
- [ ] T031 [P] Extend `build_tma()` for TMA_RB variant `services/io/src/debrief_io/handlers/annotations/builders.py`
- [ ] T032 Implement `build_tracksplit()` for TRACKSPLIT (null geometry) `services/io/src/debrief_io/handlers/annotations/builders.py`

**Checkpoint**: All 15 shape types parse correctly, no builders return None

---

## Phase 4: LinkML Schema Extensions (Priority: P3)

**Goal**: Add type definitions for new shapes to maintain schema integrity

**Independent Test**: `uv run pytest shared/schemas/tests/ -v`

### Schema Definitions

- [ ] T033 Add PolyAnnotation schema `shared/schemas/src/linkml/annotations.yaml`
- [ ] T034 [P] Add PolylineAnnotation schema `shared/schemas/src/linkml/annotations.yaml`
- [ ] T035 [P] Add EllipseAnnotation schema `shared/schemas/src/linkml/annotations.yaml`
- [ ] T036 [P] Add Ellipse2Annotation schema `shared/schemas/src/linkml/annotations.yaml`
- [ ] T037 [P] Add TimeTextAnnotation schema `shared/schemas/src/linkml/annotations.yaml`
- [ ] T038 [P] Add PeriodTextAnnotation schema `shared/schemas/src/linkml/annotations.yaml`
- [ ] T039 [P] Add WheelAnnotation schema `shared/schemas/src/linkml/annotations.yaml`
- [ ] T040 [P] Add DynamicRectAnnotation schema `shared/schemas/src/linkml/annotations.yaml`
- [ ] T041 [P] Add DynamicCircleAnnotation schema `shared/schemas/src/linkml/annotations.yaml`
- [ ] T042 [P] Add DynamicPolyAnnotation schema `shared/schemas/src/linkml/annotations.yaml`
- [ ] T043 [P] Add SensorAnnotation schema `shared/schemas/src/linkml/annotations.yaml`
- [ ] T044 [P] Add Sensor2Annotation schema `shared/schemas/src/linkml/annotations.yaml`
- [ ] T045 [P] Add TMAPosAnnotation schema `shared/schemas/src/linkml/annotations.yaml`
- [ ] T046 [P] Add TMARBAnnotation schema `shared/schemas/src/linkml/annotations.yaml`
- [ ] T047 [P] Add TracksplitAnnotation schema `shared/schemas/src/linkml/annotations.yaml`

### Schema Generation

- [ ] T048 Regenerate Pydantic models from LinkML `shared/schemas/`
- [ ] T049 Regenerate JSON Schema from LinkML `shared/schemas/`
- [ ] T050 [P] Regenerate TypeScript types from LinkML `shared/schemas/`

### Schema Fixtures

- [ ] T051 Add valid fixture for PolyAnnotation `shared/schemas/src/fixtures/valid/poly-annotation-valid-01.json`
- [ ] T052 [P] Add valid fixture for EllipseAnnotation `shared/schemas/src/fixtures/valid/ellipse-annotation-valid-01.json`
- [ ] T053 [P] Add valid fixture for WheelAnnotation `shared/schemas/src/fixtures/valid/wheel-annotation-valid-01.json`
- [ ] T054 [P] Add valid fixture for SensorAnnotation `shared/schemas/src/fixtures/valid/sensor-annotation-valid-01.json`

**Checkpoint**: Schema adherence tests pass

---

## Phase 5: Storybook Verification Pipeline (Priority: P4)

**Goal**: Create visual verification of all shape types on map

**Independent Test**: `cd shared/components && pnpm storybook` → navigate to ShapeTypes story

### Fixture Generation

- [ ] T055 Create fixture generator script `services/io/scripts/generate-storybook-fixtures.py`
- [ ] T056 Generate all-shapes.geojson from all-shapes.rep `shared/components/src/fixtures/all-shapes.geojson`
- [ ] T057 Add generate:fixtures script to package.json `shared/components/package.json`

### Storybook Story

- [ ] T058 Create ShapeTypes.stories.tsx `shared/components/src/MapView/ShapeTypes.stories.tsx`
- [ ] T059 Visual verification: all 15 shape types render correctly

**Checkpoint**: Storybook shows all shapes on map

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Integration tests, evidence collection, and PR preparation

### Integration Tests

- [ ] T060 [test] Full file parsing test with all-shapes.rep `services/io/tests/test_annotations/test_integration.py`
- [ ] T061 Run all existing tests to verify no regressions `services/io/tests/`

### Evidence Collection

- [ ] T062 Create evidence directory `specs/020-shape-types-importer/evidence/`
- [ ] T063 Capture test summary with pass/fail counts `specs/020-shape-types-importer/evidence/test-summary.md`
- [ ] T064 Record usage example demonstrating parsing `specs/020-shape-types-importer/evidence/usage-example.md`
- [ ] T065 [P] Copy sample input REP file `specs/020-shape-types-importer/evidence/sample-input.rep`
- [ ] T066 [P] Capture sample GeoJSON output `specs/020-shape-types-importer/evidence/sample-output.json`
- [ ] T067 [P] Capture Storybook screenshot of shapes `specs/020-shape-types-importer/evidence/storybook-screenshot.png`

### Media Content

- [ ] T068 Create shipped blog post `specs/020-shape-types-importer/media/shipped-post.md`
- [ ] T069 [P] Create LinkedIn shipped summary `specs/020-shape-types-importer/media/linkedin-shipped.md`

### PR Creation

- [ ] T070 Create PR and publish blog: run /speckit.pr

**Task T070 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - can start immediately
- **Phase 2 (Phase 2 Shapes)**: Depends on T001, T002 from Setup
- **Phase 3 (Phase 3 Shapes)**: Can start after Phase 2 or in parallel
- **Phase 4 (Schemas)**: Can start after Phase 2 shapes work
- **Phase 5 (Storybook)**: Depends on all shapes working (Phase 2 + 3)
- **Phase 6 (Polish)**: Depends on all previous phases

### Parallel Opportunities

**Within Phase 2 Tests**: T003-T009 can all run in parallel
**Within Phase 2 Implementation**: T011, T013-T015 can run in parallel after T010, T012
**Within Phase 3 Tests**: T017-T024 can all run in parallel
**Within Phase 3 Implementation**: T026-T027 parallel, T029 after T028, T031 after T030
**Within Phase 4 Schemas**: T033-T047 can all run in parallel
**Within Phase 4 Generation**: T048-T050 must run after schemas updated
**Within Phase 6 Evidence**: T065-T067 can run in parallel

---

## Implementation Strategy

### MVP First (Phase 2 Shapes Only)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Phase 2 Shape Builders (T003-T016)
3. **STOP and VALIDATE**: All 7 Phase 2 shapes parse correctly
4. These are the most commonly used annotation shapes

### Incremental Delivery

1. Setup → Foundation ready
2. Phase 2 Shapes → Core annotation support (MVP)
3. Phase 3 Shapes → Specialized annotation support
4. Schemas → Type safety and validation
5. Storybook → Visual verification
6. Polish → Evidence, media, PR

### Task Count Summary

| Phase | Tasks | Parallel Opportunities |
|-------|-------|------------------------|
| Phase 1: Setup | 2 | 0 |
| Phase 2: Phase 2 Shapes | 14 | 10 |
| Phase 3: Phase 3 Shapes | 16 | 12 |
| Phase 4: Schemas | 22 | 20 |
| Phase 5: Storybook | 5 | 1 |
| Phase 6: Polish | 11 | 5 |
| **Total** | **70** | **48** |

---

## Notes

- [P] tasks can run in parallel (different functions, no dependencies)
- [test] tasks should be written before implementation
- All builders follow the existing pattern in builders.py
- Schema tasks can be batched (add all to one file, run generation once)
- Evidence collection requires working parsers and Storybook
- Run `/speckit.pr` after all tasks complete to create PR with evidence
