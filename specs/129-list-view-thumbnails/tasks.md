# Tasks: List View with Spatial Thumbnails

**Input**: Design documents from `/specs/129-list-view-thumbnails/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Tests are included — the constitution mandates tests for all service/component code (Article VI).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Review Decisions Applied**: This task list incorporates all accepted recommendations from `/speckit.review`:
- 1A: Import `RecentPlot` instead of duplicating `RecentlyOpenedEntry`
- 2A: Remove `UpdateFilterStateMessage` from implementation scope (deferred to #132)
- 3B: Lazy GeoJSON loading with request/response message pair
- 4B: Start with 4 component files (inline sort control + recent section)
- 5A: `ExerciseListItem extends CatalogOverviewItem`
- 6A: `SpatialThumbnail` is props-driven (receives `trackData` + `loading`)
- 7A: Use `Intl` APIs for duration and relative time formatting
- 8A/9A/10A: Add tests for lazy-load round-trip, stale recent items, thumbnail error state
- 11A: `AbortController` for GeoJSON fetch cleanup
- 12B: Line simplification before SVG rendering

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. These are used in PR descriptions, documentation, and future blog posts.

**Evidence Directory**: `specs/129-list-view-thumbnails/evidence/`
**Media Directory**: `specs/129-list-view-thumbnails/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Vitest + Playwright results | After all tests pass |
| usage-example.md | Storybook usage + component API demo | After component complete |
| screenshots/component-light.png | Light theme screenshot | After E2E tests |
| screenshots/component-dark.png | Dark theme screenshot | After E2E tests |
| screenshots/component-vscode.png | VS Code theme screenshot | After E2E tests |
| screenshots/interaction.gif | Scroll + sort + click interaction | After E2E tests |

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

## Phase 1: Setup (Project Scaffolding)

**Purpose**: Create component directory structure and configuration files

- [x] T001 Create ExerciseListView directory and index `shared/components/src/ExerciseListView/index.ts`
- [x] T002 [P] Create component types extending CatalogOverviewItem (review 5A) `shared/components/src/ExerciseListView/types.ts`
- [x] T003 [P] Create component CSS with VS Code custom properties `shared/components/src/ExerciseListView/ExerciseListView.css`
- [x] T004 Add ExerciseListView export to shared components barrel `shared/components/src/index.ts`

---

## Phase 2: Foundation (Blocking Prerequisites)

**Purpose**: Utility functions and shared logic that all user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Implement duration computation and locale-aware formatting with Intl APIs (review 7A) `shared/components/src/ExerciseListView/utils.ts`
- [x] T006 [P] Implement sort comparators (recency, title, duration) with null handling `shared/components/src/ExerciseListView/utils.ts`
- [x] T007 [P] Implement relative time formatting using Intl.RelativeTimeFormat (review 7A) `shared/components/src/ExerciseListView/utils.ts`
- [x] T008 [P] Implement line simplification utility for SVG thumbnail rendering (review 12B) `shared/components/src/ExerciseListView/utils.ts`
- [x] T009 [test] Write unit tests for utility functions (duration, sort, relative time, simplification) `shared/components/src/ExerciseListView/utils.test.ts`
- [x] T010 Create mock fixture data factory for 100+ ExerciseListItem instances `shared/components/src/ExerciseListView/__fixtures__/mockData.ts`

**Checkpoint**: Foundation ready — utility functions tested, mock data available

---

## Phase 3: User Story 1 — Browse Exercises in Scrollable List (Priority: P1)

**Goal**: Analyst sees a scrollable list of all exercises with title, metadata summary, date summary, and spatial thumbnail for each item.

**Independent Test**: Load 100-item mock fixture set with no active filters and verify all items appear in a scrollable list with title, metadata summary, date summary, and spatial thumbnail visible for each item.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T011 [P] [US1] [test] Unit test: ExerciseListView renders all items with virtualisation `shared/components/src/ExerciseListView/ExerciseListView.test.tsx`
- [x] T012 [P] [US1] [test] Unit test: ExerciseListItemRow displays title, metadata summary, date, thumbnail `shared/components/src/ExerciseListView/ExerciseListView.test.tsx`
- [x] T013 [P] [US1] [test] Unit test: metadata truncation with "+N more" for long arrays `shared/components/src/ExerciseListView/ExerciseListView.test.tsx`
- [x] T014 [P] [US1] [test] Unit test: long title truncation with aria-label for tooltip `shared/components/src/ExerciseListView/ExerciseListView.test.tsx`
- [x] T015 [P] [US1] [test] Unit test: empty state renders "No exercises found" message `shared/components/src/ExerciseListView/ExerciseListView.test.tsx`

