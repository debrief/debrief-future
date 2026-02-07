/**
 * TimeDisplay component - shows the current time position.
 */

import type { TimeDisplayProps } from './types';
import { formatTime } from './timeUtils';

/**
 * Displays the current time position in HH:MM:SS format.
 *
 * @example
 * ```tsx
 * <TimeDisplay time={currentTime} />
 * ```
 */
export function TimeDisplay({ time, className }: TimeDisplayProps) {
  const formattedTime = formatTime(time);

  return (
    <div
      className={`debrief-time-display ${className ?? ''}`}
      aria-label={`Current time: ${formattedTime}`}
      aria-live="polite"
    >
      <span className="debrief-time-display__value">{formattedTime}</span>
    </div>
  );
}
