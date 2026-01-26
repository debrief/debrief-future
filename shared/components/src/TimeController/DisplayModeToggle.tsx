/**
 * DisplayModeToggle component - toggle between Full and Trail modes.
 */

import { useCallback } from 'react';
import type { DisplayModeToggleProps, DisplayMode } from './types';

/**
 * Toggle switch for track display mode (Full vs Trail).
 * - Full: Shows entire track regardless of time position
 * - Trail: Shows track history from start up to current time position
 *
 * @example
 * ```tsx
 * <DisplayModeToggle
 *   mode={displayMode}
 *   onModeChange={setDisplayMode}
 * />
 * ```
 */
export function DisplayModeToggle({
  mode,
  onModeChange,
  disabled = false,
  className,
}: DisplayModeToggleProps) {
  const isTrail = mode === 'trail';

  const handleToggle = useCallback(() => {
    if (!disabled) {
      const newMode: DisplayMode = mode === 'full' ? 'trail' : 'full';
      onModeChange(newMode);
    }
  }, [disabled, mode, onModeChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleToggle();
      }
    },
    [disabled, handleToggle]
  );

  return (
    <div
      className={`debrief-display-mode-toggle ${disabled ? 'debrief-display-mode-toggle--disabled' : ''} ${className ?? ''}`}
    >
      <span
        className={`debrief-display-mode-toggle__label ${!isTrail ? 'debrief-display-mode-toggle__label--active' : ''}`}
      >
        Full
      </span>

      <button
        type="button"
        role="switch"
        aria-checked={isTrail}
        aria-label={`Track display mode: ${mode}`}
        className={`debrief-display-mode-toggle__switch ${isTrail ? 'debrief-display-mode-toggle__switch--trail' : ''}`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      >
        <span className="debrief-display-mode-toggle__thumb" />
      </button>

      <span
        className={`debrief-display-mode-toggle__label ${isTrail ? 'debrief-display-mode-toggle__label--active' : ''}`}
      >
        Trail
      </span>
    </div>
  );
}
