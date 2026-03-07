# Tasks: Timeline/Gantt View with Temporal Filtering

**Input**: Design documents from `/specs/131-timeline-gantt-view/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Test-first approach per Constitution Art. VII. Tests included for all phases.

**Organization**: Tasks grouped by user story for independent implementation and testing.

**Review Decisions**: Incorporates all decisions from `/speckit.review`:
- **1A**: Consolidate timeline helpers into `utils/` (no `timeline-utils/` directory)
- **2B**: Rename `TimeRange` → `TimeSpan` to avoid session-state collision
- **3A + 4A**: Use session-state `TimeFilter` via shared types package
- **5A**: Generic `computeTimeRange` accepting `CatalogOverviewItem[]`
- **6A**: Rename `formatAxisLabel` → `formatTimeByRange`
- **7A**: Add scroll component test for 100+ items
- **8A**: CatalogOverview test gate after import refactoring
- **9A**: Add filter integration test (brush → filter → overlap)
- **10A**: Add throttle doc note on `onTemporalFilterChange`
- colourFn try/catch for Art. V.1 compliance

---

## Evidence Requirements

**Evidence Directory**: `specs/131-timeline-gantt-view/evidence/`
**Media Directory**: `specs/131-timeline-gantt-view/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | vitest + Playwright results | After all tests pass |
| usage-example.md | Storybook usage + code example | After component complete |
| screenshots/component-light.png | Light theme screenshot | After E2E tests |
| screenshots/component-dark.png | Dark theme screenshot | After E2E tests |
| screenshots/component-vscode.png | VS Code theme screenshot | After E2E tests |
| screenshots/interaction.gif | Brush drag interaction GIF | After E2E tests |

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

## Phase 1: Setup

**Purpose**: Project structure, shared types, and configuration

- [ ] T001 Create TimelineView component directory `shared/components/src/TimelineView/`
- [ ] T002 [P] Create shared temporal types (TimeSpan, extract TimeFilter/TimeInstant) `shared/components/src/utils/temporal-types.ts`
- [ ] T003 [P] Create TimelineView barrel export `shared/components/src/TimelineView/index.ts`
- [ ] T004 Add TimelineView export to package index `shared/components/src/index.ts`

---

## Phase 2: Foundation — Timeline Utilities (Blocking Prerequisites)

**Purpose**: Extract and consolidate timeline helpers into `utils/`. MUST be complete before any component work.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tests

> **NOTE**: Write these tests FIRST, ensure they FAIL before implementation (Art. VII)

- [ ] T005 [P] Write unit tests for `computeTimeRange` (empty, single item, range, same-datetime padding) `shared/components/src/utils/__tests__/timeline-helpers.test.ts`
- [ ] T006 [P] Write unit tests for `computeBarX` and `computeBarWidth` (positioning math, min-width 4px) `shared/components/src/utils/__tests__/timeline-helpers.test.ts`
- [ ] T007 [P] Write unit tests for `formatTimeByRange` (5 granularity tiers: <24h, <7d, <90d, <2y, >=2y) `shared/components/src/utils/__tests__/timeline-helpers.test.ts`
- [ ] T008 [P] Write unit tests for `formatDateRange` (range, single datetime, missing data) `shared/components/src/utils/__tests__/timeline-helpers.test.ts`
- [ ] T009 [P] Write unit tests for `itemOverlapsFilter` (overlap, no overlap, no-time-data excluded) `shared/components/src/utils/__tests__/timeline-helpers.test.ts`

### Implementation

