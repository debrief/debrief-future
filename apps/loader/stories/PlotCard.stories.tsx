import type { Meta, StoryObj } from '@storybook/react';
import { PlotCard } from '../src/renderer/components/PlotConfig';
import '../src/renderer/i18n';

const meta: Meta<typeof PlotCard> = {
  title: 'Components/PlotCard',
  component: PlotCard,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '400px' }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    onSelect: { action: 'select' },
  },
};

export default meta;
type Story = StoryObj<typeof PlotCard>;

export const Default: Story = {
  args: {
    plot: {
      id: 'plot-1',
      name: 'Exercise Bravo',
      created: '2026-01-10T14:30:00Z',
      modified: '2026-01-10T14:30:00Z',
      featureCount: 45,
    },
    selected: false,
  },
};

export const Selected: Story = {
  args: {
    plot: {
      id: 'plot-1',
      name: 'Operation Neptune',
      created: '2026-01-08T09:15:00Z',
      modified: '2026-01-09T16:45:00Z',
      featureCount: 128,
    },
    selected: true,
  },
};

export const FewFeatures: Story = {
  args: {
    plot: {
      id: 'plot-2',
      name: 'Training Run 3',
      created: '2026-01-05T11:00:00Z',
      modified: '2026-01-05T11:00:00Z',
      featureCount: 1,
    },
    selected: false,
  },
};

export const ManyFeatures: Story = {
  args: {
    plot: {
      id: 'plot-3',
      name: 'Fleet Exercise 2024-Q4',
      created: '2024-12-15T08:00:00Z',
      modified: '2025-01-02T17:30:00Z',
      featureCount: 1542,
    },
    selected: false,
  },
};
