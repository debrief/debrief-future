# Implementation Plan: Unify Feature Pipeline

**Branch**: `100-unify-feature-pipeline` | **Date**: 2026-02-24 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/100-unify-feature-pipeline/spec.md`

## Summary

Refactor `stacService.loadPlotData()` to return a single `DebriefFeatureCollection` instead of splitting features into three arrays (`tracks`, `locations`, `otherFeatures`). Push classification responsibility from the service layer to the rendering components, which already have type guards (`isTrackFeature`, `isReferenceLocation`, etc.) for this purpose. Update all consumers (openPlot, mapPanel, activityPanelView, layersTreeProvider, mapView) to accept and forward the unified collection. The `mapView.tsx` webview already merges all arrays into `DebriefFeature[]` before rendering — this refactoring moves that merge point upstream to the data source.

## Technical Context

**Language/Version**: TypeScript 5.x (VS Code extension + shared components)
**Primary Dependencies**: `@debrief/schemas` (generated types), `@debrief/components` (MapView), VS Code Extension API ^1.85.0
**Storage**: Local filesystem STAC catalogs (JSON + GeoJSON) — unchanged by this refactoring
**Testing**: vitest (unit), Playwright (E2E)
**Target Platform**: VS Code extension (desktop + code-server)
**Project Type**: Monorepo (pnpm workspaces) — changes span `apps/vscode/` and `shared/components/`
**Performance Goals**: Plot loading must remain responsive; no measurable regression in load time
**Constraints**: Offline-capable (Constitution Art. I); all existing E2E tests must pass
**Scale/Scope**: ~10 files modified across extension and shared components

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status | Notes |
|---------|------|--------|-------|
| I. Defence-Grade Reliability | Offline by default, no silent failures | PASS | Refactoring preserves offline-first architecture; no new network calls |
| II. Schema Integrity | Schema is single source of truth | PASS | Moves toward schema types (`TrackFeature`, `ReferenceLocation`) and away from extension-local duplicates |
| III. Data Sovereignty | Provenance always | PASS | No changes to data storage or provenance chain |
| IV. Architectural Boundaries | Services never touch UI, thick services thin frontends | PASS | This refactoring enforces the boundary more clearly — service returns data, views classify for display |
| VI. Testing | Services require unit tests | PASS | Existing stacService tests will be updated to validate new return type |
| VII. Test-Driven AI | Tests before implementation | PASS | Existing tests define expected behavior; update tests first, then code |
| VIII. Documentation | Specs before code | PASS | This plan and spec precede implementation |
| XIII. Contribution Standards | Atomic commits | PASS | Each phase produces independently testable commits |
| XIV. Pre-Release Freedom | Breaking changes permitted | PASS | Internal API change, no external consumers |

**Post-design re-check**: No violations. The design uses existing schema types and moves classification closer to the rendering boundary, reinforcing Article IV (Architectural Boundaries).

## Project Structure

### Documentation (this feature)

```text
specs/100-unify-feature-pipeline/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 research findings
├── data-model.md        # Type changes and data flow
├── quickstart.md        # Implementation quickstart guide
├── contracts/           # API contracts (message protocol)
│   └── messages.md      # Updated webview message types
└── checklists/
    └── requirements.md  # Quality checklist
```

### Source Code (repository root)

```text
apps/vscode/
├── src/
│   ├── services/
│   │   └── stacService.ts          # loadPlotData() returns DebriefFeatureCollection
│   ├── commands/
│   │   └── openPlot.ts             # Distributes single collection to consumers
│   ├── webview/
│   │   ├── mapPanel.ts             # Stores/forwards single collection
│   │   ├── messages.ts             # Updated message protocol types
│   │   └── web/
│   │       └── mapView.tsx         # Simplified state (single features array)
│   ├── views/
│   │   └── activityPanelView.ts    # setFeatures(features) single param
│   ├── providers/
│   │   └── layersTreeProvider.ts   # setFeatures(features) single param, classify for tree
│   └── types/
│       └── plot.ts                 # Remove Track/ReferenceLocation, use schema types
└── tests/
    └── unit/
        ├── stacService.test.ts     # Updated for new return type
        └── stacService.shapes.test.ts # Updated assertions

shared/components/
└── src/
    └── utils/
        └── types.ts                # DebriefFeature union (already exists, may need annotation catch-all)
