import type { DebriefFeature, DebriefFeatureCollection, TimeExtent } from './types';
import { isTrackFeature, isReferenceLocation } from './types';

// Resolver + type are now canonical in @debrief/utils; re-export them from
// this module so existing consumers of `@debrief/components`'s barrel
// continue to work.
export type { PointShape, ResolvedPositionStyle } from '@debrief/utils';
export {
  resolvePositionStyle,
  computeAllPositionStyles,
} from '@debrief/utils';

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
      let startTime = parseTime(feature.properties.start_time);
      let endTime = parseTime(feature.properties.end_time);

      // Fallback: derive from positions array
      if (startTime === null || endTime === null) {
        const positions = feature.properties.positions;
        if (positions.length > 0) {
          if (startTime === null) {
            startTime = parseTime(positions[0]?.time);
          }
          if (endTime === null) {
            endTime = parseTime(positions[positions.length - 1]?.time);
          }
        }
      }

      if (startTime !== null) {
        minTime = Math.min(minTime, startTime);
      }
      if (endTime !== null) {
        maxTime = Math.max(maxTime, endTime);
      }
    } else if (isReferenceLocation(feature)) {
      const validFrom = parseTime(feature.properties.valid_from);
      if (validFrom !== null) {
        minTime = Math.min(minTime, validFrom);
      }
      const validUntil = parseTime(feature.properties.valid_until);
      if (validUntil !== null) {
        maxTime = Math.max(maxTime, validUntil);
      }
    } else if ('time' in feature.properties) {
      // NarrativeEntry has a single time property
      const time = parseTime(feature.properties.time as string);
      if (time !== null) {
        minTime = Math.min(minTime, time);
        maxTime = Math.max(maxTime, time);
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

