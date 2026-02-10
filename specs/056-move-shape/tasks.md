# Tasks: Move Shape Tool Spec

**Input**: Design documents from `/specs/056-move-shape/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Tests**: Not applicable — this is a specification-only feature (markdown + JSON fixtures). Validation is via golden I/O fixture structure checks.

**Organization**: Tasks are grouped by user story. Each story adds annotation kinds to the tool spec and corresponding golden examples.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the tool specification is complete, consistent, and follows the #049 template.

**Evidence Directory**: `specs/056-move-shape/evidence/`
**Media Directory**: `specs/056-move-shape/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Validation checklist confirming all 9 sections present, golden JSON valid | After spec complete |
| usage-example.md | Walkthrough of the spec showing algorithm applied to a circle annotation | After algorithm section complete |
| golden-validation.md | JSON schema validation results for golden I/O files | After golden examples complete |

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

**Purpose**: Create the directory and spec file skeleton

- [ ] T001 Create tool spec directory `shared/tools/shape/manipulation/`
- [ ] T002 Create spec file skeleton with YAML front matter and all 9 section headings `shared/tools/shape/manipulation/move-shape.1.0.md`

**Checkpoint**: Directory exists, spec file has correct front matter (`name: move-shape`, `version: 1.0`, `category: shape/manipulation`, `status: draft`) and all 9 empty sections.

---

## Phase 2: Foundation (Blocking Prerequisites)

**Purpose**: Write the shared sections that all user stories depend on — metadata, MCP description, inputs, outputs, and the core great-circle destination helper

- [ ] T003 Write MCP section with tool description, when-to-use, parameters (`direction`, `distance_km`), and returns `shared/tools/shape/manipulation/move-shape.1.0.md`
- [ ] T004 [P] Write Inputs section with schema references to `annotations.yaml`, constraints, and defaults `shared/tools/shape/manipulation/move-shape.1.0.md`
- [ ] T005 [P] Write Outputs section with ToolResponse format, result type `mutation/shape/translated`, and annotation fields `shared/tools/shape/manipulation/move-shape.1.0.md`
- [ ] T006 Write Algorithm section: `translate_point` helper function using Vincenty destination formula (lat, lon, bearing, distance → lat2, lon2) with longitude normalisation `shared/tools/shape/manipulation/move-shape.1.0.md`
- [ ] T007 Write Algorithm section: main `move_shape` function skeleton — input validation, feature loop, kind dispatch, response builder `shared/tools/shape/manipulation/move-shape.1.0.md`

**Checkpoint**: Spec has complete MCP, Inputs, Outputs sections. Algorithm has the `translate_point` helper and `move_shape` skeleton ready for kind-specific branches.

---

## Phase 3: User Story 1 — Translate Polygon Annotations (Priority: P1)

**Goal**: Add algorithm branches for CIRCLE and RECTANGLE kinds, plus the first golden I/O example pair.

**Independent Test**: Golden input is a valid FeatureCollection with a CircleAnnotation; golden output is a valid ToolResponse with all vertices and `center` property translated.

### Implementation for User Story 1

- [ ] T008 [US1] Add CIRCLE branch to algorithm: translate all polygon vertices + update `center` property `shared/tools/shape/manipulation/move-shape.1.0.md`
- [ ] T009 [P] [US1] Add RECTANGLE branch to algorithm: translate all polygon vertices `shared/tools/shape/manipulation/move-shape.1.0.md`
- [ ] T010 [US1] Create golden input file: CircleAnnotation at [0, 50], direction=90, distance=5 km `shared/tools/shape/manipulation/move-shape.basic-polygon.input.json`
- [ ] T011 [US1] Create golden output file: ToolResponse with translated circle (compute expected coordinates using Vincenty formula) `shared/tools/shape/manipulation/move-shape.basic-polygon.output.json`

**Checkpoint**: Algorithm covers CIRCLE and RECTANGLE. Golden example pair `move-shape.basic-polygon.*` validates polygon translation with `center` property update.

---

## Phase 4: User Story 2 — Translate Line and Vector Annotations (Priority: P2)

**Goal**: Add algorithm branches for LINE and VECTOR kinds, plus the second golden I/O example pair.

**Independent Test**: Golden input is a VectorAnnotation; golden output shows `origin` updated and geometry translated, with `range` and `bearing` preserved.

### Implementation for User Story 2

- [ ] T012 [US2] Add LINE branch to algorithm: translate all LineString coordinates `shared/tools/shape/manipulation/move-shape.1.0.md`
- [ ] T013 [US2] Add VECTOR branch to algorithm: translate geometry + update `origin`, preserve `range` and `bearing` `shared/tools/shape/manipulation/move-shape.1.0.md`
- [ ] T014 [US2] Create golden input file: VectorAnnotation at [0, 50], direction=0 (North), distance=10 km `shared/tools/shape/manipulation/move-shape.vector.input.json`
- [ ] T015 [US2] Create golden output file: ToolResponse with translated vector (origin shifted, range/bearing unchanged) `shared/tools/shape/manipulation/move-shape.vector.output.json`

**Checkpoint**: Algorithm covers all 4 geometry-bearing kinds (CIRCLE, RECTANGLE, LINE, VECTOR). Golden example pair `move-shape.vector.*` validates `origin` update and `range`/`bearing` preservation.

