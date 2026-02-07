# Tasks: Context-Sensitive Tool Offering VS Code Integration

**Input**: Design documents from `/specs/038-context-tool-vscode/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md, contracts/

**Tests**: Tests are included for critical integration points.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

**Evidence Directory**: `specs/038-context-tool-vscode/evidence/`
**Media Directory**: `specs/038-context-tool-vscode/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Vitest results for adapter and provider tests | After all tests pass |
| usage-example.md | VS Code workflow demonstrating tool discovery and execution | After US1+US2 complete |
| selection-flow.md | Diagram showing selection → matching → display flow | After US1 complete |
| tool-panel-states.png | Screenshots of Tools panel in different states | After US5 complete |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | During /speckit.plan ✓ |
| media/linkedin-planning.md | LinkedIn summary for planning | During /speckit.plan ✓ |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Test data enrichment and type alignment

- [x] T001 Enrich test data with all supported feature kinds `apps/vscode/test-data/local-store/items/exercise-alpha.geojson`
- [x] T002 [P] Add sample tools fixture for testing `apps/vscode/test-data/fixtures/sample-tools.json`
- [x] T003 [P] Align tool types with @debrief/components exports `apps/vscode/src/types/tool.ts`

**Checkpoint**: Test data and type foundations ready

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core adapter and service integration that MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 [test] Write unit tests for ToolMatchAdapter `apps/vscode/tests/unit/toolMatchAdapter.test.ts`
- [x] T005 Create ToolMatchAdapter service `apps/vscode/src/services/toolMatchAdapter.ts`
- [x] T006 Update CalcService to return Tool[] compatible with ToolMatchService `apps/vscode/src/services/calcService.ts`
- [x] T007 Update extension.ts to initialize ToolMatchAdapter with SessionManager `apps/vscode/src/extension.ts`
- [x] T008 [P] Add tool context value setters for menu visibility `apps/vscode/src/commands/index.ts`

**Checkpoint**: Foundation ready - ToolMatchAdapter bridges selection to ToolMatchService

---

## Phase 3: User Story 1 - Discover Available Tools from Selection (Priority: P1) 🎯 MVP

**Goal**: Analysts see applicable tools in the sidebar panel when they select features

**Independent Test**: Select two tracks → Tools panel shows "Range & Bearing" tool

### Tests for User Story 1

- [x] T009 [test] Write tests for ToolsTreeProvider with ToolMatchService integration `apps/vscode/tests/unit/toolsTreeProvider.test.ts`

### Implementation for User Story 1

- [x] T010 Update ToolsTreeProvider to use ToolMatchAdapter `apps/vscode/src/providers/toolsTreeProvider.ts`
- [x] T011 [P] Add empty state rendering for no selection `apps/vscode/src/providers/toolsTreeProvider.ts`
- [x] T012 [P] Add loading state for tool discovery `apps/vscode/src/providers/toolsTreeProvider.ts`
- [x] T013 Subscribe to session selection changes and refresh tree `apps/vscode/src/providers/toolsTreeProvider.ts`
- [x] T014 Add error state for calc service unavailable `apps/vscode/src/providers/toolsTreeProvider.ts`

**Checkpoint**: User Story 1 complete - Tools panel shows applicable tools on selection

---

## Phase 4: User Story 2 - Execute Tool and View Results (Priority: P2)

**Goal**: Clicking a tool executes it and results appear on plot with provenance

**Independent Test**: Select two tracks → Click "Range & Bearing" → Result feature appears with provenance

### Tests for User Story 2

- [x] T015 [test] Write tests for tool execution command `apps/vscode/tests/unit/executeTool.test.ts`

### Implementation for User Story 2

- [x] T016 Update executeTool command to call CalcService with feature IDs `apps/vscode/src/commands/executeTool.ts`
- [x] T017 Add provenance metadata to result features `apps/vscode/src/commands/executeTool.ts`
- [x] T018 Persist results via StacService with provenance `apps/vscode/src/commands/executeTool.ts`
- [x] T019 [P] Add error notification on tool execution failure `apps/vscode/src/commands/executeTool.ts`
- [x] T020 [P] Add success notification with result count `apps/vscode/src/commands/executeTool.ts`
- [x] T021 Wire tool click in tree provider to execute command `apps/vscode/src/providers/toolsTreeProvider.ts`

**Checkpoint**: User Story 2 complete - Tool execution works with provenance

---

## Phase 5: User Story 3 - Access Tools via Context Menu (Priority: P3)

**Goal**: Right-click on map shows "Tools" submenu with applicable tools

**Independent Test**: Select features → Right-click → See Tools submenu → Click tool → Execution works

### Implementation for User Story 3

- [x] T022 Add Tools submenu definition to package.json `apps/vscode/package.json`
- [x] T023 Register dynamic tool menu items in package.json `apps/vscode/package.json`
- [x] T024 Update context value setters to control menu visibility `apps/vscode/src/commands/index.ts`
- [x] T025 Add "when" clauses for each tool menu item `apps/vscode/package.json`

