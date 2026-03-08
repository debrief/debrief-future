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

  describe('with currentValue option', () => {
    it('sets current: true on matching leaf node', () => {
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

      const items = taxonomyToCascadingItems(nodes, { currentValue: 'surface/warship/frigate' });
      const frigate = items[0]!.submenu![0]!.submenu![0]!;
      expect(frigate.current).toBe(true);
    });

    it('does not mark non-matching nodes as current', () => {
      const nodes: VesselTaxonomyNode[] = [
        { id: 'surface', label: 'Surface' },
        { id: 'submarine', label: 'Submarine' },
      ];

      const items = taxonomyToCascadingItems(nodes, { currentValue: 'surface' });
      expect(items[0]!.current).toBe(true);
      expect(items[1]!.current).toBeUndefined();
    });
  });

  describe('with counts option', () => {
    it('adds badge strings to nodes', () => {
      const nodes: VesselTaxonomyNode[] = [
        { id: 'surface', label: 'Surface' },
        { id: 'submarine', label: 'Submarine' },
      ];
      const counts = new Map([['surface', 12], ['submarine', 3]]);

      const items = taxonomyToCascadingItems(nodes, { counts });
      expect(items[0]!.badge).toBe('(12)');
      expect(items[1]!.badge).toBe('(3)');
    });

    it('sets disabled: true on zero-count nodes when disableEmpty is true', () => {
      const nodes: VesselTaxonomyNode[] = [
        { id: 'surface', label: 'Surface' },
        { id: 'submarine', label: 'Submarine' },
      ];
      const counts = new Map([['surface', 5], ['submarine', 0]]);

      const items = taxonomyToCascadingItems(nodes, { counts, disableEmpty: true });
      expect(items[0]!.disabled).toBeUndefined();
      expect(items[1]!.disabled).toBe(true);
      expect(items[1]!.disabledReason).toBe('No matching items');
    });

    it('does not disable zero-count nodes when disableEmpty is false', () => {
      const nodes: VesselTaxonomyNode[] = [
        { id: 'submarine', label: 'Submarine' },
      ];
      const counts = new Map([['submarine', 0]]);

      const items = taxonomyToCascadingItems(nodes, { counts });
      expect(items[0]!.disabled).toBeUndefined();
    });

    it('passes counts to nested children with full paths', () => {
      const nodes: VesselTaxonomyNode[] = [
        {
          id: 'surface',
          label: 'Surface',
          children: [
            { id: 'warship', label: 'Warship' },
          ],
        },
      ];
      const counts = new Map([['surface', 10], ['surface/warship', 8]]);

      const items = taxonomyToCascadingItems(nodes, { counts });
      expect(items[0]!.badge).toBe('(10)');
      expect(items[0]!.submenu![0]!.badge).toBe('(8)');
    });
  });
});
