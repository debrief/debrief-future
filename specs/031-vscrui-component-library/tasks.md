# Tasks: Document vscrui as Standard Component Library

**Input**: Design documents from `/specs/031-vscrui-component-library/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

---

## Evidence Requirements

**Evidence Directory**: `specs/031-vscrui-component-library/evidence/`
**Media Directory**: `specs/031-vscrui-component-library/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | FR checklist verification results | After vscrui.md written |
| usage-example.md | Walkthrough of reading the doc and finding answers | After vscrui.md written |

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

**Purpose**: Create directory structure for the documentation deliverable

- [x] T001 Create shared components directory `shared/components/`

---

## Phase 2: User Story 1 & 2 - Developer Discovers vscrui and Component Inventory (Priority: P1)

**Goal**: A developer reads `shared/components/vscrui.md` and learns vscrui is the standard, how to install it, why it was chosen, and what components are available.

**Independent Test**: Read the document and verify it answers: "What library?", "How to install?", "Why chosen?", "What components?"

### Implementation

- [x] T002 Create vscrui.md with standard declaration, rationale, installation, peer deps, component inventory, usage example, upstream reference `shared/components/vscrui.md`

**Checkpoint**: vscrui.md covers FR-001 through FR-005, FR-009, FR-010 (stories 1 & 2)

---

## Phase 3: User Story 3 - Developer Understands Scope and Constraints (Priority: P2)

**Goal**: The document clearly states vscrui applies to VS Code webviews, Electron Loader, and Storybook, and that offline bundling is required.

**Independent Test**: Read scope/constraints sections and verify all contexts and the offline requirement are listed.

### Implementation

- [x] T003 Add scope and constraints sections to vscrui.md covering FR-006, FR-007, edge cases `shared/components/vscrui.md`

**Checkpoint**: vscrui.md now covers all FR-001 through FR-010

---

## Phase 4: Cross-Reference and Discoverability

**Purpose**: Ensure the document is discoverable from project-level docs (SC-004)

- [x] T004 Add vscrui reference to ARCHITECTURE.md tooling/tech stack section `ARCHITECTURE.md`

**Checkpoint**: Developer can find vscrui.md from ARCHITECTURE.md

---

## Phase 5: Polish & Cross-Cutting Concerns

### Evidence Collection

- [x] T005 Create evidence directory `specs/031-vscrui-component-library/evidence/`
- [x] T006 Capture FR verification checklist in `specs/031-vscrui-component-library/evidence/test-summary.md`
- [x] T007 [P] Record usage walkthrough in `specs/031-vscrui-component-library/evidence/usage-example.md`

### Media Content

- [x] T008 Create shipped blog post in `specs/031-vscrui-component-library/media/shipped-post.md`
- [x] T009 [P] Create LinkedIn shipped summary in `specs/031-vscrui-component-library/media/linkedin-shipped.md`

### PR Creation

- [ ] T010 Create PR and publish blog: run /speckit.pr

**Task T010 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies
- **Phase 2 (US1+US2)**: Depends on Phase 1
- **Phase 3 (US3)**: Depends on Phase 2 (extends same file)
- **Phase 4 (Cross-ref)**: Depends on Phase 2 (file must exist to reference)
- **Phase 5 (Polish)**: Depends on Phases 2-4

### Parallel Opportunities

- T003 and T004 can run in parallel (different files) after T002 completes
- T006 and T007 can run in parallel
- T008 and T009 can run in parallel

---

## Implementation Strategy

### MVP First (User Stories 1 & 2)

1. T001: Create directory
2. T002: Write vscrui.md with core content
3. **STOP and VALIDATE**: Verify FR-001 through FR-005, FR-009, FR-010

### Incremental Delivery

1. T002 → Core documentation (MVP)
2. T003 → Scope and constraints
3. T004 → ARCHITECTURE.md cross-reference
4. T005-T009 → Evidence and media
5. T010 → PR creation

---

## Notes

- This is a documentation-only feature — no code, no tests, no builds
- All tasks modify markdown files only
- Total tasks: 10
- Tasks per story: US1+US2 = 1 task, US3 = 1 task
- Evidence: FR checklist + usage walkthrough
