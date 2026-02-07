/**
 * PlaybackControls component - play/pause button.
 */

import { Button, Icon } from 'vscrui';
import type { PlaybackControlsProps } from './types';

/**
 * Play/Pause button for controlling time playback.
 *
 * @example
 * ```tsx
 * <PlaybackControls
 *   playbackState={playbackState}
 *   onToggle={togglePlayback}
 * />
 * ```
 */
export function PlaybackControls({
  playbackState,
  onToggle,
  disabled = false,
}: PlaybackControlsProps) {
  const isPlaying = playbackState === 'playing';

  return (
    <Button
      appearance="icon"
      onClick={onToggle}
      disabled={disabled}
      aria-label={isPlaying ? 'Pause' : 'Play'}
      title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
    >
      <Icon name={isPlaying ? 'debug-pause' : 'debug-start'} />
    </Button>
  );
}
