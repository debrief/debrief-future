/**
 * Browser-side scene thumbnail adaptor (#235 — T040).
 *
 * Sibling of `apps/vscode/src/services/sceneThumbnailService.ts` that
 * captures a Leaflet container as PNG data URLs without touching the
 * filesystem (the web-shell has no STAC write path yet — see #236).
 *
 * Returns the same `WriteSceneThumbnailResult` shape the VS Code adaptor
 * uses so `captureSceneWeb.ts` is a near-mirror of `captureScene.ts`.
 *
 * Storage is session-only: the data URLs are held in an in-memory `Map`
 * keyed by `sceneId`. They survive across captures within a session but
 * are discarded on plot change / page reload — matching FR-WEB-029a's
 * "session-only badge" promise.
 */

import { captureMapAsDataUrl } from '@debrief/components';
import { getActiveStacItemPath, getActiveStacWriter } from './stacWriterRegistry';

const LARGE_DIMS = { width: 800, height: 600 };
const SMALL_DIMS = { width: 200, height: 150 };

/**
 * Strip a `data:image/png;base64,XXXX` prefix down to the bare base64
 * body so the StacWriter receives canonical input. Idempotent — bare
 * base64 input is returned unchanged.
 */
function stripDataUrlPrefix(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  if (dataUrl.startsWith('data:') && comma > 0) {
    return dataUrl.slice(comma + 1);
  }
  return dataUrl;
}

/** Result shape mirrors the VS Code adaptor's `WriteSceneThumbnailResult`. */
export interface WriteSceneThumbnailResult {
  readonly assetKey: string;
  /** Browser sibling: in-memory data URL for the large render. */
  readonly largeDataUrl: string;
  /** Browser sibling: in-memory data URL for the small render. */
  readonly smallDataUrl: string;
}

/**
 * Session-only thumbnail store. Holds the data URLs keyed by sceneId so
 * the rail can render thumbnails without re-capturing the map.
 */
class WebSceneThumbnailStore {
  private readonly store = new Map<string, WriteSceneThumbnailResult>();
  private readonly listeners = new Set<() => void>();

  get(sceneId: string): WriteSceneThumbnailResult | undefined {
    return this.store.get(sceneId);
  }

  put(sceneId: string, result: WriteSceneThumbnailResult): void {
    this.store.set(sceneId, result);
    this.notify();
  }

  delete(sceneId: string): void {
    if (this.store.delete(sceneId)) {
      this.notify();
    }
  }

  has(sceneId: string): boolean {
    return this.store.has(sceneId);
  }

  /** Discards every thumbnail; call on plot change. */
  clear(): void {
    if (this.store.size === 0) return;
    this.store.clear();
    this.notify();
  }

  /** True when at least one capture has produced a session-only thumbnail. */
  hasAny(): boolean {
    return this.store.size > 0;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const l of this.listeners) {
      try {
        l();
      } catch {
        // Listeners must not throw; swallow to keep the store consistent.
      }
    }
  }
}

const sharedStore = new WebSceneThumbnailStore();

/** Module-level access for the rail's session-only badge subscription. */
export function getSceneThumbnailStore(): WebSceneThumbnailStore {
  return sharedStore;
}

/**
 * Capture both the large (800×600) and small (200×150) renders of the
 * Leaflet container and stash them in the session-only store.
 *
 * Throws if either capture fails — the caller (capture command) should
 * surface this as an inline error in the rail and leave the plot's
 * dirty state unchanged.
 */
