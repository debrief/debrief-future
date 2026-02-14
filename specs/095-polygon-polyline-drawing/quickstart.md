# Quickstart: 095 — Polygon and Polyline Drawing

**Date**: 2026-02-14

## Overview

This feature extends the drawing infrastructure from #094 to support multi-vertex polygon and polyline creation. No new files are needed — everything is added to existing modules.

## What Gets Modified

Six files are modified, zero new files created:

1. **`drawingDefaults.ts`** — Add 2 constants (`DEFAULT_DRAWN_POLYGON_STYLE`, `DEFAULT_DRAWN_POLYLINE_STYLE`)
2. **`isValidDrawnGeometry.ts`** — Add 2 validation cases (polygon: closed ring with 3+ unique vertices, polyline: 2+ vertices)
3. **`createDrawnFeature.ts`** — Add 2 creation cases (polygon → PolyAnnotation, polyline → LineAnnotation), extend return type and options interface
4. **`index.ts`** — Export 2 new constants
5. **`mapView.tsx`** — Extend prompt mapping for 2 new modes
6. **`Drawing.stories.tsx`** — Add story demonstrating polygon and polyline drawing

## Implementation Order

```
1. drawingDefaults.ts    (no dependencies)
2. isValidDrawnGeometry.ts (no dependencies)
3. createDrawnFeature.ts  (depends on 1 and 2)
4. index.ts               (depends on 1)
5. Drawing.stories.tsx     (depends on 3)
6. mapView.tsx             (depends on 3)
```

## Testing Strategy

### Unit Tests (shared/components)

- **isValidDrawnGeometry**:
  - Polygon with 3 vertices → valid
  - Polygon with 2 vertices → invalid
  - Polygon with non-Polygon geometry type → invalid
  - Polyline with 2 vertices → valid
  - Polyline with 1 vertex → invalid
  - Polyline with non-LineString geometry type → invalid

- **createDrawnFeature**:
  - Polygon mode returns PolyAnnotation with kind=POLY, correct vertex_count, default styling
  - Polyline mode returns LineAnnotation with kind=LINE, default styling
  - Invalid geometries return null
  - Custom label applied via options
  - Custom style overrides merged with defaults

### Storybook Visual Testing

- Story demonstrates polygon drawing (click vertices, double-click to close)
- Story demonstrates polyline drawing (click vertices, double-click to finish)
- Drawn features appear in feature list with correct kind labels
- JSON inspector shows schema-compliant output

### VS Code Integration Testing

- Polygon prompt shows "Name this polygon:" with default "Drawn Polygon"
- Polyline prompt shows "Name this path:" with default "Drawn Path"
- Drawn features appear on map and are auto-selected
- Extension receives `featureDrawn` message with correct kind

## Key Implementation Details

### vertex_count Calculation

For polygons, calculate from Geoman's GeoJSON output:
```
vertex_count = polygon.coordinates[0].length - 1
```
The outer ring always includes a closure point (first == last), so subtract 1 for unique vertex count.

### Style Constants Follow Existing Pattern

Both new constants follow the same pattern as `DEFAULT_DRAWN_POINT_STYLE` and `DEFAULT_DRAWN_RECTANGLE_STYLE`:
- Use typed schema interfaces (`PolygonProperties`, `LineProperties`)
- Colors chosen for visual distinction from existing drawn shapes
- Import from `@debrief/schemas`

### Return Type Union

The `createDrawnFeature` return type becomes a 4-member union:
```
ReferenceLocation | RectangleAnnotation | PolyAnnotation | LineAnnotation | null
```
This requires importing `PolyAnnotation` and `LineAnnotation` from `@debrief/schemas`.
