# [E05] Integrate Geoman drawing library

## Epic
Part of **E05: Shape Drawing Tools**

## Problem
The project has no drawing/editing library. Analysts need to draw shapes directly on the map, which requires a Leaflet-compatible drawing library that works with the existing react-leaflet 4.2 stack.

## Proposed Solution
- Install `@geoman-io/leaflet-geoman-free` (MIT-licensed fork, actively maintained)
- Configure Geoman with the existing react-leaflet MapContainer in shared components
- Verify esbuild bundling works for VS Code webview (no CSS/asset issues)
- Verify Storybook rendering with Geoman enabled
- Create a minimal proof-of-concept story showing one shape type drawn
- Document any required CSS imports or Leaflet plugin initialization

## Success Criteria
- `@geoman-io/leaflet-geoman-free` installed in shared/components
- Geoman initializes correctly on the Leaflet map instance
- esbuild bundle for VS Code webview builds without errors
- Storybook story demonstrates Geoman drawing capability
- No regressions in existing map rendering

## Dependencies
None

## Complexity
Medium
