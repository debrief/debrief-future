# [E05] Implement point and rectangle drawing

## Epic
Part of **E05: Shape Drawing Tools**

## Problem
Analysts need to place point markers and draw rectangles directly on the map to annotate areas of interest.

## Proposed Solution
- **Point drawing**: Click-to-place interaction via Geoman's Marker mode
  - Single click places a Point feature at the clicked location
  - Convert Geoman output to schema-compliant GeoJSON with FeatureKind=POINT
  - Apply default PointProperties styling (from styling.yaml)
  - Auto-generate unique feature ID
- **Rectangle drawing**: Click-drag interaction via Geoman's Rectangle mode
  - Click and drag to define rectangle bounds
  - Convert Geoman output to schema-compliant GeoJSON Polygon with FeatureKind=RECTANGLE
  - Apply default PolygonProperties styling
  - Auto-generate unique feature ID
- Add drawn features to the active feature collection via session-state store
- Fire selection event on newly drawn feature
- Ensure drawn shapes render correctly with existing MapView renderers

## Success Criteria
- Click on map in point mode creates a POINT feature at that location
- Click-drag in rectangle mode creates a RECTANGLE Polygon feature
- Drawn features appear immediately on the map with default styling
- Features have valid schema-compliant GeoJSON properties
- Newly drawn feature is auto-selected
- Storybook stories demonstrate both drawing modes

## Dependencies
Requires #091 (FeatureKindEnum), #092 (Geoman integration), #093 (Drawing toolbar)

## Complexity
Medium
