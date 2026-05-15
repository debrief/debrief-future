import type { Meta, StoryObj } from '@storybook/react';
import { useState, useMemo } from 'react';
import { FeatureList } from './FeatureList';
import { LayersToolbar } from '../LayersToolbar';
import { DEFAULT_FILTER_STATE, isFilterActive } from '../LayersToolbar';
import type { FilterState } from '../LayersToolbar';
import { ToolMatchService, createSelectionFromCounts } from '../ToolMatch';
import { ThemeProvider } from '../ThemeProvider';
import type { DebriefFeature, DebriefFeatureCollection } from '../utils/types';
import type { TrackFeature, ReferenceLocation, SensorData } from '@debrief/schemas';
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

// ─── Spec #258 — Storyboard grouping fixtures ────────────────────────

const STORYBOARD_ID = '01HZSB258000000000000000XX';

function generateStoryboardScenes(
  count: number,
  storyboardId: string,
): DebriefFeature[] {
  const baseTime = Date.parse('2026-04-20T10:00:00Z');
  return Array.from({ length: count }, (_, i) => ({
    type: 'Feature' as const,
    id: `scene-${i.toString().padStart(3, '0')}`,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [
        [
          [-1.5 + i * 0.05, 50.5],
          [-1.4 + i * 0.05, 50.5],
          [-1.4 + i * 0.05, 50.6],
          [-1.5 + i * 0.05, 50.6],
          [-1.5 + i * 0.05, 50.5],
        ],
      ] as unknown as number[],
    },
    properties: {
      kind: 'STORYBOARD_SCENE',
      id: `01HZSC25800000000000000${String(i).padStart(2, '0')}`,
      storyboard_id: storyboardId,
      title: `Scene ${i + 1} — ${new Date(baseTime + i * 60000)
        .toISOString()
        .slice(11, 19)}Z`,
      viewport: { center: [-1.25, 50.55], zoom: 11, bearing: 0 },
      timestamp: new Date(baseTime + i * 60000).toISOString(),
      visible_feature_ids: [],
      feature_set_hash: '0'.repeat(64),
      thumbnail_asset_ref: `thumb-${i}.png`,
      transition_duration_ms: 500,
      display_mode: i % 2 === 0 ? 'trail' : 'full',
      _polygon_source: 'bounds',
    },
  })) as unknown as DebriefFeature[];
}

function makeStoryboard(id: string, name: string): DebriefFeature {
  return {
    type: 'Feature',
    id,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-1.55, 50.45],
          [-1.2, 50.45],
          [-1.2, 50.65],
          [-1.55, 50.65],
          [-1.55, 50.45],
        ],
      ] as unknown as number[],
    },
    properties: {
      kind: 'STORYBOARD',
      id,
      name,
      schema_version: 1,
    },
  } as unknown as DebriefFeature;
}

const storyboardGroupingFeatures: DebriefFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    ...generateTracks(2),
    makeStoryboard(STORYBOARD_ID, 'Engagement Brief'),
    ...generateStoryboardScenes(5, STORYBOARD_ID),
  ],
};

const storyboardGroupingExpandedFeatures: DebriefFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    ...generateTracks(2),
    makeStoryboard(STORYBOARD_ID, 'Engagement Brief'),
    ...generateStoryboardScenes(5, STORYBOARD_ID),
    makeStoryboard('01HZSB259000000000000000XX', 'Empty Storyboard'),
  ],
};

export const StoryboardGrouping: Story = {
  args: {
    features: storyboardGroupingFeatures,
    height: 360,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Spec #258 / US4 — each Storyboard renders as a single collapsible parent row with the scene count in a `(N)` badge. Scenes appear as indented children when the parent is expanded; otherwise they are hidden under the parent. Tracks continue to render at the top level alongside the storyboard parent.',
      },
    },
  },
};

