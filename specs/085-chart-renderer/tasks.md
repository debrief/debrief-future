# Tasks: Chart Renderer + Dataset-to-Spec Transformer

**Input**: Design documents from `/specs/085-chart-renderer/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Included — spec.md requires testable acceptance criteria for all user stories, and the plan specifies Vitest (unit) + Playwright (E2E).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

**Evidence Directory**: `specs/085-chart-renderer/evidence/`
**Media Directory**: `specs/085-chart-renderer/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Vitest + Playwright results with pass/fail counts | After all tests pass |
| usage-example.md | Code example: dataset JSON → transformer → ChartRenderer | After US1 complete |
| screenshots/bar-chart-light.png | Bar chart rendered in light theme | After Storybook stories work |
| screenshots/bar-chart-dark.png | Bar chart rendered in dark theme | After Storybook stories work |
| screenshots/bar-chart-vscode.png | Bar chart rendered in VS Code theme | After Storybook stories work |
| screenshots/line-chart-light.png | Line chart rendered in light theme | After US2 complete |
| screenshots/empty-state.png | Empty state display | After edge case handling |
| screenshots/error-state.png | Error state display | After edge case handling |
| isolation-check.md | Grep results proving Vega-Lite isolation (FR-008, SC-004) | After all stories complete |

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

**Purpose**: Add Vega-Lite dependencies and scaffold the ChartRenderer module structure

- [x] T001 Install vega, vega-lite, vega-embed dependencies in shared/components `shared/components/package.json`
- [x] T002 Add ChartRenderer entry point to Vite build config `shared/components/vite.config.ts`
- [x] T003 Add ChartRenderer subpath export to package.json `shared/components/package.json`
- [x] T004 [P] Create ChartRenderer module directory structure `shared/components/src/ChartRenderer/index.ts`
- [x] T005 [P] Create transformer module directory structure `shared/components/src/ChartRenderer/transformer/index.ts`
- [x] T006 [P] Create fixtures directory with test datasets `shared/components/src/ChartRenderer/fixtures/`

**Checkpoint**: Module scaffolding in place, dependencies installed, build config updated

---

## Phase 2: Foundation (Blocking Prerequisites)

**Purpose**: Core types, transformer registry, and theme config that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Define DatasetEnvelope, AxisDefinition, DataSeries types `shared/components/src/ChartRenderer/types.ts`
- [x] T008 Define TransformerError, TransformResult, TransformFunction types `shared/components/src/ChartRenderer/transformer/types.ts`
- [x] T009 Implement TransformerRegistry class with register/transform/getSupportedTypes `shared/components/src/ChartRenderer/transformer/registry.ts`
- [x] T010 [test] Write unit tests for TransformerRegistry `shared/components/src/ChartRenderer/transformer/registry.test.ts`
- [x] T011 Implement theme config mapper (CSS custom properties → Vega-Lite config) `shared/components/src/ChartRenderer/transformer/theme.ts`
- [x] T012 Create transformDataset() entry point wiring registry + theme `shared/components/src/ChartRenderer/transformer/index.ts`
- [x] T013 [P] Create zone-histogram fixture JSON `shared/components/src/ChartRenderer/fixtures/zone-histogram.json`
- [x] T014 [P] Create range-bearing-series fixture JSON `shared/components/src/ChartRenderer/fixtures/range-bearing-series.json`
- [x] T015 [P] Create empty-dataset fixture JSON `shared/components/src/ChartRenderer/fixtures/empty-dataset.json`
- [x] T016 [P] Create malformed-dataset fixture JSON `shared/components/src/ChartRenderer/fixtures/malformed-dataset.json`

**Checkpoint**: Foundation ready — transformer registry operational, types defined, fixtures in place

---

## Phase 3: User Story 1 — View a Result Dataset as a Chart (Priority: P1) MVP

**Goal**: An analyst can view a zone_histogram dataset as a bar chart with correct axes, labels, and data