- [ ] T010 Implement `computeTimeRange(items: CatalogOverviewItem[]): TimeSpan | null` with ±1h padding for same-datetime `shared/components/src/utils/timeline-helpers.ts`
- [ ] T011 [P] Implement `computeBarX` and `computeBarWidth` (reuse math from Timeline/canvas/TimeAxis.ts `timeToX`) `shared/components/src/utils/timeline-helpers.ts`
- [ ] T012 [P] Implement `formatTimeByRange(epoch: number, rangeSpan: number): string` using Intl.DateTimeFormat `shared/components/src/utils/timeline-helpers.ts`
- [ ] T013 [P] Implement `formatDateRange(start, end, datetime): string` `shared/components/src/utils/timeline-helpers.ts`
- [ ] T014 [P] Implement `itemOverlapsFilter(item: StacBrowserItem, filter: TimeFilter): boolean` `shared/components/src/utils/timeline-helpers.ts`
- [ ] T015 Update CatalogOverview to import `computeTimeRange` and `formatDateRange` from utils `shared/components/src/CatalogOverview/CatalogOverview.tsx`
- [ ] T016 Update CatalogOverview tests to import from utils (remove local copies of parseTime/computeTimeRange) `shared/components/src/CatalogOverview/__tests__/timeline.test.ts`
- [ ] T017 **GATE**: Verify CatalogOverview tests still pass after import refactoring: `pnpm --filter @debrief/components test`

**Checkpoint**: All timeline utilities in `utils/`, CatalogOverview uses them, all tests pass.

---

## Phase 3: User Story 1 — View Exercise Temporal Extents (Priority: P1)

**Goal**: Render horizontal bars for each exercise's temporal extent on a Gantt-style timeline with auto-scaling time axis.

**Independent Test**: Load 10 exercises with known temporal extents, verify bars render at correct positions, point markers for single-datetime exercises, empty state for no matches.

### Tests

> **NOTE**: Write these tests FIRST, ensure they FAIL before implementation (Art. VII)

- [ ] T018 [P] [US1] Write component test: renders bars for items with start/end datetimes `shared/components/src/TimelineView/__tests__/TimelineView.test.tsx`
- [ ] T019 [P] [US1] Write component test: renders point markers for single-datetime items `shared/components/src/TimelineView/__tests__/TimelineView.test.tsx`
- [ ] T020 [P] [US1] Write component test: displays "No matches" empty state `shared/components/src/TimelineView/__tests__/TimelineView.test.tsx`
- [ ] T021 [P] [US1] Write component test: displays "no time data" label for items without temporal metadata `shared/components/src/TimelineView/__tests__/TimelineView.test.tsx`
- [ ] T022 [P] [US1] Write component test: tooltip shows title and date range on hover `shared/components/src/TimelineView/__tests__/TimelineView.test.tsx`
- [ ] T023 [P] [US1] Write component test: time axis labels have correct granularity for range `shared/components/src/TimelineView/__tests__/TimelineView.test.tsx`
- [ ] T024 [US1] Write scroll component test: 100 items render, bar area has overflow-y, axis is fixed (SC-003, review 7A) `shared/components/src/TimelineView/__tests__/TimelineView.test.tsx`

### Implementation

- [ ] T025 [US1] Create component types (TimelineViewProps, TimelineBarData, ColourFn) using TimeSpan and TimeFilter from shared types `shared/components/src/TimelineView/types.ts`
- [ ] T026 [US1] Implement TimelineView component: SVG bars, time axis, row labels, empty state, tooltips, vertical scroll with fixed axis `shared/components/src/TimelineView/TimelineView.tsx`
- [ ] T027 [US1] Create component CSS (bar styles, axis, scroll container, empty state, tooltips) `shared/components/src/TimelineView/TimelineView.css`
- [ ] T028 [US1] Create Storybook stories: Default (10 items), Empty, SingleDatetime, ManyItems (100+), MixedMetadata `shared/components/src/TimelineView/TimelineView.stories.tsx`
- [ ] T029 [US1] Run tests and verify all US1 tests pass: `pnpm --filter @debrief/components test`

### E2E Tests for User Story 1 🎭

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — The project uses `@sparticuz/chromium` (bundled Linux Chromium via npm). Run `node apps/web-shell/run-playwright.mjs` to extract and configure. Full details: `docs/project_notes/playwright-installation-research.md`

