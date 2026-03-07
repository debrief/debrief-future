/**
 * Platform-agnostic storage implementations for saved filters (#128).
 */

import type { SavedFiltersCollection, SavedFiltersStorage } from './types';

const EMPTY_COLLECTION: SavedFiltersCollection = {
  version: 1,
  configurations: [],
};

/** In-memory storage for testing and Storybook */
export class InMemoryStorage implements SavedFiltersStorage {
  private collection: SavedFiltersCollection;

  constructor(initial?: SavedFiltersCollection) {
    this.collection = initial ?? EMPTY_COLLECTION;
  }

  load(): SavedFiltersCollection {
    return this.collection;
  }

  save(collection: SavedFiltersCollection): void {
    this.collection = collection;
  }
}

/** Browser localStorage storage for web-shell */
export class LocalStorageSavedFilters implements SavedFiltersStorage {
  constructor(private readonly key: string = 'debrief-saved-filters') {}

  load(): SavedFiltersCollection {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return EMPTY_COLLECTION;
      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'version' in parsed &&
        'configurations' in parsed
      ) {
        return parsed as SavedFiltersCollection;
      }
      return EMPTY_COLLECTION;
    } catch {
      return EMPTY_COLLECTION;
    }
  }

  save(collection: SavedFiltersCollection): void {
    localStorage.setItem(this.key, JSON.stringify(collection));
  }
}
