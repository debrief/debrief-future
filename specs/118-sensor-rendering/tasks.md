# Tasks: Sensor Rendering

**Input**: Design documents from `/specs/118-sensor-rendering/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/sensor-rendering-api.md, quickstart.md

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. These are used in PR descriptions, documentation, and future blog posts.

**Evidence Directory**: `specs/118-sensor-rendering/evidence/`
**Media Directory**: `specs/118-sensor-rendering/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | vitest + Playwright results with unit, component, and E2E test counts | After all tests pass |
| usage-example.md | React code sample showing SensorBearingLayer integration | After component complete |
| screenshots/component-light.png | Bearing lines in light theme | After E2E tests pass |
| screenshots/component-dark.png | Bearing lines in dark theme | After E2E tests pass |
| screenshots/component-vscode.png | Bearing lines in VS Code theme | After E2E tests pass |
| screenshots/interaction.gif | Time slider changing bearing line rendering (snail mode fade) | After E2E tests pass |

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

**Purpose**: Create the file structure and test fixtures required for all subsequent phases

- [x] T001 Create test fixture file with sample sensor data `shared/components/src/MapView/__fixtures__/sampleSensors.ts`
- [x] T002 [P] Create sensor utility module skeleton with type exports `shared/components/src/MapView/sensor-utils.ts`
- [x] T003 [P] Create SensorBearingLayer component skeleton `shared/components/src/MapView/SensorBearingLayer.tsx`

**Checkpoint**: File structure in place, empty exports compile, fixture data available

---

## Phase 2: Foundation (Geometry & Interpolation Utilities)

**Purpose**: Implement the core utility functions that ALL user stories depend on. These are pure functions with no UI coupling -- they must be complete and tested before any rendering work begins.

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Implement `parseHexColor` and `darkenColor` colour utilities in `shared/components/src/MapView/sensor-utils.ts`
- [x] T005 [P] Implement `geodesicDestination` haversine bearing/distance function in `shared/components/src/MapView/sensor-utils.ts`
- [x] T006 [P] Implement `computeBearingFarEnd` with MAXIMUM_SENSOR_BEARING_RANGE cap (5 degrees latitude) in `shared/components/src/MapView/sensor-utils.ts`
- [x] T007 Implement `interpolateTrackPosition` binary search + linear interpolation in `shared/components/src/MapView/sensor-utils.ts`
- [x] T008 [P] Implement `applySnailFade` and `calculateSnailProportion` in `shared/components/src/MapView/sensor-utils.ts`
- [x] T009 [P] Define `SensorRenderContact`, `SensorArcRenderData`, `SensorBearingLayerProps` TypeScript interfaces in `shared/components/src/MapView/sensor-utils.ts`
- [x] T010 [P] Define `LINE_STYLE_DASH_ARRAYS` constant mapping `LineStyleEnum` to canvas dash patterns in `shared/components/src/MapView/sensor-utils.ts`
- [x] T011 [test] Write unit tests for `parseHexColor`, `darkenColor`, `geodesicDestination`, `computeBearingFarEnd` `shared/components/src/MapView/__tests__/sensor-utils.test.ts`
- [x] T012 [P][test] Write unit tests for `interpolateTrackPosition` including edge cases (before/after track, exact match) `shared/components/src/MapView/__tests__/sensor-utils.test.ts`
- [x] T013 [P][test] Write unit tests for `applySnailFade`, `calculateSnailProportion` including boundary values `shared/components/src/MapView/__tests__/sensor-utils.test.ts`

**Checkpoint**: All geometry and colour utilities pass unit tests. Foundation ready for rendering.

---

## Phase 3: User Story 1 & 2 -- Bearing Lines and Ambiguous Bearings (Priority: P1)

**Goal**: Render primary bearing lines from sensor contact origins to range extents, and render ambiguous bearing lines in a darker shade. These two stories are grouped because ambiguous bearings share the same drawing pipeline as primary bearings and are co-dependent in the rendering loop.

**Independent Test**: Load a track fixture with sensor contacts containing known bearings, ranges, and ambiguous bearings. Render the map at a specific currentTime and verify bearing lines appear at correct positions with correct colours.

