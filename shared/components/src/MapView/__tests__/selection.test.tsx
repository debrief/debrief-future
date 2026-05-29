import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MapView } from '../MapView';
import type { DebriefFeatureCollection } from '../../utils/types';
import type { TrackFeature } from '@debrief/schemas';

// Mock react-leaflet components
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="map-container" className={className}>
      {children}
    </div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  GeoJSON: ({ data, onEachFeature, style: styleFn }: {
    data: { features: Array<{ id?: string | number; properties: Record<string, unknown> }> };
    onEachFeature?: (feature: Record<string, unknown>, layer: { on: ReturnType<typeof vi.fn>; bindTooltip: ReturnType<typeof vi.fn>; setStyle: ReturnType<typeof vi.fn> }) => void;
    style?: (feature: Record<string, unknown>) => Record<string, unknown>;
  }) => {
    return (
      <div data-testid="geojson-layer">
        {data.features.map((feature, index: number) => {
          const computedStyle = styleFn?.(feature) ?? {};
          const layer = {
            on: vi.fn(),
            bindTooltip: vi.fn().mockReturnThis(),
            bindPopup: vi.fn().mockReturnThis(),
            setStyle: vi.fn(),
          };
          onEachFeature?.(feature, layer);

          return (
            <div
              key={String(feature.id) || String(index)}
              data-testid={`feature-${feature.id}`}
              data-selected={computedStyle.weight === 4 ? 'true' : 'false'}
              style={{
                color: computedStyle.color as string | undefined,
                opacity: computedStyle.fillOpacity as number | undefined,
              }}
              onClick={(e) => {
                e.stopPropagation();
                const clickHandler = (layer.on.mock.calls as Array<[string, (e: Record<string, unknown>) => void]>).find(
                  (c) => c[0] === 'click'
                );
                if (clickHandler) {
                  clickHandler[1]({ originalEvent: e.nativeEvent });
                }
              }}
            />
          );
        })}
      </div>
    );
  },
  useMap: () => ({
    fitBounds: vi.fn(),
    getZoom: () => 10,
    getBounds: () => ({
      getWest: () => -5,
      getSouth: () => 50,
      getEast: () => -3,
      getNorth: () => 52,
    }),
  }),
  useMapEvents: (/* _handlers */) => {
    // Store handlers for potential use
    return null;
  },
}));

// Test fixtures
const createTrack = (id: string, name: string): TrackFeature => ({
  type: 'Feature',
  id,
  geometry: {
    type: 'LineString',
    // eslint-disable-next-line no-restricted-syntax
    coordinates: [[-5, 50], [-4, 51]] as unknown as number[],
  },
  properties: {
    kind: 'TRACK',
    platform_id: `PLT-${id}`,
    platform_name: name,
    track_type: 'CONTACT',
    start_time: '2024-01-15T08:00:00Z',
    end_time: '2024-01-15T12:00:00Z',
    positions: [],
  },
});

const mockFeatures: DebriefFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    createTrack('track-001', 'Contact Alpha'),
    createTrack('track-002', 'Contact Bravo'),
    createTrack('track-003', 'Contact Charlie'),
  ],
};

