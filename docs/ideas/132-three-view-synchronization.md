# [E08] Three-view synchronization and filter state

## Epic
Part of **E08: STAC Stack Browser Discovery UI**

## Problem
The three views (list, map, timeline) and the filter bar must all reflect the same combined filter state at all times. Changes in any view or filter must propagate to all others dynamically.

## Proposed Solution
1. Shared filter state store combining metadata filters (from filter bar), spatial filter (from map viewport), and temporal filter (from timeline range)
2. All views subscribe to the combined filter state and re-render on change
3. Filter state changes from any source (filter bar add/edit/remove, map pan/zoom, timeline range adjustment) update the shared state
4. Zero-results handling: all views display "No matches" when no exercises satisfy current filters
5. Dynamic updates with no manual refresh required

## Success Criteria
- Adding a metadata filter updates list, map, and timeline simultaneously
- Panning the map updates list and timeline to show only spatially overlapping exercises
- Adjusting timeline range updates list and map to show only temporally overlapping exercises
- All combinations of simultaneous filters work correctly (metadata + spatial + temporal)
- Zero-results state handled consistently across all views
- Performance remains responsive with complex filter combinations

## Existing Code

The `CatalogOverview` component (#042) uses a simple drag-bar split between map and timeline regions with local `useState` and memoized data filtering. E08 replaces this with a richer state model: shared filter state store (likely Zustand, already in the tech stack) coordinating filter bar + three views. The CatalogOverview's pattern of memoized data derivation from props is a good starting point, but the synchronization layer is fundamentally new.

## Dependencies
Requires #127 (Filter bar), #129 (List view), #130 (Map view), #131 (Timeline view)

## Complexity
High
