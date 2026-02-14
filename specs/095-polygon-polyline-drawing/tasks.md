# Tasks: [E05] Polygon and Polyline Drawing

**Input**: Design documents from `/specs/095-polygon-polyline-drawing/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Unit tests included — the spec requires schema compliance verification (US3) and the constitution mandates tests.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. These are used in PR descriptions, documentation, and future blog posts.

**Evidence Directory**: `specs/095-polygon-polyline-drawing/evidence/`
**Media Directory**: `specs/095-polygon-polyline-drawing/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Vitest results for validation and creation functions | After all tests pass |
| usage-example.md | Code example showing createDrawnFeature() with polygon and polyline inputs | After creation logic complete |
| storybook-screenshot.png | Screenshot of the AllShapes Storybook story with drawn features | After Storybook story updated |
| schema-output.json | Example JSON output for each drawn feature type | After creation logic complete |

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

## Phase 1: Setup (No New Infrastructure)

**Purpose**: This feature requires no project scaffolding — all changes extend existing files. Phase 1 is a no-op; proceed directly to Phase 2.

**Checkpoint**: No setup needed — existing infrastructure is sufficient.

---

## Phase 2: Foundation — Default Styles and Validation (Blocking Prerequisites)

**Purpose**: Add the styling constants and validation logic that ALL user stories depend on. These are pure, independently testable functions with no UI dependencies.

**CRITICAL**: No user story work can begin until this phase is complete.

### Tests

- [x] T001 [P][test] Write polygon validation tests `shared/components/src/MapView/drawing/__tests__/isValidDrawnGeometry.test.ts`
- [x] T002 [P][test] Write polyline validation tests `shared/components/src/MapView/drawing/__tests__/isValidDrawnGeometry.test.ts`

### Implementation

- [x] T003 [P] Add DEFAULT_DRAWN_POLYGON_STYLE constant (PolygonProperties: orange fill, dark orange stroke) `shared/components/src/MapView/drawing/drawingDefaults.ts`
- [x] T004 [P] Add DEFAULT_DRAWN_POLYLINE_STYLE constant (LineProperties: teal stroke, weight 3) `shared/components/src/MapView/drawing/drawingDefaults.ts`
- [x] T005 Export new style constants from barrel `shared/components/src/MapView/drawing/index.ts`
- [x] T006 Add polygon validation case to isValidDrawnGeometry (Polygon type, >=4 coords in ring, finite numbers) `shared/components/src/MapView/drawing/isValidDrawnGeometry.ts`
- [x] T007 Add polyline validation case to isValidDrawnGeometry (LineString type, >=2 coords, finite numbers) `shared/components/src/MapView/drawing/isValidDrawnGeometry.ts`

**Checkpoint**: Style constants and validation logic ready. All validation tests pass.

---

## Phase 3: User Story 1 — Draw a Polygon on the Map (Priority: P1)

**Goal**: Analyst can draw an arbitrary polygon by placing 3+ vertices and double-clicking to close. A POLY feature is created and auto-selected.

**Independent Test**: Activate polygon mode, click 3+ points, double-click to complete, verify a PolyAnnotation with kind="POLY", valid Polygon geometry, correct vertex_count, and default styling appears and is selected.

### Tests

- [x] T008 [test] Write createDrawnFeature polygon tests (kind=POLY, vertex_count calculation, default styling, label override, invalid geometry returns null) `shared/components/src/MapView/drawing/__tests__/createDrawnFeature.test.ts`

### Implementation

- [x] T009 Add polygon case to createDrawnFeature — import PolyAnnotation type, create feature with kind=POLY, calculate vertex_count from ring length, apply DEFAULT_DRAWN_POLYGON_STYLE, support label and polygonStyle options `shared/components/src/MapView/drawing/createDrawnFeature.ts`
- [x] T010 Update CreateDrawnFeatureOptions interface — add polygonStyle field (Partial<PolygonProperties>) `shared/components/src/MapView/drawing/createDrawnFeature.ts`
- [x] T011 Update return type union to include PolyAnnotation `shared/components/src/MapView/drawing/createDrawnFeature.ts`

**Checkpoint**: Polygon creation logic complete. Unit tests pass for polygon mode. Geoman polygon events produce schema-compliant PolyAnnotation features.

---

## Phase 4: User Story 2 — Draw a Polyline on the Map (Priority: P1)

**Goal**: Analyst can draw a multi-segment line by placing 2+ vertices and double-clicking to finish. A LINE feature is created and auto-selected.

