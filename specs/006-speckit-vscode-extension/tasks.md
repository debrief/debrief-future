# Tasks: Debrief VS Code Extension

**Input**: Design documents from `/specs/006-speckit-vscode-extension/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Tests are included following VS Code extension testing best practices.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected.

**Evidence Directory**: `specs/006-speckit-vscode-extension/evidence/`
**Media Directory**: `specs/006-speckit-vscode-extension/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | vitest/e2e test results with pass/fail counts | After all tests pass |
| usage-example.md | Extension workflow walkthrough | After US1 complete |
| screenshot-map.png | Map panel with tracks displayed | After US1 complete |
| screenshot-selection.png | Selected tracks with glow effect | After US2 complete |
| screenshot-tools.png | Tools panel with available tools | After US3 complete |
| extension-demo.gif | Animated demo of full workflow | After all stories complete |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | ✅ During /speckit.plan |
| media/linkedin-planning.md | LinkedIn summary for planning | ✅ During /speckit.plan |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and VS Code extension scaffolding

- [ ] T001 Create extension project structure `apps/vscode/`
- [ ] T002 Initialize package.json with extension manifest `apps/vscode/package.json`
- [ ] T003 [P] Configure TypeScript with strict mode `apps/vscode/tsconfig.json`
- [ ] T004 [P] Configure esbuild for dual-target bundling `apps/vscode/esbuild.config.js`
- [ ] T005 [P] Configure vitest for unit testing `apps/vscode/vitest.config.ts`
- [ ] T006 [P] Add ESLint and Prettier configuration `apps/vscode/.eslintrc.json`
- [ ] T007 Create extension entry point skeleton `apps/vscode/src/extension.ts`
- [ ] T008 [P] Create webview HTML template `apps/vscode/src/webview/web/index.html`
- [ ] T009 [P] Add Leaflet and dependencies to webview `apps/vscode/src/webview/web/map.ts`

**Checkpoint**: Extension scaffolding complete, can activate in Extension Development Host

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T010 Define TypeScript interfaces for Plot, Track, Selection `apps/vscode/src/types/plot.ts`
- [ ] T011 [P] Define TypeScript interfaces for Tool, ToolExecution `apps/vscode/src/types/tool.ts`
- [ ] T012 [P] Define TypeScript interfaces for StacStore, Catalog `apps/vscode/src/types/stac.ts`
- [ ] T013 Create webview message protocol types `apps/vscode/src/webview/messages.ts`
- [ ] T014 Implement StacService wrapper for debrief-stac `apps/vscode/src/services/stacService.ts`
- [ ] T015 [P] Implement ConfigService wrapper for debrief-config `apps/vscode/src/services/configService.ts`
- [ ] T016 Create MapPanel webview controller base `apps/vscode/src/webview/mapPanel.ts`
- [ ] T017 Implement webview state persistence (getState/setState) `apps/vscode/src/webview/mapPanel.ts`
- [ ] T018 Create base Leaflet map initialization `apps/vscode/src/webview/web/map.ts`
- [ ] T019 Implement extension ↔ webview message passing `apps/vscode/src/webview/mapPanel.ts`
- [ ] T020 Register extension activation events in package.json `apps/vscode/package.json`

**Checkpoint**: Foundation ready - webview can display empty map, services connect to debrief packages

---

## Phase 3: User Story 1 - Browse and Display Plot Data (Priority: P1) 🎯 MVP

**Goal**: Analysts can browse STAC catalogs, open plots, and view tracks on an interactive map

**Independent Test**: Load any valid STAC plot and verify tracks display correctly on the map

### Tests for User Story 1

- [ ] T021 [P][test] Unit test for StacTreeProvider `apps/vscode/tests/unit/stacTreeProvider.test.ts`
- [ ] T022 [P][test] Unit test for track rendering logic `apps/vscode/tests/unit/trackRenderer.test.ts`
- [ ] T023 [test] Integration test for plot loading workflow `apps/vscode/tests/integration/plotLoading.test.ts`

### Implementation for User Story 1

