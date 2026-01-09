# Tasks: Schema Foundation

**Input**: Design documents from `/specs/000-schemas/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md

**Tests**: Required per Constitution Article II and FR-006/FR-007 - schema tests gate all merges.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This feature uses the `shared/schemas/` structure per plan.md:

```
shared/schemas/
├── src/
│   ├── linkml/           # Master schemas
│   ├── generated/        # Python, JSON Schema, TypeScript
│   └── fixtures/         # Golden test data
├── tests/                # Adherence tests
├── scripts/              # Generation scripts
├── pyproject.toml
├── package.json
└── Makefile
```

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and build tooling

- [x] T001 Create shared/schemas/ directory structure per plan.md
- [x] T002 Create shared/schemas/pyproject.toml with uv workspace config, LinkML and Pydantic v2 dependencies
- [x] T003 [P] Create shared/schemas/package.json with pnpm config, AJV and TypeScript dependencies
- [x] T004 [P] Create shared/schemas/Makefile with generate, test, and clean targets
- [x] T005 [P] Create shared/schemas/scripts/generate.py to orchestrate all generators

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Base schema infrastructure that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Create shared/schemas/src/linkml/debrief.yaml root schema with prefixes and imports
- [x] T007 [P] Create shared/schemas/src/generated/python/.gitkeep placeholder
- [x] T008 [P] Create shared/schemas/src/generated/json-schema/.gitkeep placeholder
- [x] T009 [P] Create shared/schemas/src/generated/typescript/.gitkeep placeholder
- [x] T010 [P] Create shared/schemas/src/fixtures/valid/.gitkeep placeholder
- [x] T011 [P] Create shared/schemas/src/fixtures/invalid/.gitkeep placeholder
- [x] T012 Verify `make generate` runs without error (empty generation)

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Define GeoJSON Profile Schema (Priority: P1) 🎯 MVP

**Goal**: Author LinkML definitions for all five entity types with maritime-specific extensions

**Independent Test**: Run `linkml-validate` against sample JSON; validation passes for valid data and fails with clear errors for invalid data

### Implementation for User Story 1

- [x] T013 [US1] Define common types (enums, base classes) in shared/schemas/src/linkml/common.yaml
- [x] T014 [P] [US1] Define TrackFeature schema in shared/schemas/src/linkml/geojson.yaml
- [x] T015 [P] [US1] Define SensorContact schema in shared/schemas/src/linkml/geojson.yaml
- [x] T016 [P] [US1] Define ReferenceLocation schema in shared/schemas/src/linkml/geojson.yaml
- [x] T017 [P] [US1] Define PlotMetadata schema in shared/schemas/src/linkml/stac.yaml
- [x] T018 [P] [US1] Define ToolMetadata schema in shared/schemas/src/linkml/tools.yaml
- [x] T019 [US1] Update shared/schemas/src/linkml/debrief.yaml to import all schema modules
- [x] T020 [US1] Verify LinkML schemas compile with `linkml-validate --schema debrief.yaml`

### Golden Fixtures for User Story 1

- [x] T021 [P] [US1] Create valid TrackFeature fixture in shared/schemas/src/fixtures/valid/track-feature-valid-01.json
- [x] T022 [P] [US1] Create valid TrackFeature fixture in shared/schemas/src/fixtures/valid/track-feature-valid-02.json
- [x] T023 [P] [US1] Create invalid TrackFeature fixture in shared/schemas/src/fixtures/invalid/track-feature-missing-required.json
- [x] T024 [P] [US1] Create invalid TrackFeature fixture in shared/schemas/src/fixtures/invalid/track-feature-invalid-type.json
- [x] T025 [P] [US1] Create valid SensorContact fixture in shared/schemas/src/fixtures/valid/sensor-contact-valid-01.json
- [x] T026 [P] [US1] Create valid SensorContact fixture in shared/schemas/src/fixtures/valid/sensor-contact-valid-02.json
- [x] T027 [P] [US1] Create invalid SensorContact fixtures in shared/schemas/src/fixtures/invalid/sensor-contact-*.json (2 files)
- [x] T028 [P] [US1] Create valid ReferenceLocation fixtures in shared/schemas/src/fixtures/valid/reference-location-*.json (2 files)
- [x] T029 [P] [US1] Create invalid ReferenceLocation fixtures in shared/schemas/src/fixtures/invalid/reference-location-*.json (2 files)
- [x] T030 [P] [US1] Create valid PlotMetadata fixtures in shared/schemas/src/fixtures/valid/plot-metadata-*.json (2 files)
- [x] T031 [P] [US1] Create invalid PlotMetadata fixtures in shared/schemas/src/fixtures/invalid/plot-metadata-*.json (2 files)
- [x] T032 [P] [US1] Create valid ToolMetadata fixtures in shared/schemas/src/fixtures/valid/tool-metadata-*.json (2 files)
- [x] T033 [P] [US1] Create invalid ToolMetadata fixtures in shared/schemas/src/fixtures/invalid/tool-metadata-*.json (2 files)
- [x] T034 [US1] Validate all fixtures against LinkML schema using linkml-validate

**Checkpoint**: LinkML schemas complete, all 5 entities defined, 20+ golden fixtures created

---

## Phase 4: User Story 2 - Generate Pydantic Models (Priority: P1)

**Goal**: Generate Pydantic v2 models from LinkML with full type annotations

**Independent Test**: Import `debrief_schemas.TrackFeature`, instantiate with valid dict, round-trip to JSON

### Implementation for User Story 2

- [ ] T035 [US2] Configure gen-pydantic in shared/schemas/scripts/generate.py with --extra-fields forbid --black
- [ ] T036 [US2] Generate Pydantic models to shared/schemas/src/generated/python/debrief_schemas/__init__.py
- [ ] T037 [US2] Create shared/schemas/src/generated/python/debrief_schemas/py.typed marker for PEP 561
- [ ] T038 [US2] Verify generated models import without error in Python
- [ ] T039 [US2] Verify TrackFeature model accepts valid fixture data
- [ ] T040 [US2] Verify TrackFeature model rejects invalid fixture data with ValidationError

**Checkpoint**: Pydantic models generated and validated against fixtures

---

## Phase 5: User Story 3 - Generate JSON Schema (Priority: P2)

**Goal**: Generate JSON Schema for frontend validation and API contract testing

**Independent Test**: Load generated JSON Schema into AJV, validate sample GeoJSON — same pass/fail as LinkML

### Implementation for User Story 3

- [ ] T041 [US3] Configure gen-json-schema in shared/schemas/scripts/generate.py
- [ ] T042 [US3] Generate JSON Schema to shared/schemas/src/generated/json-schema/debrief.schema.json
- [ ] T043 [P] [US3] Generate per-entity schemas (TrackFeature.schema.json, etc.) in shared/schemas/src/generated/json-schema/
- [ ] T044 [US3] Verify generated JSON Schema is valid JSON Schema draft-2020-12
- [ ] T045 [US3] Create shared/schemas/tests/validate-jsonschema.js using AJV to validate fixtures

**Checkpoint**: JSON Schema generated, AJV validation matches LinkML validation

---

## Phase 6: User Story 4 - Generate TypeScript Interfaces (Priority: P2)

**Goal**: Generate TypeScript interfaces matching Pydantic models for type-safe frontend

**Independent Test**: TypeScript compiler accepts code using generated interfaces with no type errors

### Implementation for User Story 4

- [ ] T046 [US4] Configure gen-typescript in shared/schemas/scripts/generate.py
- [ ] T047 [US4] Generate TypeScript interfaces to shared/schemas/src/generated/typescript/types.ts
- [ ] T048 [US4] Create shared/schemas/src/generated/typescript/index.ts exporting all types
- [ ] T049 [US4] Create shared/schemas/src/generated/typescript/tsconfig.json with strict mode
- [ ] T050 [US4] Verify TypeScript compilation succeeds with `tsc --noEmit`
- [ ] T051 [US4] Create shared/schemas/tests/typescript-usage.ts demonstrating type usage with fixtures

**Checkpoint**: TypeScript interfaces generated, compilation succeeds in strict mode

---

## Phase 7: User Story 5 - Schema Adherence Testing (Priority: P1)

**Goal**: Implement three adherence test strategies ensuring derived schemas stay in sync

**Independent Test**: Modify a field in LinkML, run tests — they fail until schemas regenerated

### Test 1: Golden Fixture Validation

- [ ] T052 [US5] Create shared/schemas/tests/test_golden.py testing all valid fixtures pass in Pydantic
- [ ] T053 [US5] Extend test_golden.py to verify all invalid fixtures fail with expected errors
- [ ] T054 [US5] Create shared/schemas/tests/test_golden_jsonschema.js testing fixtures in AJV
- [ ] T055 [US5] Verify Python and JavaScript fixture validation results match

### Test 2: Round-Trip Testing

- [ ] T056 [US5] Create shared/schemas/tests/test_roundtrip.py for Python → JSON → Python round-trip
- [ ] T057 [US5] Create shared/schemas/tests/roundtrip-typescript.ts for TypeScript parsing/serializing
- [ ] T058 [US5] Create shared/schemas/tests/test_roundtrip_full.py orchestrating Python → JSON → TS → JSON → Python
- [ ] T059 [US5] Verify round-trip preserves all fields without data loss

### Test 3: Schema Comparison

- [ ] T060 [US5] Create shared/schemas/tests/test_schema_compare.py comparing LinkML vs Pydantic JSON Schema
- [ ] T061 [US5] Implement structural diff ignoring metadata ($id, description, ordering)
- [ ] T062 [US5] Verify required fields, types, enums match between generators

### CI Integration

- [ ] T063 [US5] Create .github/workflows/schema-tests.yml running all adherence tests
- [ ] T064 [US5] Configure CI to block merge on any test failure
- [ ] T065 [US5] Add step to verify no uncommitted changes after `make generate`

**Checkpoint**: All three adherence test strategies implemented and passing in CI

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T066 [P] Update shared/schemas/README.md with usage documentation
- [ ] T067 [P] Add inline documentation to LinkML schemas (descriptions, examples)
- [ ] T068 Verify `make generate` updates all targets in single command (FR-008)
- [ ] T069 Run quickstart.md validation — verify examples work as documented
- [ ] T070 Final review: ensure zero manual edits required to generated files (SC-005)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational - LinkML schemas must exist first
- **User Story 2 (Phase 4)**: Depends on US1 - needs LinkML schemas to generate from
- **User Story 3 (Phase 5)**: Depends on US1 - needs LinkML schemas to generate from
- **User Story 4 (Phase 6)**: Depends on US1 - needs LinkML schemas to generate from
- **User Story 5 (Phase 7)**: Depends on US2, US3, US4 - needs all generators working
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

```
US1 (LinkML Schemas)
 │
 ├──> US2 (Pydantic) ──┐
 │                     │
 ├──> US3 (JSON Schema)├──> US5 (Adherence Testing)
 │                     │
 └──> US4 (TypeScript) ┘
