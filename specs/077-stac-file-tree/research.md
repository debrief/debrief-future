# Research: STAC File Tree Component

**Feature**: 077-stac-file-tree
**Date**: 2026-02-10

## R1: Filesystem Abstraction Strategy

**Decision**: Inject a `FilesystemAdapter` interface as a component prop. The component never imports `fs` or `memfs` directly.

**Rationale**: The spec requires FR-011 (works identically on real fs and in-memory fs). A prop-injected adapter keeps the component pure — the parent decides which backend to provide. This avoids bundling Node.js `fs` in browser contexts and avoids hard-coupling to memfs.

**Alternatives considered**:
- **React Context for fs**: More ergonomic for deeply nested components, but overkill for a single tree — the adapter is only used at the top level. Rejected in favour of simpler prop injection.
- **Conditional import (real fs vs memfs)**: Would require build-time branching or dynamic imports. Fragile and violates the principle of environment-agnostic components. Rejected.
- **VS Code FileSystemProvider**: Too tightly coupled to VS Code API. Would not work in web-shell or Storybook. Rejected for the shared component, though the VS Code extension can bridge its FileSystemProvider to the adapter interface.

---

## R2: Tree Rendering Approach

**Decision**: Custom recursive tree component using plain React state for expand/collapse tracking. No third-party tree library.

**Rationale**: The tree's requirements are straightforward — expand, collapse, highlight, double-click. Third-party tree libraries (react-arborist, rc-tree) add weight and opinionated styling that conflicts with the project's CSS custom property theming. The existing codebase uses no tree libraries. A custom component stays consistent with FeatureList and CatalogOverview patterns.

**Alternatives considered**:
- **react-arborist**: Full-featured tree with drag-and-drop, editing, virtualisation. Too heavy for a read-only tree view (~50KB). Rejected.
- **rc-tree**: Lighter but has its own styling system. Would conflict with BEM + CSS custom properties. Rejected.
- **@tanstack/react-virtual for flat list**: Could virtualise a flattened tree. Useful if catalogs exceed hundreds of items. Deferred — start simple, add virtualisation in a follow-up if performance testing warrants it (FR-013 lazy expansion already mitigates large catalogs).

---

## R3: memfs Integration

**Decision**: Add `memfs` as a devDependency in `shared/components/package.json`. Use it only in Storybook stories and test fixtures. The component itself has zero dependency on memfs.

**Rationale**: memfs (Apache-2.0, 25M+ weekly downloads, TypeScript-native) provides a full Node.js `fs`-compatible API in the browser. It is needed only for Storybook fixture data and web-shell demo — not by the component at runtime. As a devDependency, it does not increase the production bundle.

**Version**: memfs ^4.x (latest major, ESM-first, TypeScript-native).

**Alternatives considered**:
- **Hand-coded mock filesystem**: Would need to implement readdir, stat, readFile. Fragile and duplicates memfs's well-tested API. Rejected.
- **In-memory JSON tree structure (no fs)**: The component could accept a pre-built tree object instead of scanning a filesystem. Simpler but loses the ability to demonstrate real filesystem behaviour in Storybook. Rejected — the fs adapter pattern is more realistic and testable.

---

## R4: STAC Directory Layout Detection

**Decision**: The tree scans the filesystem and identifies node types by file naming conventions:
- `catalog.json` → catalog node
- `collection.json` → collection node
- `item.json` → item node (its parent directory is the item)
- `*.geojson`, `*.json` (non-catalog/collection/item) → asset node
- Directories without special JSON files → plain folder node

**Rationale**: The debrief-stac service follows STAC 1.0.0 conventions. Catalog/collection/item identity is determined by the presence of typed JSON files (`"type": "Catalog"`, `"type": "Collection"`, `"type": "Feature"`). For display purposes, detecting by filename (`catalog.json`, `item.json`) is sufficient and avoids reading file contents at directory scan time (important for lazy expansion performance).

**Directory structure confirmed by codebase analysis**:
```
store/
├── catalog.json              # Root catalog
└── [catalog-id]/
    ├── catalog.json          # Sub-catalog
    └── [item-id]/
        ├── item.json         # STAC Item
        ├── data.geojson      # Working plot
        └── assets/
            ├── source.rep    # Original data
            └── plot-snap-*.geojson  # Snapshots
```

---

## R5: Highlight Propagation Algorithm

**Decision**: Compute ancestor highlight set at render time by extracting all path prefixes from the highlighted paths. Store both direct highlights and ancestor highlights.

**Rationale**: FR-007 requires highlighting to propagate up to collapsed ancestors. Rather than walking the tree upward for each highlighted node (which requires tree state), pre-compute the set of all ancestor paths from the flat highlight set. This is O(n*d) where n=highlighted paths and d=max depth — negligible for typical catalogs.

**Algorithm**:
```
Given highlightedPaths = ["/store/cat/item/assets/snap.geojson"]
Compute ancestorPaths = ["/store", "/store/cat", "/store/cat/item", "/store/cat/item/assets"]
Render: if node.path in highlightedPaths → direct highlight
        if node.path in ancestorPaths → contains-highlight indicator
```

---

## R6: Component Placement in Web-Shell

**Decision**: The STAC File Tree sits above the ActivityPanel in the left sidebar, as a collapsible section. It follows the same PaneSection pattern used by ActivityPanel's internal sections.

**Rationale**: The idea doc specifies "tree sits above the existing Activity/Log tab-panel in the sidebar, collapsible to save space." The ActivityPanel uses a PaneSection pattern with chevron toggle and flexible height. The File Tree can use the same pattern for visual consistency.

**Layout**:
```
Left Sidebar
├── [STAC File Tree]     ← New, collapsible
│   └── tree nodes...
└── [ActivityPanel]
    ├── Time Controller
    ├── Tools
    └── Layers/Features
```

---

## R7: Icon Strategy

**Decision**: Use `vscrui` Icon component (already a dependency at ^0.1.0) for node type indicators. Map STAC node types to appropriate codicon names.

**Rationale**: The codebase already uses vscrui for icons in ActivityPanel. Using the same icon library maintains visual consistency and adds zero new dependencies.

**Mapping**:
- Catalog → folder icon
- Collection → library icon
- Item → file icon (or map-pin for STAC items)
- Asset → file-media icon
- Expand/collapse → chevron-right / chevron-down (matches ActivityPanel pattern)

---

## R8: Lazy Expansion Strategy

**Decision**: Children are fetched via the filesystem adapter when a node is first expanded. Results are cached in component state. Subsequent expand/collapse toggles use the cached children.

**Rationale**: FR-013 requires lazy expansion. Reading all directories upfront would be slow for large catalogs and wasteful for deeply nested structures. Cache-on-first-expand provides responsive UX after the initial load.

**Loading UX**: Show a brief loading indicator (spinner or skeleton) when expanding a node for the first time. After cache, expand/collapse is instant.

**Cache invalidation**: The parent calls a `refresh` callback (or changes a `refreshKey` prop) to signal the tree should clear its cache and re-read from the filesystem adapter. This handles post-snapshot refresh.
