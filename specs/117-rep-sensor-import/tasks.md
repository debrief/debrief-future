# Tasks: REP Sensor Import

**Input**: Design documents from `/specs/117-rep-sensor-import/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/sensor-parser-api.md

**Tests**: Included -- spec.md Article VI (Testing) requires unit tests for all service code. pytest test suite with fixtures.

**Organization**: Tasks grouped by user story in priority order. US6 (Refactoring) is the prerequisite for all others. US1/US5/US2 are P1, US3/US4 are P2.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. These are used in PR descriptions, documentation, and future blog posts.

**Evidence Directory**: `specs/117-rep-sensor-import/evidence/`
**Media Directory**: `specs/117-rep-sensor-import/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | pytest results with all sensor parser tests | After all tests pass |
| usage-example.md | Python code parsing REP file with sensor lines | After all parsers complete |
| sample-input.rep | REP file with all 4 sensor formats | After test fixtures created |
| parsed-output.json | GeoJSON output showing embedded sensors | After full pipeline works |

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

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the new sensor_parser module, test fixtures, and test file scaffolding

- [ ] T001 Create sensor parser module with dataclass and constants `services/io/src/debrief_io/handlers/sensor_parser.py`
- [ ] T002 [P] Create test fixture with all 4 sensor formats `services/io/tests/fixtures/valid/sensor_all_formats.rep`
- [ ] T003 [P] Create test fixture for edge cases (NULL/NAN bearings, quoted names, 360 bearing, zero range) `services/io/tests/fixtures/valid/sensor_edge_cases.rep`
- [ ] T004 [P] Create sensor parser unit test file with imports and fixture loading `services/io/tests/test_sensor_parser.py`

---

## Phase 2: Foundational - Refactoring & Pipeline Wiring (User Story 6, Priority: P1)

**Goal**: Refactor the REP handler and annotation parser so sensor lines are intercepted before reaching the annotation system, and are routed to the new sensor_parser module. This is the prerequisite for all sensor parsing stories.

**Independent Test**: Parse a REP file with track positions and `;SENSOR:` lines. Verify that (a) zero standalone SENSOR/SENSOR_CONTACT features appear in the output, (b) sensor data appears in `ParseResult.pending_sensor_data`, and (c) the annotation parser no longer processes sensor lines.

### Tests for User Story 6

- [ ] T005 [test] Write test: REP parse produces no standalone SENSOR/SENSOR_CONTACT features `services/io/tests/test_rep_handler.py`
- [ ] T006 [P][test] Write test: sensor lines populate pending_sensor_data on ParseResult `services/io/tests/test_rep_handler.py`
- [ ] T007 [P][test] Write test: orphaned sensor data (track not in file) emits warning and retains data `services/io/tests/test_rep_handler.py`

### Implementation for User Story 6

- [ ] T008 Add `is_sensor_line()` function to sensor_parser module `services/io/src/debrief_io/handlers/sensor_parser.py`
- [ ] T009 Remove SENSOR/SENSOR2 from annotation parser ANNOTATION_PREFIXES `services/io/src/debrief_io/handlers/annotations/parser.py`
- [ ] T010 Modify REP handler parse loop to intercept sensor lines before annotation delegation `services/io/src/debrief_io/handlers/rep.py`
- [ ] T011 Add sensor contact collection and `group_sensor_contacts()` call to REP handler `services/io/src/debrief_io/handlers/rep.py`
- [ ] T012 Wire `pending_sensor_data` into ParseResult and emit ORPHANED_SENSOR warnings `services/io/src/debrief_io/handlers/rep.py`

**Checkpoint**: Sensor lines are intercepted by the REP handler, no standalone sensor features are produced. Pipeline wiring complete. Individual parser functions can now be implemented.

---

## Phase 3: User Story 1 - SENSOR v1 Lines Produce Embedded Sensor Contacts (Priority: P1)

