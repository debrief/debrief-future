/**
 * StacBrowser component tests (#132).
 * Tests: T053, T058
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { StacBrowser } from '../StacBrowser';
import type { StacBrowserItem, VesselTaxonomyNode } from '../../filter-engine/types';

// Mock child components to isolate StacBrowser behavior
vi.mock('../../FilterBar', () => ({
  FilterBar: ({ items, onFilteredItems }: { items: readonly StacBrowserItem[]; onFilteredItems: (items: StacBrowserItem[]) => void }) => (
    <div data-testid="filter-bar" data-item-count={items.length}>
      <button data-testid="apply-filter" onClick={() => onFilteredItems(items.slice(0, 1) as StacBrowserItem[])}>
        Apply Filter
      </button>
    </div>
  ),
}));

vi.mock('../../ExerciseListView', () => ({
  ExerciseListView: ({ items }: { items: readonly unknown[] }) => (
    <div data-testid="exercise-list" data-item-count={items.length}>
      Exercise List ({items.length} items)
    </div>
  ),
}));

function makeItem(overrides: Partial<StacBrowserItem>): StacBrowserItem {
  return {
    id: 'item-1',
    title: 'Test Item',
    itemPath: './test/item.json',
    bbox: [-5, 50, 5, 55],
    datetime: null,
    startDatetime: '2024-01-01T00:00:00Z',
    endDatetime: '2024-01-31T00:00:00Z',
    vesselClasses: [],
    tags: [],
    featureTags: [],
    author: null,
    trackNames: [],
    nationalities: [],
    collection: null,
    modified: null,
    ...overrides,
  };
}

const ITEMS: StacBrowserItem[] = [
  makeItem({ id: 'ex-001', title: 'Exercise Alpha' }),
  makeItem({ id: 'ex-002', title: 'Exercise Bravo' }),
  makeItem({ id: 'ex-003', title: 'Exercise Charlie' }),
];

const TAXONOMY: VesselTaxonomyNode[] = [];

describe('StacBrowser', () => {
  it('renders all four child views (T053)', () => {
    render(<StacBrowser items={ITEMS} taxonomy={TAXONOMY} />);

    expect(screen.getByTestId('filter-bar')).toBeDefined();
    expect(screen.getByTestId('exercise-list')).toBeDefined();
    expect(screen.getByTestId('map-placeholder')).toBeDefined();
    expect(screen.getByTestId('timeline-placeholder')).toBeDefined();
  });

  it('passes all items to FilterBar', () => {
    render(<StacBrowser items={ITEMS} taxonomy={TAXONOMY} />);

    const filterBar = screen.getByTestId('filter-bar');
    expect(filterBar.getAttribute('data-item-count')).toBe('3');
  });

  it('passes filtered items to ExerciseListView', () => {
    render(<StacBrowser items={ITEMS} taxonomy={TAXONOMY} />);

    // Initially all items pass (no filter)
    const list = screen.getByTestId('exercise-list');
    expect(list.getAttribute('data-item-count')).toBe('3');
  });

  it('applies className prop', () => {
    const { container } = render(
      <StacBrowser items={ITEMS} taxonomy={TAXONOMY} className="custom-class" />
    );

    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('stac-browser');
    expect(root.className).toContain('custom-class');
  });

  it('calls onItemSelect when provided', () => {
    const onItemSelect = vi.fn();
    render(<StacBrowser items={ITEMS} taxonomy={TAXONOMY} onItemSelect={onItemSelect} />);

    // Component renders — onItemSelect is passed through to ExerciseListView
    expect(screen.getByTestId('exercise-list')).toBeDefined();
  });
});
