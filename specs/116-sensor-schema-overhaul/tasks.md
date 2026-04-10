# Tasks: Sensor Schema Overhaul

**Input**: Design documents from `/specs/116-sensor-schema-overhaul/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: This feature requires schema tests (golden fixtures, round-trip tests) per Constitution Art. II and VI. Test tasks are included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. These are used in PR descriptions, documentation, and future blog posts.

**Evidence Directory**: `specs/116-sensor-schema-overhaul/evidence/`
**Media Directory**: `specs/116-sensor-schema-overhaul/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | pytest results for schema tests (golden fixtures, round-trip, validation, schema comparison, enum exhaustiveness) | After all tests pass |
| usage-example.md | Python code creating SensorData with all new fields, serializing to JSON | After schema generation works |
| round-trip-evidence.md | Full Python -> JSON -> TypeScript -> JSON -> Python proof for comprehensive sensor fixture (both Python and TypeScript legs) | After round-trip tests pass |

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

**Purpose**: Add new enumerations and the MeasuredArrayPosition class that all user stories depend on.

- [x] T001 Add ArrayCentreModeEnum to LinkML enums `shared/schemas/src/linkml/common.yaml`
- [x] T002 [P] Add LineStyleEnum to LinkML enums `shared/schemas/src/linkml/common.yaml`
- [x] T003 [P] Add LabelLocationEnum to LinkML enums `shared/schemas/src/linkml/common.yaml`
- [x] T004 [P] Add LineLabelPositionEnum to LinkML enums `shared/schemas/src/linkml/common.yaml`
- [x] T005 Add MeasuredArrayPosition class to LinkML schema `shared/schemas/src/linkml/geojson.yaml`

---

## Phase 2: Foundation — Schema Expansion (Blocking Prerequisites)

**Purpose**: Expand SensorContact and SensorData with all new fields. MUST be complete before any user story can be tested.

**CRITICAL**: No fixture or test work can begin until this phase is complete.

### SensorContact Schema Expansion

- [x] T006 Add boolean presence flags (has_bearing, has_ambiguous, has_frequency) to SensorContact `shared/schemas/src/linkml/geojson.yaml`
- [x] T007 [P] Add display properties (color, visible, show_label) to SensorContact `shared/schemas/src/linkml/geojson.yaml`
- [x] T008 [P] Add enum-typed display properties (line_style, label_location, put_label_at) to SensorContact `shared/schemas/src/linkml/geojson.yaml`
- [x] T009 [P] Add origin coordinate pair field to SensorContact `shared/schemas/src/linkml/geojson.yaml`

### SensorData Schema Expansion

- [x] T010 Add array_centre_mode enum field to SensorData `shared/schemas/src/linkml/geojson.yaml`
- [x] T011 [P] Add display properties (color, visible, line_thickness) to SensorData `shared/schemas/src/linkml/geojson.yaml`
- [x] T012 [P] Add measured_positions array field to SensorData `shared/schemas/src/linkml/geojson.yaml`

### Schema Generation

- [x] T013 Run schema generation pipeline and verify output `shared/schemas/scripts/generate.py`
- [x] T014 Verify generated Pydantic models have all new fields `shared/schemas/src/generated/python/debrief_schemas/__init__.py`
- [x] T015 [P] Verify generated TypeScript interfaces have all new fields `shared/schemas/src/generated/typescript/types.ts`
- [x] T016 [P] Verify generated JSON Schema has all new fields `shared/schemas/src/generated/json-schema/`

### Generation Verification (Review Decision #2)

- [x] T058 [test] Verify generated code handles optional float[2] coordinate pairs correctly (MeasuredArrayPosition.location, SensorContact.origin) `shared/schemas/tests/test_schema_compare.py`

**Checkpoint**: Schema expanded and all generated code reflects new fields. Fixture and test work can now begin.

---

## Phase 3: User Story 1 — Full-fidelity sensor data round-trips (Priority: P1)

**Goal**: Verify that all sensor fields (including new display properties, presence flags, origin, measured positions) survive Python-JSON-TypeScript-JSON-Python round trips with zero data loss.

**Independent Test**: Create a comprehensive fixture with all fields populated, run it through the round-trip pipeline, and assert field-level equality at each stage.

### Tests for User Story 1

