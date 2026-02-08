# Tasks: Plan PROV Logging Integration with Application State

**Input**: Design documents from `specs/069-plan-prov-logging/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md

**Tests**: No executable tests — this is a documentation-only feature. Verification is manual (section heading checks, graph acyclicity, cross-reference completeness).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. The "implementation" here is authoring sections of `docs/architecture/prov-transition-plan.md`.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the transition plan is complete and meets all acceptance criteria from spec.md.

**Evidence Directory**: `specs/069-plan-prov-logging/evidence/`
**Media Directory**: `specs/069-plan-prov-logging/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Verification checklist results (all 7 sections present, graph acyclic, cross-references valid) | After all sections written |
| usage-example.md | Walkthrough showing how a developer uses the plan to pick up a PROV backlog item | After plan complete |
| section-inventory.md | Table confirming each of the 7 areas has Current State + Target State subsections | After all sections written |

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

**Purpose**: Create the document skeleton and establish structure

- [x] T001 Create architecture docs directory `docs/architecture/`
- [x] T002 Create transition plan document skeleton with all 7 section headings plus dependency graph and breaking change inventory sections `docs/architecture/prov-transition-plan.md`
- [x] T003 [P] Add front matter (feature ID, date, status, SRD references, constitution references) `docs/architecture/prov-transition-plan.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Write the introductory sections that provide context for all 7 areas

**CRITICAL**: These sections frame the entire document and must be complete before area-specific sections.

- [x] T004 Write Executive Summary section: purpose of the plan, scope (7 areas), deliverable (phased backlog items), key principle (Art. XIV permits breaking changes) `docs/architecture/prov-transition-plan.md`
- [x] T005 [P] Write Methodology section: how each area is structured (Current State with file paths → Target State from SRD → Gap Analysis → Migration Steps) `docs/architecture/prov-transition-plan.md`
- [x] T006 [P] Write Codebase Inventory section: table of all files/interfaces affected with line numbers (from data-model.md breaking change inventory) `docs/architecture/prov-transition-plan.md`

**Checkpoint**: Document structure and framing complete — area-specific sections can now be written in parallel

---

## Phase 3: User Story 1 — Transition Plan Document (Priority: P1) MVP

**Goal**: Write all 7 area sections of the transition plan, each with Current State, Target State, and Migration Steps

**Independent Test**: A developer reading the document can identify, for any SRD capability, exactly which current interfaces need changing and in what order.

### Implementation for User Story 1

#### Area 1: ToolResult Contract Expansion

- [x] T007 [US1] Write Current State subsection: document `ToolResult` from `services/calc/debrief_calc/models.py:115-137`, `Provenance` model, `ToolResultAnnotations` LinkML schema, all consumers (from data-model.md Section 1) `docs/architecture/prov-transition-plan.md`
- [x] T008 [US1] Write Target State subsection: document SRD Annex A.8 ToolResult contract with all new fields (`modifiedFeatures`, `createdFeatures`, `createdAssets`, typed `parameters`, `toolVersion`) with types and required/optional status `docs/architecture/prov-transition-plan.md`
- [x] T009 [US1] Write Migration Steps subsection: ordered list of changes to `models.py`, `executor.py`, `provenance.py`, `validation.py`, TypeScript types, and all test files `docs/architecture/prov-transition-plan.md`

#### Area 2: Log Service Design

- [x] T010 [US1] Write Current State subsection: document that no Log Service exists; tool execution flows through `executeTool.ts:78-157` directly to `stacService` without logging `docs/architecture/prov-transition-plan.md`
- [x] T011 [US1] Write Target State subsection: document TypeScript API surface from research.md (recordToolResult, getTimeline, tuneEntry, revertTo, revertThis, createSnapshot, branchFrom) with data flow diagram `docs/architecture/prov-transition-plan.md`
- [x] T012 [US1] Write Migration Steps subsection: package creation in session-state or sibling, integration points with Zustand store, data flow from Python ToolResult → MCP → Log Service → feature properties `docs/architecture/prov-transition-plan.md`

#### Area 3: Undo/Redo Split

- [x] T013 [US1] Write Current State subsection: document `StateSnapshot` interface from `services/session-state/src/store/index.ts:26-39`, 50-step history limit, `DIRTY_TRIGGER_FIELDS`, ephemeral fields `docs/architecture/prov-transition-plan.md`
- [x] T014 [US1] Write Target State subsection: narrowed StateSnapshot (remove `featureCollectionUri`, `savePath`), unchanged 50-step limit, clear boundary between UI undo and data Log per SRD Section 5 `docs/architecture/prov-transition-plan.md`
- [x] T015 [US1] Write Migration Steps subsection: field-by-field rationale table from research.md Section 3, test updates for undo middleware, dirty tracking adjustments `docs/architecture/prov-transition-plan.md`

#### Area 4: Provenance Schema Migration

- [x] T016 [US1] Write Current State subsection: document dual formats — `properties.provenance` from `services/calc/debrief_calc/provenance.py:69` and `properties.prov` from `services/stac/src/debrief_stac/provenance.py:35` — with JSON examples from each `docs/architecture/prov-transition-plan.md`
- [x] T017 [US1] Write Target State subsection: unified PROV-aligned schema from SRD Annex A.3 with JSON examples for tool invocations, property edits (`set-property`), and artifact-producing tools (per FR-006) `docs/architecture/prov-transition-plan.md`
- [x] T018 [US1] Write Migration Steps subsection: remove `debrief_stac/provenance.py`, update `debrief_calc/provenance.py` to produce new format, update all fixtures and sample data, update validation rules `docs/architecture/prov-transition-plan.md`

#### Area 5: System Record Feature

- [x] T019 [US1] Write Current State subsection: document that SYSTEM kind exists (feature 022) but no system record features are created; reference `specs/022-system-kind-discriminator/spec.md` `docs/architecture/prov-transition-plan.md`
- [x] T020 [US1] Write Target State subsection: null-geometry feature structure from SRD Annex A.4 with `snapshotLinks`, `branches`, and `provenance` arrays; include full JSON example `docs/architecture/prov-transition-plan.md`
- [x] T021 [US1] Write Migration Steps subsection: LinkML schema addition, creation logic (when plot is first created), update to stacService to ensure system record persists `docs/architecture/prov-transition-plan.md`

#### Area 6: Phased Implementation Sequence

- [x] T022 [US1] Write phase descriptions: for each of 7 phases (0-6 from research.md), write inputs, outputs, interfaces created/modified, tests required, acceptance criteria sufficient for a standalone backlog item `docs/architecture/prov-transition-plan.md`
- [x] T023 [US1] Write Mermaid dependency graph: phases 0-6 with prerequisite edges, existing backlog item prerequisites (#062, #044), March 2026 target (per FR-008) `docs/architecture/prov-transition-plan.md`
- [x] T024 [US1] Write SRD priority cross-reference table: rows for P1-P6, columns for Phase, Content, Prerequisites, Estimated Scope `docs/architecture/prov-transition-plan.md`

#### Area 7: Session-State Integration Points

- [x] T025 [US1] Write Current State subsection: document dirty tracking from `services/session-state/src/store/middleware/dirty.ts`, persistence flow through `stacService.addFeatures()`, `enableDirtyTracking()` subscription `docs/architecture/prov-transition-plan.md`
- [x] T026 [US1] Write Target State subsection: Log Service writes to feature properties in Zustand store, new dirty trigger mechanism for provenance writes, persistence via existing save-on-dirty `docs/architecture/prov-transition-plan.md`
- [x] T027 [US1] Write Migration Steps subsection: additions to dirty middleware, new Log-triggered dirty path, stacService changes (if any) for updating existing features vs appending `docs/architecture/prov-transition-plan.md`

**Checkpoint**: All 7 areas complete — transition plan document covers the full gap analysis

---

## Phase 4: User Story 2 — Phased Implementation Sequence (Priority: P1)

**Goal**: Ensure each phase is self-contained enough to become a backlog item with clear inputs, outputs, and dependencies

**Independent Test**: Each phase can be extracted as a standalone backlog item without re-reading the SRD.

### Implementation for User Story 2

- [x] T028 [US2] Review each phase description (T022) and verify it includes: exact interfaces to create/modify, exact test files to add/update, prerequisite items with IDs, acceptance criteria `docs/architecture/prov-transition-plan.md`
- [x] T029 [US2] Verify Mermaid dependency graph is acyclic: trace all paths, confirm no phase depends on itself or a later phase `docs/architecture/prov-transition-plan.md`
- [x] T030 [US2] Verify every SRD priority P1-P6 maps to at least one phase in the cross-reference table, and every phase maps to at least one SRD priority `docs/architecture/prov-transition-plan.md`
- [x] T031 [US2] Add "Backlog Item Template" subsection for each phase: pre-filled title, category, description, estimated V/M/A scores, complexity, and dependencies ready for copy into BACKLOG.md `docs/architecture/prov-transition-plan.md`

**Checkpoint**: Phased sequence is actionable — can generate backlog items directly from the plan

---

## Phase 5: User Story 3 — Breaking Change Inventory (Priority: P2)

**Goal**: Provide a complete inventory of every breaking change to existing interfaces with migration impact

**Independent Test**: A developer can look up any current interface and see whether it will change, how, and when.

### Implementation for User Story 3

- [x] T032 [US3] Compile comprehensive breaking change table: every file from data-model.md Section 7, grouped by phase, with change description and all consumers affected `docs/architecture/prov-transition-plan.md`
- [x] T033 [US3] Add migration checklist per phase: files to update, tests to modify, sample data to regenerate, in execution order `docs/architecture/prov-transition-plan.md`
- [x] T034 [US3] Add "In-Flight Feature Guidance" subsection: list active features (from BACKLOG.md `implementing` status) that may conflict with PROV changes, with specific advice for each `docs/architecture/prov-transition-plan.md`

**Checkpoint**: Breaking change inventory complete — developers can assess conflict risk for any active work

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final review, evidence collection, and PR preparation

### Document Review

- [x] T035 Review entire document for internal consistency: verify all file paths referenced exist in the repository `docs/architecture/prov-transition-plan.md`
- [x] T036 [P] Verify all Mermaid diagrams render correctly (no syntax errors) `docs/architecture/prov-transition-plan.md`
- [x] T037 [P] Add table of contents at top of document `docs/architecture/prov-transition-plan.md`
- [x] T038 Run quickstart.md validation: follow the "How to Read the Plan" instructions and verify each step works `specs/069-plan-prov-logging/quickstart.md`

### Evidence Collection

- [x] T039 Create evidence directory `specs/069-plan-prov-logging/evidence/`
- [x] T040 Capture verification results: section heading check (all 7 areas present), graph acyclicity, SRD cross-reference completeness `specs/069-plan-prov-logging/evidence/test-summary.md`
- [x] T041 Create usage demonstration: walkthrough of a developer using the plan to understand what changes for Phase 1 (Log Recording) `specs/069-plan-prov-logging/evidence/usage-example.md`
- [x] T042 [P] Create section inventory: table confirming each area has Current State, Target State, and Migration Steps subsections `specs/069-plan-prov-logging/evidence/section-inventory.md`

### Media Content

- [x] T043 Create shipped blog post `specs/069-plan-prov-logging/media/shipped-post.md`
- [x] T044 [P] Create LinkedIn shipped summary `specs/069-plan-prov-logging/media/linkedin-shipped.md`

### PR Creation

- [x] T045 Create PR and publish blog: run /speckit.pr

**Task T045 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (document skeleton exists)
- **US1 Transition Plan (Phase 3)**: Depends on Phase 2 (framing sections exist). All 7 areas (T007-T027) can be written in parallel once Phase 2 is complete.
- **US2 Phased Sequence (Phase 4)**: Depends on Phase 3 T022-T024 (phase descriptions and dependency graph exist)
- **US3 Breaking Changes (Phase 5)**: Depends on Phase 3 (all areas written, so breaking changes are identified)
- **Polish (Phase 6)**: Depends on Phases 3, 4, 5 all complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 — no dependencies on other stories
- **User Story 2 (P1)**: Depends on US1 Phase 3 tasks T022-T024 (phase descriptions must exist to verify)
- **User Story 3 (P2)**: Depends on US1 Phase 3 completion (all areas must be written to compile breaking changes)

### Within User Story 1 (Phase 3)

The 7 areas can be written in parallel since they are separate document sections:
- T007-T009 (ToolResult) can run in parallel with T010-T012 (Log Service)
- T013-T015 (Undo Split) can run in parallel with T016-T018 (Provenance Schema)
- T019-T021 (System Record) can run in parallel with T025-T027 (Session-State)
- T022-T024 (Phased Sequence) should be written last within Phase 3 since it references all other areas

### Parallel Opportunities

- All [P] tasks within a phase can run in parallel
- Within Phase 3, areas 1-5 and 7 can all be written in parallel (6 concurrent document sections)
- Within Phase 6, evidence tasks T040-T042 can run in parallel after T039

---

## Parallel Example: User Story 1 (Phase 3)

```bash
# Launch all 7 areas in parallel (different document sections, no conflicts):
Task: "Write ToolResult Current/Target/Migration (T007-T009)"
Task: "Write Log Service Current/Target/Migration (T010-T012)"
Task: "Write Undo/Redo Current/Target/Migration (T013-T015)"
Task: "Write Provenance Schema Current/Target/Migration (T016-T018)"
Task: "Write System Record Current/Target/Migration (T019-T021)"
Task: "Write Session-State Current/Target/Migration (T025-T027)"

