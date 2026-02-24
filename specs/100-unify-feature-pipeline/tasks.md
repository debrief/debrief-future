# Tasks: Unify Feature Pipeline

**Input**: Design documents from `/specs/100-unify-feature-pipeline/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/messages.md, quickstart.md

**Tests**: Existing unit tests will be updated as part of the refactoring (not new test-first tasks). E2E tests verify behavioral equivalence.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. These are used in PR descriptions, documentation, and future blog posts.

**Evidence Directory**: `specs/100-unify-feature-pipeline/evidence/`
**Media Directory**: `specs/100-unify-feature-pipeline/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | vitest + build results across all packages | After all tests pass |
| usage-example.md | Before/after code comparison showing API simplification | After refactoring complete |
| api-diff.md | Side-by-side comparison of old vs new provider APIs | After view providers refactored |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | Already created (during /speckit.plan) |
| media/linkedin-planning.md | LinkedIn summary for planning | Already created (during /speckit.plan) |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup

**Purpose**: Verify baseline and establish working branch

- [x] T001 Run `task verify` to confirm baseline passes before any changes
- [x] T002 Review current `DebriefFeature` union type `shared/components/src/utils/types.ts`
- [x] T003 Review current extension-local `Track` and `ReferenceLocation` types `apps/vscode/src/types/plot.ts`

**Checkpoint**: Baseline verified — all current tests pass, type landscape understood

---

## Phase 2: Foundation — Type System (Blocking Prerequisites)

**Purpose**: Establish the unified type foundation that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Add `AnnotationFeature` interface to types `shared/components/src/utils/types.ts`
- [x] T005 Extend `DebriefFeature` union to include `AnnotationFeature` `shared/components/src/utils/types.ts`
- [x] T006 Add `isAnnotationFeature()` type guard `shared/components/src/utils/types.ts`
- [x] T007 Verify type changes compile: `pnpm --filter @debrief/components build`

**Checkpoint**: Foundation ready — unified type system in place, user story implementation can begin

---

## Phase 3: User Story 1 — Single FeatureCollection from Data Loading (Priority: P1)

**Goal**: Refactor `stacService.loadPlotData()` to return a single `DebriefFeatureCollection` instead of `{ tracks, locations, otherFeatures }`.

**Independent Test**: Load a plot file containing tracks, reference locations, and annotation shapes. Verify the result is a single collection where each feature retains its original properties (`kind`, `geometry.type`, `times`, styling attributes).

### Implementation

- [x] T008 [US1] Update `loadPlotData()` return type signature to `DebriefFeatureCollection | null` `apps/vscode/src/services/stacService.ts`
- [x] T009 [US1] Refactor track building: construct `TrackFeature` objects directly instead of intermediate `Track` objects `apps/vscode/src/services/stacService.ts`
- [x] T010 [US1] Refactor location building: construct schema `ReferenceLocation` objects directly `apps/vscode/src/services/stacService.ts`
- [x] T011 [US1] Wrap annotation features (CIRCLE, RECTANGLE, LINE, TEXT, VECTOR, POLY) as `AnnotationFeature` `apps/vscode/src/services/stacService.ts`
- [x] T012 [US1] Return unified `{ type: 'FeatureCollection', features: [...] }` from `loadPlotData()` `apps/vscode/src/services/stacService.ts`
- [x] T013 [US1] Update `stacService.test.ts` — change assertions from `tracks`/`locations`/`otherFeatures` to `features[]` with type guard checks `apps/vscode/tests/unit/stacService.test.ts`
- [x] T014 [US1] Update `stacService.shapes.test.ts` — shapes test uses inline logic, no changes needed `apps/vscode/tests/unit/stacService.shapes.test.ts`
- [x] T015 [US1] Remove extension-local `Track` and `ReferenceLocation` interfaces, replace usages with schema imports `apps/vscode/src/types/plot.ts`
- [x] T016 [US1] Run stacService unit tests: `pnpm --filter vscode test -- stacService`

**Checkpoint**: `loadPlotData()` returns `DebriefFeatureCollection`, all stacService tests pass

---

## Phase 4: User Story 2 — View Providers Pass Unified Collection (Priority: P2)

**Goal**: Simplify each view provider to accept and forward a single feature collection rather than managing separate arrays.

**Independent Test**: Verify each view provider accepts a single collection, stores it as one piece of state, and forwards it to webviews via a single message payload.

### Message Protocol

