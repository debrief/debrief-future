# Tasks: Unified Debrief Activity Panel

**Input**: Design documents from `/specs/047-unified-activity-panel/`
**Prerequisites**: plan.md (complete), spec.md (complete), research.md, data-model.md, contracts/

---

## Evidence Requirements

**Evidence Directory**: `specs/047-unified-activity-panel/evidence/`
**Media Directory**: `specs/047-unified-activity-panel/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Vitest results for all components | After all tests pass |
| usage-example.md | How to open and use the unified panel | After integration complete |
| screenshots/panel-light.png | Panel in light theme | After Storybook stories work |
| screenshots/panel-dark.png | Panel in dark theme | After Storybook stories work |
| screenshots/panel-vscode.png | Panel in VS Code theme | After Storybook stories work |

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

**Purpose**: Project scaffolding and shared type definitions

- [ ] T001 Create webview message types from contract `shared/components/src/ActivityPanel/types.ts`
- [ ] T002 [P] Create ActivityPanel directory structure `shared/components/src/ActivityPanel/`
- [ ] T003 [P] Create ToolsPanel directory structure `shared/components/src/ToolsPanel/`
- [ ] T004 [P] Create LayersPanel directory structure `shared/components/src/LayersPanel/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared sub-components that all user stories depend on

**⚠️ CRITICAL**: The composed ActivityPanel (US1) and the VS Code integration cannot begin until ToolsPanel and LayersPanel exist as React components.

- [ ] T005 [P] Create ToolsPanel React component rendering a list of ToolMatch items with Codicon icons and vscrui Button `shared/components/src/ToolsPanel/ToolsPanel.tsx`
- [ ] T006 [P] Create ToolsPanel styles using --debrief-* tokens `shared/components/src/ToolsPanel/ToolsPanel.css`
- [ ] T007 [P] Create ToolsPanel Storybook stories with light/dark/VS Code theme variants `shared/components/src/ToolsPanel/ToolsPanel.stories.tsx`
- [ ] T008 [P] Create LayersPanel React component rendering a tree of LayerItem with visibility toggles using vscrui Checkbox and Codicon icons `shared/components/src/LayersPanel/LayersPanel.tsx`
- [ ] T009 [P] Create LayersPanel styles using --debrief-* tokens `shared/components/src/LayersPanel/LayersPanel.css`
- [ ] T010 [P] Create LayersPanel Storybook stories with light/dark/VS Code theme variants `shared/components/src/LayersPanel/LayersPanel.stories.tsx`
- [ ] T011 Export ToolsPanel and LayersPanel from package barrel `shared/components/src/index.ts`

**Checkpoint**: ToolsPanel and LayersPanel render in Storybook across all three theme variants

---

## Phase 3: User Story 1 — View All Activity Controls in One Panel (Priority: P1) 🎯 MVP

**Goal**: Analyst sees time controller, tools, and layers in a single unified panel with collapsible sections using vscrui Pane.

**Independent Test**: Open the activity sidebar and verify all three sections appear within a single panel with proper layout and Codicon section icons.

### Implementation for User Story 1

- [ ] T012 [US1] Create ActivityPanel component composing TimeController, ToolsPanel, and LayersPanel inside three vscrui Pane sections with Codicon identity icons `shared/components/src/ActivityPanel/ActivityPanel.tsx`
- [ ] T013 [US1] Create ActivityPanel styles (vertical stack layout, spacing) using --debrief-* tokens `shared/components/src/ActivityPanel/ActivityPanel.css`
- [ ] T014 [US1] Create ActivityPanel Storybook stories with mock data for all three sections, in light/dark/VS Code themes `shared/components/src/ActivityPanel/ActivityPanel.stories.tsx`
- [ ] T015 [US1] Create webview entry point bootstrapping ActivityPanel with React createRoot and ThemeProvider `apps/vscode/src/webview/web/activityPanel.tsx`
- [ ] T016 [US1] Create ActivityPanelViewProvider (WebviewViewProvider) with message passing to SessionManager `apps/vscode/src/views/activityPanelView.ts`
- [ ] T017 [US1] Update package.json: replace debrief.timeRange, debrief.tools, debrief.layers views with single debrief.activityPanel webview view `apps/vscode/package.json`
- [ ] T018 [US1] Update extension.ts: register ActivityPanelViewProvider, remove old timeRange/tools/layers provider registrations `apps/vscode/src/extension.ts`
- [ ] T019 [US1] Add esbuild entry point for activityPanel webview bundle `apps/vscode/esbuild.mjs`

**Checkpoint**: Single unified panel renders in VS Code with all three sections visible. Old separate panels removed.

---

## Phase 4: User Story 2 — Collapse and Expand Individual Sections (Priority: P2)

**Goal**: Analyst can collapse/expand each section independently, with state preserved across panel reopenings within the session.

**Independent Test**: Click each section header to collapse/expand and verify other sections gain the freed space. Close and reopen the panel to verify collapse state persists.

### Implementation for User Story 2

