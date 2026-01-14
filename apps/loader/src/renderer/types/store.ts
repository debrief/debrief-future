/**
 * STAC store and plot types.
 */

/**
 * Information about a configured STAC store (from debrief-config).
 */
export interface StacStoreInfo {
  /** Unique identifier for the store */
  id: string;

  /** Human-readable name */
  name: string;

  /** Absolute path to the catalog */
  path: string;

  /** Number of existing plots in the store */
  plotCount: number;

  /** Whether the store is accessible */
  accessible: boolean;

  /** Error message if not accessible */
  accessError?: string;
}

/**
 * Information about an existing plot (from debrief-stac).
 */
export interface PlotInfo {
  /** STAC Item ID */
  id: string;

  /** Human-readable name */
  name: string;

  /** Plot description */
  description?: string;

  /** Creation timestamp (ISO 8601) */
  created: string;

  /** Last modified timestamp (ISO 8601) */
  modified: string;

  /** Number of features in the plot */
  featureCount: number;
}
