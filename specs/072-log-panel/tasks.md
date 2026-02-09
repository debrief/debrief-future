# Tasks: Log Panel

**Input**: Design documents from `/specs/072-log-panel/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/messages.md

**Tests**: Storybook stories and E2E tests are included per plan.md Storybook E2E Testing section.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

**Evidence Directory**: `specs/072-log-panel/evidence/`
**Media Directory**: `specs/072-log-panel/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Unit + E2E test results with pass/fail counts | After all tests pass |
| usage-example.md | Walkthrough of opening panel, browsing timeline, selecting entries | After US1 + US2 complete |
| screenshots/timeline-compact.png | Log Panel in Compact mode with entries | After US3 complete |
| screenshots/timeline-normal.png | Log Panel in Normal mode | After US3 complete |
| screenshots/timeline-detailed.png | Log Panel in Detailed mode | After US3 complete |
| screenshots/filter-active.png | Log Panel with active filters | After US4 complete |
| screenshots/by-feature-view.png | By-Feature grouped view | After US5 complete |
| screenshots/empty-state.png | Empty state (no entries) | After US1 complete |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | During /speckit.plan |
| media/linkedin-planning.md | LinkedIn summary for planning | During /speckit.plan |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create directory structure, icon asset, and build configuration for the Log Panel

- [ ] T001 Create shared component directory structure `shared/components/src/LogPanel/`
- [ ] T002 [P] Create Log Panel activity bar icon `apps/vscode/resources/log-icon.svg`
- [ ] T003 [P] Add Log Panel webview esbuild entry point to compile script `apps/vscode/package.json`
- [ ] T004 Register Log Panel view container and view in VS Code package.json contributions `apps/vscode/package.json`

---

## Phase 2: Foundation (Blocking Prerequisites)

**Purpose**: Shared types, strings, utilities, and message protocol that ALL user stories depend on

- [ ] T005 Define shared TypeScript types (TimelineEntry, PresentationMode, ViewMode, FilterState, OperationCategory, LogPanelMessage) `shared/components/src/LogPanel/types.ts`
- [ ] T006 [P] Create externalisable user-facing strings module `shared/components/src/LogPanel/strings.ts`
- [ ] T007 [P] Implement operation category classification and filter logic utilities `shared/components/src/LogPanel/utils.ts`
- [ ] T008 [P] Create LogPanel CSS with VS Code theme variable mapping `shared/components/src/LogPanel/LogPanel.css`
- [ ] T009 Create LogPanelViewProvider skeleton (WebviewViewProvider, pending message queue, HTML with CSP) `apps/vscode/src/views/logPanelView.ts`
- [ ] T010 Create webview entry script skeleton (acquireVsCodeApi, React mount, webviewReady signal) `apps/vscode/src/webview/web/logPanel.tsx`
- [ ] T011 Register LogPanelViewProvider in extension activation `apps/vscode/src/extension.ts`
- [ ] T012 Create public exports index `shared/components/src/LogPanel/index.ts`

**Checkpoint**: Foundation ready — panel opens in sidebar with empty shell. User story implementation can now begin.

---

## Phase 3: User Story 1 — View Analytical History Timeline (Priority: P1) MVP

**Goal**: Analyst opens the Log Panel from the activity bar and sees a chronological timeline of all recorded operations, most recent first. New entries appear automatically.

**Independent Test**: Execute several tools on a plot, open the Log Panel, verify all operations appear in reverse chronological order with correct tool names, timestamps, and affected feature references.

### Implementation for User Story 1

- [ ] T013 [US1] Implement LogEntry component — renders a single timeline entry with tool name and affected feature names `shared/components/src/LogPanel/LogEntry.tsx`
- [ ] T014 [US1] Implement LogTimeline component — flat chronological list rendering LogEntry items, most recent first `shared/components/src/LogPanel/LogTimeline.tsx`
- [ ] T015 [US1] Implement LogPanel root component — layout shell with timeline area and empty state handling `shared/components/src/LogPanel/LogPanel.tsx`
- [ ] T016 [US1] Wire LogPanelViewProvider to SessionManager — subscribe to active session changes, call logService.getTimeline() `apps/vscode/src/views/logPanelView.ts`
- [ ] T017 [US1] Implement timeline:update message — send timeline data from provider to webview on load, session change, and tool execution `apps/vscode/src/views/logPanelView.ts`
- [ ] T018 [US1] Implement session:change message — notify webview when active plot changes or closes `apps/vscode/src/views/logPanelView.ts`
- [ ] T019 [US1] Wire webview entry script to receive timeline:update and session:change, pass data to LogPanel component `apps/vscode/src/webview/web/logPanel.tsx`
- [ ] T020 [US1] Implement empty states — "No plot is open" and "No operations recorded yet" `shared/components/src/LogPanel/LogPanel.tsx`
- [ ] T021 [US1] Implement SnapshotBoundary component — visual separator with "Show earlier history" placeholder `shared/components/src/LogPanel/SnapshotBoundary.tsx`

