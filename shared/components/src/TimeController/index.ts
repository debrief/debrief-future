/**
 * TimeController component exports.
 */

// Main component
export { TimeController } from './TimeController';

// Sub-components (for advanced usage)
export { TimeDisplay } from './TimeDisplay';
export { TimeScrubber } from './TimeScrubber';
export { PlaybackControls } from './PlaybackControls';
export { SpeedSelector } from './SpeedSelector';
export { DisplayModeToggle } from './DisplayModeToggle';

// Hook
export { useTimePlayback } from './useTimePlayback';

// Types
export type {
  TimeControllerProps,
  TimeDisplayProps,
  TimeScrubberProps,
  PlaybackControlsProps,
  SpeedSelectorProps,
  DisplayModeToggleProps,
  UseTimePlaybackOptions,
  UseTimePlaybackResult,
  PlaybackSpeed,
  PlaybackState,
  DisplayMode,
  UIState,
} from './types';

// Utilities
export {
  formatTime,
  formatDateTime,
  formatTimeRange,
  formatDuration,
  calculateDuration,
  timeToPercent,
  percentToTime,
  calculateScrubIncrement,
  clampTime,
} from './timeUtils';
