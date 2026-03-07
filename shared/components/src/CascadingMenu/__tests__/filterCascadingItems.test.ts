import { describe, it, expect } from 'vitest';
import { filterCascadingItems } from '../filterCascadingItems';
import type { CascadingMenuItem } from '../CascadingMenu';

const TREE: CascadingMenuItem[] = [
  {
    id: 'surface',
    label: 'Surface Vessel',
    submenu: [
      {
        id: 'warship',
        label: 'Warship',
        submenu: [
          {
            id: 'frigate',
            label: 'Frigate',
            submenu: [
              { id: 'type23', label: 'Type 23 Frigate' },
              { id: 'type26', label: 'Type 26 Frigate' },
            ],
          },
          {
            id: 'destroyer',
            label: 'Destroyer',
            submenu: [
              { id: 'type45', label: 'Type 45 Destroyer' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'subsurface',
    label: 'Subsurface Vessel',
    submenu: [
      {
        id: 'submarine',
        label: 'Submarine',
        submenu: [
          { id: 'ssn', label: 'Astute-class SSN' },
        ],
      },
    ],
  },
];

describe('filterCascadingItems', () => {
  it('returns full tree when query is empty', () => {
    const result = filterCascadingItems(TREE, '');
    expect(result).toEqual(TREE);
  });

  it('returns full tree when query is whitespace', () => {
    const result = filterCascadingItems(TREE, '   ');
    expect(result).toEqual(TREE);
  });

  it('filters by case-insensitive substring match', () => {
    const result = filterCascadingItems(TREE, 'frig');
    // Should match "Frigate", "Type 23 Frigate", "Type 26 Frigate"
    // and include ancestors: Surface Vessel > Warship
    expect(result).toHaveLength(1); // Only Surface branch matches
    expect(result[0]!.id).toBe('surface');
    expect(result[0]!.submenu).toHaveLength(1);
    expect(result[0]!.submenu![0]!.id).toBe('warship');
    expect(result[0]!.submenu![0]!.submenu).toHaveLength(1); // Only Frigate branch
    expect(result[0]!.submenu![0]!.submenu![0]!.id).toBe('frigate');
  });

  it('preserves ancestor chain for matching leaf nodes', () => {
    const result = filterCascadingItems(TREE, 'type 23');
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('surface');
    const warship = result[0]!.submenu![0]!;
    expect(warship.id).toBe('warship');
    const frigate = warship.submenu![0]!;
    expect(frigate.id).toBe('frigate');
    expect(frigate.submenu).toHaveLength(1);
    expect(frigate.submenu![0]!.id).toBe('type23');
  });

  it('returns empty array when no matches', () => {
    const result = filterCascadingItems(TREE, 'xyz');
    expect(result).toEqual([]);
  });

  it('matches across different branches', () => {
    // "type" matches Type 23, Type 26, Type 45
    const result = filterCascadingItems(TREE, 'type');
    expect(result).toHaveLength(1); // Surface only (subsurface has no "type")
    const warship = result[0]!.submenu![0]!;
    expect(warship.submenu).toHaveLength(2); // Both Frigate and Destroyer branches
  });

  it('matches leaf from a different branch', () => {
    const result = filterCascadingItems(TREE, 'astute');
    expect(result).toHaveLength(1); // Subsurface branch
    expect(result[0]!.id).toBe('subsurface');
    expect(result[0]!.submenu![0]!.id).toBe('submarine');
    expect(result[0]!.submenu![0]!.submenu![0]!.id).toBe('ssn');
  });

  it('handles special characters safely (no regex)', () => {
    // Should not throw — String.includes handles special chars fine
    const result = filterCascadingItems(TREE, '(');
    expect(result).toEqual([]);
  });

  it('handles empty items array', () => {
    const result = filterCascadingItems([], 'test');
    expect(result).toEqual([]);
  });

  it('includes branch node that matches even if children do not', () => {
    const result = filterCascadingItems(TREE, 'warship');
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('surface');
    const warship = result[0]!.submenu![0]!;
    expect(warship.id).toBe('warship');
    // When branch matches, all its children should be included
    expect(warship.submenu).toHaveLength(2);
  });
});