### Unit Tests for US1/US2

- [x] T014 [test] Write unit tests for contact filtering logic (time window, has_bearing, visible flags) `shared/components/src/MapView/__tests__/sensor-utils.test.ts`
- [x] T015 [P][test] Write unit tests for colour inheritance (contact-level > sensor-level > track default) `shared/components/src/MapView/__tests__/sensor-utils.test.ts`

### Component Tests for US1/US2

- [x] T016 [test] Write component rendering test: bearing lines appear for visible contacts `shared/components/src/MapView/__tests__/sensor-rendering.test.tsx`
- [x] T017 [P][test] Write component rendering test: contacts with has_bearing=false produce no lines `shared/components/src/MapView/__tests__/sensor-rendering.test.tsx`
- [x] T018 [P][test] Write component rendering test: ambiguous bearings produce two lines per contact with darker shade `shared/components/src/MapView/__tests__/sensor-rendering.test.tsx`

### Implementation for US1/US2

- [x] T019 Implement contact preparation pipeline: filter by time/visibility, interpolate origins, compute far ends `shared/components/src/MapView/sensor-utils.ts`
- [x] T020 Implement custom Leaflet canvas layer class with `onAdd`, `onRemove`, `_update`, and `_draw` methods `shared/components/src/MapView/SensorBearingLayer.tsx`
- [x] T021 Implement bearing line canvas drawing: stroke from origin to far end with colour and line width `shared/components/src/MapView/SensorBearingLayer.tsx`
- [x] T022 Implement ambiguous bearing line drawing with `darkenColor` shade `shared/components/src/MapView/SensorBearingLayer.tsx`
- [x] T023 Implement viewport culling: skip contacts whose origin is outside map bounds `shared/components/src/MapView/SensorBearingLayer.tsx`
- [x] T024 Implement colour inheritance chain (contact > sensor > track default > application default) `shared/components/src/MapView/sensor-utils.ts`
- [x] T025 Implement bearing 0/360 wraparound handling in bearing geometry calculations `shared/components/src/MapView/sensor-utils.ts`
- [x] T026 Integrate SensorBearingLayer into MapView for tracks with sensor data `shared/components/src/MapView/MapView.tsx`

### Storybook Stories for US1/US2

- [x] T027 Create Storybook story: BearingLines -- basic bearing line rendering from fixture data `shared/components/src/MapView/SensorRendering.stories.tsx`
- [x] T028 [P] Create Storybook story: AmbiguousBearings -- primary + ambiguous bearing with darker shade `shared/components/src/MapView/SensorRendering.stories.tsx`

**Checkpoint**: Primary and ambiguous bearing lines render correctly on the map. Time-filtered contacts appear/disappear as currentTime changes.

---

## Phase 4: User Story 3 -- Sensor Arc Coverage Fans (Priority: P2)

**Goal**: Render sensor arc (SENSORARC) wedge/fan shapes on the map with angular bounds, range bounds, time filtering, and semi-transparent fill.

**Independent Test**: Load a fixture with SENSORARC data containing known angles and ranges, set currentTime within the arc's valid window, and verify the rendered wedge geometry.

### Tests for US3

- [x] T029 [test] Write unit tests for arc geometry calculations (donut wedge path, 0/360 wraparound) `shared/components/src/MapView/__tests__/sensor-utils.test.ts`
- [x] T030 [P][test] Write component test: arc renders when currentTime is within start/end window `shared/components/src/MapView/__tests__/sensor-rendering.test.tsx`
- [x] T031 [P][test] Write component test: arc does not render when currentTime is outside window `shared/components/src/MapView/__tests__/sensor-rendering.test.tsx`

### Implementation for US3

- [x] T032 Implement arc geometry utility: compute canvas path for donut wedge (inner/outer arcs + radial lines) `shared/components/src/MapView/sensor-utils.ts`
- [x] T033 Implement sensor arc canvas drawing in SensorBearingLayer with semi-transparent fill and outline `shared/components/src/MapView/SensorBearingLayer.tsx`
- [x] T034 Implement arc time filtering (only show arcs when currentTime is within start/end range) `shared/components/src/MapView/SensorBearingLayer.tsx`
- [x] T035 Add SensorArcRenderData preparation to the rendering pipeline `shared/components/src/MapView/sensor-utils.ts`

