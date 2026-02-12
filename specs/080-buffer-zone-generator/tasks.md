# Tasks: Buffer Zone Generator

**Input**: Design documents from `/specs/080-buffer-zone-generator/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/tool-contract.md

**Tests**: Tests are REQUIRED per Constitution Article VI ("no service code merged without corresponding tests").

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

---

## Evidence Requirements

**Evidence Directory**: `specs/080-buffer-zone-generator/evidence/`
**Media Directory**: `specs/080-buffer-zone-generator/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | pytest results with pass/fail counts and coverage | After all tests pass |
| usage-example.md | Python code generating zones from a track | After core tool works |
| sample-output.json | GeoJSON FeatureCollection with 3 zone polygons | After tool produces valid output |
| golden-input.json | Track fixture used for golden example | After golden examples defined |
| golden-output.json | Expected zone output for golden example | After golden examples defined |

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

**Purpose**: Create directory structure and package scaffolding

- [x] T001 Create tool directory structure `services/calc/debrief_calc/tools/sensor/__init__.py`
- [x] T002 [P] Create detection subdirectory `services/calc/debrief_calc/tools/sensor/detection/__init__.py`
- [x] T003 [P] Create test directory structure `services/calc/tests/tools/sensor/__init__.py`
- [x] T004 [P] Create test detection subdirectory `services/calc/tests/tools/sensor/detection/__init__.py`
- [x] T005 [P] Create tool spec directory `shared/tools/sensor/detection/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core math utilities and sensor model interface that all user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 [test] Write sensor model interface tests `services/calc/tests/tools/sensor/detection/test_sensor_model.py`
- [x] T007 Implement SensorModel Protocol and SensorModelZone dataclass `services/calc/debrief_calc/tools/sensor/detection/sensor_model.py`
- [x] T008 Implement StubSensorModel returning 3nm/75%, 6nm/50%, 12nm/25% `services/calc/debrief_calc/tools/sensor/detection/sensor_model.py`
- [x] T009 [test] Write Vincenty offset helper tests (reuse move-shape math patterns) `services/calc/tests/tools/sensor/detection/test_buffer_zone_generator.py`
- [x] T010 Implement translate_point helper (Vincenty destination formula with nm→km conversion) `services/calc/debrief_calc/tools/sensor/detection/buffer_zone_generator.py`
- [x] T011 [test] Write convex hull algorithm tests `services/calc/tests/tools/sensor/detection/test_buffer_zone_generator.py`
- [x] T012 Implement convex_hull function (Graham scan or gift wrapping, stdlib math only) `services/calc/debrief_calc/tools/sensor/detection/buffer_zone_generator.py`

**Checkpoint**: Foundation ready — sensor model, point offset, and polygon construction all tested

---

## Phase 3: User Story 1 - Generate Detection Zones (Priority: P1) MVP

**Goal**: Given a track feature, generate 3 concentric buffer zone polygons at default distances (3nm, 6nm, 12nm) named "75%", "50%", "25%"

**Independent Test**: Provide a single track, verify 3 polygon features returned with correct distances, names, and containment

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T013 [test] [US1] Test 3 zones generated with default distances `services/calc/tests/tools/sensor/detection/test_buffer_zone_generator.py`
- [x] T014 [P][test] [US1] Test zone properties (kind=ZONE, name, likelihood_pct, distance_nm) `services/calc/tests/tools/sensor/detection/test_buffer_zone_generator.py`
- [x] T015 [P][test] [US1] Test zones ordered innermost to outermost `services/calc/tests/tools/sensor/detection/test_buffer_zone_generator.py`
- [x] T016 [P][test] [US1] Test each zone fully encloses track (point-in-polygon validation) `services/calc/tests/tools/sensor/detection/test_buffer_zone_generator.py`
- [x] T017 [P][test] [US1] Test concentric containment (inner zone within outer zone) `services/calc/tests/tools/sensor/detection/test_buffer_zone_generator.py`
- [x] T018 [P][test] [US1] Test error on empty input `services/calc/tests/tools/sensor/detection/test_buffer_zone_generator.py`
- [x] T019 [P][test] [US1] Test error on no TRACK features `services/calc/tests/tools/sensor/detection/test_buffer_zone_generator.py`
- [x] T020 [P][test] [US1] Test non-track features silently skipped `services/calc/tests/tools/sensor/detection/test_buffer_zone_generator.py`
- [x] T021 [P][test] [US1] Test single-point track produces circular zones `services/calc/tests/tools/sensor/detection/test_buffer_zone_generator.py`

### Implementation for User Story 1

- [x] T022 [US1] Implement generate_buffer_polygon function (offset vertices + convex hull) `services/calc/debrief_calc/tools/sensor/detection/buffer_zone_generator.py`
- [x] T023 [US1] Implement @tool decorated buffer_zone_generator handler with ContextType.SINGLE `services/calc/debrief_calc/tools/sensor/detection/buffer_zone_generator.py`
- [x] T024 [US1] Wire input validation (empty input, no tracks, distance validation) `services/calc/debrief_calc/tools/sensor/detection/buffer_zone_generator.py`
- [x] T025 [US1] Wire result builder (build_addition with result_subtype="feature") `services/calc/debrief_calc/tools/sensor/detection/buffer_zone_generator.py`
- [x] T026 [US1] Verify all US1 tests pass `services/calc/tests/tools/sensor/detection/test_buffer_zone_generator.py`

**Checkpoint**: Core zone generation works with defaults — MVP complete

---

## Phase 4: User Story 2 - Custom Buffer Distances (Priority: P2)

**Goal**: Allow analyst to override the 3 buffer distances via tool parameters

**Independent Test**: Provide a track with custom distances (e.g., 2nm, 8nm, 15nm), verify zones at those distances

### Tests for User Story 2

- [x] T027 [test] [US2] Test custom distances produce zones at specified ranges `services/calc/tests/tools/sensor/detection/test_buffer_zone_generator.py`
- [x] T028 [P][test] [US2] Test non-ascending distances are reordered `services/calc/tests/tools/sensor/detection/test_buffer_zone_generator.py`
- [x] T029 [P][test] [US2] Test error on zero distance `services/calc/tests/tools/sensor/detection/test_buffer_zone_generator.py`
- [x] T030 [P][test] [US2] Test error on negative distance `services/calc/tests/tools/sensor/detection/test_buffer_zone_generator.py`

### Implementation for User Story 2

- [x] T031 [US2] Add distance_1_nm, distance_2_nm, distance_3_nm ToolParameters to @tool decorator `services/calc/debrief_calc/tools/sensor/detection/buffer_zone_generator.py`
- [x] T032 [US2] Implement parameter extraction with defaults and distance sorting `services/calc/debrief_calc/tools/sensor/detection/buffer_zone_generator.py`
- [x] T033 [US2] Add distance validation (positive values only) `services/calc/debrief_calc/tools/sensor/detection/buffer_zone_generator.py`
- [x] T034 [US2] Verify all US2 tests pass `services/calc/tests/tools/sensor/detection/test_buffer_zone_generator.py`

**Checkpoint**: Custom distances work — US1 + US2 both functional

---

## Phase 5: User Story 3 - Cascade Integration (Priority: P3)

**Goal**: Ensure tool is stateless and re-invocable with correct provenance for PROV cascade

**Independent Test**: Invoke twice with different tracks, verify outputs differ and provenance references correct source

### Tests for User Story 3

- [x] T035 [test] [US3] Test stateless re-invocation (different tracks produce different zones) `services/calc/tests/tools/sensor/detection/test_buffer_zone_generator.py`
- [x] T036 [P][test] [US3] Test provenance annotations (debrief:resultType, debrief:sourceFeatures, debrief:label) `services/calc/tests/tools/sensor/detection/test_buffer_zone_generator.py`
- [x] T037 [P][test] [US3] Test sensor model swappability (inject test double with different distances) `services/calc/tests/tools/sensor/detection/test_buffer_zone_generator.py`

### Implementation for User Story 3

- [x] T038 [US3] Verify stateless behaviour (no instance state, no side effects) `services/calc/debrief_calc/tools/sensor/detection/buffer_zone_generator.py`
- [x] T039 [US3] Verify provenance label format: "Generated 3 detection zones (75%, 50%, 25%) for track" `services/calc/debrief_calc/tools/sensor/detection/buffer_zone_generator.py`
- [x] T040 [US3] Verify all US3 tests pass `services/calc/tests/tools/sensor/detection/test_buffer_zone_generator.py`

**Checkpoint**: All user stories complete — tool is cascade-ready

---

## Phase 6: Edge Cases & Tool Specification

**Purpose**: Handle remaining edge cases and create the 9-section tool specification document

- [x] T041 [test] Test antimeridian-crossing track `services/calc/tests/tools/sensor/detection/test_buffer_zone_generator.py`
- [x] T042 [P][test] Test track with very close positions (sub-metre) `services/calc/tests/tools/sensor/detection/test_buffer_zone_generator.py`
- [x] T043 [P][test] Test two-point track (line segment) `services/calc/tests/tools/sensor/detection/test_buffer_zone_generator.py`
- [x] T044 Implement antimeridian longitude normalisation `services/calc/debrief_calc/tools/sensor/detection/buffer_zone_generator.py`
- [x] T045 Write 9-section tool specification `shared/tools/sensor/detection/buffer-zone-generator.1.0.md`
- [x] T046 Create golden example input fixture `shared/tools/sensor/detection/buffer-zone-generator.basic-track.input.json`
- [x] T047 [P] Create golden example output fixture `shared/tools/sensor/detection/buffer-zone-generator.basic-track.output.json`
- [x] T048 Verify all tests pass (full suite) `services/calc/tests/tools/sensor/detection/`

**Checkpoint**: All edge cases handled, tool spec and golden examples complete

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Evidence collection, media content, and PR creation

### Evidence Collection

- [ ] T049 Create evidence directory `specs/080-buffer-zone-generator/evidence/`
- [ ] T050 Capture test summary with pass/fail counts and coverage `specs/080-buffer-zone-generator/evidence/test-summary.md`
- [ ] T051 Create usage demonstration (Python code generating zones) `specs/080-buffer-zone-generator/evidence/usage-example.md`
- [ ] T052 [P] Capture sample zone output as GeoJSON `specs/080-buffer-zone-generator/evidence/sample-output.json`
- [ ] T053 [P] Capture golden example input `specs/080-buffer-zone-generator/evidence/golden-input.json`
- [ ] T054 [P] Capture golden example output `specs/080-buffer-zone-generator/evidence/golden-output.json`

### Media Content

- [ ] T055 Create shipped blog post `specs/080-buffer-zone-generator/media/shipped-post.md`
- [ ] T056 [P] Create LinkedIn shipped summary `specs/080-buffer-zone-generator/media/linkedin-shipped.md`

### PR Creation

- [ ] T057 Create PR and publish blog: run /speckit.pr

**Task T057 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Phase 2 — MVP target
- **User Story 2 (Phase 4)**: Depends on Phase 2 (can run parallel to US1 but recommended after)
- **User Story 3 (Phase 5)**: Depends on Phase 2 (can run parallel but recommended after US1)
- **Edge Cases (Phase 6)**: Depends on Phase 3 (core implementation)
- **Polish (Phase 7)**: Depends on all preceding phases

### User Story Dependencies

- **User Story 1 (P1)**: Depends only on Foundation — no other story dependencies
- **User Story 2 (P2)**: Technically independent but extends US1's parameter handling
- **User Story 3 (P3)**: Independent — validates provenance and statelesness

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Foundation (sensor model, math helpers) before tool handler
- Core implementation before result builder wiring
- Story complete before moving to next priority

### Parallel Opportunities

- Phase 1: T001-T005 all [P] — create directories in parallel
- Phase 2: T006 and T009 can run in parallel (different test classes)
- Phase 3 tests: T013-T021 all [P] — write all tests in parallel
- Phase 4 tests: T027-T030 all [P]
- Phase 5 tests: T035-T037 all [P]
- Phase 6 edge cases: T041-T043 all [P]
- Phase 7 evidence: T052-T054 all [P]

---

## Parallel Example: User Story 1

```bash
# Write all US1 tests in parallel:
T013: Test 3 zones generated with default distances
T014: Test zone properties
T015: Test zone ordering
T016: Test zone encloses track
T017: Test concentric containment
T018: Test empty input error
T019: Test no-track error
T020: Test non-track skip
T021: Test single-point track

