/**
 * Tests for useTimePlayback hook.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimePlayback } from './useTimePlayback';
import type { TimeExtent } from '../utils/types';

// Mock requestAnimationFrame
const mockRAF = vi.fn();
const mockCancelRAF = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', mockRAF);
  vi.stubGlobal('cancelAnimationFrame', mockCancelRAF);
  mockRAF.mockImplementation((callback: FrameRequestCallback) => {
    // eslint-disable-next-line no-restricted-syntax
    return setTimeout(() => callback(performance.now()), 16) as unknown as number;
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  mockRAF.mockClear();
  mockCancelRAF.mockClear();
});

const HOUR = 60 * 60 * 1000;
const NOW = 1704067200000; // 2024-01-01 00:00:00 UTC

describe('useTimePlayback', () => {
  describe('initialization', () => {
    it('initializes with time at start of range', () => {
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      const { result } = renderHook(() =>
        useTimePlayback({ timeExtent })
      );

      expect(result.current.currentTime).toBe(NOW);
      expect(result.current.playbackState).toBe('paused');
      expect(result.current.speed).toBe(1);
    });

    it('initializes with provided initial time', () => {
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      const initialTime = NOW + 30 * 60 * 1000; // 30 minutes in
      const { result } = renderHook(() =>
        useTimePlayback({ timeExtent, initialTime })
      );

      expect(result.current.currentTime).toBe(initialTime);
    });

    it('initializes with provided initial speed', () => {
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      const { result } = renderHook(() =>
        useTimePlayback({ timeExtent, initialSpeed: 4 })
      );

      expect(result.current.speed).toBe(4);
    });

    it('handles null time extent', () => {
      const { result } = renderHook(() =>
        useTimePlayback({ timeExtent: null })
      );

      expect(result.current.currentTime).toBe(0);
      expect(result.current.atStart).toBe(true);
      expect(result.current.atEnd).toBe(true);
    });
  });

  describe('setCurrentTime', () => {
    it('updates current time', () => {
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      const { result } = renderHook(() =>
        useTimePlayback({ timeExtent })
      );

      act(() => {
        result.current.setCurrentTime(NOW + 15 * 60 * 1000);
      });

      expect(result.current.currentTime).toBe(NOW + 15 * 60 * 1000);
    });

    it('clamps time to range', () => {
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      const { result } = renderHook(() =>
        useTimePlayback({ timeExtent })
      );

      act(() => {
        result.current.setCurrentTime(NOW - 1000);
      });
      expect(result.current.currentTime).toBe(NOW);

      act(() => {
        result.current.setCurrentTime(NOW + HOUR + 1000);
      });
      expect(result.current.currentTime).toBe(NOW + HOUR);
    });

    it('calls onTimeChange callback', () => {
      const onTimeChange = vi.fn();
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      const { result } = renderHook(() =>
        useTimePlayback({ timeExtent, onTimeChange })
      );

      act(() => {
        result.current.setCurrentTime(NOW + 15 * 60 * 1000);
      });

      expect(onTimeChange).toHaveBeenCalledWith(NOW + 15 * 60 * 1000);
    });
  });

  describe('play/pause', () => {
    it('play sets state to playing', () => {
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      const { result } = renderHook(() =>
        useTimePlayback({ timeExtent })
      );

      act(() => {
        result.current.play();
      });

      expect(result.current.playbackState).toBe('playing');
    });

    it('pause sets state to paused', () => {
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      const { result } = renderHook(() =>
        useTimePlayback({ timeExtent })
      );

      act(() => {
        result.current.play();
      });
      act(() => {
        result.current.pause();
      });

      expect(result.current.playbackState).toBe('paused');
    });

    it('togglePlayback toggles state', () => {
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      const { result } = renderHook(() =>
        useTimePlayback({ timeExtent })
      );

      expect(result.current.playbackState).toBe('paused');

      act(() => {
        result.current.togglePlayback();
      });
      expect(result.current.playbackState).toBe('playing');

      act(() => {
        result.current.togglePlayback();
      });
      expect(result.current.playbackState).toBe('paused');
    });

    it('calls onPlaybackStateChange callback', () => {
      const onPlaybackStateChange = vi.fn();
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      const { result } = renderHook(() =>
        useTimePlayback({ timeExtent, onPlaybackStateChange })
      );

      act(() => {
        result.current.play();
      });

      expect(onPlaybackStateChange).toHaveBeenCalledWith('playing');
    });

    it('restarts from beginning if at end', () => {
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      const { result } = renderHook(() =>
        useTimePlayback({ timeExtent })
      );

      act(() => {
        result.current.setCurrentTime(NOW + HOUR);
      });
      expect(result.current.atEnd).toBe(true);

      act(() => {
        result.current.play();
      });

      expect(result.current.currentTime).toBe(NOW);
      expect(result.current.playbackState).toBe('playing');
    });
  });

  describe('speed', () => {
    it('setSpeed updates playback speed', () => {
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      const { result } = renderHook(() =>
        useTimePlayback({ timeExtent })
      );

      act(() => {
        result.current.setSpeed(4);
      });

      expect(result.current.speed).toBe(4);
    });

    it('accepts valid speed values', () => {
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      const { result } = renderHook(() =>
        useTimePlayback({ timeExtent })
      );

      const validSpeeds = [1, 2, 4, 8] as const;
      for (const speed of validSpeeds) {
        act(() => {
          result.current.setSpeed(speed);
        });
        expect(result.current.speed).toBe(speed);
      }
    });
  });

  describe('scrubbing', () => {
    it('scrubForward advances time by increment', () => {
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      const { result } = renderHook(() =>
        useTimePlayback({ timeExtent })
      );

      const initialTime = result.current.currentTime;

      act(() => {
        result.current.scrubForward();
      });

      expect(result.current.currentTime).toBeGreaterThan(initialTime);
    });

    it('scrubBackward moves time back by increment', () => {
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      const { result } = renderHook(() =>
        useTimePlayback({ timeExtent })
      );

      // Move to middle first
      act(() => {
        result.current.setCurrentTime(NOW + 30 * 60 * 1000);
      });

      const midTime = result.current.currentTime;

      act(() => {
        result.current.scrubBackward();
      });

      expect(result.current.currentTime).toBeLessThan(midTime);
    });

    it('scrubForward clamps to end', () => {
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      const { result } = renderHook(() =>
        useTimePlayback({ timeExtent })
      );

      // Move near end
      act(() => {
        result.current.setCurrentTime(NOW + HOUR - 1000);
      });

      act(() => {
        result.current.scrubForward();
      });

      expect(result.current.currentTime).toBe(NOW + HOUR);
    });

    it('scrubBackward clamps to start', () => {
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      const { result } = renderHook(() =>
        useTimePlayback({ timeExtent })
      );

      act(() => {
        result.current.scrubBackward();
      });

      expect(result.current.currentTime).toBe(NOW);
    });
  });

  describe('atStart/atEnd', () => {
    it('atStart is true at beginning of range', () => {
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      const { result } = renderHook(() =>
        useTimePlayback({ timeExtent })
      );

      expect(result.current.atStart).toBe(true);
      expect(result.current.atEnd).toBe(false);
    });

    it('atEnd is true at end of range', () => {
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      const { result } = renderHook(() =>
        useTimePlayback({ timeExtent })
      );

      act(() => {
        result.current.setCurrentTime(NOW + HOUR);
      });

      expect(result.current.atStart).toBe(false);
      expect(result.current.atEnd).toBe(true);
    });

    it('both false in middle of range', () => {
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      const { result } = renderHook(() =>
        useTimePlayback({ timeExtent })
      );

      act(() => {
        result.current.setCurrentTime(NOW + 30 * 60 * 1000);
      });

      expect(result.current.atStart).toBe(false);
      expect(result.current.atEnd).toBe(false);
    });
  });

  describe('initialTime prop changes (PR #606)', () => {
    it('updates currentTime when initialTime prop changes after mount', () => {
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      const t0 = NOW + 10 * 60 * 1000; // 10 min
      const t1 = NOW + 30 * 60 * 1000; // 30 min

      const { result, rerender } = renderHook(
        ({ initialTime }: { initialTime: number }) =>
          useTimePlayback({ timeExtent, initialTime }),
        { initialProps: { initialTime: t0 } },
      );

      expect(result.current.currentTime).toBe(t0);

      // Simulate the host pushing a new currentTime (e.g. storyboard click).
      rerender({ initialTime: t1 });

      expect(result.current.currentTime).toBe(t1);
    });

    it('ignores stale initialTime when state was advanced internally', () => {
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      const t0 = NOW;

      const { result, rerender } = renderHook(
        ({ initialTime }: { initialTime: number }) =>
          useTimePlayback({ timeExtent, initialTime }),
        { initialProps: { initialTime: t0 } },
      );

      // Internal increment (as would happen during playback or a step).
      act(() => {
        result.current.setCurrentTime(NOW + 5 * 60 * 1000);
      });
      expect(result.current.currentTime).toBe(NOW + 5 * 60 * 1000);

      // Parent re-renders with the SAME initialTime as before. We must
      // NOT clobber the internally-advanced state — only honour the
      // prop when the prop itself changes.
      rerender({ initialTime: t0 });

      expect(result.current.currentTime).toBe(NOW + 5 * 60 * 1000);
    });

    it('ignores stale echo from lagged host round-trip during drag (PR #606)', () => {
      // Real-world hazard: when the user drags the slider, each drag
      // step calls setCurrentTime → onTimeChange → host → temporal:update
      // → new initialTime prop. The echoes lag behind the latest drag
      // position. The sync effect must NOT roll state back to a stale
      // echo while the user is still dragging ahead of it.
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      const t0 = NOW;
      const onTimeChange = vi.fn();

      const { result, rerender } = renderHook(
        ({ initialTime }: { initialTime: number }) =>
          useTimePlayback({ timeExtent, initialTime, onTimeChange }),
        { initialProps: { initialTime: t0 } },
      );

      const t1 = NOW + 10 * 60 * 1000;
      const t2 = NOW + 20 * 60 * 1000;
      const t3 = NOW + 30 * 60 * 1000;

      // Simulate fast drag: three setCurrentTime calls in quick
      // succession before any echo lands.
      act(() => {
        result.current.setCurrentTime(t1);
        result.current.setCurrentTime(t2);
        result.current.setCurrentTime(t3);
      });
      expect(result.current.currentTime).toBe(t3);
      expect(onTimeChange).toHaveBeenCalledTimes(3);

      // Now the host's echoes arrive, in order, with lagging values.
      // Each must be recognised as an echo and dropped, NOT applied
      // to state.
      rerender({ initialTime: t1 });
      expect(result.current.currentTime).toBe(t3); // not rolled back
      rerender({ initialTime: t2 });
      expect(result.current.currentTime).toBe(t3); // not rolled back
      rerender({ initialTime: t3 });
      expect(result.current.currentTime).toBe(t3); // still t3

      // After the queue drains, a genuinely external prop change is
      // applied as expected.
      const t4 = NOW + 5 * 60 * 1000; // earlier — like a storyboard click
      rerender({ initialTime: t4 });
      expect(result.current.currentTime).toBe(t4);
    });

    it('does not roll back internal advancement while playing (PR #606)', () => {
      // Real-world hazard: during playback the RAF loop advances
      // currentTime and fires onTimeChange, which the host round-trips
      // back to us as a new initialTime. If we naively synced every
      // prop change, we'd continuously roll state back to a stale tick.
      const timeExtent: TimeExtent = [NOW, NOW + HOUR];
      const t0 = NOW;

      const { result, rerender } = renderHook(
        ({ initialTime }: { initialTime: number }) =>
          useTimePlayback({ timeExtent, initialTime }),
        { initialProps: { initialTime: t0 } },
      );

      act(() => {
        result.current.play();
      });
      expect(result.current.playbackState).toBe('playing');

      // Internal advancement simulates a few RAF ticks ahead of where
      // the host's round-trip will eventually catch up to.
      act(() => {
        result.current.setCurrentTime(NOW + 5 * 60 * 1000);
      });
      expect(result.current.currentTime).toBe(NOW + 5 * 60 * 1000);

      // Host round-trip lands with a stale (older) time value — must
      // be ignored because playbackState === 'playing'.
      rerender({ initialTime: NOW + 2 * 60 * 1000 });

      expect(result.current.currentTime).toBe(NOW + 5 * 60 * 1000);
    });
  });
});
