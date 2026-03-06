# Tasks: Schema-Validated GeoJSON Across All Services

**Input**: Design documents from `/specs/115-schema-validated-tool-io/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/validation-api.md

**Tests**: Tests are included where validation logic is introduced — each boundary requires coverage to satisfy Constitution VI.2 and the spec's success criteria.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. Phases follow the phased implementation order from research.md (R8).

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate schema validation works at every boundary. Used in PR descriptions, documentation, and blog posts.

**Evidence Directory**: `specs/115-schema-validated-tool-io/evidence/`
**Media Directory**: `specs/115-schema-validated-tool-io/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | pytest + vitest + tsc results across all packages | After all tests pass |
| usage-example.md | Python code showing validate_feature() rejecting bad data | After validation module complete |
| round-trip-evidence.md | Python → JSON → TypeScript → JSON round-trip proof for provenance fields | After schema changes regenerated |
| sample-request.json | Example tool execution with schema-validated input | After calc service migration |
| sample-response.json | Example tool output passing schema validation | After calc service migration |

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

## Phase 1: Setup — Schema Prerequisites

**Purpose**: Extend the LinkML schema with missing fields and fix the TypeScript generator, then regenerate all derived schemas. This unblocks all downstream validation work.

- [x] T001 Add `provenance` field (Optional list of LogEntry) to all feature property classes in LinkML `shared/schemas/src/linkml/geojson.yaml`
- [x] T002 [P] Add `provenance` field to all annotation property classes in LinkML `shared/schemas/src/linkml/annotations.yaml`
- [x] T003 [P] Add `__datasets` field to range-bearing result properties in LinkML `shared/schemas/src/linkml/tool-result.yaml`
- [x] T004 Fix TypeScript geometry coordinate types in schema generator `shared/schemas/scripts/generate.py`
- [x] T005 Regenerate all derived schemas (Pydantic, JSON Schema, TypeScript) `shared/schemas/src/generated/`
- [x] T006 [P] Add valid/invalid fixtures with provenance fields `shared/schemas/src/fixtures/`
- [x] T007 [P] Add valid/invalid fixtures for __datasets field `shared/schemas/fixtures/tool-result/`
- [x] T008 [test] Run schema adherence tests to verify new fields pass `shared/schemas/tests/`

**Checkpoint**: Schema prerequisites complete — all feature property classes include `provenance`, TypeScript types have correct coordinate types, and all derived schemas are regenerated.

---

## Phase 2: Foundation — Core Validation Infrastructure (US1 prerequisite)

**Purpose**: Create the shared validation module (`validate_feature()`, `FEATURE_MODEL_MAP`, `SchemaValidationError`) that all service boundaries will consume. This MUST be complete before any user story implementation.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tests

- [x] T009 [test] Write tests for FEATURE_MODEL_MAP covering all 12 feature kinds `shared/schemas/tests/test_validation.py`
- [x] T010 [P][test] Write tests for validate_feature() success and failure paths `shared/schemas/tests/test_validation.py`
- [x] T011 [P][test] Write tests for validate_features() batch validation with fail-fast `shared/schemas/tests/test_validation.py`
- [x] T012 [P][test] Write tests for resolve_feature_model() with known and unknown kinds `shared/schemas/tests/test_validation.py`
- [x] T013 [P][test] Write tests for resolve_enum_values() for all 6 enum types `shared/schemas/tests/test_validation.py`
- [x] T014 [P][test] Write tests for SchemaValidationError string formatting `shared/schemas/tests/test_validation.py`

### Implementation

- [x] T015 Create SchemaValidationError and FieldError classes `shared/schemas/src/generated/python/debrief_schemas/validation.py`
- [x] T016 Create FEATURE_MODEL_MAP dispatch dictionary for all 12 kinds `shared/schemas/src/generated/python/debrief_schemas/validation.py`
- [x] T017 Implement validate_feature() with kind extraction and model dispatch `shared/schemas/src/generated/python/debrief_schemas/validation.py`
- [x] T018 Implement validate_features() batch wrapper with fail-fast `shared/schemas/src/generated/python/debrief_schemas/validation.py`
- [x] T019 Implement resolve_feature_model() `shared/schemas/src/generated/python/debrief_schemas/validation.py`
- [x] T020 Implement resolve_enum_values() for all 6 schema enums `shared/schemas/src/generated/python/debrief_schemas/validation.py`
- [x] T021 Export validation API from debrief_schemas package `shared/schemas/src/generated/python/debrief_schemas/__init__.py`
- [x] T022 Run foundation tests and verify all pass `shared/schemas/tests/test_validation.py`

