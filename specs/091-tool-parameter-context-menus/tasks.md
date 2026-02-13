# Tasks: Tool Parameter Context Menus

**Input**: Design documents from `/specs/091-tool-parameter-context-menus/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Tests are included as this feature spans schema validation, Python models, TypeScript UI components, and Storybook E2E.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. These are used in PR descriptions, documentation, and future blog posts.

**Evidence Directory**: `specs/091-tool-parameter-context-menus/evidence/`
**Media Directory**: `specs/091-tool-parameter-context-menus/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | pytest + vitest results with pass/fail counts | After all tests pass |
| usage-example.md | End-to-end walkthrough: click tool → menu → select → execute | After US1 complete |
| screenshots/context-menu-enum.png | Context menu showing enum choices | After ContextMenu stories work |
| screenshots/context-menu-custom.png | Custom input mode for duration parameter | After US4 complete |
| screenshots/context-menu-themes.png | Menu in light, dark, vscode themes | After E2E tests |

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

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create directories and scaffold files needed across all user stories

- [ ] T001 Create ContextMenu component directory `shared/components/src/ContextMenu/`
- [ ] T002 [P] Create ContextMenu barrel export `shared/components/src/ContextMenu/index.ts`
- [ ] T003 [P] Create evidence directory `specs/091-tool-parameter-context-menus/evidence/`

---

## Phase 2: Foundation — Schema Enums & Model Extension (Blocking Prerequisites)

**Purpose**: Define parameter-value enums in LinkML and extend ToolParameter model. ALL user stories depend on this.

**CRITICAL**: No user story work can begin until this phase is complete.

### Schema Layer

- [ ] T004 Add NamedColorEnum to LinkML schema `shared/schemas/src/linkml/common.yaml`
- [ ] T005 [P] Add MarkerSymbolEnum to LinkML schema `shared/schemas/src/linkml/common.yaml`
- [ ] T006 [P] Add CardinalDirectionEnum to LinkML schema `shared/schemas/src/linkml/common.yaml`
- [ ] T007 [P] Add DurationPresetEnum to LinkML schema `shared/schemas/src/linkml/common.yaml`
- [ ] T008 [P] Add NumericPresetEnum to LinkML schema `shared/schemas/src/linkml/common.yaml`
- [ ] T009 Extend PointShapeEnum with diamond and cross values `shared/schemas/src/linkml/common.yaml`
- [ ] T010 Add ParameterTypeEnum and ToolParameter class to tool schema `shared/schemas/src/linkml/tool.yaml`
- [ ] T011 Regenerate derived types (Pydantic, TypeScript, JSON Schema) `shared/schemas/scripts/generate.py`

### Schema Tests

- [ ] T012 [test] Add golden fixtures for new parameter-value enums `shared/schemas/fixtures/`
- [ ] T013 [P][test] Add round-trip tests for new enums `shared/schemas/tests/`
- [ ] T014 [test] Run schema test suite and verify all pass `shared/schemas/`

### Python Model Extension

- [ ] T015 Add param_type field to ToolParameter model `services/calc/debrief_calc/models.py`
- [ ] T016 Add validator: param_type must be valid ParameterTypeEnum member `services/calc/debrief_calc/models.py`
- [ ] T017 Update MCP output to include x-debrief-param-type annotation when param_type set `services/calc/debrief_calc/models.py`
- [ ] T018 [test] Add unit tests for ToolParameter param_type validation `services/calc/tests/test_models.py`
- [ ] T019 [test] Add unit tests for MCP x-debrief-param-type output `services/calc/tests/test_mcp_output.py`

### TypeScript Type Extension

- [ ] T020 Add paramType field to ToolParameter type in ToolMatch `shared/components/src/ToolMatch/types.ts`
- [ ] T021 Update mcpAdapter to extract x-debrief-param-type from inputSchema `shared/components/src/ToolMatch/mcpAdapter.ts`
- [ ] T022 [test] Add tests for mcpAdapter param_type extraction `shared/components/src/ToolMatch/__tests__/mcpAdapter.test.ts`
- [ ] T023 Add params field to tool:run message payload in ActivityPanel types `shared/components/src/ActivityPanel/types.ts`
- [ ] T024 [P] Extend tool:run message type in VS Code webview messages `apps/vscode/src/webview/messages.ts`
- [ ] T025 Add parameters array to ToolsPanelItem type `shared/components/src/ToolsPanel/types.ts`

### Extension Integration

- [ ] T026 Update executeTool handler to read and forward params from message `apps/vscode/src/commands/executeTool.ts`

**Checkpoint**: Foundation ready — parameter-value enums generated, ToolParameter model extended, message types updated, MCP adapter extracts param_type. User story implementation can begin.

