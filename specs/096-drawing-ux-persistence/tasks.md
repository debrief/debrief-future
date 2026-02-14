# Tasks: Drawing UX Guidance and STAC Persistence

**Input**: Design documents from `/specs/096-drawing-ux-persistence/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included — the spec requires test-driven development per Constitution Article VII.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

**Evidence Directory**: `specs/096-drawing-ux-persistence/evidence/`
**Media Directory**: `specs/096-drawing-ux-persistence/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Vitest + Playwright results with pass/fail counts | After all tests pass |
| usage-example.md | Step-by-step drawing workflow with persistence | After persistence complete |
| screenshots/guidance-point.png | Guidance overlay in point mode | After E2E tests run |
| screenshots/guidance-polygon.png | Guidance overlay in polygon mode | After E2E tests run |
| screenshots/palette-cycling.png | Three shapes with distinct colours | After E2E tests run |
| screenshots/crosshair-cursor.png | Crosshair cursor during drawing | After E2E tests run |

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

**Purpose**: Create new files and directories needed by all user stories

- [ ] T001 Create guidance text constants module `shared/components/src/MapView/drawing/drawingGuidance.ts`
- [ ] T002 [P] Create drawing palette module with 8-colour array and helpers `shared/components/src/MapView/drawing/drawingPalette.ts`
- [ ] T003 [P] Create DrawingGuidanceOverlay directory `shared/components/src/MapView/DrawingGuidanceOverlay/`

**Checkpoint**: New files exist, ready for implementation content.

---

## Phase 2: Foundation (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Add `drawingPaletteIndex` field and `incrementDrawingPaletteIndex` action to spatial slice types `services/session-state/src/types/spatial.ts`
- [ ] T005 Implement `drawingPaletteIndex` in spatial slice creator with default value 0 `services/session-state/src/store/slices/spatial.ts`
- [ ] T006 [P] Extend `CreateDrawnFeatureOptions` interface with optional `provenance` field `shared/components/src/MapView/drawing/createDrawnFeature.ts`
- [ ] T007 [P] Implement provenance embedding in `createDrawnFeature()` — when `options.provenance` is provided, add `properties.provenance: [options.provenance]` to the returned feature `shared/components/src/MapView/drawing/createDrawnFeature.ts`

**Checkpoint**: Foundation ready — session store has palette index, createDrawnFeature supports provenance, guidance/palette modules exist.

---

## Phase 3: User Story 1 — Drawing Mode Guidance Overlay (Priority: P1)

**Goal**: Display context-sensitive instruction text when any drawing mode is active, showing mode-specific guidance and "Press Esc to cancel".

**Independent Test**: Activate each of the four drawing modes and verify correct guidance text appears; complete or cancel and verify it disappears.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T008 [test] [US1] Unit test: `DRAWING_GUIDANCE` record returns correct text for each mode `shared/components/src/MapView/drawing/__tests__/drawingGuidance.test.ts`
- [ ] T009 [P][test] [US1] Unit test: `DrawingGuidanceOverlay` renders nothing when `drawingMode` is null `shared/components/src/MapView/DrawingGuidanceOverlay/__tests__/DrawingGuidanceOverlay.test.tsx`
- [ ] T010 [P][test] [US1] Unit test: `DrawingGuidanceOverlay` renders correct text for each mode and includes `data-testid` `shared/components/src/MapView/DrawingGuidanceOverlay/__tests__/DrawingGuidanceOverlay.test.tsx`

### Implementation for User Story 1

- [ ] T011 [US1] Populate `drawingGuidance.ts` with `DRAWING_GUIDANCE` record and `CANCEL_HINT` constant per contract `shared/components/src/MapView/drawing/drawingGuidance.ts`
- [ ] T012 [US1] Implement `DrawingGuidanceOverlay.tsx` — React component that renders guidance text when `drawingMode` is non-null, with `role="status"`, `aria-live="polite"`, and `data-testid="drawing-guidance-overlay"` `shared/components/src/MapView/DrawingGuidanceOverlay/DrawingGuidanceOverlay.tsx`
- [ ] T013 [P] [US1] Create `DrawingGuidanceOverlay.css` — position fixed bottom-centre of parent, semi-transparent background, theme-aware using CSS custom properties `shared/components/src/MapView/DrawingGuidanceOverlay/DrawingGuidanceOverlay.css`
- [ ] T014 [US1] Integrate `DrawingGuidanceOverlay` into `MapView.tsx` — pass `drawingMode` prop, render inside map container `shared/components/src/MapView/MapView.tsx`
- [ ] T015 [US1] Export `DrawingGuidanceOverlay` from MapView barrel export (if applicable) `shared/components/src/MapView/index.ts`