**Goal**: Parse `;SENSOR:` lines extracting timestamp, track name (quoted/unquoted), symbology code, optional DMS coordinates, bearing, range (yards-to-metres), sensor name, and label. Produce SensorContact dicts grouped into SensorData entries embedded in TrackFeature.properties.sensors[].

**Independent Test**: Create a REP file with track positions and `;SENSOR:` lines. Parse it and assert that the NELSON TrackFeature has `properties.sensors` containing one SensorData entry named "TOWED_ARRAY" with correctly structured contacts.

### Tests for User Story 1

- [ ] T013 [test] Write test: parse_sensor_v1 extracts all fields from a valid line `services/io/tests/test_sensor_parser.py`
- [ ] T014 [P][test] Write test: parse_sensor_v1 handles quoted track name `services/io/tests/test_sensor_parser.py`
- [ ] T015 [P][test] Write test: parse_sensor_v1 handles NULL location (origin is None) `services/io/tests/test_sensor_parser.py`
- [ ] T016 [P][test] Write test: parse_sensor_v1 handles explicit DMS location (origin is [lon, lat]) `services/io/tests/test_sensor_parser.py`
- [ ] T017 [P][test] Write test: range conversion from yards to metres (5000 yds -> 4572.0 m) `services/io/tests/test_sensor_parser.py`
- [ ] T018 [P][test] Write test: symbology code @C produces correct CSS hex color `services/io/tests/test_sensor_parser.py`
- [ ] T019 [P][test] Write test: contacts with same sensor name merge into single SensorData entry `services/io/tests/test_sensor_parser.py`
- [ ] T020 [P][test] Write test: contacts within SensorData are ordered by timestamp `services/io/tests/test_sensor_parser.py`

### Implementation for User Story 1

- [ ] T021 Implement `parse_sensor_v1()` function with field extraction per contract `services/io/src/debrief_io/handlers/sensor_parser.py`
- [ ] T022 Implement `group_sensor_contacts()` function to group ParsedSensorContacts into SensorData dicts `services/io/src/debrief_io/handlers/sensor_parser.py`
- [ ] T023 Wire parse_sensor_v1 into REP handler's sensor line interception loop `services/io/src/debrief_io/handlers/rep.py`
- [ ] T024 [test] Write integration test: full REP parse with SENSOR v1 lines produces correct embedded sensors `services/io/tests/test_rep_handler.py`

**Checkpoint**: SENSOR v1 lines are parsed and embedded in TrackFeature.properties.sensors[]. Core pipeline is proven end-to-end.

---

## Phase 4: User Story 5 - NULL and NAN Bearing Values (Priority: P1)

**Goal**: Handle NULL and NAN bearing values by producing contacts with `has_bearing=false` and `bearing=0`, while preserving valid zero bearings (`0.0` -> `has_bearing=true`).

**Independent Test**: Create sensor lines with NULL, NAN, and 0.0 bearing values. Parse them and verify `has_bearing` flags and bearing values.

### Tests for User Story 5

- [ ] T025 [test] Write test: bearing "NULL" produces has_bearing=false, bearing=0 `services/io/tests/test_sensor_parser.py`
- [ ] T026 [P][test] Write test: bearing "NAN" produces has_bearing=false, bearing=0 `services/io/tests/test_sensor_parser.py`
- [ ] T027 [P][test] Write test: bearing 0.0 (true north) produces has_bearing=true, bearing=0.0 `services/io/tests/test_sensor_parser.py`

### Implementation for User Story 5

- [ ] T028 Add NULL/NAN bearing detection and has_bearing flag logic to parse_sensor_v1 `services/io/src/debrief_io/handlers/sensor_parser.py`
- [ ] T029 Add bearing 360 normalisation (360 is valid, equivalent to 0) `services/io/src/debrief_io/handlers/sensor_parser.py`

**Checkpoint**: NULL/NAN bearing values are correctly handled. Frequency-only contacts produce valid SensorContact dicts.