**Checkpoint**: Foundation ready — `validate_feature()`, `FEATURE_MODEL_MAP`, `resolve_enum_values()`, and `SchemaValidationError` are tested and exported from `debrief_schemas`. User story implementation can now begin.

---

## Phase 3: User Story 1 — Schema Catches Field Mismatch Before Deployment (Priority: P1)

**Goal**: Tool output features are validated against the shared schema, catching field-name mismatches at development time instead of in production.

**Independent Test**: Run any tool with an intentionally incorrect output field name and verify the system reports a validation error.

### Tests

- [x] T023 [test] Write test: tool output with invalid field name is rejected `services/calc/tests/test_schema_validation.py`
- [x] T024 [P][test] Write test: tool output with correct fields passes validation `services/calc/tests/test_schema_validation.py`
- [x] T025 [P][test] Write test: tool output with wrong type (string where number expected) is rejected `services/calc/tests/test_schema_validation.py`
- [x] T026 [P][test] Write test: validation error identifies boundary as "tool_output" `services/calc/tests/test_schema_validation.py`

### Implementation

- [x] T027 Add debrief-schemas dependency to calc service `services/calc/pyproject.toml`
- [x] T028 Integrate schema validation for tool outputs in executor (after handler, before provenance) `services/calc/debrief_calc/executor.py`
- [x] T029 Type SelectionContext.features with schema union type `services/calc/debrief_calc/models.py`
- [x] T030 Integrate schema validation alongside existing checks in validation module `services/calc/debrief_calc/validation.py`
- [x] T031 Update existing tool tests to verify output schema compliance `services/calc/tests/tools/`
- [x] T032 Run full calc test suite and verify no regressions `services/calc/tests/`

**Checkpoint**: Tool outputs are schema-validated. Field-name mismatches in tool output produce clear validation errors at the tool_output boundary.

---

## Phase 4: User Story 2 — Enum Parameters Validated From Single Source of Truth (Priority: P2)

**Goal**: All enum parameter constraints derive from the shared schema. Hardcoded enum sets are removed from tools. Adding a new enum value to the schema requires zero tool code changes.

**Independent Test**: Invoke a tool with an invalid enum value and verify rejection with a message listing valid values from the schema.

### Tests

- [x] T033 [test] Write test: tool rejects invalid enum value with schema-derived valid values `services/calc/tests/test_schema_validation.py`
- [x] T034 [P][test] Write test: tool accepts valid enum values from schema `services/calc/tests/test_schema_validation.py`
- [x] T035 [P][test] Write test: tool parameter choices match schema enum values exactly `services/calc/tests/test_schema_validation.py`

### Implementation

- [x] T036 Replace hardcoded valid_symbols in apply_symbol_style with schema enum `services/calc/debrief_calc/tools/track/styling/apply_symbol_style.py`
- [x] T037 [P] Replace hardcoded color defaults in set_track_color with schema enum `services/calc/debrief_calc/tools/track/styling/set_track_color.py`
- [x] T038 [P] Replace hardcoded pattern check in generate-reference-points with schema enum `services/calc/debrief_calc/tools/reference/generation.py`
- [x] T039 Add executor-level enum parameter validation using resolve_enum_values() `services/calc/debrief_calc/executor.py`
- [x] T040 Update tool tests for apply_symbol_style to verify schema-derived enum usage `services/calc/tests/tools/track/styling/test_apply_symbol_style.py`
- [x] T041 [P] Update tool tests for set_track_color `services/calc/tests/tools/track/styling/test_set_track_color.py`
- [x] T042 [P] Update tool tests for generate-reference-points `services/calc/tests/tools/reference/test_generation.py`
- [x] T043 Run full calc test suite and verify no regressions `services/calc/tests/`

