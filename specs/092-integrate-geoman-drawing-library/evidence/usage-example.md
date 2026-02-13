# Usage Example: useGeoman Hook

## Basic: Load Geoman (dormant)

Geoman initializes on the map automatically when `MapView` is rendered. No action needed — `map.pm` is available on any Leaflet map instance.

## Show Geoman Toolbar

```tsx
import { useGeoman } from '@debrief/components/MapView';

function DrawingControls() {
  const { map } = useGeoman({
    addControls: true,
    controlOptions: {
      position: 'topleft',
      drawCircleMarker: false,
      drawText: false,
      drawCircle: false,
    },
  });

  return null; // Hook-only, no JSX
}

// Use inside a MapContainer:
<MapContainer center={[50.5, -4.5]} zoom={10}>
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  <DrawingControls />
</MapContainer>
```

## Programmatic Drawing

```tsx
import { useGeoman } from '@debrief/components/MapView';
import { useMap } from 'react-leaflet';

function ProgrammaticDrawing() {
  useGeoman(); // Load Geoman without toolbar
  const map = useMap();

  const startDrawing = () => {
    map.pm.enableDraw('Rectangle');
  };

  useEffect(() => {
    map.on('pm:create', (e) => {
      console.log('Shape created:', e.layer.toGeoJSON());
    });
  }, [map]);

  return <button onClick={startDrawing}>Draw Rectangle</button>;
}
```

## Proof-of-Concept: Temporary Rectangle Button

The LeafletToolbar now includes a temporary "Draw Rectangle" button (rectangle icon at the bottom of the zoom toolbar). Click it to enter rectangle drawing mode:

1. Click the rectangle icon in the map toolbar
2. Click and drag on the map to draw a rectangle
3. The rectangle appears on the map
4. The button de-activates after the rectangle is drawn

This button is marked `TEMPORARY: 092-proof-of-concept` and will be removed when #093 (drawing toolbar) lands.