### Implementation for User Story 1

- [x] T016 [US1] Implement SpatialThumbnail — props-driven SVG renderer with loading/error states (review 6A), line simplification (review 12B) `shared/components/src/ExerciseListView/SpatialThumbnail.tsx`
- [x] T017 [US1] [test] Unit test: SpatialThumbnail renders tracks from GeoJSON, shows placeholder when trackData is null, shows loading state, shows error fallback (review 10A) `shared/components/src/ExerciseListView/SpatialThumbnail.test.tsx`
- [x] T018 [US1] Implement ExerciseListItemRow — row layout with metadata, date, thumbnail `shared/components/src/ExerciseListView/ExerciseListItemRow.tsx`
- [x] T019 [US1] Implement ExerciseListView — main container with virtualised scrolling, empty state, inline sort control (review 4B), inline recently opened section (review 4B) `shared/components/src/ExerciseListView/ExerciseListView.tsx`
- [x] T020 [US1] Add GeoJSON lazy-loading hook with AbortController cleanup (review 3B, 11A) `shared/components/src/ExerciseListView/ExerciseListView.tsx`
- [x] T021 [US1] [test] Unit test: lazy GeoJSON loading request/response round-trip (review 8A) `shared/components/src/ExerciseListView/ExerciseListView.test.tsx`

**Checkpoint**: Scrollable list renders 100 items with metadata and spatial thumbnails

---

## Phase 4: User Story 2 — Continue Recent Work (Priority: P2)

**Goal**: Analyst sees a "Recently Opened" section at the top of the list with relative timestamps, enabling one-click resumption.

**Independent Test**: Open three exercises in succession, then reopen the list view and verify the "Recently Opened" section shows all three exercises in reverse chronological order with relative timestamps.

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T022 [P] [US2] [test] Unit test: recently opened section renders at top with relative timestamps `shared/components/src/ExerciseListView/ExerciseListView.test.tsx`
- [x] T023 [P] [US2] [test] Unit test: recently opened section hidden when no recent items `shared/components/src/ExerciseListView/ExerciseListView.test.tsx`
- [x] T024 [P] [US2] [test] Unit test: clicking recent item calls onItemSelect with URI `shared/components/src/ExerciseListView/ExerciseListView.test.tsx`
- [x] T025 [P] [US2] [test] Unit test: recent items render independently of main exercise list (stale items) (review 9A) `shared/components/src/ExerciseListView/ExerciseListView.test.tsx`

### Implementation for User Story 2

- [x] T026 [US2] Implement recently opened section inline in ExerciseListView (review 4B) — items from props, relative time display, click handler `shared/components/src/ExerciseListView/ExerciseListView.tsx`
- [x] T027 [US2] Style recently opened section with visual prominence (border, icon, spacing) `shared/components/src/ExerciseListView/ExerciseListView.css`

**Checkpoint**: Recently opened section visible at top with relative timestamps, click opens exercise

---

## Phase 5: User Story 3 — Sort Exercises (Priority: P3)

**Goal**: Analyst can reorder the exercise list by recency, title, or duration, with ascending/descending toggle.

**Independent Test**: Load full fixture set, apply each sort option in turn, verify list reorders correctly for each.

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T028 [P] [US3] [test] Unit test: sort by recency orders items by date descending `shared/components/src/ExerciseListView/ExerciseListView.test.tsx`
- [x] T029 [P] [US3] [test] Unit test: sort by title orders items alphabetically `shared/components/src/ExerciseListView/ExerciseListView.test.tsx`
- [x] T030 [P] [US3] [test] Unit test: sort by duration orders by longest first `shared/components/src/ExerciseListView/ExerciseListView.test.tsx`
- [x] T031 [P] [US3] [test] Unit test: clicking same sort toggles direction `shared/components/src/ExerciseListView/ExerciseListView.test.tsx`
- [x] T032 [P] [US3] [test] Unit test: null dates/durations sort to end `shared/components/src/ExerciseListView/ExerciseListView.test.tsx`

### Implementation for User Story 3