- [x] T017 [test] [US1] Create comprehensive valid fixture with ALL new SensorContact and SensorData fields `shared/schemas/src/fixtures/valid/track-feature-sensors-02.json`
- [x] T018 [P][test] [US1] Create minimal valid fixture with only required fields (time, bearing, name, contacts) `shared/schemas/src/fixtures/valid/track-feature-sensors-minimal-01.json`
- [x] T019 [US1] Run golden fixture validation tests to confirm both fixtures pass `shared/schemas/tests/test_golden.py`
- [x] T020 [US1] Run round-trip tests to confirm comprehensive fixture survives Python-JSON-Python cycle `shared/schemas/tests/test_roundtrip.py`
- [x] T021 [US1] Verify existing track-feature-sensors-01.json still validates (backward compatibility) `shared/schemas/src/fixtures/valid/track-feature-sensors-01.json`

### Implementation for User Story 1

- [x] T022 [US1] Verify optional fields default correctly in Pydantic model (visible=true, has_bearing=true, show_label=false)
- [x] T023 [US1] Verify TypeScript interface accepts both comprehensive and minimal fixtures

### TypeScript Round-Trip (Review Decision #8)

- [x] T059 [test] [US1] Add vitest TypeScript round-trip test: JSON → TS deserialize → TS serialize → JSON for sensor fixtures `shared/schemas/tests/ts/test_sensor_roundtrip.test.ts`

**Checkpoint**: Round-trip fidelity proven for all sensor fields in both Python and TypeScript. Backward compatibility confirmed.

---

## Phase 4: User Story 2 — Display properties persist across save/load (Priority: P1)

**Goal**: Verify that display properties (color, line_style, label_location, put_label_at, visible, show_label, line_thickness) persist when sensor data is saved to a STAC Item and reloaded.

**Independent Test**: Set display properties on SensorData and SensorContact, serialize to JSON, deserialize back, and verify all display values match.

### Tests for User Story 2

- [x] T024 [test] [US2] Verify comprehensive fixture (T017) includes display properties at both SensorData and SensorContact levels `shared/schemas/src/fixtures/valid/track-feature-sensors-02.json`
- [x] T025 [test] [US2] Verify contact with null color serializes correctly (inheritance case) — covered by minimal fixture

### Implementation for User Story 2

- [x] T026 [US2] Verify Pydantic serialization preserves color, line_style, label_location, put_label_at, visible, show_label for SensorContact
- [x] T027 [US2] Verify Pydantic serialization preserves color, visible, line_thickness for SensorData

**Checkpoint**: Display properties round-trip correctly. Color inheritance (null contact color → inherit from sensor) is schema-compatible.

---

## Phase 5: User Story 3 — Array centre modes captured in schema (Priority: P1)

**Goal**: Verify that array_centre_mode (PLAIN, WORM, MEASURED) and measured_positions are correctly captured, validated, and round-tripped.

**Independent Test**: Create fixtures with each array_centre_mode value, validate them, and verify MEASURED mode with measured_positions round-trips correctly.

### Tests for User Story 3

- [x] T028 [test] [US3] Create valid fixture with MEASURED mode and measured_positions array `shared/schemas/src/fixtures/valid/track-feature-sensors-measured-01.json`
- [x] T029 [test] [US3] Run golden fixture validation for measured positions fixture `shared/schemas/tests/test_golden.py`
- [x] T030 [test] [US3] Run round-trip test for measured positions fixture `shared/schemas/tests/test_roundtrip.py`

### Implementation for User Story 3

- [x] T031 [US3] Verify PLAIN mode with no measured_positions validates correctly (covered by comprehensive fixture T017)
- [x] T032 [US3] Verify MEASURED mode with empty measured_positions array validates correctly
- [x] T033 [US3] Verify MeasuredArrayPosition fields (time, location as float[2] [lon, lat]) are all required and typed correctly

**Checkpoint**: All three array centre modes validate. MEASURED mode with position time-series round-trips correctly.

---

## Phase 6: User Story 4 — Tool spec fixtures updated (Priority: P2)

**Goal**: Update all 9 sensor tool spec golden example fixtures to reference the new SensorContact and SensorData shapes, ensuring tool implementers build against the correct schema contract.

**Independent Test**: Run fixture validation suite against all sensor tool golden examples and verify zero validation errors.

### Implementation for User Story 4

