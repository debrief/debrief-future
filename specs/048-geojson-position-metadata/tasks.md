# Tasks: GeoJSON Position Metadata Strategy

**Input**: Design documents from `/specs/048-geojson-position-metadata/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Feature Type**: Schema/Data Model + Map Rendering
**Tests**: Schema tests (golden fixtures, round-trip) are required per Constitution

---

## Evidence Requirements

**Evidence Directory**: `specs/048-geojson-position-metadata/evidence/`
**Media Directory**: `specs/048-geojson-position-metadata/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | pytest + TypeScript test results | After all tests pass |
| usage-example.md | JSON example with position styling | After schema complete |
| before-after-fixture.md | Track fixture before/after migration | After migration |
| rendered-track.png | Screenshot of track with interval symbols | After renderer complete |

### Media Content

| Artifact | Description | Status |
|----------|-------------|--------|
| media/planning-post.md | Blog post announcing the feature | ✅ Created |
| media/linkedin-planning.md | LinkedIn summary for planning | ✅ Created |
| media/shipped-post.md | Blog post celebrating completion | Pending (Polish phase) |
| media/linkedin-shipped.md | LinkedIn summary for shipped | Pending (Polish phase) |

---

## Phase 1: Setup

**Purpose**: Prepare project structure for implementation

- [x] T001 Create evidence directory `specs/048-geojson-position-metadata/evidence/`
- [x] T002 Verify LinkML and schema generation tools are available

---

## Phase 2: Foundation - Schema Changes (US4: Schema Migration)

**Goal**: Normalize data model - coordinates in geometry only, add position styling classes

**Independent Test**: Schema validation passes; fixtures with coordinates in positions are rejected

### Schema Modifications

- [x] T003 Remove `coordinates` attribute from TimestampedPosition `shared/schemas/src/linkml/common.yaml`
- [x] T004 [P] Add PositionStyle class to styling schema `shared/schemas/src/linkml/styling.yaml`
- [x] T005 [P] Add PositionStyleOverride class (no time field) `shared/schemas/src/linkml/styling.yaml`
- [x] T006 Add default_position_style to TrackProperties `shared/schemas/src/linkml/geojson.yaml`
- [x] T007 [P] Add symbol_interval to TrackProperties `shared/schemas/src/linkml/geojson.yaml`
- [x] T008 [P] Add label_interval to TrackProperties `shared/schemas/src/linkml/geojson.yaml`
- [x] T009 [P] Add position_style_overrides to TrackProperties `shared/schemas/src/linkml/geojson.yaml`

### Validation

- [x] T010 Add parallel array validation rule (coordinates == positions == overrides) `shared/schemas/src/linkml/geojson.yaml`
- [x] T011 Run LinkML linting to verify schema syntax `shared/schemas/Makefile`

**Checkpoint**: Schema definitions complete - proceed to migration

---

## Phase 3: Migration & Regeneration

**Goal**: Update fixtures and regenerate all derived schemas

**Independent Test**: All golden fixtures pass validation; round-trip tests pass

### Fixture Migration

- [x] T012 Migrate track-feature-valid-01.json - remove position coordinates, add default_position_style `shared/schemas/src/fixtures/valid/track-feature-valid-01.json`
- [x] T013 [P] Migrate track-feature-valid-02.json - remove position coordinates, add default_position_style `shared/schemas/src/fixtures/valid/track-feature-valid-02.json`
- [x] T014 Create new fixture with position styling (intervals + overrides) `shared/schemas/src/fixtures/valid/track-feature-position-styling.json`

### REP Handler Migration

- [x] T050 Update REP handler to remove lat/lon from positions_data output `services/io/src/debrief_io/handlers/rep.py`
- [x] T051 Add default_position_style to REP handler feature output `services/io/src/debrief_io/handlers/rep.py`
- [x] T052 [test] Update REP handler tests for new schema format `services/io/tests/test_rep_handler.py`

### Schema Generation

