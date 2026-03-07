# Tasks: Three-View Synchronization and Filter State

**Input**: Design documents from `/specs/132-three-view-sync/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Review Decisions Incorporated**:
- **1A**: Reuse existing `bboxOverlapsViewport`, `itemOverlapsFilter`, `parseTime` — no new spatial-filter.ts or temporal-filter.ts
- **5C**: Unify `TimeFilter` to epoch shape (refactor `TimeInstant` out of `TimeFilter`)
- **6A**: Full CatalogOverview replacement — migrate all 24 file references
- **7A–7D**: Add `viewportToBounds` tests, TimeFilter refactor tests, CatalogOverview test migration, defensive guards
- **9A**: Add reference-equality memoization in `useBrowserFilter`

---

## Evidence Requirements

**Evidence Directory**: `specs/132-three-view-sync/evidence/`
**Media Directory**: `specs/132-three-view-sync/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | vitest + Playwright results with pass/fail counts | After all tests pass |
| usage-example.md | Walkthrough of filter-narrow-discover workflow | After StacBrowser complete |
| screenshots/component-light.png | StacBrowser in light theme | During E2E tests |
| screenshots/component-dark.png | StacBrowser in dark theme | During E2E tests |
| screenshots/component-vscode.png | StacBrowser in VS Code theme | During E2E tests |
| screenshots/interaction.gif | Filter sync interaction (add filter → views update) | During E2E tests |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | Already exists |
| media/linkedin-planning.md | LinkedIn summary for planning | Already exists |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project scaffolding and directory structure for new components

- [x] T001 Create StacBrowser component directory and barrel export `shared/components/src/StacBrowser/index.ts`
- [x] T002 [P] Create StacBrowser prop types from contract `shared/components/src/StacBrowser/types.ts`
- [x] T003 [P] Create BrowserFilterSlice types from contract `services/session-state/src/types/browser-filter.ts`
- [x] T004 [P] Create StacBrowser CSS layout skeleton `shared/components/src/StacBrowser/StacBrowser.css`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story — TimeFilter refactor, store slice, viewportToBounds, and CatalogOverview removal

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### TimeFilter Epoch Refactor (Review Decision 5C)

Unify `TimeFilter` to use plain epoch numbers instead of `TimeInstant`. This touches 38 files across the codebase.

- [x] T005 Refactor `TimeFilter` to use epoch numbers: `{ start: number | null; end: number | null }` `services/session-state/src/types/temporal.ts`
- [x] T006 Update `TimeRange` to use epoch numbers: `{ start: number; end: number }` `services/session-state/src/types/temporal.ts`
- [x] T007 Keep `TimeInstant` as a utility type but remove from `TimeFilter`/`TimeRange`/`TemporalSlice` interfaces `services/session-state/src/types/temporal.ts`
- [x] T008 Update `TemporalSlice` to use epoch `currentTime: number | null` `services/session-state/src/types/temporal.ts`
- [x] T009 Update `TemporalActions` signatures to match new types `services/session-state/src/types/temporal.ts`
- [x] T010 Update `createTemporalSlice` implementation for epoch-based types `services/session-state/src/store/slices/temporal.ts`
- [x] T011 [test] Fix temporal slice tests for new epoch types `services/session-state/tests/unit/slices/temporal.test.ts`
- [x] T012 [P] Update session-state persistence layer for epoch types `services/session-state/src/persistence/load.ts`
- [x] T013 [P] Update session-state subscriptions for epoch types `services/session-state/src/store/subscriptions.ts`
- [x] T014 [P] Update MCP tool `setCurrentTime` for epoch types `services/session-state/src/server/tools/setCurrentTime.ts`
- [x] T015 [P] Update session-state performance and selective tests `services/session-state/tests/unit/performance.test.ts`
- [x] T016 [P] Update session-state subscription tests `services/session-state/tests/unit/subscriptions.test.ts`
- [x] T017 Update VS Code extension temporal consumers (timeRangeView, mapPanel, sessionManager, openPlot) `apps/vscode/src/views/timeRangeView.ts`
- [x] T018 [P] Update VS Code webview messages for epoch types `apps/vscode/src/webview/messages.ts`
- [x] T019 Update web-shell App.tsx for epoch types `apps/web-shell/src/App.tsx`
- [x] T020 Update TimeController component for epoch types `shared/components/src/TimeController/timeUtils.ts`
- [x] T021 [P] Update TimeController tests `shared/components/src/TimeController/timeUtils.test.ts`
- [x] T022 [P] Update Timeline component for epoch types `shared/components/src/Timeline/Timeline.tsx`
- [x] T023 [P] Update Timeline tests `shared/components/src/Timeline/Timeline.test.tsx`
- [x] T024 Update TimelineView component — unify `TemporalFilter` with `TimeFilter` (both now epoch) `shared/components/src/TimelineView/types.ts`
- [x] T025 [P] Update TimelineView implementation for unified filter type `shared/components/src/TimelineView/TimelineView.tsx`
- [x] T026 [P] Update timeline-helpers `itemOverlapsFilter` to accept `TimeFilter` directly `shared/components/src/utils/timeline-helpers.ts`
- [x] T027 [test] Update timeline-helpers tests for new `TimeFilter` shape `shared/components/src/utils/__tests__/timeline-helpers.test.ts`
- [x] T028 [test] Run full test suite to verify no regressions from TimeFilter refactor