**Checkpoint**: All hardcoded enum sets removed. Tool parameters validated against schema-derived enum values.

---

## Phase 5: User Story 3 — Input Features Validated at Service Boundary (Priority: P2)

**Goal**: Tool input features are validated against the schema at the service boundary, preventing tools from operating on malformed data.

**Independent Test**: Send a feature with missing required fields to any tool and verify a clear validation error identifying the missing field.

### Tests

- [x] T044 [test] Write test: input feature missing required property is rejected at tool_input boundary `services/calc/tests/test_schema_validation.py`
- [x] T045 [P][test] Write test: input feature with unknown kind is rejected `services/calc/tests/test_schema_validation.py`
- [x] T046 [P][test] Write test: valid input feature passes validation and tool processes normally `services/calc/tests/test_schema_validation.py`

### Implementation

- [x] T047 Integrate schema validation for tool inputs in executor (before handler execution) `services/calc/debrief_calc/executor.py`
- [x] T048 Update existing executor tests to account for input validation `services/calc/tests/test_executor.py`
- [x] T049 Run full calc test suite and verify no regressions `services/calc/tests/`

**Checkpoint**: Tool inputs are schema-validated. Malformed features are rejected at the tool_input boundary with clear error messages.

---

## Phase 6: User Story 4 — Parsed Files Produce Schema-Conformant Features (Priority: P2)

**Goal**: All file parsers (REP track parser and 17+ annotation builders) produce features that conform to the shared schema. Validation occurs at parse time.

**Independent Test**: Parse a known-good REP file and validate every output feature against the schema, then break a parser output and verify the schema catches it.

### Tests

- [x] T050 [test] Write test: parsed REP track features pass schema validation `services/io/tests/test_schema_compliance.py`
- [x] T051 [P][test] Write test: parsed annotation features (all types) pass schema validation `services/io/tests/test_schema_compliance.py`
- [x] T052 [P][test] Write test: parser with intentionally broken output is rejected at parser_output boundary `services/io/tests/test_schema_compliance.py`
- [x] T053 [P][test] Write test: each feature validates against correct schema model based on its kind `services/io/tests/test_schema_compliance.py`

### Implementation

- [x] T054 Replace Feature = Any with schema union type in IO types `services/io/src/debrief_io/types.py`
- [x] T055 Add schema validation after parse() in base handler `services/io/src/debrief_io/handlers/base.py`
- [x] T056 Ensure REP handler produces schema-compliant track features `services/io/src/debrief_io/handlers/rep.py`
- [x] T057 Ensure all annotation builders produce schema-compliant output `services/io/src/debrief_io/handlers/annotations/builders.py`
- [x] T058 Update existing parser tests to verify schema compliance `services/io/tests/test_rep_handler.py`
- [x] T059 [P] Update annotation integration tests for schema compliance `services/io/tests/test_annotations/test_integration.py`
- [x] T060 Run full IO test suite and verify no regressions `services/io/tests/`

**Checkpoint**: All parsers produce schema-validated features. Malformed parser output is rejected at the parser_output boundary.

---

## Phase 7: User Story 5 — Catalog Operations Enforce Schema on Storage and Retrieval (Priority: P2)

**Goal**: The STAC catalog validates features against the schema before writing to disk and after reading from disk. Untyped GeoJSON aliases are replaced with schema types.

**Independent Test**: Attempt to store a malformed feature in the catalog and verify rejection, then store a valid feature and verify the retrieved data passes schema validation.

### Tests

- [x] T061 [test] Write test: catalog rejects malformed feature on write at catalog_write boundary `services/stac/tests/test_schema_validation.py`
- [x] T062 [P][test] Write test: valid features stored and retrieved pass schema validation `services/stac/tests/test_schema_validation.py`
- [x] T063 [P][test] Write test: catalog read validates features at catalog_read boundary `services/stac/tests/test_schema_validation.py`

### Implementation

