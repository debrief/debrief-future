# Tasks: Point and Rectangle Drawing

**Input**: Design documents from `/specs/094-point-rectangle-drawing/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Unit tests are included — the feature spec requires schema validation and geometry checks which benefit from test-first development.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

**Evidence Directory**: `specs/094-point-rectangle-drawing/evidence/`
**Media Directory**: `specs/094-point-rectangle-drawing/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Vitest results for drawing module unit tests | After all tests pass |
| usage-example.md | Code example showing createDrawnFeature() usage | After factory complete |
| storybook-screenshot-point.png | Screenshot of point drawn on map | After Storybook story works |
| storybook-screenshot-rectangle.png | Screenshot of rectangle drawn on map | After Storybook story works |

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

## Phase 1: Setup (Module Structure)

**Purpose**: Create the drawing module directory and barrel export

- [x] T001 Create drawing module barrel export `shared/components/src/MapView/drawing/index.ts`

---

## Phase 2: Foundation (Pure Logic — No UI Dependencies)

**Purpose**: Core conversion logic that ALL user stories depend on. These are pure functions with no React/Leaflet/Geoman dependencies, so they can be tested in isolation.

**CRITICAL**: No UI integration can begin until this phase is complete.

### Tests (write first, verify they fail)

- [x] T002 [P][test] Write isValidDrawnGeometry unit tests `shared/components/src/MapView/drawing/__tests__/isValidDrawnGeometry.test.ts`
- [x] T003 [P][test] Write createDrawnFeature unit tests `shared/components/src/MapView/drawing/__tests__/createDrawnFeature.test.ts`

### Implementation

- [x] T004 [P] Create default styling constants `shared/components/src/MapView/drawing/drawingDefaults.ts`
- [x] T005 Implement isValidDrawnGeometry guard `shared/components/src/MapView/drawing/isValidDrawnGeometry.ts`
- [x] T006 Implement createDrawnFeature factory `shared/components/src/MapView/drawing/createDrawnFeature.ts`
- [x] T007 Update barrel export with all public APIs `shared/components/src/MapView/drawing/index.ts`
- [x] T008 Run unit tests and verify all pass

**Checkpoint**: Pure logic complete — `createDrawnFeature()` converts raw GeoJSON to schema-compliant features with UUID, default styling, and validation. All unit tests green.

---

## Phase 3: User Story 1 — Place a Point Marker on the Map (Priority: P1) MVP

**Goal**: Analyst can activate point mode, click on the map, and a schema-compliant POINT feature appears with default styling and is auto-selected.

**Independent Test**: Activate point mode in Storybook, click on map, verify point feature appears in feature list with correct properties (kind=POINT, PointProperties styling, UUID id).

### Implementation

- [x] T009 Extend LeafletToolbar to extract GeoJSON and call onShapeCreated callback on pm:create `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.tsx`
- [x] T010 Add onShapeCreated prop to MapView and pass through to LeafletToolbar `shared/components/src/MapView/MapView.tsx`
- [x] T011 Create Drawing Storybook story with point mode demo (click to place point, show feature list) `shared/components/src/MapView/Drawing.stories.tsx`
- [x] T012 Verify point feature in Storybook: correct kind, geometry, styling, auto-selection

**Checkpoint**: Point drawing works end-to-end in Storybook. Clicking on map creates a POINT feature with correct schema properties.

---

## Phase 4: User Story 2 — Draw a Rectangle on the Map (Priority: P2)

**Goal**: Analyst can activate rectangle mode, click-drag on the map, and a schema-compliant RECTANGLE polygon feature appears with default styling and is auto-selected.

**Independent Test**: Activate rectangle mode in Storybook, click-drag on map, verify rectangle feature appears with correct properties (kind=RECTANGLE, PolygonProperties styling, closed Polygon ring).

### Implementation

- [x] T013 Extend Drawing Storybook story to include rectangle mode demo `shared/components/src/MapView/Drawing.stories.tsx`
- [x] T014 Verify rectangle feature in Storybook: correct kind, closed polygon geometry, styling, auto-selection
- [x] T015 Verify degenerate rectangle (click without drag) is silently discarded

