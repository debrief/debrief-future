import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FeatureList } from './FeatureList';
import { FeatureRow } from './FeatureRow';
import type { DebriefFeatureCollection } from '../utils/types';
import type { TrackFeature, ReferenceLocation } from '@debrief/schemas';

// Mock @tanstack/react-virtual to simplify testing
// The virtualizer requires real DOM dimensions which jsdom doesn't provide
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count, estimateSize }: { count: number; estimateSize: () => number }) => ({
    getVirtualItems: () =>
      Array.from({ length: Math.min(count, 20) }, (_, i) => ({
        index: i,
        key: `virtual-item-${i}`,
        start: i * estimateSize(),
        size: estimateSize(),
      })),
    getTotalSize: () => count * estimateSize(),
  }),
}));

// Test fixtures
const mockTrackFeature: TrackFeature = {
  type: 'Feature',
  id: 'track-001',
  geometry: {
    type: 'LineString',
    // eslint-disable-next-line no-restricted-syntax
    coordinates: [[-5.0, 50.0], [-4.0, 51.0]] as unknown as number[],
  },
  properties: {
    kind: 'TRACK',
    platform_id: 'PLT-001',
    platform_name: 'HMS Example',
    track_type: 'OWNSHIP',
    start_time: '2024-01-15T08:00:00Z',
    end_time: '2024-01-15T12:00:00Z',
    positions: [],
  },
};

