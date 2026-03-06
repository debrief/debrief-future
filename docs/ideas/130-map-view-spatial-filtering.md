# [E08] Map view with live spatial filtering

## Epic
Part of **E08: STAC Stack Browser Discovery UI**

## Problem
Analysts need to discover exercises geographically. The map must show spatial footprints of matching exercises and allow pan/zoom to act as a live spatial filter.

## Proposed Solution
1. Map view displaying spatial footprints (bounding boxes or track outlines) of all matching exercises
2. Pan and zoom acts as a live spatial filter — dynamically narrows list and timeline to exercises whose spatial extent overlaps the current viewport
3. Exercises coloured according to the active colour scheme (see #134)
4. Exercise selection from map opens in new editor tab

## Success Criteria
- Spatial footprints render for all matching exercises
- Pan/zoom dynamically filters list and timeline views
- Colour scheme applied to exercise representations
- "No matches" state handled
- Responsive performance with large result sets

## Existing Code

The `CatalogOverview` component (#042) at `shared/components/src/CatalogOverview/` already renders STAC item bounding boxes on a React-Leaflet map with auto-fit viewport, tooltips, and double-click-to-open. Reusable helpers: `bboxToBounds()`, `combinedBounds()`, `<FitBounds>`. The E08 map view replaces CatalogOverview's map region, adding live spatial filtering (viewport-as-filter), colour scheme support, and cross-view synchronization.

## Dependencies
Requires #125 (STAC Extension spec + mock data fixtures)

## Complexity
Medium