- [ ] T020 [US2] Add collapse state management to ActivityPanel using ActivityPanelState with vscode.setState/getState persistence `shared/components/src/ActivityPanel/ActivityPanel.tsx`
- [ ] T021 [US2] Add Storybook story variants for collapsed states (single collapsed, all collapsed, mixed) `shared/components/src/ActivityPanel/ActivityPanel.stories.tsx`
- [ ] T022 [US2] Wire collapse state persistence through webview postMessage in ActivityPanelViewProvider `apps/vscode/src/views/activityPanelView.ts`

**Checkpoint**: Collapse/expand works with session-scoped persistence. Storybook stories show all collapse state combinations.

---

## Phase 5: User Story 3 — Use Each Sub-Component Independently (Priority: P3)

**Goal**: Developer can import any sub-component (TimeController, ToolsPanel, LayersPanel) into a standalone test harness without VS Code dependencies.

**Independent Test**: Import a single sub-component into a standalone Vitest + React Testing Library test and verify it renders and responds to interactions without VS Code APIs.

### Implementation for User Story 3

- [ ] T023 [US3] Verify ToolsPanel has no VS Code API imports and accepts data via props only `shared/components/src/ToolsPanel/ToolsPanel.tsx`
- [ ] T024 [P] [US3] Verify LayersPanel has no VS Code API imports and accepts data via props only `shared/components/src/LayersPanel/LayersPanel.tsx`
- [ ] T025 [P] [US3] Verify ActivityPanel accepts sub-component data via props with optional onMessage callback for host communication `shared/components/src/ActivityPanel/ActivityPanel.tsx`
- [ ] T026 [US3] Add error boundary wrapping each Pane section so a failing sub-component shows inline error without affecting siblings `shared/components/src/ActivityPanel/ActivityPanel.tsx`
- [ ] T027 [US3] Add Storybook story demonstrating error boundary (one section throwing, others functional) `shared/components/src/ActivityPanel/ActivityPanel.stories.tsx`

**Checkpoint**: All sub-components render in Storybook without VS Code. Error boundary isolates failures per section.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Evidence, media, and PR creation

### Evidence Collection

- [ ] T028 Create evidence directory `specs/047-unified-activity-panel/evidence/`
- [ ] T029 Capture test summary with pass/fail counts `specs/047-unified-activity-panel/evidence/test-summary.md`
- [ ] T030 Create usage demonstration showing how to open and interact with the panel `specs/047-unified-activity-panel/evidence/usage-example.md`
- [ ] T031 [P] Capture Storybook screenshots of ActivityPanel in all three themes `specs/047-unified-activity-panel/evidence/screenshots/`

### Media Content

- [ ] T032 Create shipped blog post `specs/047-unified-activity-panel/media/shipped-post.md`
- [ ] T033 [P] Create LinkedIn shipped summary `specs/047-unified-activity-panel/media/linkedin-shipped.md`

### PR Creation

- [ ] T034 Create PR and publish blog: run /speckit.pr

**Task T034 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on T001 (types) — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion (ToolsPanel + LayersPanel exist)
- **User Story 2 (Phase 4)**: Depends on Phase 3 (ActivityPanel exists to add collapse state)
- **User Story 3 (Phase 5)**: Depends on Phase 3 (components exist to verify independence)
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Requires ToolsPanel + LayersPanel from Phase 2. Can start as soon as Phase 2 complete.
- **US2 (P2)**: Requires ActivityPanel from US1. Sequential after US1.
- **US3 (P3)**: Requires all components from US1. Can run in parallel with US2 (T023-T025 don't conflict with T020-T022).

### Parallel Opportunities

- **Phase 1**: T002, T003, T004 can run in parallel (directory creation)
- **Phase 2**: T005-T010 can all run in parallel (ToolsPanel and LayersPanel are independent)
- **Phase 4 + Phase 5**: US2 (collapse state) and US3 (independence verification) can run in parallel after US1
- **Phase 6**: T031, T033 can run in parallel with other evidence tasks

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (types + directories)
2. Complete Phase 2: Foundational (ToolsPanel + LayersPanel React components)
3. Complete Phase 3: User Story 1 (ActivityPanel + VS Code integration)
4. **STOP and VALIDATE**: Open sidebar, verify unified panel with all three sections
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Sub-components render in Storybook
2. User Story 1 → Unified panel in VS Code (MVP!)
3. User Story 2 → Collapse/expand with session persistence
4. User Story 3 → Error boundaries + independence verification
5. Polish → Evidence, media, PR

---

## Notes

- [P] tasks = different files, no dependencies
- [US#] label maps task to specific user story
- Existing TimeController component is reused as-is (already a shared React component)
- ToolsPanel and LayersPanel are new React components replacing native VS Code TreeViews
- All styles must use `--debrief-*` CSS tokens exclusively — no hardcoded colors
- All Storybook stories must include light, dark, and VS Code theme variants
- Section headers use Codicon icons for identity and collapse/expand chevrons
- Commit after each task or logical group