### E2E Tests for User Story 1

- [ ] T016 [test] [US1] Create Playwright test: activate each drawing mode and verify guidance text matches expected string `shared/components/e2e/DrawingGuidance.spec.ts`
- [ ] T017 [P][test] [US1] Add E2E test: complete a shape and verify guidance disappears `shared/components/e2e/DrawingGuidance.spec.ts`
- [ ] T018 [P][test] [US1] Add E2E test: press Escape and verify guidance disappears `shared/components/e2e/DrawingGuidance.spec.ts`

**Checkpoint**: Guidance overlay appears/disappears correctly for all four drawing modes. US1 acceptance scenarios 1-6 verified.

---

## Phase 4: User Story 2 — Persist Drawn Shapes to STAC Catalog (Priority: P1)

**Goal**: Automatically save drawn shapes to the active STAC Item as GeoJSON features with provenance metadata so they survive close-reopen cycles.

**Independent Test**: Draw a shape, close the plot, reopen, and verify the shape reappears with correct geometry, styling, and provenance metadata.

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T019 [test] [US2] Unit test: `createDrawnFeature()` with provenance option embeds `properties.provenance` array `shared/components/src/MapView/drawing/__tests__/createDrawnFeature.test.ts`
- [ ] T020 [P][test] [US2] Unit test: `addDrawnFeature()` calls `addFeatures()` then `appendProvenance()` with correct arguments `apps/vscode/src/services/__tests__/stacService.addDrawnFeature.test.ts`
- [ ] T021 [P][test] [US2] Unit test: `addDrawnFeature()` propagates errors when `addFeatures()` fails `apps/vscode/src/services/__tests__/stacService.addDrawnFeature.test.ts`

### Implementation for User Story 2

- [ ] T022 [US2] Add `addDrawnFeature()` convenience method to `StacService` class — calls `addFeatures()` then `appendProvenance()` `apps/vscode/src/services/stacService.ts`
- [ ] T023 [US2] Update `handleShapeCreated` in VS Code webview `mapView.tsx` — build provenance metadata, call `createDrawnFeature()` with provenance, persist via message passing to extension host `apps/vscode/src/webview/web/mapView.tsx`
- [ ] T024 [P] [US2] Update `handleShapeCreated` in web-shell `App.tsx` — build provenance metadata, call `createDrawnFeature()` with provenance, add error handling with `setLogNotification()` `apps/web-shell/src/App.tsx`
- [ ] T025 [US2] Add failure notification: catch persistence errors and display non-blocking notification (5-second auto-clear) `apps/web-shell/src/App.tsx`

**Checkpoint**: Drawn shapes persist to STAC with provenance. Failure shows notification. US2 acceptance scenarios 1-5 verified.

---

## Phase 5: User Story 3 — Default Shape Styling with Visual Distinction (Priority: P2)

**Goal**: Consecutive drawn shapes receive visually distinct default colours from an 8-colour sequential palette that cycles when exhausted.

**Independent Test**: Draw 3+ shapes in succession and verify each receives a different colour; draw 9 shapes and verify the 9th colour matches the 1st.

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T026 [test] [US3] Unit test: `getPaletteColour()` returns expected colour for indices 0-7 and wraps at 8 `shared/components/src/MapView/drawing/__tests__/drawingPalette.test.ts`
- [ ] T027 [P][test] [US3] Unit test: `getPaletteStyleOverrides()` returns correct style key per mode with palette colour `shared/components/src/MapView/drawing/__tests__/drawingPalette.test.ts`
- [ ] T028 [P][test] [US3] Unit test: `DRAWING_PALETTE` contains exactly 8 distinct colour strings `shared/components/src/MapView/drawing/__tests__/drawingPalette.test.ts`

### Implementation for User Story 3

