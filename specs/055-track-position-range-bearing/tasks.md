# Tasks: Track-Position to Track Range/Bearing Tool Spec

**Input**: Design documents from `/specs/055-track-position-range-bearing/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Tests**: Golden I/O JSON fixtures validated against independent Haversine/bearing calculations.

**Organization**: This is a spec-only feature. No code implementation — deliverables are a markdown tool spec and golden I/O JSON fixture files.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the tool specification is complete, consistent, and correct.

**Evidence Directory**: `specs/055-track-position-range-bearing/evidence/`
**Media Directory**: `specs/055-track-position-range-bearing/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Spec section checklist + golden fixture validation | After all fixtures created |
| usage-example.md | Example showing how an implementer would use the spec | After spec complete |

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

**Purpose**: Ensure tool spec directory exists

- [x] T001 Verify tool spec directory exists `shared/tools/track/measurement/`

**Checkpoint**: Directory exists and contains existing measurement tools.

---

## Phase 2: Tool Specification (9 Sections)

**Purpose**: Write the complete tool specification following TEMPLATE.md

### Spec Foundation

- [x] T002 Create spec file with YAML front matter and all 9 section headings `shared/tools/track/measurement/position-range-bearing.1.0.md`
- [x] T003 Write MCP section (description, when-to-use, parameters, returns)
- [x] T004 [P] Write Inputs section (schema refs, constraints, defaults)
- [x] T005 [P] Write Outputs section (ToolResponse, result type, annotations)

### Core Algorithm

- [x] T006 Write Algorithm section: temporal matching (snap-to-nearest) + Haversine range + initial bearing
- [x] T007 Write Edge Cases table (empty track, single position, identical coords, equidistant times, invalid index, identical times)

### Completion Sections

- [x] T008 [P] Write Examples section with inline examples + golden file references
- [x] T009 [P] Write Registration section
- [x] T010 [P] Write Changelog section (1.0, 2026-02-17)
- [x] T011 [P] Write References section (related tools, schemas, legacy)

**Checkpoint**: All 9 sections complete. SC-001 satisfied.

---

## Phase 3: Golden I/O Examples

**Purpose**: Create golden fixture JSON files for cross-language validation

### Basic Example (User Story 1)

- [x] T012 [US1] Create golden input: two tracks, selected position index 1 on track-alpha, track-bravo has 3 positions with closest match at index 1 `shared/tools/track/measurement/position-range-bearing.basic.input.json`
- [x] T013 [US1] Create golden output: ToolResponse with computed range and bearing `shared/tools/track/measurement/position-range-bearing.basic.output.json`

### Single-Position Edge Case (User Story 2)

- [x] T014 [US2] Create golden input: selected position on track-alpha, track-bravo has only 1 position at very different time `shared/tools/track/measurement/position-range-bearing.single-position.input.json`
- [x] T015 [US2] Create golden output: ToolResponse with forced match result `shared/tools/track/measurement/position-range-bearing.single-position.output.json`

**Checkpoint**: Both golden example pairs created. SC-002, SC-006 satisfied.

---

## Phase 4: Validation

**Purpose**: Verify spec completeness and golden fixture correctness

- [x] T016 [test] Run quickstart.md verification checklist against completed spec
- [x] T017 [test] Validate golden I/O JSON files are well-formed and values are correct

**Checkpoint**: All validation passes. SC-003, SC-004, SC-005 satisfied.

---

## Phase 5: Polish

**Purpose**: Collect evidence, create media content, create PR

### Evidence Collection (REQUIRED)

- [x] T018 Create evidence directory `specs/055-track-position-range-bearing/evidence/`
- [x] T019 Capture test summary: spec section checklist + golden fixture validation `specs/055-track-position-range-bearing/evidence/test-summary.md`
- [x] T020 Create usage example showing how implementers consume the spec `specs/055-track-position-range-bearing/evidence/usage-example.md`

### Media Content

- [x] T021 Create shipped blog post `specs/055-track-position-range-bearing/media/shipped-post.md`
- [x] T022 [P] Create LinkedIn shipped summary `specs/055-track-position-range-bearing/media/linkedin-shipped.md`

### PR Creation

- [ ] T023 Create PR and publish blog: run /speckit.pr (gh CLI not available — manual PR needed)

**Task T023 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Tool Specification (Phase 2)**: Depends on Phase 1
- **Golden I/O (Phase 3)**: Depends on Phase 2 (algorithm must be defined first)
- **Validation (Phase 4)**: Depends on Phases 2-3
- **Polish (Phase 5)**: Depends on Phase 4

### Within Phase 2

- T002 first (creates file)
- T003 next (MCP section)
- T004/T005 in parallel (Inputs/Outputs)
- T006 next (Algorithm — core section)
- T007 next (Edge Cases)
- T008-T011 in parallel (completion sections)

### Within Phase 3

- T012 before T013 (input before output)
- T014 before T015 (input before output)
- Basic example (T012/T013) and single-position example (T014/T015) can run in parallel

---

## Notes

- This is a spec-only feature — no Python or TypeScript code
- Complexity: Medium → Sonnet model for implementation agents
- Golden output values must be pre-computed using Haversine and initial bearing formulas
- Floating-point tolerance: 0.01 nm for range, 0.1 degrees for bearing
- Earth radius: 3440.065 nm (6371.0 km) consistent with range_bearing.py