**Checkpoint**: Both point and rectangle drawing work in Storybook. Degenerate rectangles are rejected.

---

## Phase 5: User Story 3 — Schema-Compliant Feature Output (Priority: P2)

**Goal**: All drawn features conform to the project's GeoJSON schema — correct type discriminators, required properties, valid geometry, unique IDs.

**Independent Test**: Draw multiple features in Storybook, inspect the JSON output, verify each conforms to ReferenceLocation (point) or RectangleAnnotation (rectangle) schema with all required fields.

### Implementation

- [x] T016 Add JSON inspector panel to Storybook story showing raw feature output `shared/components/src/MapView/Drawing.stories.tsx`
- [x] T017 Verify drawn point matches ReferenceLocation schema (type, id, geometry.type, properties.kind, properties.name, properties.location_type, properties.style)
- [x] T018 Verify drawn rectangle matches RectangleAnnotation schema (type, id, geometry.type with closed ring, properties.kind, properties.style)
- [x] T019 Verify multiple drawn features have unique UUIDs (no duplicates)

**Checkpoint**: Schema compliance verified for both feature types. All required fields present and correctly typed.

---

## Phase 6: User Story 4 — Visual Feedback During Drawing (Priority: P3)

**Goal**: Geoman provides cursor changes and drag-preview during drawing. Escape cancels drawing mode. This story verifies the existing Geoman integration provides adequate feedback.

**Independent Test**: Enter each drawing mode in Storybook, observe cursor change, observe rectangle preview during drag, press Escape to cancel.

### Implementation

- [x] T020 Verify Geoman cursor changes in point mode (crosshair or marker cursor) in Storybook
- [x] T021 Verify Geoman rectangle preview appears during drag in Storybook
- [x] T022 Verify Escape key cancels drawing mode and removes preview in Storybook

**Checkpoint**: Visual feedback works for both modes via Geoman's built-in capabilities. No custom feedback code needed.

---

## Phase 7: VS Code Integration

**Purpose**: Wire the drawing conversion into the VS Code extension webview so drawn features appear in the real application alongside loaded data.

- [x] T023 Handle onShapeCreated in VS Code webview mapView.tsx — convert and add to feature collection `apps/vscode/src/webview/web/mapView.tsx`
- [x] T024 Auto-select drawn feature via setSelection in VS Code webview `apps/vscode/src/webview/web/mapView.tsx`
- [x] T025 Verify drawn features coexist with loaded track data (no regressions)

**Checkpoint**: Point and rectangle drawing works in VS Code. Drawn features appear alongside loaded data and are auto-selected.

---

## Phase 8: E2E Tests

**Purpose**: Automated Playwright tests against Storybook stories to verify drawing interactions across theme variants.

- [x] T026 Create Playwright e2e test for Drawing story `shared/components/e2e/Drawing.spec.ts`
- [x] T027 [P] Add theme variant tests (light, dark, vscode) `shared/components/e2e/Drawing.spec.ts`
- [x] T028 Run e2e tests: `pnpm --filter @debrief/components test:e2e Drawing`

**Checkpoint**: E2E tests pass across all three theme variants.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Evidence collection, media content, and PR creation.

### Evidence Collection

- [ ] T029 Create evidence directory `specs/094-point-rectangle-drawing/evidence/`
- [ ] T030 Capture test results in `specs/094-point-rectangle-drawing/evidence/test-summary.md`
- [ ] T031 Create usage demonstration in `specs/094-point-rectangle-drawing/evidence/usage-example.md`
- [ ] T032 [P] Capture Storybook screenshot of point drawing `specs/094-point-rectangle-drawing/evidence/storybook-screenshot-point.png`
- [ ] T033 [P] Capture Storybook screenshot of rectangle drawing `specs/094-point-rectangle-drawing/evidence/storybook-screenshot-rectangle.png`

### E2E Evidence Collection

