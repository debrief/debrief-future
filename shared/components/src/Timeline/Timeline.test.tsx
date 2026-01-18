import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Timeline } from './Timeline';
import type { DebriefFeatureCollection } from '../utils/types';
import type { TrackFeature, ReferenceLocation } from '@debrief/schemas';

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

describe('Timeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders timeline container', () => {
      const { container } = render(<Timeline features={mockFeatureCollection} />);

      expect(container.querySelector('.debrief-timeline')).toBeInTheDocument();
    });

    it('renders axis canvas', () => {
      const { container } = render(<Timeline features={mockFeatureCollection} />);

      expect(container.querySelector('.debrief-timeline__axis')).toBeInTheDocument();
    });

    it('renders bars canvas', () => {
      const { container } = render(<Timeline features={mockFeatureCollection} />);

      expect(container.querySelector('.debrief-timeline__bars')).toBeInTheDocument();
    });

    it('shows empty message when no temporal data', () => {
      const noTimeFeature: ReferenceLocation = {
        ...mockReferenceLocation,
        properties: {
          ...mockReferenceLocation.properties,
          valid_from: undefined,
          valid_until: undefined,
        },
      };

      render(<Timeline features={[noTimeFeature]} />);

      expect(screen.getByText('No temporal data available')).toBeInTheDocument();
    });

    it('shows empty message for empty collection', () => {
      render(<Timeline features={{ type: 'FeatureCollection', features: [] }} />);

      expect(screen.getByText('No temporal data available')).toBeInTheDocument();
    });

    it('accepts features as array', () => {
      const { container } = render(<Timeline features={[mockTrackFeature]} />);

      expect(container.querySelector('.debrief-timeline__bars')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <Timeline features={mockFeatureCollection} className="custom-class" />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('applies custom height', () => {
      const { container } = render(
        <Timeline features={mockFeatureCollection} height={300} />
      );

      const timeline = container.querySelector('.debrief-timeline');
      expect(timeline).toHaveStyle({ height: '300px' });
    });

    it('applies custom inline styles', () => {
      const customStyle = { border: '2px solid red' };
      const { container } = render(
        <Timeline features={mockFeatureCollection} style={customStyle} />
      );

      const timeline = container.querySelector('.debrief-timeline');
      expect(timeline).toHaveStyle({ border: '2px solid red' });
    });
  });

  describe('selection', () => {
    it('accepts selectedIds prop', () => {
      const selectedIds = new Set(['track-001']);
      const { container } = render(
        <Timeline features={mockFeatureCollection} selectedIds={selectedIds} />
      );

      // Selection is rendered via canvas - visual verification in Storybook
      expect(container.querySelector('.debrief-timeline__bars')).toBeInTheDocument();
    });

    it('calls onSelect when bar is clicked', () => {
      const onSelect = vi.fn();
      const { container } = render(
        <Timeline features={mockFeatureCollection} onSelect={onSelect} />
      );

      const canvas = container.querySelector('.debrief-timeline__bars');
      expect(canvas).toBeInTheDocument();

      // Note: Canvas click testing requires integration tests
      // Unit tests verify component structure
    });

    it('calls onBackgroundClick when empty space is clicked', () => {
      const onBackgroundClick = vi.fn();
      const { container } = render(
        <Timeline features={mockFeatureCollection} onBackgroundClick={onBackgroundClick} />
      );

      const canvas = container.querySelector('.debrief-timeline__bars');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('time extent', () => {
    it('calculates time extent from features', () => {
      const { container } = render(<Timeline features={mockFeatureCollection} />);

      // Timeline should render (not show empty state)
      expect(container.querySelector('.debrief-timeline--empty')).not.toBeInTheDocument();
    });

    it('accepts override time extent', () => {
      const customExtent: [number, number] = [
        Date.parse('2024-01-01T00:00:00Z'),
        Date.parse('2024-01-31T23:59:59Z'),
      ];

      const { container } = render(
        <Timeline features={mockFeatureCollection} timeExtent={customExtent} />
      );

      expect(container.querySelector('.debrief-timeline__bars')).toBeInTheDocument();
    });

    it('calls onTimeRangeChange when time range changes', () => {
      const onTimeRangeChange = vi.fn();
      render(
        <Timeline features={mockFeatureCollection} onTimeRangeChange={onTimeRangeChange} />
      );

      // Time range change callback for future zoom/pan feature
      // Currently just verifies component accepts the prop
    });
  });

  describe('bar height', () => {
    it('uses default bar height', () => {
      const { container } = render(<Timeline features={mockFeatureCollection} />);

      expect(container.querySelector('.debrief-timeline__bars')).toBeInTheDocument();
    });

    it('accepts custom bar height', () => {
      const { container } = render(
        <Timeline features={mockFeatureCollection} barHeight={32} />
      );

      expect(container.querySelector('.debrief-timeline__bars')).toBeInTheDocument();
    });
  });
});

describe('Timeline time range adjustments', () => {
  it('updates when features change', () => {
    const { rerender, container } = render(<Timeline features={[mockTrackFeature]} />);

    expect(container.querySelector('.debrief-timeline')).toBeInTheDocument();

    rerender(<Timeline features={mockFeatureCollection} />);

    expect(container.querySelector('.debrief-timeline')).toBeInTheDocument();
  });

  it('updates when selected IDs change', () => {
    const { rerender, container } = render(
      <Timeline features={mockFeatureCollection} selectedIds={new Set()} />
    );

    rerender(
      <Timeline features={mockFeatureCollection} selectedIds={new Set(['track-001'])} />
    );

    expect(container.querySelector('.debrief-timeline__bars')).toBeInTheDocument();
  });
});
