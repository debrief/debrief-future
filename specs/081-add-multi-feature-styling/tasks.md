# Tasks: Add MultiPoint and MultiPolygon Feature Schemas

**Input**: Design documents from `/specs/081-add-multi-feature-styling/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are REQUIRED — the spec mandates golden fixture validation, round-trip tests, and schema comparison tests (FR-009 through FR-011, SC-001 through SC-004).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

**Evidence Directory**: `specs/081-add-multi-feature-styling/evidence/`
**Media Directory**: `specs/081-add-multi-feature-styling/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | pytest + tsc results with pass/fail counts | After all tests pass |
| usage-example.md | Python code creating and validating MultiPoint/MultiPolygon Features | After schema generation complete |
| sample-multipoint.json | Valid MultiPoint Feature JSON output | After fixtures created |
| sample-multipolygon.json | Valid MultiPolygon Feature JSON output | After fixtures created |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | During /speckit.plan |
| media/linkedin-planning.md | LinkedIn summary for planning | During /speckit.plan |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify the existing schema pipeline works before making changes

- [x] T001 Verify existing tests pass: run `uv run pytest tests/ -v` in `shared/schemas/`
- [x] T002 Verify existing generation works: run `make generate` in `shared/schemas/`
- [x] T003 Verify TypeScript compilation: run `pnpm exec tsc --noEmit` in `shared/schemas/`

**Checkpoint**: Baseline confirmed — existing schema infrastructure is healthy

---

## Phase 2: Foundation (Blocking Prerequisites)

**Purpose**: Add the new enum values and geometry classes that ALL feature types depend on

**CRITICAL**: No feature type work can begin until geometry classes and enum values exist

- [x] T004 Add MULTI_POINT and MULTI_POLYGON to FeatureKindEnum `shared/schemas/src/linkml/common.yaml`
- [x] T005 Add GeoJSONMultiPoint geometry class `shared/schemas/src/linkml/geojson.yaml`
- [x] T006 [P] Add GeoJSONMultiPolygon geometry class `shared/schemas/src/linkml/geojson.yaml`
- [x] T007 Run LinkML validation: `make validate-linkml` in `shared/schemas/`

**Checkpoint**: Foundation ready — enum values and geometry classes exist in LinkML

---

## Phase 3: User Story 1 — Tool Returns MultiPoint Result (Priority: P1) MVP

**Goal**: Enable tools to return MultiPoint results as validated, styled GeoJSON Features

**Independent Test**: Create a MultiPoint Feature with PointProperties styling, validate against schema, confirm round-trip serialisation

### Tests for User Story 1 (Golden Fixtures)

> **NOTE: Write fixtures FIRST — they define the expected valid/invalid shapes**

- [x] T008 [P] [US1] Create valid MultiPoint fixture with full properties `shared/schemas/src/fixtures/valid/multi-point-feature-valid-01.json`
- [x] T009 [P] [US1] Create valid MultiPoint fixture with provenance fields `shared/schemas/src/fixtures/valid/multi-point-feature-valid-02.json`
- [x] T010 [P] [US1] Create invalid MultiPoint fixture missing style `shared/schemas/src/fixtures/invalid/multi-point-feature-missing-style.json`
- [x] T011 [P] [US1] Create invalid MultiPoint fixture with wrong kind `shared/schemas/src/fixtures/invalid/multi-point-feature-invalid-kind.json`

### Implementation for User Story 1

- [x] T012 [US1] Add MultiPointFeatureProperties class `shared/schemas/src/linkml/geojson.yaml`
- [x] T013 [US1] Add MultiPointFeature class `shared/schemas/src/linkml/geojson.yaml`
- [x] T014 [US1] Run schema generation: `make generate` in `shared/schemas/`
- [x] T015 [US1] Add MultiPointFeature to entity_types in generation script `shared/schemas/scripts/generate.py`
- [x] T016 [US1] Re-run generation to produce per-entity JSON Schema: `make generate` in `shared/schemas/`
- [x] T017 [US1] Add MultiPointFeature import and ENTITY_MAP entry to test_golden.py `shared/schemas/tests/test_golden.py`
- [x] T018 [US1] Add multi-point-feature to nested_coord_types in test_golden.py `shared/schemas/tests/test_golden.py`
- [x] T019 [US1] Run golden fixture tests: `uv run pytest tests/test_golden.py -v` in `shared/schemas/`
- [x] T020 [US1] Verify TypeScript compilation: `pnpm exec tsc --noEmit` in `shared/schemas/`

**Checkpoint**: MultiPoint Features validated by golden fixtures in Python, generated as JSON Schema and TypeScript

