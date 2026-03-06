# Tasks: Map View with Live Spatial Filtering

**Input**: Design documents from `/specs/130-map-spatial-filtering/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included — the constitution mandates unit tests (Article VI.2) and the plan specifies both vitest and Playwright E2E.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

**Evidence Directory**: `specs/130-map-spatial-filtering/evidence/`
**Media Directory**: `specs/130-map-spatial-filtering/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | vitest + Playwright results summary | After all tests pass |
| usage-example.md | Code showing CatalogOverview with spatial filtering | After core implementation |
| screenshots/component-light.png | Light theme screenshot | After Storybook E2E |
| screenshots/component-dark.png | Dark theme screenshot | After Storybook E2E |
| screenshots/component-vscode.png | VS Code theme screenshot | After Storybook E2E |
| screenshots/interaction.gif | Pan/zoom filtering interaction | After Storybook E2E |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup

**Purpose**: No new project scaffolding needed — all changes extend existing `shared/components` and `apps/vscode` packages. This phase verifies the starting point.

- [ ] T001 Verify existing CatalogOverview component renders and existing tests pass `shared/components/src/CatalogOverview/CatalogOverview.tsx`

**Checkpoint**: Existing code is confirmed working — safe to extend.

---

## Phase 2: Foundation — Spatial Utilities & Type Extensions

**Purpose**: Core spatial intersection logic and type definitions that ALL user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tests for Foundation

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T002 [test] Write unit tests for bboxOverlapsViewport: standard overlap, no overlap, partial overlap, containment, item larger than viewport `shared/components/src/utils/bounds.test.ts`
- [ ] T003 [P][test] Write unit tests for bboxOverlapsViewport antimeridian cases: west > east crossing, viewport crossing, both crossing, zero-width bbox edge case `shared/components/src/utils/bounds.test.ts`
- [ ] T004 [P][test] Write unit tests for filterBySpatialExtent: filters to overlapping items, excludes items without bbox, preserves generic type parameter `shared/components/src/utils/bounds.test.ts`

### Implementation for Foundation

- [ ] T005 Add `bboxOverlapsViewport(itemBbox: Bounds, viewportBbox: Bounds): boolean` to bounds.ts — AABB overlap test with antimeridian handling (split when west > east, but NOT when west === east) `shared/components/src/utils/bounds.ts`
- [ ] T006 [P] Add `filterBySpatialExtent<T extends CatalogOverviewItem>(items: readonly T[], viewportBbox: Bounds): T[]` to bounds.ts `shared/components/src/utils/bounds.ts`
- [ ] T007 [P] Extend CatalogOverviewProps in types.ts with `onViewportChange?: (bounds: Bounds | null) => void` and `colorMap?: ReadonlyMap<string, string>` — import existing Bounds type from utils/types.ts `shared/components/src/CatalogOverview/types.ts`
- [ ] T008 Export new spatial utilities from shared/components index `shared/components/src/index.ts`
- [ ] T009 Run foundation tests: confirm T002–T004 pass `shared/components/src/utils/bounds.test.ts`

**Checkpoint**: Spatial utilities tested and exported. Type extensions in place. User story implementation can begin.

---

## Phase 3: User Story 1 — View Exercise Spatial Footprints on Map (Priority: P1)

**Goal**: All exercises with bounding box data appear as footprints on the map at correct geographic positions. Exercises without bbox are omitted from the map. Map auto-fits to show all footprints.

**Independent Test**: Load a set of STAC items with bounding boxes and verify that each item's footprint appears on the map at the correct geographic location.

### Tests for User Story 1

- [ ] T010 [test] Write unit tests for CatalogOverview: items with bbox render as Rectangles, items without bbox are omitted from map, auto-fit bounds computed correctly `shared/components/src/CatalogOverview/CatalogOverview.test.tsx`

### Implementation for User Story 1

- [ ] T011 [US1] Memoize Rectangle rendering list with useMemo keyed on items and colorMap to prevent unnecessary React reconciliation at 200 items `shared/components/src/CatalogOverview/CatalogOverview.tsx`
- [ ] T012 [US1] Run US1 tests: verify items render correctly and memoization works `shared/components/src/CatalogOverview/CatalogOverview.test.tsx`

**Checkpoint**: Footprints render correctly on map. Items without bbox excluded. Auto-fit works. This is the foundational visual layer.

---

## Phase 4: User Story 2 — Pan and Zoom as Live Spatial Filter (Priority: P1)

