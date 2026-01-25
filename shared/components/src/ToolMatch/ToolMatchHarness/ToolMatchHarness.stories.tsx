/**
 * Storybook stories for ToolMatchHarness.
 *
 * These stories demonstrate the tool matching functionality with fixture data.
 * They are also used by Playwright for automated testing and screenshot capture.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { ToolMatchHarness } from './ToolMatchHarness';
import { sampleFeatures } from './fixtures/features';
import { sampleTools } from './fixtures/tools';
import { ThemeProvider } from '../../ThemeProvider';

const meta: Meta<typeof ToolMatchHarness> = {
  title: 'ToolMatch/Harness',
  component: ToolMatchHarness,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'ToolMatchHarness is a visual verification harness for context-sensitive tool offering. ' +
          'It displays a feature selection panel (left) and tool list (right) that updates based on selection.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
  args: {
    features: sampleFeatures,
    tools: sampleTools,
  },
};

export default meta;
type Story = StoryObj<typeof ToolMatchHarness>;

/**
 * Default state with no selection.
 * Only "Global Statistics" tool is active (no requirements).
 */
export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Initial state with no features selected. Only tools with no requirements are active.',
      },
    },
  },
};

/**
 * Two tracks selected - Range Calculation becomes active.
 */
export const TwoTracksSelected: Story = {
  args: {
    initialSelection: ['track-1', 'track-2'],
  },
  parameters: {
    docs: {
      description: {
        story:
          'With two tracks selected, "Range Calculation" and "Track Summary" become active.',
      },
    },
  },
};

/**
 * One track and one point selected - Bearing to Point active.
 */
export const TrackAndPoint: Story = {
  args: {
    initialSelection: ['track-1', 'ref-1'],
  },
  parameters: {
    docs: {
      description: {
        story:
          'With one track and one reference point selected, "Bearing to Point" becomes active.',
      },
    },
  },
};

/**
 * Show inactive tools toggle enabled.
 */
export const ShowInactive: Story = {
  args: {
    initialSelection: ['track-1'],
    initialShowInactive: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Shows all tools with explanations for why inactive tools are unavailable.',
      },
    },
  },
};

/**
 * All tracks selected - Track Summary active.
 */
export const AllTracksSelected: Story = {
  args: {
    initialSelection: ['track-1', 'track-2', 'track-3'],
  },
  parameters: {
    docs: {
      description: {
        story:
          'With all three tracks selected, "Track Summary" is active but "Range Calculation" is not (requires exactly 2).',
      },
    },
  },
};

/**
 * Many features selected - demonstrates complex matching.
 */
export const ComplexSelection: Story = {
  args: {
    initialSelection: ['track-1', 'track-2', 'ref-1', 'ref-2', 'narrative-1'],
    initialShowInactive: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Complex selection showing various tool states with inactive toggle enabled.',
      },
    },
  },
};

/**
 * Dark theme variant.
 */
export const DarkTheme: Story = {
  args: {
    initialSelection: ['track-1', 'track-2'],
    initialShowInactive: true,
  },
  decorators: [
    (Story) => (
      <ThemeProvider theme={{ variant: 'dark' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: 20, background: '#1e1e1e' }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'ToolMatchHarness with dark theme.',
      },
    },
  },
};
