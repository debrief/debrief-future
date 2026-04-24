/**
 * FilterBar component tests for the platform chip (#186).
 * Covers U42–U47.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { FilterBar } from '../FilterBar';
import type { FilterBarState } from '../types';
import type {
  FilterExpression,
  StacBrowserItem,
  VesselTaxonomyNode,
} from '../../filter-engine';
import type { PlatformRecord } from '@debrief/schemas';

afterEach(() => cleanup());

const TAXONOMY: VesselTaxonomyNode[] = [
  {
    id: 'surface',
    label: 'Surface',
    children: [
      {
        id: 'warship',
        label: 'Warship',
        children: [{ id: 'frigate', label: 'Frigate' }],
      },
    ],
  },
  {
    id: 'subsurface',
    label: 'Subsurface',
    children: [{ id: 'submarine', label: 'Submarine' }],
  },
];

function makeItem(id: string, platforms: PlatformRecord[], tags: string[] = []): StacBrowserItem {
  return {
    id,
    title: id,
    itemPath: `/${id}.json`,
    bbox: null,
    datetime: null,
    startDatetime: null,
    endDatetime: null,
    platforms,
    tags,
    featureTags: [],
    author: null,
    collection: null,
    modified: null,
  };
}

const ITEMS: StacBrowserItem[] = [
  makeItem('a-british-submarine', [
    { id: 'x', name: 'x', nationality: 'GB', domain: 'subsurface', vessel_role: 'submarine' },
  ]),
  makeItem('b-german-frigate-plus-british-ship', [
    { id: 'g', name: 'g', nationality: 'DE', domain: 'surface', vessel_role: 'frigate' },
    { id: 'br', name: 'br', nationality: 'GB', domain: 'surface', vessel_role: 'destroyer' },
  ]),
  makeItem('c-british-frigate-exercise', [
    { id: 'f', name: 'f', nationality: 'GB', domain: 'surface', vessel_role: 'frigate' },
  ], ['exercise']),
  makeItem('d-empty', []),
];

describe('FilterBar — platform chip integration (#186)', () => {
  let onFilteredItems: ReturnType<typeof vi.fn>;
  let onExpressionChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onFilteredItems = vi.fn();
    onExpressionChange = vi.fn();
  });

  // U42
  it('U42: "Platform" entry appears in the filter-type menu', () => {
    render(
      <FilterBar
        items={ITEMS}
        taxonomy={TAXONOMY}
        onFilteredItems={onFilteredItems}
        onExpressionChange={onExpressionChange}
      />,
    );
    fireEvent.click(screen.getByTestId('filter-add-button'));
    expect(screen.getByTestId('filter-type-platform')).toBeTruthy();
  });

  // U43
  it('U43: selecting Platform opens PlatformValueEditor and NOT ValueEditor', () => {
    render(
      <FilterBar
        items={ITEMS}
        taxonomy={TAXONOMY}
        onFilteredItems={onFilteredItems}
        onExpressionChange={onExpressionChange}
      />,
    );
    fireEvent.click(screen.getByTestId('filter-add-button'));
    fireEvent.click(screen.getByTestId('filter-type-platform'));
    expect(screen.getByTestId('platform-value-editor')).toBeTruthy();
    expect(screen.queryByTestId('value-editor-dropdown')).toBeNull();
    expect(screen.queryByTestId('value-editor-hierarchical')).toBeNull();
  });

  // U44
  it('U44: confirming a platform chip triggers onFilteredItems with the expected subset', async () => {
    render(
      <FilterBar
        items={ITEMS}
        taxonomy={TAXONOMY}
        onFilteredItems={onFilteredItems}
        onExpressionChange={onExpressionChange}
      />,
    );
    fireEvent.click(screen.getByTestId('filter-add-button'));
    fireEvent.click(screen.getByTestId('filter-type-platform'));
    fireEvent.change(
      screen.getByTestId('platform-editor-select-nationality') as HTMLSelectElement,
      { target: { value: 'GB' } },
    );
    fireEvent.change(
      screen.getByTestId('platform-editor-select-domain') as HTMLSelectElement,
      { target: { value: 'subsurface' } },
    );
    fireEvent.click(screen.getByTestId('platform-editor-confirm'));

    await waitFor(() => {
      const lastCall = onFilteredItems.mock.calls.at(-1);
      expect(lastCall).toBeDefined();
      const filtered = lastCall![0] as StacBrowserItem[];
      expect(filtered.map((i) => i.id).sort()).toEqual(['a-british-submarine']);
    });
  });

  // U45
  it('U45: onExpressionChange receives a FilterExpression with arrayFilters populated', async () => {
    render(
      <FilterBar
        items={ITEMS}
        taxonomy={TAXONOMY}
        onFilteredItems={onFilteredItems}
        onExpressionChange={onExpressionChange}
      />,
    );
    fireEvent.click(screen.getByTestId('filter-add-button'));
    fireEvent.click(screen.getByTestId('filter-type-platform'));
    fireEvent.change(
      screen.getByTestId('platform-editor-select-nationality') as HTMLSelectElement,
      { target: { value: 'GB' } },
    );
    fireEvent.click(screen.getByTestId('platform-editor-confirm'));

    await waitFor(() => {
      const lastCall = onExpressionChange.mock.calls.at(-1);
      expect(lastCall).toBeDefined();
      const expr = lastCall![0] as FilterExpression;
      expect(expr.arrayFilters).toBeDefined();
      expect(expr.arrayFilters!.length).toBeGreaterThan(0);
    });
  });

  // U46 — platform chip AND with a simple tag chip
  it('U46: platform chip alongside tag chip ANDs correctly', async () => {
    const initial: FilterBarState = {
      items: [
        {
          kind: 'lozenge',
          shape: 'platform',
          id: 'p1',
          filterType: 'platform',
          attributes: { nationality: 'GB', vessel_role: 'frigate' },
        },
        {
          kind: 'lozenge',
          shape: 'simple',
          id: 's1',
          filterType: 'tag',
          value: 'exercise',
        },
      ],
    };
    render(
      <FilterBar
        items={ITEMS}
        taxonomy={TAXONOMY}
        onFilteredItems={onFilteredItems}
        onExpressionChange={onExpressionChange}
        initialFilterState={initial}
      />,
    );

    await waitFor(() => {
      const lastCall = onFilteredItems.mock.calls.at(-1);
      expect(lastCall).toBeDefined();
      const filtered = lastCall![0] as StacBrowserItem[];
      // Only c-british-frigate-exercise has both a GB frigate and the 'exercise' tag
      expect(filtered.map((i) => i.id)).toEqual(['c-british-frigate-exercise']);
    });
  });

  // U47 — pre-feature saved filter restore (no `shape` field) still works
  it('U47: pre-feature saved filter containing only simple chips restores correctly', async () => {
    // Legacy state shape (no `shape` field) — cast through unknown
    const legacy = {
      items: [
        { kind: 'lozenge', id: 'l1', filterType: 'tag', value: 'exercise' },
      ],
    } as unknown as FilterBarState;

    render(
      <FilterBar
        items={ITEMS}
        taxonomy={TAXONOMY}
        onFilteredItems={onFilteredItems}
        onExpressionChange={onExpressionChange}
        initialFilterState={legacy}
      />,
    );

    await waitFor(() => {
      const lastCall = onFilteredItems.mock.calls.at(-1);
      expect(lastCall).toBeDefined();
      const filtered = lastCall![0] as StacBrowserItem[];
      expect(filtered.map((i) => i.id)).toEqual(['c-british-frigate-exercise']);
    });
  });
});
