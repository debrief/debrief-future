import type { Meta, StoryObj } from '@storybook/react';
import { useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import { ThemeProvider } from '../ThemeProvider';
import { useGeoman } from './GeomanControl';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

/**
 * Wrapper component that initializes Geoman with the toolbar visible.
 * Logs pm:create events as GeoJSON to the onShapeCreated callback.
 */
function GeomanWithToolbar({
  onShapeCreated,
}: {
  onShapeCreated?: (geojson: object) => void;
}) {
  const { map } = useGeoman({
    addControls: true,
    controlOptions: {
      position: 'topleft',
      drawCircleMarker: false,
      drawText: false,
      drawCircle: false,
      cutPolygon: false,
      rotateMode: false,
    },
  });

  useEffect(() => {
    if (!onShapeCreated) return;
    const handler = (e: { layer: L.Layer }) => {
      if ('toGeoJSON' in e.layer && typeof e.layer.toGeoJSON === 'function') {
        onShapeCreated(e.layer.toGeoJSON());
      }
    };
    map.on('pm:create', handler);
    return () => {
      map.off('pm:create', handler);
    };
  }, [map, onShapeCreated]);

  return null;
}

/**
 * Wrapper component that demonstrates programmatic drawing via map.pm API.
 */
function GeomanProgrammatic({
  onShapeCreated,
}: {
  onShapeCreated?: (geojson: object) => void;
}) {
  useGeoman(); // Load Geoman without toolbar

  const map = useMap();

  useEffect(() => {
    if (!onShapeCreated) return;
    const handler = (e: { layer: L.Layer }) => {
      if ('toGeoJSON' in e.layer && typeof e.layer.toGeoJSON === 'function') {
        onShapeCreated(e.layer.toGeoJSON());
      }
    };
    map.on('pm:create', handler);
    return () => {
      map.off('pm:create', handler);
    };
  }, [map, onShapeCreated]);

  return null;
}

/**
 * Button overlay for programmatic drawing control.
 */
function DrawButton({
  label,
  shape,
}: {
  label: string;
  shape: string;
}) {
  const map = useMap();
  const [active, setActive] = useState(false);

  useEffect(() => {
    const handler = () => setActive(false);
    map.on('pm:create', handler);
    return () => {
      map.off('pm:create', handler);
    };
  }, [map]);

  const onClick = useCallback(() => {
    if (!map.pm) return;
    if (active) {
      map.pm.disableDraw();
      setActive(false);
    } else {
      map.pm.enableDraw(shape);
      setActive(true);
    }
  }, [map, shape, active]);

  return (
    <button
      onClick={onClick}
      style={{
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 1000,
        padding: '8px 16px',
        background: active ? '#0066cc' : '#fff',
        color: active ? '#fff' : '#333',
        border: '2px solid #0066cc',
        borderRadius: 4,
        cursor: 'pointer',
        fontWeight: 'bold',
      }}
    >
      {active ? `Drawing ${label}...` : `Draw ${label}`}
    </button>
  );
}

const meta: Meta = {
  title: 'Components/MapView/Geoman',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Geoman integration stories demonstrating drawing capabilities on the Leaflet map. Part of E05: Shape Drawing Tools.',
      },
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj;

/**
 * Full Geoman toolbar with polygon, rectangle, polyline, and marker drawing.
 * Click a tool in the left toolbar to start drawing.
 */
export const GeomanToolbar: Story = {
  render: function GeomanToolbarStory() {
    const [lastShape, setLastShape] = useState<object | null>(null);

    return (
      <div style={{ height: 500, position: 'relative' }}>
        <MapContainer
          center={[50.5, -4.5]}
          zoom={10}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <GeomanWithToolbar onShapeCreated={setLastShape} />
        </MapContainer>
        {lastShape && (
          <pre
            style={{
              position: 'absolute',
              bottom: 10,
              left: 10,
              right: 10,
              zIndex: 1000,
              background: 'rgba(0,0,0,0.8)',
              color: '#0f0',
              padding: 8,
              borderRadius: 4,
              fontSize: 11,
              maxHeight: 150,
              overflow: 'auto',
            }}
          >
            {JSON.stringify(lastShape, null, 2)}
          </pre>
        )}
      </div>
    );
  },
};

/**
 * Programmatic drawing via map.pm API — no Geoman toolbar visible.
 * Click the "Draw Polygon" button to enter drawing mode.
 */
export const Programmatic: Story = {
  render: function ProgrammaticStory() {
    const [lastShape, setLastShape] = useState<object | null>(null);

    return (
      <div style={{ height: 500, position: 'relative' }}>
        <MapContainer
          center={[50.5, -4.5]}
          zoom={10}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <GeomanProgrammatic onShapeCreated={setLastShape} />
          <DrawButton label="Polygon" shape="Polygon" />
        </MapContainer>
        {lastShape && (
          <pre
            style={{
              position: 'absolute',
              bottom: 10,
              left: 10,
              right: 10,
              zIndex: 1000,
              background: 'rgba(0,0,0,0.8)',
              color: '#0f0',
              padding: 8,
              borderRadius: 4,
              fontSize: 11,
              maxHeight: 150,
              overflow: 'auto',
            }}
          >
            {JSON.stringify(lastShape, null, 2)}
          </pre>
        )}
      </div>
    );
  },
};

/**
 * Geoman loaded but dormant — no toolbar, no drawing mode.
 * Map behaves identically to pre-Geoman state.
 * This story proves Geoman does not interfere with normal map interaction.
 */
export const Dormant: Story = {
  render: function DormantStory() {
    return (
      <div style={{ height: 500 }}>
        <MapContainer
          center={[50.5, -4.5]}
          zoom={10}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        </MapContainer>
      </div>
    );
  },
};
