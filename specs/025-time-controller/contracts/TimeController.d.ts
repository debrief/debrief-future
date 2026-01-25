/**
 * Time Controller Component Contracts
 *
 * This file defines the TypeScript interfaces for the TimeController component.
 * These are the contracts that the implementation must satisfy.
 */

/**
 * Represents a time range with start and end boundaries.
 */
export interface TimeRange {
  /** ISO 8601 timestamp - earliest time in the range */
  start: string;
  /** ISO 8601 timestamp - latest time in the range */
  end: string;
}

/**
 * Supported playback speed multipliers.
 */
export type PlaybackSpeed = 1 | 2 | 4 | 8;

/**
 * Props for the TimeController component.
 */
export interface TimeControllerProps {
  /**
   * The time range of available data.
   * When undefined, the controller displays a disabled/empty state.
   */
  timeRange?: TimeRange;

  /**
   * Current time position as ISO 8601 timestamp.
   * Must be within timeRange bounds when timeRange is provided.
   */
  currentTime?: string;

  /**
   * Callback fired when the user changes the time position.
   * @param time - New time position as ISO 8601 timestamp
   */
  onTimeChange?: (time: string) => void;

  /**
   * Initial playback speed. Defaults to 1.
   */
  defaultSpeed?: PlaybackSpeed;

  /**
   * Whether the controller is disabled regardless of data state.
   */
  disabled?: boolean;

  /**
   * Optional CSS class name for styling.
   */
  className?: string;
}

/**
 * Internal playback state managed by the component.
 */
export interface PlaybackState {
  /** Whether time is advancing automatically */
  isPlaying: boolean;
  /** Current playback speed multiplier */
  speed: PlaybackSpeed;
}

/**
 * Props for the TimeScrubber sub-component.
 */
export interface TimeScrubberProps {
  /** Time range boundaries */
  timeRange: TimeRange;
  /** Current time position */
  currentTime: string;
  /** Callback when user changes time via scrubber */
  onTimeChange: (time: string) => void;
  /** Whether scrubber is disabled */
  disabled?: boolean;
}

/**
 * Props for the PlaybackControls sub-component.
 */
export interface PlaybackControlsProps {
  /** Whether playback is active */
  isPlaying: boolean;
  /** Current playback speed */
  speed: PlaybackSpeed;
  /** Callback to toggle play/pause */
  onPlayPause: () => void;
  /** Callback to change speed */
  onSpeedChange: (speed: PlaybackSpeed) => void;
  /** Whether controls are disabled */
  disabled?: boolean;
}

/**
 * Props for the TimeDisplay sub-component.
 */
export interface TimeDisplayProps {
  /** Current time to display */
  currentTime: string;
  /** Time range for context (affects display format) */
  timeRange?: TimeRange;
}

/**
 * Return type of the useTimePlayback hook.
 */
export interface UseTimePlaybackReturn {
  /** Current playback state */
  playbackState: PlaybackState;
  /** Toggle play/pause */
  togglePlayPause: () => void;
  /** Set playback speed */
  setSpeed: (speed: PlaybackSpeed) => void;
  /** Start playback */
  play: () => void;
  /** Pause playback */
  pause: () => void;
}
