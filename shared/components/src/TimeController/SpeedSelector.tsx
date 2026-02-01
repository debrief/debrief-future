/**
 * SpeedSelector component - dropdown for playback speed selection.
 */

import { Dropdown } from 'vscrui';
import type { SpeedSelectorProps, PlaybackSpeed } from './types';

const SPEED_OPTIONS: PlaybackSpeed[] = [1, 2, 4, 8, 16, 32, 64];

/**
 * Dropdown selector for playback speed (1x, 2x, 4x, 8x, 16x, 32x, 64x).
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
}: SpeedSelectorProps) {
  const options = SPEED_OPTIONS.map((s) => ({
    label: `${s}x`,
    value: String(s),
  }));

  return (
    <Dropdown
      options={options}
      value={String(speed)}
      disabled={disabled}
      onChange={(value) => {
        if (typeof value === 'string') {
          const newSpeed = Number(value) as PlaybackSpeed;
          if (SPEED_OPTIONS.includes(newSpeed)) {
            onSpeedChange(newSpeed);
          }
        }
      }}
    />
  );
}
