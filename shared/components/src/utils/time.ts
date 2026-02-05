import type { DebriefFeature, DebriefFeatureCollection, TimeExtent } from './types';
import { isTrackFeature } from './types';
import type { PositionStyle, PositionStyleOverride } from '@debrief/schemas';

/**
 * Calculate the time extent (start/end times) for a collection of features.
 * Returns [startTime, endTime] in milliseconds since epoch, or null if no temporal data.
 *
 * @param features - FeatureCollection or array of features
 * @returns TimeExtent tuple or null if no valid times found
 */
export function calculateTimeExtent(
  features: DebriefFeatureCollection | DebriefFeature[]
): TimeExtent | null {
  const featureArray = Array.isArray(features) ? features : features.features;

  if (featureArray.length === 0) {
    return null;
  }

  let minTime = Infinity;
  let maxTime = -Infinity;

  for (const feature of featureArray) {
    if (isTrackFeature(feature)) {
      // Track has start_time and end_time (preferred)
      let startTime = parseTime(feature.properties.start_time);
      let endTime = parseTime(feature.properties.end_time);

      // Fallback: derive from times array if start_time/end_time not present
      if (startTime === null || endTime === null) {
        const props = feature.properties as unknown as Record<string, unknown>;
        const times = props.times as unknown[] | undefined;
        if (Array.isArray(times) && times.length > 0) {
          // times can be ISO strings or milliseconds
          const firstTime = times[0];
          const lastTime = times[times.length - 1];
          if (startTime === null && firstTime !== undefined) {
            startTime = typeof firstTime === 'number' ? firstTime : parseTime(firstTime as string);
          }
          if (endTime === null && lastTime !== undefined) {
            endTime = typeof lastTime === 'number' ? lastTime : parseTime(lastTime as string);
          }
        }
      }

      if (startTime !== null) {
        minTime = Math.min(minTime, startTime);
      }
      if (endTime !== null) {
        maxTime = Math.max(maxTime, endTime);
      }
    } else {
      // ReferenceLocation and other feature types may have various time properties
      const props = feature.properties as unknown as Record<string, unknown>;

      // Check for valid_from/valid_until (schema properties)
      if (props.valid_from) {
        const validFrom = parseTime(props.valid_from as string);
        if (validFrom !== null) {
          minTime = Math.min(minTime, validFrom);
        }
      }
      if (props.valid_until) {
        const validUntil = parseTime(props.valid_until as string);
        if (validUntil !== null) {
          maxTime = Math.max(maxTime, validUntil);
        }
      }

      // Check for start_time/end_time (used by PERIODTEXT, ELLIPSE2, etc.)
      if (props.start_time) {
        const startTime = parseTime(props.start_time as string);
        if (startTime !== null) {
          minTime = Math.min(minTime, startTime);
        }
      }
      if (props.end_time) {
        const endTime = parseTime(props.end_time as string);
        if (endTime !== null) {
          maxTime = Math.max(maxTime, endTime);
        }
      }

      // Check for single time property (used by TIMETEXT, ELLIPSE, SENSOR, etc.)
      if (props.time) {
        const time = parseTime(props.time as string);
        if (time !== null) {
          minTime = Math.min(minTime, time);
          maxTime = Math.max(maxTime, time);
        }
      }
    }
  }

  // Check if we found any valid times
  if (minTime === Infinity || maxTime === -Infinity) {
    return null;
  }

  return [minTime, maxTime];
}

/**
 * Parse an ISO8601 time string to milliseconds since epoch.
 * Returns null if the string is invalid.
 */
export function parseTime(timeString: string | undefined | null): number | null {
  if (!timeString) {
    return null;
  }

  const timestamp = Date.parse(timeString);
  return isNaN(timestamp) ? null : timestamp;
}

/**
 * Format a timestamp as a readable string.
 *
 * @param timestamp - Milliseconds since epoch
 * @param format - Format style ('short', 'medium', 'long')
 * @returns Formatted date/time string
 */
export function formatTime(
  timestamp: number,
  format: 'short' | 'medium' | 'long' = 'medium'
): string {
  const date = new Date(timestamp);

  switch (format) {
    case 'short':
      return date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      });
    case 'long':
      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    case 'medium':
    default:
      return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
  }
}

/**
 * Calculate the duration between two timestamps in a human-readable format.
 */
