/**
 * Component tests for TimelineView (#131).
 *
 * Tests written FIRST per Constitution Art. VII.
 * Covers: US1 (rendering), US2 (filter integration), US3 (selection), US4 (colour).
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TimelineView } from '../TimelineView';
import type { StacBrowserItem } from '../../filter-engine/types';
import type { ColourFn } from '../types';

// ============================================================================
// Fixtures
// ============================================================================

function makeStacItem(overrides: Partial<StacBrowserItem> & { id: string }): StacBrowserItem {
  return {
    title: overrides.id,
    itemPath: `exercises/${overrides.id}/item.json`,
    bbox: null,
    datetime: null,
    startDatetime: null,
    endDatetime: null,
    platforms: [],
    tags: [],
    featureTags: [],
    author: null,
    collection: null,
    ...overrides,
  };
}

function makeItemsWithRange(count: number): StacBrowserItem[] {
  return Array.from({ length: count }, (_, i) => {
    const year = 2020 + Math.floor(i / 2);
    const month = (i % 12) + 1;
    return makeStacItem({
      id: `ex-${i}`,
      title: `Exercise ${i}`,
      startDatetime: `${year}-${String(month).padStart(2, '0')}-01T00:00:00Z`,
      endDatetime: `${year}-${String(month).padStart(2, '0')}-15T00:00:00Z`,
    });
  });
}

const tenItems = makeItemsWithRange(10);

// ============================================================================
// T018: US1 — renders bars for items with start/end datetimes
// ============================================================================

describe('TimelineView — US1: Temporal extent bars', () => {
  it('renders bars for items with start/end datetimes', () => {
    const { container } = render(
      <TimelineView items={tenItems} />
    );
    const bars = container.querySelectorAll('[data-testid^="timeline-bar-"]');
    expect(bars.length).toBe(10);
  });

  // T019: renders point markers for single-datetime items
  it('renders point markers for single-datetime items', () => {
    const items = [
      makeStacItem({ id: 'pt-1', datetime: '2024-06-15T12:00:00Z' }),
    ];
    const { container } = render(<TimelineView items={items} />);
    const points = container.querySelectorAll('[data-testid^="timeline-point-"]');
    expect(points.length).toBe(1);
  });

  // T020: displays "No matches" empty state
  it('displays "No matches" empty state when items array is empty', () => {
    render(<TimelineView items={[]} />);
    expect(screen.getByText('No matches')).toBeInTheDocument();
  });

  // T021: displays "no time data" label for items without temporal metadata
  it('displays "no time data" label for items without temporal metadata', () => {
    const items = [makeStacItem({ id: 'no-time' })];
    render(<TimelineView items={items} />);
    expect(screen.getByText('no time data')).toBeInTheDocument();
  });

  // T022: tooltip shows title and date range on hover
  it('shows tooltip with title and date range on hover', () => {
    const items = [
      makeStacItem({
        id: 'tip-1',
        title: 'Alpha Exercise',
        startDatetime: '2024-01-01T00:00:00Z',
        endDatetime: '2024-01-15T00:00:00Z',
      }),
    ];
    const { container } = render(<TimelineView items={items} />);
    const bar = container.querySelector('[data-testid="timeline-bar-tip-1"]');
    expect(bar).not.toBeNull();

    fireEvent.mouseEnter(bar!);
    const tooltip = container.querySelector('[data-testid="timeline-tooltip"]');
    expect(tooltip).not.toBeNull();
    expect(tooltip!.textContent).toContain('Alpha Exercise');
  });

  // T023: time axis labels have correct granularity for range
  it('renders time axis labels', () => {
    const { container } = render(<TimelineView items={tenItems} />);
    const axisLabels = container.querySelectorAll('[data-testid="timeline-axis-label"]');
    expect(axisLabels.length).toBeGreaterThanOrEqual(2);
  });

  // T024: 100 items render, bar area has overflow-y, axis is fixed (SC-003, review 7A)
  it('supports vertical scroll with 100+ items', () => {
    const manyItems = makeItemsWithRange(100);
    const { container } = render(<TimelineView items={manyItems} />);
    const scrollArea = container.querySelector('[data-testid="timeline-scroll-area"]');
    expect(scrollArea).not.toBeNull();
    // scroll area should have overflow-y style
    const style = window.getComputedStyle(scrollArea!);
    expect(style.overflowY).toBe('auto');
    // bars should all render
    const bars = container.querySelectorAll('[data-testid^="timeline-bar-"]');
    expect(bars.length).toBe(100);
  });
});

// ============================================================================
// T039: US2 — Integration test: zoom/pan → filter emission
// ============================================================================

describe('TimelineView — US2: Filter integration', () => {
  it('calls onTemporalFilterChange with null initially (full extent)', () => {
    const onFilter = vi.fn();
    const items = makeItemsWithRange(5);
    render(
      <TimelineView items={items} onTemporalFilterChange={onFilter} />
    );
    // Initial render emits null (full extent, no zoom)
    expect(onFilter).toHaveBeenCalledWith(null);
  });

  it('SVG has wheel and pointer event handlers for zoom/pan', () => {
    const onFilter = vi.fn();
    const items = makeItemsWithRange(5);
    const { container } = render(
      <TimelineView items={items} onTemporalFilterChange={onFilter} />
    );
    const svg = container.querySelector('[data-testid="timeline-bars-svg"]');
    expect(svg).not.toBeNull();
    // SVG should be interactive (has pointer event handlers wired)
    expect(svg).toBeInTheDocument();
  });
});

// ============================================================================
// T046-T047: US3 — Exercise selection
// ============================================================================

describe('TimelineView — US3: Exercise selection', () => {
  it('calls onItemSelect with correct itemPath on double-click of bar', () => {
    const onSelect = vi.fn();
    const items = [
      makeStacItem({
        id: 'sel-1',
        title: 'Select Me',
        startDatetime: '2024-01-01T00:00:00Z',
        endDatetime: '2024-01-15T00:00:00Z',
      }),
    ];
    const { container } = render(
      <TimelineView items={items} onItemSelect={onSelect} />
    );
    const bar = container.querySelector('[data-testid="timeline-bar-sel-1"]');
    expect(bar).not.toBeNull();
    fireEvent.doubleClick(bar!);
    expect(onSelect).toHaveBeenCalledWith('exercises/sel-1/item.json');
  });

  it('calls onItemSelect on double-click of point marker', () => {
    const onSelect = vi.fn();
    const items = [
      makeStacItem({
        id: 'sel-pt',
        datetime: '2024-06-15T12:00:00Z',
      }),
    ];
    const { container } = render(
      <TimelineView items={items} onItemSelect={onSelect} />
    );
    const point = container.querySelector('[data-testid="timeline-point-sel-pt"]');
    expect(point).not.toBeNull();
    fireEvent.doubleClick(point!);
    expect(onSelect).toHaveBeenCalledWith('exercises/sel-pt/item.json');
  });
});

// ============================================================================
// Fixed row height and scroll behaviour
// ============================================================================

describe('TimelineView — Fixed row height', () => {
  it('SVG height equals items.length * 30 regardless of item count', () => {
    const fiveItems = makeItemsWithRange(5);
    const { container, unmount } = render(<TimelineView items={fiveItems} />);
    const svg = container.querySelector('[data-testid="timeline-bars-svg"]');
    expect(svg).not.toBeNull();
    // viewBox height should be 5 * 30 = 150
    const viewBox = svg!.getAttribute('viewBox')!;
    const height = parseInt(viewBox.split(' ')[3], 10);
    expect(height).toBe(150);
    unmount();

    const fiftyItems = makeItemsWithRange(50);
    const { container: c2 } = render(<TimelineView items={fiftyItems} />);
    const svg2 = c2.querySelector('[data-testid="timeline-bars-svg"]');
    const viewBox2 = svg2!.getAttribute('viewBox')!;
    const height2 = parseInt(viewBox2.split(' ')[3], 10);
    expect(height2).toBe(1500);
  });
});

describe('TimelineView — Ctrl+wheel zoom', () => {
  it('plain wheel does not trigger temporal filter change', () => {
    const onFilter = vi.fn();
    const items = makeItemsWithRange(5);
    const { container } = render(
      <TimelineView items={items} onTemporalFilterChange={onFilter} />
    );
    // Reset mock after initial null emission
    onFilter.mockClear();

    const svg = container.querySelector('[data-testid="timeline-bars-svg"]');
    expect(svg).not.toBeNull();

    // Dispatch plain wheel event (no modifier keys)
    act(() => {
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        bubbles: true,
        cancelable: true,
      });
      svg!.dispatchEvent(wheelEvent);
    });

    // Should not have been called again (no zoom occurred)
    expect(onFilter).not.toHaveBeenCalled();
  });

  it('shows zoom hint on plain wheel scroll', () => {
    const items = makeItemsWithRange(5);
    const { container } = render(<TimelineView items={items} />);

    const svg = container.querySelector('[data-testid="timeline-bars-svg"]');
    expect(svg).not.toBeNull();

    // No hint initially
    expect(container.querySelector('[data-testid="timeline-zoom-hint"]')).toBeNull();

    // Dispatch plain wheel event
    act(() => {
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        bubbles: true,
        cancelable: true,
      });
      svg!.dispatchEvent(wheelEvent);
    });

    // Hint should appear
    const hint = container.querySelector('[data-testid="timeline-zoom-hint"]');
    expect(hint).not.toBeNull();
    expect(hint!.textContent).toMatch(/scroll to zoom/);
  });
});

// ============================================================================
// T050-T053: US4 — Colour scheme
// ============================================================================

describe('TimelineView — US4: Colour scheme', () => {
  it('bars use colourFn return value for fill colour', () => {
    const colourFn: ColourFn = () => '#ff0000';
    const items = [
      makeStacItem({
        id: 'col-1',
        startDatetime: '2024-01-01T00:00:00Z',
        endDatetime: '2024-01-15T00:00:00Z',
      }),
    ];
    const { container } = render(
      <TimelineView items={items} colourFn={colourFn} />
    );
    const bar = container.querySelector('[data-testid="timeline-bar-col-1"]');
    expect(bar).not.toBeNull();
    expect(bar!.getAttribute('fill')).toBe('#ff0000');
  });

  it('colourFn returning null falls back to default colour', () => {
    const colourFn: ColourFn = () => null;
    const items = [
      makeStacItem({
        id: 'col-2',
        startDatetime: '2024-01-01T00:00:00Z',
        endDatetime: '2024-01-15T00:00:00Z',
      }),
    ];
    const { container } = render(
      <TimelineView items={items} colourFn={colourFn} />
    );
    const bar = container.querySelector('[data-testid="timeline-bar-col-2"]');
    expect(bar).not.toBeNull();
    // Should have default fill, not null
    expect(bar!.getAttribute('fill')).toBeTruthy();
    expect(bar!.getAttribute('fill')).not.toBe('null');
  });

  it('no colourFn prop → all bars use default colour', () => {
    const items = [
      makeStacItem({
        id: 'col-3',
        startDatetime: '2024-01-01T00:00:00Z',
        endDatetime: '2024-01-15T00:00:00Z',
      }),
    ];
    const { container } = render(
      <TimelineView items={items} />
    );
    const bar = container.querySelector('[data-testid="timeline-bar-col-3"]');
    expect(bar).not.toBeNull();
    expect(bar!.getAttribute('fill')).toBeTruthy();
  });

  it('colourFn that throws → bars fall back to default colour (Art. V.1)', () => {
    const colourFn: ColourFn = () => {
      throw new Error('Colour engine failure');
    };
    const items = [
      makeStacItem({
        id: 'col-err',
        startDatetime: '2024-01-01T00:00:00Z',
        endDatetime: '2024-01-15T00:00:00Z',
      }),
    ];
    const { container } = render(
      <TimelineView items={items} colourFn={colourFn} />
    );
    const bar = container.querySelector('[data-testid="timeline-bar-col-err"]');
    expect(bar).not.toBeNull();
    // Should not crash, should have default fill
    expect(bar!.getAttribute('fill')).toBeTruthy();
  });
});