**Checkpoint**: TimeFilter refactor complete — all temporal types use epoch numbers

### Store Slice and Spatial Utility

- [x] T029 Add `viewportToBounds(viewport: ViewportPolygon): Bounds` to existing bounds utility `shared/components/src/utils/bounds.ts`
- [x] T030 [test] Add viewportToBounds tests including degenerate polygon edge case `shared/components/src/utils/bounds.test.ts`
- [x] T031 Create BrowserFilterSlice Zustand slice implementation `services/session-state/src/store/slices/browser-filter.ts`
- [x] T032 Export new slice from slices barrel `services/session-state/src/store/slices/index.ts`
- [x] T033 Register BrowserFilterSlice in session store creation `services/session-state/src/store/createStore.ts`
- [x] T034 Export BrowserFilterSlice types from session-state package `services/session-state/src/types/index.ts`
- [x] T035 [test] Write BrowserFilterSlice unit tests (all actions + defaults + clearAll) `services/session-state/tests/unit/slices/browser-filter.test.ts`

### CatalogOverview Removal (Review Decision 6A)

Remove CatalogOverview and update all 24 references. StacBrowser replaces it as the top-level orchestrator.

- [ ] T036 Remove CatalogOverview component directory `shared/components/src/CatalogOverview/`
- [ ] T037 Update shared/components barrel export — replace CatalogOverview with StacBrowser `shared/components/src/index.ts`
- [ ] T038 Migrate CatalogOverviewItem type to a shared location (used by ExerciseListView, filter-engine) `shared/components/src/filter-engine/types.ts`
- [ ] T039 Update ExerciseListView types import path `shared/components/src/ExerciseListView/types.ts`
- [ ] T040 Update timeline-helpers import path `shared/components/src/utils/timeline-helpers.ts`
- [ ] T041 [P] Update timeline-helpers test imports `shared/components/src/utils/__tests__/timeline-helpers.test.ts`
- [ ] T042 Update VS Code catalogOverviewPanel to use StacBrowser `apps/vscode/src/panels/catalogOverviewPanel.ts`
- [ ] T043 [P] Update VS Code webview catalogOverview entry point `apps/vscode/src/webview/web/catalogOverview.tsx`
- [ ] T044 [P] Update VS Code commands referencing CatalogOverview `apps/vscode/src/commands/openCatalogOverview.ts`
- [ ] T045 [P] Update VS Code commands index `apps/vscode/src/commands/index.ts`
- [ ] T046 [P] Update VS Code stacTreeProvider reference `apps/vscode/src/providers/stacTreeProvider.ts`
- [ ] T047 Update web-shell App.tsx to use StacBrowser `apps/web-shell/src/App.tsx`
- [ ] T048 [P] Update web-shell mock service `apps/web-shell/src/mocks/stacService.ts`
- [ ] T049 [P] Update web-shell Playwright page objects `apps/web-shell/playwright/pages/CatalogPage.ts`
- [ ] T050 [test] Verify all existing tests pass after CatalogOverview removal