export const StoryboardGroupingExpanded: Story = {
  args: {
    features: storyboardGroupingExpandedFeatures,
    height: 480,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Spec #258 — same fixture as `StoryboardGrouping` plus a second storyboard with zero scenes. The empty storyboard renders with `(0)` and a disabled chevron (FR-013), so authors can still see it exists.',
      },
    },
  },
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
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => {
    // Start with a couple of features hidden to demonstrate the feature
    const ids = toolbarFeatures.features.slice(2, 4).map((f) => f.id);
    return new Set(ids);
  });
  const [showHidden, setShowHidden] = useState(true);
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

  // Filter: text, kind, and show/hide hidden
  const filter = useMemo(() => {
    const hasFilter = isFilterActive(filterState);
    const needsHiddenFilter = !showHidden && hiddenIds.size > 0;
    if (!hasFilter && !needsHiddenFilter) return undefined;
    return (feature: DebriefFeature) => {
      // Hide hidden features when showHidden is off
      if (!showHidden && hiddenIds.has(feature.id)) return false;
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
  }, [filterState, showHidden, hiddenIds]);

  const handleSelectionChange = (ids: Set<string>) => {
    setSelectedIds(ids);
    setToolsChanged(true);
  };

  const handleApplyToSelection = (action: string) => {
    if (action === 'selectAll') {
      setSelectedIds(new Set(toolbarFeatures.features.map((f) => f.id)));
    } else {
      console.log('Apply to selection:', action);
    }
  };

  const handleDelete = (ids: string[]) => {
    console.log('Delete features:', ids);
  };

  const handleToggleVisibility = (ids: string[]) => {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      }
      return next;
    });
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
        hiddenIds={hiddenIds}
        toolMatches={toolMatches}
        sourceFiles={sampleSourceFiles}
        resultFiles={sampleResultFiles}
        toolsChanged={toolsChanged}
        resultsChanged={resultsChanged}
        filterState={filterState}
        showHidden={showHidden}
        onDelete={handleDelete}
        onToggleVisibility={handleToggleVisibility}
        onRunTool={handleRunTool}
        onFilterChange={setFilterState}
        onShowHiddenChange={setShowHidden}
        onApplyToSelection={handleApplyToSelection}
        onFileAction={(file, action) => console.log('File action:', action, file.name)}
        onDropdownOpened={handleDropdownOpened}
      />
      <FeatureList
        features={toolbarFeatures}
        selectedIds={selectedIds}
        hiddenIds={hiddenIds}
        onSelectionChange={handleSelectionChange}
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

// ── Sensor-aware track fixtures (Feature #179) ──────────────────────

function makeSensorContacts(count: number, startBearing: number = 45): Array<{ time: string; bearing: number; ambiguous_bearing?: number }> {
  return Array.from({ length: count }, (_, i) => ({
    time: new Date(Date.UTC(2024, 0, 15, 8, i * 5, 0)).toISOString(),
    bearing: (startBearing + i * 2) % 360,
    ...(i === 0 && count > 5 ? { ambiguous_bearing: (startBearing + 180) % 360 } : {}),
  }));
}

// Case A: simple track, no sensors (baseline — positions as direct children)
const caseATrack: TrackFeature = {
  type: 'Feature',
  id: 'case-a-simple',
  geometry: {
    type: 'LineString',
    coordinates: [[-5, 50], [-4, 51]] as unknown as number[],
  },
  properties: {
    kind: 'TRACK',
    platform_id: 'PLT-A',
    platform_name: 'Case A — Simple Track',
    track_type: 'OWNSHIP',
    start_time: '2024-01-15T08:00:00Z',
    end_time: '2024-01-15T12:00:00Z',
    positions: [
      { time: '2024-01-15T08:00:00Z', course: 90, speed: 12.5 },
      { time: '2024-01-15T09:00:00Z', course: 95, speed: 13.0 },
      { time: '2024-01-15T10:00:00Z', course: 100, speed: 12.0 },
    ],
  },
} as unknown as TrackFeature;

// Case B: compound track, no sensors (Track Segments wrapper)
const caseBTrack: TrackFeature = {
  type: 'Feature',
  id: 'case-b-compound',
  geometry: {
    type: 'LineString',
    coordinates: [[-5, 50], [-4, 51]] as unknown as number[],
  },
  properties: {
    kind: 'TRACK',
    platform_id: 'PLT-B',
    platform_name: 'Case B — Compound (No Sensors)',
    track_type: 'SOLUTION',
    start_time: '2024-01-15T08:00:00Z',
    end_time: '2024-01-15T12:00:00Z',
    positions: [],
    segments: [
      { segment_type: 'TMA_SEGMENT', name: 'leg-alpha', start_time: '2024-01-15T08:00:00Z', end_time: '2024-01-15T10:00:00Z', positions: [{ time: '2024-01-15T08:00:00Z', course: 45, speed: 8 }, { time: '2024-01-15T09:00:00Z', course: 50, speed: 9 }] },
      { segment_type: 'TMA_SEGMENT', name: 'leg-bravo', start_time: '2024-01-15T10:00:00Z', end_time: '2024-01-15T12:00:00Z', positions: [{ time: '2024-01-15T10:00:00Z', course: 120, speed: 7 }] },
    ],
  },
} as unknown as TrackFeature;

