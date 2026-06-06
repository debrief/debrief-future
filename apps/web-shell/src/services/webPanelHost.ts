/**
 * Web-shell sibling of `apps/vscode/src/views/storyboardPanelView.ts`
 * (#235 — T041 dependency).
 *
 * The VS Code host owns the storyboard panel via a webview + a
 * `postMessage` channel. The web-shell renders the same React panel
 * directly, with no postMessage boundary, but the *shape* of the
 * channel is preserved so the panel component is host-agnostic
 * (see contracts/panel-messages.md §"Why messages and not REST").
 *
 * `WebPanelHost` is the in-memory analogue of `StoryboardPanelViewProvider`:
 *
 *   - Holds the current `namingRow` / `collisionBanner` push slices.
 *   - Exposes `promptStoryboardName` / `promptCollisionResolution` —
 *     Promise-returning helpers the web-shell capture command awaits.
 *   - Exposes `setNamingRow` / `setCollisionBanner` for callers that
 *     drive the slice directly (e.g. Phase 4's update-to-current path).
 *   - Receives panel callbacks (`onNamingRowConfirm`, etc.) and resolves
 *     the awaiting Promises with the analyst's reply, with the same
 *     stale-message defence as the VS Code host
 *     (contracts/panel-messages.md §C).
 *   - Implements `useSyncExternalStore`-style subscribe so React mounts
 *     can re-render on slice changes without a full reducer round-trip.
 *
 * Implements the same `CapturePanelSurface` interface the VS Code host
 * implements — meaning `captureSceneWeb.ts` is a near-mirror of
 * `apps/vscode/src/commands/captureScene.ts`.
 */

import type {
  NamingRowPushState,
  CollisionBannerPushState,
} from '@debrief/components';

/** Resolution of the inline naming row. `null` = analyst cancelled. */
export type NamingRowResolution = { readonly name: string } | null;

/** Resolution of the inline collision banner. */
export type CollisionBannerResolution =
  | { readonly kind: 'replace'; readonly conflictingSceneId: string }
  | { readonly kind: 'offset' }
  | { readonly kind: 'cancel' };

/**
 * Interface mirrored from `apps/vscode/src/commands/captureScene.ts`'s
 * `CapturePanelSurface`. The capture command depends only on this surface
 * — both hosts (VS Code + web-shell) implement it.
 */
export interface CapturePanelSurface {
  promptStoryboardName(args: {
    readonly defaultName: string;
    readonly knownNames: readonly string[];
  }): Promise<NamingRowResolution>;
  promptCollisionResolution(state: {
    readonly visible: boolean;
    readonly conflictingSceneId: string;
    readonly conflictingSceneTitle: string;
    readonly originalTimestamp: string;
    readonly proposedTimestamp: string;
    readonly offsetCount: number;
    readonly offsetWouldExceedTimeRange: boolean;
    readonly cause: 'capture' | 'update-to-current';
  }): Promise<CollisionBannerResolution>;
}

/**
 * Snapshot of the host-driven slices. The mount subscribes to this
 * snapshot via `subscribe()` and forwards both fields into the panel
 * reducer's `scenes-message` / `snapshot-message` payloads.
 */
export interface WebPanelHostSnapshot {
  readonly namingRow: NamingRowPushState | null;
  readonly collisionBanner: CollisionBannerPushState | null;
}

export class WebPanelHost implements CapturePanelSurface {
  private namingRow: NamingRowPushState | null = null;
  private collisionBanner: CollisionBannerPushState | null = null;
  private namingRowResolver: ((r: NamingRowResolution) => void) | null = null;
  private collisionResolver:
    | ((r: CollisionBannerResolution) => void)
    | null = null;
  private readonly listeners = new Set<() => void>();
  /**
   * Cached snapshot — `useSyncExternalStore` does an `Object.is`
   * identity check on every getSnapshot call. If we returned a new
   * object every time, React would loop indefinitely. So we hold the
   * snapshot stable across reads and only allocate a fresh one when
   * the underlying state actually changes (via `notify()`).
   */
  private cachedSnapshot: WebPanelHostSnapshot = {
    namingRow: null,
    collisionBanner: null,
  };

  // ─── Snapshot accessors (read-only) ────────────────────────────────

