# Drawing API Contract

**Feature**: 094-point-rectangle-drawing
**Date**: 2026-02-13

## Component Contracts

### 1. MapView Props (extended)

New prop added to existing `MapViewProps` interface:

```typescript
/** Callback when a shape is drawn via Geoman. Called with raw GeoJSON and the active drawing mode. */
onShapeCreated?: (geojson: GeoJSON.Feature, mode: DrawingMode) => void;
```

### 2. LeafletToolbar Options (extended)

New callback added to existing `ToolbarControl` options:

```typescript
/** Callback when a shape is completed. Receives raw GeoJSON from Geoman and the drawing mode. */
onShapeCreated?: (geojson: GeoJSON.Feature, mode: DrawingMode) => void;
```

### 3. createDrawnFeature() Factory Function

Pure function that converts raw Geoman GeoJSON output to a schema-compliant Debrief feature.

**Signature**:
```typescript
function createDrawnFeature(
  geojson: GeoJSON.Feature,
  mode: DrawingMode,
  options?: CreateDrawnFeatureOptions,
): ReferenceLocation | RectangleAnnotation | null;
```

**Options**:
```typescript
interface CreateDrawnFeatureOptions {
  /** Override default point style */
  pointStyle?: Partial<PointProperties>;
  /** Override default rectangle style */
  rectangleStyle?: Partial<PolygonProperties>;
  /** Custom name for the feature (point only) */
  name?: string;
  /** Custom label for the feature (rectangle only) */
  label?: string;
}
```

**Returns**:
- `ReferenceLocation` when `mode === 'point'` — with `kind: "POINT"`, default name, default style
- `RectangleAnnotation` when `mode === 'rectangle'` — with `kind: "RECTANGLE"`, default label, default style
- `null` when geometry validation fails (degenerate rectangle) or mode is not point/rectangle

**Behaviour**:
- Generates UUID via `crypto.randomUUID()`
- Validates geometry (non-zero area for rectangles)
- Applies default styling merged with any overrides
- Removes the Geoman temporary layer is the caller's responsibility

### 4. isValidDrawnGeometry() Guard

**Signature**:
```typescript
function isValidDrawnGeometry(
  geojson: GeoJSON.Feature,
  mode: DrawingMode,
): boolean;
```

**Rules**:
- `mode === 'point'`: Returns `true` if geometry type is "Point" with valid coordinates
- `mode === 'rectangle'`: Returns `true` if geometry type is "Polygon" with >= 5 coordinates in the first ring and non-zero bounding area
- All other modes: Returns `false` (not handled by this feature)

### 5. Default Styling Constants

```typescript
const DEFAULT_DRAWN_POINT_STYLE: PointProperties;
const DEFAULT_DRAWN_RECTANGLE_STYLE: PolygonProperties;
```

Exported from `shared/components/src/MapView/drawing/drawingDefaults.ts` for use by consumers and Storybook stories.

## Event Flow

```
User clicks/drags on map (Geoman active)
  │
  ▼
Geoman fires pm:create event with { layer: L.Layer }
  │
  ▼
LeafletToolbar.handleShapeCreated:
  1. Extract GeoJSON: layer.toGeoJSON()
  2. Remove temporary layer: layer.remove()
  3. Call onShapeCreated(geojson, this.drawingMode)
  4. Reset drawingMode to null
  5. Call onDrawingModeChange(null)
  │
  ▼
MapView passes through to consumer's onShapeCreated callback
  │
  ▼
Consumer (VS Code webview / Storybook):
  1. Call createDrawnFeature(geojson, mode)
  2. If null → discard (degenerate geometry)
  3. If valid → append to feature collection
  4. Set selection to [newFeature.id]
```

## File Locations

| Artifact | Path |
|----------|------|
| Factory function | `shared/components/src/MapView/drawing/createDrawnFeature.ts` |
| Geometry guard | `shared/components/src/MapView/drawing/isValidDrawnGeometry.ts` |
| Default styles | `shared/components/src/MapView/drawing/drawingDefaults.ts` |
| Barrel export | `shared/components/src/MapView/drawing/index.ts` |
| Unit tests | `shared/components/src/MapView/drawing/__tests__/createDrawnFeature.test.ts` |
| Unit tests | `shared/components/src/MapView/drawing/__tests__/isValidDrawnGeometry.test.ts` |
| Storybook story | `shared/components/src/MapView/Drawing.stories.tsx` |