### Storybook for User Story 1

- [ ] T022 [P][US1] Create Storybook stories: Timeline Default, Empty State (no plot), Empty State (no entries), Loading State `shared/components/src/LogPanel/LogPanel.stories.tsx`

**Checkpoint**: Log Panel opens, shows timeline of entries. Core MVP is functional.

---

## Phase 4: User Story 2 — Highlight Affected Features on Selection (Priority: P2)

**Goal**: Selecting a Log entry replaces the map's feature selection with the affected features. Deselecting clears the selection.

**Independent Test**: Select a Log entry, verify correct features are selected on the map. Select a different entry, verify selection updates. Deselect, verify selection clears.

### Implementation for User Story 2

- [ ] T023 [US2] Add selected state to LogEntry component — visual highlight for selected entry, click handler `shared/components/src/LogPanel/LogEntry.tsx`
- [ ] T024 [US2] Implement entry:select and entry:deselect messages in LogPanel — track selectedEntryId, emit messages via onMessage callback `shared/components/src/LogPanel/LogPanel.tsx`
- [ ] T025 [US2] Handle entry:select in LogPanelViewProvider — call store.setSelection() with affected feature IDs `apps/vscode/src/views/logPanelView.ts`
- [ ] T026 [US2] Handle entry:deselect in LogPanelViewProvider — clear feature selection `apps/vscode/src/views/logPanelView.ts`
- [ ] T027 [US2] Wire webview entry script to send entry:select/entry:deselect messages to extension `apps/vscode/src/webview/web/logPanel.tsx`
- [ ] T028 [US2] Handle deleted features — show "(deleted)" label, skip in selection `shared/components/src/LogPanel/utils.ts`

### Storybook for User Story 2

- [ ] T029 [P][US2] Add Storybook stories: Entry Selected, Entry with deleted feature `shared/components/src/LogPanel/LogPanel.stories.tsx`

**Checkpoint**: Clicking entries selects features on map. Core interactive functionality complete.

---

## Phase 5: User Story 3 — Switch Presentation Modes (Priority: P3)

**Goal**: Analyst switches between Compact, Normal, and Detailed modes. Mode persists across sessions. Tool version shown on hover.

**Independent Test**: Toggle between modes, verify each shows correct level of detail. Close and reopen panel, verify mode persists.

### Implementation for User Story 3

- [ ] T030 [US3] Extend LogEntry component with Compact/Normal/Detailed rendering — show additional fields per mode `shared/components/src/LogPanel/LogEntry.tsx`
- [ ] T031 [US3] Add presentation mode toggle control to LogPanel — three-way toggle (Compact/Normal/Detailed) `shared/components/src/LogPanel/LogPanel.tsx`
- [ ] T032 [US3] Add tool version tooltip on hover in LogEntry `shared/components/src/LogPanel/LogEntry.tsx`
- [ ] T033 [US3] Implement mode:change message — webview sends mode changes to extension for persistence `apps/vscode/src/webview/web/logPanel.tsx`
- [ ] T034 [US3] Persist presentation mode in LogPanelViewProvider — save to context.globalState, restore on panel open `apps/vscode/src/views/logPanelView.ts`
- [ ] T035 [US3] Send initial presentation mode to webview on panel load `apps/vscode/src/views/logPanelView.ts`

### Storybook for User Story 3

- [ ] T036 [P][US3] Add Storybook stories: Compact Mode, Normal Mode, Detailed Mode `shared/components/src/LogPanel/LogPanel.stories.tsx`

**Checkpoint**: Three presentation modes work with persistence. Visual completeness for entries.

---

## Phase 6: User Story 4 — Filter and Search Log Entries (Priority: P4)

