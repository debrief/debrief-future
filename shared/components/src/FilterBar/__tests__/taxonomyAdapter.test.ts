import { describe, it, expect } from 'vitest';
import { taxonomyToCascadingItems } from '../taxonomyAdapter';
import type { VesselTaxonomyNode } from '../../filter-engine';

describe('taxonomyToCascadingItems', () => {
  it('converts a simple tree', () => {
    const nodes: VesselTaxonomyNode[] = [
      { id: 'surface', label: 'Surface' },
      { id: 'submarine', label: 'Submarine' },
    ];

    const items = taxonomyToCascadingItems(nodes);
    expect(items).toEqual([
      { id: 'surface', label: 'Surface', submenu: undefined },
      { id: 'submarine', label: 'Submarine', submenu: undefined },
    ]);
  });

  it('converts nested children', () => {
    const nodes: VesselTaxonomyNode[] = [
      {
        id: 'surface',
        label: 'Surface',
        children: [
          {
            id: 'warship',
            label: 'Warship',
            children: [
              { id: 'frigate', label: 'Frigate' },
            ],
          },
        ],
      },
    ];

    const items = taxonomyToCascadingItems(nodes);
    expect(items).toHaveLength(1);
    expect(items[0]!.submenu).toHaveLength(1);
    expect(items[0]!.submenu![0]!.id).toBe('warship');
    expect(items[0]!.submenu![0]!.submenu).toHaveLength(1);
    expect(items[0]!.submenu![0]!.submenu![0]!.id).toBe('frigate');
  });

  it('handles empty tree', () => {
    const items = taxonomyToCascadingItems([]);
    expect(items).toEqual([]);
  });

  it('leaf nodes have no submenu', () => {
    const nodes: VesselTaxonomyNode[] = [
      { id: 'type23', label: 'Type 23' },
    ];

    const items = taxonomyToCascadingItems(nodes);
    expect(items[0]!.submenu).toBeUndefined();
  });
});
