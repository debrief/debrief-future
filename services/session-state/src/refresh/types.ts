/**
 * Auto-Refresh type definitions.
 * Feature: 089-result-auto-refresh (E04)
 *
 * Per-view state, viewport state, and refresh event types used by the
 * AutoRefreshController and the useAutoRefresh React hook.
 */

import type { ResultIdChangeEvent } from '../registry/types.js';

// ─── Auto-Refresh Status ─────────────────────────────────────────────

export type AutoRefreshStatus = 'active' | 'paused' | 'error' | 'unavailable';

// ─── Auto-Refresh State ──────────────────────────────────────────────

/** Per-view auto-refresh state managed by the controller. */
export interface AutoRefreshState {
  readonly resultId: string;
  readonly viewId: string;
  readonly paused: boolean;
  readonly stale: boolean;
  readonly visible: boolean;
  readonly lastRefreshTimestamp: number | null;
  readonly pendingEvent: ResultIdChangeEvent | null;
  readonly status: AutoRefreshStatus;
  readonly errorMessage: string | null;
}

// ─── Viewport State ──────────────────────────────────────────────────

/** Captured Vega viewport signals for preservation across refreshes. */
export interface ViewportState {
  readonly signals: Record<string, unknown>;
  readonly capturedAt: number;
}

// ─── Refresh Callback ────────────────────────────────────────────────

/**
 * Callback invoked when a view should refresh.
 * The implementation loads the new dataset, transforms it, and re-renders
 * the chart while preserving the provided viewport state (if any).
 */
export type RefreshCallback = (
  event: ResultIdChangeEvent,
  viewportState: ViewportState | null
) => void;

// ─── Provenance ──────────────────────────────────────────────────────

/** Provenance record logged via LogService for each refresh cycle. */
export interface RefreshEvent {
  readonly operation: 'result:refresh';
  readonly resultId: string;
  readonly previousPath: string | null;
  readonly newPath: string;
  readonly previousVersion: number | null;
  readonly newVersion: number | null;
  readonly viewportPreserved: boolean;
  readonly timestamp: number;
}

// ─── Controller Interface ────────────────────────────────────────────

export interface AutoRefreshController {
  /**
   * Register a view for auto-refresh monitoring.
   * Subscribes to the ResultIdRegistry for the given resultId.
   * Returns a cleanup function to unregister.
   */
  register(
    viewId: string,
    resultId: string,
    onRefresh: RefreshCallback
  ): () => void;

  /** Pause auto-refresh for a specific view. */
  pause(viewId: string): void;

  /** Resume auto-refresh for a specific view. Flushes pending events. */
  resume(viewId: string): void;

  /** Mark a view as visible or hidden. Hidden views defer refresh. */
  setVisible(viewId: string, visible: boolean): void;

  /** Get the current auto-refresh state for a specific view. */
  getState(viewId: string): AutoRefreshState | undefined;

  /** Subscribe to state changes for a specific view. Returns unsubscribe. */
  onStateChange(
    viewId: string,
    callback: (state: AutoRefreshState) => void
  ): () => void;

  /** Dispose the controller, cleaning up all subscriptions. */
  dispose(): void;
}

// ─── Factory Options ─────────────────────────────────────────────────

import type { ResultIdRegistry } from '../registry/types.js';

export interface AutoRefreshControllerOptions {
  /** The ResultIdRegistry to subscribe to. */
  registry: ResultIdRegistry;
  /** Debounce interval in milliseconds. Default: 300. */
  debounceMs?: number;
}