---

## Phase 4: User Story 2 — Tool Returns MultiPolygon Result (Priority: P1)

**Goal**: Enable tools to return MultiPolygon results as validated, styled GeoJSON Features

**Independent Test**: Create a MultiPolygon Feature with PolygonProperties styling, validate against schema, confirm round-trip serialisation

### Tests for User Story 2 (Golden Fixtures)

> **NOTE: Write fixtures FIRST — they define the expected valid/invalid shapes**

- [x] T021 [P] [US2] Create valid MultiPolygon fixture with full properties `shared/schemas/src/fixtures/valid/multi-polygon-feature-valid-01.json`
- [x] T022 [P] [US2] Create valid MultiPolygon fixture with holes and provenance `shared/schemas/src/fixtures/valid/multi-polygon-feature-valid-02.json`
- [x] T023 [P] [US2] Create invalid MultiPolygon fixture missing style `shared/schemas/src/fixtures/invalid/multi-polygon-feature-missing-style.json`
- [x] T024 [P] [US2] Create invalid MultiPolygon fixture with wrong kind `shared/schemas/src/fixtures/invalid/multi-polygon-feature-invalid-kind.json`

### Implementation for User Story 2

- [x] T025 [US2] Add MultiPolygonFeatureProperties class `shared/schemas/src/linkml/geojson.yaml`
- [x] T026 [US2] Add MultiPolygonFeature class `shared/schemas/src/linkml/geojson.yaml`
- [x] T027 [US2] Run schema generation: `make generate` in `shared/schemas/`
- [x] T028 [US2] Add MultiPolygonFeature to entity_types in generation script `shared/schemas/scripts/generate.py`
- [x] T029 [US2] Re-run generation to produce per-entity JSON Schema: `make generate` in `shared/schemas/`
- [x] T030 [US2] Add MultiPolygonFeature import and ENTITY_MAP entry to test_golden.py `shared/schemas/tests/test_golden.py`
- [x] T031 [US2] Add multi-polygon-feature to nested_coord_types in test_golden.py `shared/schemas/tests/test_golden.py`
- [x] T032 [US2] Run golden fixture tests: `uv run pytest tests/test_golden.py -v` in `shared/schemas/`
- [x] T033 [US2] Verify TypeScript compilation: `pnpm exec tsc --noEmit` in `shared/schemas/`

**Checkpoint**: MultiPolygon Features validated by golden fixtures in Python, generated as JSON Schema and TypeScript

---

## Phase 5: User Story 3 — Schema Generation and Adherence (Priority: P2)

**Goal**: Verify all generators produce valid output and all existing tests still pass (zero regressions)

**Independent Test**: Run full test suite (golden fixtures, round-trip, schema comparison) and verify all pass

### Implementation for User Story 3

- [x] T034 [US3] Update FeatureKindEnum expected values in test_schema_compare.py `shared/schemas/tests/test_schema_compare.py`
- [x] T035 [US3] Run full Python test suite: `uv run pytest tests/ -v` in `shared/schemas/`
- [x] T036 [US3] Run TypeScript compilation check: `pnpm exec tsc --noEmit` in `shared/schemas/`
- [x] T037 [US3] Verify existing fixtures still pass (zero regressions): review test output for all entity types
- [x] T038 [US3] Verify generated Pydantic models include all new classes: inspect `shared/schemas/src/generated/python/debrief_schemas/__init__.py`
- [x] T039 [US3] Verify generated JSON Schema includes all new definitions: inspect `shared/schemas/src/generated/json-schema/debrief.schema.json`
- [x] T040 [US3] Verify generated TypeScript includes all new interfaces: inspect `shared/schemas/src/generated/typescript/types.ts`

**Checkpoint**: Full schema pipeline validated — all existing tests pass, all new types generated correctly

---

## Phase 6: User Story 4 — Mixed-Geometry Tool Results (Priority: P3)

**Goal**: Validate that new multi-geometry types compose correctly with existing types in a FeatureCollection

**Independent Test**: Construct a FeatureCollection with mixed feature types (Point, MultiPoint, Polygon, MultiPolygon) and validate each feature independently

### Implementation for User Story 4

- [x] T041 [US4] Create edge case fixture: MultiPoint with single point `shared/schemas/src/fixtures/valid/multi-point-feature-single-point.json`
- [x] T042 [P] [US4] Create edge case fixture: MultiPolygon with polygon containing holes `shared/schemas/src/fixtures/valid/multi-polygon-feature-with-holes.json`
- [x] T043 [US4] Run golden fixture tests to verify edge cases: `uv run pytest tests/test_golden.py -v` in `shared/schemas/`

