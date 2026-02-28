/**
 * React hook for consuming auto-refresh state.
 * Feature: 089-result-auto-refresh (E04)
 *
 * Bridges the AutoRefreshController (service layer) to React components.
 * Registers a view on mount, unregisters on unmount, and exposes
 * state/pause/resume/toggle operations.
 */

import { useEffect, useState, useCallback, useMemo } from 'react';

// ─── Types (mirrored from @debrief/session-state to avoid heavy import) ─

/** Per-view auto-refresh state. */
export interface AutoRefreshState {
  readonly resultId: string;
  readonly viewId: string;
  readonly paused: boolean;
  readonly stale: boolean;
  readonly visible: boolean;
  readonly lastRefreshTimestamp: number | null;
  readonly pendingEvent: unknown | null;
  readonly status: 'active' | 'paused' | 'error' | 'unavailable';
  readonly errorMessage: string | null;
}

/** Captured Vega viewport signals. */
export interface ViewportState {
  readonly signals: Record<string, unknown>;
  readonly capturedAt: number;
}

/** Minimal controller interface consumed by the hook. */
export interface AutoRefreshControllerLike {
  register(
    viewId: string,
    resultId: string,
    onRefresh: (event: { newPath: string }, viewportState: ViewportState | null) => void
  ): () => void;
  pause(viewId: string): void;
  resume(viewId: string): void;
  setVisible(viewId: string, visible: boolean): void;
  getState(viewId: string): AutoRefreshState | undefined;
  onStateChange(viewId: string, callback: (state: AutoRefreshState) => void): () => void;
}

// ─── Hook Return Type ────────────────────────────────────────────────

export interface UseAutoRefreshReturn {
  /** Current auto-refresh state for this view. */
  state: AutoRefreshState;
  /** Pause auto-refresh for this view. */
  pause: () => void;
  /** Resume auto-refresh for this view. */
  resume: () => void;
  /** Toggle pause/resume. */
  toggle: () => void;
  /** Whether there is a pending update (paused with pending event, or stale). */
  hasPendingUpdate: boolean;
}

// ─── Default State ───────────────────────────────────────────────────

function makeDefaultState(resultId: string, viewId: string): AutoRefreshState {
  return {
    resultId,
    viewId,
    paused: false,
    stale: false,
    visible: true,
    lastRefreshTimestamp: null,
    pendingEvent: null,
    status: 'active',
    errorMessage: null,
  };
}

// ─── Hook ────────────────────────────────────────────────────────────

/**
 * React hook that connects a result view to the auto-refresh controller.
 *
 * @param controller - The AutoRefreshController instance (or null if not yet available).
 * @param resultId - The logical result ID this view is bound to.
 * @param viewId - Unique identifier for this view instance.
 * @param onRefresh - Callback invoked when the view should re-render with new data.
 */
export function useAutoRefresh(
  controller: AutoRefreshControllerLike | null,
  resultId: string,
  viewId: string,
  onRefresh: (newPath: string, viewportState: ViewportState | null) => void
): UseAutoRefreshReturn {
  const [state, setState] = useState<AutoRefreshState>(
    () => controller?.getState(viewId) ?? makeDefaultState(resultId, viewId)
  );

  // Register with controller on mount, unregister on unmount
  useEffect(() => {
    if (!controller) return;

    const unregister = controller.register(viewId, resultId, (event, viewportState) => {
      onRefresh(event.newPath, viewportState);
    });

    // Subscribe to state changes for reactive UI updates
    const unsubState = controller.onStateChange(viewId, (newState) => {
      setState(newState);
    });

    // Sync initial state
    const initial = controller.getState(viewId);
    if (initial) setState(initial);

    return () => {
      unsubState();
      unregister();
    };
  }, [controller, resultId, viewId, onRefresh]);

  const pause = useCallback(() => {
    controller?.pause(viewId);
  }, [controller, viewId]);

  const resume = useCallback(() => {
    controller?.resume(viewId);
  }, [controller, viewId]);

  const toggle = useCallback(() => {
    if (state.paused) {
      controller?.resume(viewId);
    } else {
      controller?.pause(viewId);
    }
  }, [controller, viewId, state.paused]);

  const hasPendingUpdate = state.pendingEvent !== null || state.stale;

  return useMemo(
    () => ({ state, pause, resume, toggle, hasPendingUpdate }),
    [state, pause, resume, toggle, hasPendingUpdate]
  );
}
