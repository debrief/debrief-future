# Usage Example: 095 — Polygon and Polyline Drawing

## Drawing a Polygon

```typescript
import { createDrawnFeature } from '@debrief/components';

// Geoman outputs a GeoJSON Feature when the user completes a polygon
const geomanOutput: GeoJSON.Feature = {
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [-4.15, 50.40], [-4.08, 50.42],
      [-4.05, 50.38], [-4.10, 50.35],
      [-4.15, 50.40],  // closure point
    ]],
  },
  properties: {},
};

const polygon = createDrawnFeature(geomanOutput, 'polygon', {
  label: 'Exclusion Zone Alpha',
});

// Result: PolyAnnotation
// {
//   type: 'Feature',
//   id: 'a1b2c3d4-...',
//   geometry: { type: 'Polygon', coordinates: [[[...], ...]] },
//   properties: {
//     kind: 'POLY',
//     vertex_count: 4,
//     label: 'Exclusion Zone Alpha',
//     style: {
//       fill: true,
//       fill_color: '#FF9800',
//       fill_opacity: 0.15,
//       stroke: true,
//       color: '#E65100',
//       weight: 2,
//       opacity: 0.8
//     }
//   }
// }
```

## Drawing a Polyline

```typescript
// Geoman outputs a GeoJSON Feature when the user completes a polyline
const geomanLineOutput: GeoJSON.Feature = {
  type: 'Feature',
  geometry: {
    type: 'LineString',
    coordinates: [
      [-4.20, 50.35], [-4.10, 50.38],
      [-4.00, 50.36], [-3.90, 50.40],
    ],
  },
  properties: {},
};

const polyline = createDrawnFeature(geomanLineOutput, 'polyline', {
  label: 'Patrol Route Bravo',
});

// Result: LineAnnotation
// {
//   type: 'Feature',
//   id: 'e5f6g7h8-...',
//   geometry: { type: 'LineString', coordinates: [[-4.20, 50.35], ...] },
//   properties: {
//     kind: 'LINE',
//     label: 'Patrol Route Bravo',
//     style: {
//       stroke: true,
//       color: '#00BCD4',
//       weight: 3,
//       opacity: 0.9
//     }
//   }
// }
```

## Validation

```typescript
import { isValidDrawnGeometry } from '@debrief/components';

// Valid polygon (3+ unique vertices with closure)
isValidDrawnGeometry(triangleFeature, 'polygon');  // true

// Invalid polygon (only 2 unique vertices)
isValidDrawnGeometry(degenerateFeature, 'polygon');  // false

// Valid polyline (2+ vertices)
isValidDrawnGeometry(twoPointLine, 'polyline');  // true

// Invalid polyline (1 vertex)
isValidDrawnGeometry(singlePoint, 'polyline');  // false
```

## VS Code Integration

When drawing in the VS Code webview:

1. User clicks '+' in the toolbar and selects "Polygon" or "Polyline"
2. User places vertices by clicking on the map
3. User double-clicks to complete the shape
4. A prompt appears:
   - Polygon: "Name this polygon:" (default: "Drawn Polygon")
   - Polyline: "Name this path:" (default: "Drawn Path")
5. The feature is created, added to the collection, and auto-selected
6. The extension receives a `featureDrawn` message with the full feature data