**Checkpoint**: Mixed-geometry composition validated with edge cases

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Evidence collection, documentation, and PR preparation

### Evidence Collection (REQUIRED)

- [x] T044 Create evidence directory `specs/081-add-multi-feature-styling/evidence/`
- [x] T045 Capture test summary with pass/fail counts `specs/081-add-multi-feature-styling/evidence/test-summary.md`
- [x] T046 Record usage example demonstrating MultiPoint/MultiPolygon feature creation `specs/081-add-multi-feature-styling/evidence/usage-example.md`
- [x] T047 [P] Copy sample valid MultiPoint fixture to evidence `specs/081-add-multi-feature-styling/evidence/sample-multipoint.json`
- [x] T048 [P] Copy sample valid MultiPolygon fixture to evidence `specs/081-add-multi-feature-styling/evidence/sample-multipolygon.json`

### Quickstart Validation

- [x] T049 Run quickstart.md steps to verify implementation guide accuracy

### Media Content

- [x] T050 Create shipped blog post `specs/081-add-multi-feature-styling/media/shipped-post.md`
- [x] T051 [P] Create LinkedIn shipped summary `specs/081-add-multi-feature-styling/media/linkedin-shipped.md`

### PR Creation

- [x] T052 Create PR and publish blog: run /speckit.pr

**Task T052 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundation (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **US1: MultiPoint (Phase 3)**: Depends on Phase 2 completion
- **US2: MultiPolygon (Phase 4)**: Depends on Phase 2 completion, can run in parallel with Phase 3
- **US3: Adherence (Phase 5)**: Depends on Phases 3 AND 4 (needs all new types to exist)
- **US4: Mixed Geometry (Phase 6)**: Depends on Phases 3 AND 4 (needs all feature types)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundation — no dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundation — no dependencies on other stories, can run in PARALLEL with US1
- **User Story 3 (P2)**: Depends on US1 AND US2 (tests all types together)
- **User Story 4 (P3)**: Depends on US1 AND US2 (needs all types for mixed-geometry testing)

### Within Each User Story

- Golden fixtures MUST be written FIRST (define expected shapes)
- LinkML schema changes before generation
- Generation before test infrastructure updates
- Test infrastructure updates before running tests
- All tests must pass before checkpoint

### Parallel Opportunities

- T005 and T006 (geometry classes) can run in parallel — different sections of same file
- T008-T011 (US1 fixtures) can all run in parallel — different files
- T021-T024 (US2 fixtures) can all run in parallel — different files
- Phase 3 (US1) and Phase 4 (US2) can run in parallel after Foundation
- T047 and T048 (evidence copies) can run in parallel
- T050 and T051 (media content) can run in parallel

---

## Parallel Example: User Stories 1 & 2

```bash
# After Phase 2 (Foundation) completes, US1 and US2 can proceed simultaneously:

# Thread 1: User Story 1 (MultiPoint)
Task: "Create valid MultiPoint fixture" (T008)
Task: "Create invalid MultiPoint fixture" (T010, T011)
Task: "Add MultiPointFeatureProperties class" (T012)
# ...continues through T020

# Thread 2: User Story 2 (MultiPolygon)
Task: "Create valid MultiPolygon fixture" (T021)
Task: "Create invalid MultiPolygon fixture" (T023, T024)
Task: "Add MultiPolygonFeatureProperties class" (T025)
# ...continues through T033
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup — verify existing pipeline healthy
2. Complete Phase 2: Foundation — enum values + geometry classes
3. Complete Phase 3: User Story 1 — MultiPoint Feature
4. **STOP and VALIDATE**: Golden fixtures pass, TypeScript compiles
5. This alone unblocks tools returning multi-point results

### Incremental Delivery

1. Complete Setup + Foundation -- baseline confirmed
2. Add User Story 1 (MultiPoint) -- test independently -- MVP!
3. Add User Story 2 (MultiPolygon) -- test independently -- both multi-geometry types covered
4. Add User Story 3 (Adherence) -- full test suite validation -- zero regressions confirmed
5. Add User Story 4 (Mixed geometry) -- edge cases covered -- production ready
6. Polish phase -- evidence, media, PR

### Practical Note

Since US1 and US2 are both P1 and share the same structural pattern, implementing them together in sequence (Phase 3 then Phase 4) is the most efficient approach for a single developer. The parallel option exists if two developers are available.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each phase or logical group
- Stop at any checkpoint to validate story independently
- **Evidence is required** — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
- This is a schema-only feature — no UI components, no Storybook, no e2e tests
