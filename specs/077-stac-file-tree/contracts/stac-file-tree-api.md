# Component API Contract: StacFileTree

**Feature**: 077-stac-file-tree
**Date**: 2026-02-10

## Component Props

```typescript
interface StacFileTreeProps {
  /** Filesystem adapter for reading directory contents */
  fs: FilesystemAdapter;

  /** Root path of the STAC store to display */
  rootPath: string;

  /** Set of file paths to highlight as new/changed */
  highlightedPaths?: string[];

  /** Path of the currently-open STAC Item (visually distinguished) */
  currentItemPath?: string | null;

  /** Callback when user double-clicks a STAC Item node */
  onItemSelect?: (itemPath: string) => void;

  /** Key that, when changed, triggers a full tree refresh (cache clear + re-read) */
  refreshKey?: string | number;

  /** Additional CSS class name for the root element */
  className?: string;
}
```

## FilesystemAdapter Interface

```typescript
interface FilesystemAdapter {
  readDirectory(path: string): Promise<DirectoryEntry[]>;
  stat(path: string): Promise<FileStat>;
  readFile(path: string): Promise<string>;
}

interface DirectoryEntry {
  name: string;
  isDirectory: boolean;
}

interface FileStat {
  isDirectory: boolean;
  size: number;
  modifiedTime: number;
}
```

## Callback Signatures

### onItemSelect

Emitted when the user double-clicks a STAC Item node (nodeType === 'item').

```typescript
onItemSelect(itemPath: string): void
```

- `itemPath`: The filesystem path to the STAC Item directory (e.g., `/store/catalog/my-item`)
- Not emitted for catalog, collection, asset, or folder nodes

## CSS Custom Properties

The component respects the existing `--debrief-*` token system:

| Property | Usage |
|----------|-------|
| `--debrief-bg-primary` | Tree background |
| `--debrief-bg-secondary` | Node hover background |
| `--debrief-text-primary` | Node label text |
| `--debrief-text-muted` | Secondary information text |
| `--debrief-border-color` | Tree indentation guides |
| `--debrief-color-primary` | Highlight accent for new/changed files |
| `--debrief-selection-bg` | Current item background |
| `--debrief-selection-border` | Current item border |

## CSS Class Names (BEM)

```css
.debrief-file-tree                    /* Root container */
.debrief-file-tree__node              /* Individual tree node row */
.debrief-file-tree__node--catalog     /* Catalog node variant */
.debrief-file-tree__node--collection  /* Collection node variant */
.debrief-file-tree__node--item        /* STAC Item node variant */
.debrief-file-tree__node--asset       /* Asset file node variant */
.debrief-file-tree__node--folder      /* Plain folder variant */
.debrief-file-tree__node--highlighted /* Node is in highlight set */
.debrief-file-tree__node--contains-highlight /* Collapsed ancestor with highlighted descendants */
.debrief-file-tree__node--current     /* Currently-open item */
.debrief-file-tree__node--loading     /* Loading children */
.debrief-file-tree__toggle            /* Expand/collapse chevron button */
.debrief-file-tree__icon              /* Node type icon */
.debrief-file-tree__label             /* Node display name */
.debrief-file-tree__empty             /* Empty state container */
.debrief-file-tree__error             /* Error state container */
.debrief-file-tree__spinner           /* Loading indicator */
```

## Storybook Stories Contract

| Story Name | Description | Props |
|------------|-------------|-------|
| Default | Populated catalog with items and assets | fs=memfs fixture, rootPath="/store" |
| Empty | Store with no catalogs | fs=empty memfs, rootPath="/store" |
| WithHighlights | Catalog with highlighted snapshot files | fs=memfs, highlightedPaths=[...] |
| SingleItem | Minimal catalog with one item | fs=memfs with one item, rootPath="/store" |
| CurrentItemSelected | Shows current-item visual distinction | fs=memfs, currentItemPath="/store/cat/item" |
| DarkTheme | Dark theme variant | ThemeProvider with variant='dark' |

## Integration Points

### Web-Shell Integration

The web-shell mounts StacFileTree above ActivityPanel in the left sidebar:

```
<LeftSidebar>
  <CollapsibleSection title="STAC Files">
    <StacFileTree
      fs={memfsAdapter}
      rootPath={storePath}
      highlightedPaths={recentChanges}
      currentItemPath={openItemPath}
      onItemSelect={handleItemSelect}
      refreshKey={snapshotCount}
    />
  </CollapsibleSection>
  <ActivityPanel ... />
</LeftSidebar>
```

### VS Code Extension Integration (future)

The VS Code extension bridges its existing StacService to the FilesystemAdapter interface:

```
<StacFileTree
  fs={nodeFilesystemAdapter}
  rootPath={activeStorePath}
  onItemSelect={(path) => vscode.commands.executeCommand('debrief.openItem', path)}
/>
```

### Memfs Adapter Factory (for Storybook/web-shell)

```typescript
function createMemfsAdapter(vol: Volume): FilesystemAdapter {
  return {
    readDirectory: async (path) => { /* vol.readdirSync + vol.statSync */ },
    stat: async (path) => { /* vol.statSync */ },
    readFile: async (path) => { /* vol.readFileSync */ },
  };
}
```