export async function captureSceneThumbnail(
  container: HTMLElement,
  sceneId: string,
  options?: {
    /** Override the captureMap function; defaults to the real implementation. */
    captureMap?: typeof captureMapAsDataUrl;
    /** Override the underlying store (used by tests). */
    store?: WebSceneThumbnailStore;
  },
): Promise<WriteSceneThumbnailResult> {
  const capture = options?.captureMap ?? captureMapAsDataUrl;
  const store = options?.store ?? sharedStore;

  // Run the two captures sequentially. modern-screenshot mutates the
  // canvas state during a render, so parallel invocations on the same
  // container can race — sequential is safer and the cost is small at
  // typical Leaflet zoom levels.
  const largeDataUrl = await capture(container, LARGE_DIMS);
  const smallDataUrl = await capture(container, SMALL_DIMS);

  const assetKey = `scene-thumbnail-${sceneId}`;
  const result: WriteSceneThumbnailResult = {
    assetKey,
    largeDataUrl,
    smallDataUrl,
  };
  store.put(sceneId, result);

  // Best-effort: persist through the StacWriter so the capture survives
  // a reload (#236 FR-001). The in-memory store above continues to back
  // the rail's synchronous `thumbnailHref` lookup; the IDB write is the
  // durability layer underneath. If no writer is registered (App boot
  // hasn't completed yet, or capability check failed) we fall through
  // silently — the in-memory store still serves the current session.
  try {
    const writer = getActiveStacWriter();
    const stacItemPath = getActiveStacItemPath();
    if (writer !== null && stacItemPath !== null) {
      await writer.writeSceneThumbnailPair({
        ctx: {
          kind: 'idb',
          nowMs: () => Date.now(),
          randomId: () => sceneId,
        },
        stacItemPath,
        sceneId,
        largePngBase64: stripDataUrlPrefix(largeDataUrl),
        smallPngBase64: stripDataUrlPrefix(smallDataUrl),
      });
    }
  } catch (err) {
    // Best-effort: capture has already succeeded into the in-memory
    // store. Log but don't throw — Article I.3 still satisfied because
    // the badge will continue to show "Session-only" if capability is
    // unavailable, and the user can act on that.
    console.warn(
      '[webSceneThumbnailAdapter] IDB persistence failed (capture survives in-session):',
      err,
    );
  }
  return result;
}

/** Convenience export: clear the shared store on plot change. */
export function clearSceneThumbnailStore(): void {
  sharedStore.clear();
}

/**
 * Re-hydrate the in-memory thumbnail store from IndexedDB after a plot
 * load (#236 FR-001 — captures must survive a browser reload).
 *
 * Scans the freshly-loaded FeatureCollection for STORYBOARD_SCENE
 * features, resolves each Scene's `thumbnail_asset_ref` to a blob URL
 * via the writer's `readAssetBlob`, and populates the store. Failures
 * are silent — the rail just shows an empty thumbnail rect for missing
 * blobs (matches the existing pre-capture rendering).
 */
export async function hydrateSceneThumbnailStoreFromIdb(
  features: ReadonlyArray<{
    properties?: { kind?: string; id?: string; thumbnail_asset_ref?: string } | null;
  }>,
): Promise<void> {
  const writer = getActiveStacWriter();
  const stacItemPath = getActiveStacItemPath();
  if (writer === null || stacItemPath === null) return;
  const itemPath = `${stacItemPath}/item.json`;

  for (const f of features) {
    const props = f.properties;
    if (
      props === null ||
      props === undefined ||
      props.kind !== 'STORYBOARD_SCENE'
    )
      continue;
    const sceneId = props.id;
    const ref = props.thumbnail_asset_ref;
    if (typeof sceneId !== 'string' || typeof ref !== 'string') continue;

    try {
      const [largeBlob, smallBlob] = await Promise.all([
        writer.readAssetBlob(itemPath, ref),
        writer.readAssetBlob(itemPath, `${ref}-sm`),
      ]);
      if (largeBlob === null && smallBlob === null) continue;
      const largeUrl = largeBlob !== null ? URL.createObjectURL(largeBlob) : '';
      const smallUrl = smallBlob !== null ? URL.createObjectURL(smallBlob) : '';
      sharedStore.put(sceneId, {
        assetKey: ref,
        largeDataUrl: largeUrl,
        smallDataUrl: smallUrl,
      });
    } catch (err) {
      console.warn(
        `[webSceneThumbnailAdapter] hydrate failed for scene ${sceneId}:`,
        err,
      );
    }
  }
}

export type { WebSceneThumbnailStore };
