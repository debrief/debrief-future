# Tasks: SpecKit UI Workflow Enhancement

**Input**: Design documents from `/specs/004-speckit-ui-workflow/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: Manual testing via `/speckit.specify` invocations with test descriptions. No automated tests for markdown templates.

**Organization**: Tasks are grouped by user story. Since this is a tooling enhancement (markdown modifications), "implementation" means editing template files.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected.

**Evidence Directory**: `specs/004-speckit-ui-workflow/evidence/`
**Media Directory**: `specs/004-speckit-ui-workflow/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Manual test results with pass/fail for each scenario | After all test cases verified |
| usage-example.md | Examples of `/speckit.specify` with UI and non-UI descriptions | After detection works |
| ui-spec-sample.md | Sample spec output showing UI section generated | After US1 complete |
| service-spec-sample.md | Sample spec output showing no UI section | After US2 complete |
| hybrid-spec-sample.md | Sample spec with mixed indicators showing UI section | After US3 complete |

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

## Phase 1: Setup

**Purpose**: Review current state and prepare for modifications

- [ ] T001 Review current spec-template.md structure `.specify/templates/spec-template.md`
- [ ] T002 [P] Review current speckit.specify.md command `.claude/commands/speckit.specify.md`
- [ ] T003 [P] Create evidence directory `specs/004-speckit-ui-workflow/evidence/`

---

## Phase 2: Foundation - UI Section Template (FR-001, FR-002, FR-007)

**Purpose**: Add the optional "User Interface Flow" section to spec-template.md

**⚠️ CRITICAL**: This phase adds the content that will be conditionally included by the specify command

- [ ] T004 Add "User Interface Flow" section marked as optional `.specify/templates/spec-template.md`
- [ ] T005 Add Decision Analysis subsection with guidance comments `.specify/templates/spec-template.md`
- [ ] T006 [P] Add Screen Progression subsection with table format `.specify/templates/spec-template.md`
- [ ] T007 [P] Add UI States subsection (empty, loading, error, success) `.specify/templates/spec-template.md`
- [ ] T008 Add commented example of completed UI section `.specify/templates/spec-template.md`

**Checkpoint**: Template has UI section ready for conditional inclusion

---

## Phase 3: User Story 1 & 2 - Feature Detection (Priority: P1) 🎯 MVP

**Goal**: Detect UI vs service features and conditionally include/exclude UI section

**Independent Test**: Run `/speckit.specify Create a file upload dialog` and verify UI section appears. Run `/speckit.specify Create a file parser service` and verify UI section does NOT appear.

### Implementation for User Stories 1 & 2

- [ ] T009 Add keyword lists (UI, Service, CLI triggers) to speckit.specify.md `.claude/commands/speckit.specify.md`
- [ ] T010 Add feature detection logic checking description against UI keywords `.claude/commands/speckit.specify.md`
- [ ] T011 Add conditional generation: include UI section when UI keywords detected `.claude/commands/speckit.specify.md`
- [ ] T012 Add case-insensitive keyword matching `.claude/commands/speckit.specify.md`
- [ ] T013 Document detection behavior in execution flow section `.claude/commands/speckit.specify.md`

### Manual Test Cases for US1 & US2

- [ ] T014 Test: `/speckit.specify Create a file upload dialog` → UI section present
- [ ] T015 [P] Test: `/speckit.specify Create a settings wizard` → UI section present
- [ ] T016 [P] Test: `/speckit.specify Create a file parser service` → NO UI section
- [ ] T017 [P] Test: `/speckit.specify Create an API endpoint handler` → NO UI section

**Checkpoint**: Basic detection works - UI features get UI section, services don't

---

## Phase 4: User Story 3 - Hybrid Feature Detection (Priority: P2)

**Goal**: Handle features with both UI and service indicators correctly

**Independent Test**: Run `/speckit.specify Create an API with admin dashboard` and verify UI section IS included (UI takes precedence)

### Implementation for User Story 3

- [ ] T018 Add precedence rule: UI indicators override service indicators `.claude/commands/speckit.specify.md`
- [ ] T019 Add CLI detection: "command", "terminal", "CLI" should NOT trigger UI section `.claude/commands/speckit.specify.md`
- [ ] T020 Add edge case handling for ambiguous descriptions (prefer inclusion) `.claude/commands/speckit.specify.md`

### Manual Test Cases for US3

- [ ] T021 Test: `/speckit.specify Create an API with admin dashboard` → UI section present
- [ ] T022 [P] Test: `/speckit.specify Create a CLI command for export` → NO UI section
- [ ] T023 [P] Test: `/speckit.specify Create a terminal interface` → NO UI section

**Checkpoint**: Hybrid detection works correctly with precedence rules

---

## Phase 5: User Story 4 - Validation Checklist Updates (Priority: P2)

**Goal**: Add UI-specific validation items that only apply when UI section is present

**Independent Test**: Generate a spec with UI section and verify validation includes UI-specific items. Generate spec without UI section and verify UI items are NOT checked.

### Implementation for User Story 4

- [ ] T024 Add conditional UI validation items to Specification Quality Validation section `.claude/commands/speckit.specify.md`
- [ ] T025 Add item: "Decision analysis complete" (only when UI section present) `.claude/commands/speckit.specify.md`
- [ ] T026 [P] Add item: "Screen progression covers happy path minimum" (only when UI section present) `.claude/commands/speckit.specify.md`
- [ ] T027 Document conditional validation logic `.claude/commands/speckit.specify.md`

