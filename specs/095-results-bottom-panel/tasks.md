# Tasks: Results Bottom Panel with Tabbed Layout

**Input**: Design documents from `/specs/095-results-bottom-panel/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/messages.md

**Tests**: Unit tests (Vitest) and Storybook E2E tests (Playwright) are included for the shared component.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

**Evidence Directory**: `specs/095-results-bottom-panel/evidence/`
**Media Directory**: `specs/095-results-bottom-panel/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Vitest + Playwright results with pass/fail counts | After all tests pass |
| usage-example.md | Step-by-step walkthrough of opening and viewing results | After panel integration complete |
| screenshots/empty-state.png | Empty panel state screenshot | After Storybook stories pass |
| screenshots/multiple-tabs.png | Panel with 3+ tabs in different states | After tab management works |
| screenshots/live-update.png | Before/after of a live-updated chart | After file watching works |
| e2e-summary.md | Playwright E2E results across theme variants | After E2E tests pass |

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

**Purpose**: Project scaffolding — type definitions, component skeleton, extension registration

- [x] T001 [P] Create ResultsPanel type definitions `shared/components/src/ResultsPanel/types.ts`
- [x] T002 [P] Create ResultsPanel component barrel export `shared/components/src/ResultsPanel/index.ts`
- [x] T003 [P] Create results panel message types in extension `apps/vscode/src/webview/messages.ts`
- [x] T004 Register panel view container and view in package.json `apps/vscode/package.json`
- [x] T005 Register "Show Results Panel" command in package.json `apps/vscode/package.json`
- [x] T006 Add resultsPanel webview entry point to esbuild config `apps/vscode/esbuild.config.js`
- [x] T007 Export ResultsPanel from shared components barrel `shared/components/src/index.ts`

---

## Phase 2: Foundation (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story — the view provider shell and webview entry point

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T008 Create ResultsPanelViewProvider shell with resolveWebviewView, message queueing, and disposal `apps/vscode/src/views/resultsPanelView.ts`
- [x] T009 Create resultsPanel.tsx webview entry point — mount React root, send webviewReady, listen for messages `apps/vscode/src/webview/web/resultsPanel.tsx`
- [x] T010 Register ResultsPanelViewProvider in extension activation `apps/vscode/src/extension.ts`
- [x] T011 Create empty-state ResultsPanel React component (renders "No results to display" when no tabs) `shared/components/src/ResultsPanel/ResultsPanel.tsx`

**Checkpoint**: Foundation ready — panel appears in VS Code bottom area with empty state. User story implementation can begin.

---

## Phase 3: User Story 1 — View a Tool Result After Tool Completion (Priority: P1) MVP

**Goal**: When a tool completes and persists a result, the bottom panel opens automatically with a tab showing the rendered chart/image/summary.

**Independent Test**: Trigger a tool that persists a result artifact to the plot's `results/` sub-folder and confirm the bottom panel opens with a tab displaying the appropriate content.

### Tests for User Story 1

- [x] T012 [test] Unit tests for ResultsPanel rendering (empty state, single tab, loading state, error state) `shared/components/src/ResultsPanel/ResultsPanel.test.tsx`
- [x] T013 [P][test] Unit tests for ResultTabContent content routing (dataset → chart, image → img, other → fallback) `shared/components/src/ResultsPanel/ResultTabContent.test.tsx`

### Implementation for User Story 1

- [x] T014 Implement ResultTabContent — content router dispatching to ChartRenderer, ImageViewer, or FallbackViewer based on artifactType `shared/components/src/ResultsPanel/ResultTabContent.tsx`
- [x] T015 [P] Implement ImageViewer — inline image display from data URI, scaled to fit `shared/components/src/ResultsPanel/ImageViewer.tsx`
- [x] T016 [P] Implement FallbackViewer — file summary (name, type, size) with "Open in VS Code" button `shared/components/src/ResultsPanel/FallbackViewer.tsx`
- [x] T017 Implement single-tab rendering in ResultsPanel — receives addTab messages, displays active tab content, shows loading/error states `shared/components/src/ResultsPanel/ResultsPanel.tsx`
- [x] T018 Add openResult() method to ResultsPanelViewProvider — reads file, determines artifact type, creates ResultTab, creates content payload, sends results:addTab message `apps/vscode/src/views/resultsPanelView.ts`
- [x] T019 Implement content preparation logic — parse JSON as DatasetEnvelope + transformDataset(), read images as base64 data URI, read file metadata for fallback `apps/vscode/src/views/resultsPanelView.ts`
- [x] T020 Wire auto-open: after tool result persistence in executeTool, call resultsPanelView.openResult() `apps/vscode/src/commands/index.ts`
- [x] T021 Handle webviewReady message — flush queued messages when webview mounts `apps/vscode/src/views/resultsPanelView.ts`