- [x] T017 [US2] Update `LoadPlotMessage` — replace `tracks`/`locations`/`otherFeatures` with `features: DebriefFeature[]` `apps/vscode/src/webview/messages.ts`
- [x] T018 [US2] Update `selectionChanged` — unify `trackIds`/`locationIds` to `featureIds` `apps/vscode/src/webview/messages.ts`
- [x] T019 [US2] Remove `UpdateTracksMessage` if present (temporal filtering uses `setCurrentTime` + display mode) `apps/vscode/src/webview/messages.ts`

### Map Panel

- [x] T020 [US2] Update `mapPanel.loadPlot()` to accept `(plot, features: DebriefFeature[])` instead of three arrays `apps/vscode/src/webview/mapPanel.ts`
- [x] T021 [US2] Replace `currentTracks`/`currentLocations`/`otherFeatures` state with single `currentFeatures: DebriefFeature[]` `apps/vscode/src/webview/mapPanel.ts`
- [x] T022 [US2] Simplify `postMessage` for `loadPlot` to send single `features` array `apps/vscode/src/webview/mapPanel.ts`
- [x] T023 [US2] Update REP import handler to receive and forward single collection `apps/vscode/src/webview/mapPanel.ts`

### Activity Panel

- [x] T024 [US2] Update `activityPanelView.setFeatures()` to accept single `features: DebriefFeature[]` param `apps/vscode/src/views/activityPanelView.ts`
- [x] T025 [US2] Replace `_tracks`/`_locations`/`_otherFeatures` state with single `_features: DebriefFeature[]` `apps/vscode/src/views/activityPanelView.ts`
- [x] T026 [US2] Simplify `_sendLayersUpdate()` to pass features through directly `apps/vscode/src/views/activityPanelView.ts`

### Layers Tree Provider

- [x] T027 [US2] Replace `setTracks()`/`setLocations()`/`setShapes()` with single `setFeatures(features: DebriefFeature[])` `apps/vscode/src/providers/layersTreeProvider.ts`
- [x] T028 [US2] Update `getChildren()` to classify features by `properties.kind` for tree grouping `apps/vscode/src/providers/layersTreeProvider.ts`
- [x] T029 [US2] Update `LayerItem` type to wrap `DebriefFeature` instead of `Track | ReferenceLocation | GeoJSONFeature` `apps/vscode/src/providers/layersTreeProvider.ts`

### OpenPlot Command

- [x] T030 [US2] Update `openPlot.ts` to pass single collection to `mapPanel.loadPlot()` `apps/vscode/src/commands/openPlot.ts`
- [x] T031 [US2] Update `openPlot.ts` to pass single collection to `layersTreeProvider.setFeatures()` `apps/vscode/src/commands/openPlot.ts`
- [x] T032 [US2] Update `openPlot.ts` to pass single collection to `activityPanelView.setFeatures()` `apps/vscode/src/commands/openPlot.ts`
- [x] T033 [US2] Update session creation to derive track/location metadata from unified collection `apps/vscode/src/commands/openPlot.ts`
- [x] T034 [US2] Fix any remaining TypeScript compilation errors across `apps/vscode/`

**Checkpoint**: All view providers accept single collection, `pnpm --filter vscode build` compiles

---

## Phase 5: User Story 3 — React Components Classify by Feature Properties (Priority: P3)

**Goal**: Simplify the map view webview component to receive a single features array and classify features at the render boundary using type guards.

**Independent Test**: Pass a mixed feature collection to the map view and verify tracks render as lines with temporal playback, reference locations render as markers, and annotations render as shapes — all without pre-classification.

### Implementation

- [x] T035 [US3] Replace `tracks`/`locations`/`otherFeatures` state with single `features: DebriefFeature[]` state `apps/vscode/src/webview/web/mapView.tsx`
- [x] T036 [US3] Update `loadPlot` message handler to set single `features` state `apps/vscode/src/webview/web/mapView.tsx`
- [x] T037 [US3] Remove `trackToFeature()` and `locationToFeature()` transform functions `apps/vscode/src/webview/web/mapView.tsx`
- [x] T038 [US3] Simplify `useMemo` merge to `[...features, ...resultFeatures, ...drawnFeatures]` `apps/vscode/src/webview/web/mapView.tsx`
- [x] T039 [US3] Update `selectionChanged` handler to send unified `featureIds` `apps/vscode/src/webview/web/mapView.tsx`
- [x] T040 [US3] Verify MapView component receives and renders unified collection correctly

**Checkpoint**: Webview renders all feature types from single collection, temporal playback works

