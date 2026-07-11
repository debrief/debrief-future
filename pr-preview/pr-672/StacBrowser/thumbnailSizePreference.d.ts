import { ThumbnailSize } from '../ExerciseListView/types';

/**
 * Read the persisted thumbnail size.
 * Narrows the stored value to the {@link ThumbnailSize} union;
 * returns `'small'` on any unexpected, missing, or non-JSON value.
 */
export declare function readThumbnailSize(): ThumbnailSize;
/**
 * Persist the thumbnail size.
 * Fails silently if localStorage is unavailable (e.g. private-browsing quota).
 */
export declare function writeThumbnailSize(size: ThumbnailSize): void;
//# sourceMappingURL=thumbnailSizePreference.d.ts.map