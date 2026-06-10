/**
 * Storybook stories for ActivityPanel component.
 *
 * The ActivityPanel composes TimeController, ToolsPanel, and LayersToolbar + FeatureList
 * into a unified collapsible panel for the VS Code sidebar.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { useState, useCallback } from 'react';
import { ActivityPanel } from './ActivityPanel';
import type { ActivityPanelProps, ActivityPanelMessage, ActivityPanelCollapseState } from './types';
import { ThemeProvider } from '../ThemeProvider';

// Mock data
const NOW = Date.now();
const HOUR = 60 * 60 * 1000;
const TIME_EXTENT: [number, number] = [NOW, NOW + 8 * HOUR];

const MOCK_TOOLS = [
  {
    id: 'range-bearing',
    name: 'Range & Bearing',
    description: 'Calculate range and bearing between tracks',
    applicable: true,
  },
  {
    id: 'closest-approach',
    name: 'Closest Point of Approach',
    description: 'Find closest approach point',
    applicable: true,
  },
  {
    id: 'track-stats',
    name: 'Track Statistics',
    description: 'Calculate track statistics',
    applicable: false,
    explanation: 'Requires exactly 1 track',
  },
];

const MOCK_FEATURES = [
  {
    id: 'track-1',
    type: 'Feature' as const,
    geometry: {
      type: 'LineString' as const,
      coordinates: [
        [0, 0],
        [1, 1],
      ],
    },
    properties: {
      name: 'HMS Belfast',
      kind: 'TRACK' as const,
      color: '#e41a1c',
    },
  },
  {
    id: 'track-2',
    type: 'Feature' as const,
    geometry: {
      type: 'LineString' as const,
      coordinates: [
        [2, 2],
        [3, 3],
      ],
    },
    properties: {
      name: 'USS Enterprise',
      kind: 'TRACK' as const,
      color: '#377eb8',
    },
  },
  {
    id: 'track-3',
    type: 'Feature' as const,
    geometry: {
      type: 'LineString' as const,
      coordinates: [
        [4, 4],
        [5, 5],
      ],
    },
    properties: {
      name: 'HMS Victory',
      kind: 'TRACK' as const,
      color: '#4daf4a',
    },
  },
];

const meta: Meta<typeof ActivityPanel> = {
  title: 'Components/ActivityPanel',
  component: ActivityPanel,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
Unified activity panel combining time control, tools, and layers.

## Features

- **Collapsible Sections**: Time Controller, Tools, and Layers can be collapsed independently
- **Integrated Time Control**: Full time navigation and playback controls
- **Tool Discovery**: Shows available analysis tools based on selection
- **Layer Management**: Combined toolbar and feature list for layer operations

## Usage

\`\`\`tsx
import { ActivityPanel } from '@debrief/components';

<ActivityPanel
  timeExtent={[startTime, endTime]}
  timeUiState="ready"
  tools={availableTools}
  features={layers}
  selectedFeatureIds={selection}
  onMessage={(msg) => handleMessage(msg)}
/>
\`\`\`
        `,
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || 'dark';
      return (
        <ThemeProvider theme={{ variant: theme }}>
          <div style={{ width: 320, height: 600, background: theme === 'light' ? '#f5f5f5' : '#1e1e1e' }}>
            <Story />
          </div>
        </ThemeProvider>
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof ActivityPanel>;

/**
 * Interactive wrapper that logs messages
 */
function InteractiveActivityPanel(props: Partial<ActivityPanelProps>) {
  const [collapseState, setCollapseState] = useState<ActivityPanelCollapseState>({
    timeControllerCollapsed: false,
    toolsCollapsed: false,
    layersCollapsed: false,
  });

  const handleMessage = useCallback((msg: ActivityPanelMessage) => {
    console.log('ActivityPanel message:', msg);
  }, []);

  const handleCollapseChange = useCallback((state: ActivityPanelCollapseState) => {
    console.log('Collapse state:', state);
    setCollapseState(state);
  }, []);

  return (
    <ActivityPanel
      timeExtent={TIME_EXTENT}
      timeUiState="ready"
      tools={MOCK_TOOLS}
      features={MOCK_FEATURES}
      selectedFeatureIds={['track-1']}
      hiddenIds={new Set()}
      toolMatches={[]}
      {...props}
      collapseState={collapseState}
      onCollapseStateChange={handleCollapseChange}
      onMessage={handleMessage}
    />
  );
}

// =============================================================================
// Default Story
// =============================================================================

/**
 * Default activity panel with all sections expanded and mock data loaded.
 * Try collapsing sections by clicking the headers.
 */
export const Default: Story = {
  render: () => <InteractiveActivityPanel />,
};

// =============================================================================
// UI States
// =============================================================================

/**
 * Empty state when no plot is loaded.
 */
export const EmptyState: Story = {
  render: () => (
    <InteractiveActivityPanel
      timeExtent={null}
      timeUiState="empty"
      tools={[]}
      features={[]}
      selectedFeatureIds={[]}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'When no plot is loaded, the panel shows empty states for all sections.',
      },
    },
  },
};

