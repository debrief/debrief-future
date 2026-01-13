import type { Meta, StoryObj } from '@storybook/react';
import { StoreCard } from '../src/renderer/components/StoreSelector';
import '../src/renderer/i18n';

const meta: Meta<typeof StoreCard> = {
  title: 'Components/StoreCard',
  component: StoreCard,
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
type Story = StoryObj<typeof StoreCard>;

export const Default: Story = {
  args: {
    store: {
      id: 'local',
      name: 'Local Analysis Store',
      path: '/home/user/debrief/local-catalog',
      plotCount: 5,
      accessible: true,
    },
    selected: false,
  },
};

export const Selected: Story = {
  args: {
    store: {
      id: 'local',
      name: 'Local Analysis Store',
      path: '/home/user/debrief/local-catalog',
      plotCount: 5,
      accessible: true,
    },
    selected: true,
  },
};

export const ManyPlots: Story = {
  args: {
    store: {
      id: 'project',
      name: 'Enterprise Project Store',
      path: '/shared/enterprise/debrief-catalog',
      plotCount: 128,
      accessible: true,
    },
    selected: false,
  },
};

export const Inaccessible: Story = {
  args: {
    store: {
      id: 'remote',
      name: 'Remote Network Store',
      path: '/mnt/network/catalog',
      plotCount: 0,
      accessible: false,
      accessError: 'Network path not available',
    },
    selected: false,
  },
};

export const LongPath: Story = {
  args: {
    store: {
      id: 'deep',
      name: 'Deeply Nested Store',
      path: '/home/user/projects/maritime/analysis/2024/q4/exercise-bravo/debrief-catalog',
      plotCount: 3,
      accessible: true,
    },
    selected: false,
  },
};
