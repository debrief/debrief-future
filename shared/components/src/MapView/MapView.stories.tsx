import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { MapView } from './MapView';
import { ThemeProvider } from '../ThemeProvider';
import type { DebriefFeatureCollection } from '../utils/types';
import type { TrackFeature, ReferenceLocation } from '@debrief/schemas';

const meta: Meta<typeof MapView> = {
  title: 'Components/MapView',
  component: MapView,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'MapView displays GeoJSON features on an interactive Leaflet map. Supports tracks, reference locations, selection, and theming.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MapView>;

// Sample track feature
const sampleTrack: TrackFeature = {
  type: 'Feature',
  id: 'track-001',
  geometry: {
    type: 'LineString',
    coordinates: [
      [-5.0, 50.0],
      [-4.8, 50.2],
      [-4.5, 50.5],
      [-4.2, 50.7],
      [-4.0, 51.0],
    ] as unknown as number[],
  },
  properties: {
    kind: 'TRACK',
    platform_id: 'PLT-001',
    platform_name: 'HMS Defender',
    track_type: 'OWNSHIP',
    start_time: '2024-01-15T08:00:00Z',
    end_time: '2024-01-15T12:00:00Z',
    positions: [],
    color: '#0066cc',
  },
};

const contactTrack: TrackFeature = {
  type: 'Feature',
  id: 'track-002',
  geometry: {
    type: 'LineString',
    coordinates: [
      [-4.8, 50.8],
      [-4.6, 50.6],
      [-4.4, 50.4],
      [-4.2, 50.3],
    ] as unknown as number[],
  },
  properties: {
    kind: 'TRACK',
    platform_id: 'PLT-002',
    platform_name: 'Contact Alpha',
    track_type: 'CONTACT',
    start_time: '2024-01-15T09:00:00Z',
    end_time: '2024-01-15T11:00:00Z',
    positions: [],
  },
};

const waypoint: ReferenceLocation = {
  type: 'Feature',
  id: 'ref-001',
  geometry: {
    type: 'Point',
    coordinates: [-4.3, 50.6] as unknown as number[],
  },
  properties: {
    kind: 'POINT',
    name: 'Waypoint Alpha',
    location_type: 'WAYPOINT',
    description: 'Navigation checkpoint',
  },
};

const dangerArea: ReferenceLocation = {
  type: 'Feature',
  id: 'ref-002',
  geometry: {
    type: 'Point',
    coordinates: [-4.7, 50.3] as unknown as number[],
  },
  properties: {
    kind: 'POINT',
    name: 'Danger Zone',
    location_type: 'DANGER_AREA',
    description: 'Restricted area',
  },
};

const sampleData: DebriefFeatureCollection = {
  type: 'FeatureCollection',
  features: [sampleTrack, contactTrack, waypoint, dangerArea],
};

export const Default: Story = {
  args: {
    features: sampleData,
    height: 500,
  },
  parameters: {
    docs: {
      description: {
        story: 'Basic map displaying tracks and reference locations.',
      },
    },
  },
};

// Interactive selection example
function SelectableMapExample() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBackgroundClick = () => {
    setSelectedIds(new Set());
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <strong>Selected:</strong>{' '}
        {selectedIds.size > 0 ? Array.from(selectedIds).join(', ') : 'None'}
      </div>
      <MapView
        features={sampleData}
        selectedIds={selectedIds}
        onSelect={handleSelect}
        onBackgroundClick={handleBackgroundClick}
        height={500}
      />
    </div>
  );
}

export const WithSelection: Story = {
  render: () => <SelectableMapExample />,
  parameters: {
    docs: {
      description: {
        story: 'Click on features to select them. Click background to clear selection.',
      },
    },
  },
};

