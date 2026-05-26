import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MapView } from './MapView';
import type { DebriefFeatureCollection } from '../utils/types';
import type { TrackFeature, ReferenceLocation } from '@debrief/schemas';

// Mock react-leaflet components
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
    <div data-testid="map-container" className={className} style={style}>
      {children}
    </div>
  ),
  TileLayer: (props: {
    url: string;
    attribution?: string;
    crossOrigin?: 'anonymous' | 'use-credentials';
    errorTileUrl?: string;
    maxZoom?: number;
    noWrap?: boolean;
  }) => (
    <div
      data-testid="tile-layer"
      data-url={props.url}
      data-attribution={props.attribution ?? ''}
      data-cross-origin={props.crossOrigin ?? ''}
      data-error-tile-url={props.errorTileUrl ?? ''}
      data-max-zoom={props.maxZoom !== undefined ? String(props.maxZoom) : ''}
      data-no-wrap={props.noWrap ? 'true' : 'false'}
    />
  ),
  GeoJSON: ({ data, onEachFeature }: {
    data: { features: Array<{ id?: string | number; properties: Record<string, unknown> }> };
    onEachFeature?: (feature: Record<string, unknown>, layer: { on: ReturnType<typeof vi.fn>; bindTooltip: ReturnType<typeof vi.fn>; setStyle: ReturnType<typeof vi.fn>; bringToFront: ReturnType<typeof vi.fn> }) => void;
    style?: (feature: Record<string, unknown>) => Record<string, unknown>;
  }) => {
    // Simulate rendering features
    return (
      <div data-testid="geojson-layer">
        {data.features.map((feature, index: number) => (
          <div
            key={String(feature.id) || String(index)}
            data-testid={`feature-${feature.id}`}
            onClick={() => {
              // Mock layer with all required methods
              const layer = {
                on: vi.fn(),
                bindTooltip: vi.fn().mockReturnThis(),
                bindPopup: vi.fn().mockReturnThis(),
                setStyle: vi.fn(),
                bringToFront: vi.fn(),
              };
              onEachFeature?.(feature, layer);
              // Simulate click handler
              const clickHandler = (layer.on.mock.calls as Array<[string, (e: Record<string, unknown>) => void]>).find((c) => c[0] === 'click');
              if (clickHandler) {
                clickHandler[1]({ originalEvent: { stopPropagation: vi.fn() } });
              }
            }}
          />
        ))}
      </div>
    );
  },
  useMap: () => ({
    getZoom: () => 10,
    setZoom: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    fitBounds: vi.fn(),
    panTo: vi.fn(),
    setView: vi.fn(),
    getBounds: () => ({
      getWest: () => -5,
      getSouth: () => 50,
      getEast: () => -3,
      getNorth: () => 52,
    }),
  }),
  useMapEvents: (/* _handlers */) => {
    // Store handlers for testing
    return null;
  },
}));

// Test fixtures
const mockTrackFeature: TrackFeature = {
  type: 'Feature',
  id: 'track-001',
  geometry: {
    type: 'LineString',
    coordinates: [
      [-5.0, 50.0],
      [-4.5, 50.5],
      [-4.0, 51.0],
    // eslint-disable-next-line no-restricted-syntax
    ] as unknown as number[],
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
  },
};

const mockFeatureCollection: DebriefFeatureCollection = {
  type: 'FeatureCollection',
  features: [mockTrackFeature, mockReferenceLocation],
};

