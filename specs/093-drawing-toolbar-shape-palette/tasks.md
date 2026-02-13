# Tasks: Drawing Toolbar with Shape Palette

**Input**: Design documents from `/specs/093-drawing-toolbar-shape-palette/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included for session-state ephemeral behavior and Storybook E2E.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. These are used in PR descriptions, documentation, and future blog posts.

**Evidence Directory**: `specs/093-drawing-toolbar-shape-palette/evidence/`
**Media Directory**: `specs/093-drawing-toolbar-shape-palette/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Vitest results for session-state and shared-components | After all tests pass |
| usage-example.md | Walkthrough of shape palette interaction flow | After toolbar works |
| screenshots/toolbar-default.png | Toolbar with '+' button in default state | After Storybook stories |
| screenshots/dropdown-open.png | Shape palette dropdown open | After Storybook stories |
| screenshots/drawing-active.png | '+' button in highlighted/active state | After Storybook stories |

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

**Purpose**: Verify prerequisites and prepare working environment

- [ ] T001 Verify #092 Geoman integration is available: confirm `@geoman-io/leaflet-geoman-free` in `shared/components/package.json` and `useGeoman` hook exists
- [ ] T002 Create evidence directory `specs/093-drawing-toolbar-shape-palette/evidence/`
- [ ] T003 [P] Create screenshots directory `specs/093-drawing-toolbar-shape-palette/evidence/screenshots/`

---

## Phase 2: Foundation — Session State DrawingMode (Blocking)

**Purpose**: Add the `drawingMode` ephemeral field to the session-state store. This blocks ALL user stories since they all depend on state tracking.

**CRITICAL**: No toolbar UI work can begin until this phase is complete.

### Tests for Foundation

- [ ] T004 [test] Write unit test: setDrawingMode sets value, default is null `services/session-state/tests/unit/spatial.test.ts`
- [ ] T005 [P][test] Write unit test: drawingMode is NOT in undo history after change `services/session-state/tests/unit/spatial.test.ts`
- [ ] T006 [P][test] Write unit test: drawingMode is NOT included in persistent state `services/session-state/tests/unit/spatial.test.ts`
- [ ] T007 [P][test] Write unit test: drawingMode resets to null on store reset `services/session-state/tests/unit/spatial.test.ts`

### Implementation for Foundation

- [ ] T008 Add `DrawingMode` type and `drawingMode` field to `SpatialSlice` interface, add `setDrawingMode` to `SpatialActions`, update `DEFAULT_SPATIAL_SLICE` `services/session-state/src/types/spatial.ts`
- [ ] T009 Implement `setDrawingMode` action in spatial slice creator `services/session-state/src/store/slices/spatial.ts`
- [ ] T010 Add `'drawingMode'` to `EPHEMERAL_FIELDS` array `services/session-state/src/store/middleware/partialize.ts`
- [ ] T011 Verify `drawingMode` is NOT in `UNDO_TRACKED_FIELDS` or `DIRTY_TRIGGER_FIELDS` `services/session-state/src/store/index.ts`
- [ ] T012 Verify `drawingMode` is NOT extracted in `extractPersistentState()` `services/session-state/src/persistence/save.ts`
- [ ] T013 Run session-state tests and confirm all pass (including new tests from T004-T007)

**Checkpoint**: Session state has `drawingMode` field. Foundation ready — user story implementation can begin.

---

## Phase 3: User Story 1 — Select and Activate a Shape Drawing Mode (Priority: P1) MVP

**Goal**: Add '+' button to toolbar that opens shape palette dropdown; selecting a shape activates Geoman drawing mode with visual feedback.

**Independent Test**: Click '+' button, select a shape from dropdown, verify map enters drawing mode with crosshair cursor and highlighted button.

### Implementation for User Story 1

- [ ] T014 [US1] Remove all `// TEMPORARY: 092-proof-of-concept` code from LeafletToolbar (drawRectButton, isDrawingRect, handleDrawRectangle, onRectCreated, getRectangleIcon) `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.tsx`
- [ ] T015 [US1] Add `GEOMAN_SHAPE_MAP` constant mapping Debrief drawing modes to Geoman shape names, and `SHAPE_PALETTE_ITEMS` configuration array with id/label/icon/title `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.tsx`
- [ ] T016 [US1] Add `drawingMode` and `onDrawingModeChange` to `LeafletToolbarProps` interface and `ToolbarControl` class `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.tsx`
- [ ] T017 [US1] Implement '+' button rendering using `createButton()` pattern with plus icon SVG `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.tsx`
- [ ] T018 [US1] Implement shape palette dropdown: create dropdown container with `L.DomUtil.create()`, render four shape items with icons and labels, apply `L.DomEvent.disableClickPropagation()` `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.tsx`
- [ ] T019 [US1] Wire dropdown item clicks: on click, close dropdown, call `onDrawingModeChange(shapeId)`, activate `map.pm.enableDraw()` via `GEOMAN_SHAPE_MAP` lookup `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.tsx`
- [ ] T020 [US1] Implement '+' button click logic: if no drawing active, show dropdown; if drawing active, cancel drawing (FR-007) `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.tsx`
- [ ] T021 [US1] Add active state styling: apply `--active` CSS class to '+' button when `drawingMode !== null` `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.tsx`
- [ ] T022 [US1] Add dropdown and shape palette CSS styles `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.css`
- [ ] T023 [US1] Wire `drawingMode` and `onDrawingModeChange` props from MapView through to LeafletToolbar, connecting to session store `shared/components/src/MapView/MapView.tsx`
- [ ] T024 [US1] Add Geoman availability check: only render '+' button when `map.pm` exists (FR-012) `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.tsx`
- [ ] T025 [US1] Build VS Code extension to verify esbuild bundling works with new toolbar code: `npm run compile` in `apps/vscode`

