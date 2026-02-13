# [E05] Drawing UX guidance and STAC persistence

## Epic
Part of **E05: Shape Drawing Tools**

## Problem
User-drawn shapes need clear interaction guidance and must be persisted to the STAC catalog so they survive session restarts. Without persistence, drawn annotations are lost when the plot is closed.

## Proposed Solution
- **UX guidance overlay**:
  - Context-sensitive instruction text when drawing mode is active:
    - Point: "Click to place point"
    - Rectangle: "Click and drag to draw rectangle"
    - Polygon: "Click to add vertices, double-click to finish"
    - Polyline: "Click to add vertices, double-click to finish"
  - "Press Esc to cancel" shown for all modes
  - Subtle overlay/tooltip positioned near cursor or at map edge
  - Cursor changes to crosshair during drawing
- **Default styling**:
  - New shapes get sensible default colors/weights from a drawing palette
  - Optional: sequential color assignment so consecutive shapes are visually distinct
- **STAC persistence**:
  - When a shape is drawn, persist it as a GeoJSON feature within the active STAC Item
  - Use existing stacService write path
  - Record provenance: source="user-drawn", timestamp, operator
  - Ensure drawn shapes reload correctly when plot is re-opened

## Success Criteria
- Guidance text visible during all 4 drawing modes
- Esc cancels drawing from any mode and clears guidance
- Cursor changes to crosshair during drawing
- Drawn shapes persist after closing and reopening the plot
- STAC Item contains user-drawn features with provenance metadata
- No regressions in existing STAC read/write operations

## Dependencies
Requires #094 (point/rectangle drawing), #095 (polygon/polyline drawing)

## Complexity
Medium