**Checkpoint**: Tool completion auto-opens the panel with a single result tab. Chart, image, and fallback content types all render correctly.

---

## Phase 4: User Story 2 — Live Update During Iterative Tuning (Priority: P2)

**Goal**: When a result file is overwritten by a tool re-run, the open tab detects the change and re-renders automatically within 2 seconds.

**Independent Test**: Open a result tab, overwrite the underlying file with new content, confirm the tab re-renders with updated data within 2 seconds.

### Implementation for User Story 2

- [x] T022 Add FileSystemWatcher creation per tab in ResultsPanelViewProvider — watch the result file's absolute path, dispose on tab close `apps/vscode/src/views/resultsPanelView.ts`
- [x] T023 Implement debounced file change handler — 200ms debounce after onDidChange, re-read file, re-prepare content, send results:updateContent message `apps/vscode/src/views/resultsPanelView.ts`
- [x] T024 Handle results:updateContent in ResultsPanel React component — update content for matching tab ID without changing tab position `shared/components/src/ResultsPanel/ResultsPanel.tsx`
- [x] T025 [test] Unit test for live update — verify updateContent replaces tab content without affecting tab order or active state `shared/components/src/ResultsPanel/ResultsPanel.test.tsx`

**Checkpoint**: Re-running a tool that overwrites the same result file causes the open tab to re-render automatically. Tab position is preserved.

---

## Phase 5: User Story 3 — Manage Multiple Result Tabs (Priority: P2)

**Goal**: Multiple tool results open as separate tabs. Analyst can switch between tabs and close individual tabs.

**Independent Test**: Open 3+ result tabs, switch between them to verify content displays correctly on each switch, close individual tabs to verify remaining tabs are unaffected.

### Tests for User Story 3

- [x] T026 [test] Unit tests for ResultTabBar — renders tab titles, handles click to switch, handles close button, shows empty state after last close `shared/components/src/ResultsPanel/ResultTabBar.test.tsx`

### Implementation for User Story 3

- [x] T027 Implement ResultTabBar — horizontal tab strip with tab titles, close buttons, active indicator, overflow scroll `shared/components/src/ResultsPanel/ResultTabBar.tsx`
- [x] T028 Implement multi-tab state in ResultsPanel — tab ordering, active tab tracking, switching between tabs (restoring cached content) `shared/components/src/ResultsPanel/ResultsPanel.tsx`
- [x] T029 Handle results:selectTab in webview — send to extension host; handle results:closeTab — send to extension host `shared/components/src/ResultsPanel/ResultsPanel.tsx`
- [x] T030 Handle closeTab and selectTab in ResultsPanelViewProvider — remove tab + dispose watcher on close, determine next active tab, send results:removeTab `apps/vscode/src/views/resultsPanelView.ts`
- [x] T031 Implement de-duplication in openResult() — if tab ID already exists, send results:activateTab instead of creating a new tab `apps/vscode/src/views/resultsPanelView.ts`

**Checkpoint**: Multiple tabs open, switch, and close correctly. Duplicate opens activate existing tabs. Closing the last tab shows empty state.

---

## Phase 6: User Story 4 — Identify Result Tabs by Title (Priority: P3)

**Goal**: Tab titles are derived from result metadata (DatasetEnvelope.title or filename). Titles truncate with ellipsis and show full text on hover tooltip. Multi-plot sessions show plot name prefix.

**Independent Test**: Open results with different metadata titles and confirm each tab displays the correct derived title. Hover over truncated titles to see full text.

