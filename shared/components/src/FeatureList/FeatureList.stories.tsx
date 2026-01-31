import type { Meta, StoryObj } from '@storybook/react';
import { useState, useMemo } from 'react';
import { FeatureList } from './FeatureList';
import { LayersToolbar } from '../LayersToolbar';
import { DEFAULT_FILTER_STATE, isFilterActive } from '../LayersToolbar';
import type { FilterState } from '../LayersToolbar';
import { ToolMatchService, createSelectionFromCounts } from '../ToolMatch';
import { ThemeProvider } from '../ThemeProvider';
import type { DebriefFeature, DebriefFeatureCollection } from '../utils/types';
import type { TrackFeature, ReferenceLocation } from '@debrief/schemas';
import { sampleSourceFiles, sampleResultFiles } from '../LayersToolbar/fixtures/files';
import { sampleToolsWithCategories as sampleTools } from '../LayersToolbar/fixtures/tools';

const meta: Meta<typeof FeatureList> = {
  title: 'Components/FeatureList',
  component: FeatureList,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'FeatureList displays a virtualized scrollable list of features with selection support. Uses @tanstack/react-virtual for efficient rendering of large datasets.',
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
type Story = StoryObj<typeof FeatureList>;

// Generate sample tracks
function generateTracks(count: number): TrackFeature[] {
  const trackTypes = ['OWNSHIP', 'CONTACT', 'REFERENCE', 'SOLUTION'] as const;
  const platforms = [
    'HMS Victory',
    'USS Constitution',
    'Contact Alpha',
    'Contact Bravo',
    'Reference Point',
    'Solution Track',
    'Unknown Vessel',
    'Patrol Boat',
  ];

  return Array.from({ length: count }, (_, i) => ({
    type: 'Feature' as const,
    id: `track-${i.toString().padStart(3, '0')}`,
    geometry: {
      type: 'LineString' as const,
      coordinates: [[-5 + i * 0.1, 50], [-4 + i * 0.1, 51]] as unknown as number[],
    },
    properties: {
      kind: 'TRACK' as const,
      platform_id: `PLT-${i.toString().padStart(3, '0')}`,
      platform_name: `${platforms[i % platforms.length]} ${Math.floor(i / platforms.length) || ''}`.trim(),
      track_type: trackTypes[i % 4] ?? 'CONTACT',
      start_time: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      end_time: new Date(Date.now() + Math.random() * 86400000).toISOString(),
      positions: [],
    },
  }));
}

// Generate reference locations
function generateLocations(count: number): ReferenceLocation[] {
  const locationTypes = ['WAYPOINT', 'REFERENCE'] as const;
  const names = [
    'Alpha Point',
    'Bravo Marker',
    'Charlie Station',
    'Delta Buoy',
    'Echo Reference',
    'Foxtrot Position',
  ];

  return Array.from({ length: count }, (_, i) => ({
    type: 'Feature' as const,
    id: `ref-${i.toString().padStart(3, '0')}`,
    geometry: {
      type: 'Point' as const,
      coordinates: [-3 + i * 0.1, 52 + i * 0.05] as unknown as number[],
    },
    properties: {
      kind: 'POINT' as const,
      name: `${names[i % names.length]} ${Math.floor(i / names.length) || ''}`.trim(),
      location_type: locationTypes[i % 2] ?? 'WAYPOINT',
      valid_from: '2024-01-15T00:00:00Z',
      valid_until: '2024-01-15T23:59:59Z',
    },
  }));
}

const sampleTracks = generateTracks(5);
const sampleLocations = generateLocations(3);
const sampleData: DebriefFeatureCollection = {
  type: 'FeatureCollection',
  features: [...sampleTracks, ...sampleLocations],
};

export const Default: Story = {
  args: {
    features: sampleData,
    height: 300,
  },
  parameters: {
    docs: {
      description: {
        story: 'Basic feature list showing tracks and reference locations.',
      },
    },
  },
};

// Interactive selection example
function SelectableListExample() {
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

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <strong>Selected:</strong>{' '}
        {selectedIds.size > 0 ? Array.from(selectedIds).join(', ') : 'None'}
        {selectedIds.size > 0 && (
          <button
            onClick={() => setSelectedIds(new Set())}
            style={{ marginLeft: 12 }}
          >
            Clear
          </button>
        )}
      </div>
      <FeatureList
        features={sampleData}
        selectedIds={selectedIds}
        onSelect={handleSelect}
        height={350}
      />
    </div>
  );
}