/**
 * Loading state while processing data.
 */
export const LoadingState: Story = {
  render: () => (
    <InteractiveActivityPanel
      timeUiState="loading"
      tools={[]}
      features={[]}
      selectedFeatureIds={[]}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'While data is loading, the time controller shows a loading message.',
      },
    },
  },
};

/**
 * Ready state with all data loaded.
 */
export const ReadyState: Story = {
  render: () => <InteractiveActivityPanel />,
  parameters: {
    docs: {
      description: {
        story: 'When data is loaded, all sections are active and usable.',
      },
    },
  },
};

// =============================================================================
// Collapse States
// =============================================================================

/**
 * Time Controller collapsed - shows only Tools and Layers.
 */
export const TimeControllerCollapsed: Story = {
  render: () => {
    const [collapseState, setCollapseState] = useState<ActivityPanelCollapseState>({
      timeControllerCollapsed: true,
      toolsCollapsed: false,
      layersCollapsed: false,
    });

    return (
      <ActivityPanel
        timeExtent={TIME_EXTENT}
        timeUiState="ready"
        tools={MOCK_TOOLS}
        features={MOCK_FEATURES}
        selectedFeatureIds={['track-1']}
        hiddenIds={new Set()}
        toolMatches={[]}
        collapseState={collapseState}
        onCollapseStateChange={setCollapseState}
        onMessage={console.log}
      />
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Time Controller section can be collapsed to save space.',
      },
    },
  },
};

/**
 * Tools collapsed - shows only Time Controller and Layers.
 */
export const ToolsCollapsed: Story = {
  render: () => {
    const [collapseState, setCollapseState] = useState<ActivityPanelCollapseState>({
      timeControllerCollapsed: false,
      toolsCollapsed: true,
      layersCollapsed: false,
    });

    return (
      <ActivityPanel
        timeExtent={TIME_EXTENT}
        timeUiState="ready"
        tools={MOCK_TOOLS}
        features={MOCK_FEATURES}
        selectedFeatureIds={['track-1']}
        hiddenIds={new Set()}
        toolMatches={[]}
        collapseState={collapseState}
        onCollapseStateChange={setCollapseState}
        onMessage={console.log}
      />
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Tools section can be collapsed when not needed.',
      },
    },
  },
};

/**
 * Layers collapsed - shows only Time Controller and Tools.
 */
export const LayersCollapsed: Story = {
  render: () => {
    const [collapseState, setCollapseState] = useState<ActivityPanelCollapseState>({
      timeControllerCollapsed: false,
      toolsCollapsed: false,
      layersCollapsed: true,
    });

    return (
      <ActivityPanel
        timeExtent={TIME_EXTENT}
        timeUiState="ready"
        tools={MOCK_TOOLS}
        features={MOCK_FEATURES}
        selectedFeatureIds={['track-1']}
        hiddenIds={new Set()}
        toolMatches={[]}
        collapseState={collapseState}
        onCollapseStateChange={setCollapseState}
        onMessage={console.log}
      />
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Layers section can be collapsed to focus on time control and tools.',
      },
    },
  },
};

/**
 * All sections collapsed - shows only headers.
 */
export const AllCollapsed: Story = {
  render: () => {
    const [collapseState, setCollapseState] = useState<ActivityPanelCollapseState>({
      timeControllerCollapsed: true,
      toolsCollapsed: true,
      layersCollapsed: true,
    });

    return (
      <ActivityPanel
        timeExtent={TIME_EXTENT}
        timeUiState="ready"
        tools={MOCK_TOOLS}
        features={MOCK_FEATURES}
        selectedFeatureIds={['track-1']}
        hiddenIds={new Set()}
        toolMatches={[]}
        collapseState={collapseState}
        onCollapseStateChange={setCollapseState}
        onMessage={console.log}
      />
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'All sections can be collapsed simultaneously to maximize workspace.',
      },
    },
  },
};

/**
 * Only Time Controller expanded - Tools and Layers collapsed.
 */
export const OnlyTimeExpanded: Story = {
  render: () => {
    const [collapseState, setCollapseState] = useState<ActivityPanelCollapseState>({
      timeControllerCollapsed: false,
      toolsCollapsed: true,
      layersCollapsed: true,
    });

    return (
      <ActivityPanel
        timeExtent={TIME_EXTENT}
        timeUiState="ready"
        tools={MOCK_TOOLS}
        features={MOCK_FEATURES}
        selectedFeatureIds={['track-1']}
        hiddenIds={new Set()}
        toolMatches={[]}
        collapseState={collapseState}
        onCollapseStateChange={setCollapseState}
        onMessage={console.log}
      />
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Focus on time navigation by collapsing other sections.',
      },
    },
  },
};

// =============================================================================
// Selection Scenarios
// =============================================================================