- [x] T034 [US4] Update doppler-curve fixtures (basic, complex, edge-1, edge-2 input/output) `shared/tools/sensor/analysis/doppler-curve.*.json`
- [x] T035 [P] [US4] Update generate-new-sensor-contact fixtures (basic input/output) `shared/tools/sensor/analysis/generate-new-sensor-contact.*.json`
- [x] T036 [P] [US4] Update generate-sensor-range-plot fixtures (basic, complex, edge-1, edge-2 input/output) `shared/tools/sensor/analysis/generate-sensor-range-plot.*.json`
- [x] T037 [P] [US4] Update inflection-point-detector fixtures (basic, complex, edge-1, edge-2 input/output) `shared/tools/sensor/analysis/inflection-point-detector.*.json`
- [x] T038 [P] [US4] Update insert-sensor-arc fixtures (basic, complex, edge input/output) `shared/tools/sensor/analysis/insert-sensor-arc.*.json`
- [x] T039 [P] [US4] Update merge-contacts fixtures (basic, complex, edge input/output) `shared/tools/sensor/analysis/merge-contacts.*.json`
- [x] T040 [P] [US4] Update ambiguity-resolver fixtures (basic, complex, edge-1, edge-2 input/output) `shared/tools/sensor/calibration/ambiguity-resolver.*.json`
- [x] T041 [P] [US4] Update delete-ambiguous-bearings fixtures (basic, complex, edge input/output) `shared/tools/sensor/calibration/delete-ambiguous-bearings.*.json`
- [x] T042 [P] [US4] Update resolve-ambiguity fixtures (basic, complex, edge-1, edge-2 input/output) `shared/tools/sensor/calibration/resolve-ambiguity.*.json`
- [x] T043 [US4] Validate all updated tool fixtures pass schema validation

### Tool Fixture Schema Validation Test (Review Decision #7)

- [x] T060 [test] [US4] Add pytest parametrized test validating all tool fixture JSON files against SensorData/SensorContact Pydantic models `shared/schemas/tests/test_tool_fixtures.py`

**Checkpoint**: All 62 tool fixture files updated and validated against new schema. Automated test prevents future fixture drift.

---

## Phase 7: User Story 5 — Golden fixtures validate schema correctness (Priority: P2)

**Goal**: Create invalid golden fixtures that catch schema regressions for new fields and enums. Verify that the validation safety net is comprehensive.

**Independent Test**: Run fixture validation suite against all golden fixtures. Valid fixtures pass, invalid fixtures fail with expected errors.

### Tests for User Story 5

- [x] T044 [test] [US5] Create invalid fixture: out-of-range enum value (array_centre_mode="INVALID") `shared/schemas/src/fixtures/invalid/track-feature-sensor-invalid-enum.json`
- [x] T045 [P][test] [US5] Create invalid fixture: origin with wrong cardinality (3 elements) `shared/schemas/src/fixtures/invalid/track-feature-sensor-invalid-origin.json`
- [x] T046 [P][test] [US5] Create invalid fixture: bearing outside 0-360 range `shared/schemas/src/fixtures/invalid/track-feature-sensor-bearing-range.json`

### Constraint Edge-Case Fixtures (Review Decision #11)

- [x] T063 [test] [US5] Create valid boundary fixture: bearing=0 and bearing=360, empty measured_positions array `shared/schemas/src/fixtures/valid/track-feature-sensors-boundary-01.json`
- [x] T064 [P][test] [US5] Create invalid fixture: bearing=-1 `shared/schemas/src/fixtures/invalid/track-feature-sensor-bearing-negative.json`
- [x] T065 [P][test] [US5] Create invalid fixture: bearing=361 `shared/schemas/src/fixtures/invalid/track-feature-sensor-bearing-over360.json`
- [x] T066 [P][test] [US5] Create invalid fixture: origin with 1 element `shared/schemas/src/fixtures/invalid/track-feature-sensor-origin-wrong-length.json`

### Schema Comparison Extension (Review Decision #9)

- [x] T061 [test] [US5] Extend test_schema_compare.py to cover SensorData, SensorContact, and 4 new enums `shared/schemas/tests/test_schema_compare.py`

### Enum Exhaustiveness Test (Review Decision #10)

- [x] T062 [test] [US5] Add parametrized test validating every value of ArrayCentreModeEnum, LineStyleEnum, LabelLocationEnum, LineLabelPositionEnum `shared/schemas/tests/test_sensor_enums.py`

### Implementation for User Story 5

- [x] T047 [US5] Run golden fixture validation: all invalid fixtures (including new boundary cases) fail with clear error messages `shared/schemas/tests/test_golden.py`
- [x] T048 [US5] Verify existing invalid fixture (track-feature-sensor-no-bearing.json) still fails correctly `shared/schemas/src/fixtures/invalid/track-feature-sensor-no-bearing.json`

**Checkpoint**: Schema safety net is comprehensive. Invalid data is caught with useful error messages. Existing invalid fixtures still work. All enum values validated. Schema comparison covers sensor entities.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, evidence collection, media content, and PR creation.

### Verification

- [x] T049 Run full schema test suite: `uv run pytest shared/schemas/tests/`
- [x] T050 Run full CI verification: `task verify`
- [x] T051 Verify quickstart.md checklist items all pass `specs/116-sensor-schema-overhaul/quickstart.md`