### Implementation for User Story 4

- [x] T032 Implement title derivation in openResult() — extract DatasetEnvelope.title for datasets, use filename for images/other, apply plot prefix when multiple plots have tabs `apps/vscode/src/views/resultsPanelView.ts`
- [x] T033 Add title truncation and tooltip to ResultTabBar — CSS text-overflow ellipsis, HTML title attribute for full text on hover `shared/components/src/ResultsPanel/ResultTabBar.tsx`
- [x] T034 Handle results:updatePlotPrefixes — when the set of plots with open tabs changes, toggle plot name prefix in all tab titles `apps/vscode/src/views/resultsPanelView.ts`
- [x] T035 [test] Unit test for title derivation — dataset with title, dataset without title, image filename, fallback, multi-plot prefix `shared/components/src/ResultsPanel/ResultsPanel.test.tsx`

**Checkpoint**: Tab titles reflect result metadata. Truncated titles show full text on hover. Multi-plot tabs include plot names.

---

## Phase 7: User Story 5 — Open a Result from STAC Browser or Attachments Menu (Priority: P2)

**Goal**: Analyst can open a result from the STAC browser file tree or the attachments context menu, using the same panel and rendering as auto-open.

**Independent Test**: Persist a result file, open it via the STAC browser and confirm a tab appears. Open the same result via the attachments menu and confirm de-duplication activates the existing tab.

### Implementation for User Story 5

- [x] T036 Redirect openResultArtifact command to call resultsPanelView.openResult() instead of opening raw JSON in text editor `apps/vscode/src/commands/index.ts`
- [x] T037 Add STAC browser context menu action for result assets — register menu item with `viewItem == stacResultAsset` calling openResultArtifact `apps/vscode/package.json`

**Checkpoint**: All three entry points (auto-open, STAC browser, attachments menu) open results in the same panel with consistent rendering.

---

## Phase 8: User Story 6 — Open Results Panel via Command (Priority: P4)

**Goal**: Analyst can open the results panel via a VS Code command from the command palette.

**Independent Test**: Execute "Show Results Panel" from the command palette and confirm the panel appears.

### Implementation for User Story 6

- [x] T038 Register debrief.showResultsPanel command handler — reveal the results panel view `apps/vscode/src/commands/index.ts`

**Checkpoint**: The "Show Results Panel" command opens the panel, showing previously opened tabs or the empty state.

---

## Phase 9: Storybook Stories & E2E Tests

**Purpose**: Visual development stories and automated E2E testing across theme variants

### Storybook Stories

- [x] T039 Create Storybook stories — EmptyState, SingleDatasetTab, MultipleTabTypes, ImageTab, ErrorTab, FallbackTab `shared/components/src/ResultsPanel/ResultsPanel.stories.tsx`

### E2E Tests

- [x] T040 Create Playwright E2E test for MultipleTabs story — tab rendering, click to switch, click to close, hover tooltip `shared/components/e2e/ResultsPanel.spec.ts`
- [x] T041 [P] Add theme variant E2E tests — light, dark, vscode variants for MultipleTabs and EmptyState `shared/components/e2e/ResultsPanel.spec.ts`
- [x] T042 Run full E2E suite: `pnpm --filter @debrief/components test:e2e ResultsPanel`

**Checkpoint**: All Storybook stories render correctly. Playwright tests pass across all theme variants.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Responsive sizing, accessibility, error handling polish, evidence collection

### Polish

- [x] T043 Add responsive chart resizing — listen for panel resize events, propagate dimensions to ChartRenderer `shared/components/src/ResultsPanel/ResultTabContent.tsx`
- [x] T044 [P] Add accessibility attributes — data-testid on tab buttons, aria-label on close buttons, aria-selected on active tab `shared/components/src/ResultsPanel/ResultTabBar.tsx`
- [x] T045 Run unit tests: `pnpm --filter @debrief/components test -- ResultsPanel`
- [x] T046 Run linting: `pnpm --filter @debrief/components lint && pnpm --filter debrief-vscode lint`
- [x] T047 Build extension and verify no errors: `cd apps/vscode && npm run compile`

