/**
 * SpeedSelector component - up/down spinner for playback speed selection.
 */

import { useCallback } from 'react';
import type { SpeedSelectorProps, PlaybackSpeed } from './types';

const SPEED_OPTIONS: PlaybackSpeed[] = [1, 2, 4, 8, 16, 32, 64];

/**
 * Spinner selector for playback speed (1x, 2x, 4x, 8x).
 * Up/down arrows cycle through preset values.
 *
 * @example
 * ```tsx
 * <SpeedSelector
 *   speed={speed}
 *   onSpeedChange={setSpeed}
 * />
 * ```
 */
export function SpeedSelector({
  speed,
  onSpeedChange,
  disabled = false,
  className,
}: SpeedSelectorProps) {
  const currentIndex = SPEED_OPTIONS.indexOf(speed);

  const handleUp = useCallback(() => {
    const nextIndex = Math.min(currentIndex + 1, SPEED_OPTIONS.length - 1);
    const nextSpeed = SPEED_OPTIONS[nextIndex];
    if (nextSpeed !== undefined) onSpeedChange(nextSpeed);
  }, [currentIndex, onSpeedChange]);

  const handleDown = useCallback(() => {
    const prevIndex = Math.max(currentIndex - 1, 0);
    const prevSpeed = SPEED_OPTIONS[prevIndex];
    if (prevSpeed !== undefined) onSpeedChange(prevSpeed);
  }, [currentIndex, onSpeedChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleUp();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleDown();
      }
    },
    [disabled, handleUp, handleDown]
  );

  return (
    <div
      className={`debrief-speed-selector ${disabled ? 'debrief-speed-selector--disabled' : ''} ${className ?? ''}`}
      role="spinbutton"
      aria-valuenow={speed}
      aria-valuemin={SPEED_OPTIONS[0]}
      aria-valuemax={SPEED_OPTIONS[SPEED_OPTIONS.length - 1]}
      aria-label={`Playback speed: ${speed}x`}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        className="debrief-speed-selector__step-btn debrief-speed-selector__step-btn--down"
        onClick={handleDown}
        disabled={disabled || currentIndex === 0}
        aria-label="Decrease speed"
        tabIndex={-1}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M7 14l5-5 5 5z" />
        </svg>
      </button>
      <span className="debrief-speed-selector__value">{speed}x</span>
      <button
        type="button"
        className="debrief-speed-selector__step-btn debrief-speed-selector__step-btn--up"
        onClick={handleUp}
        disabled={disabled || currentIndex === SPEED_OPTIONS.length - 1}
        aria-label="Increase speed"
        tabIndex={-1}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M7 10l5 5 5-5z" />
        </svg>
      </button>
    </div>
  );
}
