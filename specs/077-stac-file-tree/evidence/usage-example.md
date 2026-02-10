# Usage Example: STAC File Tree Component

**Feature**: 077-stac-file-tree
**Date**: 2026-02-10

## Basic Usage

```tsx
import { StacFileTree } from '@debrief/components';
import type { FilesystemAdapter } from '@debrief/components';

// 1. Create a filesystem adapter (real fs or memfs)
const fsAdapter: FilesystemAdapter = {
  readDirectory: async (path) => { /* return DirectoryEntry[] */ },
  stat: async (path) => { /* return FileStat */ },
  readFile: async (path) => { /* return string */ },
};

// 2. Render the tree
function App() {
  return (
    <StacFileTree
      fs={fsAdapter}
      rootPath="/data/stac-store"
      onItemSelect={(itemPath) => console.log('Open:', itemPath)}
    />
  );
}
```

## With Highlight Support (Post-Snapshot)

```tsx
function AnalysisView() {
  const [snapshotCount, setSnapshotCount] = useState(0);
  const [newFiles, setNewFiles] = useState<string[]>([]);

  const handleSnapshot = (createdFiles: string[]) => {
    setNewFiles(createdFiles);
    setSnapshotCount((n) => n + 1); // Triggers tree refresh
  };

  return (
    <StacFileTree
      fs={fsAdapter}
      rootPath="/data/stac-store"
      highlightedPaths={newFiles}
      currentItemPath="/data/stac-store/catalog/item-001"
      onItemSelect={openPlot}
      refreshKey={snapshotCount}
    />
  );
}
```

## Storybook Demo (memfs)

```tsx
import { Volume } from 'memfs';
import { createMemfsAdapter, createPopulatedStore } from '@debrief/components/StacFileTree/fixtures';

const vol = createPopulatedStore();
const adapter = createMemfsAdapter(vol);

// Renders an interactive tree with 2 catalogs, items, and assets
<StacFileTree fs={adapter} rootPath="/" />
```

## Component Behavior

### Tree Structure Rendered
```
▼ catalog-1 (catalog)
  ▼ collection-a (collection)
    ▶ item-001 (item)
    ▶ item-002 (item)
  catalog.json (asset)
▼ catalog-2 (catalog)
  ▶ item-003 (item)
  catalog.json (asset)
```

### Interaction Flow
1. **Click** on a catalog/collection/item node → expand/collapse
2. **Double-click** on an item node → emits `onItemSelect(itemPath)`
3. Highlighted paths show a color accent on the node
4. Collapsed ancestors of highlighted nodes show "contains changes" indicator
5. Change `refreshKey` prop to reload the tree (e.g., after snapshot)

### Node Type Detection
- Directory with `catalog.json` → **catalog** (library icon)
- Directory with `collection.json` → **collection** (folder-library icon)
- Directory with `item.json` → **item** (file-code icon)
- Directory without STAC JSON → **folder** (folder icon)
- File → **asset** (file icon)