### Storybook Story for US3

- [x] T036 Create Storybook story: SensorArcs -- fan/wedge rendering with configurable angles and ranges `shared/components/src/MapView/SensorRendering.stories.tsx`

**Checkpoint**: Sensor arcs render as semi-transparent wedges, appearing/disappearing with time filtering.

---

## Phase 5: User Story 4 -- Snail Mode Time-Trail Fading (Priority: P2)

**Goal**: In trail (snail) mode, render sensor contacts with proportional fade-to-black based on age relative to trail length. Newest contact at full colour, oldest at black.

**Independent Test**: Load a track with sensor contacts at regular time intervals, set trail mode with a known trail length, and verify contacts are drawn with progressively fading colours.

### Tests for US4

- [x] T037 [test] Write component test: snail mode fading produces visually distinct colours for contacts at different ages `shared/components/src/MapView/__tests__/sensor-rendering.test.tsx`
- [x] T038 [P][test] Write component test: contacts outside trail window are not rendered `shared/components/src/MapView/__tests__/sensor-rendering.test.tsx`
- [x] T039 [P][test] Write component test: full display mode renders all contacts at full colour `shared/components/src/MapView/__tests__/sensor-rendering.test.tsx`

### Implementation for US4

- [x] T040 Integrate snail mode proportion calculation into the contact preparation pipeline `shared/components/src/MapView/sensor-utils.ts`
- [x] T041 Apply snail fade colour to bearing line canvas draw calls based on displayMode `shared/components/src/MapView/SensorBearingLayer.tsx`
- [x] T042 Wire displayMode prop through MapView to SensorBearingLayer `shared/components/src/MapView/MapView.tsx`

### Storybook Story for US4

- [x] T043 Create Storybook story: SnailMode -- time-trail fading with adjustable time slider `shared/components/src/MapView/SensorRendering.stories.tsx`

**Checkpoint**: Snail mode fading produces smooth visual gradient from full colour to black across the trail window.

---

## Phase 6: User Story 5 -- Labels on Bearing Lines (Priority: P3)

**Goal**: Render contact label text at configurable positions (START/MIDDLE/END) along bearing lines with configurable alignment (LEFT/CENTER/RIGHT).

**Independent Test**: Load a fixture with contacts that have labels configured at different positions and alignments, and verify label text appears at the correct location.

### Tests for US5

- [x] T044 [test] Write unit tests for label position calculation (START/MIDDLE/END along a bearing line) `shared/components/src/MapView/__tests__/sensor-utils.test.ts`
- [x] T045 [P][test] Write component test: labels render at correct positions with correct text `shared/components/src/MapView/__tests__/sensor-rendering.test.tsx`
- [x] T046 [P][test] Write component test: labels do not render when show_label=false or label is null `shared/components/src/MapView/__tests__/sensor-rendering.test.tsx`

### Implementation for US5

- [x] T047 Implement label position calculation utility (point along line at START/MIDDLE/END) `shared/components/src/MapView/sensor-utils.ts`
- [x] T048 Implement canvas text drawing for labels with LEFT/CENTER/RIGHT alignment `shared/components/src/MapView/SensorBearingLayer.tsx`
- [x] T049 Integrate label rendering into the contact drawing pipeline `shared/components/src/MapView/SensorBearingLayer.tsx`

### Storybook Story for US5

- [x] T050 Create Storybook story: Labels -- label text at different positions and alignments `shared/components/src/MapView/SensorRendering.stories.tsx`

**Checkpoint**: Labels render at correct positions along bearing lines with correct alignment.

---

## Phase 7: User Story 6 -- Bearing Line Styling (Priority: P3)

**Goal**: Apply line_style (SOLID/DASHED/DOT/DASH_DOT), line_thickness, and colour inheritance to bearing line rendering.

**Independent Test**: Load fixtures with different line_style values and verify the visual dash pattern and thickness of rendered bearing lines.

### Tests for US6

