/**
 * Storybook stories for ToolsPanel component.
 *
 * Stories demonstrate:
 * - Active and inactive tools
 * - Empty state
 * - Light/Dark/VS Code theme variants
 */

import type { Meta, StoryObj } from '@storybook/react';
import { ToolsPanel } from './ToolsPanel';
import type { ToolsPanelProps } from '../ActivityPanel/types';
import { ThemeProvider } from '../ThemeProvider';

const meta: Meta<typeof ToolsPanel> = {
  title: 'Components/ToolsPanel',
  component: ToolsPanel,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
Panel displaying available analysis tools for the current feature selection.

## Features

- **Active Tools**: Shown with run button and full opacity
- **Inactive Tools**: Shown dimmed with explanation tooltip
- **Empty State**: Message when no tools available

## Usage

\`\`\`tsx
import { ToolsPanel } from '@debrief/components';

<ToolsPanel
  tools={toolMatches}
  onRunTool={(id) => runAnalysisTool(id)}
/>
\`\`\`
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    tools: {
      description: 'List of tools to display',
      control: false,
    },
    onRunTool: {
      description: 'Callback when a tool is run',
      action: 'run-tool',
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || 'dark';
      return (
        <ThemeProvider theme={{ variant: theme }}>
          <div style={{ width: 320, padding: 16 }}>
            <Story />
          </div>
        </ThemeProvider>
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof ToolsPanel>;

// Sample tool data
const MIXED_TOOLS: ToolsPanelProps['tools'] = [
  {
    id: 'range',
    name: 'Range & Bearing',
    description: 'Calculate range and bearing between tracks',
    applicable: true,
  },
  {
    id: 'speed',
    name: 'Speed Calculator',
    description: 'Calculate speed over ground',
    applicable: true,
  },
  {
    id: 'intercept',
    name: 'Intercept Solution',
    description: 'Find intercept course and speed',
    applicable: false,
    explanation: 'Requires exactly 2 tracks',
  },
  {
    id: 'cpa',
    name: 'Closest Point of Approach',
    description: 'Find CPA between tracks',
    applicable: false,
    explanation: 'Requires at least 2 tracks with overlapping time ranges',
  },
];

const ALL_ACTIVE_TOOLS: ToolsPanelProps['tools'] = [
  {
    id: 'range',
    name: 'Range & Bearing',
    description: 'Calculate range and bearing between tracks',
    applicable: true,
  },
  {
    id: 'speed',
    name: 'Speed Calculator',
    description: 'Calculate speed over ground',
    applicable: true,
  },
  {
    id: 'intercept',
    name: 'Intercept Solution',
    description: 'Find intercept course and speed',
    applicable: true,
  },
];

const ALL_INACTIVE_TOOLS: ToolsPanelProps['tools'] = [
  {
    id: 'intercept',
    name: 'Intercept Solution',
    description: 'Find intercept course and speed',
    applicable: false,
    explanation: 'Requires exactly 2 tracks',
  },
  {
    id: 'cpa',
    name: 'Closest Point of Approach',
    description: 'Find CPA between tracks',
    applicable: false,
    explanation: 'Requires at least 2 tracks with overlapping time ranges',
  },
];

// =============================================================================
// Default Story
// =============================================================================

/**
 * Default tools panel with a mix of active and inactive tools.
 */
export const Default: Story = {
  args: {
    tools: MIXED_TOOLS,
  },
};

// =============================================================================
// Tool States
// =============================================================================

/**
 * Panel with all tools active.
 * Typically shown when selection matches all tool requirements.
 */
export const AllActive: Story = {
  args: {
    tools: ALL_ACTIVE_TOOLS,
  },
  parameters: {
    docs: {
      description: {
        story: 'When the current selection matches all tool requirements, all tools are shown as active with run buttons.',
      },
    },
  },
};

/**
 * Panel with all tools inactive.
 * Typically shown when selection doesn't match any tool requirements.
 */
export const AllInactive: Story = {
  args: {
    tools: ALL_INACTIVE_TOOLS,
  },
  parameters: {
    docs: {
      description: {
        story: 'When the current selection doesn\'t match any tool requirements, all tools are shown dimmed with explanations.',
      },
    },
  },
};

/**
 * Empty state shown when no tools are available.
 */
export const EmptyState: Story = {
  args: {
    tools: [],
  },
  parameters: {
    docs: {
      description: {
        story: 'When no tools are available (or no features selected), a message prompts the user to select features.',
      },
    },
  },
};

// =============================================================================
// Theming
// =============================================================================

/**
 * Light theme variant.
 */
export const LightTheme: Story = {
  args: {
    tools: MIXED_TOOLS,
  },
  render: (args) => (
    <ThemeProvider theme={{ variant: 'light' }}>
      <div style={{ width: 320, padding: 16, background: '#f5f5f5' }}>
        <ToolsPanel {...args} />
      </div>
    </ThemeProvider>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Tools panel styled for light theme environments.',
      },
    },
  },
};

/**
 * Dark theme variant (default).
 */
export const DarkTheme: Story = {
  args: {
    tools: MIXED_TOOLS,
  },
  render: (args) => (
    <ThemeProvider theme={{ variant: 'dark' }}>
      <div style={{ width: 320, padding: 16, background: '#1e1e1e' }}>
        <ToolsPanel {...args} />
      </div>
    </ThemeProvider>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Tools panel styled for dark theme environments (default).',
      },
    },
  },
};

/**
 * VS Code theme variant (dark with VS Code colors).
 */
export const VSCodeTheme: Story = {
  args: {
    tools: MIXED_TOOLS,
  },
  render: (args) => (
    <ThemeProvider theme={{ variant: 'dark' }}>
      <div style={{ width: 320, padding: 16, background: '#1e1e1e' }}>
        <ToolsPanel {...args} />
      </div>
    </ThemeProvider>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Tools panel styled for VS Code sidebar integration.',
      },
    },
  },
};

// =============================================================================
// Parameterized Tools
// =============================================================================

/**
 * Tool with parameters triggers a ParameterCollector on click.
 * Click "Set Track Color" to see the colour picker context menu.
 * "Calculate Range" has no parameters and executes immediately.
 */
export const WithParameterizedTool: Story = {
  args: {
    tools: [
      {
        id: 'set-track-color',
        name: 'Set Track Color',
        description: 'Sets the display color for track features',
        applicable: true,
        parameters: [
          {
            name: 'color',
            valueType: 'enum',
            description: 'Track colour',
            paramType: 'NamedColor',
          },
        ],
      },
      {
        id: 'calculate-range',
        name: 'Calculate Range',
        description: 'Calculate range between tracks',
        applicable: true,
      },
    ],
    hasToolInventory: true,
    hasSelection: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'When a tool has parameters, clicking it opens a context menu to collect parameter values before execution. Tools without parameters execute immediately.',
      },
    },
  },
};

/**
 * Tool with multiple parameters collects all values before execution.
 * Click "Style Track" to see the multi-parameter context menu.
 */
export const WithMultiParameterTool: Story = {
  args: {
    tools: [
      {
        id: 'style-track',
        name: 'Style Track',
        description: 'Sets display style for track features',
        applicable: true,
        parameters: [
          {
            name: 'color',
            valueType: 'enum',
            description: 'Track colour',
            paramType: 'NamedColor',
          },
          {
            name: 'symbol',
            valueType: 'enum',
            description: 'Marker shape',
            paramType: 'MarkerSymbol',
          },
        ],
      },
    ],
    hasToolInventory: true,
    hasSelection: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'When a tool has multiple parameters, the context menu presents each parameter for collection before executing the tool.',
      },
    },
  },
};

/**
 * Tool with a boolean parameter shows a toggle control.
 * Click "Toggle Labels" to see the boolean parameter context menu.
 */
export const WithBooleanParameterTool: Story = {
  args: {
    tools: [
      {
        id: 'toggle-labels',
        name: 'Toggle Labels',
        description: 'Toggle position label visibility on tracks',
        applicable: true,
        parameters: [
          {
            name: 'show_labels',
            valueType: 'boolean',
            description: 'Show position labels',
          },
        ],
      },
    ],
    hasToolInventory: true,
    hasSelection: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'When a tool has a boolean parameter, the context menu presents a toggle control for the true/false value.',
      },
    },
  },
};
