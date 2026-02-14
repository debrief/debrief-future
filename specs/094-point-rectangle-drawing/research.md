# Research: Point and Rectangle Drawing

**Feature**: 094-point-rectangle-drawing
**Date**: 2026-02-13

## Research Questions

### RQ-1: How should drawn point features be typed?

**Context**: The schema defines `ReferenceLocation` (kind=POINT) which requires `name` (string, required) and `location_type` (LocationTypeEnum, required). Drawn points from the map don't naturally have these values — the analyst just clicks to place a marker.

**Decision**: Use `ReferenceLocation` with sensible defaults: `name` = "Drawn Point" (with auto-incrementing suffix if needed), `location_type` = "REFERENCE". This keeps schema compliance without introducing a new type. The analyst can rename the point after creation via property editing (future feature).

**Rationale**: The schema already exists and is generated from LinkML. Introducing a new `PointAnnotation` type would require schema changes across LinkML → Pydantic → TypeScript generators, which is out of scope for this feature. The `ReferenceLocation` type is flexible enough to accommodate drawn points.

**Alternatives considered**:
- New `PointAnnotation` schema class: Too invasive for this feature scope; would require schema regeneration and testing across all consumers.
- Using `TextAnnotation` (kind=TEXT): Semantically wrong — drawn points aren't text annotations.
- Omitting required fields: Would break schema validation (FR-008).

### RQ-2: What are the default styling values for drawn features?

**Context**: The schema defines `PointProperties` and `PolygonProperties` but doesn't specify default values — styling is applied by the parser when loading REP files. Drawn features need sensible defaults.

**Decision**: Define a `DEFAULT_DRAWN_POINT_STYLE` and `DEFAULT_DRAWN_RECTANGLE_STYLE` constant in a new utility module (`drawingDefaults.ts`):

**Point defaults** (PointProperties):
- `shape`: "circle"
- `radius`: 6
- `fill`: true
- `fill_color`: "#4CAF50" (green — distinct from track colours)
- `fill_opacity`: 0.7
- `stroke`: true
- `color`: "#388E3C" (darker green)
- `weight`: 2
- `opacity`: 1.0

**Rectangle defaults** (PolygonProperties):
- `fill`: true
- `fill_color`: "#2196F3" (blue)
- `fill_opacity`: 0.15
- `stroke`: true
- `color`: "#1976D2" (darker blue)
- `weight`: 2
- `opacity`: 0.8