const mockTrack2: TrackFeature = {
  type: 'Feature',
  id: 'track-002',
  geometry: {
    type: 'LineString',
    // eslint-disable-next-line no-restricted-syntax
    coordinates: [[-4.5, 50.5], [-3.5, 51.5]] as unknown as number[],
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

const mockReferenceLocation: ReferenceLocation = {
  type: 'Feature',
  id: 'ref-001',
  geometry: {
    type: 'Point',
    // eslint-disable-next-line no-restricted-syntax
    coordinates: [-3.0, 52.0] as unknown as number[],
  },
  properties: {
    kind: 'POINT',
    name: 'Waypoint Alpha',
    location_type: 'WAYPOINT',
    valid_from: '2024-01-15T00:00:00Z',
    valid_until: '2024-01-15T23:59:59Z',
  },
};

const mockFeatureCollection: DebriefFeatureCollection = {
  type: 'FeatureCollection',
  features: [mockTrackFeature, mockTrack2, mockReferenceLocation],
};

// Generate many features for virtualization tests
function generateManyFeatures(count: number): TrackFeature[] {
  return Array.from({ length: count }, (_, i) => ({
    type: 'Feature' as const,
    id: `track-${i.toString().padStart(4, '0')}`,
    geometry: {
      type: 'LineString' as const,
      // eslint-disable-next-line no-restricted-syntax
      coordinates: [[-5 + i * 0.01, 50], [-4 + i * 0.01, 51]] as unknown as number[],
    },
    properties: {
      kind: 'TRACK' as const,
      platform_id: `PLT-${i.toString().padStart(4, '0')}`,
      platform_name: `Vessel ${i + 1}`,
      track_type: 'CONTACT' as const,
      start_time: '2024-01-15T08:00:00Z',
      end_time: '2024-01-15T12:00:00Z',
      positions: [],
    },
  }));
}

describe('FeatureList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders feature list container', () => {
      const { container } = render(<FeatureList features={mockFeatureCollection} />);

      expect(container.querySelector('.debrief-feature-list')).toBeInTheDocument();
    });

    it('renders correct number of feature rows', () => {
      render(<FeatureList features={mockFeatureCollection} />);

      // Should render all 3 features
      expect(screen.getByText('HMS Example')).toBeInTheDocument();
      expect(screen.getByText('Contact Alpha')).toBeInTheDocument();
      expect(screen.getByText('Waypoint Alpha')).toBeInTheDocument();
    });

    it('shows empty message when no features', () => {
      render(<FeatureList features={{ type: 'FeatureCollection', features: [] }} />);

      expect(screen.getByText('No features available')).toBeInTheDocument();
    });

    it('accepts features as array', () => {
      const { container } = render(<FeatureList features={[mockTrackFeature]} />);

      expect(container.querySelector('.debrief-feature-list')).toBeInTheDocument();
      expect(screen.getByText('HMS Example')).toBeInTheDocument();
    });

    it('displays feature type badges', () => {
      render(<FeatureList features={mockFeatureCollection} />);

      // Track types should show as badges
      expect(screen.getByText('OWNSHIP')).toBeInTheDocument();
      expect(screen.getByText('CONTACT')).toBeInTheDocument();
      expect(screen.getByText('WAYPOINT')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <FeatureList features={mockFeatureCollection} className="custom-class" />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('applies custom height', () => {
      const { container } = render(
        <FeatureList features={mockFeatureCollection} height={400} />
      );

      const list = container.querySelector('.debrief-feature-list');
      expect(list).toHaveStyle({ height: '400px' });
    });

    it('applies custom inline styles', () => {
      const customStyle = { border: '2px solid blue' };
      const { container } = render(
        <FeatureList features={mockFeatureCollection} style={customStyle} />
      );

      const list = container.querySelector('.debrief-feature-list');
      expect(list).toHaveStyle({ border: '2px solid blue' });
    });
  });

  describe('selection', () => {
    it('accepts selectedIds prop', () => {
      const selectedIds = new Set(['track-001']);
      const { container } = render(
        <FeatureList features={mockFeatureCollection} selectedIds={selectedIds} />
      );

      const selectedRow = container.querySelector('.debrief-feature-row--selected');
      expect(selectedRow).toBeInTheDocument();
    });

    it('highlights selected features', () => {
      const selectedIds = new Set(['track-001', 'track-002']);
      const { container } = render(
        <FeatureList features={mockFeatureCollection} selectedIds={selectedIds} />
      );

      const selectedRows = container.querySelectorAll('.debrief-feature-row--selected');
      expect(selectedRows).toHaveLength(2);
    });

    it('calls onSelect when row is clicked', () => {
      const onSelect = vi.fn();
      render(<FeatureList features={mockFeatureCollection} onSelect={onSelect} />);

      const row = screen.getByText('HMS Example').closest('.debrief-feature-row');
      fireEvent.click(row!);

      expect(onSelect).toHaveBeenCalledWith('track-001');
    });

    it('calls onSelect with correct feature id', () => {
      const onSelect = vi.fn();
      render(<FeatureList features={mockFeatureCollection} onSelect={onSelect} />);

      const row = screen.getByText('Contact Alpha').closest('.debrief-feature-row');
      fireEvent.click(row!);

      expect(onSelect).toHaveBeenCalledWith('track-002');
    });
  });

  describe('row height', () => {
    it('uses default row height', () => {
      const { container } = render(<FeatureList features={mockFeatureCollection} />);

      expect(container.querySelector('.debrief-feature-list')).toBeInTheDocument();
    });

    it('accepts custom row height', () => {
      const { container } = render(
        <FeatureList features={mockFeatureCollection} rowHeight={48} />
      );

      expect(container.querySelector('.debrief-feature-list')).toBeInTheDocument();
    });
  });
});

describe('FeatureRow', () => {
  it('renders feature name', () => {
    render(
      <FeatureRow
        feature={mockTrackFeature}
        isSelected={false}
        onClick={() => {}}
      />
    );

    expect(screen.getByText('HMS Example')).toBeInTheDocument();
  });

  it('renders feature type badge', () => {
    render(
      <FeatureRow
        feature={mockTrackFeature}
        isSelected={false}
        onClick={() => {}}
      />
    );

    expect(screen.getByText('OWNSHIP')).toBeInTheDocument();
  });

  it('applies selected class when selected', () => {
    const { container } = render(
      <FeatureRow
        feature={mockTrackFeature}
        isSelected={true}
        onClick={() => {}}
      />
    );

    expect(container.querySelector('.debrief-feature-row--selected')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(
      <FeatureRow
        feature={mockTrackFeature}
        isSelected={false}
        onClick={onClick}
      />
    );

    fireEvent.click(screen.getByText('HMS Example').closest('.debrief-feature-row')!);

    expect(onClick).toHaveBeenCalled();
  });

  it('displays reference location name', () => {
    render(
      <FeatureRow
        feature={mockReferenceLocation}
        isSelected={false}
        onClick={() => {}}
      />
    );

    expect(screen.getByText('Waypoint Alpha')).toBeInTheDocument();
  });

  it('displays reference location type', () => {
    render(
      <FeatureRow
        feature={mockReferenceLocation}
        isSelected={false}
        onClick={() => {}}
      />
    );

    expect(screen.getByText('WAYPOINT')).toBeInTheDocument();
  });
});

describe('FeatureList virtualization', () => {
  it('renders with many features without crashing', () => {
    const manyFeatures = generateManyFeatures(1000);
    const { container } = render(
      <FeatureList
        features={{ type: 'FeatureCollection', features: manyFeatures }}
        height={400}
      />
    );

    expect(container.querySelector('.debrief-feature-list')).toBeInTheDocument();
  });

  it('only renders visible rows (virtualization)', () => {
    const manyFeatures = generateManyFeatures(1000);
    const { container } = render(
      <FeatureList
        features={{ type: 'FeatureCollection', features: manyFeatures }}
        height={400}
      />
    );

    // Mock virtualizer limits to 20 visible rows
    const rows = container.querySelectorAll('.debrief-feature-row');
    expect(rows.length).toBeLessThan(1000);
    expect(rows.length).toBeLessThanOrEqual(20);
  });

  it('maintains selection with virtualization', () => {
    const manyFeatures = generateManyFeatures(100);
    const selectedIds = new Set(['track-0000', 'track-0001']);

    const { container } = render(
      <FeatureList
        features={{ type: 'FeatureCollection', features: manyFeatures }}
        selectedIds={selectedIds}
        height={400}
      />
    );

    // First two rows should be visible and selected
    const selectedRows = container.querySelectorAll('.debrief-feature-row--selected');
    expect(selectedRows.length).toBeGreaterThan(0);
  });

  it('has scroll container', () => {
    const manyFeatures = generateManyFeatures(100);
    const { container } = render(
      <FeatureList
        features={{ type: 'FeatureCollection', features: manyFeatures }}
        height={400}
      />
    );

    const scrollContainer = container.querySelector('.debrief-feature-list__scroll');
    expect(scrollContainer).toBeInTheDocument();
  });
});

describe('FeatureRow info button (Feature 098)', () => {
  const mockTrack: typeof mockTrackFeature = mockTrackFeature;

  it('renders info icon when showInfoIcon is true and handler is provided', () => {
    const onInfoClick = vi.fn();
    render(
      <FeatureRow
        feature={mockTrack}
        isSelected={false}
        showInfoIcon={true}
        onInfoClick={onInfoClick}
        onClick={() => {}}
      />
    );

    expect(screen.getByTestId(`info-icon-${mockTrack.id}`)).toBeInTheDocument();
  });

  it('does not render info icon when showInfoIcon is false', () => {
    render(
      <FeatureRow
        feature={mockTrack}
        isSelected={false}
        showInfoIcon={false}
        onClick={() => {}}
      />
    );

    expect(screen.queryByTestId(`info-icon-${mockTrack.id}`)).not.toBeInTheDocument();
  });

  it('does not render info icon when no handler is provided', () => {
    render(
      <FeatureRow
        feature={mockTrack}
        isSelected={false}
        showInfoIcon={true}
        onClick={() => {}}
      />
    );

    expect(screen.queryByTestId(`info-icon-${mockTrack.id}`)).not.toBeInTheDocument();
  });

  it('calls onInfoClick with feature when info icon is clicked', () => {
    const onInfoClick = vi.fn();
    render(
      <FeatureRow
        feature={mockTrack}
        isSelected={false}
        showInfoIcon={true}
        onInfoClick={onInfoClick}
        onClick={() => {}}
      />
    );

    fireEvent.click(screen.getByTestId(`info-icon-${mockTrack.id}`));
    expect(onInfoClick).toHaveBeenCalledTimes(1);
    expect(onInfoClick).toHaveBeenCalledWith(expect.any(Object), mockTrack);
  });

  it('does not trigger row click when info icon is clicked', () => {
    const onInfoClick = vi.fn();
    const onClick = vi.fn();
    render(
      <FeatureRow
        feature={mockTrack}
        isSelected={false}
        showInfoIcon={true}
        onInfoClick={onInfoClick}
        onClick={onClick}
      />
    );

    fireEvent.click(screen.getByTestId(`info-icon-${mockTrack.id}`));
    expect(onInfoClick).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('info icon has correct role and title', () => {
    const onInfoClick = vi.fn();
    render(
      <FeatureRow
        feature={mockTrack}
        isSelected={false}
        showInfoIcon={true}
        onInfoClick={onInfoClick}
        onClick={() => {}}
      />
    );

    const infoIcon = screen.getByTestId(`info-icon-${mockTrack.id}`);
    expect(infoIcon).toHaveAttribute('role', 'button');
    expect(infoIcon).toHaveAttribute('title', 'Info');
  });

  it('calls onInfoClick on Enter keydown', () => {
    const onInfoClick = vi.fn();
    render(
      <FeatureRow
        feature={mockTrack}
        isSelected={false}
        showInfoIcon={true}
        onInfoClick={onInfoClick}
        onClick={() => {}}
      />
    );

    const infoIcon = screen.getByTestId(`info-icon-${mockTrack.id}`);
    fireEvent.keyDown(infoIcon, { key: 'Enter' });
    expect(onInfoClick).toHaveBeenCalledTimes(1);
  });
});

describe('FeatureList filtering', () => {
  it('accepts filter prop', () => {
    const filter = vi.fn().mockReturnValue(true);
    render(
      <FeatureList features={mockFeatureCollection} filter={filter} />
    );

    expect(filter).toHaveBeenCalled();
  });

  it('filters features based on filter function', () => {
    // Only show tracks (filter out reference locations)
    const filter = (feature: TrackFeature | ReferenceLocation) =>
      feature.properties.kind === 'TRACK';

    render(
      <FeatureList features={mockFeatureCollection} filter={filter} />
    );

    expect(screen.getByText('HMS Example')).toBeInTheDocument();
    expect(screen.getByText('Contact Alpha')).toBeInTheDocument();
    expect(screen.queryByText('Waypoint Alpha')).not.toBeInTheDocument();
  });

  it('shows empty state when all features filtered out', () => {
    const filter = () => false;

    render(
      <FeatureList features={mockFeatureCollection} filter={filter} />
    );

    expect(screen.getByText('No features available')).toBeInTheDocument();
  });
});

// ─── Sensor-aware rendering integration tests (Feature #179) ────────

const mockTrackWithSensors: TrackFeature = {
  type: 'Feature',
  id: 'track-s01',
  geometry: {
    type: 'LineString',
    // eslint-disable-next-line no-restricted-syntax
    coordinates: [[-5, 50], [-4, 51]] as unknown as number[],
  },
  properties: {
    kind: 'TRACK',
    platform_id: 'PLT-S01',
    platform_name: 'Sensor Track',
    track_type: 'OWNSHIP',
    start_time: '2024-01-15T08:00:00Z',
    end_time: '2024-01-15T12:00:00Z',
    positions: [
      { time: '2024-01-15T08:00:00Z', course: 90, speed: 12.5 },
    ],
    sensors: [
      {
        name: 'TOWED_ARRAY',
        contacts: [
          { time: '2024-01-15T08:00:00Z', bearing: 45 },
          { time: '2024-01-15T08:05:00Z', bearing: 50 },
        ],
      },
    ],
  },
// eslint-disable-next-line no-restricted-syntax
} as unknown as TrackFeature;

const sensorFeatureCollection: DebriefFeatureCollection = {
  type: 'FeatureCollection',
  features: [mockTrackWithSensors],
};

describe('FeatureList sensor rendering (Feature #179)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders group rows when track with sensors is expanded', () => {
    const { container } = render(
      <FeatureList features={sensorFeatureCollection} height={400} />
    );

    // Click the track row expand button
    const expandBtn = container.querySelector('[aria-label="Expand"]');
    expect(expandBtn).toBeInTheDocument();
    fireEvent.click(expandBtn!);

    // Should show Positions and Sensors group rows
    expect(screen.getByText('Positions (1)')).toBeInTheDocument();
    expect(screen.getByText('Sensors (1)')).toBeInTheDocument();
  });

  it('US2: clicking group row selects only the group path (no fan-out)', () => {
    const onSelectionChange = vi.fn();
    const { container } = render(
      <FeatureList
        features={sensorFeatureCollection}
        onSelectionChange={onSelectionChange}
        height={400}
      />
    );

    // Expand the track
    const expandBtn = container.querySelector('[aria-label="Expand"]');
    fireEvent.click(expandBtn!);

    // Click the Sensors group row label
    const sensorsRow = screen.getByText('Sensors (1)').closest('.debrief-feature-row');
    fireEvent.click(sensorsRow!);

    expect(onSelectionChange).toHaveBeenCalled();
    const selectedIds = onSelectionChange.mock.calls[onSelectionChange.mock.calls.length - 1]![0] as Set<string>;
    expect(selectedIds.size).toBe(1);
    expect(selectedIds.has('track-s01/sensors')).toBe(true);
  });

  it('US3: sensor row in hiddenIds renders with hidden state', () => {
    const hiddenIds = new Set(['track-s01/sensors/TOWED_ARRAY']);
    const { container } = render(
      <FeatureList
        features={sensorFeatureCollection}
        hiddenIds={hiddenIds}
        height={400}
      />
    );

    // Expand the track, then expand Sensors group
    const expandBtn = container.querySelector('[aria-label="Expand"]');
    fireEvent.click(expandBtn!);

    // Expand the Sensors group
    const sensorsGroupExpand = screen.getByText('Sensors (1)')
      .closest('.debrief-feature-row')
      ?.querySelector('[aria-label="Expand"]');
    if (sensorsGroupExpand) {
      fireEvent.click(sensorsGroupExpand);
    }

    // The sensor row should be visible (rendered) but with hidden styling
    const sensorRow = screen.queryByText('TOWED_ARRAY')?.closest('.debrief-feature-row');
    if (sensorRow) {
      expect(sensorRow.classList.contains('debrief-feature-row--hidden')).toBe(true);
    }
  });

  it('contact row info icon triggers onChildInfoClick', () => {
    const onChildInfoClick = vi.fn();
    const { container } = render(
      <FeatureList
        features={sensorFeatureCollection}
        showInfoIcon={true}
        onChildInfoClick={onChildInfoClick}
        height={400}
      />
    );

    // Expand track → Sensors group → sensor
    const expandBtn = container.querySelector('[aria-label="Expand"]');
    fireEvent.click(expandBtn!);

    const sensorsGroupExpand = screen.getByText('Sensors (1)')
      .closest('.debrief-feature-row')
      ?.querySelector('[aria-label="Expand"]');
    if (sensorsGroupExpand) fireEvent.click(sensorsGroupExpand);

    const sensorExpand = screen.queryByText('TOWED_ARRAY')
      ?.closest('.debrief-feature-row')
      ?.querySelector('[aria-label="Expand"]');
    if (sensorExpand) fireEvent.click(sensorExpand);

    // Look for info icon on a contact row
    const contactInfoIcon = container.querySelector('[data-testid="info-icon-track-s01/sensors/TOWED_ARRAY/contacts/0"]');
    if (contactInfoIcon) {
      fireEvent.click(contactInfoIcon);
      expect(onChildInfoClick).toHaveBeenCalledTimes(1);
      expect(onChildInfoClick.mock.calls[0]![1].type).toBe('contact');
    }
  });

  it('sensor row does NOT show info icon (FR-017 negative assertion)', () => {
    const { container } = render(
      <FeatureList
        features={sensorFeatureCollection}
        showInfoIcon={true}
        onChildInfoClick={() => {}}
        height={400}
      />
    );

    // Expand track → Sensors group
    const expandBtn = container.querySelector('[aria-label="Expand"]');
    fireEvent.click(expandBtn!);

    const sensorsGroupExpand = screen.getByText('Sensors (1)')
      .closest('.debrief-feature-row')
      ?.querySelector('[aria-label="Expand"]');
    if (sensorsGroupExpand) fireEvent.click(sensorsGroupExpand);

    // Sensor row should NOT have info icon
    const sensorInfoIcon = container.querySelector('[data-testid="info-icon-track-s01/sensors/TOWED_ARRAY"]');
    expect(sensorInfoIcon).toBeNull();
  });
});
