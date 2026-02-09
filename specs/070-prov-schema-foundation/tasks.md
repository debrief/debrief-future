# Tasks: PROV Schema Foundation

**Input**: Design documents from `/specs/070-prov-schema-foundation/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Tests are included — this feature modifies existing tested code and adds new models that require validation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

**Evidence Directory**: `specs/070-prov-schema-foundation/evidence/`
**Media Directory**: `specs/070-prov-schema-foundation/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | pytest results for calc + schema tests | After all tests pass |
| usage-example.md | Python code creating Log entry + ToolResult | After US1 complete |
| sample-log-entry.json | Real Log entry from executor output | After US1 complete |
| before-after-provenance.md | Side-by-side old vs new format | After US3 complete |
| schema-generation-output.md | LinkML generator output summary | After US5 complete |

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

**Purpose**: Create directory structure and golden fixture files that define the target format before any code changes.

- [x] T001 Create log-entry fixture directories `shared/schemas/fixtures/log-entry/valid/`
- [x] T002 [P] Create log-entry invalid fixture directory `shared/schemas/fixtures/log-entry/invalid/`
- [x] T003 [P] Create system-record fixture directory `shared/schemas/fixtures/system-record/valid/`
- [x] T004 Create valid tool invocation Log entry fixture (SRD A.3 example 1) `shared/schemas/fixtures/log-entry/valid/tool-invocation.json`
- [x] T005 [P] Create valid property edit Log entry fixture (SRD A.3 example 2) `shared/schemas/fixtures/log-entry/valid/property-edit.json`
- [x] T006 [P] Create valid artifact-producing Log entry fixture (SRD A.3 example 3) `shared/schemas/fixtures/log-entry/valid/artifact-producing.json`
- [x] T007 [P] Create invalid Log entry fixture: missing activityId `shared/schemas/fixtures/log-entry/invalid/missing-activity-id.json`
- [x] T008 [P] Create invalid Log entry fixture: bad duration format `shared/schemas/fixtures/log-entry/invalid/bad-duration-format.json`
- [x] T009 Create valid empty system record fixture `shared/schemas/fixtures/system-record/valid/empty-system-record.json`
- [x] T010 [P] Create valid populated system record fixture `shared/schemas/fixtures/system-record/valid/populated-system-record.json`

**Checkpoint**: Golden fixtures define the target format — all subsequent code must produce/validate output matching these fixtures.

---

## Phase 2: Foundation (Blocking Prerequisites)

**Purpose**: LinkML schemas and new Python model classes that ALL user stories depend on.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T011 Create Log Entry LinkML schema with LogEntry, WasGeneratedBy, ParameterValue, TuneAnnotation classes `shared/schemas/src/linkml/log-entry.yaml`
- [x] T012 Create system record LinkML schema with SystemRecordProperties, SnapshotLinks, SnapshotRef, BranchRecord, FileProvEntry classes `shared/schemas/src/linkml/system-record.yaml`
- [x] T013 Add log-entry and system-record imports to root schema `shared/schemas/src/linkml/debrief.yaml`
- [x] T014 Add ParameterValue model class (value, default=False, tunable=True) `services/calc/debrief_calc/models.py`
- [x] T015 [P] Add PropertyDelta model class (previous_value, new_value) `services/calc/debrief_calc/models.py`
- [x] T016 [P] Add ModifiedFeature model class (feature_id, changed_properties dict) `services/calc/debrief_calc/models.py`
- [x] T017 [P] Add CreatedAsset model class (result_id, path, mime_type optional) `services/calc/debrief_calc/models.py`
- [x] T018 [test] Add unit tests for ParameterValue, PropertyDelta, ModifiedFeature, CreatedAsset models `services/calc/tests/test_models.py`

**Checkpoint**: Foundation ready — schemas defined, model classes available, user story implementation can begin.

---

## Phase 3: User Story 1 — Unified Provenance Schema (Priority: P1) MVP

**Goal**: Replace flat provenance with PROV-aligned Log entries stored as arrays on features, with shared activity IDs and structured parameters.

**Independent Test**: Run existing calc tools and verify output features carry provenance entries in the new PROV-aligned format.

### Tests for User Story 1

