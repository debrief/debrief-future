/**
 * useTimePlayback hook - manages time position and playback state.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  PlaybackSpeed,
  PlaybackState,
  UseTimePlaybackOptions,
  UseTimePlaybackResult,
} from './types';
import { clampTime, calculateScrubIncrement } from './timeUtils';

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
export function useTimePlayback(options: UseTimePlaybackOptions): UseTimePlaybackResult {
  const {
    timeExtent,
    initialTime,
    initialSpeed = 1,
    onTimeChange,
    onPlaybackStateChange,
    frameRate = 30,
  } = options;

  // Calculate initial time (start of range or provided initial)
  const startTime = timeExtent?.[0] ?? 0;
  const defaultInitialTime = initialTime ?? startTime;

  // State
  const [currentTime, setCurrentTimeState] = useState(defaultInitialTime);

  // PR #606: `initialTime` is named after the uncontrolled-component
  // convention, but in practice the host pushes time updates through
  // it whenever the session's currentTime changes (e.g. a storyboard
  // scene click). Without this sync the slider stays where it was on
  // mount and only the internal time advances during playback. We
  // track the last seen prop value in a ref so internal playback
  // increments (which also flow back through onTimeChange → host
  // session → temporal:update → new initialTime) don't fight
  // user-driven playback: the effect only writes state when the
  // *prop* actually changes, not when state already matches.
  const lastInitialTimeRef = useRef(initialTime);
  useEffect(() => {
    if (initialTime === undefined) {return;}
    if (initialTime === lastInitialTimeRef.current) {return;}
    lastInitialTimeRef.current = initialTime;
    setCurrentTimeState(initialTime);
  }, [initialTime]);
  // Feature 205 / FR-024: the hook's internal state is initialised to 'paused'
  // and only ever written as 'playing' or 'paused' — 'stopped' is not reachable
  // from the hook's own setters. The public PlaybackState surface accepts all
  // three canonical values (stopped|playing|paused) to match the schema;
  // per the stopped ≡ paused rendering rule (see ADR), any inbound 'stopped'
  // is rendered identically to 'paused'. See docs/project_notes/decisions.md.
  const [playbackState, setPlaybackStateInternal] = useState<PlaybackState>('paused');
  const [speed, setSpeedState] = useState<PlaybackSpeed>(initialSpeed);

  // Refs for animation loop
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  // Update time extent if it changes
  useEffect(() => {
    if (timeExtent) {
      // Clamp current time to new range
      setCurrentTimeState((prev) => clampTime(prev, timeExtent[0], timeExtent[1]));
    }
  }, [timeExtent]);

  // Notify when playback state changes
  const setPlaybackState = useCallback(
    (state: PlaybackState) => {
      setPlaybackStateInternal(state);
      onPlaybackStateChange?.(state);
    },
    [onPlaybackStateChange]
  );

  // Set current time with clamping and notification
  const setCurrentTime = useCallback(
    (time: number) => {
      if (!timeExtent) return;

      const clampedTime = clampTime(time, timeExtent[0], timeExtent[1]);
      setCurrentTimeState(clampedTime);
      onTimeChange?.(clampedTime);

      // Auto-pause if we hit the end
      if (clampedTime >= timeExtent[1]) {
        setPlaybackState('paused');
      }
    },
    [timeExtent, onTimeChange, setPlaybackState]
  );

  // Animation loop for playback
  useEffect(() => {
    if (playbackState !== 'playing' || !timeExtent) {
      // Stop animation
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const frameDuration = 1000 / frameRate;
    // How much simulated time passes per real-time millisecond
    // At 1x speed, 1ms real time = 1ms simulated time
    // At 4x speed, 1ms real time = 4ms simulated time
    const timeMultiplier = speed;

    const animate = (timestamp: number) => {
      if (lastFrameTimeRef.current === 0) {
        lastFrameTimeRef.current = timestamp;
      }

      const elapsed = timestamp - lastFrameTimeRef.current;

      if (elapsed >= frameDuration) {
        lastFrameTimeRef.current = timestamp;

        // Advance time based on speed
        const timeAdvance = elapsed * timeMultiplier;

        setCurrentTimeState((prev) => {
          const newTime = prev + timeAdvance;
          const clampedTime = clampTime(newTime, timeExtent[0], timeExtent[1]);

          // Notify of time change
          onTimeChange?.(clampedTime);

          // Check if we've reached the end
          if (clampedTime >= timeExtent[1]) {
            setPlaybackState('paused');
            return timeExtent[1];
          }

          return clampedTime;
        });
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    lastFrameTimeRef.current = 0;
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [playbackState, timeExtent, speed, frameRate, onTimeChange, setPlaybackState]);

  // Play
  const play = useCallback(() => {
    if (!timeExtent) return;

    // If at end, restart from beginning
    if (currentTime >= timeExtent[1]) {
      setCurrentTime(timeExtent[0]);
    }

    setPlaybackState('playing');
  }, [timeExtent, currentTime, setCurrentTime, setPlaybackState]);

  // Pause
  const pause = useCallback(() => {
    setPlaybackState('paused');
  }, [setPlaybackState]);

  // Toggle
  const togglePlayback = useCallback(() => {
    if (playbackState === 'playing') {
      pause();
    } else {
      play();
    }
  }, [playbackState, play, pause]);

  // Set speed
  const setSpeed = useCallback((newSpeed: PlaybackSpeed) => {
    setSpeedState(newSpeed);
  }, []);

  // Scrub forward
  const scrubForward = useCallback(() => {
    if (!timeExtent) return;

    const increment = calculateScrubIncrement(timeExtent[0], timeExtent[1]);
    setCurrentTime(currentTime + increment);
  }, [timeExtent, currentTime, setCurrentTime]);

  // Scrub backward
  const scrubBackward = useCallback(() => {
    if (!timeExtent) return;

    const increment = calculateScrubIncrement(timeExtent[0], timeExtent[1]);
    setCurrentTime(currentTime - increment);
  }, [timeExtent, currentTime, setCurrentTime]);

  // Computed values
  const atStart = timeExtent ? currentTime <= timeExtent[0] : true;
  const atEnd = timeExtent ? currentTime >= timeExtent[1] : true;

  return {
    currentTime,
    setCurrentTime,
    playbackState,
    play,
    pause,
    togglePlayback,
    speed,
    setSpeed,
    scrubForward,
    scrubBackward,
    atStart,
    atEnd,
  };
}
