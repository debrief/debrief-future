# API Contract: Drawing Persistence and Guidance

**Feature**: 096-drawing-ux-persistence
**Date**: 2026-02-14

## Component Contracts

### 1. DrawingGuidanceOverlay

**Type**: React component
**Location**: `shared/components/src/MapView/DrawingGuidanceOverlay/DrawingGuidanceOverlay.tsx`

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `drawingMode` | `DrawingMode` | Yes | — | Current drawing mode (null = hidden) |

#### Behaviour

- Renders nothing when `drawingMode` is `null`
- Renders guidance text overlay when `drawingMode` is non-null
- Text content derived from `DRAWING_GUIDANCE[drawingMode]`
- Positioned at bottom-centre of parent container
- Supports `data-testid="drawing-guidance-overlay"` for E2E testing
- Supports `role="status"` and `aria-live="polite"` for accessibility

#### Example

```tsx
<DrawingGuidanceOverlay drawingMode="polygon" />
// Renders: "Click to add vertices, double-click to finish · Press Esc to cancel"
```

---

### 2. drawingGuidance Constants

**Type**: TypeScript module
**Location**: `shared/components/src/MapView/drawing/drawingGuidance.ts`

#### Exports

```typescript
interface GuidanceText {
  instruction: string;
  cancelHint: string;
}

const DRAWING_GUIDANCE: Record<Exclude<DrawingMode, null>, GuidanceText>;
const CANCEL_HINT: string;  // "Press Esc to cancel"
```

#### Values

| Mode | instruction | cancelHint |
|------|------------|------------|
| `'point'` | `"Click to place point"` | `"Press Esc to cancel"` |
| `'rectangle'` | `"Click and drag to draw rectangle"` | `"Press Esc to cancel"` |
| `'polygon'` | `"Click to add vertices, double-click to finish"` | `"Press Esc to cancel"` |
| `'polyline'` | `"Click to add vertices, double-click to finish"` | `"Press Esc to cancel"` |

---

### 3. drawingPalette Module

**Type**: TypeScript module
**Location**: `shared/components/src/MapView/drawing/drawingPalette.ts`

#### Exports

```typescript
/** The 8 palette colours in assignment order */
const DRAWING_PALETTE: readonly string[];

/** Get the colour at a given index (wraps around palette length) */
function getPaletteColour(index: number): string;

/** Get palette-derived style overrides for a given mode and palette index */
function getPaletteStyleOverrides(
  mode: DrawingMode,
  paletteIndex: number
): Partial<CreateDrawnFeatureOptions>;
```

#### Behaviour

- `getPaletteColour(index)` returns `DRAWING_PALETTE[index % DRAWING_PALETTE.length]`
- `getPaletteStyleOverrides(mode, index)` returns the appropriate style key (e.g., `pointStyle`, `rectangleStyle`) with `color` and `fill_color` set from the palette
- Palette is a constant array of 8 hex colour strings

---

### 4. createDrawnFeature (extended)

**Type**: Pure function (existing, extended)
**Location**: `shared/components/src/MapView/drawing/createDrawnFeature.ts`

#### Extended Options

```typescript
interface CreateDrawnFeatureOptions {
  // Existing fields...
  pointStyle?: Partial<PointProperties>;
  rectangleStyle?: Partial<PolygonProperties>;
  polygonStyle?: Partial<PolygonProperties>;
  polylineStyle?: Partial<LineProperties>;
  name?: string;
  label?: string;

  // NEW: Provenance metadata
  provenance?: {
    source: string;
    timestamp: string;
    operator: string;
    action: string;
  };
}
```

#### Behaviour Change

- When `options.provenance` is provided, the created feature includes `properties.provenance: [options.provenance]`
- The function remains pure — provenance data is passed in, not generated internally

---

### 5. Spatial Slice Extension

**Type**: Zustand store slice (existing, extended)
**Location**: `services/session-state/src/store/slices/spatial.ts`

