import { DisplayMode, PlaybackState } from '../../../schemas/src/generated/typescript/index.ts';
import { TimeExtent } from '../utils/types';

export type { DisplayMode, PlaybackState };
/**
 * Playback speed multiplier options.
 */
export type PlaybackSpeed = 1 | 2 | 4 | 8 | 16 | 32 | 64;
/**
 * UI state for the time controller.
 */
export type UIState = 'empty' | 'loading' | 'ready';
/**
 * Props for the useTimePlayback hook.
 */
export interface UseTimePlaybackOptions {
    /** Time range [start, end] in milliseconds since epoch */
    timeExtent: TimeExtent | null;
    /** Initial time position (defaults to start of range) */
    initialTime?: number;
    /** Initial playback speed (defaults to 1) */
    initialSpeed?: PlaybackSpeed;
    /** Callback when time position changes */
    onTimeChange?: (time: number) => void;
    /** Callback when playback state changes */
    onPlaybackStateChange?: (state: PlaybackState) => void;
    /** Frame rate for playback animation (defaults to 30) */
    frameRate?: number;
}
/**
 * Return value from useTimePlayback hook.
 */
export interface UseTimePlaybackResult {
    /** Current time position in milliseconds since epoch */
    currentTime: number;
    /** Set the current time position */
    setCurrentTime: (time: number) => void;
    /** Current playback state */
    playbackState: PlaybackState;
    /** Start playback */
    play: () => void;
    /** Pause playback */
    pause: () => void;
    /** Toggle play/pause */
    togglePlayback: () => void;
    /** Current playback speed */
    speed: PlaybackSpeed;
    /** Set playback speed */
    setSpeed: (speed: PlaybackSpeed) => void;
    /** Scrub forward by a small increment */
    scrubForward: () => void;
    /** Scrub backward by a small increment */
    scrubBackward: () => void;
    /** Whether at start of range */
    atStart: boolean;
    /** Whether at end of range */
    atEnd: boolean;
}
/**
 * Props for TimeDisplay component.
 */
export interface TimeDisplayProps {
    /** Current time in milliseconds since epoch */
    time: number;
    /** CSS class name */
    className?: string;
}
/**
 * Props for TimeScrubber component.
 */
export interface TimeScrubberProps {
    /** Time range [start, end] in milliseconds since epoch */
    timeExtent: TimeExtent;
    /** Current time position */
    currentTime: number;
    /** Callback when time changes via scrubbing */
    onTimeChange: (time: number) => void;
    /** Whether the scrubber is disabled */
    disabled?: boolean;
    /** CSS class name */
    className?: string;
}
/**
 * Props for PlaybackControls component.
 */
export interface PlaybackControlsProps {
    /** Current playback state */
    playbackState: PlaybackState;
    /** Callback to toggle playback */
    onToggle: () => void;
    /** Whether controls are disabled */
    disabled?: boolean;
    /** CSS class name */
    className?: string;
}
/**
 * Props for SpeedSelector component.
 */
export interface SpeedSelectorProps {
    /** Current speed */
    speed: PlaybackSpeed;
    /** Callback when speed changes */
    onSpeedChange: (speed: PlaybackSpeed) => void;
    /** Whether selector is disabled */
    disabled?: boolean;
    /** CSS class name */
    className?: string;
}
/**
 * Props for DisplayModeToggle component.
 */
export interface DisplayModeToggleProps {
    /** Current display mode */
    mode: DisplayMode;
    /** Callback when mode changes */
    onModeChange: (mode: DisplayMode) => void;
    /** Whether toggle is disabled */
    disabled?: boolean;
    /** CSS class name */
    className?: string;
}
/**
 * Props for TimeController component.
 */
export interface TimeControllerProps {
    /** Time range [start, end] in milliseconds since epoch */
    timeExtent?: TimeExtent | null;
    /** Initial time position (defaults to start of range) */
    initialTime?: number;
    /** Initial playback speed (defaults to 1) */
    initialSpeed?: PlaybackSpeed;
    /** Initial display mode (defaults to 'full') */
    initialDisplayMode?: DisplayMode;
    /** Callback when time position changes */
    onTimeChange?: (time: number) => void;
    /** Callback when playback state changes */
    onPlaybackStateChange?: (state: PlaybackState) => void;
    /** Callback when display mode changes */
    onDisplayModeChange?: (mode: DisplayMode) => void;
    /** UI state override (for loading states) */
    uiState?: UIState;
    /** CSS class name */
    className?: string;
    /** Inline styles */
    style?: React.CSSProperties;
}
//# sourceMappingURL=types.d.ts.map