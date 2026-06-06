/**
 * TimeController component - main time navigation panel.
 *
 * Provides controls for navigating through time-stamped track data:
 * - Time scrubber for manual navigation
 * - Play/pause controls for animated playback
 * - Speed selector (1x, 2x, 4x, 8x)
 * - Keyboard shortcuts (Space, Arrow keys)
 * - Full/Trail display mode toggle
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { TimeControllerProps, DisplayMode, UIState } from './types';
import { useTimePlayback } from './useTimePlayback';
import { TimeDisplay } from './TimeDisplay';
import { TimeScrubber } from './TimeScrubber';
import { PlaybackControls } from './PlaybackControls';
import { SpeedSelector } from './SpeedSelector';
import { DisplayModeToggle } from './DisplayModeToggle';
import './TimeController.css';

/**
 * Time controller component for VS Code extension sidebar.
 *
 * Layout:
 * - Row 1: Time display (current position)
 * - Row 2: Time scrubber (full width)
 * - Row 3: Play/Pause | Full/Trail toggle | Speed selector
 *
 * @example
 * ```tsx
 * <TimeController
 *   timeExtent={[startTime, endTime]}
 *   onTimeChange={(time) => updateMapToTime(time)}
 *   onDisplayModeChange={(mode) => setTrackDisplayMode(mode)}
 * />
 * ```
 */
export function TimeController({
  timeExtent = null,
  initialTime,
  initialSpeed = 1,
  initialDisplayMode = 'full',
  onTimeChange,
  onPlaybackStateChange,
  onDisplayModeChange,
  uiState: propUiState,
  className,
  style,
}: TimeControllerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayMode, setDisplayModeState] = useState<DisplayMode>(initialDisplayMode);

  // Determine UI state
  const uiState: UIState = propUiState ?? (timeExtent ? 'ready' : 'empty');
  const isDisabled = uiState !== 'ready';

  // Time playback hook
  const playback = useTimePlayback({
    timeExtent,
    initialTime,
    initialSpeed,
    onTimeChange,
    onPlaybackStateChange,
  });

  // Handle display mode change
  const handleDisplayModeChange = useCallback(
    (mode: DisplayMode) => {
      setDisplayModeState(mode);
      onDisplayModeChange?.(mode);
    },
    [onDisplayModeChange]
  );

  // Keyboard event handling
  useEffect(() => {
    const container = containerRef.current;
    if (!container || isDisabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if this container or a child has focus
      if (!container.contains(document.activeElement)) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          playback.togglePlayback();
          break;
        case 'ArrowRight':
          e.preventDefault();
          playback.scrubForward();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          playback.scrubBackward();
          break;
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [isDisabled, playback]);

  // Pause playback when scrubbing
  const handleScrubberTimeChange = useCallback(
    (time: number) => {
      // Pause if currently playing
      if (playback.playbackState === 'playing') {
        playback.pause();
      }
      playback.setCurrentTime(time);
    },
    [playback]
  );

  // Render empty state
  if (uiState === 'empty') {
    return (
      <div
        ref={containerRef}
        className={`debrief-time-controller debrief-time-controller--empty ${className ?? ''}`}
        style={style}
        data-testid="time-controller"
      >
        <div className="debrief-time-controller__empty-message">
          No data loaded
        </div>
      </div>
    );
  }

  // Render loading state
  if (uiState === 'loading') {
    return (
      <div
        ref={containerRef}
        className={`debrief-time-controller debrief-time-controller--loading ${className ?? ''}`}
        style={style}
        data-testid="time-controller"
      >
        <div className="debrief-time-controller__loading-message">
          Loading...
        </div>
      </div>
    );
  }

  // Render ready state
  return (
    <div
      ref={containerRef}
      className={`debrief-time-controller debrief-time-controller--ready ${className ?? ''}`}
      style={style}
      tabIndex={0}
      role="region"
      aria-label="Time Controller"
      data-testid="time-controller"
    >
      {/* Row 1: Time Display */}
      <div className="debrief-time-controller__row debrief-time-controller__row--display">
        <TimeDisplay time={playback.currentTime} />
      </div>

      {/* Row 2: Scrubber */}
      <div className="debrief-time-controller__row debrief-time-controller__row--scrubber">
        <TimeScrubber
          timeExtent={timeExtent!}
          currentTime={playback.currentTime}
          onTimeChange={handleScrubberTimeChange}
          disabled={isDisabled}
        />
      </div>

      {/* Row 3: Controls */}
      <div className="debrief-time-controller__row debrief-time-controller__row--controls">
        <PlaybackControls
          playbackState={playback.playbackState}
          onToggle={playback.togglePlayback}
          disabled={isDisabled}
        />

        <DisplayModeToggle
          mode={displayMode}
          onModeChange={handleDisplayModeChange}
          disabled={isDisabled}
        />

        <SpeedSelector
          speed={playback.speed}
          onSpeedChange={playback.setSpeed}
          disabled={isDisabled}
        />
      </div>
    </div>
  );
}