**Checkpoint**: Foundation ready — TimeFilter refactored, store slice created, CatalogOverview removed, all tests green

---

## Phase 3: User Story 1 — Metadata Filtering Across All Views (Priority: P1)

**Goal**: FilterBar metadata filters propagate to all three views via the shared BrowserFilterSlice

**Independent Test**: Add/remove metadata filters in FilterBar → verify list, map, and timeline show only matching exercises

### Tests for User Story 1

- [ ] T051 [test] Write useBrowserFilter hook tests — metadata-only filtering (null spatial/temporal) `shared/components/src/StacBrowser/__tests__/useBrowserFilter.test.ts`
- [ ] T052 [P][test] Write useBrowserFilter tests — items with no bbox pass metadata filter `shared/components/src/StacBrowser/__tests__/useBrowserFilter.test.ts`
- [ ] T053 [P][test] Write StacBrowser component test — renders all four child views `shared/components/src/StacBrowser/__tests__/StacBrowser.test.tsx`

### Implementation for User Story 1

- [ ] T054 Implement `useBrowserFilter` hook — metadata axis only, with reference-equality memoization (review 9A) `shared/components/src/StacBrowser/useBrowserFilter.ts`
- [ ] T055 Implement StacBrowser component — layout with FilterBar + ExerciseListView + MapView + TimelineView `shared/components/src/StacBrowser/StacBrowser.tsx`
- [ ] T056 Wire FilterBar `onFilteredItems` callback to `setMetadataFilteredIds` in StacBrowser `shared/components/src/StacBrowser/StacBrowser.tsx`
- [ ] T057 Create StacBrowser Storybook story with mock data `shared/components/src/StacBrowser/StacBrowser.stories.tsx`
- [ ] T058 [test] Verify metadata filter sync — add filter, check all views receive filtered items `shared/components/src/StacBrowser/__tests__/StacBrowser.test.tsx`

**Checkpoint**: Metadata filtering works across all views. FilterBar drives state; list, map, and timeline respond.

---

## Phase 4: User Story 2 — Spatial Filtering via Map Viewport (Priority: P2)

**Goal**: Map viewport changes filter list and timeline to exercises overlapping the viewport bounds

**Independent Test**: Pan/zoom map → verify list and timeline update to show only spatially overlapping exercises

### Tests for User Story 2

- [ ] T059 [test] Write useBrowserFilter tests — spatial-only filtering using existing `bboxOverlapsViewport` `shared/components/src/StacBrowser/__tests__/useBrowserFilter.test.ts`
- [ ] T060 [P][test] Write useBrowserFilter tests — exercises without bbox always pass spatial filter `shared/components/src/StacBrowser/__tests__/useBrowserFilter.test.ts`
- [ ] T061 [P][test] Write useBrowserFilter tests — defensive guard for degenerate viewport (review 7D) `shared/components/src/StacBrowser/__tests__/useBrowserFilter.test.ts`

### Implementation for User Story 2

- [ ] T062 Extend `useBrowserFilter` — add spatial axis using `viewportToBounds` + `bboxOverlapsViewport` from bounds.ts `shared/components/src/StacBrowser/useBrowserFilter.ts`
- [ ] T063 Add defensive guard: degenerate viewport (zero-area polygon) treated as "no spatial filter" `shared/components/src/StacBrowser/useBrowserFilter.ts`
- [ ] T064 Wire MapView `onViewportChange` to store's `setViewport` + `setSpatialFilterActive(true)` in StacBrowser `shared/components/src/StacBrowser/StacBrowser.tsx`
- [ ] T065 Add 150ms debounce for viewport changes in StacBrowser (reuse ViewportTracker pattern) `shared/components/src/StacBrowser/StacBrowser.tsx`
- [ ] T066 [test] Verify spatial filter sync — pan map, check list and timeline update `shared/components/src/StacBrowser/__tests__/StacBrowser.test.tsx`