- [x] T019 [test] [US1] Write tests for create_log_entry(): basic entry, parameters with defaults/tunable, multiple sources, custom timestamp `services/calc/tests/test_provenance.py`
- [x] T020 [P][test] [US1] Write tests for attach_log_entry(): appends to array, creates array if missing, shared activityId across features, ISO 8601 duration `services/calc/tests/test_provenance.py`
- [x] T021 [P][test] [US1] Write test for legacy provenance wrapping: single dict wrapped in array on read `services/calc/tests/test_provenance.py`

### Implementation for User Story 1

- [x] T022 [US1] Add LogEntry Pydantic model class with activity_id, timestamp, was_generated_by, used, generated, execution_duration, generated_result_id, tune fields (with camelCase aliases) `services/calc/debrief_calc/models.py`
- [x] T023 [P] [US1] Add WasGeneratedBy Pydantic model class with tool, tool_version, parameters dict `services/calc/debrief_calc/models.py`
- [x] T024 [US1] Implement create_log_entry() function replacing create_provenance() — creates LogEntry from tool name, version, source feature IDs, parameters, duration_ms `services/calc/debrief_calc/provenance.py`
- [x] T025 [US1] Implement attach_log_entry() function replacing attach_provenance() — appends LogEntry to properties.provenance array, assigns shared activityId `services/calc/debrief_calc/provenance.py`
- [x] T026 [US1] Update validate_tool_output() to check for array-format provenance with PROV fields (activity_id, was_generated_by.tool, was_generated_by.tool_version) `services/calc/debrief_calc/validation.py`
- [x] T027 [US1] Update executor run() to use attach_log_entry() instead of attach_provenance(), pass tool.version and resolved parameters `services/calc/debrief_calc/executor.py`
- [x] T028 [US1] Update existing test_provenance.py tests for new function signatures and output format `services/calc/tests/test_provenance.py`
- [x] T029 [US1] Update test_executor.py provenance assertions to expect array format with PROV vocabulary `services/calc/tests/test_executor.py`
- [x] T030 [US1] Run full calc test suite and fix any remaining failures `services/calc/tests/`

**Checkpoint**: US1 complete — provenance entries use PROV vocabulary, stored as arrays, with shared activity IDs. All calc tests pass.

---

## Phase 4: User Story 2 — Expanded Tool Output Contract (Priority: P2)

**Goal**: Expand ToolResult with optional structured change tracking fields: tool_version, modified_features, created_features, created_assets, parameters.

**Independent Test**: Construct ToolResult instances with new fields, validate with Pydantic, verify serialisation round-trips.

### Tests for User Story 2

- [x] T031 [test] [US2] Write tests for expanded ToolResult: all new fields populated, all new fields None (backward compat), serialisation round-trip `services/calc/tests/test_models.py`
- [x] T032 [P][test] [US2] Write test for ToolResult with modifiedFeatures containing PropertyDeltas `services/calc/tests/test_models.py`
- [x] T033 [P][test] [US2] Write test for ToolResult with createdAssets containing resultId and versioned path `services/calc/tests/test_models.py`

### Implementation for User Story 2

- [x] T034 [US2] Expand ToolResult model with optional fields: tool_version, modified_features, created_features, created_assets, parameters (all default None) `services/calc/debrief_calc/models.py`
- [x] T035 [US2] Verify existing ToolResult construction (original 5 fields only) still validates — backward compatibility check `services/calc/tests/test_models.py`
- [x] T036 [US2] Update test_result_builder.py if it exists to include new fields `services/calc/tests/`

**Checkpoint**: US2 complete — ToolResult has expanded contract, all existing code still works with None defaults.

---

## Phase 5: User Story 3 — Provenance Format Unification (Priority: P3)

**Goal**: Remove the duplicate STAC provenance module and ensure zero references to `properties.prov` in the codebase.

**Independent Test**: Search codebase for `properties.prov` (distinct from `provenance`) — zero matches. Full test suite passes.

### Tests for User Story 3

- [x] T037 [test] [US3] Write test asserting no `properties.prov` references in source files `services/calc/tests/test_provenance.py`

### Implementation for User Story 3

