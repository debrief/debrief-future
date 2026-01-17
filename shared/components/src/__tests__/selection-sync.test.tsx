import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useState } from 'react';
import { MapView } from '../MapView';
import { Timeline } from '../Timeline';
import { FeatureList } from '../FeatureList';
import { useSelection } from '../hooks/useSelection';
import { ThemeProvider } from '../ThemeProvider';
import type { DebriefFeatureCollection } from '../utils/types';
import type { TrackFeature } from '@debrief/schemas';

// Mock react-leaflet
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, className }: any) => (
    <div data-testid="map-container" className={className}>
      {children}
    </div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  GeoJSON: ({ data, onEachFeature, style: styleFn }: any) => {
    return (
      <div data-testid="geojson-layer">
        {data.features.map((feature: any, index: number) => {
          const computedStyle = styleFn?.(feature) ?? {};
          const layer = {
            on: vi.fn(),
            bindTooltip: vi.fn().mockReturnThis(),
          };
          onEachFeature?.(feature, layer);

          return (
            <div
              key={feature.id || index}
              data-testid={`map-feature-${feature.id}`}
              data-selected={computedStyle.weight === 4 ? 'true' : 'false'}
              onClick={(e) => {
                const clickHandler = layer.on.mock.calls.find(
                  (c: any[]) => c[0] === 'click'
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
  useMapEvents: () => null,
}));

// Mock @tanstack/react-virtual
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count, estimateSize }: any) => ({
    getVirtualItems: () =>
      Array.from({ length: Math.min(count, 20) }, (_, i) => ({
        index: i,
        key: `item-${i}`,
        start: i * estimateSize(),
        size: estimateSize(),
      })),
    getTotalSize: () => count * estimateSize(),
  }),
}));

// Test fixtures
const createTrack = (id: string, name: string): TrackFeature => ({
  type: 'Feature',
  id,
  geometry: {
    type: 'LineString',
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

// Test wrapper that provides shared selection state
function SelectionSyncTestWrapper({
  children,
}: {
  children: (props: {
    selectedIds: Set<string>;
    onSelect: (id: string) => void;
    onClear: () => void;
  }) => React.ReactNode;
}) {
  const selection = useSelection();

  const handleSelect = (id: string) => {
    selection.toggle(id);
  };

  return (
    <ThemeProvider>
      {children({
        selectedIds: selection.selectedIds,
        onSelect: handleSelect,
        onClear: selection.clear,
      })}
    </ThemeProvider>
  );
}

describe('Cross-Component Selection Sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useSelection hook integration', () => {
    it('useSelection provides shared state for all components', () => {
      function TestComponent() {
        const selection = useSelection();
        return (
          <div>
            <span data-testid="selected-count">{selection.selectedIds.size}</span>
            <button
              data-testid="select-btn"
              onClick={() => selection.select('track-001')}
            >
              Select
            </button>
          </div>
        );
      }

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('selected-count')).toHaveTextContent('0');

      fireEvent.click(screen.getByTestId('select-btn'));

      expect(screen.getByTestId('selected-count')).toHaveTextContent('1');
    });

    it('selection changes propagate to all components using same state', () => {
      function MultiComponentTest() {
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
          <ThemeProvider>
            <div data-testid="selected-display">
              {Array.from(selectedIds).join(',')}
            </div>
            <MapView
              features={mockFeatures}
              selectedIds={selectedIds}
              onSelect={handleSelect}
            />
            <FeatureList
              features={mockFeatures}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              height={200}
            />
          </ThemeProvider>
        );
      }

      render(<MultiComponentTest />);

      // Initially empty
      expect(screen.getByTestId('selected-display')).toHaveTextContent('');

      // Select via map
      fireEvent.click(screen.getByTestId('map-feature-track-001'));

      // Both should show selection
      expect(screen.getByTestId('selected-display')).toHaveTextContent(
        'track-001'
      );
    });
  });

  describe('MapView to FeatureList sync', () => {
    it('selecting on map highlights in feature list', () => {
      function SyncTest() {
        const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

        const handleSelect = (id: string) => {
          setSelectedIds(new Set([id]));
        };

        return (
          <ThemeProvider>
            <MapView
              features={mockFeatures}
              selectedIds={selectedIds}
              onSelect={handleSelect}
            />
            <FeatureList
              features={mockFeatures}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              height={200}
            />
          </ThemeProvider>
        );
      }

      const { container } = render(<SyncTest />);

      // Select on map
      fireEvent.click(screen.getByTestId('map-feature-track-001'));

      // Check FeatureList shows selection
      const selectedRows = container.querySelectorAll(
        '.debrief-feature-row--selected'
      );
      expect(selectedRows.length).toBe(1);
    });
  });

  describe('FeatureList to MapView sync', () => {
    it('selecting in feature list highlights on map', () => {
      function SyncTest() {
        const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

        const handleSelect = (id: string) => {
          setSelectedIds(new Set([id]));
        };

        return (
          <ThemeProvider>
            <MapView
              features={mockFeatures}
              selectedIds={selectedIds}
              onSelect={handleSelect}
            />
            <FeatureList
              features={mockFeatures}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              height={200}
            />
          </ThemeProvider>
        );
      }

      render(<SyncTest />);

      // Find and click feature row
      const featureRow = screen
        .getByText('Contact Alpha')
        .closest('.debrief-feature-row');
      fireEvent.click(featureRow!);

      // Check map shows selection
      expect(screen.getByTestId('map-feature-track-001')).toHaveAttribute(
        'data-selected',
        'true'
      );
    });
  });

  describe('Timeline sync', () => {
    it('Timeline receives selectedIds prop', () => {
      const selectedIds = new Set(['track-001']);

      const { container } = render(
        <ThemeProvider>
          <Timeline
            features={mockFeatures}
            selectedIds={selectedIds}
            height={200}
          />
        </ThemeProvider>
      );

      expect(container.querySelector('.debrief-timeline')).toBeInTheDocument();
    });
  });

  describe('Clear selection', () => {
    it('clearing selection updates all components', () => {
      function SyncTest() {
        const [selectedIds, setSelectedIds] = useState<Set<string>>(
          new Set(['track-001', 'track-002'])
        );

        return (
          <ThemeProvider>
            <button
              data-testid="clear-btn"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </button>
            <MapView
              features={mockFeatures}
              selectedIds={selectedIds}
              onSelect={() => {}}
            />
            <FeatureList
              features={mockFeatures}
              selectedIds={selectedIds}
              onSelect={() => {}}
              height={200}
            />
          </ThemeProvider>
        );
      }

      const { container } = render(<SyncTest />);

      // Initially has selections
      expect(
        container.querySelectorAll('[data-selected="true"]').length
      ).toBeGreaterThan(0);

      // Clear
      fireEvent.click(screen.getByTestId('clear-btn'));

      // All cleared
      expect(
        container.querySelectorAll('.debrief-feature-row--selected').length
      ).toBe(0);
    });
  });

  describe('Multi-select sync', () => {
    it('multi-selection syncs across all components', () => {
      function SyncTest() {
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
          <ThemeProvider>
            <span data-testid="count">{selectedIds.size}</span>
            <MapView
              features={mockFeatures}
              selectedIds={selectedIds}
              onSelect={handleSelect}
            />
            <FeatureList
              features={mockFeatures}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              height={200}
            />
          </ThemeProvider>
        );
      }

      const { container } = render(<SyncTest />);

      // Select first via map
      fireEvent.click(screen.getByTestId('map-feature-track-001'));
      expect(screen.getByTestId('count')).toHaveTextContent('1');

      // Select second via feature list
      const featureRow = screen
        .getByText('Contact Bravo')
        .closest('.debrief-feature-row');
      fireEvent.click(featureRow!);
      expect(screen.getByTestId('count')).toHaveTextContent('2');

      // Both should be highlighted in both components
      expect(screen.getByTestId('map-feature-track-001')).toHaveAttribute(
        'data-selected',
        'true'
      );
      expect(screen.getByTestId('map-feature-track-002')).toHaveAttribute(
        'data-selected',
        'true'
      );
      expect(
        container.querySelectorAll('.debrief-feature-row--selected').length
      ).toBe(2);
    });
  });
});
