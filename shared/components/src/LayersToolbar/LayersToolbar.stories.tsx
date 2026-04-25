import type { Meta, StoryObj } from '@storybook/react';
import { useState, useMemo } from 'react';
import { LayersToolbar } from './LayersToolbar';
import { ThemeProvider } from '../ThemeProvider';
import { ToolMatchService } from '../ToolMatch/ToolMatchService';
import { createSelection } from '../ToolMatch/types';
import { sampleFeatures, fewFeatures } from './fixtures/features';
import {
  sampleToolsWithCategories,
  createActiveToolResults,
  emptyToolResults,
} from './fixtures/tools';
import {
  sampleSourceFiles,
  sampleResultFiles,
  emptySourceFiles,
  emptyResultFiles,
} from './fixtures/files';
import type { FilterState, AssociatedFile, FileAction, SelectionApplyAction } from './types';
import { DEFAULT_FILTER_STATE } from './types';

const meta: Meta<typeof LayersToolbar> = {
  title: 'Components/LayersToolbar',
  component: LayersToolbar,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'LayersToolbar provides 5 buttons: Delete, Visibility, Run (selection-scoped) and Filter, Associated Files (plot-scoped). Integrates with ToolMatchService for context-sensitive tool menus.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <div style={{ maxWidth: 500 }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LayersToolbar>;

// No selection — selection buttons disabled
export const NoSelection: Story = {
  args: {
    selectedFeatureIds: [],
    features: sampleFeatures,
    toolMatches: emptyToolResults,
    sourceFiles: sampleSourceFiles,
    resultFiles: sampleResultFiles,
  },
};

// With selection — buttons enabled
export const WithSelection: Story = {
  args: {
    selectedFeatureIds: ['track-000', 'track-001', 'ref-000'],
    features: sampleFeatures,
    toolMatches: createActiveToolResults(),
    sourceFiles: sampleSourceFiles,
    resultFiles: sampleResultFiles,
    onDelete: (ids) => console.log('Delete:', ids),
    onToggleVisibility: (ids) => console.log('Toggle visibility:', ids),
    onRunTool: (toolId, ids) => console.log('Run tool:', toolId, ids),
  },
};

// With tools changed — yellow halo on Run
export const WithToolsChanged: Story = {
  args: {
    selectedFeatureIds: ['track-000'],
    features: sampleFeatures,
    toolMatches: createActiveToolResults(),
    toolsChanged: true,
    sourceFiles: sampleSourceFiles,
    resultFiles: sampleResultFiles,
  },
};

// With new results — yellow halo on Associated Files
export const WithNewResults: Story = {
  args: {
    selectedFeatureIds: [],
    features: sampleFeatures,
    toolMatches: emptyToolResults,
    resultsChanged: true,
    sourceFiles: sampleSourceFiles,
    resultFiles: sampleResultFiles,
  },
};

// With active filter
export const WithActiveFilter: Story = {
  render: () => {
    const [filterState, setFilterState] = useState<FilterState>({
      ...DEFAULT_FILTER_STATE,
      textQuery: 'HMS',
    });
    return (
      <LayersToolbar
        selectedFeatureIds={[]}
        features={sampleFeatures}
        filterState={filterState}
        onFilterChange={setFilterState}
      />
    );
  },
};

// Empty files
export const WithEmptyFiles: Story = {
  args: {
    selectedFeatureIds: ['track-000'],
    features: fewFeatures,
    toolMatches: emptyToolResults,
    sourceFiles: emptySourceFiles,
    resultFiles: emptyResultFiles,
  },
};

// Full interactive integration
function FullIntegrationExample() {
  const [selectedIds, setSelectedIds] = useState<string[]>(['track-000', 'track-001']);
  const [filterState, setFilterState] = useState<FilterState>(DEFAULT_FILTER_STATE);
  const [toolsChanged, setToolsChanged] = useState(false);
  const [resultsChanged, setResultsChanged] = useState(false);

  const service = useMemo(() => new ToolMatchService(sampleToolsWithCategories), []);
  const selection = useMemo(() => {
    const kinds: string[] = [];
    for (const id of selectedIds) {
      const feat = sampleFeatures.find((f) => f.id === id);
      if (feat) kinds.push(feat.properties.kind);
    }
    return createSelection(kinds);
  }, [selectedIds]);

  const toolMatches = useMemo(() => service.getMatchResults(selection), [service, selection]);

  return (
    <div>
      <LayersToolbar
        selectedFeatureIds={selectedIds}
        features={sampleFeatures}
        toolMatches={toolMatches}
        toolsChanged={toolsChanged}
        resultsChanged={resultsChanged}
        filterState={filterState}
        sourceFiles={sampleSourceFiles}
        resultFiles={sampleResultFiles}
        onDelete={(ids) => console.log('Delete:', ids)}
        onToggleVisibility={(ids) => console.log('Visibility:', ids)}
        onRunTool={(toolId, ids) => console.log('Run:', toolId, ids)}
        onFilterChange={setFilterState}
        onApplyToSelection={(action) => console.log('Apply:', action)}
        onFileAction={(file, action) => console.log('File action:', file.name, action)}
        onDropdownOpened={(dd) => {
          if (dd === 'run') setToolsChanged(false);
          if (dd === 'associated') setResultsChanged(false);
        }}
      />
      <div style={{ marginTop: 12, fontSize: 12, color: '#666' }}>
        <p>Selected: {selectedIds.join(', ') || 'none'}</p>
        <button onClick={() => setSelectedIds(['track-000', 'track-001'])}>Select 2 tracks</button>{' '}
        <button onClick={() => setSelectedIds(['track-000', 'ref-000'])}>Select track + point</button>{' '}
        <button onClick={() => setSelectedIds([])}>Clear selection</button>{' '}
        <button onClick={() => setToolsChanged(true)}>Trigger tools changed</button>{' '}
        <button onClick={() => setResultsChanged(true)}>Trigger results changed</button>
      </div>
    </div>
  );
}

export const FullIntegration: Story = {
  render: () => <FullIntegrationExample />,
  parameters: {
    docs: {
      description: {
        story: 'Full interactive toolbar with live ToolMatchService integration. Use buttons below to change selection and trigger halo animations.',
      },
    },
  },
};

// Dark theme
export const DarkTheme: Story = {
  render: () => (
    <ThemeProvider theme={{ variant: 'dark' }}>
      <LayersToolbar
        selectedFeatureIds={['track-000', 'track-001']}
        features={sampleFeatures}
        toolMatches={createActiveToolResults()}
        sourceFiles={sampleSourceFiles}
        resultFiles={sampleResultFiles}
        onDelete={(ids) => console.log('Delete:', ids)}
        onToggleVisibility={(ids) => console.log('Visibility:', ids)}
        onRunTool={(toolId, ids) => console.log('Run:', toolId, ids)}
      />
    </ThemeProvider>
  ),
  parameters: {
    backgrounds: { default: 'dark' },
  },
};

// Multi-context: Light, Dark, VS Code side-by-side
export const MultiContext: Story = {
  render: () => {
    const sharedProps = {
      selectedFeatureIds: ['track-000', 'track-001'] as string[],
      features: sampleFeatures,
      toolMatches: createActiveToolResults(),
      sourceFiles: sampleSourceFiles,
      resultFiles: sampleResultFiles,
      onDelete: (ids: string[]) => console.log('Delete:', ids),
      onToggleVisibility: (ids: string[]) => console.log('Visibility:', ids),
      onRunTool: (toolId: string, ids: string[]) => console.log('Run:', toolId, ids),
    };
    return (
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Light</div>
          <ThemeProvider theme={{ variant: 'light' }}>
            <LayersToolbar {...sharedProps} />
          </ThemeProvider>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Dark</div>
          <ThemeProvider theme={{ variant: 'dark' }}>
            <LayersToolbar {...sharedProps} />
          </ThemeProvider>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>VS Code</div>
          <ThemeProvider theme={{ variant: 'dark' }}>
            <LayersToolbar {...sharedProps} />
          </ThemeProvider>
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows LayersToolbar in Light, Dark, and VS Code themes side-by-side for visual comparison.',
      },
    },
  },
};
