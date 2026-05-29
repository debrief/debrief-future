/**
 * Plot state slice implementation.
 * Feature: 192-properties-panel-feature-edit (read-only signal — R-009)
 */

import type { StateCreator } from 'zustand';
import type {
  PlotSlice,
  PlotActions,
  SessionState,
  SessionStore,
} from '../../types/index.js';
import { DEFAULT_PLOT_SLICE } from '../../types/index.js';

export type PlotSliceWithActions = PlotSlice & PlotActions;

/**
 * Create the plot slice for the session store.
 *
 * Modelled on the `document` slice idiom — flat fields, single `set`-based
 * action. Uses the regular `set` (not the dirty-tracking wrapper) because
 * the read-only signal is derived metadata, not analyst-authored state.
 */
export const createPlotSlice: StateCreator<
  SessionStore,
  [],
  [],
  PlotSliceWithActions
> = (set) => ({
  ...DEFAULT_PLOT_SLICE,

  setReadOnly: (isReadOnly: boolean, reason?: string | null) => {
    // Normalise omitted/undefined `reason` to null when isReadOnly is false;
    // accept passed-in reason verbatim when isReadOnly is true.
    const nextReason = isReadOnly ? (reason ?? null) : null;
    set({ isReadOnly, readOnlyReason: nextReason });
  },
});

// ─── Named selectors ───────────────────────────────────────────────────────
//
// Consumers MUST use these selectors instead of touching the slice directly
// (contracts/read-only-signal.md — Consumer surface).

/** True iff the active plot's storage is read-only from this host. */
export const selectIsReadOnly = (s: SessionState): boolean => s.plot.isReadOnly;

/** Human-readable reason for the read-only state, or null when writable. */
export const selectReadOnlyReason = (s: SessionState): string | null =>
  s.plot.readOnlyReason;