**Checkpoint**: User Story 3 complete - Context menu shows applicable tools

---

## Phase 6: User Story 4 - Access Tools via Command Palette (Priority: P4)

**Goal**: Command Palette shows "Debrief: {Tool Name}" commands for applicable tools

**Independent Test**: Select features → Ctrl+Shift+P → Type "Debrief" → See applicable tool commands

### Implementation for User Story 4

- [x] T026 Register tool commands in package.json with "Debrief: " prefix `apps/vscode/package.json`
- [x] T027 Add enablement clauses for tool commands `apps/vscode/package.json`
- [x] T028 Wire command handlers to executeTool `apps/vscode/src/extension.ts`

**Checkpoint**: User Story 4 complete - Command Palette integration works

---

## Phase 7: User Story 5 - Understand Why Tools Are Unavailable (Priority: P5)

**Goal**: "Show inactive tools" toggle reveals inactive tools with explanations

**Independent Test**: Select 1 track → Enable "Show inactive" → See "Requires 2 tracks (1 selected)"

### Implementation for User Story 5

- [x] T029 Add "Show inactive tools" toggle command `apps/vscode/package.json`
- [x] T030 Implement toggle state in ToolsTreeProvider `apps/vscode/src/providers/toolsTreeProvider.ts`
- [x] T031 Render inactive tools with explanation text from MatchResult `apps/vscode/src/providers/toolsTreeProvider.ts`
- [x] T032 Style inactive tools differently (grayed out) `apps/vscode/src/providers/toolsTreeProvider.ts`
- [x] T033 Persist toggle state in workspace settings `apps/vscode/src/providers/toolsTreeProvider.ts`

**Checkpoint**: User Story 5 complete - Inactive tool explanations visible

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Evidence collection, documentation, and PR creation

### Evidence Collection (REQUIRED)

- [x] T034 Create evidence directory `specs/038-context-tool-vscode/evidence/`
- [x] T035 Capture test results in `specs/038-context-tool-vscode/evidence/test-summary.md`
- [x] T036 Create usage example showing full workflow `specs/038-context-tool-vscode/evidence/usage-example.md`
- [x] T037 [P] Document selection → matching flow `specs/038-context-tool-vscode/evidence/selection-flow.md`
- [ ] T038 [P] Capture screenshots of Tools panel states `specs/038-context-tool-vscode/evidence/tool-panel-states.png`

### Media Content (REQUIRED)

- [x] T039 Create shipped blog post `specs/038-context-tool-vscode/media/shipped-post.md`
- [x] T040 [P] Create LinkedIn shipped summary `specs/038-context-tool-vscode/media/linkedin-shipped.md`

### PR Creation (REQUIRED - FINAL TASK)

- [x] T041 Create PR and publish blog: run /speckit.pr

**Task T041 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-7)**: All depend on Foundational phase completion
  - Can proceed sequentially in priority order (P1 → P2 → P3 → P4 → P5)
  - US2 depends on US1 (execution depends on discovery)
  - US3/US4/US5 can run after US2 in any order
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 2 (Foundation)
    │
    ├──► US1 (Discovery) ──► US2 (Execution) ──┬──► US3 (Context Menu)
    │                                          ├──► US4 (Command Palette)
    │                                          └──► US5 (Inactive Explanations)
    │
    └──► Phase 8 (Polish) after all US complete
```

### Within Each User Story

- Tests (where included) written FIRST, ensure they FAIL before implementation
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- T002/T003 can run in parallel (Setup phase)
- T011/T012 can run in parallel (US1 UI states)
- T019/T020 can run in parallel (US2 notifications)
- T037/T038 can run in parallel (evidence collection)
- T039/T040 can run in parallel (media content)

---

## Implementation Strategy

### MVP First (User Stories 1-2 Only)

1. Complete Phase 1: Setup (test data, types)
2. Complete Phase 2: Foundational (ToolMatchAdapter)
3. Complete Phase 3: User Story 1 (discovery in sidebar)
4. Complete Phase 4: User Story 2 (tool execution)
5. **STOP and VALIDATE**: Test discovery + execution end-to-end
6. Deploy/demo if ready

### Full Delivery

1. MVP (US1 + US2) → Core value delivered
2. Add US3 (Context menu) → Alternative access pattern
3. Add US4 (Command Palette) → Keyboard workflow support
4. Add US5 (Inactive explanations) → Discoverability enhancement
5. Polish phase → Evidence, media, PR

---

## Notes

- [P] tasks = different files or concerns, no dependencies
- [test] tasks = test file, should fail before implementation
- Total tasks: 41
- Test tasks: 3
- All tasks include explicit file paths
- Evidence artifacts will demonstrate feature works end-to-end
- /speckit.pr (T041) is final task to create PR and publish blog
