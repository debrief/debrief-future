import { DebriefFeature, DebriefFeatureCollection, TimeExtent } from './types';

export type { PointShape, ResolvedPositionStyle } from '@debrief/utils';
export { resolvePositionStyle, computeAllPositionStyles, } from '@debrief/utils';
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
/**
 * Parse an ISO 8601 duration string to milliseconds.
 * Supports formats like PT5M, PT1H30M, P1D, P1DT12H, etc.
 *
 * @param duration - ISO 8601 duration string (e.g., "PT5M", "PT1H", "P1D")
 * @returns Duration in milliseconds, or null if invalid/empty
 */
export declare function parseDuration(duration: string | null | undefined): number | null;
/**
 * Find position indices that match an interval pattern.
 * Returns the set of indices where positions fall on interval boundaries
 * (or are the closest position to an interval boundary).
 *
 * @param timestamps - Array of position timestamps in milliseconds
 * @param intervalMs - Interval duration in milliseconds
 * @returns Set of indices that should display symbols/labels
 */
export declare function findIntervalPositions(timestamps: number[], intervalMs: number): Set<number>;
//# sourceMappingURL=time.d.ts.map