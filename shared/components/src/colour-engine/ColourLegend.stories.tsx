import type { Meta, StoryObj } from '@storybook/react';
import { ColourLegend } from './ColourLegend';
import { ThemeProvider } from '../ThemeProvider';
import type { LegendModel, ColourDimension } from './types';

const categoricalDimension: ColourDimension = {
  id: 'tag',
  label: 'Tag',
  type: 'categorical',
  resolve: () => null,
};

const gradientDimension: ColourDimension = {
  id: 'age',
  label: 'Age',
  type: 'gradient',
  resolve: () => null,
};

const categoricalLegend: LegendModel = {
  dimension: categoricalDimension,
  entries: [
    { label: 'Frigate', colour: '#4477AA', count: 12 },
    { label: 'Destroyer', colour: '#EE6677', count: 8 },
    { label: 'Submarine', colour: '#228833', count: 5 },
    { label: 'Carrier', colour: '#CCBB44', count: 3 },
    { label: 'Corvette', colour: '#66CCEE', count: 2 },
  ],
  gradient: null,
  hasUnclassified: true,
};

const gradientLegend: LegendModel = {
  dimension: gradientDimension,
  entries: [],
  gradient: {
    minLabel: 'Jan 2020',
    maxLabel: 'Mar 2026',
    minColour: '#C8D6E5',
    maxColour: '#2E86DE',
  },
  hasUnclassified: false,
};

const meta: Meta<typeof ColourLegend> = {
  title: 'Colour Engine/ColourLegend',
  component: ColourLegend,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'ColourLegend renders a gradient bar for continuous dimensions (Age) and discrete colour swatches for categorical dimensions (Tag).',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <div style={{ maxWidth: 250 }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ColourLegend>;

export const Categorical: Story = {
  args: {
    legend: categoricalLegend,
    unclassifiedColour: '#999999',
  },
  parameters: {
    docs: {
      description: {
        story: 'Categorical legend with discrete colour swatches. Includes an "Unclassified" entry for items without metadata.',
      },
    },
  },
};

export const Gradient: Story = {
  args: {
    legend: gradientLegend,
    unclassifiedColour: '#999999',
  },
  parameters: {
    docs: {
      description: {
        story: 'Gradient legend with a continuous colour bar showing the date range from oldest (faded) to most recent (vivid).',
      },
    },
  },
};

export const NoLegend: Story = {
  args: {
    legend: null,
    unclassifiedColour: '#999999',
  },
  parameters: {
    docs: {
      description: {
        story: 'When no colour dimension is active, the legend renders nothing.',
      },
    },
  },
};

const gradientWithUnclassified: LegendModel = {
  ...gradientLegend,
  hasUnclassified: true,
};

export const GradientWithUnclassified: Story = {
  args: {
    legend: gradientWithUnclassified,
    unclassifiedColour: '#999999',
  },
  parameters: {
    docs: {
      description: {
        story: 'Gradient legend with an additional "Unclassified" entry for items missing date metadata.',
      },
    },
  },
};
