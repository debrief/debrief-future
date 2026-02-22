# 100 - Unify Feature Pipeline

**Category**: Tech Debt
**Status**: approved

## Summary

`stacService.loadPlotData()` currently classifies features into three separate arrays (`tracks`, `locations`, `otherFeatures`), forcing every consumer (`mapPanel`, `activityPanel`, `layersTree`) to receive different slices and reassemble them.

## Problem

The service layer is doing classification that belongs in the view layer. This creates:

- Tight coupling between stacService and every consumer
- Fragile classification logic that must be updated whenever a new feature kind is added
- The `Track`/`ReferenceLocation`/`GeoJSONFeature` type split at the transport boundary is unnecessary -- features already carry `kind`, `geometry.type`, `times`, and other properties that views can use directly

## Proposed Change

1. `stacService.loadPlotData()` returns a **single GeoJSON FeatureCollection**
2. View providers become thin -- pass the full collection through
3. React components classify and render based on feature properties (`kind`, `geometry.type`, `times`, etc.)
4. Remove classification logic from the service layer

## Benefits

- Simplifies the `openPlot` command
- Removes classification logic from the service layer
- Makes `Track`/`ReferenceLocation`/`GeoJSONFeature` type split unnecessary at the transport boundary
- Easier to add new feature kinds without touching stacService
- Cleaner architecture, fewer bugs from the split

## Scoring Rationale

- **V=3**: Cleaner architecture, fewer bugs from split; useful enhancement to existing functionality
- **M=1**: Internal refactoring, hard to communicate externally
- **A=4**: Mechanical refactoring, AI-friendly; some verification needed for all consumers
- **Total=8**, **Complexity**: Medium (moderate scope, touches multiple consumers)
