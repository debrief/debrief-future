/**
 * TransportBar — play / pause / prev Scene / next Scene controls visible
 * in Minimal mode. The Replay button appears in place of "Next" when the
 * Storyboard has reached its final Scene (per `contracts/spa-loading.md`
 * § Replay behaviour).
 *
 * The buttons dispatch into the local Zustand store; the
 * `LocalSessionStoreAdapter` (T045) routes those into the shared
 * `StoryboardPlaybackService` once the hoist (T010-T015) lands. Until
 * then, the buttons drive Scene index advancement directly — sufficient
 * for the Storybook surface tested by T067.
 */

import type { FC } from 'react';
import { useBriefingStore } from '../store';
import { usePlaybackDriver } from '../playback/PlaybackProvider';

export interface TransportBarProps {
  onPlay?: () => void;
  onPause?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onReplay?: () => void;
}

export const TransportBar: FC<TransportBarProps> = ({ onPlay, onPause, onPrev, onNext, onReplay }) => {
  const playState = useBriefingStore((s) => s.playState);
  const currentSceneIndex = useBriefingStore((s) => s.currentSceneIndex);
  const sceneCount = useBriefingStore((s) => s.scenes.length);
  const setPlayState = useBriefingStore((s) => s.setPlayState);
  const driver = usePlaybackDriver();

  const atEnd = sceneCount > 0 && currentSceneIndex >= sceneCount - 1;
  const atStart = currentSceneIndex <= 0;
  const isPlaying = playState === 'playing';

  const handlePlayPause = () => {
    if (isPlaying) {
      setPlayState('paused');
      onPause?.();
    } else {
      setPlayState('playing');
      // "Playing" inside a briefing == auto-advance through Scenes.
      void driver.forward();
      onPlay?.();
    }
  };

  const handlePrev = () => {
    if (atStart) return;
    void driver.backward();
    onPrev?.();
  };

  const handleNext = () => {
    if (atEnd) return;
    void driver.forward();
    onNext?.();
  };

  const handleReplay = () => {
    setPlayState('idle');
    void driver.replay();
    onReplay?.();
  };

  return (
    <div
      data-testid="briefing-transport-bar"
      role="toolbar"
      aria-label="Briefing playback controls"
      style={styles.bar}
    >
      <button
        type="button"
        data-testid="transport-prev"
        aria-label="Previous Scene"
        disabled={atStart}
        onClick={handlePrev}
        style={{ ...styles.button, ...(atStart ? styles.buttonDisabled : null) }}
      >
        ◀
      </button>
      <button
        type="button"
        data-testid="transport-play-pause"
        aria-label={isPlaying ? 'Pause' : 'Play'}
        onClick={handlePlayPause}
        style={styles.buttonPlay}
      >
        {isPlaying ? '❚❚' : '▶'}
      </button>
      {atEnd ? (
        <button
          type="button"
          data-testid="transport-replay"
          aria-label="Replay from first Scene"
          onClick={handleReplay}
          style={styles.button}
        >
          ↻
        </button>
      ) : (
        <button
          type="button"
          data-testid="transport-next"
          aria-label="Next Scene"
          onClick={handleNext}
          style={styles.button}
        >
          ▶
        </button>
      )}
      <span data-testid="transport-scene-index" style={styles.sceneCounter}>
        {sceneCount === 0 ? '—' : `${currentSceneIndex + 1} / ${sceneCount}`}
      </span>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    background: 'rgba(0, 0, 0, 0.7)',
    color: '#f0f0f0',
    borderRadius: '6px',
  },
  button: {
    minWidth: '2.25rem',
    height: '2.25rem',
    background: '#2a2a2a',
    color: '#f0f0f0',
    border: '1px solid #3a3a3a',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  buttonPlay: {
    minWidth: '2.5rem',
    height: '2.5rem',
    background: '#0078d4',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  buttonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  sceneCounter: {
    marginLeft: '0.5rem',
    fontFamily: 'monospace',
    fontSize: '0.85rem',
  },
};