- [x] T064 Replace untyped GeoJSON aliases with schema types in STAC types `services/stac/src/debrief_stac/types.py`
- [x] T065 Add schema validation on feature write in features module `services/stac/src/debrief_stac/features.py`
- [x] T066 Add schema validation on feature read in features module `services/stac/src/debrief_stac/features.py`
- [x] T067 Use schema types in MCP server function signatures `services/stac/src/debrief_stac/mcp_server.py`
- [x] T068 Update existing catalog tests for schema-typed operations `services/stac/tests/test_features.py`
- [x] T069 Run full STAC test suite and verify no regressions `services/stac/tests/`

**Checkpoint**: Catalog validates features at both write and read boundaries. All untyped GeoJSON aliases replaced with schema types.

---

## Phase 8: User Story 6 — Frontend Renderers Use Shared Types (Priority: P3)

**Goal**: Frontend components import GeoJSON feature types from the shared schema package. Local workaround types and untyped casts are eliminated.

**Independent Test**: Remove a property from the shared schema and verify all frontend components using that property produce compile-time errors.

### Implementation

- [x] T070 Replace SafeFeature interface with schema types in stacService `apps/vscode/src/services/stacService.ts`
- [x] T071 [P] Replace custom GeoJSONFeature with schema types in diffFeatureCollections `shared/components/diff/src/diffFeatureCollections.ts`
- [x] T072 [P] Remove `as unknown` casts in flattenFeatures after coordinate type fix `shared/components/src/FeatureList/flattenFeatures.ts`
- [x] T073 [P] Replace `as any` casts in App.tsx with proper typed handlers `apps/web-shell/src/App.tsx`
- [x] T074 Run TypeScript build across all packages to verify compile-time safety `shared/components/`, `apps/vscode/`, `apps/web-shell/`
- [x] T075 Run existing frontend tests to verify no regressions `shared/components/src/FeatureList/flattenFeatures.test.ts`

**Checkpoint**: All frontend components use shared schema types. No local workaround types or untyped casts remain for GeoJSON feature property access.

---

## Phase 9: User Story 7 — Schema Change Surfaces All Affected Code (Priority: P3)

**Goal**: When a schema field is renamed or removed, every affected service, parser, and frontend component produces a clear failure in automated checks.

**Independent Test**: Modify a schema field name, run the full build and test suite, and verify all affected code reports failures.

### Tests

- [x] T076 [test] Write integration test: rename a schema field and verify Python services fail with SchemaValidationError `shared/schemas/tests/test_validation.py`
- [x] T077 [P][test] Write integration test: add required field and verify constructors without it fail `shared/schemas/tests/test_validation.py`

### Implementation

- [x] T078 Verify full project build (`task verify`) catches schema field rename across all packages
- [x] T079 Document schema evolution safety net in quickstart.md `specs/115-schema-validated-tool-io/quickstart.md`

**Checkpoint**: Schema changes are surfaced across the full stack — Python validation errors, TypeScript compiler errors, and test failures all point to affected code.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Evidence collection, documentation, media content, and PR creation.

### Cross-Cutting

- [x] T080 Run `task verify` across entire monorepo to confirm no regressions
- [x] T081 Run quickstart.md validation — verify all examples in quickstart work `specs/115-schema-validated-tool-io/quickstart.md`

### Evidence Collection

- [x] T082 Capture test results using template (.specify/templates/evidence/test-summary-template.md) `specs/115-schema-validated-tool-io/evidence/test-summary.md`
- [x] T083 Create usage demonstration showing validate_feature() catching invalid data `specs/115-schema-validated-tool-io/evidence/usage-example.md`
- [x] T084 [P] Capture round-trip proof (Python → JSON → TypeScript → JSON) for provenance fields `specs/115-schema-validated-tool-io/evidence/round-trip-evidence.md`
- [x] T085 [P] Capture sample tool request JSON showing schema-validated input `specs/115-schema-validated-tool-io/evidence/sample-request.json`
- [x] T086 [P] Capture sample tool response JSON showing schema-validated output `specs/115-schema-validated-tool-io/evidence/sample-response.json`