**Independent Test**: Activate polyline mode, click 2+ points, double-click to complete, verify a LineAnnotation with kind="LINE", valid LineString geometry, and default styling appears and is selected.

### Tests

- [x] T012 [test] Write createDrawnFeature polyline tests (kind=LINE, default styling, label override, invalid geometry returns null) `shared/components/src/MapView/drawing/__tests__/createDrawnFeature.test.ts`

### Implementation

- [x] T013 Add polyline case to createDrawnFeature — import LineAnnotation type, create feature with kind=LINE, apply DEFAULT_DRAWN_POLYLINE_STYLE, support label and polylineStyle options `shared/components/src/MapView/drawing/createDrawnFeature.ts`
- [x] T014 Update CreateDrawnFeatureOptions interface — add polylineStyle field (Partial<LineProperties>) `shared/components/src/MapView/drawing/createDrawnFeature.ts`
- [x] T015 Update return type union to include LineAnnotation `shared/components/src/MapView/drawing/createDrawnFeature.ts`

**Checkpoint**: Polyline creation logic complete. Unit tests pass for polyline mode. Both polygon and polyline creation produce correct schema-compliant output.

---

## Phase 5: User Story 3 — Schema-Compliant Feature Output (Priority: P2)

**Goal**: All drawn polygon and polyline features conform to the GeoJSON schema with correct properties, unique IDs, and valid geometry.

**Independent Test**: Draw each shape type and validate its GeoJSON output against the schema definition — all required properties present, correctly typed, and populated with valid defaults.

### Tests

- [x] T016 [test] Write schema compliance tests — verify polygon output matches PolyAnnotation schema (all required fields, correct types, valid vertex_count, closed ring) `shared/components/src/MapView/drawing/__tests__/createDrawnFeature.test.ts`
- [x] T017 [P][test] Write schema compliance tests — verify polyline output matches LineAnnotation schema (all required fields, correct types, valid LineString) `shared/components/src/MapView/drawing/__tests__/createDrawnFeature.test.ts`
- [x] T018 [P][test] Write uniqueness test — verify multiple created features have unique IDs `shared/components/src/MapView/drawing/__tests__/createDrawnFeature.test.ts`

### Implementation

No additional implementation — schema compliance is delivered by the createDrawnFeature logic in Phases 3 and 4. This phase verifies it with dedicated tests.

**Checkpoint**: All schema compliance tests pass. Every drawn feature has valid kind, geometry, styling, unique ID, and (for polygons) accurate vertex_count.

---

## Phase 6: User Story 4 — Visual Feedback During Multi-Vertex Drawing (Priority: P3)

**Goal**: Analyst sees edges connecting vertices and ghost segments following the cursor during polygon and polyline drawing.

**Independent Test**: Enter drawing mode, place vertices, observe connecting edges and ghost segments appear in real time.

### Implementation

No tasks needed — visual feedback is provided by the Geoman library out of the box. The LeafletToolbar integration (features 092/093) already initializes Geoman with Polygon and Line modes that include real-time edge rendering and ghost segment preview. Escape to cancel is also handled by Geoman natively.

**Checkpoint**: Visual feedback works via Geoman. No custom rendering required.

---

## Phase 7: User Story 5 — Storybook Demonstration (Priority: P3)

**Goal**: Developer can open Storybook and interact with polygon and polyline drawing in a standalone story.

**Independent Test**: Run Storybook, navigate to the drawing story, draw polygon and polyline shapes, verify they appear in the feature list with correct kind labels and schema-compliant JSON in the inspector.

### Implementation

- [x] T019 Update Drawing.stories.tsx — rename PointAndRectangle story to AllShapes, update description to cover all 4 shape types, update empty-state prompt text `shared/components/src/MapView/Drawing.stories.tsx`

**Checkpoint**: Storybook story demonstrates all 4 drawing modes (point, rectangle, polygon, polyline) with feature list and JSON inspector.

---

## Phase 8: VS Code Integration (Priority: P1)

**Goal**: VS Code webview prompts correctly for polygon and polyline names and creates features via the established pattern.

**Independent Test**: Draw polygon/polyline in VS Code, verify prompt appears with correct text, feature is created, auto-selected, and extension receives featureDrawn message.

### Implementation

- [x] T020 Extend handleShapeCreated in mapView.tsx — add polygon and polyline prompt/default mappings, update selection context `apps/vscode/src/webview/web/mapView.tsx`

