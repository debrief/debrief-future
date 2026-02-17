/**
 * Auto-Refresh Controller contract.
 * Feature: 089-result-auto-refresh (E04)
 *
 * Coordinates auto-refresh lifecycle for result views bound to logical
 * result IDs. Subscribes to ResultIdRegistry change events, manages
 * per-view state (paused, stale, visible), debounces rapid updates,
 * and records provenance via LogService.
 */

import type { ResultIdChangeEvent, ResultIdRegistry } from '../../services/session-state/src/registry/types';

// ─── Auto-Refresh State ──────────────────────────────────────────────

export type AutoRefreshStatus = 'active' | 'paused' | 'error' | 'unavailable';

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

  /**
   * Pause auto-refresh for a specific view.
   * Change events are captured but not acted upon.
   */
  pause(viewId: string): void;

  /**
   * Resume auto-refresh for a specific view.
   * If events arrived while paused, triggers an immediate refresh
   * with the latest event.
   */
  resume(viewId: string): void;

  /**
   * Mark a view as visible or hidden.
   * Hidden views defer refresh; becoming visible flushes stale state.
   */
  setVisible(viewId: string, visible: boolean): void;

  /**
   * Get the current auto-refresh state for a specific view.
   */
  getState(viewId: string): AutoRefreshState | undefined;

  /**
   * Subscribe to state changes for a specific view.
   * Returns an unsubscribe function.
   */
  onStateChange(
    viewId: string,
    callback: (state: AutoRefreshState) => void
  ): () => void;

  /**
   * Dispose the controller, unsubscribing from all registry events
   * and cleaning up all view registrations.
   */
  dispose(): void;
}

// ─── Factory ─────────────────────────────────────────────────────────

export interface AutoRefreshControllerOptions {
  /** The ResultIdRegistry to subscribe to. */
  registry: ResultIdRegistry;
  /** Debounce interval in milliseconds. Default: 300. */
  debounceMs?: number;
}

/**
 * Create an AutoRefreshController instance.
 */
export type CreateAutoRefreshController = (
  options: AutoRefreshControllerOptions
) => AutoRefreshController;