**Goal**: Panning/zooming the map dynamically filters the timeline to show only exercises whose footprints overlap the viewport. Debounced for performance. Empty state overlay when no exercises in viewport.

**Independent Test**: Pan the map to a region containing a subset of exercises and verify that the timeline shows only exercises whose bounding boxes overlap the visible map area.

### Tests for User Story 2

- [ ] T013 [test] Write unit tests for viewport change callback: moveend triggers debounced onViewportChange with correct Bounds, null emitted before map init `shared/components/src/CatalogOverview/CatalogOverview.test.tsx`
- [ ] T014 [P][test] Write unit tests for internal timeline filtering: timeline shows only viewport-overlapping items, items without bbox always shown in timeline (FR-005) `shared/components/src/CatalogOverview/CatalogOverview.test.tsx`
- [ ] T015 [P][test] Write unit tests for empty state overlays: "No items" when items=[], "No spatial data" when no items have bbox, "No exercises in this area" when viewport has no overlapping items `shared/components/src/CatalogOverview/CatalogOverview.test.tsx`
- [ ] T016 [P][test] Write unit test for debounce cleanup on component unmount — no setState-on-unmounted warning `shared/components/src/CatalogOverview/CatalogOverview.test.tsx`

### Implementation for User Story 2

- [ ] T017 [US2] Add internal viewport state (useState<Bounds | null>) and moveend event handler with useMap() hook — guard against uninitialised map (check getBounds() returns valid data before extracting coordinates) `shared/components/src/CatalogOverview/CatalogOverview.tsx`
- [ ] T018 [US2] Add inline debounce using useRef + setTimeout pattern (150ms) matching FilterDropdown.tsx convention — clear timer on unmount in useEffect cleanup `shared/components/src/CatalogOverview/CatalogOverview.tsx`
- [ ] T019 [US2] Add onViewportChange callback invocation from debounced moveend handler `shared/components/src/CatalogOverview/CatalogOverview.tsx`
- [ ] T020 [US2] Filter timeline items internally using bboxOverlapsViewport against current viewport state — items without bbox always included (FR-005), items with bbox outside viewport hidden `shared/components/src/CatalogOverview/CatalogOverview.tsx`
- [ ] T021 [US2] Add three-state empty overlay: "No items in this catalog" (items=[]), "No spatial data available" (no items have bbox), "No exercises in this area" (viewport has no overlapping items) `shared/components/src/CatalogOverview/CatalogOverview.tsx`
- [ ] T022 [P][US2] Add CSS styles for empty state overlay: semi-transparent, positioned inside Leaflet container, pointer-events:none so map remains pannable `shared/components/src/CatalogOverview/CatalogOverview.css`
- [ ] T023 [US2] Add Storybook story: SpatialFilter — exercises spread across regions, interactive pan/zoom updates timeline `shared/components/src/CatalogOverview/CatalogOverview.stories.tsx`
- [ ] T024 [US2] Run US2 tests: confirm T013–T016 pass

**Checkpoint**: Pan/zoom filtering works. Timeline updates dynamically. Empty states display correctly. Core spatial filtering feature is functional.

---

## Phase 5: User Story 3 — Exercise Colour Scheme on Map (Priority: P2)

**Goal**: Exercise footprints are coloured via the `colorMap` prop, maintaining visual consistency. Default accent colour used when no colour assigned.

**Independent Test**: Load exercises with a colorMap and verify each footprint uses its assigned colour matching list/timeline.

### Tests for User Story 3

- [ ] T025 [test] Write unit tests for colorMap: items use assigned colour from colorMap, items not in colorMap use default accent colour, renders correctly without colorMap prop `shared/components/src/CatalogOverview/CatalogOverview.test.tsx`

### Implementation for User Story 3

- [ ] T026 [US3] Update Rectangle pathOptions to look up colour from colorMap prop — fall back to `var(--co-accent, #007fd4)` when colorMap absent or item ID not found `shared/components/src/CatalogOverview/CatalogOverview.tsx`
- [ ] T027 [P][US3] Add Storybook story: ColourScheme — exercises with distinct colours in colorMap `shared/components/src/CatalogOverview/CatalogOverview.stories.tsx`
- [ ] T028 [US3] Run US3 tests: confirm T025 passes

**Checkpoint**: Colour-coded footprints render correctly. Consistent with future #134 colour scheme engine integration.

---

## Phase 6: User Story 5 — Cross-View Synchronisation (Priority: P2)

