/**
 * PlaybackControls component - play/pause button.
 */

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
  className,
}: PlaybackControlsProps) {
  const isPlaying = playbackState === 'playing';

  return (
    <button
      type="button"
      className={`debrief-playback-controls ${isPlaying ? 'debrief-playback-controls--playing' : 'debrief-playback-controls--paused'} ${disabled ? 'debrief-playback-controls--disabled' : ''} ${className ?? ''}`}
      onClick={onToggle}
      disabled={disabled}
      aria-label={isPlaying ? 'Pause' : 'Play'}
      title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
    >
      {isPlaying ? (
        // Pause icon
        <svg
          className="debrief-playback-controls__icon"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <rect x="6" y="4" width="4" height="16" rx="1" />
          <rect x="14" y="4" width="4" height="16" rx="1" />
        </svg>
      ) : (
        // Play icon
        <svg
          className="debrief-playback-controls__icon"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      )}
    </button>
  );
}
