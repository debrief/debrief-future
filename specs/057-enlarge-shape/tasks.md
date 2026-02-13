# Tasks: Enlarge Shape Tool Spec

**Input**: Design documents from `/specs/057-enlarge-shape/`
**Prerequisites**: plan.md (complete), spec.md (complete), research.md (complete), data-model.md (complete), quickstart.md (complete)

**Tests**: No executable tests — this is a spec-only feature. Validation is via JSON well-formedness and manual coordinate verification against the scaling formula.

**Organization**: Tasks grouped by user story to enable independent implementation. Each story adds golden I/O examples that validate specific scaling scenarios.

---

## Evidence Requirements

**Evidence Directory**: `specs/057-enlarge-shape/evidence/`
**Media Directory**: `specs/057-enlarge-shape/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | JSON validation results, section completeness check | After all spec + golden files created |
| usage-example.md | Walkthrough of scaling formula applied to basic-polygon example | After basic-polygon golden pair created |
| spec-validation.md | 9-section checklist confirming all sections present and non-empty | After spec file complete |

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

**Purpose**: Establish the spec file with metadata and structural sections

- [x] T001 Create tool spec file with YAML frontmatter (Metadata section) `shared/tools/shape/manipulation/enlarge-shape.1.0.md`
- [x] T002 Write MCP section (description, when-to-use, parameters, returns) `shared/tools/shape/manipulation/enlarge-shape.1.0.md`
- [x] T003 Write Inputs section (schema reference, constraints, defaults) `shared/tools/shape/manipulation/enlarge-shape.1.0.md`
- [x] T004 Write Outputs section (ToolResponse schema, result type path, annotations) `shared/tools/shape/manipulation/enlarge-shape.1.0.md`

**Checkpoint**: Spec file exists with first 4 sections complete (Metadata, MCP, Inputs, Outputs)

---

## Phase 2: Foundation — Algorithm & Edge Cases

**Purpose**: Define the core scaling algorithm in pseudocode and document all edge cases. These sections are prerequisites for writing golden examples.

- [x] T005 Write Algorithm section with centroid computation pseudocode `shared/tools/shape/manipulation/enlarge-shape.1.0.md`
- [x] T006 Write Algorithm section for coordinate scaling per annotation kind (CIRCLE, RECTANGLE, LINE, TEXT, VECTOR) `shared/tools/shape/manipulation/enlarge-shape.1.0.md`
- [x] T007 Write Edge Cases table (10+ scenarios from spec.md) `shared/tools/shape/manipulation/enlarge-shape.1.0.md`

**Checkpoint**: Algorithm pseudocode complete — can now compute golden example values

---

## Phase 3: User Story 1 — Scale Shape Up from Centroid (Priority: P1) MVP

**Goal**: Create the basic-polygon golden I/O pair demonstrating core scaling from centroid with default parameters (scale_factor=3.0)

**Independent Test**: Parse both JSON files, verify output coordinates are 3x farther from centroid than input coordinates

### Implementation for User Story 1

- [x] T008 [US1] Compute centroid and scaled coordinates for basic-polygon example (rectangle, factor 3.0)
- [x] T009 [US1] Create golden input file `shared/tools/shape/manipulation/enlarge-shape.basic-polygon.input.json`
- [x] T010 [US1] Create golden output file `shared/tools/shape/manipulation/enlarge-shape.basic-polygon.output.json`
- [x] T011 [US1] Write inline Examples section in spec with basic-polygon walkthrough `shared/tools/shape/manipulation/enlarge-shape.1.0.md`

**Checkpoint**: US1 complete — basic scaling from centroid validated with golden pair

---

## Phase 4: User Story 2 — Scale Shape from Custom Origin (Priority: P2)

**Goal**: Create the custom-origin golden I/O pair demonstrating scaling from an explicit origin point (one vertex fixed)

**Independent Test**: Parse both JSON files, verify the origin vertex is unchanged and other vertices are repositioned relative to it

### Implementation for User Story 2

- [x] T012 [US2] Compute scaled coordinates for custom-origin example (polygon, factor 2.0, explicit origin at vertex)
- [x] T013 [US2] Create golden input file `shared/tools/shape/manipulation/enlarge-shape.custom-origin.input.json`
- [x] T014 [US2] Create golden output file `shared/tools/shape/manipulation/enlarge-shape.custom-origin.output.json`
- [x] T015 [US2] Add golden file references to Examples section `shared/tools/shape/manipulation/enlarge-shape.1.0.md`

**Checkpoint**: US2 complete — custom origin scaling validated with golden pair

---

## Phase 5: User Stories 3 & 4 — No-Op and Shrink (Priority: P3)

**Goal**: Create the noop golden I/O pair (scale_factor=1.0) and add an error response example for negative scale factor

**Independent Test**: Parse noop JSON files, verify output coordinates exactly match input coordinates

### Implementation for User Stories 3 & 4

- [x] T016 [P] [US3] Create golden input file `shared/tools/shape/manipulation/enlarge-shape.noop.input.json`
- [x] T017 [P] [US3] Create golden output file `shared/tools/shape/manipulation/enlarge-shape.noop.output.json`
- [x] T018 [US3] Add noop golden file references to Examples section `shared/tools/shape/manipulation/enlarge-shape.1.0.md`
- [x] T019 [US4] Add error response example for negative scale factor to Examples section `shared/tools/shape/manipulation/enlarge-shape.1.0.md`

**Checkpoint**: All golden examples complete — 3 input/output pairs covering centroid, custom origin, and noop

---

## Phase 6: Spec Completion

**Purpose**: Complete the remaining spec sections (Changelog, References) and validate the full spec

- [x] T020 Write Changelog section (1.0 initial release) `shared/tools/shape/manipulation/enlarge-shape.1.0.md`
- [x] T021 Write References section (move-shape, annotations.yaml, TEMPLATE.md, Wikipedia) `shared/tools/shape/manipulation/enlarge-shape.1.0.md`
- [x] T022 Validate all 9 sections are present and non-empty in the spec
- [x] T023 Validate all 6 golden JSON files parse correctly (well-formed JSON)
- [x] T024 Verify golden output coordinates match hand-computed values from scaling formula

**Checkpoint**: Full spec complete and validated — all 9 sections, 3 golden pairs

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Evidence collection, media content, and PR creation

### Evidence Collection

- [x] T025 Create evidence directory `specs/057-enlarge-shape/evidence/`
- [x] T026 Capture validation results in `specs/057-enlarge-shape/evidence/test-summary.md`
- [x] T027 Create usage example showing scaling formula walkthrough `specs/057-enlarge-shape/evidence/usage-example.md`
- [x] T028 [P] Create spec validation checklist confirming all 9 sections `specs/057-enlarge-shape/evidence/spec-validation.md`

### Media Content

- [x] T029 Create shipped blog post `specs/057-enlarge-shape/media/shipped-post.md`
- [x] T030 [P] Create LinkedIn shipped summary `specs/057-enlarge-shape/media/linkedin-shipped.md`

### PR Creation

- [ ] T031 Create PR and publish blog: run /speckit.pr

**Task T031 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — creates spec file with structural sections
- **Phase 2 (Foundation)**: Depends on Phase 1 — algorithm pseudocode needed before golden examples
- **Phase 3 (US1)**: Depends on Phase 2 — needs algorithm to compute example values
- **Phase 4 (US2)**: Depends on Phase 2 — independent of US1
- **Phase 5 (US3/US4)**: Depends on Phase 2 — independent of US1/US2
- **Phase 6 (Completion)**: Depends on Phases 3-5 — all golden examples must exist
- **Phase 7 (Polish)**: Depends on Phase 6 — all spec content must be finalized

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — no dependencies on other stories
- **US2 (P2)**: Can start after Phase 2 — independent of US1
- **US3/US4 (P3)**: Can start after Phase 2 — independent of US1/US2

### Parallel Opportunities

- Phases 3, 4, 5 (US1, US2, US3/US4) can all run in **parallel** after Phase 2 completes
- Within Phase 5: T016 and T017 (noop input/output) can run in parallel
- Within Phase 7: T028, T030 can run in parallel with other evidence tasks

---

## Parallel Example: User Stories After Foundation

```bash
# After Phase 2 (Foundation) completes, launch all three user stories in parallel:
Task: "[US1] Compute centroid and scaled coordinates for basic-polygon"
Task: "[US2] Compute scaled coordinates for custom-origin"
Task: "[US3] Create golden input file for noop"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (spec structure)
2. Complete Phase 2: Foundation (algorithm + edge cases)
3. Complete Phase 3: US1 (basic-polygon golden pair)
4. **STOP and VALIDATE**: Verify spec has algorithm + 1 golden example
5. This alone is a usable spec for implementers

### Incremental Delivery

1. Setup + Foundation → Spec structure + algorithm ready
2. Add US1 → basic-polygon golden pair (MVP!)
3. Add US2 → custom-origin golden pair
4. Add US3/US4 → noop + error examples
5. Complete + Polish → Full spec, evidence, PR

### Single-Session Strategy (recommended for Low complexity)

This is a Low-complexity spec-only feature. All tasks can be completed in a single session:
1. Write the full spec file (Phases 1-2, ~300 lines Markdown)
2. Compute and create all 3 golden pairs (Phases 3-5)
3. Validate and collect evidence (Phase 6-7)

---

## Notes

- All deliverables are Markdown + JSON files — no compilation, no test runner
- Golden example coordinates must be hand-computed using the scaling formula from quickstart.md
- Use `move-shape.1.0.md` as the structural reference for section formatting
- Floating-point precision: use 15 significant digits in JSON coordinates
- The spec file is the primary deliverable — golden examples prove correctness
- Run `/speckit.pr` after all tasks complete to create PR with evidence
