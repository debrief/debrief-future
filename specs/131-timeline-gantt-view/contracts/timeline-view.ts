/**
 * API Contract: TimelineView component (#131)
 *
 * Defines the public interface of the Timeline/Gantt view component
 * for the STAC Stack Browser Discovery UI (E08).
 */

import type { StacBrowserItem } from "../../shared/components/src/filter-engine/types";

// ============================================================================
// Temporal Filter
// ============================================================================

/** The temporal filter emitted by the timeline when the user adjusts the range. */
export interface TemporalFilter {
  /** Left boundary of selected range (epoch milliseconds) */
  readonly start: number;
  /** Right boundary of selected range (epoch milliseconds) */
  readonly end: number;
}

// ============================================================================
// Colour Function
// ============================================================================

/**
 * Maps an exercise item to a CSS colour string.
 * Returns null to use the default theme colour.
 * Provided by the colour scheme engine (#134).
 */
export type ColourFn = (item: StacBrowserItem) => string | null;

// ============================================================================
// TimelineView Props
// ============================================================================

/** Props for the TimelineView component. */
export interface TimelineViewProps {
  /** Exercises to display on the timeline. */
  readonly items: readonly StacBrowserItem[];

  /**
   * Callback when the user adjusts the time range selection.
   * Called with null when the selection is cleared (all items visible).
   */
  readonly onTemporalFilterChange: (filter: TemporalFilter | null) => void;

  /**
   * Callback when the user double-clicks an exercise to open it.
   * Receives the item path (e.g., "exercises/item.json").
   */
  readonly onItemSelect?: (itemPath: string) => void;

  /**
   * Optional colour function from the colour scheme engine (#134).
   * When not provided, bars use the default theme colour.
   */
  readonly colourFn?: ColourFn;

  /** Additional CSS class name for the container. */
  readonly className?: string;
}

// ============================================================================
// Timeline Utilities (extracted from CatalogOverview)
// ============================================================================

/** A continuous time interval. */
export interface TimeRange {
  readonly min: number;
  readonly max: number;
}

/**
 * Parse an ISO 8601 datetime string to epoch milliseconds.
 * Returns null for null/undefined/invalid input.
 */
export declare function parseTime(s: string | null): number | null;

/**
 * Compute the overall time range across all items.
 * Falls back to `datetime` when `start_datetime`/`end_datetime` not available.
 * Returns null when no items have temporal data.
 * Pads by ±1 hour when all items share the same timestamp.
 */
export declare function computeTimeRange(
  items: readonly StacBrowserItem[],
): TimeRange | null;

/**
 * Compute the horizontal position of a timestamp on the chart.
 * @param epoch - Timestamp in epoch milliseconds
 * @param range - The overall time range
 * @param chartWidth - Available width in pixels
 */
export declare function computeBarX(
  epoch: number,
  range: TimeRange,
  chartWidth: number,
): number;

/**
 * Compute the width of a temporal extent bar.
 * Enforces a minimum width of 4 pixels.
 */
export declare function computeBarWidth(
  start: number,
  end: number,
  range: TimeRange,
  chartWidth: number,
): number;

/**
 * Format an epoch timestamp for display on the time axis.
 * Adapts granularity based on context:
 * - Range < 24h: HH:mm
 * - Range < 7d: ddd HH:mm
 * - Range < 90d: dd MMM
 * - Range < 2y: MMM yyyy
 * - Range >= 2y: yyyy
 */
export declare function formatAxisLabel(
  epoch: number,
  rangeSpan: number,
): string;

/**
 * Format a date range for tooltip display.
 * Handles single datetime, range, and missing data.
 */
export declare function formatDateRange(
  start: string | null,
  end: string | null,
  datetime: string | null,
): string;

/**
 * Test whether an item's temporal extent overlaps a temporal filter.
 * An item with no temporal data does NOT pass the filter.
 */
export declare function itemOverlapsFilter(
  item: StacBrowserItem,
  filter: TemporalFilter,
): boolean;