---

## Phase 3: User Story 1 — Configure Enum Parameter Before Tool Execution (Priority: P1) MVP

**Goal**: When an analyst clicks a tool with enum parameters, an inline context menu appears showing schema-derived choices. Selecting a choice executes the tool with that value. Tools with no parameters execute immediately (backward compatible).

**Independent Test**: Click any tool with an enum parameter → context menu appears with correct choices → select a choice → tool executes with selected value.

### E2E Tests for User Story 1

- [ ] T027 [test] Create Playwright E2E test for ContextMenu rendering `shared/components/e2e/ContextMenu.spec.ts`
- [ ] T028 [P][test] Add theme variant E2E tests (light, dark, vscode) `shared/components/e2e/ContextMenu.spec.ts`

### Implementation for User Story 1

- [ ] T029 Create ContextMenu component with items, selection callback, and dismiss `shared/components/src/ContextMenu/ContextMenu.tsx`
- [ ] T030 [P] Create ContextMenu CSS with positioning and theming `shared/components/src/ContextMenu/ContextMenu.css`
- [ ] T031 Add viewport repositioning logic to ContextMenu `shared/components/src/ContextMenu/ContextMenu.tsx`
- [ ] T032 Add keyboard navigation (arrow keys, Enter, Escape) to ContextMenu `shared/components/src/ContextMenu/ContextMenu.tsx`
- [ ] T033 Add accessibility attributes (role=menu, role=menuitem, aria-*) to ContextMenu `shared/components/src/ContextMenu/ContextMenu.tsx`
- [ ] T034 Create ContextMenu Storybook stories `shared/components/src/ContextMenu/ContextMenu.stories.tsx`
- [ ] T035 [test] Write component tests for ContextMenu `shared/components/src/ContextMenu/__tests__/ContextMenu.test.tsx`
- [ ] T036 Create paramTypeResolver utility to map param_type names to generated enum values `shared/components/src/ToolMatch/paramTypeResolver.ts`
- [ ] T037 [test] Write tests for paramTypeResolver `shared/components/src/ToolMatch/__tests__/paramTypeResolver.test.ts`
- [ ] T038 Create ParameterCollector component for single-parameter enum flow `shared/components/src/ToolsPanel/ParameterCollector.tsx`
- [ ] T039 Update ToolsPanel to show ParameterCollector when tool has parameters `shared/components/src/ToolsPanel/ToolsPanel.tsx`
- [ ] T040 Ensure tools with no parameters still execute immediately on click `shared/components/src/ToolsPanel/ToolsPanel.tsx`
- [ ] T041 Update ToolsPanel Storybook stories with parameter flow `shared/components/src/ToolsPanel/ToolsPanel.stories.tsx`
- [ ] T042 [P] Update RunDropdown to trigger parameter collection for Analysis tools `shared/components/src/LayersToolbar/RunDropdown.tsx`

**Checkpoint**: User Story 1 complete — enum parameter menus work end-to-end. Tools with no parameters unaffected.

---

## Phase 4: User Story 2 — Collect Multiple Parameters Sequentially (Priority: P2)

**Goal**: Tools with multiple parameters collect values one at a time via successive context menus. Cancellation at any stage prevents execution entirely.

**Independent Test**: Click tool with 2+ parameters → first menu appears → select → second menu appears → select → tool executes with all values. Press Escape on second menu → no execution.

### Implementation for User Story 2

- [ ] T043 Extend ParameterCollector to handle multiple parameters sequentially `shared/components/src/ToolsPanel/ParameterCollector.tsx`
- [ ] T044 Add cancellation at any stage (Escape/click-outside dismisses all, no execution) `shared/components/src/ToolsPanel/ParameterCollector.tsx`
- [ ] T045 Show parameter name/label in menu header for each successive menu `shared/components/src/ContextMenu/ContextMenu.tsx`
- [ ] T046 [test] Write component tests for multi-parameter sequential flow `shared/components/src/ToolsPanel/__tests__/ParameterCollector.test.tsx`
- [ ] T047 Update ToolsPanel stories with multi-parameter tool example `shared/components/src/ToolsPanel/ToolsPanel.stories.tsx`

**Checkpoint**: User Story 2 complete — multi-parameter sequential collection works. Cancellation at any stage prevents execution.

---

## Phase 5: User Story 3 — Schema-Defined Parameter Types Eliminate Duplication (Priority: P3)

**Goal**: Migrate existing tool files from hardcoded choice lists to param_type references. Schema-defined enums become the single source of truth.

