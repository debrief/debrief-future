/**
 * OpenPlotsService Contract
 *
 * Tracks which STAC plots are currently open in the VS Code extension
 * and persists this list to workspaceState for restoration on startup.
 *
 * This is a design contract — not production code. It defines the public
 * interface that the implementation must satisfy.
 */

// --- Types ---

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

export interface OpenPlotsState {
  /** Schema version for forward compatibility */
  readonly version: number;
  /** Ordered list of currently-open plots */
  readonly plots: readonly OpenPlotReference[];
}

// --- Service Interface ---

export interface IOpenPlotsService {
  /**
   * Get all currently-open plot references, in open order.
   * Returns empty array if no plots are open or state is corrupt.
   */
  getOpenPlots(): OpenPlotReference[];

  /**
   * Record that a plot has been opened.
   * If the plot URI already exists, moves it to the end with updated timestamp.
   * Persists immediately to workspaceState.
   *
   * @param uri - stac:// URI of the opened plot
   * @param title - human-readable plot title
   * @param storeId - STAC store identifier
   * @param itemPath - STAC item path within the store
   */
  addPlot(
    uri: string,
    title: string,
    storeId: string,
    itemPath: string,
  ): Promise<void>;

  /**
   * Record that a plot has been closed.
   * Removes the entry matching the URI. No-op if URI not found.
   * Persists immediately to workspaceState.
   *
   * @param uri - stac:// URI of the closed plot
   */
  removePlot(uri: string): Promise<void>;

  /**
   * Restore all previously-open plots by executing the openPlot command
   * for each persisted reference. Plots are restored sequentially.
   *
   * - Missing/corrupt plots are silently skipped and removed from state.
   * - Corrupt persisted state is replaced with empty state.
   * - The cleaned list is persisted after all attempts complete.
   *
   * @returns Array of URIs that were successfully restored
   */
  restoreOpenPlots(): Promise<string[]>;

  /**
   * Clear all open plot references. Used when the user explicitly
   * closes all plots or for testing.
   */
  clearAll(): Promise<void>;

  /**
   * Check whether a plot URI is in the currently-open list.
   *
   * @param uri - stac:// URI to check
   */
  isOpen(uri: string): boolean;
}