  getSnapshot(): WebPanelHostSnapshot {
    return this.cachedSnapshot;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private rebuildSnapshot(): void {
    this.cachedSnapshot = {
      namingRow: this.namingRow,
      collisionBanner: this.collisionBanner,
    };
  }

  private notify(): void {
    this.rebuildSnapshot();
    for (const l of this.listeners) {
      try {
        l();
      } catch {
        // Subscribers must not throw; swallow to keep state consistent.
      }
    }
  }

  // ─── Direct push helpers (mirrors VS Code's setNamingRow/setCollisionBanner) ─

  setNamingRow(state: NamingRowPushState | null): void {
    this.namingRow = state;
    this.notify();
  }

  setCollisionBanner(state: CollisionBannerPushState | null): void {
    this.collisionBanner = state;
    this.notify();
  }

  // ─── Promise-returning prompts (capture command awaits these) ──────

  async promptStoryboardName(args: {
    readonly defaultName: string;
    readonly knownNames: readonly string[];
  }): Promise<NamingRowResolution> {
    if (this.namingRowResolver !== null) {
      const stale = this.namingRowResolver;
      this.namingRowResolver = null;
      stale(null);
    }
    this.setNamingRow({
      visible: true,
      defaultName: args.defaultName,
      knownNames: args.knownNames,
    });
    return new Promise<NamingRowResolution>((resolve) => {
      this.namingRowResolver = (r): void => {
        this.namingRowResolver = null;
        this.setNamingRow(null);
        resolve(r);
      };
    });
  }

  async promptCollisionResolution(
    state: CollisionBannerPushState,
  ): Promise<CollisionBannerResolution> {
    if (this.collisionResolver !== null) {
      const stale = this.collisionResolver;
      this.collisionResolver = null;
      stale({ kind: 'cancel' });
    }
    this.setCollisionBanner(state);
    return new Promise<CollisionBannerResolution>((resolve) => {
      this.collisionResolver = (r): void => {
        this.collisionResolver = null;
        // Offset is special: the caller will re-push a fresh banner;
        // Replace and Cancel both end the flow → clear it.
        if (r.kind !== 'offset') {
          this.setCollisionBanner(null);
        }
        resolve(r);
      };
    });
  }

  // ─── Inbound action handlers (panel calls these) ───────────────────

  onNamingRowTextChanged(_pendingName: string): void {
    // Panel-local state — the host doesn't track typed text. Provided
    // for symmetry with the VS Code message channel; no-op here.
  }

  onNamingRowConfirm(name: string): void {
    if (
      this.namingRowResolver !== null &&
      this.namingRow !== null &&
      this.namingRow.visible
    ) {
      this.namingRowResolver({ name });
    }
  }

  onNamingRowCancel(): void {
    if (
      this.namingRowResolver !== null &&
      this.namingRow !== null &&
      this.namingRow.visible
    ) {
      this.namingRowResolver(null);
    }
  }

  onCollisionReplace(conflictingSceneId: string): void {
    if (
      this.collisionResolver !== null &&
      this.collisionBanner !== null &&
      this.collisionBanner.visible &&
      this.collisionBanner.conflictingSceneId === conflictingSceneId
    ) {
      this.collisionResolver({ kind: 'replace', conflictingSceneId });
    }
  }

  onCollisionOffset(): void {
    if (
      this.collisionResolver !== null &&
      this.collisionBanner !== null &&
      this.collisionBanner.visible
    ) {
      this.collisionResolver({ kind: 'offset' });
    }
  }

  onCollisionCancel(): void {
    if (
      this.collisionResolver !== null &&
      this.collisionBanner !== null &&
      this.collisionBanner.visible
    ) {
      this.collisionResolver({ kind: 'cancel' });
    }
  }

  /**
   * Cancel any in-flight prompts and clear all slices. Call on plot
   * change or `pagehide` so an awaiting capture command unblocks
   * instead of leaking.
   */
  reset(): void {
    if (this.namingRowResolver !== null) {
      const r = this.namingRowResolver;
      this.namingRowResolver = null;
      r(null);
    }
    if (this.collisionResolver !== null) {
      const r = this.collisionResolver;
      this.collisionResolver = null;
      r({ kind: 'cancel' });
    }
    this.namingRow = null;
    this.collisionBanner = null;
    this.notify();
  }
}
