# Quickstart: Unify Feature Pipeline

**Feature**: 100-unify-feature-pipeline
**Date**: 2026-02-24

## What This Changes

`stacService.loadPlotData()` currently returns `{ tracks: Track[], locations: ReferenceLocation[], otherFeatures: GeoJSONFeature[] }`. After this refactoring, it returns `DebriefFeatureCollection` — a single flat array of `DebriefFeature` objects. Every consumer (mapPanel, activityPanel, layersTree, mapView) is updated to receive and forward this single collection.

## Key Design Decisions

1. **Use existing schema types**: `TrackFeature` and `ReferenceLocation` from `@debrief/schemas` replace extension-local `Track` and `ReferenceLocation` types
2. **Add `AnnotationFeature`**: A new catch-all type for annotation kinds (CIRCLE, RECTANGLE, LINE, TEXT, VECTOR, POLY) that preserves original properties
3. **Extend `DebriefFeature` union**: Add `AnnotationFeature` to the existing union type
4. **Classify at render boundary**: Components use existing type guards (`isTrackFeature`, `isReferenceLocation`, etc.)
5. **Remove `visible`/`selected` from data**: These are UI state managed by session state, not data properties

## Implementation Order

1. **Types first** — extend `DebriefFeature` union, add `AnnotationFeature` type
2. **Service layer** — refactor `loadPlotData()` to build schema types directly
3. **Message protocol** — update `LoadPlotMessage` to use `features: DebriefFeature[]`
4. **View providers** — simplify to single `setFeatures(features)` method each
5. **openPlot command** — pass single collection to all consumers
6. **Webview** — simplify React state, remove `trackToFeature`/`locationToFeature` transforms
7. **Verify** — run `task verify`, run E2E tests

## Files to Modify

| File | Change |
|------|--------|
| `shared/components/src/utils/types.ts` | Add `AnnotationFeature`, extend `DebriefFeature` union, add type guard |
| `apps/vscode/src/services/stacService.ts` | `loadPlotData()` returns `DebriefFeatureCollection` |
| `apps/vscode/src/webview/messages.ts` | Update `LoadPlotMessage`, `selectionChanged` |
| `apps/vscode/src/webview/mapPanel.ts` | Single `features` state, simplified `loadPlot()` |
| `apps/vscode/src/views/activityPanelView.ts` | Single `setFeatures(features)` method |
| `apps/vscode/src/providers/layersTreeProvider.ts` | Single `setFeatures(features)`, classify for tree |
| `apps/vscode/src/commands/openPlot.ts` | Pass single collection to consumers |
| `apps/vscode/src/webview/web/mapView.tsx` | Single `features` state, remove transforms |
| `apps/vscode/src/types/plot.ts` | Remove `Track`, `ReferenceLocation` (use schema imports) |
| `apps/vscode/tests/unit/stacService.test.ts` | Update test assertions |
| `apps/vscode/tests/unit/stacService.shapes.test.ts` | Update test assertions |

## Testing Approach

- Update stacService unit tests to assert `DebriefFeatureCollection` return type
- Use type guards to verify feature classification in tests
- Run full `task verify` (builds + linting + all tests)
- Run E2E tests to confirm user-visible behavior is preserved

## Key Type Guards (already exist)

```typescript
isTrackFeature(f)       // f.properties.kind === 'TRACK'
isReferenceLocation(f)  // f.properties.kind === 'POINT'
isMultiPointFeature(f)  // f.properties.kind === 'MULTI_POINT'
isMultiPolygonFeature(f) // f.properties.kind === 'MULTI_POLYGON'
isAnnotationFeature(f)  // NEW — everything else
```
