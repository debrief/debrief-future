import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { CatalogOverview } from './CatalogOverview';
import type { CatalogOverviewItem } from './types';

// Track moveend callbacks registered by useMapEvents
let moveendCallback: (() => void) | null = null;
let mapBounds: { getSouthWest: () => { lng: number; lat: number }; getNorthEast: () => { lng: number; lat: number }; isValid: () => boolean } | null = null;

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <div data-testid="map-container" style={style}>{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  Rectangle: ({ children, pathOptions, eventHandlers }: {
    children: React.ReactNode;
    bounds: unknown;
    pathOptions: { color: string; weight: number; fillOpacity: number };
    eventHandlers?: { dblclick?: (e: { originalEvent: { preventDefault: () => void; stopPropagation: () => void } }) => void };
  }) => (
    <div
      data-testid="rectangle"
      data-color={pathOptions.color}
      onDoubleClick={() => {
        eventHandlers?.dblclick?.({
          originalEvent: { preventDefault: vi.fn(), stopPropagation: vi.fn() },
        });
      }}
    >
      {children}
    </div>
  ),
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip">{children}</div>
  ),
  useMap: () => ({
    fitBounds: vi.fn(),
    getBounds: () => mapBounds,
  }),
  useMapEvents: (handlers: { moveend?: () => void }) => {
    moveendCallback = handlers.moveend ?? null;
    return {
      getBounds: () => mapBounds,
    };
  },
}));

// ============================================================================
// Fixture data
// ============================================================================

const ITEMS: CatalogOverviewItem[] = [
  {
    id: 'alpha',
    title: 'Exercise Alpha',
    itemPath: 'exercises/alpha/item.json',
    bbox: [-5, 49, 2, 52],
    datetime: '2024-03-15T08:00:00Z',
    startDatetime: '2024-03-15T08:00:00Z',
    endDatetime: '2024-03-17T18:00:00Z',
  },
  {
    id: 'bravo',
    title: 'Exercise Bravo',
    itemPath: 'exercises/bravo/item.json',
    bbox: [10, 30, 15, 35],
    datetime: '2024-04-01T06:00:00Z',
    startDatetime: '2024-04-01T06:00:00Z',
    endDatetime: '2024-04-05T22:00:00Z',
  },
  {
    id: 'no-bbox',
    title: 'No Bbox Item',
    itemPath: 'items/no-bbox/item.json',
    bbox: null,
    datetime: '2024-05-01T12:00:00Z',
    startDatetime: '2024-05-01T12:00:00Z',
    endDatetime: '2024-05-02T12:00:00Z',
  },
];

function setMapBounds(west: number, south: number, east: number, north: number): void {
  mapBounds = {
    getSouthWest: () => ({ lng: west, lat: south }),
    getNorthEast: () => ({ lng: east, lat: north }),
    isValid: () => true,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  moveendCallback = null;
  setMapBounds(-10, 40, 20, 60); // Default: wide viewport showing everything
});

afterEach(() => {
  vi.useRealTimers();
});

// ============================================================================
// T010: US1 — Rendering
// ============================================================================

describe('US1: Spatial footprint rendering', () => {
  it('renders Rectangle for items with bbox', () => {
    render(<CatalogOverview items={ITEMS} />);
    const rectangles = screen.getAllByTestId('rectangle');
    // Only items with bbox should render as Rectangles
    expect(rectangles).toHaveLength(2);
  });

  it('omits items without bbox from the map', () => {
    const noBboxItems: CatalogOverviewItem[] = [
      { id: 'a', title: 'A', itemPath: 'a.json', bbox: null, datetime: '2024-01-01T00:00:00Z', startDatetime: null, endDatetime: null },
    ];
    render(<CatalogOverview items={noBboxItems} />);
    expect(screen.queryAllByTestId('rectangle')).toHaveLength(0);
  });

  it('renders memoized rectangles with correct count for large sets', () => {
    const manyItems = Array.from({ length: 50 }, (_, i) => ({
      id: `item-${i}`,
      title: `Item ${i}`,
      itemPath: `items/${i}/item.json`,
      bbox: [i, i, i + 1, i + 1] as [number, number, number, number],
      datetime: '2024-01-01T00:00:00Z',
      startDatetime: null,
      endDatetime: null,
    }));
    render(<CatalogOverview items={manyItems} />);
    expect(screen.getAllByTestId('rectangle')).toHaveLength(50);
  });
});

// ============================================================================
// T013: US2 — Viewport change callback
// ============================================================================

describe('US2: Viewport change callback', () => {
  it('calls onViewportChange with Bounds after moveend (debounced)', () => {
    const onViewportChange = vi.fn();
    render(<CatalogOverview items={ITEMS} onViewportChange={onViewportChange} />);

    // Clear initial viewport emission
    act(() => { vi.advanceTimersByTime(100); });
    onViewportChange.mockClear();

    setMapBounds(-5, 49, 2, 52);
    act(() => { moveendCallback?.(); });

    // Not called yet (debounced)
    expect(onViewportChange).not.toHaveBeenCalled();

    // Advance past debounce
    act(() => { vi.advanceTimersByTime(200); });
    expect(onViewportChange).toHaveBeenCalledWith([-5, 49, 2, 52]);
  });
});

// ============================================================================
// T014: US2 — Timeline filtering
// ============================================================================

