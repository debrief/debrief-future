# Tasks: Compound Track Model with Embedded Children

**Input**: Design documents from `/specs/062-missing-feature-kind-enum-values/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/schema-changes.md

**Tests**: Golden fixture tests are REQUIRED by the constitution (Article VI, VII). Fixtures are written FIRST, before schema changes.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

**Evidence Directory**: `specs/062-missing-feature-kind-enum-values/evidence/`
**Media Directory**: `specs/062-missing-feature-kind-enum-values/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | pytest + AJV + tsc results with pass/fail counts | After all tests pass |
| usage-example.md | Python code creating and validating compound TrackFeature | After schema works |
| valid-fixture-samples.json | Annotated compound track fixture showing all embedded children | After fixtures created |
| schema-diff.md | Before/after comparison of TrackFeature schema | After regeneration |

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

**Purpose**: Verify baseline and prepare fixture directories

- [ ] T001 Verify existing schema tests pass: `cd shared/schemas && make test` `shared/schemas/`
- [ ] T002 Create valid fixture directory if needed `shared/schemas/src/fixtures/valid/`
- [ ] T003 [P] Create invalid fixture directory if needed `shared/schemas/src/fixtures/invalid/`
- [ ] T004 [P] Create evidence directory `specs/062-missing-feature-kind-enum-values/evidence/`

---

## Phase 2: Foundation (Blocking Prerequisites)

**Purpose**: New enum and geometry types that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Add SegmentTypeEnum (TRACK, ABSOLUTE_TMA, RELATIVE_TMA, DYNAMIC_INFILL) to common.yaml `shared/schemas/src/linkml/common.yaml`
- [ ] T006 Add GeoJSONMultiLineString class to geojson.yaml `shared/schemas/src/linkml/geojson.yaml`
- [ ] T007 Verify existing tests still pass after foundation changes: `cd shared/schemas && make test`

**Checkpoint**: Foundation ready — SegmentTypeEnum and MultiLineString geometry available for all stories

---

## Phase 3: User Story 1 — Compound Track Geometry (Priority: P1) MVP

**Goal**: TrackFeature supports both LineString (simple) and MultiLineString (compound) geometry with per-segment metadata

**Independent Test**: Create TrackFeature instances with MultiLineString geometry and segments array; validate against generated Pydantic models

### Golden Fixtures for US1 (write FIRST, must FAIL before schema changes)

- [ ] T008 Write valid compound track fixture with MultiLineString and 3 mixed segments `shared/schemas/src/fixtures/valid/track-feature-compound-01.json`
- [ ] T009 [P] Write invalid fixture: segment count != coordinate count `shared/schemas/src/fixtures/invalid/track-feature-segment-mismatch.json`
- [ ] T010 [P] Write invalid fixture: segments array present with LineString geometry `shared/schemas/src/fixtures/invalid/track-feature-segments-linestring.json`

### Implementation for US1

- [ ] T011 Add SegmentMetadata class with required fields (segment_type, start_time, end_time, positions) and optional fields (name, style, TMA-specific, RELATIVE_TMA-specific, DYNAMIC_INFILL-specific) `shared/schemas/src/linkml/geojson.yaml`
- [ ] T012 Modify TrackFeature.geometry to accept LineString OR MultiLineString via any_of union `shared/schemas/src/linkml/geojson.yaml`
- [ ] T013 Add optional segments array to TrackProperties `shared/schemas/src/linkml/geojson.yaml`
- [ ] T014 Regenerate derived schemas: `cd shared/schemas && make generate`
- [ ] T015 Update test_golden.py model mapping for new compound track fixtures `shared/schemas/tests/test_golden.py`
- [ ] T016 Run full test suite and verify compound track fixtures pass: `cd shared/schemas && make test`

**Checkpoint**: Compound track geometry works — simple LineString tracks backward compatible, MultiLineString tracks with segments validate

---

## Phase 4: User Story 2 — Embedded Sensor Data (Priority: P1)

**Goal**: TrackProperties supports embedded sensors array with contacts

**Independent Test**: Create TrackFeature with sensors array containing contacts; validate sensor name required, contact bearing required

### Golden Fixtures for US2 (write FIRST)

- [ ] T017 Write valid track-with-sensors fixture (1 sensor, 5 contacts with bearing, optional frequency/range) `shared/schemas/src/fixtures/valid/track-feature-sensors-01.json`
- [ ] T018 [P] Write invalid fixture: sensor contact missing required bearing `shared/schemas/src/fixtures/invalid/track-feature-sensor-no-bearing.json`