**Checkpoint**: User Story 1 complete — shape palette dropdown works, selecting shapes activates Geoman drawing mode.

---

## Phase 4: User Story 2 — Cancel Drawing Mode (Priority: P1)

**Goal**: Enable drawing cancellation via Escape key, '+' button click, and automatic reset on shape completion.

**Independent Test**: Enter drawing mode, press Escape (or click '+'), verify drawing mode ends and toolbar returns to default state.

### Implementation for User Story 2

- [ ] T026 [US2] Add `pm:create` event listener to reset drawing mode to null after shape completion (FR-008) `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.tsx`
- [ ] T027 [US2] Add `pm:drawend` event listener to detect Escape-triggered cancellation and reset toolbar state `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.tsx`
- [ ] T028 [US2] Implement click-outside dismissal: add document click listener when dropdown is open, dismiss on click outside (FR-013) `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.tsx`
- [ ] T029 [US2] Add dropdown viewport positioning: check button `getBoundingClientRect()` against viewport, adjust dropdown direction if overflow (FR-014) `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.tsx`
- [ ] T030 [US2] Add cleanup in `onRemove()`: cancel active drawing, remove event listeners, reset drawingMode to null (FR-016) `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.tsx`
- [ ] T031 [US2] Verify all cancellation paths work: Escape key, '+' click, click outside dropdown, toolbar removal

**Checkpoint**: User Stories 1 AND 2 complete — full drawing lifecycle works (activate, cancel, complete).

---

## Phase 5: User Story 3 — Drawing State Persists Across Component Updates (Priority: P2)

**Goal**: Ensure drawing mode survives unrelated state changes and resets on document switch.

**Independent Test**: Enter drawing mode, trigger time slider change, verify drawing mode persists. Switch documents, verify drawing mode resets.

### Implementation for User Story 3

- [ ] T032 [US3] Update `LeafletToolbar.updateProps()` to react to `drawingMode` changes from session store without disrupting active drawing `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.tsx`
- [ ] T033 [US3] Add `drawingMode` to MapView `useEffect` dependencies: when drawingMode changes externally (e.g., document switch resets to null), sync toolbar appearance `shared/components/src/MapView/MapView.tsx`
- [ ] T034 [US3] Verify drawing mode persists across unrelated state changes (time slider, feature selection) by testing in Storybook

**Checkpoint**: Drawing state management complete — resilient to re-renders, resets on document switch.

---

## Phase 6: User Story 4 — Storybook Demonstration (Priority: P3)

**Goal**: Create Storybook stories demonstrating the complete shape palette interaction.

**Independent Test**: Run Storybook, navigate to DrawingToolbar story, verify '+' opens dropdown, shapes activate drawing, actions log mode changes.

### Implementation for User Story 4

- [ ] T035 [US4] Create DrawingToolbar default story: MapView with toolbar showing '+' button, Geoman initialized, action logging for drawingMode changes `shared/components/src/MapView/DrawingToolbar.stories.tsx`
- [ ] T036 [US4] Create DrawingToolbar active story: toolbar with pre-set drawing mode to show highlighted/active '+' button state `shared/components/src/MapView/DrawingToolbar.stories.tsx`
- [ ] T037 [US4] Verify stories render in all theme variants (light, dark, vscode)

### E2E Tests for User Story 4

- [ ] T038 [US4] Create Playwright E2E test for DrawingToolbar: verify '+' button renders, dropdown opens on click, theme variants `shared/components/e2e/DrawingToolbar.spec.ts`
- [ ] T039 [US4] Add interaction tests: select shape from dropdown, verify active state, press Escape to cancel `shared/components/e2e/DrawingToolbar.spec.ts`
- [ ] T040 [US4] Run E2E tests: `pnpm --filter @debrief/components test:e2e DrawingToolbar`

**Checkpoint**: All user stories complete with Storybook demonstration and E2E coverage.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Evidence collection, media content, final verification, and PR creation.

