/**
 * Utility functions for ExerciseListView (#129).
 *
 * Review decisions: 7A (Intl APIs), 12B (line simplification).
 */

import type { ExerciseListItem, SortDimension, GeoJSONFeatureCollection } from './types';

// ── Duration Computation ────────────────────────────────────────────

/** Compute duration in milliseconds from start/end datetimes. Returns null if either is missing. */
export function computeDuration(item: Pick<ExerciseListItem, 'startDatetime' | 'endDatetime'>): number | null {
  if (item.startDatetime == null || item.endDatetime == null) return null;
  const start = new Date(item.startDatetime).getTime();
  const end = new Date(item.endDatetime).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  const diff = end - start;
  return diff >= 0 ? diff : null;
}

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
const WEEK = 604_800_000;

/** Format a duration in ms to a human-readable string using locale-aware formatting. */
export function formatDuration(ms: number | null): string {
  if (ms == null || ms < 0) return '';

  if (ms < MINUTE) return 'less than a minute';
  if (ms < HOUR) {
    const minutes = Math.round(ms / MINUTE);
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  }
  if (ms < DAY) {
    const hours = Math.round(ms / HOUR);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  if (ms < WEEK) {
    const days = Math.round(ms / DAY);
    return `${days} ${days === 1 ? 'day' : 'days'}`;
  }
  const weeks = Math.round(ms / WEEK);
  return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
}

// ── Date Range Formatting ───────────────────────────────────────────

const dateFormatOptions: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
};

/** Format a date range as "12 Jan 2024 – 14 Jan 2024" or single date. */
export function formatDateRange(
  startDatetime: string | null,
  endDatetime: string | null,
  datetime: string | null,
): string {
  const formatter = new Intl.DateTimeFormat('en-GB', dateFormatOptions);

  if (startDatetime != null && endDatetime != null) {
    const start = new Date(startDatetime);
    const end = new Date(endDatetime);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      return `${formatter.format(start)} \u2013 ${formatter.format(end)}`;
    }
  }

  if (datetime != null) {
    const d = new Date(datetime);
    if (!Number.isNaN(d.getTime())) {
      return formatter.format(d);
    }
  }

  return 'No date information';
}

// ── Relative Time Formatting ────────────────────────────────────────

/** Format a timestamp as relative time (e.g., "2 hours ago", "yesterday"). */
export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  try {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

    if (diffSeconds < 60) return rtf.format(-diffSeconds, 'second');
    if (diffMinutes < 60) return rtf.format(-diffMinutes, 'minute');
    if (diffHours < 24) return rtf.format(-diffHours, 'hour');
    if (diffDays < 7) return rtf.format(-diffDays, 'day');
    if (diffDays < 30) return rtf.format(-Math.floor(diffDays / 7), 'week');
    return rtf.format(-Math.floor(diffDays / 30), 'month');
  } catch {
    // Fallback if Intl.RelativeTimeFormat is not available
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'yesterday';
    return `${diffDays}d ago`;
  }
}

// ── Sort Comparators ────────────────────────────────────────────────

/** Compare two nullable date strings. Null values sort to end. */
function compareDate(a: string | null, b: string | null): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
  if (Number.isNaN(ta)) return 1;
  if (Number.isNaN(tb)) return -1;
  return tb - ta; // descending by default (most recent first)
}

/** Sort comparator functions. All return descending order by default. */
export const sortComparators: Record<SortDimension, (a: ExerciseListItem, b: ExerciseListItem) => number> = {
  recency: (a, b) =>
    compareDate(a.startDatetime ?? a.datetime, b.startDatetime ?? b.datetime),
  title: (a, b) =>
    a.title.localeCompare(b.title),
  duration: (a, b) => {
    const da = computeDuration(a);
    const db = computeDuration(b);
    if (da == null && db == null) return 0;
    if (da == null) return 1;
    if (db == null) return -1;
    return db - da; // longest first by default
  },
};

// ── Metadata Truncation ─────────────────────────────────────────────

/** Truncate an array of strings, returning the visible items and overflow count. */
export function truncateArray(items: readonly string[], maxVisible: number = 3): {
  visible: string[];
  overflow: number;
} {
  if (items.length <= maxVisible) {
    return { visible: [...items], overflow: 0 };
  }
  return {
    visible: items.slice(0, maxVisible) as string[],
    overflow: items.length - maxVisible,
  };
}

// ── Line Simplification (Review 12B) ───────────────────────────────

/**
 * Douglas-Peucker line simplification for SVG thumbnail rendering.
 * Reduces point count while preserving shape characteristics.
 */
export function simplifyLine(coords: readonly (readonly number[])[], epsilon: number): number[][] {
  if (coords.length <= 2) return coords.map(c => [...c]);

  // Find the point with the maximum distance from the line segment
  let maxDist = 0;
  let maxIdx = 0;
  const start = coords[0]!;
  const end = coords[coords.length - 1]!;

  for (let i = 1; i < coords.length - 1; i++) {
    const d = perpendicularDistance(coords[i]!, start, end);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyLine(coords.slice(0, maxIdx + 1), epsilon);
    const right = simplifyLine(coords.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }

  return [[...start], [...end]];
}

/** Calculate perpendicular distance from point to line segment. */
function perpendicularDistance(
  point: readonly number[],
  lineStart: readonly number[],
  lineEnd: readonly number[],
): number {
  const px = point[0] ?? 0;
  const py = point[1] ?? 0;
  const sx = lineStart[0] ?? 0;
  const sy = lineStart[1] ?? 0;
  const ex = lineEnd[0] ?? 0;
  const ey = lineEnd[1] ?? 0;

  const dx = ex - sx;
  const dy = ey - sy;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    const pdx = px - sx;
    const pdy = py - sy;
    return Math.sqrt(pdx * pdx + pdy * pdy);
  }

  const num = Math.abs(dy * px - dx * py + ex * sy - ey * sx);
  return num / Math.sqrt(lenSq);
}

// ── GeoJSON Coordinate Extraction ───────────────────────────────────

/** Extract all line coordinates from a GeoJSON FeatureCollection. */
export function extractLineCoordinates(fc: GeoJSONFeatureCollection): number[][][] {
  const lines: number[][][] = [];

  for (const feature of fc.features) {
    const geom = feature.geometry;
    if (geom.type === 'LineString') {
      lines.push(geom.coordinates);
    } else if (geom.type === 'MultiLineString') {
      for (const line of geom.coordinates) {
        lines.push(line);
      }
    }
  }

  return lines;
}

/** Project geographic coordinates to pixel space within a bounding box. */
export function projectToPixel(
  lon: number,
  lat: number,
  bbox: readonly [number, number, number, number],
  width: number,
  height: number,
  padding: number = 4,
): [number, number] {
  const [west, south, east, north] = bbox;
  const bboxWidth = east - west;
  const bboxHeight = north - south;

  if (bboxWidth === 0 || bboxHeight === 0) {
    return [width / 2, height / 2];
  }

  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  const x = padding + ((lon - west) / bboxWidth) * usableWidth;
  const y = padding + ((north - lat) / bboxHeight) * usableHeight; // Y is inverted

  return [x, y];
}