---

## Phase 5: User Story 2 - SENSOR2 Lines with Ambiguous Bearing and Frequency (Priority: P1)

**Goal**: Parse `;SENSOR2:` lines extracting all v1 fields plus ambiguous bearing and frequency. Set `has_ambiguous` and `has_frequency` boolean flags based on whether valid values (non-NULL/NAN) were provided.

**Independent Test**: Create SENSOR2 lines with various combinations of valid and NULL ambiguous bearings and frequencies. Parse and verify correct presence/absence of fields and boolean flags.

### Tests for User Story 2

- [ ] T030 [test] Write test: parse_sensor_v2 extracts ambiguous_bearing and frequency `services/io/tests/test_sensor_parser.py`
- [ ] T031 [P][test] Write test: parse_sensor_v2 with NULL ambiguous bearing sets has_ambiguous=false `services/io/tests/test_sensor_parser.py`
- [ ] T032 [P][test] Write test: parse_sensor_v2 with NULL frequency sets has_frequency=false `services/io/tests/test_sensor_parser.py`
- [ ] T033 [P][test] Write test: multiple SENSOR2 contacts merge into one SensorData entry `services/io/tests/test_sensor_parser.py`

### Implementation for User Story 2

- [ ] T034 Implement `parse_sensor_v2()` function with v2 field extraction per contract `services/io/src/debrief_io/handlers/sensor_parser.py`
- [ ] T035 Wire parse_sensor_v2 into REP handler's sensor line interception loop `services/io/src/debrief_io/handlers/rep.py`
- [ ] T036 [test] Write integration test: SENSOR2 lines produce correct embedded sensor data with boolean flags `services/io/tests/test_rep_handler.py`

**Checkpoint**: SENSOR2 lines produce contacts with ambiguous bearing and frequency data. Boolean flags are correctly set.

---

## Phase 6: User Story 3 - SENSOR3 Lines with Accuracy Fields Gracefully Ignored (Priority: P2)

**Goal**: Parse `;SENSOR3:` lines extracting all v2 fields plus bearing accuracy and frequency accuracy (parsed but not stored). Produce identical SensorContact output to SENSOR2 when accuracy fields are NULL.

**Independent Test**: Create SENSOR3 lines with and without accuracy fields. Parse and verify SENSOR2-equivalent output with no warnings for accuracy fields.

### Tests for User Story 3

- [ ] T037 [test] Write test: parse_sensor_v3 extracts all SENSOR2-equivalent fields correctly `services/io/tests/test_sensor_parser.py`
- [ ] T038 [P][test] Write test: parse_sensor_v3 silently discards bearing accuracy and frequency accuracy `services/io/tests/test_sensor_parser.py`
- [ ] T039 [P][test] Write test: mixed SENSOR/SENSOR2/SENSOR3 lines merge into single SensorData `services/io/tests/test_sensor_parser.py`

### Implementation for User Story 3

- [ ] T040 Implement `parse_sensor_v3()` function with v3 field extraction per contract `services/io/src/debrief_io/handlers/sensor_parser.py`
- [ ] T041 Wire parse_sensor_v3 into REP handler's sensor line interception loop `services/io/src/debrief_io/handlers/rep.py`
- [ ] T042 [test] Write integration test: SENSOR3 lines in mixed-format REP file produce correct output `services/io/tests/test_rep_handler.py`

**Checkpoint**: SENSOR3 lines are parsed without errors. Accuracy fields are silently discarded. All three SENSOR formats can coexist in the same file.

---

## Phase 7: User Story 4 - SENSORARC Lines Produce Coverage Annotations (Priority: P2)

**Goal**: Parse `;SENSORARC` lines into DynamicTrackCoverage annotation features (standalone GeoJSON) with correct track association, time bounds, angular bounds, and range bounds (already in metres).

**Independent Test**: Create SENSORARC lines, parse them, and verify that the output contains DynamicTrackCoverage features (not SensorContacts) with correct properties.

