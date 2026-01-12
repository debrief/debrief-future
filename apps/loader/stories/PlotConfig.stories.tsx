import type { Meta, StoryObj } from '@storybook/react';
import { PlotConfig } from '../src/renderer/components/PlotConfig';
import '../src/renderer/i18n';

const mockStore = {
  id: 'project',
  name: 'Project Alpha Store',
  path: '/shared/projects/alpha/catalog',
  plotCount: 3,
  accessible: true,
};

const meta: Meta<typeof PlotConfig> = {
  title: 'Components/PlotConfig',
  component: PlotConfig,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    onTabChange: { action: 'tabChange' },
    onPlotSelect: { action: 'plotSelect' },
    onNewPlotNameChange: { action: 'nameChange' },
    onNewPlotDescriptionChange: { action: 'descChange' },
    onBack: { action: 'back' },
    onCancel: { action: 'cancel' },
    onLoad: { action: 'load' },
  },
};

export default meta;
type Story = StoryObj<typeof PlotConfig>;

export const CreateNewTab: Story = {
  args: {
    store: mockStore,
    activeTab: 'create-new',
    selectedPlot: null,
    newPlotForm: { name: '', description: '', errors: {} },
  },
};

export const CreateNewWithInput: Story = {
  args: {
    store: mockStore,
    activeTab: 'create-new',
    selectedPlot: null,
    newPlotForm: { name: 'Exercise Neptune Analysis', description: 'Track analysis for Exercise Neptune Q4 2024', errors: {} },
  },
};

export const CreateNewWithError: Story = {
  args: {
    store: mockStore,
    activeTab: 'create-new',
    selectedPlot: null,
    newPlotForm: { name: '', description: '', errors: { name: 'Plot name is required' } },
  },
};

export const AddExistingTab: Story = {
  args: {
    store: mockStore,
    activeTab: 'add-existing',
    selectedPlot: null,
    newPlotForm: { name: '', description: '', errors: {} },
  },
};
