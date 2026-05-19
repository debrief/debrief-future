/**
 * Plot state types for session state management.
 * Feature: 192-properties-panel-feature-edit (read-only signal — R-009)
 *
 * The plot slice is **derived** session state — it is not persisted to
 * disk. Producers:
 *   1. Host code (VS Code extension / web-shell) calls `stacWriterFs.capability()`
 *      after a plot is opened and dispatches `setReadOnly(persistent === false, reason)`.
 *   2. `saveSession` catches `ReadOnlyFilesystemError` / Node `EACCES` /
 *      Node `EPERM` and dispatches `setReadOnly(true, reason)`.
 *
 * Most-restrictive precedence: any single producer setting `true` keeps
 * the plot read-only until an `openPlot` against a writable host resets it.
 */

/**
 * Plot state slice — read-only signal surface.
 */
export interface PlotSlice {
  /** True iff the active plot's storage is not writable from this host. */
  readonly isReadOnly: boolean;
  /**
   * Human-readable explanation of why the plot is read-only.
   * Null when `isReadOnly === false`.
   */
  readonly readOnlyReason: string | null;
}

/**
 * Default plot state values.
 */
export const DEFAULT_PLOT_SLICE: PlotSlice = {
  isReadOnly: false,
  readOnlyReason: null,
};

/**
 * Plot slice actions for state updates.
 */
export interface PlotActions {
  /**
   * Set the read-only signal. Pass `false` (and omit reason or pass null)
   * to reset; pass `true` with a reason to escalate. Producers:
   *   - host openPlot pathway after `capability()` resolution
   *   - `saveSession` catch block when a writer rejects with EACCES/EPERM/
   *     ReadOnlyFilesystemError
   */
  setReadOnly: (isReadOnly: boolean, reason?: string | null) => void;
}
