/**
 * Open Plots type definitions for session restoration (Feature: 052)
 *
 * These types define the persisted state for tracking which STAC plots
 * are currently open, enabling automatic restoration on VS Code startup.
 */

/**
 * A lightweight record identifying a STAC plot that is currently open.
 */
export interface OpenPlotReference {
  /** stac:// URI identifying the plot (primary key) */
  readonly uri: string;
  /** Human-readable plot title (for logging/debugging) */
  readonly title: string;
  /** STAC store identifier, extracted from URI */
  readonly storeId: string;
  /** STAC item path within the store */
  readonly itemPath: string;
  /** ISO 8601 timestamp when the plot was opened */
  readonly openedAt: string;
}

/**
 * The complete persisted state, stored as a single entry in workspaceState.
 */
export interface OpenPlotsState {
  /** Schema version for forward compatibility. Initial value: 1 */
  readonly version: number;
  /** Ordered list of currently-open plots */
  readonly plots: readonly OpenPlotReference[];
}
