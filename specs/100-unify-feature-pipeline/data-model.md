# Data Model: Unify Feature Pipeline

**Feature**: 100-unify-feature-pipeline
**Date**: 2026-02-24

## Type Changes Overview

This refactoring replaces extension-local types with schema-derived types and unifies the data pipeline around `DebriefFeature`.

## Before → After

### Return Type of `loadPlotData()`

**Before**:
```
{ tracks: Track[], locations: ReferenceLocation[], otherFeatures: GeoJSONFeature[] } | null
```

**After**:
```
DebriefFeatureCollection | null
```

Where `DebriefFeatureCollection = { type: 'FeatureCollection', features: DebriefFeature[] }` (already defined in shared/components).

---

## Type Mapping

### Extension `Track` → Schema `TrackFeature`

| Extension `Track` (plot.ts) | Schema `TrackFeature` (@debrief/schemas) |
|---|---|
| `id: string` | `id: string` |
| `name: string` | `properties.platform_name: string` |
| `platformType?: string` | `properties.track_type: string` |
| `geometry: LineString` | `geometry: GeoJSONLineString \| GeoJSONMultiLineString` |
| `times: number[]` | `properties.positions[].time` (ISO 8601 strings) |
| `positions?: TimestampedPosition[]` | `properties.positions: TimestampedPosition[]` |
| `startTime: string` | `properties.start_time: string` |
| `endTime: string` | `properties.end_time: string` |
| `color?: string` | `properties.style.line.color: string` |
| `visible: boolean` | *(removed — session state manages visibility)* |
| `selected: boolean` | *(removed — session state manages selection)* |
| `defaultPositionStyle?: PositionStyle` | `properties.default_position_style: PositionStyle` |
| `symbolInterval?: string` | `properties.symbol_interval?: string` |
| `labelInterval?: string` | `properties.label_interval?: string` |
| `positionStyleOverrides?: ...` | `properties.position_style_overrides?: ...` |

### Extension `ReferenceLocation` → Schema `ReferenceLocation`

| Extension `ReferenceLocation` (plot.ts) | Schema `ReferenceLocation` (@debrief/schemas) |
|---|---|
| `id: string` | `id: string` |
| `name: string` | `properties.name: string` |
| `locationType?: string` | `properties.location_type: string` |
| `geometry: Point` | `geometry: GeoJSONPoint \| GeoJSONMultiPoint` |
| `visible: boolean` | *(removed — session state manages visibility)* |
| `selected: boolean` | *(removed — session state manages selection)* |

### Extension `GeoJSONFeature` → `AnnotationFeature` (new)

For features with kinds: CIRCLE, RECTANGLE, LINE, TEXT, VECTOR, POLY.

```typescript
interface AnnotationFeature {
  type: 'Feature';
  id: string;
  geometry: GeoJSONGeometry;  // Any GeoJSON geometry type
  properties: {
    kind: string;             // FeatureKindEnum value
    name?: string;
    style?: Record<string, unknown>;
    [key: string]: unknown;   // Preserve all original properties
  };
}
```

### Unified Type

```typescript
// Extend existing DebriefFeature union
type DebriefFeature = TrackFeature | ReferenceLocation | MultiPointFeature | MultiPolygonFeature | AnnotationFeature;
```

---

## Message Protocol Changes

### `LoadPlotMessage`

**Before**:
```typescript
interface LoadPlotMessage {
  type: 'loadPlot';
  plot: {
    id: string;
    title: string;
    tracks: Track[];
    locations: ReferenceLocation[];
    otherFeatures?: GeoJSONFeature[];
    bbox: [number, number, number, number];
    timeExtent: [string, string];
  };
}
```

**After**:
```typescript
interface LoadPlotMessage {
  type: 'loadPlot';
  plot: {
    id: string;
    title: string;
    features: DebriefFeature[];
    bbox: [number, number, number, number];
    timeExtent: [string, string];
  };
}
```

### `selectionChanged` (webview → extension)

**Before**: `{ trackIds: string[], locationIds: string[] }`
**After**: `{ featureIds: string[] }`

### Removed Messages

- `UpdateTracksMessage` — temporal filtering handled via `setCurrentTime` + `displayMode` on the full collection; rendering components already filter by kind

---

## State Changes

### mapPanel.ts

**Before**: `currentTracks: Track[]`, `currentLocations: ReferenceLocation[]`, `otherFeatures: GeoJSONFeature[]`
**After**: `currentFeatures: DebriefFeature[]`

### mapView.tsx

**Before**: `tracks: Track[]`, `locations: ReferenceLocation[]`, `otherFeatures: GeoJSONFeature[]`
**After**: `features: DebriefFeature[]`

### activityPanelView.ts

**Before**: `_tracks: Track[]`, `_locations: ReferenceLocation[]`, `_otherFeatures: GeoJSONFeature[]`
**After**: `_features: DebriefFeature[]`

### layersTreeProvider.ts

**Before**: `tracks: Track[]`, `locations: ReferenceLocation[]`, `shapes: GeoJSONFeature[]`
**After**: `features: DebriefFeature[]`

---

## Classification at Render Boundary

Components classify features using existing type guards from `shared/components/src/utils/types.ts`:

```typescript
// Already exists
isTrackFeature(f)      → f.properties.kind === 'TRACK'
isReferenceLocation(f) → f.properties.kind === 'POINT'
isMultiPointFeature(f) → f.properties.kind === 'MULTI_POINT'
isMultiPolygonFeature(f) → f.properties.kind === 'MULTI_POLYGON'

// New
isAnnotationFeature(f) → !isTrackFeature(f) && !isReferenceLocation(f) && ...
```

### Layers Tree Grouping

The layers tree currently creates three groups implicitly (tracks first, then locations, then shapes). After unification, it groups by `properties.kind`:

- **Tracks**: features where `isTrackFeature(f)`
- **Locations**: features where `isReferenceLocation(f)`
- **Shapes**: all other features (annotations, polygons, etc.)
- **Results**: result layers (unchanged)