# Then implement sequentially:
T022: generate_buffer_polygon → T023: @tool handler → T024: validation → T025: result builder
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (5 tasks)
2. Complete Phase 2: Foundation — sensor model + math helpers (7 tasks)
3. Complete Phase 3: User Story 1 — core zone generation (14 tasks)
4. **STOP and VALIDATE**: Run tests, verify 3 zones generated correctly
5. Demo: Show zone generation from a track

### Incremental Delivery

1. Setup + Foundation → Math and sensor model ready
2. Add US1 → Test independently → MVP (core zone generation)
3. Add US2 → Test independently → Custom distances work
4. Add US3 → Test independently → Cascade-ready with provenance
5. Edge cases + tool spec → Production quality
6. Evidence + media + PR → Shipped

### Total Task Summary

| Phase | Tasks | Parallel Opportunities |
|-------|-------|----------------------|
| Phase 1: Setup | 5 | 4 parallel |
| Phase 2: Foundation | 7 | 2 parallel test groups |
| Phase 3: US1 (P1) | 14 | 9 parallel tests |
| Phase 4: US2 (P2) | 8 | 4 parallel tests |
| Phase 5: US3 (P3) | 6 | 3 parallel tests |
| Phase 6: Edge Cases | 8 | 3 parallel tests |
| Phase 7: Polish | 9 | 5 parallel evidence |
| **Total** | **57** | |

---

## Notes

- [P] tasks = different files or test functions, no dependencies
- [US1/US2/US3] label maps task to specific user story
- [test] label indicates test-first task
- Constitution requires tests before merge (Article VI)
- All math uses stdlib `math` module only — no external geo libraries
- Nautical miles converted internally: 1 nm = 1.852 km
- Evidence is required — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
