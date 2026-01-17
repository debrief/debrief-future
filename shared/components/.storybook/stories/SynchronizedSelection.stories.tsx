import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { MapView } from '../../src/MapView';
import { Timeline } from '../../src/Timeline';
import { FeatureList } from '../../src/FeatureList';
import { ThemeProvider } from '../../src/ThemeProvider';
import { useSelection } from '../../src/hooks/useSelection';
import type { DebriefFeatureCollection } from '../../src/utils/types';
import type { TrackFeature } from '@debrief/schemas';

// Generate sample features
function generateFeatures(count: number): DebriefFeatureCollection {
  const trackTypes = ['OWNSHIP', 'CONTACT', 'REFERENCE', 'SOLUTION'] as const;
  const features: TrackFeature[] = [];

  for (let i = 0; i < count; i++) {
    const startLon = -5 + (i % 5) * 0.3;
    const startLat = 50 + Math.floor(i / 5) * 0.2;
    const numPoints = 5 + Math.floor(Math.random() * 5);

    const coordinates: number[][] = [];
    let lon = startLon;
    let lat = startLat;

    for (let j = 0; j < numPoints; j++) {
      coordinates.push([lon, lat]);
      lon += 0.1 + Math.random() * 0.1;
      lat += (Math.random() - 0.5) * 0.1;
    }

    const baseTime = new Date('2024-01-15T08:00:00Z');
    const startTime = new Date(baseTime.getTime() + i * 1800000); // 30min intervals
    const endTime = new Date(startTime.getTime() + 3600000 + Math.random() * 7200000); // 1-3 hours

    features.push({
      type: 'Feature',
      id: `track-${i.toString().padStart(3, '0')}`,
      geometry: {
        type: 'LineString',
        coordinates: coordinates as unknown as number[],
      },
      properties: {
        kind: 'TRACK',
        platform_id: `PLT-${i.toString().padStart(3, '0')}`,
        platform_name: `Vessel ${String.fromCharCode(65 + (i % 26))}${Math.floor(i / 26) || ''}`,
        track_type: trackTypes[i % 4]!,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        positions: [],
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

const sampleFeatures = generateFeatures(15);

// Wrapper component with synchronized selection
function SynchronizedComponents() {
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

  const selectAll = () => {
    setSelectedIds(new Set(sampleFeatures.features.map((f) => f.id)));
  };

  const clearAll = () => {
    setSelectedIds(new Set());
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Controls */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          padding: '12px 16px',
          backgroundColor: 'var(--debrief-bg-secondary, #f5f5f5)',
          borderRadius: 8,
        }}
      >
        <strong>Selection:</strong>
        <span>
          {selectedIds.size > 0
            ? `${selectedIds.size} feature${selectedIds.size !== 1 ? 's' : ''} selected`
            : 'None selected'}
        </span>
        <button onClick={selectAll} style={{ marginLeft: 'auto' }}>
          Select All
        </button>
        <button onClick={clearAll}>Clear</button>
      </div>

      {/* Main content grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 300px',
          gridTemplateRows: '400px 200px',
          gap: 16,
        }}
      >
        {/* Map (top left) */}
        <div style={{ gridRow: '1', gridColumn: '1' }}>
          <h4 style={{ margin: '0 0 8px' }}>Map View</h4>
          <MapView
            features={sampleFeatures}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onBackgroundClick={handleBackgroundClick}
            height={360}
          />
        </div>

        {/* Feature list (top right) */}
        <div style={{ gridRow: '1', gridColumn: '2' }}>
          <h4 style={{ margin: '0 0 8px' }}>Feature List</h4>
          <FeatureList
            features={sampleFeatures}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            height={360}
          />
        </div>

        {/* Timeline (bottom, full width) */}
        <div style={{ gridRow: '2', gridColumn: '1 / -1' }}>
          <h4 style={{ margin: '0 0 8px' }}>Timeline</h4>
          <Timeline
            features={sampleFeatures}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onBackgroundClick={handleBackgroundClick}
            height={160}
          />
        </div>
      </div>

      {/* Info panel */}
      {selectedIds.size > 0 && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--debrief-selection-bg, rgba(0, 102, 204, 0.1))',
            borderRadius: 8,
            borderLeft: '4px solid var(--debrief-color-primary, #0066cc)',
          }}
        >
          <strong>Selected Features:</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            {Array.from(selectedIds).map((id) => {
              const feature = sampleFeatures.features.find((f) => f.id === id);
              return (
                <li key={id}>
                  {feature?.properties.platform_name ?? id} (
                  {feature?.properties.track_type})
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// Using useSelection hook
function SynchronizedWithHook() {
  const selection = useSelection();

  const handleSelect = (id: string) => {
    selection.toggle(id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          padding: '12px 16px',
          backgroundColor: 'var(--debrief-bg-secondary, #f5f5f5)',
          borderRadius: 8,
        }}
      >
        <strong>Using useSelection hook:</strong> {selection.selectedIds.size} selected
        <button onClick={selection.clear} style={{ marginLeft: 16 }}>
          Clear
        </button>
        <button
          onClick={() =>
            selection.selectMultiple(sampleFeatures.features.map((f) => f.id))
          }
          style={{ marginLeft: 8 }}
        >
          Select All
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <MapView
          features={sampleFeatures}
          selectedIds={selection.selectedIds}
          onSelect={handleSelect}
          onBackgroundClick={selection.clear}
          height={400}
        />
        <FeatureList
          features={sampleFeatures}
          selectedIds={selection.selectedIds}
          onSelect={handleSelect}
          height={400}
        />
      </div>

      <Timeline
        features={sampleFeatures}
        selectedIds={selection.selectedIds}
        onSelect={handleSelect}
        onBackgroundClick={selection.clear}
        height={150}
      />
    </div>
  );
}

const meta: Meta = {
  title: 'Integration/Synchronized Selection',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
Demonstrates selection synchronization across MapView, Timeline, and FeatureList components.

**Key Features:**
- Click any feature in any component to select it
- Selection state is shared across all components
- Click again or use background click to deselect
- Supports multi-selection

**Usage Pattern:**
\`\`\`tsx
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

const handleSelect = (id: string) => {
  setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
};

<MapView features={data} selectedIds={selectedIds} onSelect={handleSelect} />
<Timeline features={data} selectedIds={selectedIds} onSelect={handleSelect} />
<FeatureList features={data} selectedIds={selectedIds} onSelect={handleSelect} />
\`\`\`

Or use the \`useSelection\` hook for easier state management:
\`\`\`tsx
const selection = useSelection();

<MapView features={data} selectedIds={selection.selectedIds} onSelect={(id) => selection.toggle(id)} />
\`\`\`
        `,
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

export const Default: StoryObj = {
  render: () => <SynchronizedComponents />,
  parameters: {
    docs: {
      description: {
        story:
          'Full integration example with MapView, Timeline, and FeatureList sharing selection state.',
      },
    },
  },
};

export const WithUseSelectionHook: StoryObj = {
  render: () => <SynchronizedWithHook />,
  parameters: {
    docs: {
      description: {
        story:
          'Same integration using the useSelection hook for simplified state management.',
      },
    },
  },
};

export const DarkTheme: StoryObj = {
  render: () => (
    <ThemeProvider theme={{ variant: 'dark' }}>
      <SynchronizedComponents />
    </ThemeProvider>
  ),
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'Synchronized selection with dark theme applied.',
      },
    },
  },
};
