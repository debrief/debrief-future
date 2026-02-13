# [E05] Add drawing toolbar with shape palette

## Epic
Part of **E05: Shape Drawing Tools**

## Problem
Analysts need a discoverable but non-intrusive way to access shape drawing tools. The drawing tools should not permanently occupy toolbar space since they are used intermittently.

## Proposed Solution
- Add a '+' (add shape) button to the existing LeafletToolbar component
- Clicking '+' opens a dropdown/popover showing available shape types:
  - Point (dot icon)
  - Rectangle (rectangle icon)
  - Polygon (pentagon/polygon icon)
  - Polyline (polyline icon)
- Each option has an icon matching the shape type
- Selecting a shape type activates that drawing mode via Geoman
- Add `drawingMode` state to session-state store (null | 'point' | 'rectangle' | 'polygon' | 'polyline')
- Pressing Esc or clicking the '+' button again cancels drawing mode
- Active drawing mode is visually indicated (highlighted button, cursor change)

## Success Criteria
- '+' button visible in map toolbar
- Dropdown shows 4 shape options with recognizable icons
- Selecting a shape activates Geoman drawing mode
- Session-state store tracks active drawing mode
- Esc cancels drawing and resets toolbar state
- Storybook story demonstrates toolbar interaction

## Dependencies
Requires #092 (Geoman integration)

## Complexity
Medium