---

## Phase 5: User Story 3 — Translate Text and Point Annotations (Priority: P3)

**Goal**: Add algorithm branch for TEXT kind (single Point geometry).

**Independent Test**: Can be verified by reading the algorithm pseudocode and confirming it dispatches Point coordinates through `translate_point`.

### Implementation for User Story 3

- [ ] T016 [US3] Add TEXT branch to algorithm: translate Point coordinate `shared/tools/shape/manipulation/move-shape.1.0.md`

**Checkpoint**: Algorithm now covers all 5 annotation kinds (CIRCLE, RECTANGLE, LINE, TEXT, VECTOR). SC-003 satisfied.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Complete remaining spec sections, edge cases, validate golden examples, collect evidence, create media content.

### Spec Completion

- [ ] T017 Write Edge Cases table (minimum 5 entries: empty input, zero distance, antimeridian, polar, non-annotations, missing properties) `shared/tools/shape/manipulation/move-shape.1.0.md`
- [ ] T018 [P] Write inline Examples section with abbreviated input/output and references to golden files `shared/tools/shape/manipulation/move-shape.1.0.md`
- [ ] T019 [P] Write Changelog section (1.0 initial release, date) `shared/tools/shape/manipulation/move-shape.1.0.md`
- [ ] T020 [P] Write References section (related tools, schemas, legacy, external links) `shared/tools/shape/manipulation/move-shape.1.0.md`
- [ ] T021 Run quickstart.md validation checklist against completed spec `specs/056-move-shape/quickstart.md`

### Evidence Collection (REQUIRED)

- [ ] T022 Create evidence directory `specs/056-move-shape/evidence/`
- [ ] T023 Capture validation summary confirming all 9 sections, golden JSON validity, edge case coverage `specs/056-move-shape/evidence/test-summary.md`
- [ ] T024 Create usage walkthrough showing algorithm applied step-by-step to the circle golden example `specs/056-move-shape/evidence/usage-example.md`
- [ ] T025 [P] Validate golden I/O JSON files are well-formed and structurally correct `specs/056-move-shape/evidence/golden-validation.md`

### Media Content

- [ ] T026 Create shipped blog post `specs/056-move-shape/media/shipped-post.md`
- [ ] T027 [P] Create LinkedIn shipped summary `specs/056-move-shape/media/linkedin-shipped.md`

### PR Creation

- [ ] T028 Create PR and publish blog: run /speckit.pr

**Task T028 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundation (Phase 2)**: Depends on Phase 1 (T002 creates the file)
- **US1 (Phase 3)**: Depends on Phase 2 (algorithm skeleton + translate_point helper)
- **US2 (Phase 4)**: Depends on Phase 2 (algorithm skeleton). Can run in parallel with US1 (different annotation kinds, different golden files)
- **US3 (Phase 5)**: Depends on Phase 2 (algorithm skeleton). Can run in parallel with US1/US2
- **Polish (Phase 6)**: Depends on Phases 3, 4, 5 (all annotation kinds must be in algorithm before edge cases table)

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2 only — no cross-story dependencies
- **US2 (P2)**: Depends on Phase 2 only — independent of US1
- **US3 (P3)**: Depends on Phase 2 only — independent of US1/US2

### Within Each User Story

- Algorithm branch before golden input file
- Golden input before golden output (output references input structure)

### Parallel Opportunities

- T004 and T005 can run in parallel (different spec sections)
- T008 and T009 can run in parallel (different algorithm branches)
- Phases 3, 4, 5 can run in parallel (different annotation kinds, different golden files)
- T018, T019, T020 can run in parallel (independent spec sections)
- T025 can run in parallel with T023/T024
- T027 can run in parallel with T026

---

## Parallel Example: User Story 1

```bash
# Launch CIRCLE and RECTANGLE branches in parallel:
Task: "Add CIRCLE branch to algorithm"
Task: "Add RECTANGLE branch to algorithm"

# Then golden example pair sequentially:
Task: "Create golden input file (circle)"
Task: "Create golden output file (circle)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (directory + skeleton)
2. Complete Phase 2: Foundation (MCP, Inputs, Outputs, translate_point, main skeleton)
3. Complete Phase 3: User Story 1 (CIRCLE + RECTANGLE + golden example)
4. **STOP and VALIDATE**: Spec has working algorithm for polygons, one golden example pair
5. Can demo the spec structure and golden fixture format

### Incremental Delivery

1. Setup + Foundation → Spec skeleton ready
2. Add US1 → Polygon translation complete → First golden example (MVP)
3. Add US2 → Vector/line translation complete → Second golden example
4. Add US3 → Text/point complete → All 5 kinds covered
5. Polish → Edge cases, evidence, media, PR

---

## Notes

- [P] tasks = different files or different sections, no dependencies
- [US#] label maps task to specific user story
- This is a **spec-only** feature — all tasks produce markdown or JSON, not code
- Golden output JSON must contain pre-computed coordinates from the Vincenty formula
- The spec file is a single markdown file; concurrent edits to different sections are safe
- Commit after each phase completion
- Run `/speckit.pr` (T028) only after all evidence and media tasks are complete