**Independent Test**: Add a new value to a parameter-value enum in the schema → regenerate → verify new value appears in both server-side validation and client-side menus without modifying any tool source files.

### Implementation for User Story 3

- [ ] T048 Migrate apply_symbol_style.py: replace VALID_SYMBOLS with param_type="MarkerSymbol" `services/calc/debrief_calc/tools/track/styling/apply_symbol_style.py`
- [ ] T049 [P] Migrate set_track_color.py: add param_type="NamedColor" to color param `services/calc/debrief_calc/tools/track/styling/set_track_color.py`
- [ ] T050 [P] Migrate symbol_interval.py: add param_type="DurationPreset" to interval param `services/calc/debrief_calc/tools/track/styling/symbol_interval.py`
- [ ] T051 [P] Migrate label_interval.py: add param_type="DurationPreset" to interval param `services/calc/debrief_calc/tools/track/styling/label_interval.py`
- [ ] T052 Remove hardcoded VALID_SYMBOLS constant from apply_symbol_style.py `services/calc/debrief_calc/tools/track/styling/apply_symbol_style.py`
- [ ] T053 [test] Verify no tool source file contains hardcoded parameter value lists `services/calc/tests/test_no_hardcoded_choices.py`
- [ ] T054 [test] Verify MCP output uses x-debrief-param-type for migrated tools `services/calc/tests/test_mcp_output.py`
- [ ] T055 [test] Add round-trip test: add new enum value → regenerate → verify availability `shared/schemas/tests/test_param_type_roundtrip.py`

**Checkpoint**: User Story 3 complete — no tool source files contain hardcoded parameter value lists. Schema is the single source of truth.

---

## Phase 6: User Story 4 — Custom Value Entry for Numeric and Duration Parameters (Priority: P4)

**Goal**: Duration and numeric parameters show preset choices from schema enums plus a "Custom..." option that reveals a text input for free-form entry with validation.

**Independent Test**: Click tool with duration parameter → preset menu appears → select "Custom..." → text input appears → type value → confirm → tool executes with custom value.

### Implementation for User Story 4

- [ ] T056 Add "Custom..." menu item rendering to ContextMenu `shared/components/src/ContextMenu/ContextMenu.tsx`
- [ ] T057 Add custom input mode: text input replaces menu items on "Custom..." selection `shared/components/src/ContextMenu/ContextMenu.tsx`
- [ ] T058 Add inline validation for custom input using parameterValidation logic `shared/components/src/ContextMenu/ContextMenu.tsx`
- [ ] T059 Add error state display for invalid custom values `shared/components/src/ContextMenu/ContextMenu.css`
- [ ] T060 Update ParameterCollector to handle duration/numeric param types with presets `shared/components/src/ToolsPanel/ParameterCollector.tsx`
- [ ] T061 [test] Write tests for custom input mode and validation `shared/components/src/ContextMenu/__tests__/ContextMenu.test.tsx`
- [ ] T062 Add ContextMenu stories for custom input mode and validation error state `shared/components/src/ContextMenu/ContextMenu.stories.tsx`
- [ ] T063 [P][test] Add E2E test for custom input flow `shared/components/e2e/ContextMenu.spec.ts`

**Checkpoint**: User Story 4 complete — duration and numeric parameters show presets plus custom entry with validation.

---

## Phase 7: User Story 5 — Boolean Parameter Toggle (Priority: P5)

**Goal**: Boolean parameters display two descriptive choices (true/false labels). Selecting one executes the tool with that boolean value.

**Independent Test**: Click tool with boolean parameter → two labeled choices appear → select one → tool executes with boolean value.

### Implementation for User Story 5

- [ ] T064 Add boolean parameter rendering to ParameterCollector (two descriptive items) `shared/components/src/ToolsPanel/ParameterCollector.tsx`
- [ ] T065 [test] Write tests for boolean parameter menu rendering `shared/components/src/ToolsPanel/__tests__/ParameterCollector.test.tsx`
- [ ] T066 Add ToolsPanel story with boolean parameter tool example `shared/components/src/ToolsPanel/ToolsPanel.stories.tsx`

**Checkpoint**: User Story 5 complete — boolean parameters show descriptive toggle choices.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, evidence collection, media content, and PR creation

### Edge Cases & Refinement

- [ ] T067 Handle clicking another tool while a context menu is open (dismiss + start new flow) `shared/components/src/ToolsPanel/ParameterCollector.tsx`
- [ ] T068 [P] Handle zero-value param_type (skip parameter, proceed to next) `shared/components/src/ToolsPanel/ParameterCollector.tsx`
- [ ] T069 [P] Handle missing x-debrief-param-type (fallback to inline choices or skip) `shared/components/src/ToolMatch/paramTypeResolver.ts`
- [ ] T070 [P] Handle window resize while menu is open (reposition) `shared/components/src/ContextMenu/ContextMenu.tsx`
- [ ] T071 Run quickstart.md validation `specs/091-tool-parameter-context-menus/quickstart.md`

