/**
 * Storybook stories for the briefing-renderer's TransportBar.
 *
 * The stories drive the local Zustand store to set up each visual
 * state (idle / playing / final Scene). The Storybook decorator
 * wraps every story in a `PlaybackProvider` so the `usePlaybackDriver`
 * hook resolves cleanly.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { useEffect } from 'react';
import { TransportBar } from './TransportBar';
import { PlaybackProvider } from '../playback/PlaybackProvider';
import { useBriefingStore } from '../store';

type StoryArgs = {
  sceneCount: number;
  currentSceneIndex: number;
  playState: 'idle' | 'playing' | 'paused';
};

function StoryHarness({ sceneCount, currentSceneIndex, playState }: StoryArgs) {
  useEffect(() => {
    const scenes = Array.from({ length: sceneCount }, (_, i) => ({
      type: 'Feature' as const,
      id: `S${i}`,
      geometry: { type: 'Polygon' as const, coordinates: [] },
      properties: {
        kind: 'STORYBOARD_SCENE',
        id: `S${i}`,
        storyboard_id: 'SB',
        title: `Scene ${i + 1}`,
        timestamp: new Date(Date.UTC(2025, 0, 15, 12, i * 5)).toISOString(),
        creation_order: i,
        viewport: { center: [0, 0], zoom: 6, bearing: 0 },
      },
    }));
    useBriefingStore.setState({
      scenes: scenes as unknown as ReturnType<typeof useBriefingStore.getState>['scenes'],
      currentSceneIndex,
      playState,
    });
  }, [sceneCount, currentSceneIndex, playState]);

  return (
    <div style={{ padding: 24, background: '#1e1e1e' }}>
      <TransportBar />
    </div>
  );
}

const meta: Meta<typeof StoryHarness> = {
  title: 'Briefing/TransportBar',
  component: StoryHarness,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Transport surface for the air-gapped briefing renderer (#264). Play / pause / prev / next + a Replay button at end-of-Storyboard.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <PlaybackProvider>
        <Story />
      </PlaybackProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  args: { sceneCount: 4, currentSceneIndex: 0, playState: 'idle' },
};

export const Playing: Story = {
  args: { sceneCount: 4, currentSceneIndex: 1, playState: 'playing' },
};

export const Paused: Story = {
  args: { sceneCount: 4, currentSceneIndex: 1, playState: 'paused' },
};

export const FinalScene: Story = {
  args: { sceneCount: 4, currentSceneIndex: 3, playState: 'paused' },
  parameters: {
    docs: {
      description: {
        story: 'At end-of-Storyboard, the Next button is replaced by a Replay button.',
      },
    },
  },
};
