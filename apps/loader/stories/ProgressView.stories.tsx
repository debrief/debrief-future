import type { Meta, StoryObj } from '@storybook/react';
import { ProgressView } from '../src/renderer/components/ProgressView';
import '../src/renderer/i18n';

const meta: Meta<typeof ProgressView> = {
  title: 'Components/ProgressView',
  component: ProgressView,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ProgressView>;

export const Parsing: Story = {
  args: {
    progress: 15,
    statusMessage: 'Parsing file...',
  },
};

export const CreatingPlot: Story = {
  args: {
    progress: 35,
    statusMessage: 'Creating plot...',
  },
};

export const AddingFeatures: Story = {
  args: {
    progress: 60,
    statusMessage: 'Adding features...',
  },
};

export const CopyingAsset: Story = {
  args: {
    progress: 85,
    statusMessage: 'Copying source file...',
  },
};

export const Finalizing: Story = {
  args: {
    progress: 95,
    statusMessage: 'Finalizing...',
  },
};

export const Complete: Story = {
  args: {
    progress: 100,
    statusMessage: 'Complete!',
  },
};