### Evidence Collection

- [x] T052 Capture test results using template (.specify/templates/evidence/test-summary-template.md) `specs/116-sensor-schema-overhaul/evidence/test-summary.md`
- [x] T053 Create usage demonstration `specs/116-sensor-schema-overhaul/evidence/usage-example.md`
- [x] T054 [P] Capture round-trip proof (Python -> JSON -> TypeScript -> JSON -> Python) `specs/116-sensor-schema-overhaul/evidence/round-trip-evidence.md`

### Media Content

- [x] T055 Create shipped blog post `specs/116-sensor-schema-overhaul/media/shipped-post.md`
- [x] T056 [P] Create LinkedIn shipped summary `specs/116-sensor-schema-overhaul/media/linkedin-shipped.md`

### PR Creation

- [x] T057 Create PR and publish blog: run /speckit.pr

**Task T057 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundation (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US1-US3 (Phases 3-5)**: All depend on Foundation phase. US1-US3 are all P1 priority and can run in parallel but have a natural sequencing (US1 creates the comprehensive fixture that US2 and US3 rely on for verification)
- **US4-US5 (Phases 6-7)**: Depend on Foundation. US4 (tool fixtures) and US5 (invalid fixtures) can run in parallel with each other and with US1-US3
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Phase 2 only. Creates the comprehensive valid fixture used by other stories.
- **User Story 2 (P1)**: Depends on Phase 2. Verifies display properties in fixtures created by US1 — can run after US1 or in parallel if using its own fixture sections.
- **User Story 3 (P1)**: Depends on Phase 2. Creates its own MEASURED mode fixture — can run in parallel with US1 and US2.
- **User Story 4 (P2)**: Depends on Phase 2. Independent of US1-US3 — modifies tool fixtures, not schema fixtures.
- **User Story 5 (P2)**: Depends on Phase 2. Independent of US1-US4 — creates invalid fixtures only.

### Within Each User Story

- Test fixtures created before validation tests run
- Schema generation (Phase 2) must complete before any fixture validation
- Fixtures with [P] can be created in parallel

### Parallel Opportunities

- Phase 1: T001-T004 (enum additions) can all run in parallel
- Phase 2: T007-T009 (SensorContact display props) can all run in parallel; T010-T012 (SensorData fields) in parallel
- Phase 3: T017-T018 (valid fixture creation) in parallel; T059 (TS round-trip) after fixtures exist
- Phase 6: T035-T042 (tool fixture updates) can ALL run in parallel (different files); T060 after all fixtures updated
- Phase 7: T044-T046, T063-T066 (fixture creation) can all run in parallel; T061-T062 (test additions) in parallel

---

## Parallel Example: Phase 6 (Tool Fixture Updates)

```bash
# All tool fixture updates can run simultaneously (different files):
Task: T035 "Update generate-new-sensor-contact fixtures"
Task: T036 "Update generate-sensor-range-plot fixtures"
Task: T037 "Update inflection-point-detector fixtures"
Task: T038 "Update insert-sensor-arc fixtures"
Task: T039 "Update merge-contacts fixtures"
Task: T040 "Update ambiguity-resolver fixtures"
Task: T041 "Update delete-ambiguous-bearings fixtures"
Task: T042 "Update resolve-ambiguity fixtures"
```

---

## Implementation Strategy

### Incremental Delivery

1. Complete Setup + Foundation (Phases 1-2) → Schema expanded, generated code ready
2. Add US1 fixtures (Phase 3) → Round-trip fidelity proven
3. Add US2 verification (Phase 4) → Display property persistence confirmed
4. Add US3 fixtures (Phase 5) → Array centre modes validated
5. Update tool fixtures (Phase 6) → All tool contracts aligned
6. Add invalid fixtures (Phase 7) → Safety net complete
7. Polish + Evidence + PR (Phase 8) → Feature shipped

### Key Risk Mitigations

- **Schema generation failure**: Run `generate.py` early (T013) to catch LinkML issues before creating fixtures
- **Backward compatibility**: Verify existing fixture (T021) immediately after generation
- **Tool fixture drift**: Validate all tool fixtures (T043, T060) as a batch after updates
- **Type drift**: TypeScript round-trip (T059) and schema comparison (T061) catch cross-language divergence early

---

## Notes

- [P] tasks = different files, no dependencies
- [US*] label maps task to specific user story for traceability
- [test] label identifies fixture/test creation tasks
- All schema changes go through LinkML → generated code pipeline (never hand-edit generated files)
- Commit after each phase or logical group
- The comprehensive fixture (T017) is the cornerstone — it exercises all new fields and is reused by multiple test categories
- Evidence is required — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
