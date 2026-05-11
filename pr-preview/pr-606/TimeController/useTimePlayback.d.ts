import { UseTimePlaybackOptions, UseTimePlaybackResult } from './types';

/**
 * Hook for managing time playback state.
 * Handles time position, play/pause, speed control, and keyboard scrubbing.
 *
 * @example
 * ```tsx
 * const playback = useTimePlayback({
 *   timeExtent: [startTime, endTime],
 *   onTimeChange: (time) => updateMap(time),
 * });
 *
 * return (
 *   <button onClick={playback.togglePlayback}>
 *     {playback.playbackState === 'playing' ? 'Pause' : 'Play'}
 *   </button>
 * );
 * ```
 */
export declare function useTimePlayback(options: UseTimePlaybackOptions): UseTimePlaybackResult;
//# sourceMappingURL=useTimePlayback.d.ts.map