**Checkpoint**: Validation adapts based on UI section presence

---

## Phase 6: User Story 5 - Backward Compatibility Verification (Priority: P1)

**Goal**: Verify existing specs (000-003) remain valid without modification

**Independent Test**: Manually review existing specs and confirm they would pass validation under new rules

### Verification for User Story 5

- [ ] T028 Verify spec 000-schemas passes validation (no UI section required) `specs/000-schemas/spec.md`
- [ ] T029 [P] Verify spec 001-debrief-stac passes validation `specs/001-debrief-stac/spec.md`
- [ ] T030 [P] Verify spec 002-debrief-io passes validation `specs/002-debrief-io/spec.md`
- [ ] T031 [P] Verify spec 003-debrief-config passes validation `specs/003-debrief-config/spec.md`
- [ ] T032 Document backward compatibility in quickstart.md updates `specs/004-speckit-ui-workflow/quickstart.md`

**Checkpoint**: All existing specs remain valid - backward compatibility confirmed

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup, evidence collection, and PR preparation

### Documentation Updates

- [ ] T033 Update quickstart.md with actual test results `specs/004-speckit-ui-workflow/quickstart.md`
- [ ] T034 [P] Review and polish spec-template.md comments for clarity `.specify/templates/spec-template.md`
- [ ] T035 [P] Review and polish speckit.specify.md documentation `.claude/commands/speckit.specify.md`

### Evidence Collection (REQUIRED)

- [ ] T036 Capture test summary with pass/fail for all manual tests `specs/004-speckit-ui-workflow/evidence/test-summary.md`
- [ ] T037 Create usage demonstration with UI and non-UI examples `specs/004-speckit-ui-workflow/evidence/usage-example.md`
- [ ] T038 [P] Capture sample UI spec output `specs/004-speckit-ui-workflow/evidence/ui-spec-sample.md`
- [ ] T039 [P] Capture sample service spec output (no UI) `specs/004-speckit-ui-workflow/evidence/service-spec-sample.md`
- [ ] T040 [P] Capture sample hybrid spec output `specs/004-speckit-ui-workflow/evidence/hybrid-spec-sample.md`

### Media Content (REQUIRED)

- [ ] T041 Create shipped blog post `specs/004-speckit-ui-workflow/media/shipped-post.md`
- [ ] T042 [P] Create LinkedIn shipped summary `specs/004-speckit-ui-workflow/media/linkedin-shipped.md`

### PR Creation (REQUIRED - FINAL TASK)

- [ ] T043 Create PR and publish blog: run /speckit.pr

**Task T043 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - can start immediately
- **Phase 2 (Foundation)**: Depends on Phase 1 completion
- **Phase 3 (US1+US2)**: Depends on Phase 2 (template must exist before detection logic)
- **Phase 4 (US3)**: Depends on Phase 3 (extends basic detection)
- **Phase 5 (US4)**: Can run in parallel with Phase 4 (different sections of speckit.specify.md)
- **Phase 6 (US5)**: Depends on Phases 3-5 (needs final implementation to verify)
- **Phase 7 (Polish)**: Depends on all prior phases

### User Story Dependencies

- **US1 + US2 (P1)**: Foundation → Detection implementation → Verification
- **US3 (P2)**: Depends on US1+US2 detection being in place
- **US4 (P2)**: Independent of US3 - different section of command file
- **US5 (P1)**: Verification only - depends on all implementation

### Parallel Opportunities

- All Phase 1 tasks marked [P] can run in parallel
- T006 + T007 can run in parallel (different subsections)
- T014-T017 test cases can run in parallel
- T021-T023 test cases can run in parallel
- T028-T031 verification tasks can run in parallel
- T038-T040 evidence captures can run in parallel

---

## Implementation Strategy

### MVP First (User Stories 1 & 2)

1. Complete Phase 1: Setup (review files)
2. Complete Phase 2: Foundation (add UI section to template)
3. Complete Phase 3: US1+US2 (basic detection)
4. **STOP and VALIDATE**: Test with dialog vs service descriptions
5. This is the MVP - feature provides value at this point

### Full Implementation

1. MVP (Phases 1-3)
2. Add Phase 4: US3 (hybrid detection with precedence)
3. Add Phase 5: US4 (validation checklist updates)
4. Verify Phase 6: US5 (backward compatibility)
5. Complete Phase 7: Polish (evidence, media, PR)

### Task Count by Phase

| Phase | Tasks | Parallel Opportunities |
|-------|-------|------------------------|
| Phase 1: Setup | 3 | 2 parallel |
| Phase 2: Foundation | 5 | 2 parallel |
| Phase 3: US1+US2 | 9 | 3 parallel tests |
| Phase 4: US3 | 6 | 2 parallel tests |
| Phase 5: US4 | 4 | 1 parallel |
| Phase 6: US5 | 5 | 4 parallel |
| Phase 7: Polish | 11 | 6 parallel |
| **Total** | **43** | |

---

## Notes

- This is a **tooling enhancement** - all "implementation" is markdown editing
- Manual testing via `/speckit.specify` invocations
- No automated tests - template changes are verified by workflow execution
- Evidence captures actual test results and sample outputs
- Commit after each logical group of related tasks