# Then (depends on above):
Task: "Write Phased Sequence with dependency graph (T022-T024)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (document skeleton)
2. Complete Phase 2: Foundational (executive summary, methodology, codebase inventory)
3. Complete Phase 3: User Story 1 (all 7 area sections)
4. **STOP and VALIDATE**: Verify all 7 sections have Current State, Target State, Migration Steps
5. The document is usable at this point for developers to understand the gap

### Incremental Delivery

1. Complete Phases 1-3 → 7-area transition plan (MVP!)
2. Add Phase 4 → Phases are actionable as backlog items
3. Add Phase 5 → Breaking change inventory complete
4. Polish phase → Evidence, media, PR

### Suggested MVP Scope

Phase 3 (User Story 1) is the natural MVP. The transition plan with all 7 area sections is the core deliverable. Phases 4 and 5 add actionability and safety for parallel development, but the plan is valuable without them.

---

## Notes

- [P] tasks = different document sections, no content conflicts
- [US#] label maps task to specific user story for traceability
- All "Write" tasks target the same file (`docs/architecture/prov-transition-plan.md`) but different sections
- Verify all file path references exist in the repo before finalising
- Commit after each phase or logical group of sections
- **Evidence is required** — capture verification artifacts that prove the plan is complete
- Run `/speckit.pr` after all tasks complete to create PR with evidence