- [x] T033 [US3] Implement inline sort control in ExerciseListView (review 4B) — dimension selector, direction toggle, memoised sorting `shared/components/src/ExerciseListView/ExerciseListView.tsx`
- [x] T034 [US3] Style sort control with VS Code custom properties `shared/components/src/ExerciseListView/ExerciseListView.css`

**Checkpoint**: Sort control functional with 3 dimensions and direction toggle

---

## Phase 6: User Story 4 — Select Exercise to Open (Priority: P4)

**Goal**: Analyst clicks an exercise to open it in a new editor tab while the browser retains its state.

**Independent Test**: Click an exercise in the list, verify click handler fires with correct itemPath, verify scroll position and sort state are not reset.

### Tests for User Story 4

- [x] T035 [P] [US4] [test] Unit test: clicking exercise row calls onItemSelect with itemPath `shared/components/src/ExerciseListView/ExerciseListView.test.tsx`
- [x] T036 [P] [US4] [test] Unit test: list retains sort state after item selection `shared/components/src/ExerciseListView/ExerciseListView.test.tsx`

### Implementation for User Story 4

- [x] T037 [US4] Add click handler to ExerciseListItemRow with keyboard accessibility (Enter/Space) `shared/components/src/ExerciseListView/ExerciseListItemRow.tsx`
- [x] T038 [US4] Add data-testid and aria-* attributes for accessibility and testing `shared/components/src/ExerciseListView/ExerciseListView.tsx`

**Checkpoint**: Exercise selection works via click and keyboard, state preserved

---

## Phase 7: Storybook Stories & E2E Tests

**Purpose**: Visual development environment and automated visual regression testing

### Storybook Stories

- [x] T039 Create Storybook stories: Default (100 items), WithRecentItems, EmptyState, NoMatches, SortByTitle, SortByDuration, FewItems, LightTheme `shared/components/src/ExerciseListView/ExerciseListView.stories.tsx`

### E2E Tests 🎭

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip these tests because you think browsers can't be installed. The project uses `@sparticuz/chromium` (bundled Linux Chromium via npm). Run `node apps/web-shell/run-playwright.mjs` to extract and configure. Full details: `docs/project_notes/playwright-installation-research.md`

- [x] T040 [P] Create Playwright E2E test for ExerciseListView stories `shared/components/e2e/ExerciseListView.spec.ts`
- [x] T041 [P] Add theme variant tests (light, dark, vscode) with screenshot capture `shared/components/e2e/ExerciseListView.spec.ts`
- [x] T042 [P] Add interaction tests: scroll, click item, sort change `shared/components/e2e/ExerciseListView.spec.ts`
- [x] T043 Run E2E tests: `pnpm --filter @debrief/components test:e2e ExerciseListView`

**Checkpoint**: All stories render in 3 themes, interactions verified

---

## Phase 8: Webview Message Integration

**Purpose**: Wire ExerciseListView into the VS Code webview message protocol

- [x] T044 Add list-view message types to webview messages following existing discriminated union pattern `apps/vscode/src/webview/messages.ts`
- [x] T045 [P] Add GeoJSON request/response message types for lazy loading (review 3B) `apps/vscode/src/webview/messages.ts`
- [x] T046 [test] Unit test: message type discrimination and serialisation `apps/vscode/src/webview/messages.test.ts`

**Checkpoint**: Message protocol extended and typed for list view

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final quality checks, evidence collection, and media content

### Quality Checks

- [x] T047 Run full CI verification: `task verify` (lint + typecheck + test)
- [x] T048 Verify ExerciseListView exports correctly from @debrief/components package

### Evidence Collection (REQUIRED)

> **Purpose**: Capture artifacts for PR description and future documentation

- [x] T049 Capture test results using template (.specify/templates/evidence/test-summary-template.md) `specs/129-list-view-thumbnails/evidence/test-summary.md`
- [x] T050 Create usage demonstration `specs/129-list-view-thumbnails/evidence/usage-example.md`

### E2E Evidence Collection (REQUIRED for UI components) 🎭

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — See `docs/project_notes/playwright-installation-research.md`

- [x] T051 Run full E2E suite: `pnpm --filter @debrief/components test:e2e`
- [x] T052 [P] Capture theme screenshots (light/dark/vscode) `specs/129-list-view-thumbnails/evidence/screenshots/`
- [x] T053 Capture interaction GIF showing scroll + sort + click flow `specs/129-list-view-thumbnails/evidence/screenshots/interaction.gif`
- [x] T054 Document E2E results `specs/129-list-view-thumbnails/evidence/e2e-summary.md`