- [ ] T029 [US3] Populate `drawingPalette.ts` with `DRAWING_PALETTE` array (8 colours), `getPaletteColour()`, and `getPaletteStyleOverrides()` `shared/components/src/MapView/drawing/drawingPalette.ts`
- [ ] T030 [US3] Update `handleShapeCreated` in `App.tsx` — get palette style overrides from store index, pass to `createDrawnFeature()`, increment index after creation `apps/web-shell/src/App.tsx`
- [ ] T031 [P] [US3] Update `handleShapeCreated` in `mapView.tsx` — same palette integration as App.tsx `apps/vscode/src/webview/web/mapView.tsx`

**Checkpoint**: Each drawn shape gets a sequentially assigned colour. Palette cycles at 8. Colours persist in feature styling. US3 acceptance scenarios 1-4 verified.

---

## Phase 6: User Story 4 — Cursor Changes During Drawing (Priority: P2)

**Goal**: Map cursor changes to crosshair when any drawing mode is active, and reverts to default pointer when drawing ends.

**Independent Test**: Activate each drawing mode and verify cursor is crosshair; complete or cancel and verify cursor reverts.

### Tests for User Story 4

- [ ] T032 [test] [US4] E2E test: verify `.leaflet-container` gets `debrief-drawing-active` class when drawing mode activates `shared/components/e2e/DrawingGuidance.spec.ts`
- [ ] T033 [P][test] [US4] E2E test: verify `debrief-drawing-active` class removed when drawing mode deactivates `shared/components/e2e/DrawingGuidance.spec.ts`

### Implementation for User Story 4

- [ ] T034 [US4] Add CSS rule `.leaflet-container.debrief-drawing-active { cursor: crosshair; }` `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.css`
- [ ] T035 [US4] Extend `ToolbarControl` in `LeafletToolbar.tsx` — toggle `debrief-drawing-active` class on the map container element when drawing mode changes `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.tsx`

**Checkpoint**: Cursor changes to crosshair on drawing activation and reverts on completion/cancel. US4 acceptance scenarios 1-3 verified.

---

## Phase 7: User Story 5 — No Regressions in Existing STAC Operations (Priority: P2)

**Goal**: Verify all existing STAC operations continue to work after drawing persistence is added.

**Independent Test**: Run the existing STAC test suite; open a plot with only imported data and verify no changes to behaviour.

### Tests for User Story 5

- [ ] T036 [test] [US5] Run existing stacService test suite and verify all pass `apps/vscode/src/services/__tests__/`
- [ ] T037 [P][test] [US5] Unit test: `addDrawnFeature()` does not modify existing features when adding a drawn feature alongside imported data `apps/vscode/src/services/__tests__/stacService.addDrawnFeature.test.ts`

### Implementation for User Story 5

- [ ] T038 [US5] Review `addDrawnFeature()` implementation for any side effects on existing features (code review task — no file changes expected)
- [ ] T039 [US5] Verify STAC Item loading still handles items with zero drawn features (no-op path) `apps/vscode/src/services/stacService.ts`

**Checkpoint**: All existing STAC tests pass. No regressions. US5 acceptance scenarios 1-3 verified.

---

## Phase 8: Storybook Stories & Visual Verification

**Purpose**: Add Storybook stories for the new components and visual states

- [ ] T040 [P] Add "Guidance Overlay" story variant to `Drawing.stories.tsx` — shows overlay for each drawing mode with mode switching controls `shared/components/src/MapView/Drawing.stories.tsx`
- [ ] T041 [P] Add "Palette Cycling" story variant to `Drawing.stories.tsx` — draws multiple shapes showing sequential colour assignment `shared/components/src/MapView/Drawing.stories.tsx`
- [ ] T042 Verify stories render correctly in light, dark, and vscode themes

**Checkpoint**: All new visual components have Storybook stories with theme variant coverage.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Evidence collection, media content, and PR creation

### Evidence Collection (REQUIRED)

- [ ] T043 Create evidence directory `specs/096-drawing-ux-persistence/evidence/`
- [ ] T044 Capture test summary with pass/fail counts and key scenarios `specs/096-drawing-ux-persistence/evidence/test-summary.md`
- [ ] T045 Record usage example: step-by-step drawing workflow demonstrating guidance, palette, and persistence `specs/096-drawing-ux-persistence/evidence/usage-example.md`

### E2E Evidence Collection (REQUIRED for UI components)

