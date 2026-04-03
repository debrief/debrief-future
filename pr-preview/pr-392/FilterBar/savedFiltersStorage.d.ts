import { SavedFiltersCollection, SavedFiltersStorage } from './types';

/** In-memory storage for testing and Storybook */
export declare class InMemoryStorage implements SavedFiltersStorage {
    private collection;
    constructor(initial?: SavedFiltersCollection);
    load(): SavedFiltersCollection;
    save(collection: SavedFiltersCollection): void;
}
/** Browser localStorage storage for web-shell */
export declare class LocalStorageSavedFilters implements SavedFiltersStorage {
    private readonly key;
    constructor(key?: string);
    load(): SavedFiltersCollection;
    save(collection: SavedFiltersCollection): void;
}
//# sourceMappingURL=savedFiltersStorage.d.ts.map