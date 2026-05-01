/**
 * Pure overlay-merge function — used by both adaptors and the catalog read
 * view. See data-model.md Layer 4 for the truth table.
 *
 * Cases:
 *   (null, null)                  → null                       (item not found)
 *   (bundled, null)               → bundled                    (no overlay; pass-through)
 *   (null, standalone)            → stored.record              (IndexedDB-only item)
 *   (null, overlay)               → THROW                      (logically impossible)
 *   (bundled, overlay)            → shallow-merge per the rule (the interesting case)
 *   (bundled, standalone)         → THROW                      (logically impossible)
 *
 * Shallow-merge rule for the (bundled, overlay) case:
 *   - top-level: spread overlay over bundled; overlay scalars win.
 *   - properties: shallow merge field-by-field; overlay-wins.
 *   - assets: shallow merge by key; overlay-added assets layer in.
 *   - links: replace wholesale if overlay sets it, else pass through.
 */

import type { StacItem, StoredItem } from './interface.js';

export function mergeOverlay(
  bundled: StacItem | null,
  stored: StoredItem | null,
): StacItem | null {
  if (bundled === null && stored === null) return null;

  if (bundled === null) {
    // stored !== null
    if (stored!.kind === 'overlay') {
      throw new Error(
        'mergeOverlay: overlay record without a bundled item is logically impossible',
      );
    }
    return stored!.record;
  }

  if (stored === null) {
    return bundled;
  }

  if (stored.kind === 'standalone') {
    throw new Error(
      'mergeOverlay: standalone record paired with a bundled item is illegal',
    );
  }

  const overlayRecord = stored.record;
  const bundledProperties = bundled.properties ?? {};
  const overlayProperties = overlayRecord.properties ?? {};

  const mergedAssets =
    bundled.assets === undefined && overlayRecord.assets === undefined
      ? undefined
      : {
          ...(bundled.assets ?? {}),
          ...(overlayRecord.assets ?? {}),
        };

  const merged: StacItem = {
    ...bundled,
    ...overlayRecord,
    properties: { ...bundledProperties, ...overlayProperties },
    ...(mergedAssets !== undefined ? { assets: mergedAssets } : {}),
    links: overlayRecord.links ?? bundled.links,
  };

  return merged;
}
