import { Volume } from 'memfs';
import { FilesystemAdapter } from './types';

/**
 * Creates a memfs volume with a populated STAC catalog structure.
 * Includes 2 catalogs, multiple items, assets, and snapshot files.
 */
export declare function createPopulatedStore(): Volume;
/**
 * Creates a memfs volume with an empty STAC catalog structure.
 * Just root catalog.json with no children.
 */
export declare function createEmptyStore(): Volume;
/**
 * Creates a memfs volume with a single catalog and one item.
 */
export declare function createSingleItemStore(): Volume;
/**
 * Creates a memfs volume with highlighted snapshot files for testing highlights.
 */
export declare function createStoreWithSnapshots(): Volume;
/**
 * Creates a FilesystemAdapter from a memfs Volume.
 * Adapts memfs API to match FilesystemAdapter interface.
 *
 * @param vol - memfs Volume instance
 * @returns FilesystemAdapter implementation
 */
export declare function createMemfsAdapter(vol: Volume): FilesystemAdapter;
//# sourceMappingURL=fixtures.d.ts.map