#### New Fields

```typescript
interface SpatialSlice {
  // Existing...
  drawingMode: DrawingMode;

  // NEW
  drawingPaletteIndex: number;
}

interface SpatialActions {
  // Existing...
  setDrawingMode: (mode: DrawingMode) => void;

  // NEW
  incrementDrawingPaletteIndex: () => void;
}
```

#### Behaviour

- `drawingPaletteIndex` initialises to `0`
- `incrementDrawingPaletteIndex()` increments by 1
- `drawingPaletteIndex` is ephemeral (not included in session persistence/serialisation)

---

### 6. stacService.addDrawnFeature (new convenience method)

**Type**: Async method on StacService class
**Location**: `apps/vscode/src/services/stacService.ts`

#### Signature

```typescript
async addDrawnFeature(
  storePath: string,
  itemPath: string,
  feature: SafeFeature,
  provenance: { source: string; timestamp: string; operator: string; action: string }
): Promise<void>
```

#### Behaviour

1. Calls `this.addFeatures(storePath, itemPath, [feature])` to persist the feature
2. Calls `this.appendProvenance(storePath, itemPath, [{ featureId: feature.id, entry: provenance }])` to record provenance
3. If either call fails, throws the error (caller handles notification)

#### Error Handling

- Propagates errors to the caller
- Caller (`handleShapeCreated`) is responsible for catching and displaying the notification

---

### 7. LeafletToolbar Cursor Management (extended)

**Type**: Component extension (existing)
**Location**: `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.tsx`

#### Behaviour Change

When `drawingMode` transitions:
- From `null` to any mode: add class `debrief-drawing-active` to the `.leaflet-container` element
- From any mode to `null`: remove class `debrief-drawing-active`

#### CSS Rule

```css
.leaflet-container.debrief-drawing-active {
  cursor: crosshair;
}
```

---

## Event Flow

### Shape Creation with Persistence

```
User completes drawing gesture
         │
         ▼
LeafletToolbar fires onShapeCreated(geojson, mode)
         │
         ▼
App/mapView handleShapeCreated callback:
  1. Get palette colour: getPaletteStyleOverrides(mode, store.drawingPaletteIndex)
  2. Build provenance: { source: "user-drawn", timestamp: new Date().toISOString(), operator, action: "created" }
  3. Call createDrawnFeature(geojson, mode, { ...paletteOverrides, provenance })
  4. Add feature to session state (drawnFeatures)
  5. Increment palette index: store.incrementDrawingPaletteIndex()
  6. Select new feature: store.setSelection([feature.id])
  7. Persist: stacService.addDrawnFeature(storePath, itemPath, feature, provenance)
  8. On error: setLogNotification("Failed to save shape...")
```

### Drawing Mode Change with Guidance

```
User selects shape from palette (or presses Esc)
         │
         ▼
LeafletToolbar fires onDrawingModeChange(mode)
         │
         ▼
App/mapView updates store: store.setDrawingMode(mode)
         │
         ├──► DrawingGuidanceOverlay re-renders with new mode
         │    (shows/hides/updates guidance text)
         │
         └──► LeafletToolbar adds/removes crosshair class on map container
```

## Integration Points

| Component | Consumes | Produces |
|-----------|----------|----------|
| DrawingGuidanceOverlay | `drawingMode` from store | Rendered guidance text (UI only) |
| drawingPalette | `drawingPaletteIndex` from store | Style overrides for `createDrawnFeature()` |
| createDrawnFeature | GeoJSON, mode, options (with provenance + palette) | Schema-compliant feature with provenance |
| handleShapeCreated | Shape created event, store state | Persisted feature, updated session, notification |
| stacService.addDrawnFeature | Feature, provenance data | Persisted STAC Item + GeoJSON |
| LeafletToolbar | `drawingMode` from parent | Crosshair cursor class on map container |
