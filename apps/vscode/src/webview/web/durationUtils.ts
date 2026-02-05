/**
 * ISO 8601 Duration Utilities
 *
 * Parses ISO 8601 PT duration strings (e.g., "PT5M", "PT1H30M", "P1D")
 * into milliseconds for interval-based position rendering.
 */

/**
 * Parse an ISO 8601 duration string into milliseconds.
 *
 * Supports PT durations:
 * - PT5M = 5 minutes = 300000ms
 * - PT1H = 1 hour = 3600000ms
 * - PT30S = 30 seconds = 30000ms
 * - PT1H30M = 1.5 hours = 5400000ms
 * - P1D = 1 day = 86400000ms
 *
 * @param duration ISO 8601 duration string (e.g., "PT5M")
 * @returns Duration in milliseconds, or null if invalid
 */
export function parseDuration(duration: string | null | undefined): number | null {
  if (!duration || typeof duration !== 'string') {
    return null;
  }

  // Match ISO 8601 duration pattern
  // P[nD][T[nH][nM][nS]] or PT[nH][nM][nS]
  const match = duration.match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/
  );

  if (!match) {
    return null;
  }

  const [, days, hours, minutes, seconds] = match;

  // Must have at least one component
  if (!days && !hours && !minutes && !seconds) {
    return null;
  }

  let totalMs = 0;

  if (days) {
    totalMs += parseInt(days, 10) * 24 * 60 * 60 * 1000;
  }
  if (hours) {
    totalMs += parseInt(hours, 10) * 60 * 60 * 1000;
  }
  if (minutes) {
    totalMs += parseInt(minutes, 10) * 60 * 1000;
  }
  if (seconds) {
    totalMs += parseFloat(seconds) * 1000;
  }

  return totalMs > 0 ? totalMs : null;
}

/**
 * Format milliseconds as a human-readable duration string.
 *
 * @param ms Duration in milliseconds
 * @returns Human-readable string (e.g., "5 min", "1 hr 30 min")
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  return `${seconds}s`;
}
