import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSavedFilters, generateDefaultName } from '../useSavedFilters';
import { InMemoryStorage } from '../savedFiltersStorage';
import type { FilterBarState, SavedFiltersCollection } from '../types';

const SAMPLE_STATE: FilterBarState = {
  items: [
    { kind: 'lozenge', id: 'l1', filterType: 'nationality', value: 'French' },
    { kind: 'lozenge', id: 'l2', filterType: 'tag', value: 'asw' },
  ],
};

const SAMPLE_CQL2: Record<string, unknown> = { op: 'and', args: [] };

function makeStorage(initial?: SavedFiltersCollection) {
  return new InMemoryStorage(initial);
}

describe('useSavedFilters', () => {
  it('starts with empty configurations when storage is empty', () => {
    const storage = makeStorage();
    const { result } = renderHook(() => useSavedFilters(storage));
    expect(result.current.configurations).toEqual([]);
  });

  it('loads existing configurations from storage', () => {
    const existing: SavedFiltersCollection = {
      version: 1,
      configurations: [
        {
          id: 'c1',
          name: 'My Filter',
          filterBarState: SAMPLE_STATE,
          cql2Json: SAMPLE_CQL2,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };
    const storage = makeStorage(existing);
    const { result } = renderHook(() => useSavedFilters(storage));
    expect(result.current.configurations).toHaveLength(1);
    expect(result.current.configurations[0]!.name).toBe('My Filter');
  });

  describe('saveConfiguration', () => {
    it('saves with a provided name', () => {
      const storage = makeStorage();
      const { result } = renderHook(() => useSavedFilters(storage));

      act(() => result.current.saveConfiguration(SAMPLE_STATE, SAMPLE_CQL2, 'UK Submarines'));

      expect(result.current.configurations).toHaveLength(1);
      expect(result.current.configurations[0]!.name).toBe('UK Submarines');
      expect(result.current.configurations[0]!.filterBarState).toEqual(SAMPLE_STATE);
    });

    it('generates a default name when none provided', () => {
      const storage = makeStorage();
      const { result } = renderHook(() => useSavedFilters(storage));

      act(() => result.current.saveConfiguration(SAMPLE_STATE, SAMPLE_CQL2));

      expect(result.current.configurations[0]!.name).toContain('Nationality');
      expect(result.current.configurations[0]!.name).toContain('Tag');
    });

    it('generates a default name when empty string provided', () => {
      const storage = makeStorage();
      const { result } = renderHook(() => useSavedFilters(storage));

      act(() => result.current.saveConfiguration(SAMPLE_STATE, SAMPLE_CQL2, '   '));

      expect(result.current.configurations[0]!.name).not.toBe('');
    });

    it('places newest configuration first', () => {
      const storage = makeStorage();
      const { result } = renderHook(() => useSavedFilters(storage));

      act(() => result.current.saveConfiguration(SAMPLE_STATE, SAMPLE_CQL2, 'First'));
      act(() => result.current.saveConfiguration(SAMPLE_STATE, SAMPLE_CQL2, 'Second'));

      expect(result.current.configurations[0]!.name).toBe('Second');
      expect(result.current.configurations[1]!.name).toBe('First');
    });

    it('enforces maximum 100 configurations', () => {
      const configs = Array.from({ length: 100 }, (_, i) => ({
        id: `c${i}`,
        name: `Filter ${i}`,
        filterBarState: SAMPLE_STATE,
        cql2Json: SAMPLE_CQL2,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }));
      const storage = makeStorage({ version: 1, configurations: configs });
      const { result } = renderHook(() => useSavedFilters(storage));

      act(() => result.current.saveConfiguration(SAMPLE_STATE, SAMPLE_CQL2, 'Overflow'));

      expect(result.current.configurations).toHaveLength(100);
      expect(result.current.configurations[0]!.name).toBe('Overflow');
    });

    it('persists to storage', () => {
      const storage = makeStorage();
      const saveSpy = vi.spyOn(storage, 'save');
      const { result } = renderHook(() => useSavedFilters(storage));

      act(() => result.current.saveConfiguration(SAMPLE_STATE, SAMPLE_CQL2, 'Test'));

      expect(saveSpy).toHaveBeenCalledTimes(1);
      const saved = saveSpy.mock.calls[0]![0]!;
      expect(saved.configurations).toHaveLength(1);
    });
  });

  describe('deleteConfiguration', () => {
    it('removes a configuration by id', () => {
      const existing: SavedFiltersCollection = {
        version: 1,
        configurations: [
          {
            id: 'c1',
            name: 'To Delete',
            filterBarState: SAMPLE_STATE,
            cql2Json: SAMPLE_CQL2,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      };
      const storage = makeStorage(existing);
      const { result } = renderHook(() => useSavedFilters(storage));

      act(() => result.current.deleteConfiguration('c1'));

      expect(result.current.configurations).toHaveLength(0);
    });

    it('does not affect other configurations', () => {
      const existing: SavedFiltersCollection = {
        version: 1,
        configurations: [
          {
            id: 'c1',
            name: 'Keep',
            filterBarState: SAMPLE_STATE,
            cql2Json: SAMPLE_CQL2,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'c2',
            name: 'Delete',
            filterBarState: SAMPLE_STATE,
            cql2Json: SAMPLE_CQL2,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      };
      const storage = makeStorage(existing);
      const { result } = renderHook(() => useSavedFilters(storage));

      act(() => result.current.deleteConfiguration('c2'));

      expect(result.current.configurations).toHaveLength(1);
      expect(result.current.configurations[0]!.name).toBe('Keep');
    });
  });

  describe('nameExists', () => {
    it('returns true for existing name (case-insensitive)', () => {
      const existing: SavedFiltersCollection = {
        version: 1,
        configurations: [
          {
            id: 'c1',
            name: 'UK Submarines',
            filterBarState: SAMPLE_STATE,
            cql2Json: SAMPLE_CQL2,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      };
      const storage = makeStorage(existing);
      const { result } = renderHook(() => useSavedFilters(storage));

      expect(result.current.nameExists('UK Submarines')).toBe(true);
      expect(result.current.nameExists('uk submarines')).toBe(true);
    });

    it('returns false for non-existing name', () => {
      const storage = makeStorage();
      const { result } = renderHook(() => useSavedFilters(storage));
      expect(result.current.nameExists('anything')).toBe(false);
    });
  });

  describe('overwriteConfiguration', () => {
    it('updates the filter state and moves to front', () => {
      const newState: FilterBarState = {
        items: [
          { kind: 'lozenge', id: 'l3', filterType: 'author', value: 'CDR Smith' },
        ],
      };
      const existing: SavedFiltersCollection = {
        version: 1,
        configurations: [
          {
            id: 'c1',
            name: 'First',
            filterBarState: SAMPLE_STATE,
            cql2Json: SAMPLE_CQL2,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'c2',
            name: 'Second',
            filterBarState: SAMPLE_STATE,
            cql2Json: SAMPLE_CQL2,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      };
      const storage = makeStorage(existing);
      const { result } = renderHook(() => useSavedFilters(storage));

      act(() => result.current.overwriteConfiguration('c2', newState, { op: 'eq' }));

      expect(result.current.configurations[0]!.id).toBe('c2');
      expect(result.current.configurations[0]!.filterBarState).toEqual(newState);
      expect(result.current.configurations[0]!.name).toBe('Second');
    });
  });
});

describe('generateDefaultName', () => {
  it('generates name from lozenge values', () => {
    const state: FilterBarState = {
      items: [
        { kind: 'lozenge', id: '1', filterType: 'nationality', value: 'French' },
        { kind: 'lozenge', id: '2', filterType: 'tag', value: 'asw' },
      ],
    };
    const name = generateDefaultName(state);
    expect(name).toBe('Nationality: French + Tag: asw');
  });

  it('includes OR container children', () => {
    const state: FilterBarState = {
      items: [
        {
          kind: 'or-container',
          id: 'or1',
          children: [
            { kind: 'lozenge', id: '1', filterType: 'nationality', value: 'French' },
            { kind: 'lozenge', id: '2', filterType: 'nationality', value: 'British' },
          ],
        },
      ],
    };
    const name = generateDefaultName(state);
    expect(name).toContain('Nationality: French');
    expect(name).toContain('Nationality: British');
  });

  it('returns "Untitled Filter" for empty state', () => {
    const state: FilterBarState = { items: [] };
    expect(generateDefaultName(state)).toBe('Untitled Filter');
  });
});