**Goal**: Map viewport changes propagate to the VS Code extension host via postMessage. Metadata filter changes from parent update the map. All views stay in sync.

**Independent Test**: Apply a metadata filter that reduces visible exercises, verify the map shows only matching footprints. Pan the map, verify list/timeline narrow further.

### Tests for User Story 5

- [ ] T029 [test] Write unit test for VS Code webview wrapper: onViewportChange triggers postMessage with `{ type: 'overviewViewportChanged', bounds }` `apps/vscode/src/webview/web/catalogOverview.test.tsx`

### Implementation for User Story 5

- [ ] T030 [US5] Wire onViewportChange in VS Code webview wrapper to post `ViewportChangedMessage` to extension host `apps/vscode/src/webview/web/catalogOverview.tsx`
- [ ] T031 [US5] Handle `overviewViewportChanged` message in catalogOverviewPanel.ts — store viewport bounds and optionally pass to session-state store `apps/vscode/src/panels/catalogOverviewPanel.ts`
- [ ] T032 [US5] Run US5 tests: confirm T029 passes

**Checkpoint**: Viewport changes propagate through webview → extension host. Cross-view sync infrastructure ready for #132 (three-view synchronization).

---

## Phase 7: User Story 4 — Select Exercise from Map (Priority: P3)

**Goal**: Double-clicking a footprint opens the exercise. Hovering shows a tooltip with title and date range.

**Independent Test**: Double-click an exercise footprint and verify it opens in a new editor tab.

> **NOTE**: Double-click and hover tooltip already exist in CatalogOverview. This phase adds test coverage to verify existing behaviour and ensures it continues working with the new spatial filtering changes.

### Tests for User Story 4

- [ ] T033 [test] Write unit tests verifying existing double-click triggers onItemSelect and tooltip shows title + date range `shared/components/src/CatalogOverview/CatalogOverview.test.tsx`

### Implementation for User Story 4

- [ ] T034 [US4] Verify existing double-click and tooltip behaviour works with colorMap and viewport filtering changes — fix if broken `shared/components/src/CatalogOverview/CatalogOverview.tsx`
- [ ] T035 [US4] Run US4 tests: confirm T033 passes

**Checkpoint**: Selection and tooltips work correctly alongside new spatial filtering. All user stories functional.

---

## Phase 8: E2E Tests

**Purpose**: Storybook E2E and VS Code webview E2E tests.

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip these tests because you think browsers can't be installed. The project uses `@sparticuz/chromium` (bundled Linux Chromium via npm). Run `node apps/web-shell/run-playwright.mjs` to extract and configure. Full details: `docs/project_notes/playwright-installation-research.md`

### Storybook E2E Tests 🎭

- [ ] T036 [P] Create Playwright test for SpatialFilter story: rendering, viewport callback, empty state `shared/components/e2e/CatalogOverview.spec.ts`
- [ ] T037 [P] Add theme variant tests (light, dark, vscode) for SpatialFilter story `shared/components/e2e/CatalogOverview.spec.ts`
- [ ] T038 [P] Add interaction tests: pan map triggers timeline filter, zoom updates viewport `shared/components/e2e/CatalogOverview.spec.ts`
- [ ] T039 Run Storybook e2e tests: `pnpm --filter @debrief/components test:e2e CatalogOverview`

### VS Code Webview E2E Tests 🖥️

- [ ] T040 [P] Update page objects in `tests/e2e/models/` with CatalogOverview spatial filter selectors
- [ ] T041 [P] Create Playwright test for pan-to-filter workflow `tests/e2e/test-catalog-spatial-filter.spec.ts`
- [ ] T042 Run webview e2e tests: `xvfb-run --auto-servernum npx playwright test --config tests/e2e/playwright.config.ts test-catalog-spatial-filter`

**Checkpoint**: All E2E tests pass. Visual evidence captured.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Verification, evidence collection, media content, PR creation.

### Verification

- [ ] T043 Run quickstart.md validation — verify import paths and code examples are accurate `specs/130-map-spatial-filtering/quickstart.md`
- [ ] T044 Run full CI check: `task verify` (lint + typecheck + test)

### Evidence Collection (REQUIRED)

> **Purpose**: Capture artifacts for PR description and future documentation

- [ ] T045 Capture test results using template (.specify/templates/evidence/test-summary-template.md) `specs/130-map-spatial-filtering/evidence/test-summary.md`
- [ ] T046 Create usage demonstration showing CatalogOverview with onViewportChange and colorMap `specs/130-map-spatial-filtering/evidence/usage-example.md`

