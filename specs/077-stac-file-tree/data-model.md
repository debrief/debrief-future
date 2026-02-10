# Data Model: STAC File Tree Component

**Feature**: 077-stac-file-tree
**Date**: 2026-02-10

## Entities

### TreeNode

Represents a single node in the file tree hierarchy.

| Field | Type | Description |
|-------|------|-------------|
| path | string | Absolute or store-relative path to the filesystem entry |
| name | string | Display name (final path segment) |
| nodeType | NodeType | One of: catalog, collection, item, asset, folder |
| isExpandable | boolean | True for non-leaf nodes (directories) |
| isExpanded | boolean | Current expand/collapse state |
| isLoading | boolean | True while children are being fetched |
| children | TreeNode[] or null | Null if not yet loaded (lazy); array after first expand |
| isHighlighted | boolean | True if this path is in the highlight set (direct match) |
| containsHighlight | boolean | True if any descendant is highlighted (for collapsed ancestor indication) |
| isCurrentItem | boolean | True if this node represents the currently-open plot |

### NodeType (Enumeration)

| Value | Detection Rule | Icon |
|-------|---------------|------|
| catalog | Directory containing `catalog.json` | folder |
| collection | Directory containing `collection.json` | library |
| item | Directory containing `item.json` | file / map-pin |
| asset | File (non-directory, non-catalog/collection/item JSON) | file-media |
| folder | Directory without special STAC JSON files | folder-opened |

### HighlightSet

A set of filesystem paths that should be visually marked as new or changed.

| Field | Type | Description |
|-------|------|-------------|
| directPaths | Set\<string\> | Paths that are directly highlighted (new/modified files) |
| ancestorPaths | Set\<string\> | Computed: all path prefixes of directPaths, for collapsed-ancestor indication |

**Computation**: Given directPaths, ancestorPaths is derived by splitting each path into segments and accumulating all prefixes.

### FilesystemAdapter (Interface)

The abstraction injected by the parent to decouple the component from any specific filesystem implementation.

| Method | Signature | Description |
|--------|-----------|-------------|
| readDirectory | (path: string) => Promise\<DirectoryEntry[]\> | List entries in a directory |
| stat | (path: string) => Promise\<FileStat\> | Get file/directory metadata |
| readFile | (path: string) => Promise\<string\> | Read file contents as UTF-8 string |

### DirectoryEntry

| Field | Type | Description |
|-------|------|-------------|
| name | string | Entry name (filename or directory name) |
| isDirectory | boolean | True if the entry is a directory |

### FileStat

| Field | Type | Description |
|-------|------|-------------|
| isDirectory | boolean | Whether the path is a directory |
| size | number | File size in bytes (0 for directories) |
| modifiedTime | number | Last modification timestamp (epoch ms) |

## Relationships

```
StacFileTree (component)
  ├── accepts: FilesystemAdapter (prop)
  ├── accepts: HighlightSet (prop, derived from parent)
  ├── accepts: currentItemPath (prop, string | null)
  ├── manages: TreeNode[] (internal state, root-level nodes)
  └── emits: onItemSelect(itemPath: string) (callback prop)

TreeNode
  ├── has-many: TreeNode (children, lazy-loaded)
  ├── typed-by: NodeType (determines icon and behavior)
  └── marked-by: HighlightSet (direct or ancestor highlight)
```

## State Transitions

### Node Expand/Collapse

```
Collapsed (children=null) → [user clicks expand] → Loading (isLoading=true)
Loading → [adapter.readDirectory resolves] → Expanded (children=[...], isExpanded=true)
Loading → [adapter.readDirectory rejects] → Error (show error state on node)
Expanded → [user clicks collapse] → Collapsed-Cached (children=[...], isExpanded=false)
Collapsed-Cached → [user clicks expand] → Expanded (instant, no loading)
Any state → [parent triggers refresh] → Reset to Collapsed (children=null)
```

### Tree Refresh

```
Populated → [refreshKey changes] → All cached children cleared → Root re-fetched
```

## Validation Rules

- `path` must be non-empty and use forward slashes as separators
- `nodeType` is determined by filesystem scan, not user input
- `children` is null until first expand (lazy loading invariant)
- `isHighlighted` and `containsHighlight` are derived from HighlightSet, not stored independently
- `currentItemPath` matches at most one node in the tree