### Tests for User Story 4

- [ ] T043 [test] Write test: parse_sensorarc extracts all fields correctly `services/io/tests/test_sensor_parser.py`
- [ ] T044 [P][test] Write test: SENSORARC produces DynamicTrackCoverage feature, not SensorContact `services/io/tests/test_sensor_parser.py`
- [ ] T045 [P][test] Write test: SENSORARC track_id correctly associates with parent track `services/io/tests/test_sensor_parser.py`

### Implementation for User Story 4

- [ ] T046 Implement `parse_sensorarc()` function returning GeoJSON feature dict `services/io/src/debrief_io/handlers/sensor_parser.py`
- [ ] T047 Wire parse_sensorarc into REP handler and add DynamicTrackCoverage features to output `services/io/src/debrief_io/handlers/rep.py`
- [ ] T048 [test] Write integration test: SENSORARC lines in REP file produce coverage annotations alongside embedded sensors `services/io/tests/test_rep_handler.py`

**Checkpoint**: All four sensor formats are fully parsed. SENSORARC produces standalone annotation features. SENSOR v1/v2/v3 produce embedded sensor data.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Edge case hardening, performance validation, documentation, evidence collection

### Hardening

- [ ] T049 Add malformed line handling with warnings (missing fields, invalid timestamps, empty sensor name) `services/io/src/debrief_io/handlers/sensor_parser.py`
- [ ] T050 [P][test] Write edge case tests: malformed lines, missing fields, bearing=360, zero range, degenerate SENSORARC `services/io/tests/test_sensor_parser.py`
- [ ] T051 [P][test] Write performance test: 10,000-line REP file with mixed sensor formats parses in under 1 second (SC-008) `services/io/tests/test_sensor_parser.py`
- [ ] T052 Add provenance recording (source file + line number) to parsed sensor contacts `services/io/src/debrief_io/handlers/sensor_parser.py`
- [ ] T053 Run quickstart.md validation against implementation `specs/117-rep-sensor-import/quickstart.md`

### Evidence Collection

- [ ] T054 Capture test results using template (.specify/templates/evidence/test-summary-template.md) `specs/117-rep-sensor-import/evidence/test-summary.md`
- [ ] T055 Create usage demonstration `specs/117-rep-sensor-import/evidence/usage-example.md`
- [ ] T056 [P] Capture sample input REP file `specs/117-rep-sensor-import/evidence/sample-input.rep`
- [ ] T057 [P] Capture parsed output JSON showing embedded sensors `specs/117-rep-sensor-import/evidence/parsed-output.json`

### Media Content

- [ ] T058 Create shipped blog post `specs/117-rep-sensor-import/media/shipped-post.md`
- [ ] T059 [P] Create LinkedIn shipped summary `specs/117-rep-sensor-import/media/linkedin-shipped.md`

### PR Creation

- [ ] T060 Create PR and publish blog: run /speckit.pr

**Task T060 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies -- can start immediately
- **Phase 2 (Foundational / US6)**: Depends on Phase 1 -- BLOCKS all user stories
- **Phase 3 (US1 - SENSOR v1)**: Depends on Phase 2 -- establishes parsing foundation
- **Phase 4 (US5 - NULL/NAN bearings)**: Depends on Phase 3 -- extends v1 parser
- **Phase 5 (US2 - SENSOR2)**: Depends on Phase 3 -- extends v1 pattern
- **Phase 6 (US3 - SENSOR3)**: Depends on Phase 5 -- extends v2 parser
- **Phase 7 (US4 - SENSORARC)**: Depends on Phase 2 only -- independent of v1/v2/v3 parsers
- **Phase 8 (Polish)**: Depends on all story phases being complete

### User Story Dependencies

