import { FilesystemAdapter } from './types';

/**
 * Creates a browser-safe FilesystemAdapter from a flat path→content map.
 * Directories are inferred from file paths automatically.
 */
export declare function createMapAdapter(files: Record<string, string>): FilesystemAdapter;
/** Browser-safe populated STAC store adapter */
export declare function createPopulatedStoreAdapter(): FilesystemAdapter;
/** Browser-safe empty STAC store adapter */
export declare function createEmptyStoreAdapter(): FilesystemAdapter;
/** Browser-safe single-item STAC store adapter */
export declare function createSingleItemStoreAdapter(): FilesystemAdapter;
/** Browser-safe snapshot STAC store adapter */
export declare function createSnapshotStoreAdapter(): FilesystemAdapter;
//# sourceMappingURL=storyFixtures.d.ts.map