- [ ] T024 Implement StacFileSystemProvider for Explorer `apps/vscode/src/providers/stacFileSystemProvider.ts`
- [ ] T025 Register stac:// URI scheme in package.json `apps/vscode/package.json`
- [ ] T026 Implement StacTreeProvider for Explorer tree view `apps/vscode/src/providers/stacTreeProvider.ts`
- [ ] T027 Add "STAC:" virtual folder prefix display `apps/vscode/src/providers/stacTreeProvider.ts`
- [ ] T028 Implement plot loading from STAC item `apps/vscode/src/services/stacService.ts`
- [ ] T029 [P] Implement track rendering on Leaflet map `apps/vscode/src/webview/web/trackRenderer.ts`
- [ ] T030 [P] Implement reference location rendering `apps/vscode/src/webview/web/locationRenderer.ts`
- [ ] T031 Configure Canvas renderer for 10k+ points performance `apps/vscode/src/webview/web/map.ts`
- [ ] T032 Implement track labels at start points `apps/vscode/src/webview/web/trackRenderer.ts`
- [ ] T033 Implement tooltip on track hover `apps/vscode/src/webview/web/trackRenderer.ts`
- [ ] T034 Register "debrief.openPlot" command `apps/vscode/src/commands/openPlot.ts`
- [ ] T035 Implement QuickPick for plot selection `apps/vscode/src/commands/openPlot.ts`
- [ ] T036 Implement drag-and-drop from Explorer to webview `apps/vscode/src/webview/mapPanel.ts`
- [ ] T037 Add floating toolbar (zoom in, zoom out, fit bounds) `apps/vscode/src/webview/web/toolbar.ts`
- [ ] T038 Add scale control to map (bottom-right) `apps/vscode/src/webview/web/map.ts`
- [ ] T039 Implement fitBounds on plot open `apps/vscode/src/webview/mapPanel.ts`
- [ ] T040 Implement welcome view with recent plots `apps/vscode/src/views/welcomeView.ts`
- [ ] T041 Track recently opened plots in workspace state `apps/vscode/src/services/recentPlotsService.ts`

**Checkpoint**: US1 complete - analysts can browse stores, open plots, see tracks on map with tooltips

---

## Phase 4: User Story 2 - Select Data Elements (Priority: P2)

**Goal**: Analysts can select tracks for analysis with visual feedback

**Independent Test**: Display any plot, click tracks, verify selection highlighting works

### Tests for User Story 2

- [ ] T042 [P][test] Unit test for SelectionManager `apps/vscode/tests/unit/selectionManager.test.ts`
- [ ] T043 [P][test] Unit test for time range filtering `apps/vscode/tests/unit/timeFilter.test.ts`
- [ ] T044 [test] Integration test for selection workflow `apps/vscode/tests/integration/selection.test.ts`

### Implementation for User Story 2

- [ ] T045 Implement SelectionManager class `apps/vscode/src/webview/web/selectionManager.ts`
- [ ] T046 Implement single-click track selection `apps/vscode/src/webview/web/selectionManager.ts`
- [ ] T047 Implement Shift+click multi-select `apps/vscode/src/webview/web/selectionManager.ts`
- [ ] T048 Implement Ctrl/Cmd+click toggle selection `apps/vscode/src/webview/web/selectionManager.ts`
- [ ] T049 Implement click-empty-space to clear selection `apps/vscode/src/webview/web/selectionManager.ts`
- [ ] T050 Implement selection glow effect (animated) `apps/vscode/src/webview/web/styles.css`
- [ ] T051 Add glow effect toggle in settings `apps/vscode/package.json`
- [ ] T052 Implement OutlineProvider for VS Code Outline panel `apps/vscode/src/providers/outlineProvider.ts`
- [ ] T053 Sync selection between map and Outline panel `apps/vscode/src/webview/mapPanel.ts`
- [ ] T054 Implement TimeRangeView in sidebar `apps/vscode/src/views/timeRangeView.ts`
- [ ] T055 Implement dual-handle time slider `apps/vscode/src/views/timeRangeView.ts`
- [ ] T056 Implement time-based track filtering `apps/vscode/src/webview/web/timeFilter.ts`
- [ ] T057 Add "Full Range" and "Fit to Selection" buttons `apps/vscode/src/views/timeRangeView.ts`
- [ ] T058 Register keyboard shortcuts (Ctrl+A, Delete, arrows) `apps/vscode/package.json`
- [ ] T059 Implement select all command `apps/vscode/src/commands/selectAll.ts`
- [ ] T060 Implement clear selection command `apps/vscode/src/commands/clearSelection.ts`

**Checkpoint**: US2 complete - analysts can select tracks with visual feedback, filter by time

---