---

## Phase 6: User Story 4 — Backward-Compatible Behavior (Priority: P4)

**Goal**: Confirm all existing functionality works identically after the refactoring — zero regressions.

**Independent Test**: Run the full existing test suite and end-to-end workflow tests, confirming plots load, tracks display with temporal playback, layers are listed correctly, selections propagate, and tools execute.

### Verification

- [x] T041 [US4] Run full build across all packages: `pnpm build`
- [x] T042 [US4] Fix any TypeScript compilation errors discovered during full build
- [x] T043 [US4] Run stacService unit tests: `pnpm --filter vscode test -- stacService`
- [x] T044 [US4] Run all unit tests: `pnpm --filter vscode test` — 341 pass
- [x] T045 [US4] Run shared component tests: `pnpm --filter @debrief/components test` — 597 pass

### Cleanup

- [x] T046 [P] [US4] Remove unused imports and type definitions across modified files
- [x] T047 [P] [US4] Export type guards from @debrief/components index for downstream use
- [x] T048 [US4] Final build and test pass — 341 vscode tests, 597 component tests, all green

**Checkpoint**: All tests pass, all packages build, behavioral equivalence confirmed

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Evidence collection, media content, and PR creation

### Evidence Collection

- [x] T049 Capture test results in `specs/100-unify-feature-pipeline/evidence/test-summary.md`
- [x] T050 Create usage demonstration in `specs/100-unify-feature-pipeline/evidence/usage-example.md`
- [x] T051 [P] Create before/after API diff in `specs/100-unify-feature-pipeline/evidence/api-diff.md`

### Media Content

- [x] T052 Create shipped blog post in `specs/100-unify-feature-pipeline/media/shipped-post.md`
- [x] T053 [P] Create LinkedIn shipped summary in `specs/100-unify-feature-pipeline/media/linkedin-shipped.md`

### PR Creation

- [ ] T054 Create PR and publish blog: run /speckit.pr

**Task T054 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundation (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 — core data layer change
- **US2 (Phase 4)**: Depends on Phase 3 — providers consume new return type
- **US3 (Phase 5)**: Depends on Phase 4 — webview consumes new message format
- **US4 (Phase 6)**: Depends on Phases 3–5 — full integration verification
- **Polish (Phase 7)**: Depends on Phase 6 — all stories verified

### User Story Dependencies

- **US1 (P1)**: Foundational — changes the data source. Must complete first.
- **US2 (P2)**: Depends on US1 — providers consume the new `loadPlotData()` return type.
- **US3 (P3)**: Depends on US2 — webview consumes the new message protocol.
- **US4 (P4)**: Depends on US1+US2+US3 — end-to-end verification of all changes.

> **Note**: Unlike features where user stories are independent, this refactoring has a natural dependency chain: data source → providers → webview → verification. Each phase produces an independently testable increment, but they must be done in order.

### Within Each Phase

- Tasks within a phase should be done sequentially unless marked `[P]`
- Tests should be updated alongside the code they cover
- Compile check after each phase before moving forward

### Parallel Opportunities

Within Phase 4 (US2), after the message protocol is updated (T017–T019):
```
# These three provider groups can be worked on in parallel:
Map Panel: T020–T023
Activity Panel: T024–T026
Layers Tree: T027–T029
```

Within Phase 6 (US4), cleanup tasks marked `[P]` can run in parallel:
```
T046 (remove unused imports) || T047 (remove old Selection type)
```

Within Phase 7 (Polish), evidence and media tasks marked `[P]` can run in parallel.

---

## Implementation Strategy

### Incremental Delivery

1. **Phase 1–2**: Establish type foundation → compile check
2. **Phase 3 (US1)**: Refactor data source → stacService tests pass
3. **Phase 4 (US2)**: Update all providers → full build compiles
4. **Phase 5 (US3)**: Simplify webview → component renders correctly
5. **Phase 6 (US4)**: Full verification → all tests pass, zero regressions
6. **Phase 7**: Collect evidence, create shipped content, open PR

### Key Risk: Cascading Type Errors

This refactoring changes a core return type (`loadPlotData`), which cascades through ~10 files. The implementation order (data source → providers → webview) ensures each layer is updated before its consumers, minimizing temporary compilation errors.

### Commit Strategy

- Commit after each phase (7 commits)
- Each commit should leave the codebase compilable (except temporarily during Phase 3–5 transition)
- Final commit (Phase 6) must pass `task verify`
