# [E08] Timeline/Gantt view with temporal filtering

## Epic
Part of **E08: STAC Stack Browser Discovery UI**

## Problem
Analysts need to discover exercises by time period. A Gantt-style timeline showing temporal extents must allow time range adjustment as a live temporal filter.

## Proposed Solution
1. Timeline/Gantt view displaying temporal extents of all matching exercises as horizontal bars
2. Adjusting the visible time range acts as a live temporal filter — dynamically narrows list and map to exercises with activity within the current time window
3. Exercises coloured according to the active colour scheme (see #134)
4. Exercise selection from timeline opens in new editor tab

## Success Criteria
- Temporal extent bars render for all matching exercises
- Time range adjustment dynamically filters list and map views
- Colour scheme applied to exercise representations
- "No matches" state handled
- Time axis supports ISO 8601 datetime representation

## Existing Code

The `CatalogOverview` component (#042) at `shared/components/src/CatalogOverview/` already renders an SVG-based timeline with temporal extent bars, point markers for single-datetime items, and time axis formatting. Reusable helpers: `parseTime()`, `computeTimeRange()`, bar positioning math, `formatDate()`. The E08 timeline replaces CatalogOverview's timeline region, adding interactive time-range adjustment as a live filter, colour scheme support, and cross-view synchronization.

## Dependencies
Requires #125 (STAC Extension spec + mock data fixtures)

## Complexity
Medium
