/**
 * Storybook story for styling tool integration in the Web Shell.
 *
 * Demonstrates the 4 styling tools (set-track-color, apply-symbol-style,
 * label-interval, symbol-interval) integrated via toolService → calcService.
 *
 * Workflow:
 * 1. Open a plot from the catalog
 * 2. Select one or more tracks
 * 3. See styling tools become active in the Tools panel
 * 4. Run a styling tool and see the result message
 */

import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider } from '@debrief/components';
import App from './App';
import './App.css';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

const meta: Meta<typeof App> = {
  title: 'Apps/WebShell/StylingTools',
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
    viewport: {
      defaultViewport: 'responsive',
    },
    docs: {
      description: {
        component: `
# Styling Tools Integration

Verifies that the 4 TypeScript styling tools are wired into the web-shell
via \`toolService\` → \`calcService\`.

## Tools

| Tool | Description |
|------|-------------|
| Set Track Color | Sets display color on track features |
| Apply Symbol Style | Applies symbol style to position markers |
| Label Interval | Sets time interval for label display |
| Symbol Interval | Sets time interval for position symbols |

## How to Test

1. Double-click **Exercise Alpha** to open the plot
2. Click a track on the map (or in the feature list) to select it
3. The Tools panel should show **6 tools** (2 built-in + 4 styling)
4. All 4 styling tools should be **active** when a track is selected
5. Click a styling tool to run it — a result message should appear
        `,
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof App>;

/**
 * Full integration demo for styling tools.
 *
 * Steps to verify:
 * 1. Double-click a plot in the catalog
 * 2. Select a track on the map
 * 3. Observe 6 tools in the Tools panel (4 styling + 2 built-in)
 * 4. Run any styling tool — result message appears
 */
export const StylingToolsDemo: Story = {
  name: 'Styling Tools Demo',
  parameters: {
    docs: {
      description: {
        story: `
Interactive demo of styling tool integration. Open a plot, select tracks,
and run styling tools to verify they execute correctly and display results.
        `,
      },
    },
  },
};