- [x] T038 [US3] Delete duplicate STAC provenance module `services/stac/src/debrief_stac/provenance.py`
- [x] T039 [US3] Update any STAC service code that imports from the deleted module to use debrief_calc.provenance or inline logic `services/stac/src/debrief_stac/`
- [x] T040 [US3] Update STAC provenance tests to use unified format (properties.provenance array) `services/stac/tests/test_provenance.py`
- [x] T041 [US3] Search entire codebase for `properties.prov` (distinct from provenance) and fix any remaining references
- [x] T042 [US3] Run full STAC test suite and fix any failures `services/stac/tests/`
- [x] T043 [US3] Update sample data files containing old provenance format `specs/005-debrief-calc/evidence/sample-output.geojson`

**Checkpoint**: US3 complete — one provenance implementation, zero `properties.prov` references, all tests green.

---

## Phase 6: User Story 4 — System Record Schema (Priority: P4)

**Goal**: Define LinkML schema for system record properties (snapshot links, branch records) with golden fixtures.

**Independent Test**: Validate system record fixtures against LinkML schema. Confirm renderers skip system features.

### Tests for User Story 4

- [x] T044 [test] [US4] Write fixture validation tests: empty system record validates, populated system record validates, missing featureType rejected `shared/schemas/tests/test_system_record_fixtures.py`

### Implementation for User Story 4

