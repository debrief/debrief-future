/// <reference lib="dom" />
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { FC, ReactNode } from 'react';
import { TransportBar } from '../TransportBar';
import { useBriefingStore } from '../../store';
import { PlaybackProvider } from '../../playback/PlaybackProvider';

const Wrapper: FC<{ children: ReactNode }> = ({ children }) => (
  <PlaybackProvider>{children}</PlaybackProvider>
);

function seedScenes(count: number) {
  const scenes = Array.from({ length: count }, (_, i) => ({
    type: 'Feature' as const,
    id: `S${i}`,
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
    properties: {
      kind: 'STORYBOARD_SCENE',
      id: `S${i}`,
      storyboard_id: 'SB',
      title: `Scene ${i}`,
      timestamp: `2025-01-15T12:${String(i * 5).padStart(2, '0')}:00Z`,
      creation_order: i,
      viewport: { center: [0, 0], zoom: 6, bearing: 0 },
    },
  })) as unknown as ReturnType<typeof useBriefingStore.getState>['scenes'];

  useBriefingStore.setState({
    scenes,
    currentSceneIndex: 0,
    playState: 'idle',
  });
}

describe('TransportBar', () => {
  beforeEach(() => {
    useBriefingStore.setState({
      scenes: [],
      currentSceneIndex: 0,
      playState: 'idle',
    });
  });

  it('renders the play/pause and Scene counter', () => {
    seedScenes(3);
    render(<TransportBar />, { wrapper: Wrapper });
    expect(screen.getByTestId('transport-play-pause')).toBeTruthy();
    expect(screen.getByTestId('transport-scene-index').textContent).toBe('1 / 3');
  });

  it('advances the scene index on Next click', () => {
    seedScenes(3);
    render(<TransportBar />, { wrapper: Wrapper });
    fireEvent.click(screen.getByTestId('transport-next'));
    expect(useBriefingStore.getState().currentSceneIndex).toBe(1);
  });

  it('disables Prev at the first Scene', () => {
    seedScenes(3);
    render(<TransportBar />, { wrapper: Wrapper });
    const prev = screen.getByTestId('transport-prev') as HTMLButtonElement;
    expect(prev.disabled).toBe(true);
  });

  it('shows the Replay button at the final Scene', () => {
    seedScenes(2);
    useBriefingStore.setState({ currentSceneIndex: 1 });
    render(<TransportBar />, { wrapper: Wrapper });
    expect(screen.getByTestId('transport-replay')).toBeTruthy();
    expect(screen.queryByTestId('transport-next')).toBeNull();
  });

  it('toggles play / pause on click', () => {
    seedScenes(2);
    render(<TransportBar />, { wrapper: Wrapper });
    fireEvent.click(screen.getByTestId('transport-play-pause'));
    expect(useBriefingStore.getState().playState).toBe('playing');
    fireEvent.click(screen.getByTestId('transport-play-pause'));
    expect(useBriefingStore.getState().playState).toBe('paused');
  });

  it('resets to Scene 0 on Replay', () => {
    seedScenes(2);
    useBriefingStore.setState({ currentSceneIndex: 1 });
    render(<TransportBar />, { wrapper: Wrapper });
    fireEvent.click(screen.getByTestId('transport-replay'));
    expect(useBriefingStore.getState().currentSceneIndex).toBe(0);
  });
});