## Phase 5: User Story 3 - Discover and Execute Analysis Tools (Priority: P3)

**Goal**: Analysts can discover applicable tools and execute them to see results on the map

**Independent Test**: Select tracks, verify tool discovery shows applicable tools, execute and see results

### Tests for User Story 3

- [ ] T061 [P][test] Unit test for CalcService MCP client `apps/vscode/tests/unit/calcService.test.ts`
- [ ] T062 [P][test] Unit test for tool filtering logic `apps/vscode/tests/unit/toolFilter.test.ts`
- [ ] T063 [test] Integration test for tool execution workflow `apps/vscode/tests/integration/toolExecution.test.ts`

### Implementation for User Story 3

- [ ] T064 Implement CalcService MCP client wrapper `apps/vscode/src/services/calcService.ts`
- [ ] T065 Implement lazy singleton connection pattern `apps/vscode/src/services/calcService.ts`
- [ ] T066 Implement tool caching with 60s TTL `apps/vscode/src/services/calcService.ts`
- [ ] T067 Implement circuit breaker for MCP errors `apps/vscode/src/services/calcService.ts`
- [ ] T068 Implement ToolsTreeProvider for sidebar `apps/vscode/src/providers/toolsTreeProvider.ts`
- [ ] T069 Implement ToolsView in sidebar `apps/vscode/src/views/toolsView.ts`
- [ ] T070 Filter tools based on selection context `apps/vscode/src/views/toolsView.ts`
- [ ] T071 Implement "Execute" button per tool `apps/vscode/src/views/toolsView.ts`
- [ ] T072 Implement tool execution with progress `apps/vscode/src/services/calcService.ts`
- [ ] T073 Show VS Code progress notification during execution `apps/vscode/src/commands/executeTool.ts`
- [ ] T074 Implement result layer rendering (dashed lines) `apps/vscode/src/webview/web/resultRenderer.ts`
- [ ] T075 Implement LayersView in sidebar `apps/vscode/src/views/layersView.ts`
- [ ] T076 Add visibility checkboxes per layer `apps/vscode/src/views/layersView.ts`
- [ ] T077 Implement "Clear Results" button `apps/vscode/src/views/layersView.ts`
- [ ] T078 Display error messages for failed tool execution `apps/vscode/src/commands/executeTool.ts`
- [ ] T079 Handle debrief-calc unavailable gracefully `apps/vscode/src/services/calcService.ts`

**Checkpoint**: US3 complete - full analysis workflow functional (select → discover → execute → view)

---

## Phase 6: User Story 4 - Manage STAC Store Configuration (Priority: P4)

**Goal**: Users can add and remove STAC store registrations

**Independent Test**: Start with no stores, add one, verify it appears in Explorer

### Tests for User Story 4

- [ ] T080 [P][test] Unit test for store validation `apps/vscode/tests/unit/storeValidation.test.ts`
- [ ] T081 [test] Integration test for store management `apps/vscode/tests/integration/storeManagement.test.ts`

### Implementation for User Story 4

- [ ] T082 Implement "debrief.addStore" command `apps/vscode/src/commands/addStore.ts`
- [ ] T083 Implement folder picker dialog for store path `apps/vscode/src/commands/addStore.ts`
- [ ] T084 Validate STAC catalog at selected path `apps/vscode/src/commands/addStore.ts`
- [ ] T085 Save store to debrief-config `apps/vscode/src/services/configService.ts`
- [ ] T086 Implement "debrief.removeStore" command `apps/vscode/src/commands/removeStore.ts`
- [ ] T087 Add context menu items for store management `apps/vscode/package.json`
- [ ] T088 Implement "Add Store" button in empty state `apps/vscode/src/views/welcomeView.ts`
- [ ] T089 Handle invalid store paths gracefully `apps/vscode/src/providers/stacTreeProvider.ts`
- [ ] T090 Implement "Update Path" action for invalid stores `apps/vscode/src/commands/updateStorePath.ts`

**Checkpoint**: US4 complete - users can manage their STAC store registrations

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final quality assurance

### Additional Features

