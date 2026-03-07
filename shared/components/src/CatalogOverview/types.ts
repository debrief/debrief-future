/**
 * Type definitions for the CatalogOverview component.
 */

import type { Bounds } from '../utils/types';

/**
 * A single item in a STAC catalog overview.
 */
export interface CatalogOverviewItem {
  /** STAC Item ID */
  id: string;

  /** Item title */
  title: string;

  /** Path to item.json relative to store root */
  itemPath: string;

  /** Bounding box [west, south, east, north] */
  bbox: [number, number, number, number] | null;

  /** Single datetime (ISO 8601) — fallback when start/end not available */
  datetime: string | null;

  /** Range start datetime (ISO 8601) */
  startDatetime: string | null;

  /** Range end datetime (ISO 8601) */
  endDatetime: string | null;
}

/**
 * Props for the CatalogOverview component.
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

  /** Callback when map viewport changes (debounced). Null if map not yet initialised. */
  onViewportChange?: (bounds: Bounds | null) => void;

  /** Map from item ID to CSS colour string. Items not in the map use default accent colour. */
  colorMap?: ReadonlyMap<string, string>;
}
