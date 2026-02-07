/**
 * DisplayModeToggle component - toggle between Full and Trail modes.
 */

import { Button } from 'vscrui';
import type { DisplayModeToggleProps } from './types';

/**
 * Toggle buttons for track display mode (Full vs Trail).
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
}: DisplayModeToggleProps) {
  return (
    <div
      className="debrief-display-mode-toggle"
      role="radiogroup"
      aria-label="Track display mode"
    >
      <Button
        appearance={mode === 'full' ? 'secondary' : 'icon'}
        disabled={disabled}
        onClick={() => onModeChange('full')}
        aria-pressed={mode === 'full'}
        title="Show full track"
      >
        Full
      </Button>
      <Button
        appearance={mode === 'trail' ? 'secondary' : 'icon'}
        disabled={disabled}
        onClick={() => onModeChange('trail')}
        aria-pressed={mode === 'trail'}
        title="Show trail to current time"
      >
        Trail
      </Button>
    </div>
  );
}
