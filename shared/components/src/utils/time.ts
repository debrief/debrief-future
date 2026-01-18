import type { DebriefFeature, DebriefFeatureCollection, TimeExtent } from './types';
import { isTrackFeature } from './types';

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
      // Track has start_time and end_time
      const startTime = parseTime(feature.properties.start_time);
      const endTime = parseTime(feature.properties.end_time);

      if (startTime !== null) {
        minTime = Math.min(minTime, startTime);
      }
      if (endTime !== null) {
        maxTime = Math.max(maxTime, endTime);
      }
    } else {
      // ReferenceLocation may have valid_from and valid_until
      const props = feature.properties;
      if (props.valid_from) {
        const validFrom = parseTime(props.valid_from);
        if (validFrom !== null) {
          minTime = Math.min(minTime, validFrom);
        }
      }
      if (props.valid_until) {
        const validUntil = parseTime(props.valid_until);
        if (validUntil !== null) {
          maxTime = Math.max(maxTime, validUntil);
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