/**
 * No selection - shows all tools as inactive.
 */
export const NoSelection: Story = {
  render: () => (
    <InteractiveActivityPanel
      selectedFeatureIds={[]}
      tools={[
        {
          id: 'range-bearing',
          name: 'Range & Bearing',
          description: 'Calculate range and bearing',
          applicable: false,
          explanation: 'Requires 2 tracks',
        },
        {
          id: 'track-stats',
          name: 'Track Statistics',
          description: 'Calculate track statistics',
          applicable: false,
          explanation: 'Requires 1 track',
        },
      ]}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'When no features are selected, tools show why they are not applicable.',
      },
    },
  },
};

/**
 * Multiple selection - shows applicable tools.
 */
export const MultipleSelection: Story = {
  render: () => (
    <InteractiveActivityPanel
      selectedFeatureIds={['track-1', 'track-2']}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'With multiple features selected, tools that work on multi-selection become active.',
      },
    },
  },
};

// =============================================================================
// Error Boundary
// =============================================================================

/**
 * Error boundary demonstration - shows how errors in one section don't affect others.
 * The error boundary wraps each section independently, so if one section throws,
 * it shows an inline error message while other sections continue to work.
 */
export const ErrorBoundary: Story = {
  render: () => (
    <InteractiveActivityPanel />
  ),
  parameters: {
    docs: {
      description: {
        story: `Error boundaries isolate failures per section. If one section throws an error,
it shows an inline error message (with error icon and text) without crashing the other sections.

Each section is wrapped in its own error boundary, ensuring that:
- A failing Time Controller doesn't affect Tools or Layers
- A failing Tools panel doesn't affect Time Controller or Layers
- A failing Layers section doesn't affect Time Controller or Tools

This makes the panel more resilient to runtime errors in individual components.`,
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
  render: () => (
    <ThemeProvider theme={{ variant: 'light' }}>
      <div style={{ width: 320, height: 600, background: '#f5f5f5' }}>
        <InteractiveActivityPanel />
      </div>
    </ThemeProvider>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Activity panel styled for light theme environments.',
      },
    },
  },
};

/**
 * Dark theme variant (default).
 */
export const DarkTheme: Story = {
  render: () => (
    <ThemeProvider theme={{ variant: 'dark' }}>
      <div style={{ width: 320, height: 600, background: '#1e1e1e' }}>
        <InteractiveActivityPanel />
      </div>
    </ThemeProvider>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Activity panel styled for dark theme environments (default).',
      },
    },
  },
};

/**
 * VS Code theme variant (dark with VS Code colors).
 */
export const VSCodeTheme: Story = {
  render: () => (
    <ThemeProvider theme={{ variant: 'dark' }}>
      <div style={{ width: 320, height: 600, background: '#1e1e1e' }}>
        <InteractiveActivityPanel />
      </div>
    </ThemeProvider>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Activity panel styled for VS Code sidebar integration.',
      },
    },
  },
};

// =============================================================================
// Short-height adaptation (US4 — spec 281 T022)
// =============================================================================

/**
 * Short-height panel with a feature selected — demonstrates that Properties
 * is immediately reachable without manual scrolling on ~720px-tall viewports.
 *
 * The wrapper is constrained to 720px height (matching a 1280×720 laptop).
 * When the panel is UNCONTROLLED and a feature is selected, the adaptation
 * automatically collapses the Tools section on mount so Properties is visible.
 *
 * Users can still expand Tools by clicking the section header.
 */
export const ShortHeightPropertiesReachable: Story = {
  render: () => (
    <ThemeProvider theme={{ variant: 'dark' }}>
      {/* Constrain to 720px tall — simulates a short-laptop viewport */}
      <div style={{ width: 320, height: 720, background: '#1e1e1e', overflow: 'hidden' }}>
        {/* UNCONTROLLED — no collapseState prop, so the adaptation fires */}
        <ActivityPanel
          timeExtent={TIME_EXTENT}
          timeUiState="ready"
          tools={MOCK_TOOLS}
          features={MOCK_FEATURES}
          selectedFeatureIds={['track-1']}
          hiddenIds={new Set()}
          toolMatches={[]}
          onMessage={console.log}
          /* No collapseState prop → uncontrolled → short-height adaptation fires */
        />
      </div>
    </ThemeProvider>
  ),
  parameters: {
    docs: {
      description: {
        story: `
**Short-height adaptation (US4 — spec 281)**

When the panel is UNCONTROLLED (no \`collapseState\` prop) **and** the container
height is below ~820 px **and** a feature is selected, the panel automatically
collapses the Tools section on first render so the Properties section is
immediately visible without scrolling.

- This wrapper is 720 px tall — typical for a 1280×720 laptop.
- The Tools section starts collapsed; click the "Tools" header to expand it.
- \`onCollapseStateChange\` is NEVER called by the adaptation (not persisted).
- On the next open the panel renders fresh (no stored state).
        `,
      },
    },
  },
};