- **US6 (Refactoring, P1)**: Foundation -- must complete first. Blocks all others.
- **US1 (SENSOR v1, P1)**: Depends on US6. Establishes core parsing pattern.
- **US5 (NULL/NAN bearings, P1)**: Depends on US1. Adds sentinel handling to v1 parser.
- **US2 (SENSOR2, P1)**: Depends on US1. Can run in parallel with US5.
- **US3 (SENSOR3, P2)**: Depends on US2. Extends v2 parser with accuracy skip.
- **US4 (SENSORARC, P2)**: Depends on US6 only. Can run in parallel with US1/US2/US3/US5.

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Parser function before REP handler wiring
- Unit tests before integration tests

### Parallel Opportunities

- Phase 1: T002, T003, T004 can run in parallel (different files)
- Phase 2: T006, T007 can run in parallel (same-file but independent test functions)
- Phase 3: T014-T020 can all run in parallel (independent test cases in same file)
- Phase 4 (US5) and Phase 7 (US4) can run in parallel after Phase 2/3 respectively
- Phase 5 (US2) and Phase 4 (US5) can run in parallel after Phase 3
- Phase 8: Evidence tasks T056, T057 can run in parallel; T059 can run in parallel with T058

---

## Parallel Example: User Story 1 (Phase 3)

```bash
# Launch all unit tests for SENSOR v1 together:
Task T013: "parse_sensor_v1 extracts all fields"
Task T014: "parse_sensor_v1 handles quoted track name"
Task T015: "parse_sensor_v1 handles NULL location"
Task T016: "parse_sensor_v1 handles explicit DMS location"
Task T017: "range conversion yards to metres"
Task T018: "symbology code produces CSS hex color"
Task T019: "contacts with same sensor name merge"
Task T020: "contacts ordered by timestamp"

# Then implement (sequential):
Task T021: "Implement parse_sensor_v1()"
Task T022: "Implement group_sensor_contacts()"
Task T023: "Wire into REP handler"
Task T024: "Integration test: full REP parse"
```

---

## Implementation Strategy

### Incremental Delivery

1. Complete Setup + Foundational (US6) -> Sensor lines intercepted, no standalone features
2. Add US1 (SENSOR v1) -> Core parsing pipeline proven end-to-end
3. Add US5 (NULL/NAN bearings) -> Frequency-only contacts handled
4. Add US2 (SENSOR2) -> Ambiguous bearing and frequency support
5. Add US3 (SENSOR3) -> All three contact formats supported
6. Add US4 (SENSORARC) -> Coverage annotations complete
7. Polish phase -> Edge cases, performance, evidence, PR
8. Each story adds value without breaking previous stories

### File Change Summary

| File | Action | Stories |
|------|--------|---------|
| `services/io/src/debrief_io/handlers/sensor_parser.py` | NEW | All |
| `services/io/src/debrief_io/handlers/rep.py` | MODIFIED | US6, US1, US2, US3, US4 |
| `services/io/src/debrief_io/handlers/annotations/parser.py` | MODIFIED | US6 |
| `services/io/tests/test_sensor_parser.py` | NEW | All |
| `services/io/tests/test_rep_handler.py` | MODIFIED | US6, US1, US2, US3, US4 |
| `services/io/tests/fixtures/valid/sensor_all_formats.rep` | NEW | Setup |
| `services/io/tests/fixtures/valid/sensor_edge_cases.rep` | NEW | Setup |

---

## Notes

- [P] tasks = different files or independent test functions, no dependencies
- Feature type: Parser/Converter -- no UI components, no Storybook, no Playwright
- All range values from SENSOR v1/v2/v3 lines are in yards (converted to metres at parse time)
- SENSORARC range values are already in metres (no conversion needed)
- Boolean presence flags (has_bearing, has_ambiguous, has_frequency) are output-only -- not stored in intermediate ParsedSensorContact for has_bearing=true cases (only explicitly set when false)
- The `build_sensor`/`build_sensor2` functions in builders.py are retained for backward compatibility but no longer invoked from the REP parsing path
- Evidence is required -- capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