**Checkpoint**: VS Code webview correctly handles polygon and polyline drawing with appropriate name prompts and extension messaging.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Evidence collection, verification, and PR creation.

### Evidence Collection

- [x] T021 Create evidence directory `specs/095-polygon-polyline-drawing/evidence/`
- [x] T022 Capture test summary with pass/fail counts `specs/095-polygon-polyline-drawing/evidence/test-summary.md`
- [x] T023 Create usage demonstration showing createDrawnFeature for polygon and polyline inputs with output `specs/095-polygon-polyline-drawing/evidence/usage-example.md`
- [x] T024 [P] Capture example schema-compliant JSON output for both feature types `specs/095-polygon-polyline-drawing/evidence/schema-output.json`
- [x] T025 [P] Capture Storybook screenshot showing drawn polygon and polyline features `specs/095-polygon-polyline-drawing/evidence/storybook-screenshot.png`

### Media Content

- [x] T026 Create shipped blog post `specs/095-polygon-polyline-drawing/media/shipped-post.md`
- [x] T027 [P] Create LinkedIn shipped summary `specs/095-polygon-polyline-drawing/media/linkedin-shipped.md`

### PR Creation

- [x] T028 Create PR and publish blog: run /speckit.pr

**Task T028 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No-op — no setup needed
- **Phase 2 (Foundation)**: BLOCKS all user stories — style constants and validation must come first
- **Phase 3 (US1 Polygon)**: Depends on Phase 2 — adds polygon creation case
- **Phase 4 (US2 Polyline)**: Depends on Phase 2 — adds polyline creation case. Can run in parallel with Phase 3
- **Phase 5 (US3 Schema)**: Depends on Phases 3 and 4 — verifies output of both
- **Phase 6 (US4 Visual)**: No tasks — Geoman handles this
- **Phase 7 (US5 Storybook)**: Depends on Phases 3 and 4 — story needs both creation cases
- **Phase 8 (VS Code)**: Depends on Phases 3 and 4 — webview needs both creation cases
- **Phase 9 (Polish)**: Depends on all previous phases

### User Story Dependencies

- **US1 (Polygon) + US2 (Polyline)**: Both P1, can run in parallel after Foundation
- **US3 (Schema)**: P2, depends on US1 + US2 implementation
- **US4 (Visual)**: P3, no tasks — automatically satisfied
- **US5 (Storybook)**: P3, depends on US1 + US2 implementation

### Parallel Opportunities

- T001 and T002 (validation tests) can run in parallel
- T003 and T004 (style constants) can run in parallel
- Phase 3 (polygon creation) and Phase 4 (polyline creation) can run in parallel
- T016, T017, T018 (schema tests) can run in parallel
- T024 and T025 (evidence artifacts) can run in parallel
- T026 and T027 (media content) can run in parallel

---

## Parallel Example: Foundation Phase

```bash
# Launch all foundation tests in parallel:
Task: "Write polygon validation tests"
Task: "Write polyline validation tests"

# Launch all style constants in parallel:
Task: "Add DEFAULT_DRAWN_POLYGON_STYLE"
Task: "Add DEFAULT_DRAWN_POLYLINE_STYLE"
```

## Parallel Example: User Stories 1 + 2

```bash
# After foundation is complete, both can run in parallel:
Task: "Add polygon case to createDrawnFeature"  # US1
Task: "Add polyline case to createDrawnFeature"  # US2
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 2: Foundation (style constants + validation)
2. Complete Phase 3: Polygon creation (US1)
3. Complete Phase 4: Polyline creation (US2)
4. **STOP and VALIDATE**: Both shape types create valid features
5. Deploy/demo if ready

### Incremental Delivery

1. Foundation → Style constants and validation ready
2. Add US1 (Polygon) → Test independently → Polygon drawing works
3. Add US2 (Polyline) → Test independently → Polyline drawing works
4. Add US3 (Schema tests) → Verify compliance → All features schema-valid
5. Add US5 (Storybook) → Visual demo → All shapes in one story
6. Add VS Code integration → End-to-end → Drawing works in extension
7. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files or independent sections, no dependencies
- All 6 source files are existing — no new files created
- `createDrawnFeature.ts` is the most-edited file (phases 3 + 4 both modify it)
- Phase 6 (Visual Feedback) has no tasks because Geoman handles it natively
- Evidence should include both polygon AND polyline examples
- Run `/speckit.pr` after all tasks complete to create PR with evidence
