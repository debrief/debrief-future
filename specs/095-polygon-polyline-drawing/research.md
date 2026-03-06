# Research: 095 — Polygon and Polyline Drawing

**Date**: 2026-02-14
**Branch**: `095-polygon-polyline-drawing`

## Research Questions

### RQ-1: What FeatureKind should polylines use?

**Decision**: Use existing `LINE` FeatureKind.

**Rationale**: The 091-poly-featurekind spec explicitly confirms that `LINE` supports multi-vertex LineString geometries with no vertex count constraint beyond the GeoJSON minimum of 2 points. A golden fixture with 5+ vertices was created to validate this. No separate `POLYLINE` FeatureKind is needed.

**Alternatives considered**:
- Add a new `POLYLINE` enum value — rejected because LINE already covers the use case and adding a new kind would require schema changes, type regeneration, and fixture updates with no functional benefit.

**Note**: The ideas document (`docs/ideas/095-polygon-polyline-drawing.md`) references `FeatureKind=POLYLINE`, but this is outdated. The schema spec (#091-E05) is authoritative.

### RQ-2: What default styling should polygon and polyline features use?

**Decision**: Distinct colors from existing drawn features to avoid visual confusion.

**Rationale**: Existing defaults are green (points) and blue (rectangles). Polygons and polylines need their own visual identity while remaining harmonious.

**Chosen styles**:
- **Polygon (POLY)**: Orange fill (`#FF9800`) with darker stroke (`#E65100`), low fill opacity (0.15) — warm color distinct from blue rectangles
- **Polyline (LINE)**: Teal/cyan stroke (`#00BCD4`) with no fill — distinct from all other shapes, clearly a line (not an area)

**Alternatives considered**:
- Same blue as rectangles — rejected because users need to distinguish drawn polygons from drawn rectangles at a glance
- Purple for polygons — viable but orange has better contrast against typical maritime map backgrounds (blue water)

### RQ-3: How does the vertex_count field work for POLY features?

**Decision**: `vertex_count` is the number of unique vertices, excluding the ring closure point.

**Rationale**: The PolyAnnotationProperties schema defines `vertex_count` as an informational metadata field (minimum 3). A Polygon with coordinates `[[A, B, C, D, A]]` (5 points including closure) has `vertex_count: 4`. This matches Geoman's output where the closure point is automatically appended.

**Implementation**: Calculate as `coordinates[0].length - 1` (subtract the closure point from the outer ring).

### RQ-4: How should the VS Code webview handle polygon/polyline naming prompts?

**Decision**: Extend the existing `handleShapeCreated` callback in `mapView.tsx` with mode-specific prompts and defaults.

**Rationale**: The existing pattern uses `window.prompt()` for point and rectangle naming. The same pattern works for polygon and polyline — no UX change needed, just additional cases.

**Prompt mapping**:
- `'polygon'` → prompt: "Name this polygon:", default: "Drawn Polygon"
- `'polyline'` → prompt: "Name this path:", default: "Drawn Path"

### RQ-5: What Geoman events fire for polygon and polyline completion?

**Decision**: No custom event handling needed — the existing `pm:create` handler in LeafletToolbar already works for all shape types.

**Rationale**: LeafletToolbar's `handleShapeCreated` (lines 453-469) extracts GeoJSON from the `pm:create` event and passes it to the `onShapeCreated` callback regardless of shape type. The Geoman shape map already includes `polygon → 'Polygon'` and `polyline → 'Line'`. The toolbar's `SHAPE_PALETTE_ITEMS` array already includes polygon and polyline options.

### RQ-6: What validation rules apply to polygon and polyline geometries?

**Decision**: Minimum vertex counts enforce GeoJSON validity; no topological validation.

**Polygon validation**:
- Geometry type must be `Polygon`
- Outer ring must have at least 4 coordinate pairs (3 unique vertices + closure)
- All coordinates must be finite numbers
- No area check (unlike rectangles) — thin/degenerate polygons are accepted

**Polyline validation**:
- Geometry type must be `LineString`
- Must have at least 2 coordinate pairs (2 vertices)
- All coordinates must be finite numbers

**Alternatives considered**:
- Self-intersection check — rejected per spec (out of scope, valid at schema level)
- Minimum area for polygons — rejected because thin polygons are valid annotations

## Dependencies Status

| Dependency | Status | Impact |
|------------|--------|--------|
| #091-E05 POLY FeatureKind | specified | Schema types available: `PolyAnnotation`, `PolyAnnotationProperties` |
| #091 FeatureKindEnum (LINE) | complete (#062) | LINE kind exists and supports multi-vertex LineStrings |
| #092 Geoman integration | specified | Drawing library initialized, Polygon and Line modes available |
| #093 Drawing toolbar | specified | Shape palette includes polygon/polyline options, DrawingMode state managed |
| #094 Point/rectangle drawing | approved | `createDrawnFeature()`, `isValidDrawnGeometry()`, default styles pattern established |

## Existing Infrastructure (No Changes Needed)

These components already support polygon and polyline modes:

1. **LeafletToolbar** — `GEOMAN_SHAPE_MAP`, `SHAPE_PALETTE_ITEMS`, `pm:create` handler
2. **MapView** — Props include `drawingMode` and `onShapeCreated` (DrawingMode already includes 'polygon'|'polyline')
3. **Session state** — `DrawingMode` type, `setDrawingMode()` action
4. **Schema types** — `PolyAnnotation`, `LineAnnotation`, `PolygonProperties`, `LineProperties` all generated
5. **Geoman library** — Polygon and Line drawing modes work out of the box

## Files to Modify

| File | Change | Complexity |
|------|--------|------------|
| `shared/components/src/MapView/drawing/drawingDefaults.ts` | Add 2 new style constants | Low |
| `shared/components/src/MapView/drawing/isValidDrawnGeometry.ts` | Add polygon and polyline validation cases | Low |
| `shared/components/src/MapView/drawing/createDrawnFeature.ts` | Add polygon and polyline creation cases, extend return type, extend options | Medium |
| `shared/components/src/MapView/drawing/index.ts` | Export new constants | Low |
| `apps/vscode/src/webview/web/mapView.tsx` | Extend prompt/default mapping for 2 new modes | Low |
| `shared/components/src/MapView/Drawing.stories.tsx` | Add/update story for all 4 shape types | Low |
