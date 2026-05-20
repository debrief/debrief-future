/**
 * Storybook stories for the briefing renderer's ModeToggle.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { useEffect } from 'react';
import { ModeToggle } from './ModeToggle';
import { useBriefingStore } from '../store';

type StoryArgs = { mode: 'minimal' | 'present' };

function StoryHarness({ mode }: StoryArgs) {
  useEffect(() => {
    useBriefingStore.setState({ displayMode: mode, modeToggleVisible: true });
  }, [mode]);

  return (
    <div
      style={{
        padding: 24,
        background: mode === 'present' ? '#0c0c0c' : '#1e1e1e',
        position: 'relative',
        height: 200,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
        }}
      >
        <ModeToggle />
      </div>
      <span style={{ color: '#999', fontFamily: 'monospace' }}>
        mode = {mode}
      </span>
    </div>
  );
}

const meta: Meta<typeof StoryHarness> = {
  title: 'Briefing/ModeToggle',
  component: StoryHarness,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Present ↔ Minimal toggle for the briefing renderer (#264). Keyboard shortcut `P` is always reachable, even when the chrome is hidden in Present mode.',
      },
    },
  },
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof meta>;

export const MinimalMode: Story = {
  args: { mode: 'minimal' },
};

export const PresentMode: Story = {
  args: { mode: 'present' },
};
