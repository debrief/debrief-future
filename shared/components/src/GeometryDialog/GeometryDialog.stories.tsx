import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { GeometryDialog } from './GeometryDialog';
import { ThemeProvider } from '../ThemeProvider';

const meta: Meta<typeof GeometryDialog> = {
  title: 'Layers/GeometryDialog',
  component: GeometryDialog,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'GeometryDialog displays a feature\'s geometry type and coordinates in a fixed-position dialog. ' +
          'Designed for testability — Playwright scripts can locate it by role="dialog" and read data via data-testid attributes.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <div style={{ width: 500, height: 400, position: 'relative' }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof GeometryDialog>;

export const TrackGeometry: Story = {
  args: {
    featureName: 'HMS Victory',
    geometryType: 'LineString',
    coordinates: [
      [-5.0123, 50.3456],
      [-4.8901, 50.5678],
      [-4.7654, 50.7890],
      [-4.6543, 50.9012],
      [-4.5432, 51.0123],
    ],
    anchorPosition: { x: 50, y: 50 },
    onDismiss: () => console.log('Dismissed'),
  },
  parameters: {
    docs: {
      description: {
        story: 'LineString geometry from a track feature, showing numbered coordinate pairs.',
      },
    },
  },
};

export const PointGeometry: Story = {
  args: {
    featureName: 'Waypoint Alpha',
    geometryType: 'Point',
    coordinates: [-3.1234, 52.5678],
    anchorPosition: { x: 50, y: 50 },
    onDismiss: () => console.log('Dismissed'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Point geometry from a reference location.',
      },
    },
  },
};

export const MultiPointGeometry: Story = {
  args: {
    featureName: 'Sensor Array',
    geometryType: 'MultiPoint',
    coordinates: [
      [-5.0, 50.0],
      [-4.5, 50.5],
      [-4.0, 51.0],
    ],
    anchorPosition: { x: 50, y: 50 },
    onDismiss: () => console.log('Dismissed'),
  },
  parameters: {
    docs: {
      description: {
        story: 'MultiPoint geometry showing multiple point coordinates.',
      },
    },
  },
};

export const MultiPolygonGeometry: Story = {
  args: {
    featureName: 'Exclusion Zone',
    geometryType: 'MultiPolygon',
    coordinates: [
      [[[-5, 50], [-4, 50], [-4, 51], [-5, 51], [-5, 50]]],
      [[[-3, 52], [-2, 52], [-2, 53], [-3, 53], [-3, 52]]],
    ],
    anchorPosition: { x: 50, y: 50 },
    onDismiss: () => console.log('Dismissed'),
  },
  parameters: {
    docs: {
      description: {
        story: 'MultiPolygon geometry with two polygons, showing nested structure.',
      },
    },
  },
};

export const EmptyGeometry: Story = {
  args: {
    featureName: 'New Feature',
    geometryType: 'LineString',
    coordinates: [],
    anchorPosition: { x: 50, y: 50 },
    onDismiss: () => console.log('Dismissed'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty geometry shows "No coordinates" message.',
      },
    },
  },
};

export const DarkTheme: Story = {
  render: () => (
    <ThemeProvider theme={{ variant: 'dark' }}>
      <GeometryDialog
        featureName="HMS Victory"
        geometryType="LineString"
        coordinates={[[-5.0, 50.0], [-4.0, 51.0], [-3.0, 52.0]]}
        anchorPosition={{ x: 50, y: 50 }}
        onDismiss={() => console.log('Dismissed')}
      />
    </ThemeProvider>
  ),
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'GeometryDialog in dark theme.',
      },
    },
  },
};

function InteractiveExample() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div>
      <button onClick={() => setIsOpen(true)} style={{ marginBottom: 16 }}>
        Open Dialog
      </button>
      {isOpen && (
        <GeometryDialog
          featureName="Contact Alpha"
          geometryType="LineString"
          coordinates={[[-5.0, 50.0], [-4.5, 50.5], [-4.0, 51.0]]}
          anchorPosition={{ x: 50, y: 80 }}
          onDismiss={() => setIsOpen(false)}
        />
      )}
      <p style={{ marginTop: 16, fontSize: 12, color: '#888' }}>
        Click outside, press Escape, or click the × to dismiss.
      </p>
    </div>
  );
}

export const Interactive: Story = {
  render: () => <InteractiveExample />,
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo: open the dialog, dismiss it, re-open it.',
      },
    },
  },
};