**Checkpoint**: Spatial filtering works. Map viewport drives spatial axis; list and timeline respond.

---

## Phase 5: User Story 3 — Temporal Filtering via Timeline Range (Priority: P3)

**Goal**: Timeline range handle adjustments filter list and map to exercises overlapping the selected time range

**Independent Test**: Adjust timeline range handles → verify list and map update to show only temporally overlapping exercises

### Tests for User Story 3

- [ ] T067 [test] Write useBrowserFilter tests — temporal-only filtering using `itemOverlapsFilter` `shared/components/src/StacBrowser/__tests__/useBrowserFilter.test.ts`
- [ ] T068 [P][test] Write useBrowserFilter tests — exercises without temporal data always pass temporal filter `shared/components/src/StacBrowser/__tests__/useBrowserFilter.test.ts`
- [ ] T069 [P][test] Write useBrowserFilter tests — defensive guard for inverted timeFilter (start > end) (review 7D) `shared/components/src/StacBrowser/__tests__/useBrowserFilter.test.ts`

### Implementation for User Story 3

- [ ] T070 Extend `useBrowserFilter` — add temporal axis using `itemOverlapsFilter` from timeline-helpers.ts `shared/components/src/StacBrowser/useBrowserFilter.ts`
- [ ] T071 Add defensive guard: inverted timeFilter (start > end) treated as "no temporal filter" `shared/components/src/StacBrowser/useBrowserFilter.ts`
- [ ] T072 Wire TimelineView `onTemporalFilterChange` to store's `setTimeFilter` + `setTemporalFilterActive(true)` in StacBrowser `shared/components/src/StacBrowser/StacBrowser.tsx`
- [ ] T073 [test] Verify temporal filter sync — adjust timeline, check list and map update `shared/components/src/StacBrowser/__tests__/StacBrowser.test.tsx`

**Checkpoint**: Temporal filtering works. Timeline range drives temporal axis; list and map respond.

---

## Phase 6: User Story 4 — Combined Multi-Axis Filtering (Priority: P4)

**Goal**: All three filter axes (metadata + spatial + temporal) compose with AND logic, producing the correct intersection

**Independent Test**: Activate one filter from each axis → verify all views show only the intersection. Remove one filter → verify result set broadens.

### Tests for User Story 4

- [ ] T074 [test] Write useBrowserFilter tests — combined 3-axis filtering with 5+ distinct combinations (SC-004) `shared/components/src/StacBrowser/__tests__/useBrowserFilter.test.ts`
- [ ] T075 [P][test] Write useBrowserFilter tests — removing one axis broadens result set `shared/components/src/StacBrowser/__tests__/useBrowserFilter.test.ts`
- [ ] T076 [P][test] Write useBrowserFilter tests — activeFilterCount reports correct count (0–3) `shared/components/src/StacBrowser/__tests__/useBrowserFilter.test.ts`

### Implementation for User Story 4

- [ ] T077 Verify AND composition in `useBrowserFilter` — metadata ∩ spatial ∩ temporal `shared/components/src/StacBrowser/useBrowserFilter.ts`
- [ ] T078 Add `activeFilterCount` computation to `useBrowserFilter` result `shared/components/src/StacBrowser/useBrowserFilter.ts`
- [ ] T079 [test] Integration test — add metadata filter, zoom map, adjust timeline, verify all views sync `shared/components/src/StacBrowser/__tests__/StacBrowser.test.tsx`

**Checkpoint**: Multi-axis filtering works. All three axes compose correctly with AND logic.

---

## Phase 7: User Story 5 — Zero Results Handling (Priority: P5)

**Goal**: When no exercises match active filters, all views display a consistent "no matching exercises" state

**Independent Test**: Apply restrictive filters until zero matches → verify all views show empty state. Clear filter → verify recovery.

### Tests for User Story 5