export function formatDuration(startMs: number, endMs: number): string {
  const durationMs = endMs - startMs;
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${seconds}s`;
}

/**
 * Parse an ISO 8601 duration string to milliseconds.
 * Supports formats like PT5M, PT1H30M, P1D, P1DT12H, etc.
 *
 * @param duration - ISO 8601 duration string (e.g., "PT5M", "PT1H", "P1D")
 * @returns Duration in milliseconds, or null if invalid/empty
 */
export function parseDuration(duration: string | null | undefined): number | null {
  if (!duration || typeof duration !== 'string') {
    return null;
  }

  // ISO 8601 duration regex: P[n]D[T[n]H[n]M[n]S]
  const match = duration.match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/
  );

  if (!match) {
    return null;
  }

  const [, days, hours, minutes, seconds] = match;

  // Check that at least one component is present
  if (!days && !hours && !minutes && !seconds) {
    return null;
  }

  const totalMs =
    (parseInt(days || '0', 10) * 24 * 60 * 60 * 1000) +
    (parseInt(hours || '0', 10) * 60 * 60 * 1000) +
    (parseInt(minutes || '0', 10) * 60 * 1000) +
    (parseFloat(seconds || '0') * 1000);

  return totalMs > 0 ? totalMs : null;
}

/**
 * Find position indices that match an interval pattern.
 * Returns the set of indices where positions fall on interval boundaries
 * (or are the closest position to an interval boundary).
 *
 * @param timestamps - Array of position timestamps in milliseconds
 * @param intervalMs - Interval duration in milliseconds
 * @returns Set of indices that should display symbols/labels
 */
export function findIntervalPositions(
  timestamps: number[],
  intervalMs: number
): Set<number> {
  const result = new Set<number>();

  if (timestamps.length === 0 || intervalMs <= 0) {
    return result;
  }

  // First position always included
  result.add(0);

  if (timestamps.length === 1) {
    return result;
  }

  const startTime = timestamps[0]!;
  const endTime = timestamps[timestamps.length - 1]!;

  // Calculate interval marks from start time
  let nextIntervalTime = startTime + intervalMs;

  while (nextIntervalTime <= endTime) {
    // Find the closest position to this interval mark
    let closestIdx = -1;
    let closestDistance = Infinity;

    for (let i = 0; i < timestamps.length; i++) {
      const distance = Math.abs(timestamps[i]! - nextIntervalTime);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIdx = i;
      }
    }

    if (closestIdx >= 0) {
      result.add(closestIdx);
    }

    nextIntervalTime += intervalMs;
  }

  // Last position always included (if different from first)
  if (timestamps.length > 1) {
    result.add(timestamps.length - 1);
  }

  return result;
}

/**
 * Resolved position style after applying cascade.
 */
export interface ResolvedPositionStyle {
  showSymbol: boolean;
  symbol: 'circle' | 'square' | 'triangle';
  showLabel: boolean;
  labelText: string | null;
}

/**
 * Resolve the final styling for a position by applying the cascade:
 * default_position_style → interval rules → position_style_overrides
 *
 * @param index - Position index
 * @param defaultStyle - Default position style from track properties
 * @param symbolIntervalPositions - Set of indices that match symbol_interval
 * @param labelIntervalPositions - Set of indices that match label_interval
 * @param override - Position-specific override (may be null)
 * @param positionTime - Position timestamp for default label text
 * @returns Resolved styling for this position
 */
export function resolvePositionStyle(
  index: number,
  defaultStyle: PositionStyle,
  symbolIntervalPositions: Set<number>,
  labelIntervalPositions: Set<number>,
  override: PositionStyleOverride | null | undefined,
  positionTime: string | number | null
): ResolvedPositionStyle {
  // Start with defaults
  let showSymbol = defaultStyle.show_symbol;
  let symbol = defaultStyle.symbol as 'circle' | 'square' | 'triangle';
  let showLabel = defaultStyle.show_label;
  let labelText: string | null = null;

  // Apply interval rules
  if (symbolIntervalPositions.has(index)) {
    showSymbol = true;
  }
  if (labelIntervalPositions.has(index)) {
    showLabel = true;
  }

  // Apply overrides (highest priority)
  if (override) {
    if (override.show_symbol !== undefined && override.show_symbol !== null) {
      showSymbol = override.show_symbol;
    }
    if (override.symbol) {
      symbol = override.symbol as 'circle' | 'square' | 'triangle';
    }
    if (override.show_label !== undefined && override.show_label !== null) {
      showLabel = override.show_label;
    }
    if (override.label) {
      labelText = override.label;
    }
  }

  // Generate default label text from timestamp if showing label but no custom text
  if (showLabel && !labelText && positionTime) {
    const timestamp = typeof positionTime === 'number'
      ? positionTime
      : Date.parse(positionTime);
    if (!isNaN(timestamp)) {
      labelText = new Date(timestamp).toLocaleTimeString();
    }
  }

  return { showSymbol, symbol, showLabel, labelText };
}

/**
 * Compute resolved styles for all positions in a track.
 *
 * @param positions - Array of position timestamps (ISO strings or ms)
 * @param defaultStyle - Default position style
 * @param symbolInterval - Symbol interval duration string (ISO 8601)
 * @param labelInterval - Label interval duration string (ISO 8601)
 * @param overrides - Array of position style overrides (sparse, may contain nulls)
 * @returns Array of resolved styles for each position
 */
export function computeAllPositionStyles(
  positions: Array<{ time: string }>,
  defaultStyle: PositionStyle,
  symbolInterval: string | null | undefined,
  labelInterval: string | null | undefined,
  overrides: Array<PositionStyleOverride | null> | undefined
): ResolvedPositionStyle[] {
  // Parse timestamps
  const timestamps = positions.map(p => Date.parse(p.time));

  // Calculate interval positions
  const symbolIntervalMs = parseDuration(symbolInterval);
  const labelIntervalMs = parseDuration(labelInterval);

  const symbolIntervalPositions = symbolIntervalMs
    ? findIntervalPositions(timestamps, symbolIntervalMs)
    : new Set<number>();

  const labelIntervalPositions = labelIntervalMs
    ? findIntervalPositions(timestamps, labelIntervalMs)
    : new Set<number>();

  // Resolve each position
  return positions.map((pos, index) => {
    const override = overrides?.[index] ?? null;
    return resolvePositionStyle(
      index,
      defaultStyle,
      symbolIntervalPositions,
      labelIntervalPositions,
      override,
      pos.time
    );
  });
}
