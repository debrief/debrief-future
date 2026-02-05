import { DebriefFeature, DebriefFeatureCollection, TimeExtent } from './types';
import { PositionStyle, PositionStyleOverride } from '@debrief/schemas';

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
export declare function resolvePositionStyle(index: number, defaultStyle: PositionStyle, symbolIntervalPositions: Set<number>, labelIntervalPositions: Set<number>, override: PositionStyleOverride | null | undefined, positionTime: string | number | null): ResolvedPositionStyle;
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
export declare function computeAllPositionStyles(positions: Array<{
    time: string;
}>, defaultStyle: PositionStyle, symbolInterval: string | null | undefined, labelInterval: string | null | undefined, overrides: Array<PositionStyleOverride | null> | undefined): ResolvedPositionStyle[];
//# sourceMappingURL=time.d.ts.map