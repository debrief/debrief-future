/**
 * Contract: CatalogOverview component props (Feature #130)
 *
 * This file defines the extended public API for the CatalogOverview component
 * with spatial filtering support. It serves as the design contract — the
 * actual implementation will live in shared/components/src/CatalogOverview/types.ts.
 */

// =============================================================================
// Types
// =============================================================================

/** Axis-aligned bounding box in STAC format: [west, south, east, north] */
export type SpatialBounds = [number, number, number, number];

/**
 * A single item in a STAC catalog overview (unchanged from existing).
 */
export interface CatalogOverviewItem {
  /** STAC Item ID */
  id: string;
  /** Item title */
  title: string;
  /** Path to item.json relative to store root */
  itemPath: string;
  /** Bounding box [west, south, east, north] */
  bbox: SpatialBounds | null;
  /** Single datetime (ISO 8601) */
  datetime: string | null;
  /** Range start datetime (ISO 8601) */
  startDatetime: string | null;
  /** Range end datetime (ISO 8601) */
  endDatetime: string | null;
}

/**
 * Props for the CatalogOverview component (extended with spatial filtering).
 */
export interface CatalogOverviewProps {
  /** Items to display in the overview */
  items: CatalogOverviewItem[];

  /** Callback when user double-clicks an item */
  onItemSelect?: (itemPath: string) => void;

  /** Initial split ratio (0–1, fraction of height for the map region) */
  initialSplitRatio?: number;

  /** Callback when split ratio changes (for persistence) */
  onSplitRatioChange?: (ratio: number) => void;

  /** Additional CSS class name */
  className?: string;

  // --- New props for #130 ---

  /**
   * Callback when the map viewport changes (debounced, 150ms).
   * Bounds in STAC format [west, south, east, north].
   * null when map is not yet initialised.
   */
  onViewportChange?: (bounds: SpatialBounds | null) => void;

  /**
   * Map from item ID to CSS colour string.
   * Items not in the map use the default accent colour.
   * Designed as a pluggable slot for the future Colour Scheme Engine (#134).
   */
  colorMap?: ReadonlyMap<string, string>;
}

// =============================================================================
// Spatial filtering utility contract
// =============================================================================

/**
 * Test whether two bounding boxes overlap.
 * Handles antimeridian-crossing boxes (where west > east).
 *
 * @param itemBbox - Exercise footprint [west, south, east, north]
 * @param viewportBbox - Map viewport [west, south, east, north]
 * @returns true if the bounding boxes overlap
 */
export type BboxOverlapsViewport = (
  itemBbox: SpatialBounds,
  viewportBbox: SpatialBounds,
) => boolean;

/**
 * Filter items to those whose bounding boxes overlap the viewport.
 * Items without bbox are excluded from the result.
 *
 * @param items - All items to filter
 * @param viewportBbox - Current map viewport bounds
 * @returns Items whose bbox overlaps the viewport
 */
export type FilterBySpatialExtent = <T extends CatalogOverviewItem>(
  items: readonly T[],
  viewportBbox: SpatialBounds,
) => T[];

// =============================================================================
// VS Code webview message contract
// =============================================================================

/** Message from webview to extension host when viewport changes */
export interface ViewportChangedMessage {
  type: 'overviewViewportChanged';
  bounds: SpatialBounds | null;
}

/** Existing message types (unchanged) */
export interface OverviewItemSelectedMessage {
  type: 'overviewItemSelected';
  itemPath: string;
  storePath: string;
}

export interface OverviewWebviewReadyMessage {
  type: 'overviewWebviewReady';
}

/** Union of all webview → extension messages */
export type OverviewWebviewMessage =
  | ViewportChangedMessage
  | OverviewItemSelectedMessage
  | OverviewWebviewReadyMessage;
