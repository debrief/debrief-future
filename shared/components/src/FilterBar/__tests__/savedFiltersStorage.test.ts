import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemoryStorage, LocalStorageSavedFilters } from '../savedFiltersStorage';
import type { SavedFiltersCollection, FilterBarState } from '../types';

const SAMPLE_STATE: FilterBarState = {
  items: [
    { kind: 'lozenge', id: 'l1', filterType: 'nationality', value: 'French' },
    { kind: 'lozenge', id: 'l2', filterType: 'tag', value: 'asw' },
  ],
};

const SAMPLE_COLLECTION: SavedFiltersCollection = {
  version: 1,
  configurations: [
    {
      id: 'c1',
      name: 'UK Submarines',
      filterBarState: SAMPLE_STATE,
      cql2Json: { op: 'and', args: [{ op: 'eq', args: [{ property: 'nationality' }, 'French'] }] },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
};

describe('InMemoryStorage', () => {
  it('loads empty collection by default', () => {
    const storage = new InMemoryStorage();
    const result = storage.load();
    expect(result.version).toBe(1);
    expect(result.configurations).toEqual([]);
  });

  it('loads initial collection when provided', () => {
    const storage = new InMemoryStorage(SAMPLE_COLLECTION);
    const result = storage.load();
    expect(result.configurations).toHaveLength(1);
    expect(result.configurations[0]!.name).toBe('UK Submarines');
  });

  it('round-trips save and load', () => {
    const storage = new InMemoryStorage();
    storage.save(SAMPLE_COLLECTION);
    const loaded = storage.load();
    expect(loaded).toEqual(SAMPLE_COLLECTION);
  });
});

describe('LocalStorageSavedFilters', () => {
  const mockStorage: Record<string, string> = {};

  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);

    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => mockStorage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value; }),
      removeItem: vi.fn((key: string) => { delete mockStorage[key]; }),
    });
  });

  it('loads empty collection when storage is empty', () => {
    const storage = new LocalStorageSavedFilters();
    const result = storage.load();
    expect(result.version).toBe(1);
    expect(result.configurations).toEqual([]);
  });

  it('round-trips save → serialise → deserialise → load', () => {
    const storage = new LocalStorageSavedFilters('test-key');
    storage.save(SAMPLE_COLLECTION);

    // Verify it went through JSON serialisation
    expect(localStorage.setItem).toHaveBeenCalledWith('test-key', expect.any(String));

    const loaded = storage.load();
    expect(loaded.version).toBe(1);
    expect(loaded.configurations).toHaveLength(1);
    expect(loaded.configurations[0]!.name).toBe('UK Submarines');
    expect(loaded.configurations[0]!.filterBarState).toEqual(SAMPLE_STATE);
    expect(loaded.configurations[0]!.cql2Json).toEqual(SAMPLE_COLLECTION.configurations[0]!.cql2Json);
  });

  it('preserves all fields through serialisation', () => {
    const storage = new LocalStorageSavedFilters('test-key');
    storage.save(SAMPLE_COLLECTION);
    const loaded = storage.load();
    const config = loaded.configurations[0]!;

    expect(config.id).toBe('c1');
    expect(config.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(config.updatedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('handles corrupted JSON gracefully', () => {
    mockStorage['test-key'] = 'not valid json{{{';
    const storage = new LocalStorageSavedFilters('test-key');
    const result = storage.load();
    expect(result.version).toBe(1);
    expect(result.configurations).toEqual([]);
  });

  it('handles invalid structure gracefully', () => {
    mockStorage['test-key'] = JSON.stringify({ foo: 'bar' });
    const storage = new LocalStorageSavedFilters('test-key');
    const result = storage.load();
    expect(result.configurations).toEqual([]);
  });

  it('preserves OR containers through round-trip', () => {
    const stateWithOr: FilterBarState = {
      items: [
        {
          kind: 'or-container',
          id: 'or1',
          children: [
            { kind: 'lozenge', id: 'c1', filterType: 'nationality', value: 'French' },
            { kind: 'lozenge', id: 'c2', filterType: 'nationality', value: 'British' },
          ],
        },
        { kind: 'lozenge', id: 'l1', filterType: 'tag', value: 'convoy' },
      ],
    };
    const collection: SavedFiltersCollection = {
      version: 1,
      configurations: [
        {
          id: 'c-or',
          name: 'OR Test',
          filterBarState: stateWithOr,
          cql2Json: {},
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };

    const storage = new LocalStorageSavedFilters('test-key');
    storage.save(collection);
    const loaded = storage.load();
    const restored = loaded.configurations[0]!.filterBarState;

    expect(restored.items).toHaveLength(2);
    const orContainer = restored.items[0]!;
    expect(orContainer.kind).toBe('or-container');
    if (orContainer.kind === 'or-container') {
      expect(orContainer.children).toHaveLength(2);
      expect(orContainer.children[0]!.value).toBe('French');
      expect(orContainer.children[1]!.value).toBe('British');
    }
  });
});