export const WithSelection: Story = {
  render: () => <SelectableListExample />,
  parameters: {
    docs: {
      description: {
        story: 'Click on rows to select them. Click again to deselect.',
      },
    },
  },
};

// Many features (virtualization demo)
const manyFeatures = generateTracks(1000);

export const ManyFeatures: Story = {
  args: {
    features: {
      type: 'FeatureCollection',
      features: manyFeatures,
    },
    height: 400,
  },
  parameters: {
    docs: {
      description: {
        story:
          'List with 1000 features demonstrating virtualization. Only visible rows are rendered for performance.',
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
        story: 'Empty feature list displays a helpful message.',
      },
    },
  },
};

// Filtered list example
function FilteredListExample() {
  const [showTracks, setShowTracks] = useState(true);
  const [showLocations, setShowLocations] = useState(true);

  type Feature = TrackFeature | ReferenceLocation;
  const filter = (feature: Feature) => {
    const isTrack = 'track_type' in feature.properties;
    if (isTrack && !showTracks) return false;
    if (!isTrack && !showLocations) return false;
    return true;
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
        <label>
          <input
            type="checkbox"
            checked={showTracks}
            onChange={(e) => setShowTracks(e.target.checked)}
          />{' '}
          Show Tracks
        </label>
        <label>
          <input
            type="checkbox"
            checked={showLocations}
            onChange={(e) => setShowLocations(e.target.checked)}
          />{' '}
          Show Locations
        </label>
      </div>
      <FeatureList features={sampleData} filter={filter} height={300} />
    </div>
  );
}

export const WithFilter: Story = {
  render: () => <FilteredListExample />,
  parameters: {
    docs: {
      description: {
        story: 'Feature list with filter controls to show/hide different feature types.',
      },
    },
  },
};

// Custom row height
export const CustomRowHeight: Story = {
  args: {
    features: sampleData,
    height: 400,
    rowHeight: 56,
  },
  parameters: {
    docs: {
      description: {
        story: 'Feature list with larger row height for better readability.',
      },
    },
  },
};

// Dark theme
export const DarkTheme: Story = {
  render: () => (
    <ThemeProvider theme={{ variant: 'dark' }}>
      <FeatureList features={sampleData} height={300} />
    </ThemeProvider>
  ),
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'Feature list with dark theme applied.',
      },
    },
  },
};

// Tracks only
const tracksOnly: DebriefFeatureCollection = {
  type: 'FeatureCollection',
  features: sampleTracks,
};

export const TracksOnly: Story = {
  args: {
    features: tracksOnly,
    height: 250,
  },
  parameters: {
    docs: {
      description: {
        story: 'Feature list showing only track features with type badges.',
      },
    },
  },
};

// Locations only
const locationsOnly: DebriefFeatureCollection = {
  type: 'FeatureCollection',
  features: sampleLocations,
};

export const LocationsOnly: Story = {
  args: {
    features: locationsOnly,
    height: 200,
  },
  parameters: {
    docs: {
      description: {
        story: 'Feature list showing only reference location features.',
      },
    },
  },
};

// ---- Combined FeatureList + LayersToolbar ----

const toolbarData = generateTracks(12);
const toolbarLocations = generateLocations(4);
const toolbarFeatures: DebriefFeatureCollection = {
  type: 'FeatureCollection',
  features: [...toolbarData, ...toolbarLocations],
};

