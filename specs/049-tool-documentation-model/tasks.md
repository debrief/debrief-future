# Tasks: Language-Neutral Tool Documentation Model

**Input**: Design documents from `/specs/049-tool-documentation-model/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: pytest tests included for the Python decorator (US3).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

**Evidence Directory**: `specs/049-tool-documentation-model/evidence/`
**Media Directory**: `specs/049-tool-documentation-model/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | pytest results for @tool_spec decorator | After all tests pass |
| usage-example.md | Example of creating a new tool spec | After template complete |
| template-validation.md | Verification all 9 sections are present | After initial tools complete |
| sample-golden-example.json | Example input/output pair | After golden examples created |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | During /speckit.plan (complete) |
| media/linkedin-planning.md | LinkedIn summary for planning | During /speckit.plan (complete) |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create directory structure for tool specifications

- [x] T001 Create shared/tools/ directory structure `shared/tools/`
- [x] T002 [P] Create track/styling/ category directory `shared/tools/track/styling/`
- [x] T003 [P] Create README.md with overview `shared/tools/README.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core template that MUST be complete before ANY tool specs can be created

**⚠️ CRITICAL**: No tool specs can be created until the template is complete

- [x] T004 Create TEMPLATE.md with all 9 sections `shared/tools/TEMPLATE.md`
- [x] T005 [P] Add Metadata section with YAML frontmatter example `shared/tools/TEMPLATE.md`
- [x] T006 [P] Add MCP section with LLM-optimized description example `shared/tools/TEMPLATE.md`
- [x] T007 [P] Add Inputs section with schema reference format `shared/tools/TEMPLATE.md`
- [x] T008 [P] Add Outputs section with ToolResult reference format `shared/tools/TEMPLATE.md`
- [x] T009 [P] Add Algorithm section with pseudocode style guide `shared/tools/TEMPLATE.md`
- [x] T010 [P] Add Edge Cases section with table format `shared/tools/TEMPLATE.md`
- [x] T011 [P] Add Examples section with inline/sister file patterns `shared/tools/TEMPLATE.md`
- [x] T012 [P] Add Changelog section format `shared/tools/TEMPLATE.md`
- [x] T013 [P] Add References section with link categories `shared/tools/TEMPLATE.md`

**Checkpoint**: Template ready - tool specification authoring can now begin

---

## Phase 3: User Story 1 - Create Tool Specification from Template (Priority: P1) 🎯 MVP

**Goal**: Developers can create new tool specs using the template with all 9 required sections

**Independent Test**: Copy template, verify all sections present, verify filename pattern works

### Implementation for User Story 1

- [x] T014 [US1] Create set-track-color.1.0.md from template `shared/tools/track/styling/set-track-color.1.0.md`
- [x] T015 [P][US1] Fill Metadata section for set-track-color `shared/tools/track/styling/set-track-color.1.0.md`
- [x] T016 [P][US1] Fill MCP section for set-track-color `shared/tools/track/styling/set-track-color.1.0.md`
- [x] T017 [P][US1] Fill Inputs section referencing TrackFeature schema `shared/tools/track/styling/set-track-color.1.0.md`
- [x] T018 [P][US1] Fill Outputs section referencing TrackStyle schema `shared/tools/track/styling/set-track-color.1.0.md`
- [x] T019 [US1] Write Algorithm pseudocode for set-track-color `shared/tools/track/styling/set-track-color.1.0.md`
- [x] T020 [US1] Document Edge Cases for set-track-color `shared/tools/track/styling/set-track-color.1.0.md`
- [x] T021 [US1] Add Changelog and References sections `shared/tools/track/styling/set-track-color.1.0.md`

**Checkpoint**: First tool spec complete - template is validated

---

## Phase 4: User Story 2 - Validate Implementation Against Golden Examples (Priority: P1)

**Goal**: Golden input/output JSON pairs exist for testing implementations

**Independent Test**: Load JSON files, verify structure matches schemas, verify output differs from input correctly

### Implementation for User Story 2

- [x] T022 [US2] Create set-track-color.basic.input.json `shared/tools/track/styling/set-track-color.basic.input.json`
- [x] T023 [US2] Create set-track-color.basic.output.json `shared/tools/track/styling/set-track-color.basic.output.json`
- [x] T024 [P][US2] Add inline example to set-track-color spec `shared/tools/track/styling/set-track-color.1.0.md`
- [x] T025 [US2] Create apply-symbol-style.1.0.md `shared/tools/track/styling/apply-symbol-style.1.0.md`
- [x] T026 [P][US2] Create apply-symbol-style.basic.input.json `shared/tools/track/styling/apply-symbol-style.basic.input.json`
- [x] T027 [P][US2] Create apply-symbol-style.basic.output.json `shared/tools/track/styling/apply-symbol-style.basic.output.json`
- [x] T028 [US2] Create label-interval.1.0.md `shared/tools/track/styling/label-interval.1.0.md`
- [x] T029 [P][US2] Create label-interval.basic.input.json `shared/tools/track/styling/label-interval.basic.input.json`
- [x] T030 [P][US2] Create label-interval.basic.output.json `shared/tools/track/styling/label-interval.basic.output.json`
- [x] T031 [US2] Create symbol-interval.1.0.md `shared/tools/track/styling/symbol-interval.1.0.md`
- [x] T032 [P][US2] Create symbol-interval.basic.input.json `shared/tools/track/styling/symbol-interval.basic.input.json`
- [x] T033 [P][US2] Create symbol-interval.basic.output.json `shared/tools/track/styling/symbol-interval.basic.output.json`

**Checkpoint**: All four initial tools have specs and golden examples

---

## Phase 5: User Story 3 - Link Implementation to Specification (Priority: P2)

**Goal**: Python @tool_spec decorator validates spec path exists and stores it for introspection

**Independent Test**: Decorate a function, verify spec path accessible, verify error on missing spec

### Tests for User Story 3

- [x] T034 [test][US3] Write test for valid spec path validation `services/debrief-tools/tests/test_decorators.py`
- [x] T035 [P][test][US3] Write test for missing spec error `services/debrief-tools/tests/test_decorators.py`
- [x] T036 [P][test][US3] Write test for introspection (__tool_spec__ attribute) `services/debrief-tools/tests/test_decorators.py`

### Implementation for User Story 3

- [x] T037 [US3] Create debrief-tools package structure `services/debrief-tools/`
- [x] T038 [US3] Create pyproject.toml for debrief-tools `services/debrief-tools/pyproject.toml`
- [x] T039 [US3] Implement @tool_spec decorator `services/debrief-tools/debrief_tools/decorators.py`
- [x] T040 [US3] Add spec path validation at decoration time `services/debrief-tools/debrief_tools/decorators.py`
- [x] T041 [US3] Add __tool_spec__ attribute to decorated function `services/debrief-tools/debrief_tools/decorators.py`
- [x] T042 [US3] Export decorator from package __init__ `services/debrief-tools/debrief_tools/__init__.py`
- [x] T043 [US3] Run tests and verify all pass `services/debrief-tools/tests/test_decorators.py`

**Checkpoint**: Python decorator complete with tests passing

---

## Phase 6: User Story 4 - Discover Tools by Category (Priority: P2)

**Goal**: Tools are organized in hierarchical folders that developers can browse

**Independent Test**: Navigate to track/styling/, list files, verify all 4 tools visible

### Implementation for User Story 4

- [x] T044 [US4] Verify folder structure matches hierarchical pattern `shared/tools/track/styling/`
- [x] T045 [US4] Update README.md with category navigation guide `shared/tools/README.md`
- [x] T046 [US4] Add links between related tools in References sections `shared/tools/track/styling/*.md`

**Checkpoint**: Tools are discoverable via folder navigation

---

## Phase 7: User Story 5 - Provide Tool Description for MCP/LLM (Priority: P3)

**Goal**: MCP sections are optimized for LLM understanding

**Independent Test**: Extract MCP section, verify it contains description, when_to_use, parameters, returns

### Implementation for User Story 5

- [x] T047 [US5] Review and polish MCP section in set-track-color `shared/tools/track/styling/set-track-color.1.0.md`
- [x] T048 [P][US5] Review and polish MCP section in apply-symbol-style `shared/tools/track/styling/apply-symbol-style.1.0.md`
- [x] T049 [P][US5] Review and polish MCP section in label-interval `shared/tools/track/styling/label-interval.1.0.md`
- [x] T050 [P][US5] Review and polish MCP section in symbol-interval `shared/tools/track/styling/symbol-interval.1.0.md`

**Checkpoint**: All MCP sections optimized for Claude understanding

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final quality pass and evidence collection

- [x] T051 Verify all 9 sections present in each spec file `shared/tools/track/styling/*.md`
- [x] T052 [P] Verify all golden examples are valid JSON `shared/tools/track/styling/*.json`
- [x] T053 [P] Run quickstart.md validation (create test spec following guide) `specs/049-tool-documentation-model/quickstart.md`
- [x] T054 Cross-link all four tool specs in References sections `shared/tools/track/styling/*.md`

### Evidence Collection (REQUIRED)

- [x] T055 Create evidence directory `specs/049-tool-documentation-model/evidence/`
- [x] T056 Capture test summary with pytest results `specs/049-tool-documentation-model/evidence/test-summary.md`
- [x] T057 Create usage example showing spec authoring workflow `specs/049-tool-documentation-model/evidence/usage-example.md`
- [x] T058 [P] Document template section validation `specs/049-tool-documentation-model/evidence/template-validation.md`
- [x] T059 [P] Include sample golden example pair `specs/049-tool-documentation-model/evidence/sample-golden-example.json`

### Media Content

- [x] T060 Create shipped blog post `specs/049-tool-documentation-model/media/shipped-post.md`
- [x] T061 [P] Create LinkedIn shipped summary `specs/049-tool-documentation-model/media/linkedin-shipped.md`

### PR Creation

- [x] T062 Create PR and publish blog: run /speckit.pr

**Task T062 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Phase 2 (template must exist)
- **User Story 2 (Phase 4)**: Depends on Phase 3 (need first spec as reference)
- **User Story 3 (Phase 5)**: Depends on Phase 2 (specs must exist for decorator validation)
- **User Story 4 (Phase 6)**: Depends on Phase 4 (need multiple specs to navigate)
- **User Story 5 (Phase 7)**: Depends on Phase 4 (need specs with MCP sections)
- **Polish (Phase 8)**: Depends on all user stories

### User Story Dependencies

- **User Story 1 (P1)**: Depends only on template - **MVP deliverable**
- **User Story 2 (P1)**: Depends on US1 - golden examples validate the spec structure
- **User Story 3 (P2)**: Can start in parallel with US2 after US1 completes
- **User Story 4 (P2)**: Depends on US2 - needs multiple tools to demonstrate navigation
- **User Story 5 (P3)**: Can run in parallel with US4 after US2 completes

### Parallel Opportunities

Within each phase, tasks marked [P] can run in parallel:
- Phase 2: T005-T013 (all template sections) can be written in parallel
- Phase 4: Golden example pairs (input/output) for each tool can be created in parallel
- Phase 5: T034-T036 tests can run in parallel
- Phase 7: T048-T050 MCP polishing can run in parallel
- Phase 8: T058-T059, T060-T061 can run in parallel

---

## Parallel Example: Phase 4 (Golden Examples)

```bash
# After T025 (apply-symbol-style.1.0.md) is created, launch fixture creation in parallel:
Task: "Create apply-symbol-style.basic.input.json"
Task: "Create apply-symbol-style.basic.output.json"

# Repeat for each tool - all fixture pairs can be created in parallel
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (directory structure)
2. Complete Phase 2: Foundational (TEMPLATE.md)
3. Complete Phase 3: User Story 1 (set-track-color.1.0.md)
4. **STOP and VALIDATE**: Verify spec has all 9 sections, filename follows pattern
5. Demo template to stakeholders

### Incremental Delivery

1. Setup + Foundational → Template ready
2. Add User Story 1 → First spec validated → Demo (MVP!)
3. Add User Story 2 → Golden examples exist → Demo testing approach
4. Add User Story 3 → Decorator works → Demo implementation linkage
5. Add User Story 4 + 5 → Full system documented → Ship feature

---

## Notes

- [P] tasks = different files, no dependencies
- [US#] label maps task to specific user story for traceability
- Template must be complete before any specs can be authored
- Golden examples must use existing GeoJSON/styling schemas
- Decorator tests should run against actual spec files created in earlier phases
- Evidence is required - capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