```

**Structure Decision**: Changes are contained within the existing monorepo structure. No new packages or directories needed. The primary change flows through `apps/vscode/src/` with a minor extension to `shared/components/src/utils/types.ts` for annotation feature handling.

## Implementation Phases

### Phase 1: Update Type System

**Goal**: Establish the unified type foundation without changing runtime behavior.

1. Extend `DebriefFeature` union in `shared/components/src/utils/types.ts` to handle annotation features (CIRCLE, RECTANGLE, LINE, TEXT, VECTOR, POLY) via a generic `AnnotationFeature` type
2. Add type guard `isAnnotationFeature()` alongside existing guards
3. Add `PlotFeature` type alias if needed for features that include annotations
4. Update `loadPlotData()` return type signature to `DebriefFeatureCollection | null`
5. Remove extension-local `Track` and `ReferenceLocation` interfaces from `plot.ts` (replace usages with schema imports)

### Phase 2: Refactor stacService.loadPlotData()

**Goal**: Return a single `DebriefFeatureCollection` from the data loading function.

1. Build `TrackFeature` objects directly (using `@debrief/schemas` type) instead of intermediate `Track` objects
2. Build `ReferenceLocation` objects directly instead of intermediate `ReferenceLocation` objects
3. Wrap annotation features as generic `DebriefFeature` with preserved properties
4. Return `{ type: 'FeatureCollection', features: [...] }` instead of `{ tracks, locations, otherFeatures }`
5. Update unit tests in `stacService.test.ts` and `stacService.shapes.test.ts`

### Phase 3: Update Message Protocol

**Goal**: Simplify the extension ↔ webview IPC to use a single features array.

1. Update `LoadPlotMessage` in `messages.ts`: replace `tracks`/`locations`/`otherFeatures` with `features: DebriefFeature[]`
2. Remove `UpdateTracksMessage` (temporal filtering handled by `setCurrentTime` + display mode)
3. Update `selectionChanged` to use unified `featureIds` instead of `trackIds`/`locationIds`

### Phase 4: Update View Providers

**Goal**: Simplify each provider to accept and forward a single collection.

1. **mapPanel.ts**: `loadPlot(plot, features)` instead of three arrays; store single `features` array; simplify postMessage
2. **activityPanelView.ts**: `setFeatures(features)` single param; `_sendLayersUpdate()` passes features through (already DebriefFeature-shaped)
3. **layersTreeProvider.ts**: `setFeatures(features)` single method; `getChildren()` classifies by `properties.kind` for grouping

### Phase 5: Update openPlot Command

**Goal**: Simplify the distributor that connects loadPlotData to all consumers.

1. Update `openPlot.ts` to pass single collection to each consumer
2. Update session creation to work with unified collection
3. Verify plot metadata extraction (track count, time extent) derives from collection

### Phase 6: Simplify Webview React Component

**Goal**: Remove redundant state and transforms from the map view.

1. Replace `tracks`/`locations`/`otherFeatures` state with single `features` state
2. Remove `trackToFeature()` and `locationToFeature()` transforms (no longer needed)
3. Simplify `useMemo` merge to `[...features, ...resultFeatures, ...drawnFeatures]`
4. Update `loadPlot` message handler

### Phase 7: Verification & Cleanup

**Goal**: Confirm behavioral equivalence and remove dead code.

1. Run full test suite (`task verify`)
2. Run E2E tests to confirm user-visible behavior preserved
3. Remove unused imports and type definitions
4. Verify no TypeScript errors across all packages

## Media Components

None — backend/infrastructure refactoring with no new visual components.

## Storybook E2E Testing

None — no interactive UI components created or visually changed.

## VS Code Webview E2E Testing

| Workflow | Panels Involved | Key Selectors | Interactions |
|----------|----------------|---------------|--------------|
| Open REP file | Map Panel, Activity Panel, Layers Tree | `.leaflet-container`, layer list items | Open plot, verify tracks render, toggle layer visibility |
| Import REP file | Map Panel, Activity Panel | `.leaflet-container` | Drop REP file, verify new tracks appear |
| Time slider | Map Panel | Time controller, `.leaflet-container` | Adjust time, verify track display updates |

**Testing Strategy**:
- [x] Extension workflow works end-to-end in code-server (existing tests)
- [x] Webview content accessible via `frameLocator` chaining (existing infrastructure)
- [ ] Verify existing E2E tests pass without modification after refactoring
- [ ] Screenshots captured for evidence

**Test File Location**: `tests/e2e/` (existing test files — no new test files expected)

**Note**: No new E2E tests needed. Existing E2E tests cover the user-visible workflows. This refactoring is behavioral-equivalent — if existing E2E tests pass, the refactoring is correct.

## Complexity Tracking

No constitution violations. No complexity justifications needed.
