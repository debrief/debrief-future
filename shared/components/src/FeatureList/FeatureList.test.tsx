import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