function FeatureListWithToolbarExample() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterState, setFilterState] = useState<FilterState>(DEFAULT_FILTER_STATE);
  const [toolsChanged, setToolsChanged] = useState(false);
  const [resultsChanged, setResultsChanged] = useState(false);

  const toolMatchService = useMemo(() => new ToolMatchService(sampleTools), []);

  const selectedFeatureIds = useMemo(() => Array.from(selectedIds), [selectedIds]);

  // Build selection counts from selected features for ToolMatch
  const toolMatches = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const id of selectedIds) {
      const feature = toolbarFeatures.features.find((f) => f.id === id);
      if (feature) {
        const kind = feature.properties.kind;
        counts[kind] = (counts[kind] || 0) + 1;
      }
    }
    const selection = createSelectionFromCounts(counts);
    return toolMatchService.getMatchResults(selection);
  }, [selectedIds, toolMatchService]);

  // Simple text filter applied to FeatureList
  const filter = useMemo(() => {
    if (!isFilterActive(filterState)) return undefined;
    return (feature: DebriefFeature) => {
      // Feature type filter (by kind)
      const kind = feature.properties.kind;
      if (kind && filterState.featureTypes[kind] === false) return false;
      // Text search
      if (filterState.textQuery) {
        const query = filterState.textQuery.toLowerCase();
        const name = ('platform_name' in feature.properties
          ? feature.properties.platform_name
          : 'name' in feature.properties
            ? feature.properties.name
            : feature.id ?? '') as string;
        if (!name.toLowerCase().includes(query)) return false;
      }
      return true;
    };
  }, [filterState]);

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
    // Simulate tool change notification
    setToolsChanged(true);
  };

  const handleDelete = (ids: string[]) => {
    console.log('Delete features:', ids);
  };

  const handleToggleVisibility = (ids: string[]) => {
    console.log('Toggle visibility:', ids);
  };

  const handleRunTool = (toolId: string, ids: string[]) => {
    console.log('Run tool:', toolId, 'on features:', ids);
    // Simulate new result file arriving
    setResultsChanged(true);
  };

  const handleDropdownOpened = (dropdown: 'run' | 'associated') => {
    if (dropdown === 'run') setToolsChanged(false);
    if (dropdown === 'associated') setResultsChanged(false);
  };

  return (
    <div style={{ width: 420 }}>
      <LayersToolbar
        selectedFeatureIds={selectedFeatureIds}
        features={toolbarFeatures.features}
        toolMatches={toolMatches}
        sourceFiles={sampleSourceFiles}
        resultFiles={sampleResultFiles}
        toolsChanged={toolsChanged}
        resultsChanged={resultsChanged}
        filterState={filterState}
        onDelete={handleDelete}
        onToggleVisibility={handleToggleVisibility}
        onRunTool={handleRunTool}
        onFilterChange={setFilterState}
        onApplyToSelection={(action) => console.log('Apply to selection:', action)}
        onFileAction={(file, action) => console.log('File action:', action, file.name)}
        onDropdownOpened={handleDropdownOpened}
      />
      <FeatureList
        features={toolbarFeatures}
        selectedIds={selectedIds}
        onSelect={handleSelect}
        filter={filter}
        height={350}
      />
    </div>
  );
}

export const WithToolbar: Story = {
  render: () => <FeatureListWithToolbarExample />,
  parameters: {
    docs: {
      description: {
        story:
          'FeatureList with LayersToolbar above. Select features to enable toolbar actions. ' +
          'Filter narrows the list. Run dropdown shows context-sensitive tools based on selection. ' +
          'Associated Files shows source/result files. Yellow halo appears on tool/result changes.',
      },
    },
  },
};

export const WithToolbarDarkTheme: Story = {
  render: () => (
    <ThemeProvider theme={{ variant: 'dark' }}>
      <FeatureListWithToolbarExample />
    </ThemeProvider>
  ),
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'Combined FeatureList + LayersToolbar in dark theme.',
      },
    },
  },
};
