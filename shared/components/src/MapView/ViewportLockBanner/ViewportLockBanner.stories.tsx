import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ViewportLockBanner } from './ViewportLockBanner';
import { ThemeProvider } from '../../ThemeProvider';

const meta: Meta<typeof ViewportLockBanner> = {
  title: 'Components/MapView/ViewportLockBanner',
  component: ViewportLockBanner,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'On-map banner that signals the viewport is locked (spec 260 / FR-005). ' +
          'Returns null when `locked={false}`. The banner itself is the unlock control — ' +
          'clicking it fires `onUnlock`.',
      },
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider>
        <div
          style={{
            position: 'relative',
            width: 480,
            height: 200,
            background: 'var(--debrief-bg-secondary, #e8eef3)',
            border: '1px solid var(--debrief-border-color, #ccc)',
          }}
        >
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ViewportLockBanner>;

export const Locked: Story = {
  args: {
    locked: true,
    onUnlock: () => undefined,
  },
};

export const Unlocked: Story = {
  args: {
    locked: false,
    onUnlock: () => undefined,
  },
};

/**
 * Interactive — click the banner to toggle the locked state.
 */
export const Interactive: Story = {
  render: () => {
    const InteractiveDemo = () => {
      const [locked, setLocked] = useState(true);
      return (
        <>
          <ViewportLockBanner locked={locked} onUnlock={() => setLocked(false)} />
          {!locked && (
            <button
              type="button"
              style={{
                position: 'absolute',
                bottom: 12,
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '6px 14px',
              }}
              onClick={() => setLocked(true)}
            >
              Re-lock
            </button>
          )}
        </>
      );
    };
    return <InteractiveDemo />;
  },
};