- [ ] T030 [P] [US1] Create Playwright test for Default story (bar rendering, axis labels) `shared/components/e2e/TimelineView.spec.ts`
- [ ] T031 [P] [US1] Add theme variant tests (light, dark, vscode) `shared/components/e2e/TimelineView.spec.ts`
- [ ] T032 [P] [US1] Add tooltip hover interaction test `shared/components/e2e/TimelineView.spec.ts`
- [ ] T033 [US1] Run E2E tests: `pnpm --filter @debrief/components test:e2e TimelineView`

**Checkpoint**: Timeline renders bars, points, axis, tooltips, empty/no-data states. All US1 tests pass.

---

## Phase 4: User Story 2 — Adjust Time Range as Live Temporal Filter (Priority: P1)

**Goal**: Draggable brush overlay on the time axis that acts as a live temporal filter. Other views update dynamically.

**Independent Test**: Adjust time range, verify `onTemporalFilterChange` emits correct filter, verify `itemOverlapsFilter` correctly filters items.

### Tests

> **NOTE**: Write these tests FIRST, ensure they FAIL before implementation (Art. VII)

- [ ] T034 [P] [US2] Write component test: TimeBrush left handle drag emits updated filter `shared/components/src/TimelineView/__tests__/TimeBrush.test.tsx`
- [ ] T035 [P] [US2] Write component test: TimeBrush right handle drag emits updated filter `shared/components/src/TimelineView/__tests__/TimeBrush.test.tsx`
- [ ] T036 [P] [US2] Write component test: TimeBrush body drag pans the filter window `shared/components/src/TimelineView/__tests__/TimeBrush.test.tsx`
- [ ] T037 [P] [US2] Write component test: handles cannot cross (no inverted range, FR-013) `shared/components/src/TimelineView/__tests__/TimeBrush.test.tsx`
- [ ] T038 [P] [US2] Write component test: clearing brush emits null filter `shared/components/src/TimelineView/__tests__/TimeBrush.test.tsx`
- [ ] T039 [US2] Write integration test: render 5 items, simulate brush drag, verify onTemporalFilterChange called with correct range (review 9A) `shared/components/src/TimelineView/__tests__/TimelineView.test.tsx`

### Implementation

- [ ] T040 [US2] Implement TimeBrush component: SVG overlay with draggable left/right handles, brush body pan, handle clamping `shared/components/src/TimelineView/TimeBrush.tsx`
- [ ] T041 [US2] Integrate TimeBrush into TimelineView: wire onTemporalFilterChange callback with throttle doc note (review 10A) `shared/components/src/TimelineView/TimelineView.tsx`
- [ ] T042 [US2] Add Storybook story: WithBrush (demonstrating filter interaction) `shared/components/src/TimelineView/TimelineView.stories.tsx`
- [ ] T043 [US2] Run tests and verify all US2 tests pass: `pnpm --filter @debrief/components test`

### E2E Tests for User Story 2 🎭

- [ ] T044 [P] [US2] Create Playwright test for WithBrush story (drag handle, drag brush body, reset) `shared/components/e2e/TimelineView.spec.ts`
- [ ] T045 [US2] Run E2E tests: `pnpm --filter @debrief/components test:e2e TimelineView`

**Checkpoint**: Brush handles work, filter emits correctly, handles can't cross, integration test passes.

---

## Phase 5: User Story 3 — Exercise Selection Opens Editor (Priority: P2)

**Goal**: Double-clicking an exercise bar or point marker triggers `onItemSelect` with the item path.

**Independent Test**: Double-click a bar, verify `onItemSelect` is called with correct `itemPath`.

### Tests

- [ ] T046 [P] [US3] Write component test: double-click bar calls onItemSelect with correct itemPath `shared/components/src/TimelineView/__tests__/TimelineView.test.tsx`
- [ ] T047 [P] [US3] Write component test: double-click point marker calls onItemSelect `shared/components/src/TimelineView/__tests__/TimelineView.test.tsx`

### Implementation

- [ ] T048 [US3] Add double-click handler to TimelineView bars and point markers `shared/components/src/TimelineView/TimelineView.tsx`
- [ ] T049 [US3] Run tests and verify all US3 tests pass: `pnpm --filter @debrief/components test`

**Checkpoint**: Double-click triggers selection. All US1–US3 tests pass.

