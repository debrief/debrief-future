/**
 * Timeline utility helpers (#131).
 *
 * Extracted from CatalogOverview.tsx for shared use by both
 * CatalogOverview and the new TimelineView component.
 */

import type { CatalogOverviewItem, StacBrowserItem } from '../filter-engine/types';
import type { TimeSpan } from './temporal-types';
import type { TemporalFilter } from '../TimelineView/types';

/**
 * Parse an ISO 8601 datetime string to epoch milliseconds.
 * Returns null for null/undefined/invalid input.
 */
export function parseTime(s: string | null): number | null {
  if (!s) return null;
  const t = new Date(s).getTime();
  return isNaN(t) ? null : t;
}

/**
 * Compute the overall time range across all items.
 * Falls back to `datetime` when `start_datetime`/`end_datetime` not available.
 * Returns null when no items have temporal data.
 * Pads by ±1 hour when all items share the same timestamp.
 */
export function computeTimeRange(items: readonly CatalogOverviewItem[]): TimeSpan | null {
  let min = Infinity;
  let max = -Infinity;
  for (const item of items) {
    const start = parseTime(item.startDatetime) ?? parseTime(item.datetime);
    const end = parseTime(item.endDatetime) ?? parseTime(item.datetime);
    if (start !== null) min = Math.min(min, start);
    if (end !== null) max = Math.max(max, end);
  }
  if (min === Infinity) return null;
  if (min === max) {
    min -= 3600000; // 1 hour
    max += 3600000;
  }
  return { min, max };
}

/**
 * Compute the horizontal position of a timestamp on the chart.
 */
export function computeBarX(
  epoch: number,
  range: TimeSpan,
  chartWidth: number,
): number {
  return ((epoch - range.min) / (range.max - range.min)) * chartWidth;
}

/**
 * Compute the width of a temporal extent bar.
 * Enforces a minimum width of 4 pixels.
 */
export function computeBarWidth(
  start: number,
  end: number,
  range: TimeSpan,
  chartWidth: number,
): number {
  return Math.max(4, ((end - start) / (range.max - range.min)) * chartWidth);
}

// Granularity thresholds in milliseconds
const MS_24H = 24 * 60 * 60 * 1000;
const MS_7D = 7 * MS_24H;
const MS_90D = 90 * MS_24H;
const MS_2Y = 2 * 365 * MS_24H;

/**
 * Format an epoch timestamp for display on the time axis.
 * Adapts granularity based on the total range span:
 * - Range < 24h: HH:mm
 * - Range < 7d: ddd HH:mm
 * - Range < 90d: dd MMM
 * - Range < 2y: MMM yyyy
 * - Range >= 2y: yyyy
 */
export function formatTimeByRange(epoch: number, rangeSpan: number): string {
  const date = new Date(epoch);
  if (rangeSpan < MS_24H) {
    return date.toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  if (rangeSpan < MS_7D) {
    return date.toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  }
  if (rangeSpan < MS_90D) {
    return date.toLocaleString(undefined, { day: 'numeric', month: 'short' });
  }
  if (rangeSpan < MS_2Y) {
    return date.toLocaleString(undefined, { month: 'short', year: 'numeric' });
  }
  return date.toLocaleString(undefined, { year: 'numeric' });
}

/**
 * Format a date range for tooltip display.
 * Handles single datetime, range, and missing data.
 */
export function formatDateRange(
  start: string | null,
  end: string | null,
  datetime: string | null,
): string {
  const s = start ?? datetime;
  const e = end ?? datetime;
  if (s && e && s !== e) {
    return `${new Date(s).toLocaleDateString()} \u2013 ${new Date(e).toLocaleDateString()}`;
  }
  if (s) {
    return new Date(s).toLocaleDateString();
  }
  return 'No time data';
}

/**
 * Test whether an item's temporal extent overlaps a temporal filter.
 * An item with no temporal data does NOT pass the filter.
 *
 * Overlap semantics: itemStart <= filter.end AND itemEnd >= filter.start
 */
export function itemOverlapsFilter(
  item: StacBrowserItem,
  filter: TemporalFilter,
): boolean {
  const itemStart = parseTime(item.startDatetime) ?? parseTime(item.datetime);
  const itemEnd = parseTime(item.endDatetime) ?? parseTime(item.datetime);
  if (itemStart === null || itemEnd === null) return false;
  return itemStart <= filter.end && itemEnd >= filter.start;
}