- [ ] T034 Run full e2e suite: `pnpm --filter @debrief/components test:e2e`
- [ ] T035 [P] Capture theme variant screenshots to `specs/094-point-rectangle-drawing/evidence/screenshots/`
- [ ] T036 Document e2e results in `specs/094-point-rectangle-drawing/evidence/e2e-summary.md`

### Media Content

- [ ] T037 Create shipped blog post `specs/094-point-rectangle-drawing/media/shipped-post.md`
- [ ] T038 [P] Create LinkedIn shipped summary `specs/094-point-rectangle-drawing/media/linkedin-shipped.md`

### PR Creation

- [ ] T039 Create PR and publish blog: run /speckit.pr

**Task T039 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately
- **Phase 2 (Foundation)**: Depends on Phase 1 — BLOCKS all user stories
- **Phases 3–6 (User Stories)**: All depend on Phase 2 completion
  - Phase 3 (Point/P1) can start immediately after Phase 2
  - Phase 4 (Rectangle/P2) can start after Phase 3 (extends same Storybook story)
  - Phase 5 (Schema/P2) can start after Phase 4 (verifies both feature types)
  - Phase 6 (Feedback/P3) can run in parallel with Phase 4 or 5
- **Phase 7 (VS Code)**: Depends on Phase 3 (point) — can proceed before Phase 5/6
- **Phase 8 (E2E)**: Depends on Phase 4 (both modes in Storybook)
- **Phase 9 (Polish)**: Depends on all previous phases

### Within Phase 2 (Foundation)

- T002 and T003 (tests) can run in parallel
- T004 (defaults) can run in parallel with tests
- T005 (validation) depends on T004 (uses defaults for type references)
- T006 (factory) depends on T004 and T005
- T007 (barrel) depends on T004, T005, T006
- T008 (run tests) depends on all above

### Parallel Opportunities

- T002 + T003: Tests written in parallel
- T004 + T002 + T003: Defaults and tests in parallel
- Phase 6 + Phase 4 or 5: Visual feedback verification doesn't block schema work
- Phase 7 + Phase 6: VS Code integration and visual feedback in parallel
- T032 + T033: Screenshots captured in parallel
- T037 + T038: Media content created in parallel

---

## Parallel Example: Phase 2 (Foundation)

```bash
# Launch tests and defaults in parallel:
Task: "Write isValidDrawnGeometry unit tests"    # T002
Task: "Write createDrawnFeature unit tests"       # T003
Task: "Create default styling constants"          # T004

# Then sequentially:
Task: "Implement isValidDrawnGeometry guard"      # T005 (after T004)
Task: "Implement createDrawnFeature factory"      # T006 (after T004, T005)
Task: "Update barrel export"                      # T007 (after T004-T006)
Task: "Run unit tests"                            # T008 (after all)
```

---

## Implementation Strategy

### MVP First (Phase 1 + 2 + 3 Only)

1. Complete Phase 1: Module structure
2. Complete Phase 2: Pure logic with tests
3. Complete Phase 3: Point drawing in Storybook
4. **STOP and VALIDATE**: Point creation works end-to-end
5. Demo point drawing capability

### Incremental Delivery

1. Phases 1–2 → Foundation ready (pure functions tested)
2. Add Phase 3 → Point drawing works (MVP!)
3. Add Phase 4 → Rectangle drawing works
4. Add Phase 5 → Schema compliance verified
5. Add Phase 6 → Visual feedback confirmed
6. Add Phase 7 → VS Code integration complete
7. Add Phase 8 → E2E tests pass
8. Phase 9 → Evidence, media, PR

### Parallel Team Strategy

With multiple developers:

1. Team completes Phases 1–2 together (small, focused)
2. Once Foundation is done:
   - Developer A: Phases 3 + 7 (point drawing + VS Code)
   - Developer B: Phase 4 + 8 (rectangle drawing + E2E)
3. Phase 5 can be done by either developer after their phase
4. Phase 6 is lightweight verification, anyone can do it

---

## Notes

- [P] tasks = different files, no dependencies
- Story labels (US1–US4) map tasks to specific user stories
- Each user story is independently completable and testable
- Verify tests fail before implementing (Phase 2)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **Evidence is required** — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
