/**
 * Typed, versioned read/write helper for the thumbnail size preference.
 *
 * Key: debrief-catalog-thumbnail-size-v1
 * Falls back to 'small' on any unexpected / missing / corrupted value.
 *
 * Feature: 281-ui-review-p1-p2-fixes (Decision #5)
 */

import type { ThumbnailSize } from '../ExerciseListView/types';

const THUMBNAIL_SIZE_KEY = 'debrief-catalog-thumbnail-size-v1';

const VALID_SIZES: readonly ThumbnailSize[] = ['small', 'medium', 'large'];

/**
 * Read the persisted thumbnail size.
 * Narrows the stored value to the {@link ThumbnailSize} union;
 * returns `'small'` on any unexpected, missing, or non-JSON value.
 */
export function readThumbnailSize(): ThumbnailSize {
  try {
    const raw = localStorage.getItem(THUMBNAIL_SIZE_KEY);
    if (raw === null) return 'small';
    // The stored value is a plain string (not JSON-encoded); accept both forms.
    const candidate = raw.trim();
    if ((VALID_SIZES as readonly string[]).includes(candidate)) {
      return candidate as ThumbnailSize;
    }
    // Try JSON-decode in case it was stored that way
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === 'string' && (VALID_SIZES as readonly string[]).includes(parsed)) {
        return parsed as ThumbnailSize;
      }
    } catch { /* not JSON – fall through to default */ }
    return 'small';
  } catch {
    return 'small';
  }
}

/**
 * Persist the thumbnail size.
 * Fails silently if localStorage is unavailable (e.g. private-browsing quota).
 */
export function writeThumbnailSize(size: ThumbnailSize): void {
  try {
    localStorage.setItem(THUMBNAIL_SIZE_KEY, size);
  } catch { /* ignore */ }
}