### Final Verification

- [ ] T041 Run all session-state tests: `cd services/session-state && npm test`
- [ ] T042 [P] Run all shared-components tests: `cd shared/components && npm test`
- [ ] T043 [P] Build VS Code extension: `cd apps/vscode && npm run compile`
- [ ] T044 Verify existing MapView tests still pass (no regressions from PoC removal)

### Evidence Collection

- [ ] T045 Capture test summary in `specs/093-drawing-toolbar-shape-palette/evidence/test-summary.md`
- [ ] T046 Create usage demonstration in `specs/093-drawing-toolbar-shape-palette/evidence/usage-example.md`
- [ ] T047 [P] Capture Storybook screenshots: toolbar default, dropdown open, drawing active states in `specs/093-drawing-toolbar-shape-palette/evidence/screenshots/`

### E2E Evidence Collection

- [ ] T048 Run full E2E suite: `pnpm --filter @debrief/components test:e2e`
- [ ] T049 [P] Capture theme variant screenshots to `specs/093-drawing-toolbar-shape-palette/evidence/screenshots/`
- [ ] T050 Document E2E results in `specs/093-drawing-toolbar-shape-palette/evidence/e2e-summary.md`

### Media Content

- [ ] T051 Create shipped blog post in `specs/093-drawing-toolbar-shape-palette/media/shipped-post.md`
- [ ] T052 [P] Create LinkedIn shipped summary in `specs/093-drawing-toolbar-shape-palette/media/linkedin-shipped.md`

### PR Creation

- [ ] T053 Create PR and publish blog: run /speckit.pr

**Task T053 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundation (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundation — core toolbar and dropdown
- **User Story 2 (Phase 4)**: Depends on US1 — adds cancellation to existing toolbar
- **User Story 3 (Phase 5)**: Depends on US1 — state persistence requires working toolbar
- **User Story 4 (Phase 6)**: Depends on US1 and US2 — Storybook stories need full interaction
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends only on Foundation (Phase 2) — delivers the MVP
- **User Story 2 (P1)**: Depends on US1 — adds cancellation paths to existing toolbar
- **User Story 3 (P2)**: Depends on US1 — verifies state resilience requires working activation
- **User Story 4 (P3)**: Depends on US1 + US2 — Storybook stories demonstrate full lifecycle

### Within Each User Story

- PoC removal (T014) before new implementation
- Constants/types (T015-T016) before DOM rendering (T017-T019)
- Core rendering before event wiring
- CSS alongside DOM changes

### Parallel Opportunities

- Phase 1: T002 and T003 can run in parallel
- Phase 2: T004-T007 (test tasks) can all run in parallel
- Phase 3: T015-T016 can run in parallel (constants + props), T022-T023 can run in parallel (CSS + MapView wiring)
- Phase 4: T026-T029 are largely independent (different event handlers)
- Phase 7: T041-T043 can run in parallel, T047+T049 can run in parallel, T051+T052 can run in parallel

---

## Parallel Example: Phase 2 Foundation

```bash
# Launch all foundation tests together (they target the same test file but test different behaviors):
Task: "Write unit test: setDrawingMode sets value" (T004)
Task: "Write unit test: drawingMode NOT in undo history" (T005)
Task: "Write unit test: drawingMode NOT in persistent state" (T006)
Task: "Write unit test: drawingMode resets on reset()" (T007)

# Then implement all type/slice changes:
Task: "Add DrawingMode type to spatial.ts" (T008)
Task: "Implement setDrawingMode in slice" (T009)
Task: "Add to EPHEMERAL_FIELDS" (T010)
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundation (session-state drawingMode) — BLOCKS all stories
3. Complete Phase 3: User Story 1 (toolbar + dropdown + activation)
4. Complete Phase 4: User Story 2 (cancellation paths)
5. **STOP and VALIDATE**: Test full drawing lifecycle in Storybook manually
6. The toolbar is fully usable at this point

### Incremental Delivery

1. Setup + Foundation → State management ready
2. User Story 1 → Shape palette works, drawing activates → Functional MVP
3. User Story 2 → Cancellation works → Feature complete for users
4. User Story 3 → State persistence verified → Robust
5. User Story 4 → Storybook stories + E2E → Documented and tested
6. Polish → Evidence, media, PR → Shipped

---

## Notes

- [P] tasks = different files or independent behavior, no dependencies
- [US#] label maps task to specific user story for traceability
- [test] label indicates test-first tasks that should fail before implementation
- US1 and US2 are both P1 priority but US2 depends on US1 (cancel requires activate)
- The PoC removal (T014) must happen first in Phase 3 to clear the way for new code
- Shape labels (Point, Rectangle, etc.) defined as constants for future i18n readiness
- Run `/speckit.pr` (T053) after all tasks complete to create PR with evidence