- [ ] T080 [test] Write useBrowserFilter tests — `hasNoResults` is true when filteredItems is empty `shared/components/src/StacBrowser/__tests__/useBrowserFilter.test.ts`
- [ ] T081 [P][test] Write StacBrowser test — empty state rendered in all views when hasNoResults `shared/components/src/StacBrowser/__tests__/StacBrowser.test.tsx`
- [ ] T082 [P][test] Write StacBrowser test — filter bar remains visible during zero results (FR-014) `shared/components/src/StacBrowser/__tests__/StacBrowser.test.tsx`

### Implementation for User Story 5

- [ ] T083 Add `hasNoResults` to `useBrowserFilter` return value `shared/components/src/StacBrowser/useBrowserFilter.ts`
- [ ] T084 Implement zero-results overlay in StacBrowser — "No matching exercises. Adjust or clear filters to see results." `shared/components/src/StacBrowser/StacBrowser.tsx`
- [ ] T085 Wire `clearAllFilters` button in zero-results state to `clearAllBrowserFilters()` `shared/components/src/StacBrowser/StacBrowser.tsx`
- [ ] T086 Add ZeroResults Storybook story `shared/components/src/StacBrowser/StacBrowser.stories.tsx`
- [ ] T087 [test] Verify zero-results recovery — clear one filter, verify views repopulate `shared/components/src/StacBrowser/__tests__/StacBrowser.test.tsx`

**Checkpoint**: Zero-results handling complete. All views show consistent empty state with filter bar visible.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Evidence, E2E tests, media content, and final verification

### E2E Tests 🎭

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip or omit Playwright E2E tasks because you think browsers can't be installed. The project uses `@sparticuz/chromium` which bundles a Linux Chromium binary via npm. Standard browser CDN downloads are blocked (403), but this bundled binary works fully. Run `node apps/web-shell/run-playwright.mjs` to extract and configure. Full details: `docs/project_notes/playwright-installation-research.md`

- [ ] T088 Create Playwright E2E test for StacBrowser — rendering, theme variants (light/dark/vscode) `shared/components/e2e/StacBrowser.spec.ts`
- [ ] T089 [P] Add E2E interaction test — add metadata filter, verify sync across views `shared/components/e2e/StacBrowser.spec.ts`
- [ ] T090 [P] Add E2E test — zero results state rendering `shared/components/e2e/StacBrowser.spec.ts`
- [ ] T091 Run full E2E suite: `pnpm --filter @debrief/components test:e2e StacBrowser`

### Cross-Cutting

- [ ] T092 Run quickstart.md validation `specs/132-three-view-sync/quickstart.md`
- [ ] T093 [test] Run full CI check: `task verify`

### Evidence Collection (REQUIRED)

- [ ] T094 Capture test results using template (.specify/templates/evidence/test-summary-template.md) in `specs/132-three-view-sync/evidence/test-summary.md`
- [ ] T095 Create usage demonstration — filter-narrow-discover workflow walkthrough `specs/132-three-view-sync/evidence/usage-example.md`
- [ ] T096 [P] Capture theme screenshots (light/dark/vscode) to `specs/132-three-view-sync/evidence/screenshots/`
- [ ] T097 Capture interaction GIF showing filter sync (add filter → views update) to `specs/132-three-view-sync/evidence/screenshots/interaction.gif`

### Media Content

- [ ] T098 Create shipped blog post `specs/132-three-view-sync/media/shipped-post.md`
- [ ] T099 [P] Create LinkedIn shipped summary `specs/132-three-view-sync/media/linkedin-shipped.md`

### PR Creation

- [ ] T100 Create PR and publish blog: run /speckit.pr

**Task T100 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately
- **Phase 2 (Foundation)**: Depends on Phase 1 — BLOCKS all user stories
  - TimeFilter refactor (T005–T028) must complete before store slice (T029–T035)
  - CatalogOverview removal (T036–T050) can run in parallel with store slice work
