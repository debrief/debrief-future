import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { StacFileTree } from './StacFileTree';
import {
  createPopulatedStore,
  createEmptyStore,
  createSingleItemStore,
  createStoreWithSnapshots,
  createMemfsAdapter,
} from './fixtures';
import { ThemeProvider } from '../ThemeProvider';

const meta: Meta<typeof StacFileTree> = {
  title: 'Components/StacFileTree',
  component: StacFileTree,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'StacFileTree displays a hierarchical tree view of STAC catalog filesystem structure. ' +
          'Supports lazy loading, highlighting, and item selection. Uses filesystem adapter pattern ' +
          'for flexibility across different storage backends (memfs, Node fs, VS Code workspace.fs).',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <div style={{ height: '400px', width: '100%' }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof StacFileTree>;

// Default story with populated catalog
const populatedStore = createPopulatedStore();
const populatedFs = createMemfsAdapter(populatedStore);

export const Default: Story = {
  args: {
    fs: populatedFs,
    rootPath: '/catalog-1',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Basic file tree showing a STAC catalog with collections and items. ' +
          'Click to expand/collapse nodes. Root node is expanded by default.',
      },
    },
  },
};

// Empty catalog
const emptyStore = createEmptyStore();
const emptyFs = createMemfsAdapter(emptyStore);

export const Empty: Story = {
  args: {
    fs: emptyFs,
    rootPath: '/empty-catalog',
  },
  parameters: {
    docs: {
      description: {
        story: 'File tree with an empty catalog (no children).',
      },
    },
  },
};

// Single item catalog
const singleItemStore = createSingleItemStore();
const singleItemFs = createMemfsAdapter(singleItemStore);

export const SingleItem: Story = {
  args: {
    fs: singleItemFs,
    rootPath: '/catalog',
  },
  parameters: {
    docs: {
      description: {
        story: 'File tree with a catalog containing a single item.',
      },
    },
  },
};

// With highlights (snapshots)
const snapshotStore = createStoreWithSnapshots();
const snapshotFs = createMemfsAdapter(snapshotStore);

export const WithHighlights: Story = {
  args: {
    fs: snapshotFs,
    rootPath: '/catalog',
    highlightedPaths: [
      '/catalog/item-001/snapshot-1.json',
      '/catalog/item-002/snapshot-3.json',
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          'File tree with highlighted paths (snapshot files). ' +
          'Highlighted nodes have yellow background. ' +
          'Parent directories containing highlights have a subtle left border.',
      },
    },
  },
};

// With current item selected
function CurrentItemSelectedExample() {
  const [currentItem, setCurrentItem] = useState<string | undefined>(
    '/catalog-1/collection-a/item-001'
  );

  const handleItemSelect = (path: string) => {
    setCurrentItem(path);
    console.log('Selected item:', path);
  };

  return (
    <div style={{ height: '400px' }}>
      <div style={{ marginBottom: 12, fontSize: 13 }}>
        <strong>Current item:</strong> {currentItem || 'None'}
      </div>
      <StacFileTree
        fs={populatedFs}
        rootPath="/catalog-1"
        currentItemPath={currentItem}
        onItemSelect={handleItemSelect}
      />
    </div>
  );
}

export const CurrentItemSelected: Story = {
  render: () => <CurrentItemSelectedExample />,
  parameters: {
    docs: {
      description: {
        story:
          'File tree with current item selection. ' +
          'Double-click an item node to select it. ' +
          'Current item is highlighted with blue background and border.',
      },
    },
  },
};