- [x] T051 [test] Write unit tests for LINE_STYLE_DASH_ARRAYS mapping (SOLID/DASHED/DOT/DASH_DOT to canvas dash arrays) `shared/components/src/MapView/__tests__/sensor-utils.test.ts`
- [x] T052 [P][test] Write component test: dashed line style produces dashed bearing lines `shared/components/src/MapView/__tests__/sensor-rendering.test.tsx`
- [x] T053 [P][test] Write component test: line_thickness is applied to bearing lines `shared/components/src/MapView/__tests__/sensor-rendering.test.tsx`

### Implementation for US6

- [x] T054 Apply canvas `setLineDash` based on contact/sensor line_style property `shared/components/src/MapView/SensorBearingLayer.tsx`
- [x] T055 Apply canvas `lineWidth` based on sensor line_thickness property `shared/components/src/MapView/SensorBearingLayer.tsx`
- [x] T056 Ensure colour inheritance fallback chain is used for line stroke colour `shared/components/src/MapView/SensorBearingLayer.tsx`

### Storybook Story for US6

- [x] T057 Create Storybook story: LineStyles -- SOLID, DASHED, DOT, DASH_DOT side by side `shared/components/src/MapView/SensorRendering.stories.tsx`

**Checkpoint**: Bearing lines render with correct dash patterns, thickness, and inherited colours.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Performance optimisation, documentation, evidence collection, and PR preparation

### Performance & Quality

- [x] T058 Verify rendering performance with 1000+ bearing lines (canvas batching, viewport culling) `shared/components/src/MapView/SensorBearingLayer.tsx`
- [x] T059 [P] Add data-testid attributes to SensorBearingLayer container for E2E testing `shared/components/src/MapView/SensorBearingLayer.tsx`
- [x] T060 [P] Run quickstart.md validation -- verify development setup instructions `specs/118-sensor-rendering/quickstart.md`

### E2E Tests (Storybook)

> **PLAYWRIGHT WORKS IN CLOUD SESSIONS** -- Do NOT skip these tests because you think browsers cannot be installed. The project uses `@sparticuz/chromium` (bundled Linux Chromium via npm). Run `node apps/web-shell/run-playwright.mjs` to extract and configure. Full details: `docs/project_notes/playwright-installation-research.md`

- [x] T061 Create Playwright E2E test: BearingLines story renders lines in light/dark/vscode themes `shared/components/e2e/SensorRendering.spec.ts`
- [x] T062 [P] Create Playwright E2E test: AmbiguousBearings story renders two lines per contact `shared/components/e2e/SensorRendering.spec.ts`
- [x] T063 [P] Create Playwright E2E test: SnailMode story shows fading with time slider interaction `shared/components/e2e/SensorRendering.spec.ts`
- [x] T064 [P] Create Playwright E2E test: Labels story shows label text at configured positions `shared/components/e2e/SensorRendering.spec.ts`
- [x] T065 Run full E2E suite: `pnpm --filter @debrief/components test:e2e SensorRendering`

### Evidence Collection

- [x] T066 Capture test results using template (.specify/templates/evidence/test-summary-template.md) `specs/118-sensor-rendering/evidence/test-summary.md`
- [x] T067 Create usage demonstration `specs/118-sensor-rendering/evidence/usage-example.md`
- [x] T068 [P] Capture theme screenshots (light/dark/vscode) from Playwright E2E runs `specs/118-sensor-rendering/evidence/screenshots/`
- [x] T069 Capture interaction GIF showing snail mode time-trail fading via time slider `specs/118-sensor-rendering/evidence/screenshots/interaction.gif`

### Media Content

- [x] T070 Create shipped blog post `specs/118-sensor-rendering/media/shipped-post.md`
- [x] T071 [P] Create LinkedIn shipped summary `specs/118-sensor-rendering/media/linkedin-shipped.md`

### PR Creation

- [x] T072 Create PR and publish blog: run /speckit.pr

