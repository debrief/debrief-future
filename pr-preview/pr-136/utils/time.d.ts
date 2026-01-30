import { DebriefFeature, DebriefFeatureCollection, TimeExtent } from './types';

/**
 * Calculate the time extent (start/end times) for a collection of features.
 * Returns [startTime, endTime] in milliseconds since epoch, or null if no temporal data.
 *
 * @param features - FeatureCollection or array of features
 * @returns TimeExtent tuple or null if no valid times found
 */
export declare function calculateTimeExtent(features: DebriefFeatureCollection | DebriefFeature[]): TimeExtent | null;
/**
 * Parse an ISO8601 time string to milliseconds since epoch.
 * Returns null if the string is invalid.
 */
export declare function parseTime(timeString: string | undefined | null): number | null;
/**
 * Format a timestamp as a readable string.
 *
 * @param timestamp - Milliseconds since epoch
 * @param format - Format style ('short', 'medium', 'long')
 * @returns Formatted date/time string
 */
export declare function formatTime(timestamp: number, format?: 'short' | 'medium' | 'long'): string;
/**
 * Calculate the duration between two timestamps in a human-readable format.
 */
export declare function formatDuration(startMs: number, endMs: number): string;
//# sourceMappingURL=time.d.ts.map