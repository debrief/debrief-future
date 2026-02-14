# Quickstart: Point and Rectangle Drawing

**Feature**: 094-point-rectangle-drawing
**Date**: 2026-02-13

## Prerequisites

- Feature 091 (FeatureKindEnum) merged — POINT and RECTANGLE in schema
- Feature 092 (Geoman integration) merged — `@geoman-io/leaflet-geoman-free` installed and initialized
- Feature 093 (Drawing toolbar) merged — shape palette UI, `drawingMode` state, Geoman mode activation

## Implementation Order

### Phase 1: Pure Logic (no UI dependencies)

1. **Create `drawingDefaults.ts`** — default point and rectangle styling constants
2. **Create `isValidDrawnGeometry.ts`** — geometry validation guard
3. **Create `createDrawnFeature.ts`** — factory function converting raw GeoJSON to schema-compliant features
4. **Write unit tests** for all three modules

### Phase 2: Component Integration

5. **Extend `LeafletToolbar`** — add `onShapeCreated` callback, extract GeoJSON from pm:create event, remove temp layer
6. **Extend `MapView`** — pass `onShapeCreated` prop through to toolbar
7. **Create `Drawing.stories.tsx`** — Storybook story demonstrating point and rectangle drawing with live feature list

### Phase 3: VS Code Integration

8. **Update `mapView.tsx`** (VS Code webview) — handle `onShapeCreated`, add drawn features to collection, auto-select

## Quick Verification

After implementation, verify:

```
1. Open Storybook → Drawing story
2. Click "Point" in shape palette → click on map → point appears with green marker
3. Click "Rectangle" in shape palette → drag on map → blue rectangle appears
4. Both features appear in the feature list
5. Each drawn feature is auto-selected

In VS Code:
6. Load a REP file
7. Draw a point → appears on map, selected in feature list
8. Draw a rectangle → appears on map, selected in feature list
9. Drawn features coexist with loaded track data
```

## Key Files to Create

| File | Purpose |
|------|---------|
| `shared/components/src/MapView/drawing/drawingDefaults.ts` | Default styling constants |
| `shared/components/src/MapView/drawing/isValidDrawnGeometry.ts` | Geometry validation |
| `shared/components/src/MapView/drawing/createDrawnFeature.ts` | Feature factory |
| `shared/components/src/MapView/drawing/index.ts` | Barrel export |
| `shared/components/src/MapView/drawing/__tests__/createDrawnFeature.test.ts` | Factory unit tests |
| `shared/components/src/MapView/drawing/__tests__/isValidDrawnGeometry.test.ts` | Validation unit tests |
| `shared/components/src/MapView/Drawing.stories.tsx` | Storybook demo |

## Key Files to Modify

| File | Change |
|------|--------|
| `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.tsx` | Add `onShapeCreated` callback, extract GeoJSON, remove temp layer |
| `shared/components/src/MapView/MapView.tsx` | Add `onShapeCreated` prop, pass to toolbar |
| `apps/vscode/src/webview/web/mapView.tsx` | Handle onShapeCreated, manage drawn features state, auto-select |
| `shared/components/src/index.ts` | Export drawing utilities if needed |

## Testing Strategy

| Level | What | How |
|-------|------|-----|
| Unit | `createDrawnFeature()` | Test point/rectangle creation, UUID generation, default styling, degenerate geometry |
| Unit | `isValidDrawnGeometry()` | Test valid/invalid geometries for both modes |
| Story | Drawing flow | Storybook story with interactive drawing and feature display |
| Integration | VS Code webview | Manual test: draw shapes, verify they appear in plot |
