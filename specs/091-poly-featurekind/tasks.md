# Tasks: [E05] Add POLY FeatureKind for Arbitrary Polygons

**Input**: Design documents from `specs/091-poly-featurekind/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

---

## Evidence Requirements

**Evidence Directory**: `specs/091-poly-featurekind/evidence/`
**Media Directory**: `specs/091-poly-featurekind/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | pytest + tsc results with pass/fail counts | After all tests pass |
| usage-example.md | Python code validating a POLY feature against generated model | After schema generation |
| sample-poly-output.json | Valid POLY GeoJSON feature from build_polygon() | After fixtures created |

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

**Purpose**: No project scaffolding needed — changes are within existing `shared/schemas` workspace.

- [ ] T001 Verify schema generation pipeline works: `cd shared/schemas && make generate` `shared/schemas/Makefile`
- [ ] T002 Run existing tests to establish baseline: `cd shared/schemas && make test` `shared/schemas/tests/test_golden.py`

**Checkpoint**: Baseline green — existing schema generates and tests pass.

---

## Phase 2: Foundation — Schema Definition (Blocking)

**Purpose**: Add POLY enum value and annotation classes to LinkML schema. ALL user stories depend on this.

- [ ] T003 Add POLY to FeatureKindEnum in `shared/schemas/src/linkml/common.yaml`
- [ ] T004 Add PolyAnnotationProperties class in `shared/schemas/src/linkml/annotations.yaml`
- [ ] T005 Add PolyAnnotation class in `shared/schemas/src/linkml/annotations.yaml`
- [ ] T006 Regenerate all derived types: `cd shared/schemas && make generate` `shared/schemas/src/generated/python/debrief_schemas/__init__.py`
- [ ] T007 Verify POLY appears in generated Pydantic enum `shared/schemas/src/generated/python/debrief_schemas/__init__.py`
- [ ] T008 [P] Verify POLY appears in generated TypeScript types `shared/schemas/src/generated/typescript/types.ts`
- [ ] T009 [P] Verify PolyAnnotation JSON Schema generated `shared/schemas/src/generated/json-schema/PolyAnnotation.schema.json`

**Checkpoint**: Schema defined and types generated — fixture and test work can begin.

---

## Phase 3: User Story 1 + 2 — POLY Fixtures & Schema Adherence (Priority: P1)

**Goal**: Create golden fixtures for POLY annotations and wire them into the test runner so schema validation is proven end-to-end.

**Independent Test**: Run `cd shared/schemas && make test` — POLY fixtures pass validation, invalid fixtures raise errors, all existing tests still green.

### Fixtures

- [ ] T010 [P] Create valid simple polygon fixture (4 vertices) `shared/schemas/src/fixtures/valid/poly-annotation-valid-01.json`
- [ ] T011 [P] Create valid complex polygon fixture (8+ vertices) `shared/schemas/src/fixtures/valid/poly-annotation-valid-02.json`
- [ ] T012 [P] Create invalid fixture: wrong kind value `shared/schemas/src/fixtures/invalid/poly-annotation-invalid-kind.json`
- [ ] T013 [P] Create invalid fixture: missing style property `shared/schemas/src/fixtures/invalid/poly-annotation-missing-style.json`

### Test Runner Update

- [ ] T014 Add PolyAnnotation import and ENTITY_MAP entry in `shared/schemas/tests/test_golden.py`
- [ ] T015 Add poly-annotation to nested_coord_types set in `shared/schemas/tests/test_golden.py`

### Validation

- [ ] T016 Run full test suite: `cd shared/schemas && make test` — zero regressions, POLY fixtures pass
- [ ] T017 Verify build_polygon() IO output matches PolyAnnotation model (manual check or script)

**Checkpoint**: POLY is fully schema-validated with golden fixtures. User Stories 1 and 2 are both satisfied.

---

## Phase 4: User Story 3 — Confirm LINE Supports Polylines (Priority: P2)

**Goal**: Confirm LINE kind handles multi-vertex LineString without a new POLYLINE kind.

**Independent Test**: Validate a 5-point LINE fixture passes LineAnnotation schema validation.

- [ ] T018 Create multi-vertex LINE fixture (5 points) `shared/schemas/src/fixtures/valid/line-annotation-valid-02.json`
- [ ] T019 Run test suite to confirm LINE multi-vertex fixture passes `shared/schemas/tests/test_golden.py`
- [ ] T020 Document LINE polyline confirmation in spec.md or evidence

**Checkpoint**: LINE confirmed to support polylines. No POLYLINE kind needed for E05.

---

## Phase 5: Polish & Cross-Cutting Concerns

### Evidence Collection

- [ ] T021 Create evidence directory `specs/091-poly-featurekind/evidence/`
- [ ] T022 Capture test results in `specs/091-poly-featurekind/evidence/test-summary.md`
- [ ] T023 Create usage demonstration in `specs/091-poly-featurekind/evidence/usage-example.md`
- [ ] T024 [P] Copy sample POLY fixture to `specs/091-poly-featurekind/evidence/sample-poly-output.json`

### Media Content

- [ ] T025 Create shipped blog post in `specs/091-poly-featurekind/media/shipped-post.md`
- [ ] T026 [P] Create LinkedIn shipped summary in `specs/091-poly-featurekind/media/linkedin-shipped.md`

### PR Creation

- [ ] T027 Create PR and publish blog: run /speckit.pr

**Task T027 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — verify baseline
- **Phase 2 (Foundation)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1+US2 POLY fixtures)**: Depends on Phase 2 (schema must exist before fixtures)
- **Phase 4 (US3 LINE polyline)**: Depends on Phase 1 only (no POLY schema needed), can run in parallel with Phase 3
- **Phase 5 (Polish)**: Depends on Phases 3 and 4 completion

### Parallel Opportunities

- T007, T008, T009 — verify generated outputs in parallel
- T010, T011, T012, T013 — all fixture files can be created in parallel
- T014, T015 — test runner updates to same file, do sequentially
- T018 can run in parallel with Phase 3 (independent LINE fixture)
- T024, T026 — evidence/media tasks in parallel

---

## Implementation Strategy

### MVP First (Phase 1 + 2 + 3)

1. Verify baseline (Phase 1)
2. Add POLY to schema + regenerate (Phase 2)
3. Create fixtures + wire tests (Phase 3)
4. **STOP and VALIDATE**: `make test` passes with zero regressions

### Full Delivery

5. Add LINE multi-vertex fixture (Phase 4)
6. Collect evidence + create media (Phase 5)
7. Create PR via /speckit.pr (T027)

---

## Notes

- All tasks are within `shared/schemas/` — no cross-package changes
- Generated files (Pydantic, JSON Schema, TypeScript) are auto-produced by `make generate` — never hand-edit
- The PolyAnnotation pattern mirrors CircleAnnotation/RectangleAnnotation exactly (plus vertex_count)
- Commit after each logical group (schema change, fixtures, test updates)
