# Usage Example: Drawing UX Guidance and STAC Persistence

## Drawing a Shape with Guidance, Palette Colour, and Provenance

### Step 1: Open the Shape Palette
Click the '+' button in the map toolbar. The shape palette dropdown appears.

### Step 2: Select a Shape Type
Click the polygon icon. Immediately:
- The guidance overlay appears at the bottom-centre: **"Click to add vertices, double-click to finish · Press Esc to cancel"**
- The cursor changes to a crosshair
- The '+' button is highlighted (active state)

### Step 3: Draw the Shape
Follow the guidance text. Click on the map to add polygon vertices, then double-click to finish.

### Step 4: Automatic Colour Assignment
The completed polygon receives a colour from the 8-colour palette:
- First shape: `#2196F3` (blue)
- Second shape: `#FF9800` (orange)
- Third shape: `#00BCD4` (teal)
- ...and so on, cycling after 8 shapes

### Step 5: Provenance Recorded
The drawn feature's properties include:
```json
{
  "kind": "POLY",
  "vertex_count": 4,
  "label": "Drawn Polygon",
  "style": {
    "fill": true,
    "fill_color": "#2196F3",
    "fill_opacity": 0.15,
    "stroke": true,
    "color": "#2196F3",
    "weight": 2,
    "opacity": 0.8
  },
  "provenance": [
    {
      "source": "user-drawn",
      "timestamp": "2026-02-14T17:30:00.000Z",
      "operator": "unknown",
      "action": "created"
    }
  ]
}
```

### Step 6: Guidance Disappears
After the shape is completed, the guidance overlay disappears and the cursor reverts to the default pointer.

## Code Integration

### In web-shell (App.tsx)
```typescript
const handleShapeCreated = useCallback((geojson, mode) => {
  const paletteIndex = store.getState().drawingPaletteIndex;
  const paletteOverrides = getPaletteStyleOverrides(mode, paletteIndex);
  const provenance = {
    source: 'user-drawn',
    timestamp: new Date().toISOString(),
    operator: 'unknown',
    action: 'created',
  };
  const feature = createDrawnFeature(geojson, mode, {
    ...paletteOverrides,
    provenance,
  });
  if (feature) {
    setDrawnFeatures(prev => [...prev, feature]);
    store.getState().incrementDrawingPaletteIndex();
  }
}, [store]);
```

### DrawingGuidanceOverlay in MapView
```tsx
<div className="debrief-mapview">
  <MapContainer>
    {/* ... map content ... */}
  </MapContainer>
  <DrawingGuidanceOverlay drawingMode={drawingMode ?? null} />
</div>
```

The overlay is positioned with `position: absolute; bottom: 28px; left: 50%; transform: translateX(-50%)` and uses `pointer-events: none` to avoid interfering with map interactions.