// Generate large dataset
function generateLargeDataset(count: number): DebriefFeatureCollection {
  const features: (TrackFeature | ReferenceLocation)[] = [];

  for (let i = 0; i < count; i++) {
    const startLon = -6 + Math.random() * 4;
    const startLat = 49 + Math.random() * 4;
    const numPoints = 5 + Math.floor(Math.random() * 10);

    const coordinates: number[][] = [];
    let lon = startLon;
    let lat = startLat;

    for (let j = 0; j < numPoints; j++) {
      coordinates.push([lon, lat]);
      lon += (Math.random() - 0.5) * 0.2;
      lat += (Math.random() - 0.5) * 0.2;
    }

    features.push({
      type: 'Feature',
      id: `track-${i.toString().padStart(4, '0')}`,
      geometry: {
        type: 'LineString',
        coordinates: coordinates as unknown as number[],
      },
      properties: {
        kind: 'TRACK',
        platform_id: `PLT-${i.toString().padStart(4, '0')}`,
        platform_name: `Vessel ${i + 1}`,
        track_type: i % 4 === 0 ? 'OWNSHIP' : i % 4 === 1 ? 'CONTACT' : i % 4 === 2 ? 'REFERENCE' : 'SOLUTION',
        start_time: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        end_time: new Date().toISOString(),
        positions: [],
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

const largeDataset = generateLargeDataset(100);

export const LargeDataset: Story = {
  args: {
    features: largeDataset,
    height: 500,
  },
  parameters: {
    docs: {
      description: {
        story: 'Performance test with 100 tracks. Map should remain responsive.',
      },
    },
  },
};

export const Empty: Story = {
  args: {
    features: { type: 'FeatureCollection', features: [] },
    height: 400,
    autoFitBounds: false,
    initialCenter: [51.5, -0.1],
    initialZoom: 8,
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty map with no features. Shows base tile layer only.',
      },
    },
  },
};

export const SingleTrack: Story = {
  args: {
    features: [sampleTrack],
    height: 400,
  },
  parameters: {
    docs: {
      description: {
        story: 'Single track feature auto-fitted to bounds.',
      },
    },
  },
};

export const CustomTileLayer: Story = {
  args: {
    features: sampleData,
    height: 500,
    tileLayerUrl: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    tileLayerAttribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  parameters: {
    docs: {
      description: {
        story: 'Map using a custom tile layer (CartoDB Light).',
      },
    },
  },
};

export const DarkTheme: Story = {
  render: () => (
    <ThemeProvider theme={{ variant: 'dark' }}>
      <MapView features={sampleData} height={500} />
    </ThemeProvider>
  ),
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'Map with dark theme applied.',
      },
    },
  },
};

// Multi-select example with Ctrl/Cmd support
function MultiSelectMapExample() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSelect = (id: string, event: React.MouseEvent) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);

      // Multi-select with Ctrl/Cmd key
      if (event.ctrlKey || event.metaKey) {
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
      } else {
        // Single select - clear others
        next.clear();
        next.add(id);
      }
      return next;
    });
  };

  const handleBackgroundClick = () => {
    setSelectedIds(new Set());
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <strong>Selected ({selectedIds.size}):</strong>{' '}
        {selectedIds.size > 0 ? Array.from(selectedIds).join(', ') : 'None'}
        <br />
        <small>Hold Ctrl/Cmd to multi-select. Click background to clear.</small>
      </div>
      <MapView
        features={sampleData}
        selectedIds={selectedIds}
        onSelect={handleSelect}
        onBackgroundClick={handleBackgroundClick}
        height={500}
      />
    </div>
  );
}

export const MultiSelect: Story = {
  render: () => <MultiSelectMapExample />,
  parameters: {
    docs: {
      description: {
        story: 'Multi-select features using Ctrl/Cmd+Click. Single click selects only that feature.',
      },
    },
  },
};

export const FiveLineExample: Story = {
  render: () => {
    // SC-001: Display a map with 5 or fewer lines of code
    return (
      <MapView
        features={sampleData}
        onSelect={(id) => console.log('Selected:', id)}
      />
    );
  },
  parameters: {
    docs: {
      description: {
        story: `
**Success Criteria SC-001**: Display a map with track features using 5 or fewer lines of code.

\`\`\`tsx
import { MapView } from '@debrief/components/MapView';

<MapView
  features={plotData}
  onSelect={(id) => console.log('Selected:', id)}
/>
\`\`\`
        `,
      },
    },
  },
};