**Rationale**: These colours are distinct from existing track colours (blue=#0066cc for ownship, red=#cc0000 for contacts) and annotation colours. Green for points is intuitive ("placed here"). Blue for rectangles matches the existing exercise-area conventions in the fixture data. Values are easily adjustable later.

**Alternatives considered**:
- Reading from styling.yaml at runtime: Would add unnecessary complexity for v1. Default constants are simpler and can be refactored to config-driven later.
- Using the same colours as existing features: Would make drawn features hard to distinguish from loaded data.

### RQ-3: Where should the pm:create handler live?

**Context**: Currently, `LeafletToolbar.handleShapeCreated` only resets the drawing mode. It doesn't convert the Geoman layer to a schema-compliant feature. Feature 094 needs to intercept the `pm:create` event, convert the Geoman output, and add it to the feature collection.

**Decision**: Add an `onShapeCreated` callback prop to `MapView` and `LeafletToolbar`. The toolbar's existing `pm:create` handler will:
1. Extract GeoJSON from `e.layer.toGeoJSON()`
2. Remove the Geoman-created temporary layer from the map (to avoid duplicates)
3. Call the new `onShapeCreated(geojson, drawingMode)` callback
4. Continue to reset drawing mode as before

The actual conversion to a schema-compliant feature happens in a new `createDrawnFeature()` factory function (pure, testable) that is called by the consuming application (VS Code webview or Storybook story).

**Rationale**: Keeps the shared component library generic (it emits raw GeoJSON + mode) while the consumer decides how to integrate with its state management. This follows the "services never touch UI" principle — the conversion logic is a pure function, and the state update is the consumer's responsibility.

**Alternatives considered**:
- Putting the full conversion in LeafletToolbar: Violates separation of concerns — the toolbar shouldn't know about schema types.
- Listening to pm:create in MapView directly: Would bypass the toolbar's drawing mode tracking and create event ordering issues.
- Putting conversion in session-state: The session-state package has no dependency on Geoman or GeoJSON types.

### RQ-4: How to add drawn features to the feature collection?

**Context**: The VS Code webview's `mapView.tsx` manages features as a derived `useMemo` from tracks, locations, and otherFeatures. There's also an `addResultLayer` message type. Drawn features need to be integrated into this pipeline.

**Decision**: Add drawn features to the existing `otherFeatures` state array in `mapView.tsx`. When `onShapeCreated` fires:
1. Convert raw GeoJSON to schema-compliant feature via `createDrawnFeature()`
2. Append to a local `drawnFeatures` state array
3. The existing `features` useMemo already merges `otherFeatures` — drawn features join naturally
4. Call `setSelection([newFeature.id])` to auto-select

For Storybook, the story manages its own feature array via `useState`.

**Rationale**: Follows the existing pattern — `otherFeatures` already handles non-track, non-location features (like calc result layers). Drawn features are semantically similar.

**Alternatives considered**:
- New VS Code message type: Would require extension-side changes, but the webview can manage drawn features locally.
- Adding to session-state store: The session-state store doesn't currently hold GeoJSON features — it holds references (URIs, IDs). Feature collection content is managed by the VS Code extension.

### RQ-5: How to handle degenerate geometries (FR-013)?

**Context**: If the analyst clicks without dragging in rectangle mode, Geoman may produce a zero-area polygon. Need a validation strategy.

**Decision**: Add a `isValidGeometry()` guard in the `createDrawnFeature()` factory:
- For rectangles: Check that the polygon has >= 4 coordinates and non-zero area (bounding box width > 0 AND height > 0).
- For points: Always valid (a click always produces valid coordinates).
- If invalid, return `null` and the consumer silently discards.

**Rationale**: Simple area check catches degenerate rectangles without complex geometry validation. The "silent discard" matches the spec's error state definition.

**Alternatives considered**:
- Snapping to minimum size: Could create rectangles the user didn't intend.
- Showing an error toast: Over-engineered for this edge case; the spec says silent discard.

### RQ-6: How to prevent double-click duplicate points?

**Context**: Rapid double-click in point mode could fire pm:create twice.

**Decision**: After the first pm:create fires, the toolbar already sets `drawingMode = null` and calls `map.pm.disableDraw()`. This prevents a second shape from being created because Geoman exits drawing mode. The existing reset-on-create logic from feature 093 handles this naturally.

**Rationale**: No additional code needed — the existing drawing mode lifecycle already prevents duplicates.

**Alternatives considered**:
- Debouncing pm:create: Would add latency to the first legitimate event.
- Tracking a "processing" flag: Unnecessary complexity given the existing mode reset.

## Key File Inventory

| File | Role |
|------|------|
| `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.tsx` | Toolbar with pm:create handler — needs `onShapeCreated` callback |
| `shared/components/src/MapView/MapView.tsx` | MapView component — needs `onShapeCreated` prop passthrough |
| `shared/components/src/MapView/GeomanControl/useGeoman.ts` | Geoman initialization hook (no changes needed) |
| `shared/schemas/src/linkml/annotations.yaml` | RectangleAnnotation schema (no changes needed) |
| `shared/schemas/src/linkml/geojson.yaml` | ReferenceLocation schema (no changes needed) |
| `shared/schemas/src/generated/typescript/types.ts` | Generated types for features and styling |
| `services/session-state/src/store/slices/features.ts` | Selection management (`setSelection`) |
| `services/session-state/src/store/slices/spatial.ts` | Drawing mode state (`setDrawingMode`) |
| `apps/vscode/src/webview/web/mapView.tsx` | VS Code webview — consumer of drawn features |
| `shared/components/src/MapView/Geoman.stories.tsx` | Existing Geoman stories — extend for drawing demo |
| `shared/components/src/MapView/__fixtures__/exerciseAlpha.ts` | Fixture data showing feature shapes |
