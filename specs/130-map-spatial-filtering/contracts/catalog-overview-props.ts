/**
 * Contract: CatalogOverview component props (Feature #130)
 *
 * This file defines the extended public API for the CatalogOverview component
 * with spatial filtering support. It serves as the design contract — the
 * actual implementation will live in shared/components/src/CatalogOverview/types.ts.
 *
 * REVIEW NOTE: Uses existing Bounds type from utils/types.ts — NOT a new SpatialBounds.
 * Spatial utilities (bboxOverlapsViewport, filterBySpatialExtent) live in utils/bounds.ts.
 * Timeline filtering happens INSIDE CatalogOverview; map shows all items.
 */

// =============================================================================
// Types (existing — imported from utils/types.ts in implementation)
// =============================================================================

/**
 * Bounds as [minLon, minLat, maxLon, maxLat].
 * Already defined at shared/components/src/utils/types.ts:103.
 * Reused here for documentation — NOT a new type.
 */
export type Bounds = [number, number, number, number];

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
  bbox: Bounds | null;
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
  /** Items to display in the overview — ALL items, unfiltered */
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
   *
   * The map always renders ALL items. The internal timeline filters to show
   * only items overlapping the viewport. This callback is for EXTERNAL
   * consumers (session-state store, future list views).
   */
  onViewportChange?: (bounds: Bounds | null) => void;

  /**
   * Map from item ID to CSS colour string.
   * Items not in the map use the default accent colour.
   * Designed as a pluggable slot for the future Colour Scheme Engine (#134).
   */
  colorMap?: ReadonlyMap<string, string>;
}

// =============================================================================
// Spatial filtering utility contract (lives in utils/bounds.ts)
// =============================================================================

/**
 * Test whether two bounding boxes overlap.
 * Handles antimeridian-crossing boxes (where west > east).
 *
 * Implementation note: Guard against uninitialised map — if either bbox
 * has invalid coordinates, return false.
 *
 * @param itemBbox - Exercise footprint [west, south, east, north]
 * @param viewportBbox - Map viewport [west, south, east, north]
 * @returns true if the bounding boxes overlap
 */
export type BboxOverlapsViewport = (
  itemBbox: Bounds,
  viewportBbox: Bounds,
) => boolean;

/**
 * Filter items to those whose bounding boxes overlap the viewport.
 * Items without bbox are EXCLUDED from the result (they bypass spatial filtering).
 *
 * @param items - All items to filter
 * @param viewportBbox - Current map viewport bounds
 * @returns Items whose bbox overlaps the viewport
 */
export type FilterBySpatialExtent = <T extends CatalogOverviewItem>(
  items: readonly T[],
  viewportBbox: Bounds,
) => T[];

// =============================================================================
// VS Code webview message contract
// =============================================================================

/** Message from webview to extension host when viewport changes */
export interface ViewportChangedMessage {
  type: 'overviewViewportChanged';
  bounds: Bounds | null;
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

// =============================================================================
// Implementation safety requirements (from review)
// =============================================================================

/**
 * SAFETY REQUIREMENTS for CatalogOverview implementation:
 *
 * 1. Guard moveend handler: Check that map.getBounds() returns valid data
 *    before extracting coordinates. The map may fire moveend before fully
 *    initialised.
 *
 * 2. Debounce cleanup on unmount: The useRef+setTimeout debounce timer
 *    MUST be cleared in the useEffect cleanup function to prevent
 *    setState-on-unmounted-component warnings.
 *
 * 3. Memoize Rectangle list: Wrap the .map() generating <Rectangle>
 *    elements in useMemo, keyed on items + colorMap, to prevent React
 *    from diffing 200 elements on unrelated state changes.
 *
 * 4. Antimeridian edge case: When west === east (zero-width bbox),
 *    treat as non-crossing and render as a single line. Do NOT enter
 *    the split-into-two-rectangles codepath.
 */