- [x] T015 Regenerate Pydantic models from LinkML `shared/schemas/src/generated/python/`
- [x] T016 [P] Regenerate TypeScript types from LinkML `shared/schemas/src/generated/typescript/`
- [x] T017 [P] Regenerate JSON Schema from LinkML `shared/schemas/src/generated/json-schema/`

### Testing

- [x] T018 [test] Run golden fixture validation tests `shared/schemas/tests/test_golden.py`
- [x] T019 [P][test] Run round-trip serialization tests `shared/schemas/tests/test_roundtrip.py`
- [x] T020 [P][test] Run TypeScript type checking `shared/schemas/tests/typescript-usage.ts`

**Checkpoint**: Schema migration complete - all tests pass

---

## Phase 4: US1 - Interval-Based Symbol Display (Priority: P1) 🎯 MVP

**Goal**: Render position symbols at configurable time intervals

**Independent Test**: Load track with `symbol_interval: "PT5M"`, verify symbols appear at ~5-minute marks

### Utility Functions

- [x] T021 Add ISO 8601 duration parser for PT durations `apps/vscode/src/webview/web/durationUtils.ts`
- [x] T022 [test] Write duration parser unit tests `apps/vscode/tests/unit/durationUtils.test.ts`
- [x] T023 Add interval position matching algorithm `apps/vscode/src/webview/web/intervalUtils.ts`
- [x] T024 [test] Write interval matching unit tests `apps/vscode/tests/unit/intervalUtils.test.ts`

### Renderer Updates

- [x] T025 Add position symbol rendering to TrackRenderer `apps/vscode/src/webview/web/trackRenderer.ts`
- [x] T026 Add style resolution cascade function (defaults → intervals → overrides) `apps/vscode/src/webview/web/trackRenderer.ts`
- [x] T027 Integrate interval-based symbol display in renderTrack method `apps/vscode/src/webview/web/trackRenderer.ts`

### Integration

- [x] T028 Update Track type to include new styling properties `apps/vscode/src/webview/messages.ts`
- [x] T029 [test] Write integration test for interval symbol rendering `apps/vscode/tests/unit/trackRenderer.test.ts`

**Checkpoint**: Tracks render symbols at configured intervals

---

## Phase 5: US2 - Override Individual Position Styling (Priority: P2)

**Goal**: Allow custom symbols/labels on specific positions via override array

**Independent Test**: Set `position_style_overrides[i]` with custom style, verify only that position renders differently

### Override Handling

- [x] T030 Add override lookup by index in style resolution `apps/vscode/src/webview/web/trackRenderer.ts`
- [x] T031 Apply override styling (show_symbol, symbol shape) in renderer `apps/vscode/src/webview/web/trackRenderer.ts`

### Label Rendering

- [x] T032 Add position label rendering capability `apps/vscode/src/webview/web/trackRenderer.ts`
- [x] T033 Format timestamp as default label text when show_label=true `apps/vscode/src/webview/web/trackRenderer.ts`
- [x] T034 Apply custom label text from overrides `apps/vscode/src/webview/web/trackRenderer.ts`

### Testing

- [x] T035 [test] Write unit test for override suppressing interval symbol `apps/vscode/tests/unit/trackRenderer.test.ts`
- [x] T036 [P][test] Write unit test for custom label text `apps/vscode/tests/unit/trackRenderer.test.ts`

**Checkpoint**: Position overrides correctly applied in rendering

---

## Phase 6: US3 - Default Position Style (Priority: P2)

**Goal**: Verify default_position_style provides baseline for cascade

**Independent Test**: Set `default_position_style.show_symbol: true`, verify all positions show symbols

### Verification

- [x] T037 [test] Test default show_symbol=true renders all position symbols `apps/vscode/tests/unit/trackRenderer.test.ts`
- [x] T038 [P][test] Test default symbol shape applied to all rendered symbols `apps/vscode/tests/unit/trackRenderer.test.ts`
- [x] T039 [P][test] Test default show_label=true renders labels at all positions `apps/vscode/tests/unit/trackRenderer.test.ts`

