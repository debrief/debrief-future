/**
 * Time formatting utilities for the TimeController component.
 */
/**
 * Format a timestamp as HH:MM:SS.
 * @param time - Time in milliseconds since epoch
 * @returns Formatted time string
 */
export declare function formatTime(time: number): string;
/**
 * Format a timestamp as a full date-time string.
 * @param time - Time in milliseconds since epoch
 * @returns Formatted date-time string (YYYY-MM-DD HH:MM:SS)
 */
export declare function formatDateTime(time: number): string;
/**
 * Format a time range as a human-readable string.
 * @param start - Start time in milliseconds since epoch
 * @param end - End time in milliseconds since epoch
 * @returns Formatted range string
 */
export declare function formatTimeRange(start: number, end: number): string;
/**
 * Calculate the duration of a time range in milliseconds.
 * @param start - Start time in milliseconds since epoch
 * @param end - End time in milliseconds since epoch
 * @returns Duration in milliseconds
 */
export declare function calculateDuration(start: number, end: number): number;
/**
 * Format a duration as a human-readable string.
 * @param durationMs - Duration in milliseconds
 * @returns Formatted duration string
 */
export declare function formatDuration(durationMs: number): string;
/**
 * Calculate the percentage position within a time range.
 * @param time - Current time in milliseconds since epoch
 * @param start - Start time in milliseconds since epoch
 * @param end - End time in milliseconds since epoch
 * @returns Percentage (0-100)
 */
export declare function timeToPercent(time: number, start: number, end: number): number;
/**
 * Calculate the time from a percentage position within a range.
 * @param percent - Percentage (0-100)
 * @param start - Start time in milliseconds since epoch
 * @param end - End time in milliseconds since epoch
 * @returns Time in milliseconds since epoch
 */
export declare function percentToTime(percent: number, start: number, end: number): number;
/**
 * Calculate a reasonable scrub increment based on the time range.
 * For short ranges, scrub in smaller increments.
 * @param start - Start time in milliseconds since epoch
 * @param end - End time in milliseconds since epoch
 * @returns Scrub increment in milliseconds
 */
export declare function calculateScrubIncrement(start: number, end: number): number;
/**
 * Clamp a time value to within a range.
 * @param time - Time to clamp
 * @param start - Start of range
 * @param end - End of range
 * @returns Clamped time value
 */
export declare function clampTime(time: number, start: number, end: number): number;
//# sourceMappingURL=timeUtils.d.ts.map