- [ ] T046 Run full E2E suite: `pnpm --filter @debrief/components test:e2e`
- [ ] T047 [P] Capture guidance overlay screenshots (point, rectangle, polygon, polyline modes) `specs/096-drawing-ux-persistence/evidence/screenshots/`
- [ ] T048 [P] Capture palette cycling screenshot (3+ shapes with distinct colours) `specs/096-drawing-ux-persistence/evidence/screenshots/`
- [ ] T049 [P] Capture crosshair cursor screenshot `specs/096-drawing-ux-persistence/evidence/screenshots/`
- [ ] T050 Document E2E results in evidence summary `specs/096-drawing-ux-persistence/evidence/e2e-summary.md`

### Media Content

- [ ] T051 Create shipped blog post `specs/096-drawing-ux-persistence/media/shipped-post.md`
- [ ] T052 [P] Create LinkedIn shipped summary `specs/096-drawing-ux-persistence/media/linkedin-shipped.md`

### PR Creation

- [ ] T053 Create PR and publish blog: run /speckit.pr

**Task T053 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundation (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **US1 Guidance (Phase 3)**: Depends on Phase 2 (needs `drawingGuidance.ts` from Phase 1, foundation complete)
- **US2 Persistence (Phase 4)**: Depends on Phase 2 (needs provenance in `createDrawnFeature`)
- **US3 Palette (Phase 5)**: Depends on Phase 2 (needs `drawingPalette.ts` from Phase 1, `drawingPaletteIndex` from Phase 2)
- **US4 Cursor (Phase 6)**: Depends on Phase 2 only (CSS + class toggle, no dependency on US1-US3)
- **US5 Regression (Phase 7)**: Depends on Phase 4 (run after persistence is implemented)
- **Stories (Phase 8)**: Depends on Phases 3-6 (needs all components implemented)
- **Polish (Phase 9)**: Depends on all previous phases

### User Story Dependencies

- **US1 (Guidance)** and **US2 (Persistence)**: Can run in parallel after Phase 2
- **US3 (Palette)**: Can run in parallel with US1 and US2 after Phase 2
- **US4 (Cursor)**: Can run in parallel with US1, US2, US3 after Phase 2
- **US5 (Regression)**: Must run after US2 (persistence must exist to verify no regressions)

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Constants/modules before components
- Components before integration
- Core implementation before error handling
- Story complete before moving to next priority

### Parallel Opportunities

- Phase 1: T001, T002, T003 can all run in parallel
- Phase 2: T006 and T007 (createDrawnFeature) can run in parallel with T004/T005 (store)
- After Phase 2: US1, US2, US3, US4 can all start in parallel
- Phase 9: Evidence screenshot captures (T047, T048, T049) can run in parallel

---

## Parallel Example: After Foundation Phase

```bash
# After Phase 2 completes, launch all user stories in parallel:

# Thread 1: US1 — Guidance Overlay
Task: "US1 unit tests for guidance text and overlay"
Task: "US1 implement guidance constants and overlay component"
Task: "US1 E2E tests for guidance display"

# Thread 2: US2 — STAC Persistence
Task: "US2 unit tests for provenance embedding and addDrawnFeature"
Task: "US2 implement addDrawnFeature and wire handleShapeCreated"

# Thread 3: US3 — Drawing Palette
Task: "US3 unit tests for palette cycling"
Task: "US3 implement palette module and wire into handleShapeCreated"

# Thread 4: US4 — Cursor Crosshair
Task: "US4 E2E tests for cursor class toggle"
Task: "US4 implement CSS rule and class toggle in LeafletToolbar"
```

---

## Implementation Strategy

### Incremental Delivery

1. Complete Setup + Foundation → Infrastructure ready
2. Add US1 (Guidance) → Analyst sees instruction text during drawing
3. Add US2 (Persistence) → Drawn shapes survive close-reopen cycles
4. Add US3 (Palette) → Consecutive shapes are visually distinct
5. Add US4 (Cursor) → Clear visual signal of drawing mode
6. Verify US5 (Regression) → Existing STAC operations unaffected
7. Add Storybook Stories → Visual documentation and theme testing
8. Polish → Evidence, media, PR

### Key Risk Mitigations

- **Provenance breaks existing data**: US5 regression tests run after US2 to catch issues early
- **Guidance overlay obscures drawing**: E2E tests verify overlay positioning; CSS uses `pointer-events: none`
- **Palette colours clash with existing tracks**: Research R2 chose colours avoiding typical track red/green
- **stacService write fails silently**: FR-016 requires explicit notification; tested in T021/T025

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Evidence is required — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
