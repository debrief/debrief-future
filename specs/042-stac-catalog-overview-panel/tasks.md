# Tasks: STAC Catalog Overview Panel

**Input**: Design documents from `/specs/042-stac-catalog-overview-panel/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

---

## Evidence Requirements

**Evidence Directory**: `specs/042-stac-catalog-overview-panel/evidence/`
**Media Directory**: `specs/042-stac-catalog-overview-panel/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Storybook story count + unit test results | After all tests pass |
| usage-example.md | Walkthrough of opening a catalog overview in VS Code | After VS Code integration works |
| storybook-screenshots/ | Screenshots of key Storybook stories | After component complete |

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

**Purpose**: Extend STAC metadata types and create component scaffolding

- [ ] T001 Add bbox, startDatetime, endDatetime to StacItemSummary interface `apps/vscode/src/types/stac.ts`
- [ ] T002 [P] Create CatalogOverview component directory and types `shared/components/src/CatalogOverview/types.ts`
- [ ] T003 [P] Create CatalogOverview index barrel export `shared/components/src/CatalogOverview/index.ts`
- [ ] T004 Export CatalogOverview from shared components package `shared/components/src/index.ts`

**Checkpoint**: Type definitions in place, component directory scaffolded

---

## Phase 2: Foundation — StacService Metadata Extraction

**Purpose**: Extend stacService to read bbox and temporal fields from item.json — blocks all UI work

**⚠️ CRITICAL**: The React component and VS Code panel cannot be populated without this data

- [ ] T005 Extend listItems() to extract bbox, start_datetime, end_datetime from item.json `apps/vscode/src/services/stacService.ts`
- [ ] T006 [test] Unit test for metadata extraction with fixture item.json files `apps/vscode/src/services/__tests__/stacService.metadata.test.ts`

**Checkpoint**: stacService returns enriched StacItemSummary with spatial/temporal metadata

---

## Phase 3: User Story 1 — Map Overview (Priority: P1) 🎯 MVP

**Goal**: Display bounding box rectangles on a React-Leaflet map for all catalog items

**Independent Test**: Storybook story shows map with rectangles for fixture items; items without bbox are omitted

### Implementation

- [ ] T007 [US1] Create CatalogOverview React component shell with map region `shared/components/src/CatalogOverview/CatalogOverview.tsx`
- [ ] T008 [US1] Add CatalogOverview CSS with custom properties for theming `shared/components/src/CatalogOverview/CatalogOverview.css`
- [ ] T009 [US1] Render React-Leaflet map with Rectangle for each item bbox `shared/components/src/CatalogOverview/CatalogOverview.tsx`
- [ ] T010 [US1] Auto-fit map bounds to combined extent of all items `shared/components/src/CatalogOverview/CatalogOverview.tsx`
- [ ] T011 [US1] Add hover tooltip on bbox rectangles showing item title and time range `shared/components/src/CatalogOverview/CatalogOverview.tsx`
- [ ] T012 [US1] Wire onItemSelect callback for double-click on map rectangles `shared/components/src/CatalogOverview/CatalogOverview.tsx`
- [ ] T013 [US1] Create Storybook stories: default, empty catalog, missing bbox, single item `shared/components/src/CatalogOverview/CatalogOverview.stories.tsx`

**Checkpoint**: Map renders bounding boxes in Storybook; double-click fires callback

---

## Phase 4: User Story 2 — Timeline View (Priority: P2)

**Goal**: Display SVG horizontal bar chart showing temporal range of each item

**Independent Test**: Storybook story shows timeline bars; items without temporal data show point marker or label

### Implementation

- [ ] T014 [US2] Add SVG timeline region below the map in CatalogOverview `shared/components/src/CatalogOverview/CatalogOverview.tsx`
- [ ] T015 [US2] Compute time axis scale from min/max datetime across all items `shared/components/src/CatalogOverview/CatalogOverview.tsx`
- [ ] T016 [US2] Render horizontal bar per item (start_datetime to end_datetime) `shared/components/src/CatalogOverview/CatalogOverview.tsx`
- [ ] T017 [US2] Render point marker for single-datetime items `shared/components/src/CatalogOverview/CatalogOverview.tsx`
- [ ] T018 [US2] Render "no time data" label for items without any temporal metadata `shared/components/src/CatalogOverview/CatalogOverview.tsx`
- [ ] T019 [US2] Add hover tooltip on timeline bars showing item title and dates `shared/components/src/CatalogOverview/CatalogOverview.tsx`
- [ ] T020 [US2] Wire onItemSelect callback for double-click on timeline bars `shared/components/src/CatalogOverview/CatalogOverview.tsx`
- [ ] T021 [US2] Add timeline-focused Storybook stories: many items, overlapping ranges, mixed metadata `shared/components/src/CatalogOverview/CatalogOverview.stories.tsx`
- [ ] T022 [US2] [test] Unit tests for time axis scale computation and bar positioning `shared/components/src/CatalogOverview/__tests__/timeline.test.ts`

**Checkpoint**: Timeline renders bars and points in Storybook; double-click fires callback

---

## Phase 5: User Story 3 — Resizable Split (Priority: P3)

**Goal**: Drag bar between map and timeline allows resizing; ratio persists

**Independent Test**: Storybook story allows dragging the divider; regions resize

### Implementation