// Interactive example with highlights and selection
function InteractiveExample() {
  const [currentItem, setCurrentItem] = useState<string | undefined>();
  const [highlights, setHighlights] = useState<string[]>([
    '/catalog/item-001/snapshot-1.json',
  ]);

  const handleItemSelect = (path: string) => {
    setCurrentItem(path);
  };

  const handleAddHighlight = () => {
    setHighlights([...highlights, '/catalog/item-002/snapshot-3.json']);
  };

  const handleClearHighlights = () => {
    setHighlights([]);
  };

  return (
    <div style={{ height: '500px' }}>
      <div style={{ marginBottom: 12, fontSize: 13 }}>
        <div>
          <strong>Current item:</strong> {currentItem || 'None'}
        </div>
        <div style={{ marginTop: 8 }}>
          <strong>Highlighted paths:</strong> {highlights.length}
          <button onClick={handleAddHighlight} style={{ marginLeft: 8 }}>
            Add Highlight
          </button>
          <button onClick={handleClearHighlights} style={{ marginLeft: 8 }}>
            Clear Highlights
          </button>
        </div>
      </div>
      <StacFileTree
        fs={snapshotFs}
        rootPath="/catalog"
        currentItemPath={currentItem}
        highlightedPaths={highlights}
        onItemSelect={handleItemSelect}
      />
    </div>
  );
}

export const Interactive: Story = {
  render: () => <InteractiveExample />,
  parameters: {
    docs: {
      description: {
        story:
          'Interactive file tree with both current item selection and highlights. ' +
          'Double-click items to select. Use buttons to add/clear highlights.',
      },
    },
  },
};

// Dark theme
export const DarkTheme: Story = {
  render: () => (
    <ThemeProvider theme={{ variant: 'dark' }}>
      <div style={{ height: '400px' }}>
        <StacFileTree
          fs={populatedFs}
          rootPath="/catalog-1"
          currentItemPath="/catalog-1/collection-a/item-001"
        />
      </div>
    </ThemeProvider>
  ),
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'File tree with dark theme applied.',
      },
    },
  },
};

// Dark theme with highlights
export const DarkThemeWithHighlights: Story = {
  render: () => (
    <ThemeProvider theme={{ variant: 'dark' }}>
      <div style={{ height: '400px' }}>
        <StacFileTree
          fs={snapshotFs}
          rootPath="/catalog"
          highlightedPaths={[
            '/catalog/item-001/snapshot-1.json',
            '/catalog/item-001/snapshot-2.json',
          ]}
          currentItemPath="/catalog/item-001"
        />
      </div>
    </ThemeProvider>
  ),
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'File tree with dark theme, highlights, and current item selection.',
      },
    },
  },
};

// Error state (simulated)
export const ErrorState: Story = {
  render: () => {
    const errorFs = {
      stat: () => Promise.reject(new Error('Failed to read directory')),
      readDirectory: () => Promise.reject(new Error('Failed to read directory')),
      readFile: () => Promise.reject(new Error('Failed to read file')),
    };

    return (
      <div style={{ height: '400px' }}>
        <StacFileTree fs={errorFs} rootPath="/nonexistent" />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'File tree showing error state with retry button.',
      },
    },
  },
};

// Refresh example
function RefreshExample() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div style={{ height: '400px' }}>
      <div style={{ marginBottom: 12 }}>
        <button onClick={() => setRefreshKey((k) => k + 1)}>Refresh Tree (key: {refreshKey})</button>
      </div>
      <StacFileTree fs={populatedFs} rootPath="/catalog-1" refreshKey={refreshKey} />
    </div>
  );
}

export const WithRefresh: Story = {
  render: () => <RefreshExample />,
  parameters: {
    docs: {
      description: {
        story:
          'File tree with refresh capability. Click button to increment refreshKey and reload the tree.',
      },
    },
  },
};

// Multiple catalogs
const multipleCatalogsStore = createPopulatedStore();
const multipleCatalogsFs = createMemfsAdapter(multipleCatalogsStore);

export const MultipleCatalogs: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, height: '400px' }}>
      <div style={{ flex: 1 }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: 14 }}>Catalog 1</h4>
        <StacFileTree fs={multipleCatalogsFs} rootPath="/catalog-1" />
      </div>
      <div style={{ flex: 1 }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: 14 }}>Catalog 2</h4>
        <StacFileTree fs={multipleCatalogsFs} rootPath="/catalog-2" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Multiple file trees side by side, each showing a different catalog.',
      },
    },
  },
};
