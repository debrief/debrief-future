import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Timeline } from './Timeline';
import { ThemeProvider } from '../ThemeProvider';
import type { DebriefFeatureCollection, TimeExtent } from '../utils/types';
import type { TrackFeature } from '@debrief/schemas';

const meta: Meta<typeof Timeline> = {
  title: 'Components/Timeline',
  component: Timeline,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Timeline displays features on a time axis using HTML5 Canvas for efficient rendering. Supports selection, time range adjustment, and theming.',
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
type Story = StoryObj<typeof Timeline>;

// Generate sample tracks with realistic time data
function generateTracks(count: number, baseTime: number): TrackFeature[] {
  const tracks: TrackFeature[] = [];
  const trackTypes = ['OWNSHIP', 'CONTACT', 'REFERENCE', 'SOLUTION'] as const;

  for (let i = 0; i < count; i++) {
    const startOffset = Math.random() * 4 * 60 * 60 * 1000; // 0-4 hours
    const duration = (1 + Math.random() * 3) * 60 * 60 * 1000; // 1-4 hours

    tracks.push({
      type: 'Feature',
      id: `track-${i.toString().padStart(3, '0')}`,
      geometry: {
        type: 'LineString',
        coordinates: [[-5, 50], [-4, 51]] as unknown as number[],
      },
      properties: {
        kind: 'TRACK',
        platform_id: `PLT-${i.toString().padStart(3, '0')}`,
        platform_name: `Vessel ${i + 1}`,
        track_type: trackTypes[i % 4] ?? 'CONTACT',
        start_time: new Date(baseTime + startOffset).toISOString(),
        end_time: new Date(baseTime + startOffset + duration).toISOString(),
        positions: [],
      },
    });
  }

  return tracks;
}

const baseTime = Date.parse('2024-01-15T06:00:00Z');
const sampleTracks = generateTracks(5, baseTime);
const sampleData: DebriefFeatureCollection = {
  type: 'FeatureCollection',
  features: sampleTracks,
};

export const Default: Story = {
  args: {
    features: sampleData,
    height: 200,
  },
  parameters: {
    docs: {
      description: {
        story: 'Basic timeline with several tracks showing temporal spans.',
      },
    },
  },
};

// Interactive selection example
function SelectableTimelineExample() {
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
      <Timeline
        features={sampleData}
        selectedIds={selectedIds}
        onSelect={handleSelect}
        onBackgroundClick={handleBackgroundClick}
        height={250}
      />
    </div>
  );
}

export const WithSelection: Story = {
  render: () => <SelectableTimelineExample />,
  parameters: {
    docs: {
      description: {
        story: 'Click on bars to select them. Click background to clear selection.',
      },
    },
  },
};

// Overlapping tracks example
const overlappingTracks = generateTracks(8, baseTime);
overlappingTracks.forEach((track, i) => {
  // Make tracks overlap more
  const startOffset = (i * 0.5) * 60 * 60 * 1000;
  track.properties.start_time = new Date(baseTime + startOffset).toISOString();
  track.properties.end_time = new Date(baseTime + startOffset + 3 * 60 * 60 * 1000).toISOString();
});

export const Overlapping: Story = {
  args: {
    features: {
      type: 'FeatureCollection',
      features: overlappingTracks,
    },
    height: 300,
  },
  parameters: {
    docs: {
      description: {
        story: 'Timeline with overlapping time ranges. Each track gets its own row.',
      },
    },
  },
};

// Custom time range example
function TimeRangeExample() {
  const [timeExtent, setTimeExtent] = useState<TimeExtent>([
    baseTime,
    baseTime + 6 * 60 * 60 * 1000, // 6 hours
  ]);

  const expandRange = () => {
    setTimeExtent([
      baseTime - 2 * 60 * 60 * 1000,
      baseTime + 10 * 60 * 60 * 1000,
    ]);
  };

  const contractRange = () => {
    setTimeExtent([
      baseTime + 1 * 60 * 60 * 1000,
      baseTime + 4 * 60 * 60 * 1000,
    ]);
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <button onClick={expandRange} style={{ marginRight: 8 }}>
          Expand Range
        </button>
        <button onClick={contractRange}>Contract Range</button>
      </div>
      <Timeline features={sampleData} timeExtent={timeExtent} height={200} />
    </div>
  );
}

export const CustomTimeRange: Story = {
  render: () => <TimeRangeExample />,
  parameters: {
    docs: {
      description: {
        story: 'Timeline with custom time extent override. Use buttons to adjust visible range.',
      },
    },
  },
};

// Many tracks (performance test)
const manyTracks = generateTracks(50, baseTime);

export const ManyTracks: Story = {
  args: {
    features: {
      type: 'FeatureCollection',
      features: manyTracks,
    },
    height: 400,
  },
  parameters: {
    docs: {
      description: {
        story: 'Performance test with 50 tracks. Timeline should scroll smoothly.',
      },
    },
  },
};

// Empty state
export const Empty: Story = {
  args: {
    features: { type: 'FeatureCollection', features: [] },
    height: 200,
  },
  parameters: {
    docs: {
      description: {
        story: 'Timeline with no temporal data shows empty message.',
      },
    },
  },
};

// Custom bar height
export const CustomBarHeight: Story = {
  args: {
    features: sampleData,
    height: 300,
    barHeight: 36,
  },
  parameters: {
    docs: {
      description: {
        story: 'Timeline with larger bar height for better visibility.',
      },
    },
  },
};

// Dark theme
export const DarkTheme: Story = {
  render: () => (
    <ThemeProvider theme={{ variant: 'dark' }}>
      <Timeline features={sampleData} height={200} />
    </ThemeProvider>
  ),
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'Timeline with dark theme applied.',
      },
    },
  },
};