### Evidence Collection (REQUIRED)

- [ ] T072 Capture test summary with pass/fail counts `specs/091-tool-parameter-context-menus/evidence/test-summary.md`
- [ ] T073 Create usage demonstration (end-to-end walkthrough) `specs/091-tool-parameter-context-menus/evidence/usage-example.md`
- [ ] T074 [P] Capture screenshot of enum context menu `specs/091-tool-parameter-context-menus/evidence/screenshots/context-menu-enum.png`
- [ ] T075 [P] Capture screenshot of custom input mode `specs/091-tool-parameter-context-menus/evidence/screenshots/context-menu-custom.png`

### E2E Evidence Collection (REQUIRED for UI components)

- [ ] T076 Run full E2E suite: `pnpm --filter @debrief/components test:e2e`
- [ ] T077 [P] Capture theme variant screenshots `specs/091-tool-parameter-context-menus/evidence/screenshots/`
- [ ] T078 Document E2E results `specs/091-tool-parameter-context-menus/evidence/e2e-summary.md`

### Media Content

- [ ] T079 Create shipped blog post `specs/091-tool-parameter-context-menus/media/shipped-post.md`
- [ ] T080 [P] Create LinkedIn shipped summary `specs/091-tool-parameter-context-menus/media/linkedin-shipped.md`

### PR Creation

- [ ] T081 Create PR and publish blog: run /speckit.pr

**Task T081 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundation (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundation — delivers MVP
- **US2 (Phase 4)**: Depends on US1 (extends ParameterCollector)
- **US3 (Phase 5)**: Depends on Foundation only — can run in parallel with US1/US2
- **US4 (Phase 6)**: Depends on US1 (extends ContextMenu)
- **US5 (Phase 7)**: Depends on US1 (extends ParameterCollector)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Foundation — Creates ContextMenu + ParameterCollector
- **User Story 2 (P2)**: Depends on US1 — Extends ParameterCollector for multi-param
- **User Story 3 (P3)**: Depends on Foundation — Independent tool migration (can parallel with US1)
- **User Story 4 (P4)**: Depends on US1 — Extends ContextMenu with custom input
- **User Story 5 (P5)**: Depends on US1 — Extends ParameterCollector for booleans

### Parallel Opportunities

- T004-T008: All parameter-value enum definitions can run in parallel
- T012-T013: Schema tests can run in parallel
- T020-T025: TypeScript type extensions can mostly run in parallel
- T048-T051: Tool file migrations can run in parallel
- US3 can run in parallel with US1/US2 (only touches Python tool files)
- T074-T075, T077: Evidence screenshots can be captured in parallel

---

## Parallel Example: Foundation Phase

```bash
# All enum definitions in parallel:
T004: Add NamedColorEnum
T005: Add MarkerSymbolEnum
T006: Add CardinalDirectionEnum
T007: Add DurationPresetEnum
T008: Add NumericPresetEnum

# Then sequentially:
T009: Extend PointShapeEnum (same file as above)
T010: Add ParameterTypeEnum to tool.yaml
T011: Regenerate all derived types

# Python and TypeScript extensions in parallel:
T015-T019: Python model + tests
T020-T026: TypeScript types + adapter + tests
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundation (schema enums, model extension, type updates)
3. Complete Phase 3: User Story 1 (ContextMenu + ParameterCollector + ToolsPanel)
4. **STOP and VALIDATE**: Click a tool with an enum parameter → menu appears → select → tool executes
5. Verify tools with no parameters still execute immediately

### Incremental Delivery

1. Setup + Foundation → Schema types generated, model extended
2. Add US1 → Enum parameter menus work → MVP
3. Add US2 → Multi-parameter sequential collection works
4. Add US3 → Tool files migrated, no more hardcoded choices
5. Add US4 → Custom input for numeric/duration
6. Add US5 → Boolean toggles
7. Polish → Edge cases, evidence, media, PR

### Recommended Order

US3 (tool migration) can be done in parallel with US1/US2 since it only touches Python tool files. The optimal execution is:

1. Foundation (Phase 2)
2. US1 (Phase 3) + US3 (Phase 5) in parallel
3. US2 (Phase 4)
4. US4 (Phase 6) + US5 (Phase 7) in parallel
5. Polish (Phase 8)

---

## Notes

- [P] tasks = different files, no dependencies
- [test] = test task
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **Evidence is required** — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