### Media Content

- [x] T087 Create shipped blog post `specs/115-schema-validated-tool-io/media/shipped-post.md`
- [x] T088 [P] Create LinkedIn shipped summary `specs/115-schema-validated-tool-io/media/linkedin-shipped.md`

### PR Creation

- [ ] T089 Create PR and publish blog: run /speckit.pr

**Task T089 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundation)**: Depends on Phase 1 — schema prerequisites must be in place
- **Phase 3 (US1 — Tool Output Validation)**: Depends on Phase 2 — needs validation infrastructure
- **Phase 4 (US2 — Enum Validation)**: Depends on Phase 2 — needs resolve_enum_values()
- **Phase 5 (US3 — Tool Input Validation)**: Depends on Phase 2 — needs validate_features()
- **Phase 6 (US4 — Parser Validation)**: Depends on Phase 2 — needs validate_features()
- **Phase 7 (US5 — Catalog Validation)**: Depends on Phase 2 — needs validate_features()
- **Phase 8 (US6 — Frontend Types)**: Depends on Phase 1 — needs TypeScript type fix only
- **Phase 9 (US7 — Schema Evolution)**: Depends on Phases 3-8 — validates the full stack
- **Phase 10 (Polish)**: Depends on all previous phases

### User Story Independence

- **US1 (Phase 3)**, **US2 (Phase 4)**, **US3 (Phase 5)** all target the calc service but can be implemented sequentially within it
- **US4 (Phase 6)** targets IO service — independent of calc service phases
- **US5 (Phase 7)** targets STAC service — independent of calc and IO phases
- **US6 (Phase 8)** targets frontends — independent of all Python service phases (only needs Phase 1)
- **US7 (Phase 9)** is a cross-cutting verification — depends on all others

### Parallel Opportunities

After Phase 2 completes, the following can run in parallel:
- **Phases 3+4+5** (calc service: output, enum, input validation) — same service, sequential recommended
- **Phase 6** (IO service) — independent, can parallelize with calc work
- **Phase 7** (STAC service) — independent, can parallelize with calc and IO work
- **Phase 8** (frontend) — independent, can parallelize with all Python work (only needs Phase 1)

### Within Each Phase

- Tests MUST be written and FAIL before implementation
- Models/types before services
- Core implementation before integration
- Full test suite run before checkpoint

---

## Parallel Example: After Phase 2

```bash
# These phases can run in parallel (different services, no dependencies):

# Developer A: Calc service (Phases 3-5)
Task: "Integrate schema validation for tool outputs in executor"
Task: "Replace hardcoded valid_symbols with schema enum"
Task: "Integrate schema validation for tool inputs in executor"

# Developer B: IO service (Phase 6)
Task: "Replace Feature = Any with schema union type"
Task: "Add schema validation after parse() in base handler"

# Developer C: STAC service (Phase 7)
Task: "Replace untyped GeoJSON aliases with schema types"
Task: "Add schema validation on feature write"

# Developer D: Frontend (Phase 8)
Task: "Replace SafeFeature with schema types in stacService"
Task: "Remove as unknown casts in flattenFeatures"
```

---

## Implementation Strategy

### Incremental Delivery

1. Complete Phase 1 (Setup) → Schema extended, regenerated
2. Complete Phase 2 (Foundation) → Validation infrastructure ready
3. Add US1 (Phase 3) → Tool outputs validated — catches field mismatch bugs
4. Add US2 (Phase 4) → Enum parameters validated from schema
5. Add US3 (Phase 5) → Tool inputs validated at boundary
6. Add US4 (Phase 6) → Parser outputs validated — features born correctly
7. Add US5 (Phase 7) → Catalog validates on read/write — persistence safe
8. Add US6 (Phase 8) → Frontend uses shared types — compile-time safety
9. Add US7 (Phase 9) → Schema evolution verified across full stack
10. Polish (Phase 10) → Evidence, media, PR

Each phase adds value without breaking previous phases. The calc service phases (3-5) are ordered by impact: output validation first (catches the exact bug class from ADR-008), then enum validation, then input validation.