**Independent Test**: Provide zone-histogram fixture to transformer, verify valid Vega-Lite bar chart spec is produced, pass spec to ChartRenderer, confirm bar chart renders with expected axes, title, and bars

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T017 [test] [US1] Write transformer unit test: zone_histogram → bar chart spec `shared/components/src/ChartRenderer/transformer/mappings.test.ts`
- [x] T018 [test] [US1] Write ChartRenderer unit test: renders bar chart from valid spec `shared/components/src/ChartRenderer/ChartRenderer.test.tsx`
- [x] T019 [test] [US1] Write ChartRenderer unit test: displays empty state for zero data points `shared/components/src/ChartRenderer/ChartRenderer.test.tsx`
- [x] T020 [test] [US1] Write ChartRenderer unit test: displays error state for null/malformed spec `shared/components/src/ChartRenderer/ChartRenderer.test.tsx`

### Implementation for User Story 1

- [x] T021 [US1] Implement zoneHistogram mapping function (zone_histogram → bar chart Vega-Lite spec) `shared/components/src/ChartRenderer/transformer/mappings/zoneHistogram.ts`
- [x] T022 [US1] Register zoneHistogram in mappings index `shared/components/src/ChartRenderer/transformer/mappings/index.ts`
- [x] T023 [US1] Implement ChartRenderer React component with vega-embed lifecycle, error boundary, empty state, and loading state `shared/components/src/ChartRenderer/ChartRenderer.tsx`
- [x] T024 [US1] Export ChartRenderer and transformDataset from module index `shared/components/src/ChartRenderer/index.ts`
- [x] T025 [US1] Add ChartRenderer re-export to shared/components main index `shared/components/src/index.ts`
- [x] T026 [US1] Verify tests pass: run `pnpm --filter @debrief/components test`

**Checkpoint**: User Story 1 complete — zone_histogram datasets render as bar charts with labels, title, and error handling

---

## Phase 4: User Story 2 — View Different Chart Types from Different Datasets (Priority: P2)

**Goal**: The transformer produces different chart types based on dataset type — bar chart for zone_histogram, line chart for range_bearing_series, structured error for unknown types

**Independent Test**: Provide both fixture datasets, verify each produces the correct chart type. Provide an unsupported dataset type, verify a TransformerError is returned.

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T027 [test] [US2] Write transformer unit test: range_bearing_series → line chart spec `shared/components/src/ChartRenderer/transformer/mappings.test.ts`
- [x] T028 [test] [US2] Write transformer unit test: unsupported type → TransformerError `shared/components/src/ChartRenderer/transformer/mappings.test.ts`
- [x] T029 [test] [US2] Write transformer unit test: malformed dataset → TransformerError `shared/components/src/ChartRenderer/transformer/mappings.test.ts`
- [x] T030 [test] [US2] Write ChartRenderer unit test: renders line chart with temporal x-axis `shared/components/src/ChartRenderer/ChartRenderer.test.tsx`

### Implementation for User Story 2

- [x] T031 [US2] Implement rangeBearingSeries mapping function (range_bearing_series → line chart Vega-Lite spec with multi-series support) `shared/components/src/ChartRenderer/transformer/mappings/rangeBearingSeries.ts`
- [x] T032 [US2] Register rangeBearingSeries in mappings index `shared/components/src/ChartRenderer/transformer/mappings/index.ts`
- [x] T033 [US2] Add validation logic in transformDataset for unsupported types and malformed schemas `shared/components/src/ChartRenderer/transformer/index.ts`
- [x] T034 [US2] Verify tests pass: run `pnpm --filter @debrief/components test`

**Checkpoint**: User Stories 1 AND 2 work independently — two dataset types produce correct chart types, unsupported types return errors

---

## Phase 5: User Story 3 — Develop and Test Charts in Isolation (Priority: P3)

**Goal**: Developers can view and iterate on charts in Storybook without the VS Code extension

**Independent Test**: Load ChartRenderer stories in Storybook, confirm charts render identically to host app, verify fixture data produces visible charts

### Implementation for User Story 3

