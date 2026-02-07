/**
 * Time formatting utilities for the TimeController component.
 */

/**
 * Format a timestamp as HH:MM:SS.
 * @param time - Time in milliseconds since epoch
 * @returns Formatted time string
 */
export function formatTime(time: number): string {
  const date = new Date(time);
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const seconds = date.getUTCSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Format a timestamp as a full date-time string.
 * @param time - Time in milliseconds since epoch
 * @returns Formatted date-time string (YYYY-MM-DD HH:MM:SS)
 */
export function formatDateTime(time: number): string {
  const date = new Date(time);
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  return `${year}-${month}-${day} ${formatTime(time)}`;
}

/**
 * Format a time range as a human-readable string.
 * @param start - Start time in milliseconds since epoch
 * @param end - End time in milliseconds since epoch
 * @returns Formatted range string
 */
export function formatTimeRange(start: number, end: number): string {
  const startDate = new Date(start);
  const endDate = new Date(end);

  // If same day, show date once
  if (
    startDate.getUTCFullYear() === endDate.getUTCFullYear() &&
    startDate.getUTCMonth() === endDate.getUTCMonth() &&
    startDate.getUTCDate() === endDate.getUTCDate()
  ) {
    const year = startDate.getUTCFullYear();
    const month = (startDate.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = startDate.getUTCDate().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${formatTime(start)} - ${formatTime(end)}`;
  }

  // Different days
  return `${formatDateTime(start)} - ${formatDateTime(end)}`;
}

/**
 * Calculate the duration of a time range in milliseconds.
 * @param start - Start time in milliseconds since epoch
 * @param end - End time in milliseconds since epoch
 * @returns Duration in milliseconds
 */
export function calculateDuration(start: number, end: number): number {
  return Math.max(0, end - start);
}

/**
 * Format a duration as a human-readable string.
 * @param durationMs - Duration in milliseconds
 * @returns Formatted duration string
 */
export function formatDuration(durationMs: number): string {
  const totalSeconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Calculate the percentage position within a time range.
 * @param time - Current time in milliseconds since epoch
 * @param start - Start time in milliseconds since epoch
 * @param end - End time in milliseconds since epoch
 * @returns Percentage (0-100)
 */
export function timeToPercent(time: number, start: number, end: number): number {
  const duration = end - start;
  if (duration <= 0) return 0;
  const position = time - start;
  return Math.min(100, Math.max(0, (position / duration) * 100));
}

/**
 * Calculate the time from a percentage position within a range.
 * @param percent - Percentage (0-100)
 * @param start - Start time in milliseconds since epoch
 * @param end - End time in milliseconds since epoch
 * @returns Time in milliseconds since epoch
 */
export function percentToTime(percent: number, start: number, end: number): number {
  const duration = end - start;
  const clampedPercent = Math.min(100, Math.max(0, percent));
  return start + (clampedPercent / 100) * duration;
}

/**
 * Calculate a reasonable scrub increment based on the time range.
 * For short ranges, scrub in smaller increments.
 * @param start - Start time in milliseconds since epoch
 * @param end - End time in milliseconds since epoch
 * @returns Scrub increment in milliseconds
 */
export function calculateScrubIncrement(start: number, end: number): number {
  const duration = end - start;

  // ~100 scrub steps across the range, minimum 1 second
  const increment = Math.max(1000, duration / 100);

  // Round to a nice number
  if (increment >= 60000) {
    // Round to nearest minute
    return Math.round(increment / 60000) * 60000;
  }
  if (increment >= 1000) {
    // Round to nearest second
    return Math.round(increment / 1000) * 1000;
  }
  return increment;
}

/**
 * Clamp a time value to within a range.
 * @param time - Time to clamp
 * @param start - Start of range
 * @param end - End of range
 * @returns Clamped time value
 */
export function clampTime(time: number, start: number, end: number): number {
  return Math.min(end, Math.max(start, time));
}
