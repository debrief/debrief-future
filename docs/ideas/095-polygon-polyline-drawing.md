# [E05] Implement polygon and polyline drawing

## Epic
Part of **E05: Shape Drawing Tools**

## Problem
Analysts need to draw arbitrary polygons (e.g., operational areas, exclusion zones) and polylines (e.g., planned routes, boundaries) on the map.

## Proposed Solution
- **Polygon drawing**: Multi-vertex click interaction via Geoman's Polygon mode
  - Click to place vertices
  - Double-click (or click first vertex) to close and complete the polygon
  - Convert Geoman output to schema-compliant GeoJSON Polygon with FeatureKind=POLY
  - Apply default PolygonProperties styling
  - Auto-generate unique feature ID
- **Polyline drawing**: Multi-vertex click interaction via Geoman's Line mode
  - Click to place vertices sequentially
  - Double-click to finish the polyline
  - Convert Geoman output to schema-compliant GeoJSON LineString with FeatureKind=POLYLINE
  - Apply default LineProperties styling
  - Auto-generate unique feature ID
- Guidance text displayed during multi-vertex operations (e.g., "Click to add vertices, double-click to finish")
- Add drawn features to the active feature collection

## Success Criteria
- Multi-click creates polygon vertices, double-click completes shape
- Multi-click creates polyline vertices, double-click completes line
- Drawn features have correct GeoJSON geometry types
- Features pass schema validation for their respective kinds
- Guidance text appears during vertex placement
- Storybook stories demonstrate both drawing modes

## Dependencies
Requires #091 (FeatureKindEnum), #092 (Geoman integration), #093 (Drawing toolbar)

## Complexity
Medium