- **Phase 3 (US1 Metadata)**: Depends on Phase 2 completion
- **Phase 4 (US2 Spatial)**: Depends on Phase 3 (useBrowserFilter exists)
- **Phase 5 (US3 Temporal)**: Depends on Phase 3 (useBrowserFilter exists); can run in parallel with Phase 4
- **Phase 6 (US4 Combined)**: Depends on Phases 3, 4, and 5 (all three axes implemented)
- **Phase 7 (US5 Zero Results)**: Depends on Phase 6 (needs combined filtering to test zero results meaningfully)
- **Phase 8 (Polish)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 2 (Foundation)
  │
  ├── Phase 3 (US1: Metadata) ──────────────┐
  │     │                                     │
  │     ├── Phase 4 (US2: Spatial) ──┐       │
  │     │                             │       │
  │     └── Phase 5 (US3: Temporal) ──┤       │
  │                                    │       │
  │                                    v       │
  │                              Phase 6 (US4: Combined)
  │                                    │
  │                                    v
  │                              Phase 7 (US5: Zero Results)
  │                                    │
  └────────────────────────────────────v
                                 Phase 8 (Polish)
```

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Hook logic before component wiring
- Component wiring before Storybook stories
- Core implementation before integration tests

### Parallel Opportunities

- **Phase 1**: T002, T003, T004 can all run in parallel
- **Phase 2 (TimeFilter refactor)**: T012–T016 can run in parallel after T005–T009
- **Phase 2 (CatalogOverview removal)**: T043–T049 can run in parallel after T042
- **Phase 3**: T052, T053 can run in parallel with T051
- **Phase 4**: T060, T061 can run in parallel with T059
- **Phase 5**: T068, T069 can run in parallel with T067
- **Phase 4 + Phase 5**: Can run in parallel (both depend only on Phase 3)
- **Phase 8 (Evidence)**: T096 can run in parallel with T095

---

## Parallel Example: Phase 2 Foundation

```bash
# After T005-T009 (temporal types refactored), launch all consumer updates in parallel:
T012: Update persistence layer
T013: Update subscriptions
T014: Update MCP tool
T015: Update performance tests
T016: Update subscription tests

# After T036 (CatalogOverview removed), launch all reference updates in parallel:
T043: VS Code webview entry
T044: VS Code openCatalogOverview command
T045: VS Code commands index
T046: VS Code stacTreeProvider
T048: web-shell mock service
T049: web-shell Playwright pages
```

---

## Implementation Strategy

### Incremental Delivery

1. **Phase 1 + 2**: Setup + Foundation → TimeFilter unified, store slice ready, CatalogOverview removed
2. **Phase 3 (US1)**: Metadata filtering → StacBrowser renders, FilterBar drives metadata axis
3. **Phase 4 (US2)**: Spatial filtering → Map viewport drives spatial axis
4. **Phase 5 (US3)**: Temporal filtering → Timeline range drives temporal axis
5. **Phase 6 (US4)**: Combined filtering → All three axes compose with AND
6. **Phase 7 (US5)**: Zero results → Empty state handled gracefully
7. **Phase 8**: Evidence, E2E, media, PR → Feature shipped

### Risk Mitigation

- **TimeFilter refactor (T005–T028)** is the highest-risk phase — touches 38 files. Run `task verify` after each batch of changes.
- **CatalogOverview removal (T036–T050)** has 24 file references. Remove the component directory first, then fix all compilation errors systematically.
- **useBrowserFilter** is the core logic — comprehensive tests (5+ combinations per SC-004) before integration.

---

## Notes

- [P] tasks = different files, no dependencies
- Tests follow vitest + React Testing Library patterns established in codebase
- Reuse existing `bboxOverlapsViewport` (bounds.ts:133) and `itemOverlapsFilter` (timeline-helpers.ts:128) — NO new filter utility files
- `viewportToBounds` is the only new utility function, added to existing `bounds.ts`
- Reference-equality memoization in `useBrowserFilter` prevents unnecessary child re-renders (review decision 9A)
- Defensive guards for degenerate viewport and inverted timeFilter (review decision 7D)
- Evidence is required — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