- [x] T035 [US3] Create Storybook story: BarChart (zone_histogram fixture → chart) `shared/components/src/ChartRenderer/ChartRenderer.stories.tsx`
- [x] T036 [US3] Create Storybook story: LineChart (range_bearing_series fixture → chart) `shared/components/src/ChartRenderer/ChartRenderer.stories.tsx`
- [x] T037 [US3] Create Storybook story: EmptyState (empty dataset fixture) `shared/components/src/ChartRenderer/ChartRenderer.stories.tsx`
- [x] T038 [US3] Create Storybook story: ErrorState (malformed dataset + null spec) `shared/components/src/ChartRenderer/ChartRenderer.stories.tsx`
- [x] T039 [US3] Create Storybook story: LargeDataset (10,000 data point fixture for performance) `shared/components/src/ChartRenderer/ChartRenderer.stories.tsx`
- [x] T040 [US3] Verify Storybook builds and all stories render: `pnpm --filter @debrief/components storybook`

**Checkpoint**: Developers can view all chart types and edge cases in Storybook standalone environment

---

## Phase 6: User Story 4 — Swap Rendering Engine Without Changing Tools (Priority: P4)

**Goal**: Verify that the rendering library (Vega-Lite) is isolated to transformer + renderer only — no tool code references it

**Independent Test**: Grep the codebase for vega/vega-lite/vega-embed imports; confirm they appear ONLY in ChartRenderer module files

### Implementation for User Story 4

- [x] T041 [test] [US4] Write isolation check: automated grep for vega imports outside ChartRenderer module `shared/components/src/ChartRenderer/ChartRenderer.test.tsx`
- [x] T042 [US4] Review and verify transformer module structure ensures all Vega-Lite knowledge is contained within `shared/components/src/ChartRenderer/transformer/` and `shared/components/src/ChartRenderer/ChartRenderer.tsx`
- [x] T043 [US4] Verify isolation test passes: run `pnpm --filter @debrief/components test`

**Checkpoint**: Architectural isolation verified — Vega-Lite referenced only in ChartRenderer module

---

## Phase 7: E2E Testing (Storybook Playwright)

**Purpose**: Automated visual verification of chart rendering across themes

### E2E Tests

- [x] T044 [test] Create Playwright E2E test: BarChart renders in light/dark/vscode themes `shared/components/e2e/ChartRenderer.spec.ts`
- [x] T045 [test] Create Playwright E2E test: LineChart renders in light/dark/vscode themes `shared/components/e2e/ChartRenderer.spec.ts`
- [x] T046 [test] Create Playwright E2E test: EmptyState displays message across themes `shared/components/e2e/ChartRenderer.spec.ts`
- [x] T047 [test] Create Playwright E2E test: ErrorState displays message without crash `shared/components/e2e/ChartRenderer.spec.ts`
- [x] T048 [test] Create Playwright E2E test: hover interaction shows tooltip `shared/components/e2e/ChartRenderer.spec.ts`
- [x] T049 Run full E2E suite: `pnpm --filter @debrief/components test:e2e`

**Checkpoint**: E2E tests pass across all theme variants with visual evidence captured

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Evidence collection, media content, and PR creation

### Evidence Collection

- [x] T050 Create evidence directory `specs/085-chart-renderer/evidence/`
- [x] T051 Capture test summary with Vitest + Playwright pass/fail counts `specs/085-chart-renderer/evidence/test-summary.md`
- [x] T052 Create usage example demonstrating dataset → transformer → ChartRenderer flow `specs/085-chart-renderer/evidence/usage-example.md`
- [x] T053 [P] Capture Storybook screenshots for bar chart (light/dark/vscode) `specs/085-chart-renderer/evidence/screenshots/`
- [x] T054 [P] Capture Storybook screenshots for line chart (light theme) `specs/085-chart-renderer/evidence/screenshots/`
- [x] T055 [P] Capture Storybook screenshots for empty state and error state `specs/085-chart-renderer/evidence/screenshots/`
- [x] T056 Run Vega-Lite isolation check and capture results `specs/085-chart-renderer/evidence/isolation-check.md`
- [x] T057 Document E2E results `specs/085-chart-renderer/evidence/e2e-summary.md`

### Media Content