---

## Phase 6: User Story 4 — Colour Scheme Applied to Timeline Bars (Priority: P3)

**Goal**: Optional `colourFn` prop colours bars according to active colour scheme. Wraps in try/catch per Art. V.1 (review decision).

**Independent Test**: Provide a colourFn, verify bars use returned colour. Provide no colourFn, verify default colour.

### Tests

- [ ] T050 [P] [US4] Write component test: bars use colourFn return value for fill colour `shared/components/src/TimelineView/__tests__/TimelineView.test.tsx`
- [ ] T051 [P] [US4] Write component test: colourFn returning null falls back to default colour `shared/components/src/TimelineView/__tests__/TimelineView.test.tsx`
- [ ] T052 [P] [US4] Write component test: no colourFn prop → all bars use default colour `shared/components/src/TimelineView/__tests__/TimelineView.test.tsx`
- [ ] T053 [US4] Write component test: colourFn that throws → bars fall back to default colour (Art. V.1) `shared/components/src/TimelineView/__tests__/TimelineView.test.tsx`

### Implementation

- [ ] T054 [US4] Add colourFn integration to TimelineView with try/catch fallback `shared/components/src/TimelineView/TimelineView.tsx`
- [ ] T055 [US4] Add Storybook story: WithColourScheme (colour function active) `shared/components/src/TimelineView/TimelineView.stories.tsx`
- [ ] T056 [US4] Run tests and verify all US4 tests pass: `pnpm --filter @debrief/components test`

**Checkpoint**: Colour scheme integration works. All US1–US4 tests pass. colourFn errors handled gracefully.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: CI verification, evidence collection, media content, PR creation

### CI Verification

- [ ] T057 Run full lint check: `task lint` (or `uv run ruff check . && pnpm lint`)
- [ ] T058 Run full type check: `task typecheck` (or `uv run pyright && pnpm -r typecheck`)
- [ ] T059 Run full test suite: `task test` (or `uv run pytest && pnpm --filter '!@debrief/web-shell' test`)
- [ ] T060 Run Playwright E2E tests: `cd apps/web-shell && node run-playwright.mjs && cd ../..`

### Evidence Collection (REQUIRED)

- [ ] T061 Capture test results using template (.specify/templates/evidence/test-summary-template.md) `specs/131-timeline-gantt-view/evidence/test-summary.md`
- [ ] T062 Create usage demonstration `specs/131-timeline-gantt-view/evidence/usage-example.md`
- [ ] T063 [P] Capture light theme screenshot `specs/131-timeline-gantt-view/evidence/screenshots/component-light.png`
- [ ] T064 [P] Capture dark theme screenshot `specs/131-timeline-gantt-view/evidence/screenshots/component-dark.png`
- [ ] T065 [P] Capture VS Code theme screenshot `specs/131-timeline-gantt-view/evidence/screenshots/component-vscode.png`
- [ ] T066 Capture interaction GIF showing brush drag user flow `specs/131-timeline-gantt-view/evidence/screenshots/interaction.gif`

### E2E Evidence Collection 🎭

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — The project uses `@sparticuz/chromium` (bundled Linux Chromium via npm). Run `node apps/web-shell/run-playwright.mjs` to extract and configure. Full details: `docs/project_notes/playwright-installation-research.md`

- [ ] T067 Run full E2E suite: `pnpm --filter @debrief/components test:e2e`
- [ ] T068 [P] Document E2E results `specs/131-timeline-gantt-view/evidence/e2e-summary.md`

### Media Content

- [ ] T069 Create shipped blog post `specs/131-timeline-gantt-view/media/shipped-post.md`
- [ ] T070 [P] Create LinkedIn shipped summary `specs/131-timeline-gantt-view/media/linkedin-shipped.md`

### PR Creation

- [ ] T071 Create PR and publish blog: run /speckit.pr

