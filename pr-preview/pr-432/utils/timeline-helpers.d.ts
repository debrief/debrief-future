import { CatalogOverviewItem, StacBrowserItem } from '../filter-engine/types';
import { TimeSpan } from './temporal-types';
import { TemporalFilter } from '../TimelineView/types';

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
export declare function computeTimeRange(items: readonly CatalogOverviewItem[]): TimeSpan | null;
/**
 * Compute the horizontal position of a timestamp on the chart.
 */
export declare function computeBarX(epoch: number, range: TimeSpan, chartWidth: number): number;
/**
 * Compute the width of a temporal extent bar.
 * Enforces a minimum width of 4 pixels.
 */
export declare function computeBarWidth(start: number, end: number, range: TimeSpan, chartWidth: number): number;
/**
 * Format an epoch timestamp for display on the time axis.
 * Adapts granularity based on the total range span:
 * - Range < 24h: HH:mm
 * - Range < 7d: ddd HH:mm
 * - Range < 90d: dd MMM
 * - Range < 2y: MMM yyyy
 * - Range >= 2y: yyyy
 */
export declare function formatTimeByRange(epoch: number, rangeSpan: number): string;
/**
 * Format a date range for tooltip display.
 * Handles single datetime, range, and missing data.
 */
export declare function formatDateRange(start: string | null, end: string | null, datetime: string | null): string;
/**
 * Test whether an item's temporal extent overlaps a temporal filter.
 * An item with no temporal data does NOT pass the filter.
 *
 * Overlap semantics: itemStart <= filter.end AND itemEnd >= filter.start
 */
export declare function itemOverlapsFilter(item: StacBrowserItem, filter: TemporalFilter): boolean;
//# sourceMappingURL=timeline-helpers.d.ts.map