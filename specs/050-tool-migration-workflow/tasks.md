# Tasks: Tool Migration Workflow for Legacy Debrief

**Input**: Design documents from `/specs/050-tool-migration-workflow/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Manual validation by migrating one tool end-to-end (no automated tests - this is developer tooling)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. These are used in PR descriptions, documentation, and future blog posts.

**Evidence Directory**: `specs/050-tool-migration-workflow/evidence/`
**Media Directory**: `specs/050-tool-migration-workflow/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Manual validation results from end-to-end migration | After all commands work |
| usage-example.md | Complete workflow demonstration (discover → spec → implement → verify) | After workflow complete |
| command-help.txt | Help output from each command | After commands created |
| migration-demo.md | Step-by-step migration of one tool | After end-to-end validation |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | During /speckit.plan (COMPLETE) |
| media/linkedin-planning.md | LinkedIn summary for planning | During /speckit.plan (COMPLETE) |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create directory structure for agents and documentation

- [x] T001 Create agents directory `.claude/agents/tools/`
- [x] T002 Create Java harness directory `docs/tool-migration/java-harness-template/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the agent README that documents the overall migration workflow

**CRITICAL**: Commands will reference these agents, so agent directory must exist first

- [x] T003 Create agent README documenting workflow `.claude/agents/tools/README.md`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Discover Migrateable Tools (Priority: P1) 🎯 MVP

**Goal**: Enable developers to scan Legacy Debrief Java source and get an inventory of migrateable tools

**Independent Test**: Point at sample Java files, verify inventory report lists tools correctly

### Implementation for User Story 1

- [x] T004 [US1] Create legacy-tool-analyst agent `.claude/agents/tools/legacy-tool-analyst.md`
- [x] T005 [US1] Create /tool.discover command `.claude/commands/tool.discover.md`

**Checkpoint**: User Story 1 complete - developers can discover tools in legacy codebase

---

## Phase 4: User Story 2 - Create Language-Neutral Tool Specification (Priority: P1)

**Goal**: Enable developers to generate tool specifications from Java source and golden examples

**Independent Test**: Create spec for sample tool, verify all 9 TEMPLATE.md sections are present

### Implementation for User Story 2

- [x] T006 [US2] Create tool-spec-author agent `.claude/agents/tools/tool-spec-author.md`
- [x] T007 [US2] Create /tool.spec command `.claude/commands/tool.spec.md`

**Checkpoint**: User Stories 1 AND 2 complete - developers can discover tools and create specs

---

## Phase 5: User Story 3 - Implement Tool from Specification (Priority: P2)

**Goal**: Enable developers to generate Python and TypeScript implementations from specs

**Independent Test**: Generate implementations from spec, verify code compiles/parses without errors

### Implementation for User Story 3

- [x] T008 [US3] Create tool-implementer agent `.claude/agents/tools/tool-implementer.md`
- [x] T009 [US3] Create /tool.implement command `.claude/commands/tool.implement.md`

**Checkpoint**: User Stories 1, 2, AND 3 complete - developers can discover, spec, and implement

---

## Phase 6: User Story 4 - Verify Implementation Correctness (Priority: P2)

**Goal**: Enable developers to verify implementations produce correct output against golden examples

**Independent Test**: Run verification with correct and incorrect implementations, verify report accuracy

### Implementation for User Story 4

- [x] T010 [US4] Create golden-example-validator agent `.claude/agents/tools/golden-example-validator.md`
- [x] T011 [US4] Create /tool.verify command `.claude/commands/tool.verify.md`

**Checkpoint**: All four commands complete - full discover → spec → implement → verify workflow available

---

## Phase 7: User Story 5 - Capture Golden I/O from Running Java (Priority: P3)

**Goal**: Provide Java harness template for capturing tool input/output as golden examples

**Independent Test**: Use harness template with sample tool, verify JSON output follows naming convention

### Implementation for User Story 5

- [x] T012 [P] [US5] Create harness README `docs/tool-migration/java-harness-template/README.md`
- [x] T013 [P] [US5] Create Java harness template `docs/tool-migration/java-harness-template/ToolCaptureHarness.java`
- [x] T014 [P] [US5] Create Maven dependency fragment `docs/tool-migration/java-harness-template/pom-fragment.xml`
- [x] T015 [US5] Create example usage file `docs/tool-migration/java-harness-template/example-usage.java`

**Checkpoint**: All user stories complete - full workflow with Java harness for golden I/O capture

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end validation, documentation, and evidence collection

### End-to-End Validation

- [x] T016 Validate complete workflow by migrating one sample tool end-to-end
- [x] T017 Update quickstart.md with any learnings from validation

### Evidence Collection (REQUIRED)

> **Purpose**: Capture artifacts for PR description and future documentation

- [x] T018 Create evidence directory `specs/050-tool-migration-workflow/evidence/`
- [x] T019 Capture test summary (manual validation results) `specs/050-tool-migration-workflow/evidence/test-summary.md`
- [x] T020 Record usage example (complete workflow demo) `specs/050-tool-migration-workflow/evidence/usage-example.md`
- [x] T021 [P] Capture command documentation `specs/050-tool-migration-workflow/evidence/command-docs.md`
- [x] T022 [P] Document migration demonstration `specs/050-tool-migration-workflow/evidence/migration-demo.md`

### Media Content (REQUIRED)

- [x] T023 Create shipped blog post `specs/050-tool-migration-workflow/media/shipped-post.md`
- [x] T024 [P] Create LinkedIn shipped summary `specs/050-tool-migration-workflow/media/linkedin-shipped.md`

### PR Creation (REQUIRED - must be final task)

- [x] T025 Create PR and publish blog: run /speckit.pr (manual - gh CLI not available)

**Task T025 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion
- **User Stories (Phases 3-7)**: Depend on Foundational phase completion
  - US1 (discover) and US2 (spec) are co-P1 - can run in parallel
  - US3 (implement) and US4 (verify) are co-P2 - can run in parallel after P1
  - US5 (harness) is P3 - can run in parallel with others
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Phase 2 - No dependencies on other stories
- **User Story 3 (P2)**: Can start after Phase 2 - Logically follows US2 (needs specs)
- **User Story 4 (P2)**: Can start after Phase 2 - Logically follows US3 (needs implementations)
- **User Story 5 (P3)**: Can start after Phase 2 - Independent (Java harness)

### Parallel Opportunities

- All Setup tasks (T001-T002) can run in parallel
- US1 (T004-T005) and US2 (T006-T007) can run in parallel (both P1)
- US3 (T008-T009) and US4 (T010-T011) can run in parallel (both P2)
- US5 tasks T012-T014 can run in parallel (all create independent files)
- Evidence tasks T021-T022 can run in parallel

---

## Parallel Example: P1 Stories

```bash
# Launch both P1 user stories together:
Task: "Create legacy-tool-analyst agent"
Task: "Create /tool.discover command"
# AND in parallel:
Task: "Create tool-spec-author agent"
Task: "Create /tool.spec command"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (directories)
2. Complete Phase 2: Foundational (agent README)
3. Complete Phase 3: User Story 1 (discover)
4. **STOP and VALIDATE**: Test /tool.discover with sample Java source
5. Demo discovery capability

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (discover) → Test → Demo (can show tool inventory)
3. Add User Story 2 (spec) → Test → Demo (can create specs from Java)
4. Add User Story 3 (implement) → Test → Demo (can generate code)
5. Add User Story 4 (verify) → Test → Demo (can validate implementations)
6. Add User Story 5 (harness) → Test → Demo (complete workflow with golden I/O)
7. Each story adds value without breaking previous stories

### Recommended Order

Since this is infrastructure (commands/agents), sequential implementation is recommended:
1. **discover** → 2. **spec** → 3. **implement** → 4. **verify** → 5. **harness**

This matches the natural workflow: you discover tools, then spec them, then implement, then verify.

---

## Notes

- [P] tasks = different files, no dependencies
- [US#] label maps task to specific user story for traceability
- Each command can be tested independently once created
- Evidence is required - capture artifacts that prove the workflow works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
- No automated tests - this is developer tooling validated by end-to-end migration