**Task T072 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies -- can start immediately
- **Phase 2 (Foundation)**: Depends on Phase 1 -- BLOCKS all user stories
- **Phase 3 (US1/US2 Bearing Lines + Ambiguous)**: Depends on Phase 2
- **Phase 4 (US3 Sensor Arcs)**: Depends on Phase 2 (can run in parallel with Phase 3)
- **Phase 5 (US4 Snail Mode)**: Depends on Phase 3 (builds on bearing line rendering)
- **Phase 6 (US5 Labels)**: Depends on Phase 3 (builds on bearing line rendering)
- **Phase 7 (US6 Line Styling)**: Depends on Phase 3 (builds on bearing line rendering)
- **Phase 8 (Polish)**: Depends on all user stories being complete

### User Story Dependencies

- **US1+US2 (Bearing Lines + Ambiguous)**: Can start after Foundation (Phase 2). No other story dependencies.
- **US3 (Sensor Arcs)**: Can start after Foundation (Phase 2). Independent of US1/US2 but shares the SensorBearingLayer component.
- **US4 (Snail Mode)**: Depends on US1/US2 (Phase 3) -- applies fading to existing bearing line rendering.
- **US5 (Labels)**: Depends on US1/US2 (Phase 3) -- labels are drawn along bearing lines.
- **US6 (Line Styling)**: Depends on US1/US2 (Phase 3) -- styles are applied to existing bearing line draw calls.

### Within Each Phase

- Tests MUST be written and FAIL before implementation
- Utility functions before rendering code
- Core drawing before styling/polish
- Story complete before moving to next priority

### Parallel Opportunities

- Phase 1: T002 and T003 can run in parallel (different files)
- Phase 2: T005, T006, T008, T009, T010 can run in parallel (independent utility functions); T011, T012, T013 can run in parallel (independent test suites)
- Phase 3: T014/T015 tests can run in parallel; T016/T017/T018 component tests can run in parallel; T027/T028 stories can run in parallel
- Phase 4: T030/T031 tests can run in parallel
- Phase 5: T037/T038/T039 tests can run in parallel
- Phase 6: T044/T045/T046 tests can run in parallel
- Phase 7: T051/T052/T053 tests can run in parallel
- Phase 8: T061/T062/T063/T064 E2E tests can run in parallel; T068/T069 evidence capture can run in parallel; T070/T071 media can run in parallel

---

## Parallel Example: Phase 2 (Foundation)

```bash
# Launch independent utility implementations together:
Task: T005 "Implement geodesicDestination"
Task: T006 "Implement computeBearingFarEnd"
Task: T008 "Implement applySnailFade and calculateSnailProportion"
Task: T009 "Define rendering TypeScript interfaces"
Task: T010 "Define LINE_STYLE_DASH_ARRAYS constant"

# Then launch test suites together:
Task: T011 "Unit tests for colour and geometry"
Task: T012 "Unit tests for interpolation"
Task: T013 "Unit tests for snail fade"
```

---

## Implementation Strategy

### Incremental Delivery

1. Complete Setup + Foundation --> All utilities pass unit tests
2. Add US1/US2 (Bearing Lines + Ambiguous) --> Core rendering visible on map
3. Add US3 (Sensor Arcs) --> Coverage fans visible
4. Add US4 (Snail Mode) --> Time-trail fading functional
5. Add US5 (Labels) --> Contact identification on map
6. Add US6 (Line Styling) --> Full display property fidelity
7. Polish --> Performance verified, evidence captured, PR created
8. Each story adds visual capability without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundation together
2. Once Foundation is done:
   - Developer A: US1/US2 (Bearing Lines + Ambiguous) -- highest priority
   - Developer B: US3 (Sensor Arcs) -- independent of US1/US2
3. After US1/US2 complete:
   - Developer A: US4 (Snail Mode)
   - Developer B: US5 (Labels) or US6 (Line Styling)
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files or independent code sections, no dependencies
- All new code lives within `shared/components/src/MapView/` following existing patterns
- No new npm dependencies required -- uses existing Leaflet/react-leaflet
- No Python service changes -- pure frontend rendering feature
- No schema changes -- reads existing SensorContact/SensorData types from @debrief/schemas
- Canvas rendering chosen for performance with 1000+ bearing lines (research RQ-1)
- Evidence is required -- capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