### Implementation for US2

- [ ] T019 Add SensorContact class (time, bearing required; range, frequency, ambiguous_bearing, label, comment optional) `shared/schemas/src/linkml/geojson.yaml`
- [ ] T020 Add SensorData class (name required; base_frequency, offset, worm_in_hole optional; contacts array) `shared/schemas/src/linkml/geojson.yaml`
- [ ] T021 Add optional sensors array to TrackProperties `shared/schemas/src/linkml/geojson.yaml`
- [ ] T022 Regenerate derived schemas: `cd shared/schemas && make generate`
- [ ] T023 Update test_golden.py for sensor fixtures and run tests: `cd shared/schemas && make test`

**Checkpoint**: Sensor data embeds in tracks — contacts validate with bearing required, sensor name required

---

## Phase 5: User Story 3 — Embedded TUA Data (Priority: P2)

**Goal**: TrackProperties supports embedded TUAs array with solutions (absolute or relative positioning)

**Independent Test**: Create TrackFeature with tuas array containing solutions; validate both absolute and relative positioning modes

### Golden Fixtures for US3 (write FIRST)

- [ ] T024 Write valid track-with-TUAs fixture (absolute and relative solutions, ellipse properties) `shared/schemas/src/fixtures/valid/track-feature-tuas-01.json`
- [ ] T025 [P] Write valid full compound track fixture (segments + sensors + TUAs combined) `shared/schemas/src/fixtures/valid/track-feature-full-01.json`

### Implementation for US3

- [ ] T026 Add TUASolution class (time, label required; absolute/relative positioning optional; ellipse optional; kinematics optional) `shared/schemas/src/linkml/geojson.yaml`
- [ ] T027 Add TUAData class (name, host_track_name required; solutions array) `shared/schemas/src/linkml/geojson.yaml`
- [ ] T028 Add optional tuas array to TrackProperties `shared/schemas/src/linkml/geojson.yaml`
- [ ] T029 Regenerate derived schemas: `cd shared/schemas && make generate`
- [ ] T030 Update test_golden.py for TUA fixtures and run tests: `cd shared/schemas && make test`

**Checkpoint**: TUA data embeds in tracks — both absolute and relative positioning accepted, ellipse parameters optional

---

## Phase 6: User Story 4 — Hierarchical Tool Selection (Priority: P2)

**Goal**: SelectionRequirement.kind accepts dot-delimited hierarchical paths (TRACK.SENSOR, TRACK.SEGMENT)

**Independent Test**: Define tool with hierarchical kind requirement; verify matching logic accepts dot paths and maintains backward compatibility with flat kinds

### Implementation for US4

- [ ] T031 Update SelectionRequirement.kind description in tool.yaml to document hierarchical path support `shared/schemas/src/linkml/tool.yaml`
- [ ] T032 Add optional segment_type filter field to SelectionRequirement `shared/schemas/src/linkml/tool.yaml`
- [ ] T033 Regenerate derived schemas: `cd shared/schemas && make generate`
- [ ] T034 Add schema comparison assertion for hierarchical kind path support `shared/schemas/tests/test_schema_compare.py`
- [ ] T035 Run full test suite: `cd shared/schemas && make test`

**Checkpoint**: Tool selection schema supports hierarchical paths while flat kinds remain unchanged

---

## Phase 7: User Story 5 — Schema Adherence (Priority: P1)

**Goal**: All three schema adherence test strategies pass: golden fixtures, round-trip, structural comparison

**Independent Test**: Run full test suite — all existing and new fixtures pass, TypeScript compiles, JSON Schema validates

### Full Verification

- [ ] T036 Run golden fixture tests (all valid pass, all invalid rejected): `cd shared/schemas && uv run pytest tests/test_golden.py -v`
- [ ] T037 [P] Run round-trip tests: `cd shared/schemas && uv run pytest tests/test_roundtrip.py -v`
- [ ] T038 [P] Run schema comparison tests: `cd shared/schemas && uv run pytest tests/test_schema_compare.py -v`
- [ ] T039 Run JSON Schema validation via AJV: `cd shared/schemas && pnpm exec node tests/validate-jsonschema.js`
- [ ] T040 Verify TypeScript compilation: `cd shared/schemas && pnpm exec tsc --noEmit`
- [ ] T041 Verify backward compatibility: confirm all pre-existing track fixtures still pass unchanged