- [ ] T023 [US3] Add drag bar div between map and timeline regions `shared/components/src/CatalogOverview/CatalogOverview.tsx`
- [ ] T024 [US3] Implement pointer event handlers for drag resize (down/move/up) `shared/components/src/CatalogOverview/CatalogOverview.tsx`
- [ ] T025 [US3] Accept initialSplitRatio and onSplitRatioChange props for persistence `shared/components/src/CatalogOverview/CatalogOverview.tsx`
- [ ] T026 [US3] Add drag bar styling and cursor indicators `shared/components/src/CatalogOverview/CatalogOverview.css`
- [ ] T027 [US3] Add Storybook story demonstrating resize interaction `shared/components/src/CatalogOverview/CatalogOverview.stories.tsx`

**Checkpoint**: Drag bar works in Storybook; split ratio controllable via props

---

## Phase 6: User Story 4 — VS Code Integration (Priority: P4)

**Goal**: Double-clicking a STAC catalog in the tree view opens the overview panel in the editor area

**Independent Test**: In VS Code, double-click a catalog node → overview panel shows map + timeline → double-click item → plot opens

### Implementation

- [ ] T028 [US4] Create CatalogOverviewPanel class with WebviewPanel lifecycle `apps/vscode/src/panels/catalogOverviewPanel.ts`
- [ ] T029 [US4] Implement getHtmlForWebview() with CSP, Leaflet CSS, bundled JS `apps/vscode/src/panels/catalogOverviewPanel.ts`
- [ ] T030 [US4] Create webview entry point that renders CatalogOverview React component `apps/vscode/src/webview/web/catalogOverview.tsx`
- [ ] T031 [US4] Handle loadCatalogOverview message → pass data as props to component `apps/vscode/src/webview/web/catalogOverview.tsx`
- [ ] T032 [US4] Handle overviewItemSelected message → open plot via existing flow `apps/vscode/src/panels/catalogOverviewPanel.ts`
- [ ] T033 [US4] Persist split ratio to workspace Memento on change `apps/vscode/src/panels/catalogOverviewPanel.ts`
- [ ] T034 [US4] Map VS Code theme variables to component CSS custom properties `apps/vscode/src/panels/catalogOverviewPanel.ts`
- [ ] T035 [US4] Register debrief.openCatalogOverview command `apps/vscode/src/extension.ts`
- [ ] T036 [US4] Add command contribution to package.json `apps/vscode/package.json`
- [ ] T037 [US4] Add esbuild entry for catalogOverview.tsx in compile:webview script `apps/vscode/package.json`
- [ ] T038 [US4] Add double-click command to catalog nodes in STAC tree provider `apps/vscode/src/providers/stacTreeProvider.ts`

**Checkpoint**: Full end-to-end flow works in VS Code

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Evidence, theme testing, media content, PR creation

### Light/Dark Theme Verification

- [ ] T039 Verify component renders correctly in both light and dark Storybook themes `shared/components/src/CatalogOverview/CatalogOverview.stories.tsx`
- [ ] T040 [P] Verify VS Code panel renders correctly in both VS Code themes

### Evidence Collection

- [ ] T041 Create evidence directory `specs/042-stac-catalog-overview-panel/evidence/`
- [ ] T042 Capture test summary in `specs/042-stac-catalog-overview-panel/evidence/test-summary.md`
- [ ] T043 Create usage demonstration in `specs/042-stac-catalog-overview-panel/evidence/usage-example.md`
- [ ] T044 [P] Capture Storybook screenshots of key stories in `specs/042-stac-catalog-overview-panel/evidence/storybook-screenshots/`

### Media Content

- [ ] T045 Create shipped blog post in `specs/042-stac-catalog-overview-panel/media/shipped-post.md`
- [ ] T046 [P] Create LinkedIn shipped summary in `specs/042-stac-catalog-overview-panel/media/linkedin-shipped.md`

### PR Creation

- [ ] T047 Create PR and publish blog: run /speckit.pr

**Task T047 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundation)**: Depends on Phase 1 (T001) — BLOCKS all UI work
- **Phase 3 (Map)**: Depends on Phase 2 — needs types defined
- **Phase 4 (Timeline)**: Depends on Phase 3 — builds on component shell
- **Phase 5 (Resizable Split)**: Depends on Phase 3+4 — needs both regions
- **Phase 6 (VS Code)**: Depends on Phase 5 — needs complete component; also depends on Phase 2 for data
- **Phase 7 (Polish)**: Depends on all prior phases

### Within Each Phase

- Models/types before implementation
- Component shell before features
- Storybook stories alongside or after each feature
- Tests where specified

### Parallel Opportunities

- T002, T003, T004 can run in parallel (Phase 1 scaffolding)
- T039, T040 can run in parallel (theme verification)
- T044, T046 can run in parallel (evidence/media capture)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (types + scaffolding)
2. Complete Phase 2: Foundation (stacService metadata extraction)
3. Complete Phase 3: Map Overview
4. **STOP and VALIDATE**: Storybook shows map with bounding boxes

### Incremental Delivery

1. Setup + Foundation → Types and data ready
2. Map Overview → Storybook shows bbox rectangles (MVP!)
3. Timeline → Storybook shows temporal bars
4. Resizable Split → Drag bar between map and timeline
5. VS Code Integration → End-to-end in extension
6. Polish → Evidence, media, PR

---

## Notes

- [P] tasks = different files, no dependencies
- [US#] label maps task to specific user story
- Storybook stories are the primary verification method for the React component
- VS Code manual testing is required for Phase 6 integration
- Evidence is required — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
