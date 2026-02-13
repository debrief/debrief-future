# Contract: Session State — Drawing Mode API

**Feature**: 093-drawing-toolbar-shape-palette
**Date**: 2026-02-13

## Type Definitions

### DrawingMode

```typescript
/**
 * Active shape drawing mode. null = no drawing active.
 * Maps to Geoman API shape types via GEOMAN_SHAPE_MAP.
 */
export type DrawingMode = 'point' | 'rectangle' | 'polygon' | 'polyline' | null;
```

### SpatialSlice Extension

```typescript
export interface SpatialSlice {
  viewport: ViewportPolygon | null;
  rotation: number;
  drawingMode: DrawingMode;  // NEW — ephemeral, default: null
}
```

### SpatialActions Extension

```typescript
export interface SpatialActions {
  setViewport: (viewport: ViewportPolygon | null) => void;
  setRotation: (rotation: number) => void;
  getCenter: () => Coordinate | null;
  setDrawingMode: (mode: DrawingMode) => void;  // NEW
}
```

## Store Access Pattern

```typescript
// Read drawing mode
const drawingMode = useSessionStore((s) => s.drawingMode);

// Set drawing mode
const setDrawingMode = useSessionStore((s) => s.setDrawingMode);
setDrawingMode('rectangle');  // Activate rectangle drawing
setDrawingMode(null);         // Cancel drawing

// In non-React context
const store = getSessionStore();
store.getState().setDrawingMode('polygon');
```

## Ephemeral Behavior Contract

| Behavior | Expectation |
|----------|------------|
| Undo/redo | `drawingMode` changes do NOT create undo history |
| Dirty tracking | `drawingMode` changes do NOT mark document as dirty |
| Persistence | `drawingMode` is NOT saved in session files |
| Reset | `drawingMode` resets to `null` on `reset()` |
| Document switch | `drawingMode` resets to `null` |

## Geoman Shape Mapping Contract

```typescript
/**
 * Maps Debrief DrawingMode values to Geoman enableDraw() shape names.
 */
export const GEOMAN_SHAPE_MAP: Record<Exclude<DrawingMode, null>, string> = {
  point: 'Marker',
  rectangle: 'Rectangle',
  polygon: 'Polygon',
  polyline: 'Line',
};
```