- [ ] T091 Implement track color customization via context menu `apps/vscode/src/commands/changeTrackColor.ts`
- [ ] T092 Save custom track colors to plot metadata `apps/vscode/src/services/stacService.ts`
- [ ] T093 Implement PNG export command `apps/vscode/src/commands/exportPng.ts`
- [ ] T094 Integrate leaflet-image for canvas export `apps/vscode/src/webview/web/export.ts`
- [ ] T095 Implement WebviewPanelSerializer for session restore `apps/vscode/src/webview/mapPanel.ts`
- [ ] T096 Add all configuration properties to package.json `apps/vscode/package.json`
- [ ] T097 [P] Create extension icon and Activity Bar icon `apps/vscode/resources/`

### Documentation & Quality

- [ ] T098 Run and validate quickstart.md workflow `specs/006-speckit-vscode-extension/quickstart.md`
- [ ] T099 [P] Add CHANGELOG.md `apps/vscode/CHANGELOG.md`
- [ ] T100 [P] Add README.md for marketplace `apps/vscode/README.md`

### Evidence Collection (REQUIRED)

- [ ] T101 Create evidence directory `specs/006-speckit-vscode-extension/evidence/`
- [ ] T102 Capture test results in evidence/test-summary.md `specs/006-speckit-vscode-extension/evidence/test-summary.md`
- [ ] T103 Create usage demonstration in evidence/usage-example.md `specs/006-speckit-vscode-extension/evidence/usage-example.md`
- [ ] T104 [P] Capture screenshot of map with tracks `specs/006-speckit-vscode-extension/evidence/screenshot-map.png`
- [ ] T105 [P] Capture screenshot of selection with glow `specs/006-speckit-vscode-extension/evidence/screenshot-selection.png`
- [ ] T106 [P] Capture screenshot of tools panel `specs/006-speckit-vscode-extension/evidence/screenshot-tools.png`

### Runtime Verification (REQUIRED for VS Code Extension)

- [ ] T107 Run extension in Extension Development Host and verify activation
- [ ] T108 [P] Verify extension handles missing debrief-calc gracefully
- [ ] T109 Verify full workflow: browse → display → select → analyze → view

### Media Content

- [ ] T110 Create shipped blog post `specs/006-speckit-vscode-extension/media/shipped-post.md`
- [ ] T111 [P] Create LinkedIn shipped summary `specs/006-speckit-vscode-extension/media/linkedin-shipped.md`

### PR Creation

- [ ] T112 Create PR and publish blog: run /speckit.pr

**Task T112 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 (P1): Can start after Foundational
  - US2 (P2): Can start after Foundational (independent of US1)
  - US3 (P3): Can start after Foundational (benefits from US1+US2 complete for testing)
  - US4 (P4): Can start after Foundational (independent)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (Browse & Display)**: No dependencies on other stories - Core MVP
- **US2 (Selection)**: Independent but best tested with US1 complete
- **US3 (Tools)**: Requires selection (US2) for meaningful testing
- **US4 (Store Management)**: Fully independent

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Types/interfaces before services
- Services before providers/views
- Core implementation before UI refinements

### Parallel Opportunities

**Phase 1 (Setup)**:
```
T003, T004, T005, T006 can run in parallel (different config files)
T008, T009 can run in parallel (webview files)
```

**Phase 2 (Foundational)**:
```
T010, T011, T012 can run in parallel (type definitions)
T014, T015 can run in parallel (service wrappers)
```

**User Story 1**:
```
T021, T022 can run in parallel (unit tests)
T029, T030 can run in parallel (renderers)
```

**Evidence Collection**:
```
T104, T105, T106 can run in parallel (screenshots)
T110, T111 can run in parallel (media content)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 - Browse and Display
4. **STOP and VALIDATE**: Test by opening a plot and viewing tracks
5. Deploy as early preview if ready

### Incremental Delivery

1. Setup + Foundational → Extension scaffold ready
2. Add US1 → Can view plots on map → **MVP!**
3. Add US2 → Can select tracks → Enhanced interaction
4. Add US3 → Can run analysis tools → Full analysis workflow
5. Add US4 → Can manage stores → Self-service configuration
6. Polish → Screenshots, docs, marketplace ready

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (Browse & Display)
   - Developer B: US2 (Selection)
3. After US1+US2:
   - Developer A: US3 (Tools)
   - Developer B: US4 (Store Management)
4. All developers: Polish phase

---

## Notes

- [P] tasks = different files, no dependencies
- [US#] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **Evidence is required** - capture screenshots and test results
- Run `/speckit.pr` after all tasks complete to create PR with evidence
- Extension should work without debrief-calc (graceful degradation per Constitution I.1)