- [x] T045 [US4] Verify system record LinkML schema from Phase 2 covers all fields in populated fixture (snapshotLinks, branches, provenance array) `shared/schemas/src/linkml/system-record.yaml`
- [x] T046 [US4] Add system record fixture validation test that runs against the JSON Schema contract `shared/schemas/tests/test_system_record_fixtures.py`
- [x] T047 [US4] Verify SYSTEM kind in FeatureKindEnum (from #062) works with system record schema `shared/schemas/src/linkml/common.yaml`

**Checkpoint**: US4 complete — system record schema defined and validated with fixtures.

---

## Phase 7: User Story 5 — LinkML Schema Generation (Priority: P5)

**Goal**: Run LinkML generators and verify generated output matches golden fixtures and hand-written models.

**Independent Test**: Run generators, validate fixtures against generated Pydantic models and JSON Schema.

### Tests for User Story 5

- [x] T048 [test] [US5] Write test: gen-pydantic produces valid Python module for log-entry schema `shared/schemas/tests/test_log_entry_generation.py`
- [x] T049 [P][test] [US5] Write test: valid fixtures pass generated Pydantic model validation `shared/schemas/tests/test_log_entry_generation.py`
- [x] T050 [P][test] [US5] Write test: invalid fixtures are rejected by generated Pydantic models `shared/schemas/tests/test_log_entry_generation.py`
- [x] T051 [P][test] [US5] Write test: gen-json-schema produces valid JSON Schema for log-entry `shared/schemas/tests/test_log_entry_generation.py`

### Implementation for User Story 5

- [x] T052 [US5] Run `make generate` in shared/schemas to regenerate all outputs (Pydantic, JSON Schema, TypeScript) `shared/schemas/`
- [x] T053 [US5] Verify generated Pydantic models match hand-written LogEntry/WasGeneratedBy/ParameterValue classes `shared/schemas/src/generated/python/`
- [x] T054 [US5] Write round-trip test: create LogEntry in Python, serialise to JSON, validate against generated JSON Schema `shared/schemas/tests/test_log_entry_generation.py`
- [x] T055 [US5] Run full schema test suite `shared/schemas/tests/`

**Checkpoint**: US5 complete — schema generation verified, round-trip test passes, golden fixtures validated.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Evidence collection, media content, cross-story validation, and PR creation.

### Cross-Story Verification

- [x] T056 Run full calc test suite: `cd services/calc && python -m pytest tests/ -v` `services/calc/tests/`
- [x] T057 [P] Run full STAC test suite: `cd services/stac && python -m pytest tests/ -v` `services/stac/tests/`
- [x] T058 [P] Run full schema test suite: `cd shared/schemas && make validate-fixtures` `shared/schemas/`
- [x] T059 Verify zero `properties.prov` references: `grep -r "properties.prov[^e]" services/ shared/ apps/`
- [x] T060 Run quickstart.md verification steps `specs/070-prov-schema-foundation/quickstart.md`

### Evidence Collection

- [x] T061 Capture test results in `specs/070-prov-schema-foundation/evidence/test-summary.md`
- [x] T062 Create usage demonstration in `specs/070-prov-schema-foundation/evidence/usage-example.md`
- [x] T063 [P] Capture sample Log entry from executor output in `specs/070-prov-schema-foundation/evidence/sample-log-entry.json`
- [x] T064 [P] Create before/after provenance comparison in `specs/070-prov-schema-foundation/evidence/before-after-provenance.md`
- [x] T065 [P] Capture schema generation output summary in `specs/070-prov-schema-foundation/evidence/schema-generation-output.md`

### Media Content

- [x] T066 Create shipped blog post in `specs/070-prov-schema-foundation/media/shipped-post.md`
- [x] T067 [P] Create LinkedIn shipped summary in `specs/070-prov-schema-foundation/media/linkedin-shipped.md`

### PR Creation

- [x] T068 Create PR and publish blog: run /speckit.pr

**Task T068 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundation (Phase 2)**: Depends on Setup (fixtures define target format)
- **US1 (Phase 3)**: Depends on Foundation — CORE MVP
- **US2 (Phase 4)**: Depends on Foundation — can run in parallel with US1
- **US3 (Phase 5)**: Depends on US1 (needs new provenance format to replace old)
- **US4 (Phase 6)**: Depends on Foundation — can run in parallel with US1/US2/US3
- **US5 (Phase 7)**: Depends on Foundation + US4 (needs all schemas for generation)
- **Polish (Phase 8)**: Depends on all user stories complete

### User Story Dependencies

```
Phase 1 (Setup)
    │
    v
Phase 2 (Foundation)
    │
    ├──> Phase 3 (US1 - MVP) ──> Phase 5 (US3)
    │                                    │
    ├──> Phase 4 (US2) ─────────────────┐│
    │                                    ││
    └──> Phase 6 (US4) ──> Phase 7 (US5)││
                                         vv
                                    Phase 8 (Polish)
```

### Parallel Opportunities

**After Phase 2 (Foundation)**, these can run in parallel:
- US1 (Phase 3) and US2 (Phase 4) — different files, no conflicts
- US4 (Phase 6) — independent schema, different files

**Within Phase 2 (Foundation)**:
- T014-T017 (model classes) can all run in parallel
- T011-T012 (LinkML schemas) can run in parallel

**Within Phase 3 (US1)**:
- T022-T023 (LogEntry + WasGeneratedBy models) can run in parallel
- T019-T021 (tests) can run in parallel

**Within Phase 8 (Polish)**:
- T056-T059 (verification) can run in parallel
- T061-T065 (evidence) can run in parallel
- T066-T067 (media) can run in parallel

---

## Parallel Example: Foundation Phase

```bash
# Launch all model classes in parallel (different sections of same file):
Task: "Add ParameterValue model class" — models.py
Task: "Add PropertyDelta model class" — models.py
Task: "Add ModifiedFeature model class" — models.py
Task: "Add CreatedAsset model class" — models.py

# Launch both LinkML schemas in parallel (separate files):
Task: "Create Log Entry LinkML schema" — log-entry.yaml
Task: "Create system record LinkML schema" — system-record.yaml
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (golden fixtures)
2. Complete Phase 2: Foundation (schemas + model classes)
3. Complete Phase 3: User Story 1 (provenance migration)
4. **STOP and VALIDATE**: Run `cd services/calc && python -m pytest tests/ -v`
5. All existing calc tests pass with new PROV format

### Incremental Delivery

1. Setup + Foundation → Schemas and models ready
2. Add US1 → PROV-aligned provenance working → MVP!
3. Add US2 → Expanded ToolResult contract → Ready for Phase 1 consumers
4. Add US3 → Duplicate removed → Clean codebase
5. Add US4 → System record schema → Ready for snapshots/branches
6. Add US5 → Schema generation verified → Full schema-first compliance

### Suggested MVP Scope

**US1 (Unified Provenance Schema)** is the MVP. It delivers the core value: PROV-aligned Log entries on all features. All downstream E02 phases can begin once US1 is complete. US2-US5 add completeness and quality assurance but are not strictly blocking.

---

## Notes

- [P] tasks = different files, no dependencies
- [US*] label maps task to specific user story for traceability
- [test] label identifies test tasks
- Tests MUST be written and FAIL before implementation (Constitution Art. VII)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **Evidence is required** — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