**Task T071 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundation)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2 — renders bars, axis, tooltips
- **Phase 4 (US2)**: Depends on Phase 3 — brush overlay needs rendered bars
- **Phase 5 (US3)**: Depends on Phase 3 — double-click needs rendered bars (can run parallel with Phase 4)
- **Phase 6 (US4)**: Depends on Phase 3 — colour needs rendered bars (can run parallel with Phase 4/5)
- **Phase 7 (Polish)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Blocking — all other stories need rendered bars
- **US2 (P1)**: Depends on US1 (brush overlays the rendered timeline)
- **US3 (P2)**: Depends on US1 only — can parallel with US2
- **US4 (P3)**: Depends on US1 only — can parallel with US2/US3

### Within Each User Story

- Tests MUST be written and FAIL before implementation (Art. VII)
- Types/models before component implementation
- Component before Storybook stories
- All vitest tests pass before E2E tests

### Parallel Opportunities

- **Phase 1**: T002, T003 can run in parallel
- **Phase 2**: T005–T009 (all test tasks) can run in parallel; T010–T014 (implementations) can run in parallel
- **Phase 3**: T018–T024 (test tasks) can run in parallel; T030–T032 (E2E) can run in parallel
- **Phase 4**: T034–T038 (test tasks) can run in parallel; T044 can parallel with other E2E
- **Phase 5 + 6**: Can run in parallel with each other (both depend only on Phase 3)
- **Phase 7**: T063–T065 (screenshots) can run in parallel; T069–T070 can run in parallel

---

## Parallel Example: Phase 2 Foundation

```
# Write all test files in parallel:
T005: computeTimeRange tests
T006: computeBarX/computeBarWidth tests
T007: formatTimeByRange tests
T008: formatDateRange tests
T009: itemOverlapsFilter tests

# After tests written, implement in parallel:
T010: computeTimeRange
T011: computeBarX/computeBarWidth
T012: formatTimeByRange
T013: formatDateRange
T014: itemOverlapsFilter

# Sequential gate:
T015 → T016 → T017 (refactor CatalogOverview, update its tests, verify gate)
```

## Parallel Example: Phase 5 + Phase 6

```
# These can run simultaneously after Phase 3:
Phase 5 (US3): T046–T049 (double-click selection)
Phase 6 (US4): T050–T056 (colour scheme)
```

---

## Implementation Strategy

### Incremental Delivery

1. **Phase 1 + 2** → Foundation ready: all timeline helpers extracted and tested
2. **Phase 3 (US1)** → Static timeline renders correctly → independently testable
3. **Phase 4 (US2)** → Interactive filtering works → independently testable
4. **Phase 5 (US3)** → Exercise selection works → independently testable
5. **Phase 6 (US4)** → Colour scheme applied → independently testable
6. **Phase 7** → CI green, evidence captured, PR created

### Key Review Decisions Embedded in Tasks

| Decision | Affected Tasks | Impact |
|----------|---------------|--------|
| 1A: Consolidate into utils/ | T005–T016 | No `timeline-utils/` directory; helpers in `utils/timeline-helpers.ts` |
| 2B: TimeRange → TimeSpan | T002, T010, T025 | All new code uses `TimeSpan` |
| 3A + 4A: session-state TimeFilter via shared types | T002, T014, T025, T041 | `temporal-types.ts` exports TimeFilter/TimeInstant |
| 5A: Generic base type | T010 | `computeTimeRange` accepts `CatalogOverviewItem[]` |
| 6A: formatAxisLabel → formatTimeByRange | T007, T012 | Renamed for reusability |
| 7A: Scroll test | T024 | 100-item scroll component test added |
| 8A: CatalogOverview test gate | T017 | Explicit gate task |
| 9A: Integration test | T039 | Brush → filter emission integration test |
| 10A: Throttle doc note | T041 | JSDoc note on callback |
| V.1: colourFn try/catch | T053, T054 | Error boundary for external colour function |

---

## Notes

- [P] tasks = different files, no dependencies
- [USn] label maps task to specific user story
- Each user story is independently completable and testable
- Verify tests fail before implementing (Art. VII)
- Commit after each task or logical group (Art. XIII.1)
- Stop at any checkpoint to validate story independently
- Evidence is required — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