**Goal**: Analyst narrows timeline using text search, tool type dropdown, and operation category filter. Filters combine with AND logic. Filter row is collapsible.

**Independent Test**: Apply various filter combinations, verify only matching entries remain. Collapse filter row, verify filters stay applied.

### Implementation for User Story 4

- [ ] T037 [US4] Implement LogFilterRow component — search input, tool type dropdown, category dropdown, collapse toggle `shared/components/src/LogPanel/LogFilterRow.tsx`
- [ ] T038 [US4] Implement filter application logic — text search across tool name, feature name, parameter values; AND combination of filters `shared/components/src/LogPanel/utils.ts`
- [ ] T039 [US4] Integrate LogFilterRow into LogPanel — manage FilterState, apply filters to timeline, show "N of M entries" indicator `shared/components/src/LogPanel/LogPanel.tsx`
- [ ] T040 [US4] Populate tool type dropdown dynamically from current timeline entries `shared/components/src/LogPanel/utils.ts`
- [ ] T041 [US4] Add filter chip/badge display for active filters `shared/components/src/LogPanel/LogPanel.tsx`

### Storybook for User Story 4

- [ ] T042 [P][US4] Add Storybook stories: Filter Active (text search), Filter Active (tool type), Filter Active (category), Collapsed filter row `shared/components/src/LogPanel/LogPanel.stories.tsx`

**Checkpoint**: Filtering works. Panel usable at scale with many entries.

---

## Phase 7: User Story 5 — View by Feature Grouping (Priority: P5)

**Goal**: Analyst switches to By-Feature view. Entries grouped under feature headings, chronological within each group. Multi-feature entries appear in multiple groups.

**Independent Test**: Switch to By-Feature view, verify correct grouping and ordering. Switch back, verify flat timeline restores.

### Implementation for User Story 5

- [ ] T043 [US5] Implement LogByFeature component — group entries by feature, render headings with per-feature entry lists `shared/components/src/LogPanel/LogByFeature.tsx`
- [ ] T044 [US5] Implement feature grouping logic — distribute multi-feature entries across groups, sort within groups `shared/components/src/LogPanel/utils.ts`
- [ ] T045 [US5] Add view mode toggle to LogPanel — switch between Timeline and By-Feature views `shared/components/src/LogPanel/LogPanel.tsx`
- [ ] T046 [US5] Ensure filters apply in both view modes `shared/components/src/LogPanel/LogPanel.tsx`

### Storybook for User Story 5

- [ ] T047 [P][US5] Add Storybook stories: By-Feature View, By-Feature with multi-feature entry `shared/components/src/LogPanel/LogPanel.stories.tsx`

**Checkpoint**: Both view modes work. Panel provides two perspectives on analytical history.

---

## Phase 8: User Story 6 — Action Button Placeholders (Priority: P6)

**Goal**: Action bar displays Tune, Revert to Here, Revert This, Snapshot, and Rationale buttons. All show "not yet available" messages. Buttons disabled when no entry selected.

**Independent Test**: Click each button, verify "not available" message. Verify buttons disabled with no selection.

### Implementation for User Story 6

- [ ] T048 [US6] Implement LogActionBar component — 5 action buttons with disabled state based on selection `shared/components/src/LogPanel/LogActionBar.tsx`
- [ ] T049 [US6] Implement action:invoke message handling — webview sends action type and activityId `shared/components/src/LogPanel/LogPanel.tsx`
- [ ] T050 [US6] Handle action:invoke in LogPanelViewProvider — return action:result with "not available" message `apps/vscode/src/views/logPanelView.ts`
- [ ] T051 [US6] Display action result notification in webview `apps/vscode/src/webview/web/logPanel.tsx`
- [ ] T052 [US6] Integrate LogActionBar into LogPanel layout `shared/components/src/LogPanel/LogPanel.tsx`

### Storybook for User Story 6

- [ ] T053 [P][US6] Add Storybook stories: Actions Enabled (entry selected), Actions Disabled (no selection) `shared/components/src/LogPanel/LogPanel.stories.tsx`

**Checkpoint**: Full panel layout complete. All UI elements present including placeholder actions.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: E2E testing, evidence capture, media content, and PR creation

### E2E Tests

