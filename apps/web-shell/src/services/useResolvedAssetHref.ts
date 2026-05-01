/**
 * React hook that lazily resolves `idb:` synthetic asset hrefs to
 * `URL.createObjectURL` blob URLs (review 4A).
 *
 * Catalog list re-renders fire on scroll, filter, sort. Eager resolution
 * at list-build time means O(catalog) `getAll` + N `createObjectURL`
 * calls per render. This hook makes render cost O(visible items) —
 * bounded by viewport, not catalog size.
 *
 * LRU sizing: cap of 200 entries. On eviction, `URL.revokeObjectURL`
 * fires; if a `<img src>` element still holds a revoked URL, the browser
 * shows a broken-image icon for at most one frame until React re-renders.
 */

import { useEffect, useState } from 'react';

import type { StacWriterIdb } from './stacWriterIdb';

const LRU_CAP = 200;

interface LruEntry {
  readonly url: string;
  refCount: number;
}

/** Module-level LRU keyed by `idb:<itemPath>::<assetKey>`. */
const lru = new Map<string, LruEntry>();

let activeWriter: StacWriterIdb | null = null;

/** Wire the writer this hook resolves against. Call once at App boot. */
export function setResolvedAssetHrefWriter(writer: StacWriterIdb | null): void {
  activeWriter = writer;
}

function evictOldestIfNeeded(): void {
  if (lru.size <= LRU_CAP) return;
  // Find the oldest entry whose refCount is 0.
  for (const [key, entry] of lru) {
    if (entry.refCount <= 0) {
      try {
        URL.revokeObjectURL(entry.url);
      } catch {
        // ignore
      }
      lru.delete(key);
      if (lru.size <= LRU_CAP) return;
    }
  }
  // If everything is held, fall back to evicting the oldest insertion.
  const first = lru.keys().next();
  if (!first.done) {
    const e = lru.get(first.value);
    if (e !== undefined) {
      try {
        URL.revokeObjectURL(e.url);
      } catch {
        // ignore
      }
      lru.delete(first.value);
    }
  }
}

async function resolveIdbHref(href: string): Promise<string | null> {
  // Format: `idb:<itemPath>::<assetKey>`
  if (!href.startsWith('idb:')) return null;
  const tail = href.slice('idb:'.length);
  const sep = tail.indexOf('::');
  if (sep < 0) return null;
  const itemPath = tail.slice(0, sep);
  const assetKey = tail.slice(sep + 2);
  const writer = activeWriter;
  if (writer === null) return null;
  const blob = await writer.readAssetBlob(itemPath, assetKey);
  if (blob === null) return null;
  return URL.createObjectURL(blob);
}

/**
 * Resolves an `idb:` href to a blob URL. Returns the input verbatim for
 * non-`idb:` hrefs (so consumers can call this unconditionally).
 *
 * - First render returns `null` for `idb:` hrefs while the blob is read.
 * - On read completion, the hook re-renders with the resolved URL.
 * - On unmount, the consumer's reference count is dropped; the URL stays
 *   in the LRU (other consumers may still hold it).
 */
export function useResolvedAssetHref(href: string | undefined | null): string | null {
  const [resolved, setResolved] = useState<string | null>(() => {
    if (href === undefined || href === null) return null;
    if (!href.startsWith('idb:')) return href;
    const cached = lru.get(href);
    if (cached !== undefined) {
      cached.refCount += 1;
      return cached.url;
    }
    return null;
  });

  useEffect(() => {
    if (href === undefined || href === null) {
      setResolved(null);
      return undefined;
    }
    if (!href.startsWith('idb:')) {
      setResolved(href);
      return undefined;
    }

    let cancelled = false;
    const cached = lru.get(href);
    if (cached !== undefined) {
      cached.refCount += 1;
      setResolved(cached.url);
    } else {
      void resolveIdbHref(href).then((url) => {
        if (cancelled) return;
        if (url === null) {
          setResolved(null);
          return;
        }
        const existing = lru.get(href);
        if (existing !== undefined) {
          existing.refCount += 1;
          // Discard the freshly-created URL — we'll use the cached one.
          try {
            URL.revokeObjectURL(url);
          } catch {
            // ignore
          }
          setResolved(existing.url);
          return;
        }
        lru.set(href, { url, refCount: 1 });
        evictOldestIfNeeded();
        setResolved(url);
      });
    }

    return () => {
      cancelled = true;
      const entry = lru.get(href);
      if (entry !== undefined) {
        entry.refCount = Math.max(0, entry.refCount - 1);
      }
    };
  }, [href]);

  return resolved;
}

/** Test helper — clear the LRU. */
export function __resetResolvedAssetHrefLruForTests(): void {
  for (const entry of lru.values()) {
    try {
      URL.revokeObjectURL(entry.url);
    } catch {
      // ignore
    }
  }
  lru.clear();
}
