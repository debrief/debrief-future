# Research: Drawing Toolbar with Shape Palette

**Feature**: 093-drawing-toolbar-shape-palette
**Date**: 2026-02-13

## Research Questions Resolved

### R1: How to add ephemeral state to session-state store

**Decision**: Add `drawingMode` to the `SpatialSlice` as an ephemeral field, excluded from persistence, undo tracking, and dirty tracking.

**Rationale**: The spatial slice already manages viewport and rotation — drawing mode is a spatial interaction concern. The session-state package has clear patterns for ephemeral fields: exclude from `UNDO_TRACKED_FIELDS`, exclude from `DIRTY_TRIGGER_FIELDS`, add to `EPHEMERAL_FIELDS`, and omit from `extractPersistentState()`.

**Alternatives considered**:
- New dedicated `DrawingSlice`: Rejected — too much ceremony for a single field. The slice pattern requires type file, creator file, composite type updates. Drawing mode fits naturally in spatial.
- React-only state (useState in toolbar): Rejected — state would not survive re-renders from unrelated store changes, and other components (MapView event handlers) need to read drawing mode.

### R2: Geoman shape type name mapping

**Decision**: Create a constant mapping between Debrief drawing mode strings and Geoman API shape names.

| Debrief `drawingMode` | Geoman `enableDraw()` | GeoJSON Output |
|------------------------|----------------------|----------------|
| `'point'` | `'Marker'` | `Point` |
| `'rectangle'` | `'Rectangle'` | `Polygon` (4 vertices) |
| `'polygon'` | `'Polygon'` | `Polygon` |
| `'polyline'` | `'Line'` | `LineString` |

**Rationale**: Geoman uses Leaflet-oriented names ('Marker', 'Line') while Debrief uses geometry-oriented names ('point', 'polyline'). A simple Record mapping isolates Geoman's naming from the application state model.

**Alternatives considered**:
- Use Geoman names directly in state: Rejected — leaks third-party library naming into application state. If Geoman is replaced, state model shouldn't need to change.
- Runtime conversion function: Rejected — unnecessary complexity; a constant mapping is simpler and type-safe.

### R3: Dropdown implementation approach

**Decision**: Render the shape palette dropdown as a Leaflet DOM element within the `ToolbarControl.render()` method, using the same `L.DomUtil.create()` pattern as existing buttons, with `L.DomEvent.disableClickPropagation()` to prevent map interaction.

**Rationale**: The LeafletToolbar is a vanilla Leaflet `L.Control` — it creates DOM elements directly, not via React. Adding a React-rendered dropdown (like the existing ContextMenu component) would require bridging between Leaflet's imperative DOM and React's declarative rendering. The toolbar already demonstrates the DOM creation pattern for buttons; extending it to a dropdown keeps the implementation consistent.

**Alternatives considered**:
- Reuse ContextMenu React component: Rejected — LeafletToolbar is not in React's render tree. Mounting a React component inside a Leaflet control requires `createRoot()` bridging, which adds complexity and fragility. The viewport boundary detection from ContextMenu is useful but can be implemented with simpler DOM position checks.
- Convert LeafletToolbar to a full React component: Rejected — major refactor out of scope for #093. The Leaflet control pattern works well and is used for toolbar positioning.

### R4: Escape key handling for drawing cancellation

**Decision**: Geoman handles Escape key natively and cancels drawing internally. However, Geoman does NOT fire any event when Escape is pressed — only `pm:create` fires on successful completion. The toolbar must listen for the `pm:drawend` event (fired when drawing mode is disabled for any reason) to update UI state.

**Rationale**: Geoman's internal Escape handling discards the in-progress shape and calls `disableDraw()` internally. The `pm:drawend` event fires whenever drawing mode exits (whether via Escape, completion, or programmatic disable). This is the reliable signal to reset toolbar UI.

**Alternatives considered**:
- Add custom `keydown` listener for Escape: Rejected as primary approach — Geoman already handles Escape. A keydown listener would double-handle the key. However, the toolbar does need `pm:drawend` to know drawing ended.
- Poll `map.pm.Draw.getActiveShape()`: Rejected — polling is fragile and non-reactive.

### R5: Dropdown positioning strategy

**Decision**: Position the dropdown to the right of the '+' button by default, with fallback to below or above if horizontal space is insufficient. Use `getBoundingClientRect()` on the button element and compare against viewport dimensions.

**Rationale**: The toolbar is positioned at the map's top-left corner by default. A dropdown extending to the right keeps it close to the trigger button without obscuring the toolbar. Simple viewport boundary detection covers the edge case of narrow panels.

**Alternatives considered**:
- Always below the button: Rejected — the toolbar is vertical, so "below" places the dropdown far from the trigger when there are multiple buttons above.
- CSS-only positioning with `overflow: visible`: Rejected — Leaflet controls have `overflow` restrictions that clip absolutely-positioned children. DOM positioning with explicit coordinates is needed.

### R6: Shape completion behavior

**Decision**: After a shape is drawn (signaled by `pm:create`), drawing mode automatically resets to null. The toolbar returns to its default state. The user must click '+' again to draw another shape.

**Rationale**: Single-shot drawing mode matches the interaction pattern where each shape is a deliberate action. This prevents accidental shape creation and aligns with the "+" button semantics (add one shape).

**Alternatives considered**:
- Persistent drawing mode (keep drawing until explicitly cancelled): Considered but deferred to #094/#095 which handle specific shape workflows. For the toolbar palette, single-shot is the safer default.

## Dependencies Confirmed

| Dependency | Version | Status |
|------------|---------|--------|
| `@geoman-io/leaflet-geoman-free` | ^2.19.2 | Installed by #092, confirmed in `shared/components/package.json` |
| `@debrief/session-state` (Zustand) | ^5.0.0 | Existing, confirmed slice patterns |
| `react-leaflet` | 4.2.x | Existing, provides `useMap()` |
| `leaflet` | 1.9.x | Existing, provides `L.Control`, `L.DomUtil`, `L.DomEvent` |

## Key Files to Modify

| File | Change |
|------|--------|
| `services/session-state/src/types/spatial.ts` | Add `DrawingMode` type and `drawingMode` field |
| `services/session-state/src/store/slices/spatial.ts` | Add `setDrawingMode` action |
| `services/session-state/src/store/middleware/partialize.ts` | Add to `EPHEMERAL_FIELDS` |
| `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.tsx` | Replace PoC with shape palette |
| `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.css` | Add dropdown styles |
| `shared/components/src/MapView/Geoman.stories.tsx` or new story file | Add DrawingToolbar story |