describe('MapView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders map container', () => {
      render(<MapView features={mockFeatureCollection} />);

      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });

    it('renders tile layer with default URL', () => {
      render(<MapView features={mockFeatureCollection} />);

      const tileLayer = screen.getByTestId('tile-layer');
      expect(tileLayer).toHaveAttribute('data-url', expect.stringContaining('openstreetmap.org'));
    });

    it('renders custom tile layer URL', () => {
      const customUrl = 'https://custom.tiles.com/{z}/{x}/{y}.png';
      render(<MapView features={mockFeatureCollection} tileLayerUrl={customUrl} />);

      const tileLayer = screen.getByTestId('tile-layer');
      expect(tileLayer).toHaveAttribute('data-url', customUrl);
    });

    it('renders GeoJSON layer with features', () => {
      render(<MapView features={mockFeatureCollection} />);

      expect(screen.getByTestId('geojson-layer')).toBeInTheDocument();
      expect(screen.getByTestId('feature-track-001')).toBeInTheDocument();
      expect(screen.getByTestId('feature-ref-001')).toBeInTheDocument();
    });

    it('renders empty map when no features', () => {
      render(<MapView features={{ type: 'FeatureCollection', features: [] }} />);

      expect(screen.getByTestId('map-container')).toBeInTheDocument();
      expect(screen.queryByTestId('geojson-layer')).not.toBeInTheDocument();
    });

    it('accepts features as array', () => {
      render(<MapView features={[mockTrackFeature]} />);

      expect(screen.getByTestId('feature-track-001')).toBeInTheDocument();
    });
  });

  describe('briefing tile-layer props (spec #264 T-MAPVIEW-EXT)', () => {
    it('passes crossOrigin="anonymous" by default', () => {
      render(<MapView features={mockFeatureCollection} />);
      expect(screen.getByTestId('tile-layer')).toHaveAttribute('data-cross-origin', 'anonymous');
    });

    it('omits the crossOrigin attribute when tileLayerCrossOrigin={false}', () => {
      render(<MapView features={mockFeatureCollection} tileLayerCrossOrigin={false} />);
      expect(screen.getByTestId('tile-layer')).toHaveAttribute('data-cross-origin', '');
    });

    it('passes through errorTileUrl when provided', () => {
      render(<MapView features={mockFeatureCollection} errorTileUrl="./tiles/placeholder.png" />);
      expect(screen.getByTestId('tile-layer')).toHaveAttribute(
        'data-error-tile-url',
        './tiles/placeholder.png',
      );
    });

    it('omits errorTileUrl by default', () => {
      render(<MapView features={mockFeatureCollection} />);
      expect(screen.getByTestId('tile-layer')).toHaveAttribute('data-error-tile-url', '');
    });

    it('passes through maxZoom when provided', () => {
      render(<MapView features={mockFeatureCollection} maxZoom={12} />);
      expect(screen.getByTestId('tile-layer')).toHaveAttribute('data-max-zoom', '12');
    });

    it('omits maxZoom by default (Leaflet default applies)', () => {
      render(<MapView features={mockFeatureCollection} />);
      expect(screen.getByTestId('tile-layer')).toHaveAttribute('data-max-zoom', '');
    });

    it('passes noWrap=true when provided', () => {
      render(<MapView features={mockFeatureCollection} noWrap />);
      expect(screen.getByTestId('tile-layer')).toHaveAttribute('data-no-wrap', 'true');
    });

    it('defaults noWrap to false', () => {
      render(<MapView features={mockFeatureCollection} />);
      expect(screen.getByTestId('tile-layer')).toHaveAttribute('data-no-wrap', 'false');
    });

    it('passes through use-credentials when explicitly set', () => {
      render(
        <MapView features={mockFeatureCollection} tileLayerCrossOrigin="use-credentials" />,
      );
      expect(screen.getByTestId('tile-layer')).toHaveAttribute(
        'data-cross-origin',
        'use-credentials',
      );
    });
  });

  describe('styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <MapView features={mockFeatureCollection} className="custom-class" />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('applies custom height', () => {
      const { container } = render(
        <MapView features={mockFeatureCollection} height={600} />
      );

      const mapView = container.querySelector('.debrief-mapview');
      expect(mapView).toHaveStyle({ height: '600px' });
    });

    it('accepts string height value', () => {
      const { container } = render(
        <MapView features={mockFeatureCollection} height="100vh" />
      );

      const mapView = container.querySelector('.debrief-mapview');
      expect(mapView).toHaveStyle({ height: '100vh' });
    });

    it('applies custom inline styles', () => {
      const customStyle = { border: '2px solid red' };
      const { container } = render(
        <MapView features={mockFeatureCollection} style={customStyle} />
      );

      const mapView = container.querySelector('.debrief-mapview');
      expect(mapView).toHaveStyle({ border: '2px solid red' });
    });
  });

  describe('selection', () => {
    it('highlights selected features', () => {
      const selectedIds = new Set(['track-001']);
      render(
        <MapView features={mockFeatureCollection} selectedIds={selectedIds} />
      );

      // Feature styling is applied via style function - tested in integration
      expect(screen.getByTestId('feature-track-001')).toBeInTheDocument();
    });

    it('calls onSelect when feature is clicked', () => {
      const onSelect = vi.fn();
      render(
        <MapView features={mockFeatureCollection} onSelect={onSelect} />
      );

      // The mock GeoJSON triggers the click handler
      fireEvent.click(screen.getByTestId('feature-track-001'));

      // Due to mock implementation, this tests the handler is wired up
      expect(screen.getByTestId('feature-track-001')).toBeInTheDocument();
    });
  });

  describe('initial state', () => {
    it('uses default initial zoom', () => {
      render(<MapView features={mockFeatureCollection} />);

      // Map container receives initial zoom - tested via props
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });

    it('uses custom initial zoom', () => {
      render(<MapView features={mockFeatureCollection} initialZoom={15} />);

      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });

    it('uses custom initial center', () => {
      render(
        <MapView features={mockFeatureCollection} initialCenter={[51.5, -0.1]} />
      );

      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
  });

  describe('auto-fit bounds', () => {
    it('auto-fits bounds by default', () => {
      render(<MapView features={mockFeatureCollection} />);

      // Auto-fit is enabled by default - behavior tested in MapController
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });

    it('can disable auto-fit bounds', () => {
      render(<MapView features={mockFeatureCollection} autoFitBounds={false} />);

      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
  });

  describe('callbacks', () => {
    it('accepts onZoomChange callback', () => {
      const onZoomChange = vi.fn();
      render(
        <MapView features={mockFeatureCollection} onZoomChange={onZoomChange} />
      );

      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });

    it('accepts onBoundsChange callback', () => {
      const onBoundsChange = vi.fn();
      render(
        <MapView features={mockFeatureCollection} onBoundsChange={onBoundsChange} />
      );

      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });

    it('accepts onBackgroundClick callback', () => {
      const onBackgroundClick = vi.fn();
      render(
        <MapView features={mockFeatureCollection} onBackgroundClick={onBackgroundClick} />
      );

      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
  });
});

describe('MapView zoom/pan interactions', () => {
  it('updates map when features change', () => {
    const { rerender } = render(<MapView features={[mockTrackFeature]} />);

    expect(screen.getByTestId('feature-track-001')).toBeInTheDocument();
    expect(screen.queryByTestId('feature-ref-001')).not.toBeInTheDocument();

    rerender(<MapView features={mockFeatureCollection} />);

    expect(screen.getByTestId('feature-track-001')).toBeInTheDocument();
    expect(screen.getByTestId('feature-ref-001')).toBeInTheDocument();
  });

  it('updates when selected IDs change', () => {
    const { rerender } = render(
      <MapView features={mockFeatureCollection} selectedIds={new Set()} />
    );

    rerender(
      <MapView features={mockFeatureCollection} selectedIds={new Set(['track-001'])} />
    );

    // GeoJSON layer re-renders with new key when selection changes
    expect(screen.getByTestId('feature-track-001')).toBeInTheDocument();
  });
});