### Media Content

- [x] T055 Create shipped blog post `specs/129-list-view-thumbnails/media/shipped-post.md`
- [x] T056 [P] Create LinkedIn shipped summary `specs/129-list-view-thumbnails/media/linkedin-shipped.md`

### PR Creation

- [x] T057 Create PR and publish blog: run /speckit.pr

**Task T057 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundation (Phase 2)**: Depends on Phase 1 (types must exist) — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 — core list rendering
- **US2 (Phase 4)**: Depends on Phase 3 — recently opened section lives inside ExerciseListView
- **US3 (Phase 5)**: Depends on Phase 3 — sort control lives inside ExerciseListView
- **US4 (Phase 6)**: Depends on Phase 3 — click handling on list items
- **Storybook/E2E (Phase 7)**: Depends on Phases 3-6 — all stories need components
- **Messages (Phase 8)**: Can run in parallel with Phases 4-6 (independent files)
- **Polish (Phase 9)**: Depends on all previous phases

### User Story Dependencies

- **US1 (P1)**: Blocks US2, US3, US4 (they build on the list container)
- **US2 (P2)**: Independent of US3, US4 after US1 complete
- **US3 (P3)**: Independent of US2, US4 after US1 complete
- **US4 (P4)**: Independent of US2, US3 after US1 complete

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Types/models before components
- Inner components before container integration
- Core rendering before styling refinements

### Parallel Opportunities

- Phase 1: T002, T003 can run in parallel
- Phase 2: T006, T007, T008 can run in parallel (different functions in same file — coordinate)
- Phase 3: T011–T015 tests can all run in parallel
- Phase 4: T022–T025 tests can all run in parallel; Phase 4 and Phase 5 can run in parallel after Phase 3
- Phase 5: T028–T032 tests can all run in parallel
- Phase 6: T035, T036 tests can run in parallel
- Phase 7: T040, T041, T042 can run in parallel (same file — coordinate)
- Phase 8: Can run in parallel with Phases 4-6

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: T011 "Unit test: ExerciseListView renders all items with virtualisation"
Task: T012 "Unit test: ExerciseListItemRow displays title, metadata, date, thumbnail"
Task: T013 "Unit test: metadata truncation with +N more"
Task: T014 "Unit test: long title truncation with aria-label"
Task: T015 "Unit test: empty state"

# Then implement sequentially:
Task: T016 "SpatialThumbnail component"
Task: T017 "SpatialThumbnail tests"
Task: T018 "ExerciseListItemRow component"
Task: T019 "ExerciseListView container"
Task: T020 "GeoJSON lazy-loading hook"
Task: T021 "Lazy-load round-trip test"
```

---

## Implementation Strategy

### Incremental Delivery

1. Phase 1 + 2 → Foundation ready (types, utils, mock data)
2. Phase 3 (US1) → Scrollable list with thumbnails — **core value delivered**
3. Phase 4 (US2) → Recent work resumption
4. Phase 5 (US3) → Sorting capability
5. Phase 6 (US4) → Exercise selection
6. Phase 7 → Storybook visual development + E2E visual regression
7. Phase 8 → VS Code message protocol integration
8. Phase 9 → Evidence, media, PR

### Key Review Decisions Reflected

| Review Issue | Decision | Impact on Tasks |
|---|---|---|
| 1A: RecentPlot reuse | Import from shared location | T002 types extend, don't duplicate |
| 2A: No filter messages | Removed from scope | No filter-related tasks |
| 3B: Lazy GeoJSON | Request/response pattern | T020 (hook), T021 (test), T045 (message type) |
| 4B: Fewer files | Inline sort + recent | T019 contains all, no separate SortControl.tsx/RecentlyOpenedSection.tsx |
| 5A: Extends CatalogOverviewItem | Type inheritance | T002 uses `extends` |
| 6A: Props-driven thumbnail | No internal fetch | T016 receives trackData + loading |
| 7A: Intl APIs | Locale-aware formatting | T005, T007 use Intl |
| 8A/9A/10A: Extra tests | Lazy load, stale items, error state | T021, T025, T017 |
| 11A: AbortController | Cancel on unmount | T020 |
| 12B: Line simplification | Douglas-Peucker or similar | T008, T016 |

---

## Notes

- [P] tasks = different files or independent sections, no dependencies
- [US#] label maps task to specific user story for traceability
- Each user story should be independently testable after its phase completes
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **Evidence is required** — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
