import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ColourDimensionSelector } from './ColourDimensionSelector';
import { ThemeProvider } from '../ThemeProvider';
import { builtInDimensions } from './registry';
import type { ColourDimension } from './types';

function SelectorWrapper({ dimensions }: { dimensions: readonly ColourDimension[] }) {
  const [activeDimensionId, setActiveDimensionId] = useState<string | null>(null);

  return (
    <div>
      <ColourDimensionSelector
        dimensions={dimensions}
        activeDimensionId={activeDimensionId}
        onDimensionChange={setActiveDimensionId}
      />
      <p style={{ marginTop: 12, fontSize: 12, color: '#666' }}>
        Active: {activeDimensionId ?? '(none)'}
      </p>
    </div>
  );
}

const meta: Meta<typeof ColourDimensionSelector> = {
  title: 'Colour Engine/ColourDimensionSelector',
  component: ColourDimensionSelector,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'ColourDimensionSelector provides a dropdown to choose the active colour dimension (Age, Vessel Class, Tag) or reset to none.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ColourDimensionSelector>;

export const Default: Story = {
  render: () => <SelectorWrapper dimensions={builtInDimensions} />,
  parameters: {
    docs: {
      description: {
        story: 'Interactive selector with all three built-in dimensions. Select a dimension or choose "None" to reset.',
      },
    },
  },
};

export const WithPreselection: Story = {
  args: {
    dimensions: builtInDimensions,
    activeDimensionId: 'vessel-class',
    onDimensionChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story: 'Selector with "Vessel Class" pre-selected.',
      },
    },
  },
};
