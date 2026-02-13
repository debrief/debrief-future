# Quickstart: Drawing Toolbar with Shape Palette

**Feature**: 093-drawing-toolbar-shape-palette
**Date**: 2026-02-13

## What This Feature Does

Adds a '+' button to the map toolbar that opens a shape palette dropdown. Selecting a shape (Point, Rectangle, Polygon, Polyline) activates drawing mode on the map via Geoman. Drawing mode is tracked in session state and can be cancelled via Escape or clicking '+' again.

## Prerequisites

- Feature #092 (Geoman integration) must be complete — `@geoman-io/leaflet-geoman-free` installed and `useGeoman` hook available
- `@debrief/session-state` package with Zustand store
- `shared/components` MapView with LeafletToolbar

## Implementation Order

### 1. Session State: Add DrawingMode (services/session-state)

1. Define `DrawingMode` type in `src/types/spatial.ts`
2. Add `drawingMode: DrawingMode` to `SpatialSlice` interface
3. Add `setDrawingMode` to `SpatialActions` interface
4. Update `DEFAULT_SPATIAL_SLICE` with `drawingMode: null`
5. Implement `setDrawingMode` in `src/store/slices/spatial.ts`
6. Add `'drawingMode'` to `EPHEMERAL_FIELDS` in `src/store/middleware/partialize.ts`
7. Verify NOT in `UNDO_TRACKED_FIELDS` or `DIRTY_TRIGGER_FIELDS`
8. Add unit tests for ephemeral behavior

### 2. Toolbar UI: Shape Palette (shared/components)

1. Remove all `// TEMPORARY: 092-proof-of-concept` code from `LeafletToolbar.tsx`
2. Add `GEOMAN_SHAPE_MAP` constant and `SHAPE_PALETTE_ITEMS` config
3. Create '+' button using existing `createButton()` pattern
4. Implement dropdown DOM creation with `L.DomUtil.create()`
5. Wire dropdown item clicks to `onDrawingModeChange` callback
6. Handle '+' button click: open dropdown (if idle) or cancel drawing (if active)
7. Add `pm:create` and `pm:drawend` event listeners to reset state
8. Add CSS for dropdown (`.debrief-shape-palette` classes)
9. Add `L.DomEvent.disableClickPropagation()` on dropdown container

### 3. MapView Integration (shared/components)

1. Pass `drawingMode` and `onDrawingModeChange` props through MapView to LeafletToolbar
2. Connect to session state store in MapView

### 4. Storybook Stories (shared/components)

1. Create DrawingToolbar story showing full interaction
2. Create DrawingToolbarActive story showing active state

### 5. Tests

1. Session state unit tests: drawingMode CRUD, ephemeral verification
2. LeafletToolbar unit tests: button rendering, dropdown toggle, active state
3. Integration: verify drawing mode → Geoman API activation

## Key Files

| File | Action |
|------|--------|
| `services/session-state/src/types/spatial.ts` | Add DrawingMode type |
| `services/session-state/src/store/slices/spatial.ts` | Add setDrawingMode |
| `services/session-state/src/store/middleware/partialize.ts` | Register ephemeral |
| `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.tsx` | Replace PoC, add palette |
| `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.css` | Add dropdown styles |
| `shared/components/src/MapView/MapView.tsx` | Wire new props |

## Verification

```bash
# Run session-state tests
cd services/session-state && npm test

# Run shared-components tests
cd shared/components && npm test

# Run Storybook
cd shared/components && npm run storybook

# Build VS Code extension (verify bundling)
cd apps/vscode && npm run compile
```
