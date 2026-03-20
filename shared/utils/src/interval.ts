/**
 * Interval-Based Position Utilities
 *
 * Determines which positions should display symbols/labels based on
 * interval rules and explicit overrides.
 */

import { parseDuration } from './duration.js';
import type {
  PositionStyle,
  PositionStyleOverride,
  ResolvedPositionStyle,
} from './types.js';

// Re-export types for convenience
export type { PositionStyle, PositionStyleOverride, ResolvedPositionStyle };

/**
 * Find position indices that match a time interval.
 *
 * Given an array of timestamps and an interval duration, returns the indices
 * of positions that fall at or near interval boundaries from the start time.
 *
 * Uses "nearest position" logic when intervals don't align exactly with
 * position timestamps.
 *
 * @param timestamps Array of epoch timestamps (ms) for each position
 * @param intervalMs Interval duration in milliseconds
 * @returns Set of position indices that match the interval
 */
export function findIntervalPositions(
  timestamps: number[],
  intervalMs: number
): Set<number> {
  const result = new Set<number>();

  if (timestamps.length === 0 || intervalMs <= 0) {
    return result;
  }

  const startTime = timestamps[0]!;
  const endTime = timestamps[timestamps.length - 1]!;

  // Calculate each interval mark from start time
  let intervalTime: number = startTime;
  while (intervalTime <= endTime) {
    // Find nearest position to this interval time
    const nearestIdx = findNearestPositionIndex(timestamps, intervalTime);
    if (nearestIdx >= 0) {
      result.add(nearestIdx);
    }
    intervalTime += intervalMs;
  }

  return result;
}

/**
 * Find the index of the position nearest to the target time.
 *
 * @param timestamps Array of epoch timestamps (ms)
 * @param targetTime Target time to find nearest position to
 * @returns Index of nearest position, or -1 if array is empty
 */
export function findNearestPositionIndex(
  timestamps: number[],
  targetTime: number
): number {
  if (timestamps.length === 0) {
    return -1;
  }

  if (timestamps.length === 1) {
    return 0;
  }

  // Binary search for efficiency with large tracks
  let low = 0;
  let high = timestamps.length - 1;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (timestamps[mid]! < targetTime) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  // Compare with adjacent position to find nearest
  if (low === 0) {
    return 0;
  }

  const diffLow = Math.abs(timestamps[low]! - targetTime);
  const diffPrev = Math.abs(timestamps[low - 1]! - targetTime);

  return diffPrev <= diffLow ? low - 1 : low;
}

/**
 * Resolve the style for a single position using the cascade:
 * default_position_style → interval rules → position_style_overrides
 *
 * @param index Position index
 * @param defaultStyle Default position style for the track
 * @param symbolIntervalPositions Set of positions matching symbol interval
 * @param labelIntervalPositions Set of positions matching label interval
 * @param override Position-specific override (may be null)
 * @param positionTime ISO timestamp for this position (used as default label)
 * @returns Resolved style for rendering
 */
export function resolvePositionStyle(
  index: number,
  defaultStyle: PositionStyle,
  symbolIntervalPositions: Set<number>,
  labelIntervalPositions: Set<number>,
  override: PositionStyleOverride | null | undefined,
  positionTime: string
): ResolvedPositionStyle {
  // 1. Start with defaults
  let showSymbol = defaultStyle.show_symbol;
  let symbol = defaultStyle.symbol;
  let showLabel = defaultStyle.show_label;
  let label: string | null = null;

  // 2. Apply interval rules (intervals enable, they don't disable)
  if (symbolIntervalPositions.has(index)) {
    showSymbol = true;
  }
  if (labelIntervalPositions.has(index)) {
    showLabel = true;
  }

  // 3. Apply explicit override (highest priority)
  if (override) {
    if (override.show_symbol !== undefined) {
      showSymbol = override.show_symbol;
    }
    if (override.symbol !== undefined) {
      symbol = override.symbol;
    }
    if (override.show_label !== undefined) {
      showLabel = override.show_label;
    }
    if (override.label !== undefined) {
      label = override.label;
    }
  }

  // 4. Default label text to formatted timestamp
  if (showLabel && label === null) {
    label = formatTimestampForLabel(positionTime);
  }

  return {
    showSymbol,
    symbol,
    showLabel,
    label,
  };
}

/**
 * Format a timestamp for position label display.
 *
 * @param isoTimestamp ISO 8601 timestamp string
 * @returns Formatted time string (HH:MM:SS)
 */
export function formatTimestampForLabel(isoTimestamp: string): string {
  try {
    const date = new Date(isoTimestamp);
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return isoTimestamp;
  }
}

/**
 * Compute all resolved styles for a track's positions.
 *
 * @param positions Array of position timestamps (ISO strings)
 * @param defaultStyle Default position style
 * @param symbolInterval Symbol interval string (ISO 8601 duration) or null
 * @param labelInterval Label interval string (ISO 8601 duration) or null
 * @param overrides Array of overrides (parallel to positions, may contain nulls)
 * @returns Array of resolved styles (parallel to positions)
 */
export function computeAllPositionStyles(
  positions: { time: string }[],
  defaultStyle: PositionStyle,
  symbolInterval: string | null | undefined,
  labelInterval: string | null | undefined,
  overrides: (PositionStyleOverride | null)[] | null | undefined
): ResolvedPositionStyle[] {
  // Parse timestamps to epoch ms for interval calculations
  const timestamps = positions.map((p) => new Date(p.time).getTime());

  // Compute interval positions
  const symbolIntervalMs = parseDuration(symbolInterval);
  const labelIntervalMs = parseDuration(labelInterval);

  const symbolIntervalPositions = symbolIntervalMs
    ? findIntervalPositions(timestamps, symbolIntervalMs)
    : new Set<number>();

  const labelIntervalPositions = labelIntervalMs
    ? findIntervalPositions(timestamps, labelIntervalMs)
    : new Set<number>();

  // Resolve style for each position
  return positions.map((pos, i) => {
    const override = overrides && overrides[i] ? overrides[i] : null;
    return resolvePositionStyle(
      i,
      defaultStyle,
      symbolIntervalPositions,
      labelIntervalPositions,
      override,
      pos.time
    );
  });
}
