/**
 * Singleton registry for the active StacWriter + capability state.
 *
 * Set once at App boot; consumed by:
 *   - `webSceneThumbnailAdapter.captureSceneThumbnail` — writes captured
 *     PNG bytes through the writer to IndexedDB.
 *   - `useResolvedAssetHref` — already wired via
 *     `setResolvedAssetHrefWriter` in this module.
 *   - The badge gating logic in `StoryboardPanelMount.tsx` — reads
 *     `getActiveCapability()` to decide whether to show the
 *     "Session-only" warning.
 *
 * Subscribers re-render when the writer is swapped or the capability
 * report changes (e.g. user just granted persistence permission).
 */

import type { CapabilityReport } from '@debrief/stac-writer';
import type { StacWriterIdb } from './stacWriterIdb';
import { setResolvedAssetHrefWriter } from './useResolvedAssetHref';

let activeWriter: StacWriterIdb | null = null;
let activeCapability: CapabilityReport = {
  available: false,
  persistent: false,
  reason: 'unavailable',
};
/**
 * Currently-loaded plot's catalog-relative STAC item path
 * (e.g. `exercise-alpha/item.json`). Set by App.tsx on plot load so the
 * scene-thumbnail capture flow knows which item to land overlay assets on.
 */
let activeStacItemPath: string | null = null;
const subscribers = new Set<() => void>();

export function setActiveStacWriter(
  writer: StacWriterIdb | null,
  capability: CapabilityReport,
): void {
  activeWriter = writer;
  activeCapability = capability;
  setResolvedAssetHrefWriter(writer);
  for (const s of subscribers) {
    try {
      s();
    } catch {
      // ignore
    }
  }
}

export function getActiveStacWriter(): StacWriterIdb | null {
  return activeWriter;
}

export function getActiveCapability(): CapabilityReport {
  return activeCapability;
}

export function setActiveStacItemPath(itemPath: string | null): void {
  activeStacItemPath = itemPath;
}

export function getActiveStacItemPath(): string | null {
  return activeStacItemPath;
}

export function subscribeStacWriter(listener: () => void): () => void {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}
