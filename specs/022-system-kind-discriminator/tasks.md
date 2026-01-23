# Tasks: SYSTEM Kind Discriminator

**Input**: Design documents from `/specs/022-system-kind-discriminator/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

---

## Evidence Requirements

**Evidence Directory**: `specs/022-system-kind-discriminator/evidence/`
**Media Directory**: `specs/022-system-kind-discriminator/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | pytest results with fixture validation | After all tests pass |
| usage-example.md | Python code creating/validating SYSTEM features | After schema generation works |
| sample-temporal.json | Example temporal viewport SYSTEM feature | After fixtures created |
| sample-spatial.json | Example spatial viewport SYSTEM feature | After fixtures created |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | During /speckit.plan ✅ |
| media/linkedin-planning.md | LinkedIn summary for planning | During /speckit.plan ✅ |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup

**Purpose**: Verify existing schema infrastructure works

- [ ] T001 Verify schema package builds: run `make generate` in `shared/schemas/`
- [ ] T002 Verify existing tests pass: run `make test` in `shared/schemas/`

**Checkpoint**: Schema package confirmed working, ready for modifications

---

## Phase 2: Foundation - Schema Changes

**Purpose**: Add SYSTEM kind to LinkML schema (blocks all user story validation)

**⚠️ CRITICAL**: No fixtures or tests can be added until schema is updated and regenerated

- [ ] T003 Add SYSTEM to FeatureKindEnum `shared/schemas/src/linkml/common.yaml`
- [ ] T004 Add SystemStateTypeEnum (temporal, spatial, selection) `shared/schemas/src/linkml/common.yaml`
- [ ] T005 Add SystemStateProperties class `shared/schemas/src/linkml/geojson.yaml`
- [ ] T006 Add TemporalViewportProperties class `shared/schemas/src/linkml/geojson.yaml`
- [ ] T007 [P] Add SpatialViewportProperties class `shared/schemas/src/linkml/geojson.yaml`
- [ ] T008 [P] Add SelectionStateProperties class `shared/schemas/src/linkml/geojson.yaml`
- [ ] T009 Add SystemState feature class with null geometry `shared/schemas/src/linkml/geojson.yaml`
- [ ] T010 Regenerate all schemas: run `make generate` in `shared/schemas/`
- [ ] T011 Verify no regressions: run `make test` in `shared/schemas/`

**Checkpoint**: SYSTEM kind in schema, all generated outputs include it, existing tests still pass

---

## Phase 3: User Story 1 - Viewport State (Priority: P1) 🎯 MVP

**Goal**: Enable storage/retrieval of temporal and spatial viewport state as SYSTEM features

**Independent Test**: Create valid SYSTEM features for temporal/spatial viewports and validate against schema

### Implementation for User Story 1

- [ ] T012 [P] [US1] Create valid temporal viewport fixture `shared/schemas/src/fixtures/valid/system-state-temporal-01.json`
- [ ] T013 [P] [US1] Create valid spatial viewport fixture `shared/schemas/src/fixtures/valid/system-state-spatial-01.json`
- [ ] T014 [US1] Update test_golden.py ENTITY_MAP with SystemState `shared/schemas/tests/test_golden.py`
- [ ] T015 [US1] Run validation tests: `make test` in `shared/schemas/`

**Checkpoint**: Temporal and spatial viewport SYSTEM features validate successfully

---

## Phase 4: User Story 2 - Selection State (Priority: P2)

**Goal**: Enable storage/retrieval of feature selection state as SYSTEM features

**Independent Test**: Create valid SYSTEM feature for selection state and validate against schema

### Implementation for User Story 2

- [ ] T016 [US2] Create valid selection state fixture `shared/schemas/src/fixtures/valid/system-state-selection-01.json`
- [ ] T017 [US2] Run validation tests: `make test` in `shared/schemas/`

**Checkpoint**: Selection state SYSTEM features validate successfully

---

## Phase 5: User Story 3 - Schema Validation (Priority: P3)

**Goal**: Ensure schema correctly rejects invalid SYSTEM features

**Independent Test**: Create invalid SYSTEM feature fixtures and verify validation rejects them

### Implementation for User Story 3

- [ ] T018 [P] [US3] Create invalid fixture (non-null geometry) `shared/schemas/src/fixtures/invalid/system-state-invalid-geometry.json`
- [ ] T019 [P] [US3] Create invalid fixture (wrong ID pattern) `shared/schemas/src/fixtures/invalid/system-state-invalid-id.json`
- [ ] T020 [US3] Run validation tests: `make test` in `shared/schemas/`

**Checkpoint**: Invalid SYSTEM features correctly rejected by schema validation

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, evidence collection, and PR creation

### Documentation

- [ ] T021 Update shared/schemas/README.md with SYSTEM kind documentation

### Evidence Collection (REQUIRED)

- [ ] T022 Create evidence directory `specs/022-system-kind-discriminator/evidence/`
- [ ] T023 Capture test summary in `specs/022-system-kind-discriminator/evidence/test-summary.md`
- [ ] T024 Create usage example in `specs/022-system-kind-discriminator/evidence/usage-example.md`
- [ ] T025 [P] Copy sample temporal fixture to `specs/022-system-kind-discriminator/evidence/sample-temporal.json`
- [ ] T026 [P] Copy sample spatial fixture to `specs/022-system-kind-discriminator/evidence/sample-spatial.json`

### Media Content

- [ ] T027 Create shipped blog post `specs/022-system-kind-discriminator/media/shipped-post.md`
- [ ] T028 [P] Create LinkedIn shipped summary `specs/022-system-kind-discriminator/media/linkedin-shipped.md`

### PR Creation

- [ ] T029 Create PR and publish blog: run /speckit.pr

**Task T029 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - validates environment
- **Foundation (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundation (schema must be generated)
- **User Story 2 (Phase 4)**: Depends on Foundation (can run in parallel with US1)
- **User Story 3 (Phase 5)**: Depends on Foundation (can run in parallel with US1/US2)
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundation - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundation - Independent of US1
- **User Story 3 (P3)**: Can start after Foundation - Independent of US1/US2

### Parallel Opportunities

Within Phase 2 (Foundation):
- T006, T007, T008 can run in parallel (different property classes)

Within Phase 3 (US1):
- T012, T013 can run in parallel (different fixture files)

Within Phase 5 (US3):
- T018, T019 can run in parallel (different invalid fixtures)

Within Phase 6 (Polish):
- T025, T026 can run in parallel (copy operations)
- T028 can run in parallel with T027 (different media files)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (verify environment)
2. Complete Phase 2: Foundation (schema changes + regeneration)
3. Complete Phase 3: User Story 1 (temporal + spatial viewports)
4. **STOP and VALIDATE**: SYSTEM features for viewports work
5. Can ship MVP with just viewport state persistence

### Full Delivery

1. Setup → Foundation → US1 (MVP)
2. Add US2 (selection state) → Test independently
3. Add US3 (invalid fixture tests) → Test independently
4. Polish phase → Evidence + Media → PR

---

## Notes

- This is a schema-only feature - no runtime code changes
- All changes are in `shared/schemas/` package
- Regeneration step (T010) is critical - must run after all LinkML changes
- Existing tests (T011) must pass before adding new fixtures
- Evidence will show test output + sample JSON fixtures