- [x] T058 Create shipped blog post `specs/085-chart-renderer/media/shipped-post.md`
- [x] T059 [P] Create LinkedIn shipped summary `specs/085-chart-renderer/media/linkedin-shipped.md`

### PR Creation

- [ ] T060 Create PR and publish blog: run /speckit.pr

**Task T060 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately
- **Phase 2 (Foundation)**: Depends on Phase 1 completion — BLOCKS all user stories
- **Phase 3 (US1 — P1 MVP)**: Depends on Phase 2
- **Phase 4 (US2 — P2)**: Depends on Phase 2; integrates with Phase 3 transformer infrastructure
- **Phase 5 (US3 — P3)**: Depends on Phases 3 AND 4 (needs both chart types to create stories)
- **Phase 6 (US4 — P4)**: Depends on Phase 4 (needs all mappings registered to verify isolation)
- **Phase 7 (E2E)**: Depends on Phase 5 (needs Storybook stories to test)
- **Phase 8 (Polish)**: Depends on all prior phases

### User Story Dependencies

- **US1 (P1)**: Can start after Foundation (Phase 2) — no dependencies on other stories
- **US2 (P2)**: Can start after Foundation (Phase 2) — adds to transformer registry independently
- **US3 (P3)**: Depends on US1 + US2 (needs chart types to build stories)
- **US4 (P4)**: Depends on US2 (needs full codebase to verify isolation)

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Types/models before services/functions
- Transformer mappings before ChartRenderer integration
- Unit tests before E2E tests

### Parallel Opportunities

- T004, T005, T006 can run in parallel (different directories)
- T013, T014, T015, T016 can run in parallel (independent fixture files)
- T017–T020 can run in parallel (test files, expected to fail initially)
- T027–T030 can run in parallel (test files, expected to fail initially)
- T035–T039 are sequential (same story file, but logically independent story entries)
- T044–T048 can run in parallel (E2E test cases in same file, but independent scenarios)
- T053–T056 can run in parallel (independent screenshot captures)

---

## Parallel Example: Phase 2 Foundation

```bash
# Launch all fixture files together:
Task: "Create zone-histogram fixture" (T013)
Task: "Create range-bearing-series fixture" (T014)
Task: "Create empty-dataset fixture" (T015)
Task: "Create malformed-dataset fixture" (T016)

# Launch type definitions together:
Task: "Define DatasetEnvelope types" (T007)
Task: "Define TransformerError types" (T008)
```

## Parallel Example: Phase 8 Evidence

```bash
# Capture all screenshots in parallel:
Task: "Bar chart screenshots" (T053)
Task: "Line chart screenshots" (T054)
Task: "Edge case screenshots" (T055)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (install deps, scaffold module)
2. Complete Phase 2: Foundation (types, registry, fixtures)
3. Complete Phase 3: User Story 1 (zone_histogram → bar chart)
4. **STOP and VALIDATE**: Transform a fixture dataset and render in Vitest
5. Demo bar chart rendering from fixture data

### Incremental Delivery

1. Setup + Foundation → Module scaffolded, types defined
2. Add US1 (bar chart) → Test independently → First chart renders (MVP!)
3. Add US2 (line chart + error handling) → Test independently → Multiple chart types
4. Add US3 (Storybook stories) → Test independently → Isolated development
5. Add US4 (isolation verification) → Architectural guarantee confirmed
6. E2E tests → Visual evidence across themes
7. Polish → Evidence, media, PR

### Single Developer Strategy

Recommended order for a single developer:

1. Phase 1 → Phase 2 (sequential, foundational)
2. Phase 3 US1 (bar chart MVP — shippable increment)
3. Phase 4 US2 (line chart + errors)
4. Phase 5 US3 (Storybook stories for both chart types)
5. Phase 6 US4 (isolation check)
6. Phase 7 (E2E tests)
7. Phase 8 (evidence + media + PR)

---

## Notes

- [P] tasks = different files, no dependencies
- [US#] label maps task to specific user story for traceability
- [test] label indicates a test task
- Each user story is independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **Evidence is required** — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