### Evidence Collection

- [x] T048 Create evidence directory `specs/095-results-bottom-panel/evidence/`
- [x] T049 Capture test summary with pass/fail counts `specs/095-results-bottom-panel/evidence/test-summary.md`
- [x] T050 Record usage example demonstrating feature workflow `specs/095-results-bottom-panel/evidence/usage-example.md`
- [x] T051 [P] Capture Storybook screenshots across theme variants `specs/095-results-bottom-panel/evidence/screenshots/`
- [x] T052 Document E2E results `specs/095-results-bottom-panel/evidence/e2e-summary.md`

### Media Content

- [x] T053 Create shipped blog post `specs/095-results-bottom-panel/media/shipped-post.md`
- [x] T054 [P] Create LinkedIn shipped summary `specs/095-results-bottom-panel/media/linkedin-shipped.md`

### PR Creation

- [ ] T055 Create PR and publish blog: run /speckit.pr

**Task T055 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately
- **Phase 2 (Foundation)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1 - Auto-open)**: Depends on Phase 2 — MVP, must complete first
- **Phase 4 (US2 - Live Update)**: Depends on Phase 3 (needs openResult and tab rendering)
- **Phase 5 (US3 - Multi-tab)**: Depends on Phase 3 (needs basic tab rendering)
- **Phase 6 (US4 - Titles)**: Depends on Phase 5 (needs tab bar)
- **Phase 7 (US5 - Entry Points)**: Depends on Phase 3 (needs openResult)
- **Phase 8 (US6 - Command)**: Depends on Phase 2 (just needs panel registered)
- **Phase 9 (Storybook + E2E)**: Depends on Phases 3-6 (needs all components)
- **Phase 10 (Polish)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Foundation only — no dependencies on other stories
- **US2 (P2)**: Depends on US1 (needs openResult and tab rendering in place)
- **US3 (P2)**: Depends on US1 (needs basic single-tab rendering)
- **US4 (P3)**: Depends on US3 (needs tab bar for title display)
- **US5 (P2)**: Depends on US1 (needs openResult method; independent of US2-US4)
- **US6 (P4)**: Foundation only — independent of all other stories

### Parallel Opportunities

After Phase 3 (US1) completes:
- **US2 (Live Update)** and **US3 (Multi-tab)** and **US5 (Entry Points)** and **US6 (Command)** can all proceed in parallel
- US4 (Titles) must wait for US3 (tab bar)

Within phases:
- T001, T002, T003 are parallel (different files)
- T015, T016 are parallel (independent viewer components)
- T051, T054 are parallel (independent evidence/media)

---

## Parallel Example: Phase 3 (User Story 1)

```bash
# Launch independent viewer components together:
Task: "Implement ImageViewer" (T015)
Task: "Implement FallbackViewer" (T016)

# Launch independent tests together:
Task: "Unit tests for ResultsPanel rendering" (T012)
Task: "Unit tests for ResultTabContent routing" (T013)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (scaffolding)
2. Complete Phase 2: Foundation (panel shell)
3. Complete Phase 3: User Story 1 (auto-open + single tab)
4. **STOP and VALIDATE**: Tool completion auto-opens panel with rendered result
5. Demo-ready with single-tab experience

### Incremental Delivery

1. Setup + Foundation → Panel appears with empty state
2. Add US1 (Auto-open) → Test independently → MVP complete
3. Add US2 (Live Update) → Iterative tuning works
4. Add US3 (Multi-tab) → Tab switching and closing works
5. Add US4 (Titles) → Metadata-derived titles with truncation
6. Add US5 (Entry Points) → STAC browser + attachments menu work
7. Add US6 (Command) → Manual panel access
8. Storybook + E2E → Visual regression coverage
9. Polish → Evidence + media + PR

### Suggested MVP Scope

**Phase 1 + Phase 2 + Phase 3** (tasks T001–T021) deliver the minimum viable feature: a bottom panel that auto-opens with a rendered result when a tool completes. This is independently testable and demo-ready.

---

## Notes

- [P] tasks = different files, no dependencies
- [test] = test task
- [US*] labels map tasks to user stories for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **Evidence is required** — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
