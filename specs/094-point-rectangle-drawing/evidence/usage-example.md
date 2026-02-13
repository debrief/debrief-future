# Usage Example: Point & Rectangle Drawing (Feature 094)

## Core API: `createDrawnFeature()`

The drawing module exposes a pure factory function that converts raw Geoman GeoJSON output into schema-compliant Debrief features.

### Basic Usage

```typescript
import { createDrawnFeature } from '@debrief/components/src/MapView/drawing';

// Raw GeoJSON from Geoman's pm:create event
const rawPointGeoJSON: GeoJSON.Feature = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'Point',
    coordinates: [-4.1, 50.4],
  },
};

// Convert to schema-compliant ReferenceLocation
const pointFeature = createDrawnFeature(rawPointGeoJSON, 'point');
// Returns:
// {
//   type: 'Feature',
//   id: 'a1b2c3d4-...',              // UUID
//   geometry: { type: 'Point', coordinates: [-4.1, 50.4] },
//   properties: {
//     kind: 'POINT',
//     name: 'Drawn Point',
//     location_type: 'REFERENCE',
//     style: {
//       shape: 'circle', radius: 6,
//       fill: true, fill_color: '#4CAF50', fill_opacity: 0.7,
//       stroke: true, color: '#388E3C', weight: 2, opacity: 1.0,
//     },
//   },
// }
```

### Rectangle Usage

```typescript
const rawRectGeoJSON: GeoJSON.Feature = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [-4.2, 50.3], [-4.0, 50.3], [-4.0, 50.5], [-4.2, 50.5], [-4.2, 50.3],
    ]],
  },
};

const rectFeature = createDrawnFeature(rawRectGeoJSON, 'rectangle');
// Returns:
// {
//   type: 'Feature',
//   id: 'e5f6g7h8-...',              // UUID
//   geometry: { type: 'Polygon', coordinates: [[...closed ring...]] },
//   properties: {
//     kind: 'RECTANGLE',
//     label: 'Drawn Rectangle',
//     style: {
//       fill: true, fill_color: '#2196F3', fill_opacity: 0.15,
//       stroke: true, color: '#1976D2', weight: 2, opacity: 0.8,
//     },
//   },
// }
```

### Custom Styling & Naming

```typescript
const customFeature = createDrawnFeature(rawPointGeoJSON, 'point', {
  name: 'Observation Post Alpha',
  pointStyle: { fill_color: '#FF5722', color: '#E64A19' },
});
// Merges custom style with defaults
```

### Geometry Validation

```typescript
import { isValidDrawnGeometry } from '@debrief/components/src/MapView/drawing';

// Zero-area rectangles are rejected
const degenerateRect: GeoJSON.Feature = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [-4.1, 50.4], [-4.1, 50.4], [-4.1, 50.4], [-4.1, 50.4], [-4.1, 50.4],
    ]],
  },
};

isValidDrawnGeometry(degenerateRect, 'rectangle'); // false
createDrawnFeature(degenerateRect, 'rectangle');    // null (silently discarded)
```

## Integration: MapView Component

```tsx
import { MapView } from '@debrief/components';
import { createDrawnFeature } from '@debrief/components/src/MapView/drawing';
import type { DrawingMode } from '@debrief/components/src/MapView/LeafletToolbar';

function MyMap() {
  const [features, setFeatures] = useState<DebriefFeature[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawingMode, setDrawingMode] = useState<DrawingMode>(null);

  const handleShapeCreated = useCallback(
    (geojson: GeoJSON.Feature, mode: DrawingMode) => {
      const feature = createDrawnFeature(geojson, mode);
      if (feature) {
        setFeatures(prev => [...prev, feature as DebriefFeature]);
        setSelectedIds(new Set([feature.id])); // Auto-select
      }
    },
    [],
  );

  return (
    <MapView
      features={features}
      selectedIds={selectedIds}
      drawingMode={drawingMode}
      onDrawingModeChange={setDrawingMode}
      onShapeCreated={handleShapeCreated}
    />
  );
}
```

## Storybook Demo

The interactive demo is at: `Components/MapView/Drawing > PointAndRectangle`

1. Click the **+** button in the toolbar to open the shape palette
2. Select **Point** — click on the map to place a green point marker
3. Select **Rectangle** — click two corners to draw a blue rectangle
4. Each drawn feature appears in the feature list below the map
5. Click the **JSON inspector** to see the raw schema-compliant output