**Checkpoint**: All schema adherence tests green — ready for polish

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Evidence collection, media content, and PR creation

### Evidence Collection (REQUIRED)

- [ ] T042 Capture test summary with pass/fail/coverage counts `specs/062-missing-feature-kind-enum-values/evidence/test-summary.md`
- [ ] T043 Create usage example: Python code creating and validating a compound TrackFeature with sensors and TUAs `specs/062-missing-feature-kind-enum-values/evidence/usage-example.md`
- [ ] T044 [P] Capture schema diff showing before/after TrackFeature changes `specs/062-missing-feature-kind-enum-values/evidence/schema-diff.md`
- [ ] T045 [P] Save annotated full compound track fixture as evidence `specs/062-missing-feature-kind-enum-values/evidence/valid-fixture-samples.json`

### Media Content

- [ ] T046 Create shipped blog post `specs/062-missing-feature-kind-enum-values/media/shipped-post.md`
- [ ] T047 [P] Create LinkedIn shipped summary `specs/062-missing-feature-kind-enum-values/media/linkedin-shipped.md`

### PR Creation

- [ ] T048 Create PR and publish blog: run /speckit.pr

**Task T048 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundation (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 Compound Track (Phase 3)**: Depends on Foundation — MVP target
- **US2 Sensors (Phase 4)**: Depends on Foundation; independent of US1
- **US3 TUAs (Phase 5)**: Depends on Foundation; independent of US1/US2
- **US4 Hierarchical Selection (Phase 6)**: Depends on Foundation; independent of US1-US3
- **US5 Schema Adherence (Phase 7)**: Depends on ALL schema changes (Phase 3-6) being complete
- **Polish (Phase 8)**: Depends on Phase 7

### User Story Dependencies

- **US1 (P1 MVP)**: Start after Foundation — no dependencies on other stories
- **US2 (P1)**: Start after Foundation — can run in parallel with US1
- **US3 (P2)**: Start after Foundation — can run in parallel with US1/US2
- **US4 (P2)**: Start after Foundation — can run in parallel with US1-US3
- **US5 (P1)**: MUST wait for US1-US4 to complete — final verification gate

### Within Each User Story

- Golden fixtures MUST be written FIRST (test-driven per Article VII)
- Schema classes before schema modifications
- Regeneration after each set of changes
- Tests run after regeneration

### Parallel Opportunities

- T002/T003/T004: Setup tasks run in parallel
- T008/T009/T010: All US1 fixtures in parallel
- T017/T018: US2 fixtures in parallel
- T024/T025: US3 fixtures in parallel
- T036/T037/T038: All verification tests in parallel
- T042-T045: Evidence collection tasks in parallel
- US1/US2/US3/US4 can run in parallel after Foundation (if team capacity allows)

---

## Parallel Example: User Story 1

```bash
# Launch all golden fixtures in parallel:
Task: "Write valid compound track fixture" (T008)
Task: "Write invalid segment mismatch fixture" (T009)
Task: "Write invalid segments+linestring fixture" (T010)

# Then sequential schema changes:
Task: "Add SegmentMetadata" (T011) → "Modify geometry union" (T012) → "Add segments to TrackProperties" (T013)

# Then regenerate and test:
Task: "Regenerate" (T014) → "Update test mapping" (T015) → "Run tests" (T016)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundation (SegmentTypeEnum + MultiLineString)
3. Complete Phase 3: User Story 1 — Compound Track Geometry
4. **STOP and VALIDATE**: Run `make test` — compound tracks work, existing tracks unchanged
5. This alone unblocks track analysis tools that need multi-segment support

### Incremental Delivery

1. Setup + Foundation → Base types ready
2. Add US1 (Compound Track) → Multi-segment tracks work (MVP!)
3. Add US2 (Sensors) → Sensor analysis tools unblocked
4. Add US3 (TUAs) → TUA analysis tools unblocked
5. Add US4 (Hierarchical Selection) → Tools can target embedded children
6. Run US5 (Full Adherence) → All tests green
7. Polish → Evidence, media, PR
8. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- Golden fixtures come FIRST (Article VII: tests before implementation)
- Regenerate after each phase to catch errors early
- Commit after each task or logical group
- Stop at any checkpoint to validate independently
- **Evidence is required** — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