// Case C: simple track with sensors (Positions + Sensors groups)
const caseCTrack: TrackFeature = {
  type: 'Feature',
  id: 'case-c-sensors',
  geometry: {
    type: 'LineString',
    coordinates: [[-5, 50], [-4, 51]] as unknown as number[],
  },
  properties: {
    kind: 'TRACK',
    platform_id: 'PLT-C',
    platform_name: 'Case C — Track with Sensors',
    track_type: 'OWNSHIP',
    start_time: '2024-01-15T08:00:00Z',
    end_time: '2024-01-15T12:00:00Z',
    positions: [
      { time: '2024-01-15T08:00:00Z', course: 90, speed: 12.5 },
      { time: '2024-01-15T09:00:00Z', course: 95, speed: 13.0 },
      { time: '2024-01-15T10:00:00Z', course: 100, speed: 12.0 },
    ],
    sensors: [
      { name: 'TOWED_ARRAY', contacts: makeSensorContacts(42) } as SensorData,
      { name: 'HULL_ARRAY', contacts: makeSensorContacts(17, 200) } as SensorData,
    ],
  },
} as unknown as TrackFeature;

// Case D: compound track with sensors (Track Segments + Sensors groups)
const caseDTrack: TrackFeature = {
  type: 'Feature',
  id: 'case-d-compound-sensors',
  geometry: {
    type: 'LineString',
    coordinates: [[-5, 50], [-4, 51]] as unknown as number[],
  },
  properties: {
    kind: 'TRACK',
    platform_id: 'PLT-D',
    platform_name: 'Case D — Compound + Sensors',
    track_type: 'SOLUTION',
    start_time: '2024-01-15T08:00:00Z',
    end_time: '2024-01-15T12:00:00Z',
    positions: [],
    segments: [
      { segment_type: 'TMA_SEGMENT', name: 'leg-one', start_time: '2024-01-15T08:00:00Z', end_time: '2024-01-15T10:00:00Z', positions: [{ time: '2024-01-15T08:00:00Z', course: 45, speed: 8 }] },
      { segment_type: 'TMA_SEGMENT', name: 'leg-two', start_time: '2024-01-15T10:00:00Z', end_time: '2024-01-15T12:00:00Z', positions: [{ time: '2024-01-15T10:00:00Z', course: 120, speed: 7 }] },
    ],
    sensors: [
      { name: 'BOW_ARRAY', contacts: makeSensorContacts(8, 90) } as SensorData,
    ],
  },
} as unknown as TrackFeature;

// Edge case: zero-contact sensor + ambiguous bearing
const edgeCaseTrack: TrackFeature = {
  type: 'Feature',
  id: 'edge-cases',
  geometry: {
    type: 'LineString',
    coordinates: [[-5, 50], [-4, 51]] as unknown as number[],
  },
  properties: {
    kind: 'TRACK',
    platform_id: 'PLT-E',
    platform_name: 'Edge Cases — Zero/Ambiguous',
    track_type: 'OWNSHIP',
    start_time: '2024-01-15T08:00:00Z',
    end_time: '2024-01-15T12:00:00Z',
    positions: [
      { time: '2024-01-15T08:00:00Z', course: 0, speed: 5 },
    ],
    sensors: [
      { name: 'EMPTY_SENSOR', contacts: [] } as SensorData,
      {
        name: 'AMBIGUOUS_SENSOR',
        contacts: [
          { time: '2024-01-15T08:00:00Z', bearing: 45, ambiguous_bearing: 225 },
          { time: '2024-01-15T08:05:00Z', bearing: 359 },
        ],
      } as SensorData,
    ],
  },
} as unknown as TrackFeature;

const sensorFeatures: DebriefFeatureCollection = {
  type: 'FeatureCollection',
  features: [caseATrack, caseBTrack, caseCTrack, caseDTrack, edgeCaseTrack],
};

function TracksWithSensorsExample() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
        features={sensorFeatures}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        showInfoIcon={true}
        onChildInfoClick={(_e, item) => {
          window.alert(`Info for: ${item.id}\nLabel: ${item.label}\nSublabel: ${item.sublabel ?? 'n/a'}`);
        }}
        height={500}
      />
    </div>
  );
}

export const TracksWithSensors: Story = {
  render: () => <TracksWithSensorsExample />,
  parameters: {
    docs: {
      description: {
        story:
          'All four layout cases for sensor-aware track rendering (#179). ' +
          'Case A: simple track (positions as direct children). ' +
          'Case B: compound track (Track Segments wrapper). ' +
          'Case C: simple track + sensors (Positions + Sensors groups). ' +
          'Case D: compound track + sensors (Track Segments + Sensors groups). ' +
          'Plus edge cases: zero-contact sensor, ambiguous bearing.',
      },
    },
  },
};
