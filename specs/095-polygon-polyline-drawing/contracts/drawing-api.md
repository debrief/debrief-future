# Drawing API Contract: 095 — Polygon and Polyline Drawing

**Date**: 2026-02-14

## Functions

### `createDrawnFeature(geojson, mode, options?)`

Extends the existing pure conversion function to handle polygon and polyline modes.

**Signature**:
```
createDrawnFeature(
  geojson: GeoJSON.Feature,
  mode: DrawingMode,
  options?: CreateDrawnFeatureOptions
) → ReferenceLocation | RectangleAnnotation | PolyAnnotation | LineAnnotation | null
```

**Mode Mapping**:

| Mode | Returned Type | Kind | Geometry |
|------|---------------|------|----------|
| `'point'` | `ReferenceLocation` | `POINT` | `Point` |
| `'rectangle'` | `RectangleAnnotation` | `RECTANGLE` | `Polygon` |
| `'polygon'` | `PolyAnnotation` | `POLY` | `Polygon` |
| `'polyline'` | `LineAnnotation` | `LINE` | `LineString` |
| `null` | `null` | — | — |

**Polygon Output Shape**:
```json
{
  "type": "Feature",
  "id": "<uuid>",
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[lon1, lat1], [lon2, lat2], [lon3, lat3], [lon1, lat1]]]
  },
  "properties": {
    "kind": "POLY",
    "vertex_count": 3,
    "label": "Drawn Polygon",
    "style": { "fill": true, "fill_color": "#FF9800", "fill_opacity": 0.15, "stroke": true, "color": "#E65100", "weight": 2, "opacity": 0.8 }
  }
}
```

**Polyline Output Shape**:
```json
{
  "type": "Feature",
  "id": "<uuid>",
  "geometry": {
    "type": "LineString",
    "coordinates": [[lon1, lat1], [lon2, lat2], [lon3, lat3]]
  },
  "properties": {
    "kind": "LINE",
    "label": "Drawn Path",
    "style": { "stroke": true, "color": "#00BCD4", "weight": 3, "opacity": 0.9 }
  }
}
```

### `isValidDrawnGeometry(geojson, mode)`

Extends the existing validation function to handle polygon and polyline modes.

**Signature**:
```
isValidDrawnGeometry(geojson: GeoJSON.Feature, mode: DrawingMode) → boolean
```

**New Validation Cases**:

| Mode | Geometry Type | Min Coordinates | Additional Checks |
|------|---------------|-----------------|-------------------|
| `'polygon'` | `Polygon` | 4 (ring with 3 unique + closure) | All coords finite numbers |
| `'polyline'` | `LineString` | 2 | All coords finite numbers |

## Callback Flow

```
User completes drawing on map
  → Geoman fires pm:create event
  → LeafletToolbar.handleShapeCreated() extracts GeoJSON
  → Calls onShapeCreated(geojson, mode) callback
  → Consumer calls createDrawnFeature(geojson, mode, opts)
  → Returns schema-compliant feature or null
  → Consumer adds to feature collection, auto-selects
```

## VS Code Webview Integration

The `handleShapeCreated` callback in `mapView.tsx` is extended:

| Mode | Prompt Label | Default Name | Options Key |
|------|-------------|--------------|-------------|
| `'point'` | "Name this point:" | "Drawn Point" | `{ name }` |
| `'rectangle'` | "Name this shape:" | "Drawn Rectangle" | `{ label: name }` |
| `'polygon'` | "Name this polygon:" | "Drawn Polygon" | `{ label: name }` |
| `'polyline'` | "Name this path:" | "Drawn Path" | `{ label: name }` |

Selection context type for the `selectionChanged` message:

| Mode | Context Type |
|------|-------------|
| `'point'` | `'location'` |
| `'rectangle'` | `'none'` |
| `'polygon'` | `'none'` |
| `'polyline'` | `'none'` |