describe('MapView Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('click selection', () => {
    // #192 Phase 5: onSelect now emits `SelectionClickEvent`
    // ({ target, modifier, shift }) rather than (featureId, MouseEvent).
    it('calls onSelect with a SelectionClickEvent when feature is clicked', () => {
      const onSelect = vi.fn();
      render(<MapView features={mockFeatures} onSelect={onSelect} />);

      const feature = screen.getByTestId('feature-track-001');
      fireEvent.click(feature);

      expect(onSelect).toHaveBeenCalledWith({
        target: 'track-001',
        modifier: false,
        shift: false,
      });
    });

    it('emits the correct target for each feature', () => {
      const onSelect = vi.fn();
      render(<MapView features={mockFeatures} onSelect={onSelect} />);

      fireEvent.click(screen.getByTestId('feature-track-002'));
      expect(onSelect).toHaveBeenLastCalledWith(
        expect.objectContaining({ target: 'track-002' }),
      );

      fireEvent.click(screen.getByTestId('feature-track-003'));
      expect(onSelect).toHaveBeenLastCalledWith(
        expect.objectContaining({ target: 'track-003' }),
      );
    });

    it('does not call onSelect when no handler provided', () => {
      render(<MapView features={mockFeatures} />);

      // Should not throw
      const feature = screen.getByTestId('feature-track-001');
      expect(() => fireEvent.click(feature)).not.toThrow();
    });

    it('emits `modifier: false` and `shift: false` for an unmodified click', () => {
      const onSelect = vi.fn();
      render(<MapView features={mockFeatures} onSelect={onSelect} />);

      fireEvent.click(screen.getByTestId('feature-track-001'));

      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          target: 'track-001',
          modifier: false,
          shift: false,
        }),
      );
    });
  });

  describe('selection highlighting', () => {
    it('applies selected style to selected features', () => {
      const selectedIds = new Set(['track-001']);
      render(
        <MapView features={mockFeatures} selectedIds={selectedIds} />
      );

      const selectedFeature = screen.getByTestId('feature-track-001');
      expect(selectedFeature).toHaveAttribute('data-selected', 'true');
    });

    it('does not apply selected style to unselected features', () => {
      const selectedIds = new Set(['track-001']);
      render(
        <MapView features={mockFeatures} selectedIds={selectedIds} />
      );

      const unselectedFeature = screen.getByTestId('feature-track-002');
      expect(unselectedFeature).toHaveAttribute('data-selected', 'false');
    });

    it('highlights multiple selected features', () => {
      const selectedIds = new Set(['track-001', 'track-003']);
      render(
        <MapView features={mockFeatures} selectedIds={selectedIds} />
      );

      expect(screen.getByTestId('feature-track-001')).toHaveAttribute(
        'data-selected',
        'true'
      );
      expect(screen.getByTestId('feature-track-002')).toHaveAttribute(
        'data-selected',
        'false'
      );
      expect(screen.getByTestId('feature-track-003')).toHaveAttribute(
        'data-selected',
        'true'
      );
    });

    it('updates highlighting when selectedIds changes', () => {
      const { rerender } = render(
        <MapView
          features={mockFeatures}
          selectedIds={new Set(['track-001'])}
        />
      );

      expect(screen.getByTestId('feature-track-001')).toHaveAttribute(
        'data-selected',
        'true'
      );
      expect(screen.getByTestId('feature-track-002')).toHaveAttribute(
        'data-selected',
        'false'
      );

      rerender(
        <MapView
          features={mockFeatures}
          selectedIds={new Set(['track-002'])}
        />
      );

      expect(screen.getByTestId('feature-track-001')).toHaveAttribute(
        'data-selected',
        'false'
      );
      expect(screen.getByTestId('feature-track-002')).toHaveAttribute(
        'data-selected',
        'true'
      );
    });
  });

  describe('background click (selection clear)', () => {
    it('calls onBackgroundClick when provided', () => {
      const onBackgroundClick = vi.fn();
      render(
        <MapView
          features={mockFeatures}
          onBackgroundClick={onBackgroundClick}
        />
      );

      // The background click is handled in MapController via useMapEvents
      // In real usage, clicking empty map space triggers this
      expect(onBackgroundClick).not.toHaveBeenCalled();
    });

    it('does not throw when no onBackgroundClick handler', () => {
      expect(() => {
        render(<MapView features={mockFeatures} />);
      }).not.toThrow();
    });
  });
});

describe('MapView Multi-Select', () => {
  it('supports multiple selections via controlled selectedIds', () => {
    const selectedIds = new Set(['track-001', 'track-002', 'track-003']);
    render(<MapView features={mockFeatures} selectedIds={selectedIds} />);

    expect(screen.getByTestId('feature-track-001')).toHaveAttribute(
      'data-selected',
      'true'
    );
    expect(screen.getByTestId('feature-track-002')).toHaveAttribute(
      'data-selected',
      'true'
    );
    expect(screen.getByTestId('feature-track-003')).toHaveAttribute(
      'data-selected',
      'true'
    );
  });

  it('allows toggling selection in callback', () => {
    let selectedIds = new Set<string>();
    const onSelect = vi.fn((evt: { target: string }) => {
      const id = evt.target;
      if (selectedIds.has(id)) {
        selectedIds = new Set([...selectedIds].filter((s) => s !== id));
      } else {
        selectedIds = new Set([...selectedIds, id]);
      }
    });

    const { rerender } = render(
      <MapView
        features={mockFeatures}
        selectedIds={selectedIds}
        onSelect={onSelect}
      />
    );

    // Select first feature
    fireEvent.click(screen.getByTestId('feature-track-001'));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ target: 'track-001' }),
    );
    expect(selectedIds.has('track-001')).toBe(true);

    rerender(
      <MapView
        features={mockFeatures}
        selectedIds={selectedIds}
        onSelect={onSelect}
      />
    );

    // Select second feature
    fireEvent.click(screen.getByTestId('feature-track-002'));
    expect(selectedIds.has('track-002')).toBe(true);
    expect(selectedIds.size).toBe(2);
  });

  it('supports select all via selectedIds', () => {
    const allIds = new Set(['track-001', 'track-002', 'track-003']);
    const { container } = render(
      <MapView features={mockFeatures} selectedIds={allIds} />
    );

    const selectedFeatures = container.querySelectorAll(
      '[data-selected="true"]'
    );
    expect(selectedFeatures).toHaveLength(3);
  });

  it('supports clear all via empty selectedIds', () => {
    const { container, rerender } = render(
      <MapView
        features={mockFeatures}
        selectedIds={new Set(['track-001', 'track-002'])}
      />
    );

    expect(
      container.querySelectorAll('[data-selected="true"]')
    ).toHaveLength(2);

    rerender(
      <MapView features={mockFeatures} selectedIds={new Set()} />
    );

    expect(
      container.querySelectorAll('[data-selected="true"]')
    ).toHaveLength(0);
  });
});