- [ ] T054 [P] Create Playwright E2E test for LogPanel rendering and theme variants `shared/components/e2e/LogPanel.spec.ts`
- [ ] T055 [P] Add E2E interaction tests — entry selection, mode toggle, filter, view switch `shared/components/e2e/LogPanel.spec.ts`
- [ ] T056 Run full E2E suite: `pnpm --filter @debrief/components test:e2e LogPanel`

### Evidence Collection

- [ ] T057 Create evidence directory `specs/072-log-panel/evidence/`
- [ ] T058 Capture test summary with pass/fail counts `specs/072-log-panel/evidence/test-summary.md`
- [ ] T059 Create usage demonstration walkthrough `specs/072-log-panel/evidence/usage-example.md`
- [ ] T060 [P] Capture screenshots: timeline modes (compact, normal, detailed) `specs/072-log-panel/evidence/screenshots/`
- [ ] T061 [P] Capture screenshots: filter active, by-feature view, empty state `specs/072-log-panel/evidence/screenshots/`
- [ ] T062 Document E2E results `specs/072-log-panel/evidence/e2e-summary.md`

### Media Content

- [ ] T063 Create shipped blog post `specs/072-log-panel/media/shipped-post.md`
- [ ] T064 [P] Create LinkedIn shipped summary `specs/072-log-panel/media/linkedin-shipped.md`

### PR Creation

- [ ] T065 Create PR and publish blog: run /speckit.pr

**Task T065 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundation (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phases 3-8)**: All depend on Foundation phase completion
  - US1 (Timeline) must complete before US2 (Selection) — selection needs entries to select
  - US3 (Modes) depends on US1 — needs entries to display in different modes
  - US4 (Filtering) depends on US1 — needs entries to filter
  - US5 (By-Feature) depends on US1 — needs entries to group
  - US6 (Action Buttons) depends on US1 — needs panel layout
  - US3, US4, US5, US6 can proceed in parallel after US1
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Foundation only — core timeline MVP
- **US2 (P2)**: US1 — needs entry rendering to add selection
- **US3 (P3)**: US1 — needs entry rendering to add modes
- **US4 (P4)**: US1 — needs timeline to add filtering
- **US5 (P5)**: US1 — needs timeline to add grouping
- **US6 (P6)**: US1 — needs panel to add action bar

### Within Each User Story

- Implementation tasks before Storybook stories (stories verify the implementation)
- Provider-side changes can parallel component changes where noted
- Commit after each logical group

### Parallel Opportunities

- T002, T003 can run in parallel (Phase 1)
- T005, T006, T007, T008 can run in parallel (Phase 2 types/strings/utils/css)
- After US1 completes: US3, US4, US5, US6 can all proceed in parallel
- Within each story: Storybook tasks are parallel with later implementation tasks

---

## Parallel Example: After US1 (MVP)

```
# After US1 is complete, these can proceed in parallel:
Branch A: US2 (Selection) → T023-T029
Branch B: US3 (Modes) → T030-T036
Branch C: US4 (Filters) → T037-T042
Branch D: US5 (By-Feature) → T043-T047
Branch E: US6 (Actions) → T048-T053
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundation (T005-T012)
3. Complete Phase 3: User Story 1 (T013-T022)
4. **STOP and VALIDATE**: Open Log Panel, verify timeline appears with entries
5. Demo the timeline view — core value delivered

### Incremental Delivery

1. Setup + Foundation → Panel opens with empty shell
2. US1 (Timeline) → **MVP!** Analyst can see all operations
3. US2 (Selection) → Analyst can correlate operations with map features
4. US3 (Modes) → Analyst can control detail level
5. US4 (Filtering) → Panel usable at scale
6. US5 (By-Feature) → Alternative perspective on history
7. US6 (Actions) → Layout complete for future phases
8. Polish → Evidence, media, PR

### Suggested MVP Scope

**US1 (Timeline View)** alone delivers the core value: the analyst can open the Log Panel and see what happened to their plot. This is the minimum viable product. Each subsequent story adds value incrementally without breaking previous stories.

---

## Notes

- [P] tasks = different files, no dependencies
- [USN] label maps task to specific user story for traceability
- Each user story is independently completable and testable after US1
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All user-facing strings go through `strings.ts` (Constitution XI)
- No new external dependencies (Constitution IX)
- CSP-compliant webview — no inline scripts (Constitution X / Security)
- Evidence is required — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
