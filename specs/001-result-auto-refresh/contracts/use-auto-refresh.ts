/**
 * React hook contract for consuming auto-refresh state.
 * Feature: 089-result-auto-refresh (E04)
 *
 * Provides a React-friendly interface to the AutoRefreshController
 * for use in shared components (ChartPanelWrapper, future editor tabs).
 */

import type { AutoRefreshState, ViewportState } from './auto-refresh-controller';

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

// ─── Hook Signature ──────────────────────────────────────────────────

/**
 * React hook that connects a result view to the auto-refresh controller.
 *
 * @param resultId - The logical result ID this view is bound to.
 * @param viewId - Unique identifier for this view instance.
 * @param onRefresh - Callback invoked when the view should re-render with new data.
 *                    Receives the change event and the preserved viewport state.
 *
 * Automatically registers/unregisters the view with the controller
 * on mount/unmount. Tracks visibility via document/tab focus events.
 */
export type UseAutoRefresh = (
  resultId: string,
  viewId: string,
  onRefresh: (newPath: string, viewportState: ViewportState | null) => void
) => UseAutoRefreshReturn;
