import { TimeControllerProps } from './types';

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
export declare function TimeController({ timeExtent, initialTime, initialSpeed, initialDisplayMode, onTimeChange, onPlaybackStateChange, onDisplayModeChange, uiState: propUiState, className, style, }: TimeControllerProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=TimeController.d.ts.map