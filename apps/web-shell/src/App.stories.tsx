/**
 * Storybook story for the Web Shell integrated demo.
 *
 * This story shows the full web-shell application with:
 * - STAC Catalog browser (welcome page)
 * - Analysis view with ActivityPanel + MapView
 * - Selection sync and tool execution
 */

import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider } from '@debrief/components';
import App from './App';
import './App.css';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

const meta: Meta<typeof App> = {
  title: 'Apps/WebShell',
  component: App,
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    // Set iframe dimensions for proper fullscreen display
    viewport: {
      defaultViewport: 'responsive',
    },
    docs: {
      description: {
        component: `
# Web Shell - Integrated Demo

A standalone browser application for reviewing Debrief component integration.

## Features

- **Welcome Page**: STAC Catalog browser showing available plots
- **Analysis View**: ActivityPanel (left) + MapView (right)
- **Selection Sync**: Click features on map or in list
- **Tool Execution**: Track Length, Bounding Box, and 4 styling tools

## Usage

1. Double-click a plot in the catalog to open it
2. Click tracks on the map to select them
3. Use tools in the Activity Panel
4. Click "Back to Catalog" to return
        `,
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof App>;

/**
 * The default story shows the welcome page with the STAC catalog browser.
 * Double-click on "Exercise Alpha" or "Training Run 1" to open the analysis view.
 */
export const Default: Story = {
  name: 'Welcome Page',
};

/**
 * Shows the full integrated workflow.
 * This is the same as Default - use it to explore both views.
 */
export const IntegratedDemo: Story = {
  name: 'Integrated Demo',
  parameters: {
    docs: {
      description: {
        story: `
Full integrated demo showing the complete workflow:

1. **Welcome Page**: Browse the STAC catalog
2. **Open Plot**: Double-click "Exercise Alpha" to see 2 vessel tracks
3. **Select Features**: Click tracks on the map or in the feature list
4. **Run Tools**: Select a track and run "Track Length" to calculate distance
5. **Temporal Playback**: Use the time controller to animate tracks

This demo uses mock services with fixture data from the test-data directory.
        `,
      },
    },
  },
};