**Checkpoint**: Default position style cascade verified

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, evidence collection, and PR creation

### Documentation

- [ ] T040 Verify quickstart.md is accurate with final implementation `specs/048-geojson-position-metadata/quickstart.md`
- [ ] T041 [P] Update CLAUDE.md with new technologies if needed `CLAUDE.md`

### Evidence Collection

- [ ] T042 Create evidence directory `specs/048-geojson-position-metadata/evidence/`
- [ ] T043 Capture test summary with pass/fail counts `specs/048-geojson-position-metadata/evidence/test-summary.md`
- [ ] T044 Create usage example showing track with position styling `specs/048-geojson-position-metadata/evidence/usage-example.md`
- [ ] T045 [P] Document before/after fixture comparison `specs/048-geojson-position-metadata/evidence/before-after-fixture.md`
- [ ] T046 [P] Capture screenshot of rendered track with interval symbols `specs/048-geojson-position-metadata/evidence/rendered-track.png`

### Media Content

- [ ] T047 Create shipped blog post `specs/048-geojson-position-metadata/media/shipped-post.md`
- [ ] T048 [P] Create LinkedIn shipped summary `specs/048-geojson-position-metadata/media/linkedin-shipped.md`

### PR Creation

- [ ] T049 Create PR and publish blog: run /speckit.pr

**Task T049 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - start immediately
- **Phase 2 (Schema)**: Depends on Phase 1
- **Phase 3 (Migration)**: Depends on Phase 2 - BLOCKS rendering work
- **Phase 4 (US1 Intervals)**: Depends on Phase 3
- **Phase 5 (US2 Overrides)**: Depends on Phase 4 (builds on renderer)
- **Phase 6 (US3 Defaults)**: Depends on Phase 5 (full cascade testing)
- **Phase 7 (Polish)**: Depends on all user stories complete

### User Story Dependencies

- **US4 (Schema Migration)**: Foundation - must complete first
- **US1 (Intervals)**: Depends on schema completion
- **US2 (Overrides)**: Depends on US1 (extends renderer)
- **US3 (Defaults)**: Depends on US2 (tests full cascade)

### Parallel Opportunities

**Phase 2 (Schema):**
```
T004, T005 can run in parallel (different classes in styling.yaml)
T007, T008, T009 can run in parallel (different fields in geojson.yaml)
```

**Phase 3 (Migration):**
```
T012, T013 can run in parallel (different fixtures)
T050, T051 can run in parallel with T012, T013 (independent file)
T015, T016, T017 can run in parallel (different generated outputs)
T018, T019, T020, T052 can run in parallel (independent test suites)
```

**Phase 4 (US1):**
```
T021, T023 can start in parallel, but T022, T024 tests depend on implementations
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Schema Changes
3. Complete Phase 3: Migration & Regeneration
4. Complete Phase 4: US1 Interval-Based Symbols
5. **STOP and VALIDATE**: Tracks render with interval symbols
6. Demo capability to stakeholders

### Incremental Delivery

1. Schema + Migration → Foundation ready
2. Add US1 → Interval symbols work → Demo
3. Add US2 → Position overrides work → Demo
4. Add US3 → Full cascade verified → Demo
5. Polish → PR created

### Task Summary

| Phase | Tasks | Parallel Opportunities |
|-------|-------|----------------------|
| 1. Setup | 2 | 0 |
| 2. Schema | 9 | 5 |
| 3. Migration | 12 | 8 |
| 4. US1 Intervals | 9 | 2 |
| 5. US2 Overrides | 7 | 1 |
| 6. US3 Defaults | 3 | 2 |
| 7. Polish | 10 | 4 |
| **Total** | **52** | **22** |

---

## Notes

- Schema tests (golden fixtures, round-trip) are mandatory per Constitution Article VI
- LinkML is the single source of truth per Constitution Article II
- Breaking changes permitted pre-v4.0.0 per Constitution Article XIV
- Evidence collection is required before PR creation
- All task IDs follow T### format with 3-digit numbers