describe('US2: Timeline spatial filtering', () => {
  it('shows only viewport-overlapping items in the timeline after viewport change', () => {
    const { container } = render(<CatalogOverview items={ITEMS} />);

    // Set viewport to only cover alpha's bbox area
    setMapBounds(-6, 48, 3, 53);
    act(() => { moveendCallback?.(); });
    act(() => { vi.advanceTimersByTime(200); });

    // Timeline should show alpha + no-bbox (always included)
    // bravo at [10,30,15,35] should be excluded
    // Check inside the timeline SVG only (not tooltips on the map)
    const timelineSection = container.querySelector('.catalog-overview__timeline');
    const timelineLabels = timelineSection?.querySelectorAll('.catalog-overview__timeline-label') ?? [];
    const labelTexts = Array.from(timelineLabels).map((l) => l.textContent);
    expect(labelTexts).toContain('Exercise Alpha');
    expect(labelTexts).toContain('No Bbox Item');
    // bravo should not be in the timeline
    expect(labelTexts).not.toContain('Exercise Bravo');
  });

  it('items without bbox are always shown in the timeline (FR-005)', () => {
    render(<CatalogOverview items={ITEMS} />);

    // Narrow viewport to exclude everything
    setMapBounds(100, 80, 101, 81);
    act(() => { moveendCallback?.(); });
    act(() => { vi.advanceTimersByTime(200); });

    // no-bbox item should still be visible
    expect(screen.getByText('No Bbox Item')).toBeTruthy();
  });
});

// ============================================================================
// T015: US2 — Empty state overlays
// ============================================================================

describe('US2: Empty state overlays', () => {
  it('shows "No items in this catalog" when items=[]', () => {
    render(<CatalogOverview items={[]} />);
    expect(screen.getByTestId('no-items-message')).toBeTruthy();
    expect(screen.getByText('No items in this catalog')).toBeTruthy();
  });

  it('shows "No spatial data available" when no items have bbox', () => {
    const noBboxItems: CatalogOverviewItem[] = [
      { id: 'a', title: 'A', itemPath: 'a.json', bbox: null, datetime: '2024-01-01T00:00:00Z', startDatetime: null, endDatetime: null },
    ];
    render(<CatalogOverview items={noBboxItems} />);
    expect(screen.getByTestId('no-spatial-data-overlay')).toBeTruthy();
    expect(screen.getByText('No spatial data available')).toBeTruthy();
  });

  it('shows "No exercises in this area" when viewport has no overlapping items', () => {
    const itemsWithBbox: CatalogOverviewItem[] = [
      { id: 'a', title: 'A', itemPath: 'a.json', bbox: [-5, 49, 2, 52], datetime: '2024-01-01T00:00:00Z', startDatetime: null, endDatetime: null },
    ];
    render(<CatalogOverview items={itemsWithBbox} />);

    // Move viewport to area with no items
    setMapBounds(100, 80, 101, 81);
    act(() => { moveendCallback?.(); });
    act(() => { vi.advanceTimersByTime(200); });

    expect(screen.getByTestId('no-matches-overlay')).toBeTruthy();
    expect(screen.getByText('No exercises in this area')).toBeTruthy();
  });
});

// ============================================================================
// T016: US2 — Debounce cleanup
// ============================================================================

describe('US2: Debounce cleanup on unmount', () => {
  it('does not trigger setState after unmount', () => {
    const onViewportChange = vi.fn();
    const { unmount } = render(<CatalogOverview items={ITEMS} onViewportChange={onViewportChange} />);

    // Clear initial
    act(() => { vi.advanceTimersByTime(100); });
    onViewportChange.mockClear();

    // Trigger moveend then unmount before debounce fires
    act(() => { moveendCallback?.(); });
    unmount();
    act(() => { vi.advanceTimersByTime(200); });

    // Should not have been called after unmount
    expect(onViewportChange).not.toHaveBeenCalled();
  });
});

// ============================================================================
// T025: US3 — Colour map
// ============================================================================

describe('US3: Colour map', () => {
  it('uses assigned colour from colorMap', () => {
    const colorMap = new Map([['alpha', '#ff0000'], ['bravo', '#00ff00']]);
    render(<CatalogOverview items={ITEMS} colorMap={colorMap} />);
    const rectangles = screen.getAllByTestId('rectangle');
    expect(rectangles[0].dataset.color).toBe('#ff0000');
    expect(rectangles[1].dataset.color).toBe('#00ff00');
  });

  it('uses default accent colour when colorMap is absent', () => {
    render(<CatalogOverview items={ITEMS} />);
    const rectangles = screen.getAllByTestId('rectangle');
    expect(rectangles[0].dataset.color).toBe('var(--co-accent, #007fd4)');
  });

  it('uses default accent colour when item ID is not in colorMap', () => {
    const colorMap = new Map([['alpha', '#ff0000']]);
    render(<CatalogOverview items={ITEMS} colorMap={colorMap} />);
    const rectangles = screen.getAllByTestId('rectangle');
    expect(rectangles[0].dataset.color).toBe('#ff0000');
    expect(rectangles[1].dataset.color).toBe('var(--co-accent, #007fd4)');
  });
});

// ============================================================================
// T033: US4 — Double-click and tooltip
// ============================================================================

describe('US4: Double-click and tooltip', () => {
  it('triggers onItemSelect on double-click', () => {
    const onItemSelect = vi.fn();
    render(<CatalogOverview items={ITEMS} onItemSelect={onItemSelect} />);
    const rectangles = screen.getAllByTestId('rectangle');
    rectangles[0].dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(onItemSelect).toHaveBeenCalledWith('exercises/alpha/item.json');
  });

  it('shows tooltip with title and date range', () => {
    render(<CatalogOverview items={ITEMS} />);
    const tooltips = screen.getAllByTestId('tooltip');
    expect(tooltips.length).toBeGreaterThan(0);
    // First tooltip should contain alpha's title
    expect(tooltips[0].textContent).toContain('Exercise Alpha');
  });
});