### E2E Evidence Collection (REQUIRED for UI components) 🎭

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — see Phase 8 note.

- [ ] T047 [P] Capture theme variant screenshots to `specs/130-map-spatial-filtering/evidence/screenshots/`
- [ ] T048 Capture interaction GIF showing pan/zoom spatial filtering `specs/130-map-spatial-filtering/evidence/screenshots/interaction.gif`
- [ ] T049 Document e2e results `specs/130-map-spatial-filtering/evidence/e2e-summary.md`

### Media Content

- [ ] T050 Create shipped blog post `specs/130-map-spatial-filtering/media/shipped-post.md`
- [ ] T051 [P] Create LinkedIn shipped summary `specs/130-map-spatial-filtering/media/linkedin-shipped.md`

### PR Creation

- [ ] T052 Create PR and publish blog: run /speckit.pr

**Task T052 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — verify starting point
- **Phase 2 (Foundation)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2 — foundational rendering
- **Phase 4 (US2)**: Depends on Phase 2 — can run parallel with US1 but shared file means sequential recommended
- **Phase 5 (US3)**: Depends on Phase 2 — can start after foundation, but modifies same file as US1/US2
- **Phase 6 (US5)**: Depends on Phase 4 (needs onViewportChange) — VS Code wiring
- **Phase 7 (US4)**: Depends on Phase 2 — verification of existing behaviour
- **Phase 8 (E2E)**: Depends on Phases 3–7 — all features implemented
- **Phase 9 (Polish)**: Depends on Phase 8 — all tests pass

### User Story Dependencies

- **US1 (P1)**: After Foundation — renders footprints (exists, add memoization)
- **US2 (P1)**: After Foundation — core spatial filtering (biggest phase)
- **US3 (P2)**: After Foundation — colorMap prop (independent of US1/US2)
- **US5 (P2)**: After US2 — wires onViewportChange to VS Code
- **US4 (P3)**: After Foundation — verifies existing behaviour

### Recommended Sequential Order

Since US1, US2, US3 all modify `CatalogOverview.tsx`, recommended order:

1. Foundation (Phase 2)
2. US1 — memoization (Phase 3)
3. US2 — viewport filtering (Phase 4)
4. US3 — colorMap (Phase 5)
5. US5 — VS Code wiring (Phase 6)
6. US4 — verify selection (Phase 7)
7. E2E tests (Phase 8)
8. Polish (Phase 9)

### Parallel Opportunities

Within each phase, tasks marked [P] can run in parallel:

```
Phase 2: T002 || T003 || T004 (test writing)
         T005 || T006 || T007 (implementation — different files)
Phase 4: T013 || T014 || T015 || T016 (test writing)
         T022 (CSS) can parallel with T017–T021 (TSX changes)
Phase 5: T027 (story) can parallel with T026 (implementation)
Phase 8: T036 || T037 || T038 (Storybook E2E, same file but different test blocks)
         T040 || T041 (VS Code E2E)
Phase 9: T047 || T048 (screenshots), T050 || T051 (media)
```

---

## Implementation Strategy

### Incremental Delivery

1. Complete Foundation → spatial utilities tested and exported
2. Add US1 → footprints render with memoization
3. Add US2 → core spatial filtering works (biggest increment)
4. Add US3 → colour coding works
5. Add US5 → VS Code integration wired
6. Verify US4 → selection still works
7. E2E tests → visual verification
8. Polish → evidence, media, PR

### Key Implementation Notes

- **Bounds type**: Use existing `Bounds` from `utils/types.ts` — do NOT create `SpatialBounds`
- **Spatial utilities**: Add to `utils/bounds.ts` — NOT `filter-engine/spatial.ts`
- **Debounce**: Inline `useRef` + `setTimeout` pattern — NO new `useDebouncedCallback.ts` file
- **Timeline filtering**: INSIDE CatalogOverview — map shows ALL items, timeline filters to viewport
- **moveend guard**: Check `map.getBounds()` validity before extracting coordinates
- **Unmount cleanup**: Clear debounce timer in useEffect cleanup
- **Memoize Rectangles**: `useMemo` keyed on `items` + `colorMap`
- **Antimeridian**: Split when `west > east`, but NOT when `west === east`

---

## Notes

- [P] tasks = different files, no dependencies
- [US#] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **Evidence is required** — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