```

- **US1 (P1)**: Foundational - all other stories depend on this
- **US2, US3, US4**: Can run in parallel after US1 completes
- **US5 (P1)**: Requires US2, US3, US4 to be complete

### Parallel Opportunities

**Within Phase 1 (Setup):**
```
T002 (pyproject.toml) | T003 (package.json) | T004 (Makefile) | T005 (generate.py)
```

**Within Phase 2 (Foundational):**
```
T007 (python/) | T008 (json-schema/) | T009 (typescript/) | T010 (valid/) | T011 (invalid/)
```

**Within Phase 3 (US1 - Schemas):**
```
T014 (TrackFeature) | T015 (SensorContact) | T016 (ReferenceLocation) | T017 (PlotMetadata) | T018 (ToolMetadata)
```

**Fixture Creation (all [P] in Phase 3):**
```
All T021-T033 fixture tasks can run in parallel
```

**Generators (US2, US3, US4 after US1):**
```
US2 (Pydantic) | US3 (JSON Schema) | US4 (TypeScript) — all can run in parallel
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: Foundational (T006-T012)
3. Complete Phase 3: User Story 1 - LinkML schemas + fixtures (T013-T034)
4. Complete Phase 4: User Story 2 - Pydantic generation (T035-T040)
5. **STOP and VALIDATE**: Python developers can now use `debrief_schemas`
6. Deploy/demo if ready — Python services unblocked!

### Incremental Delivery

1. **Increment 1 (MVP)**: Setup + Foundational + US1 + US2 → Python services unblocked
2. **Increment 2**: Add US3 (JSON Schema) → Frontend validation enabled
3. **Increment 3**: Add US4 (TypeScript) → Type-safe frontend development
4. **Increment 4**: Add US5 (Adherence Testing) → CI gates enabled, full schema integrity

### Task Count Summary

| Phase | Tasks | Parallelizable |
|-------|-------|----------------|
| Phase 1: Setup | 5 | 4 |
| Phase 2: Foundational | 7 | 5 |
| Phase 3: US1 | 22 | 18 |
| Phase 4: US2 | 6 | 0 |
| Phase 5: US3 | 5 | 1 |
| Phase 6: US4 | 6 | 0 |
| Phase 7: US5 | 14 | 0 |
| Phase 8: Polish | 5 | 2 |
| **Total** | **70** | **30** |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US1 is the critical path — all other stories depend on it
- US2, US3, US4 can proceed in parallel once US1 is complete
- Constitution Article II requires all tests pass before merge
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
