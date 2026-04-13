import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTaxonomyMatchCounts } from '../useTaxonomyMatchCounts';
import type { StacBrowserItem, VesselTaxonomyNode } from '../../filter-engine';

function makeItem(id: string, vesselClasses: string[]): StacBrowserItem {
  return {
    id,
    title: `Exercise ${id}`,
    itemPath: `/catalog/${id}/item.json`,
    bbox: null,
    datetime: null,
    startDatetime: null,
    endDatetime: null,
    platforms: vesselClasses.map((vc, i) => ({ id: `${id}-p${i}`, vessel_class: vc })),
    tags: [],
    featureTags: [],
    author: null,
    collection: null,
    modified: null,
  };
}

const TAXONOMY: VesselTaxonomyNode[] = [
  {
    id: 'surface',
    label: 'Surface Vessel',
    children: [
      {
        id: 'warship',
        label: 'Warship',
        children: [
          {
            id: 'frigate',
            label: 'Frigate',
            children: [
              { id: 'type23', label: 'Type 23 Frigate' },
              { id: 'type26', label: 'Type 26 Frigate' },
            ],
          },
          {
            id: 'destroyer',
            label: 'Destroyer',
            children: [
              { id: 'type45', label: 'Type 45 Destroyer' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'submarine',
    label: 'Submarine',
    children: [
      { id: 'ssn', label: 'SSN' },
    ],
  },
];

describe('useTaxonomyMatchCounts', () => {
  it('counts leaf nodes correctly', () => {
    const items = [
      makeItem('1', ['surface/warship/frigate/type23']),
      makeItem('2', ['surface/warship/frigate/type23']),
      makeItem('3', ['surface/warship/frigate/type26']),
    ];

    const { result } = renderHook(() => useTaxonomyMatchCounts(items, TAXONOMY));
    const counts = result.current;

    expect(counts.get('surface/warship/frigate/type23')).toBe(2);
    expect(counts.get('surface/warship/frigate/type26')).toBe(1);
  });

  it('aggregates counts for branch nodes', () => {
    const items = [
      makeItem('1', ['surface/warship/frigate/type23']),
      makeItem('2', ['surface/warship/destroyer/type45']),
    ];

    const { result } = renderHook(() => useTaxonomyMatchCounts(items, TAXONOMY));
    const counts = result.current;

    // Both items are warships
    expect(counts.get('surface/warship')).toBe(2);
    // Both are surface
    expect(counts.get('surface')).toBe(2);
    // One frigate, one destroyer
    expect(counts.get('surface/warship/frigate')).toBe(1);
    expect(counts.get('surface/warship/destroyer')).toBe(1);
  });

  it('counts exercises not vessel-type occurrences', () => {
    // An exercise with both type23 and type26 frigates counts ONCE for "frigate"
    const items = [
      makeItem('1', ['surface/warship/frigate/type23', 'surface/warship/frigate/type26']),
    ];

    const { result } = renderHook(() => useTaxonomyMatchCounts(items, TAXONOMY));
    const counts = result.current;

    expect(counts.get('surface/warship/frigate/type23')).toBe(1);
    expect(counts.get('surface/warship/frigate/type26')).toBe(1);
    expect(counts.get('surface/warship/frigate')).toBe(1); // Still 1, not 2
    expect(counts.get('surface/warship')).toBe(1);
    expect(counts.get('surface')).toBe(1);
  });

  it('returns zero for nodes with no matching items', () => {
    const items = [
      makeItem('1', ['surface/warship/frigate/type23']),
    ];

    const { result } = renderHook(() => useTaxonomyMatchCounts(items, TAXONOMY));
    const counts = result.current;

    expect(counts.get('submarine')).toBe(0);
    expect(counts.get('submarine/ssn')).toBe(0);
  });

  it('handles empty items array', () => {
    const { result } = renderHook(() => useTaxonomyMatchCounts([], TAXONOMY));
    const counts = result.current;

    expect(counts.get('surface')).toBe(0);
    expect(counts.get('submarine')).toBe(0);
  });

  it('handles empty taxonomy', () => {
    const items = [makeItem('1', ['surface/warship/frigate/type23'])];
    const { result } = renderHook(() => useTaxonomyMatchCounts(items, []));
    expect(result.current.size).toBe(0);
  });

  it('ignores vessel classes not in taxonomy', () => {
    const items = [
      makeItem('1', ['unknown/path']),
      makeItem('2', ['surface/warship/frigate/type23']),
    ];

    const { result } = renderHook(() => useTaxonomyMatchCounts(items, TAXONOMY));
    const counts = result.current;

    // type23 should count 1
    expect(counts.get('surface/warship/frigate/type23')).toBe(1);
    // The unknown path doesn't affect taxonomy counts
    expect(counts.has('unknown/path')).toBe(false);
  });
});
