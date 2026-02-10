# Feature Specification: STAC File Tree Component

**Feature Branch**: `077-stac-file-tree`
**Created**: 2026-02-10
**Status**: Draft
**Input**: User description: "STAC File Tree Component — shared React tree view of STAC catalog filesystem backed by memfs; highlights new files from snapshots, opens plots from tree (requires #074, #071)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse STAC Catalog Structure (Priority: P1)

A maritime analyst opens a plot in the analysis view and wants to understand what files exist in the STAC catalog — catalogs, collections, items, and assets (including snapshot files). The STAC File Tree appears in the sidebar showing the directory hierarchy of the active STAC store. The analyst expands and collapses nodes to navigate the structure, seeing filenames, folder nesting, and file types at a glance.

**Why this priority**: Without a visible file tree, users have no way to understand what the STAC store contains. This is the foundational capability that all other stories build on.

**Independent Test**: Can be fully tested by loading a STAC catalog fixture and verifying the tree renders all expected nodes in the correct hierarchy. Delivers immediate value by making the storage layer visible.

**Acceptance Scenarios**:

1. **Given** a STAC store with two catalogs each containing items with assets, **When** the tree renders, **Then** the full directory hierarchy is displayed with correct parent-child nesting
2. **Given** a collapsed catalog node, **When** the user clicks the expand control, **Then** child items and sub-catalogs are revealed
3. **Given** an expanded node, **When** the user clicks the collapse control, **Then** children are hidden and the node shows a collapsed indicator
4. **Given** a STAC item node, **When** the user inspects it, **Then** the item's assets (including snapshot files and working plot files) are visible as leaf nodes

---

### User Story 2 - Open a Plot from the Tree (Priority: P2)

An analyst sees a STAC Item in the file tree and wants to open its plot for analysis. They double-click the item node and the plot loads into the current session's map view. This provides a direct navigation path from the catalog structure to the analysis workspace.

**Why this priority**: Opening plots is the primary action users take from the tree. Without it, the tree is informational but not actionable.

**Independent Test**: Can be tested by double-clicking a STAC Item node and verifying the parent application receives the correct item path for opening.

**Acceptance Scenarios**:

1. **Given** a STAC Item node in the tree, **When** the user double-clicks it, **Then** the component emits a selection event with the item's path
2. **Given** a non-item node (catalog folder or asset file), **When** the user double-clicks it, **Then** no selection event is emitted (expand/collapse behavior only)
3. **Given** the currently-open plot's item, **When** displayed in the tree, **Then** it is visually distinguished from other items (e.g., bold label or accent indicator)

---

### User Story 3 - See What Changed After a Snapshot (Priority: P2)

After running analysis tools that trigger a snapshot (#074), new files appear in the STAC store. The analyst needs to see which files are new or modified. The tree highlights recently-created snapshot assets so the analyst can tell at a glance what the last operation produced.

**Why this priority**: Change visibility is the key differentiator of this component. Tied with P2 (opening plots) because it delivers the provenance story that justified the feature.

**Independent Test**: Can be tested by providing a set of "changed paths" and verifying the tree marks exactly those nodes with a visual highlight.

**Acceptance Scenarios**:

1. **Given** a set of highlighted paths (new snapshot files), **When** the tree renders, **Then** those nodes display a distinct visual indicator (color accent or badge)
2. **Given** a highlighted leaf node inside a collapsed parent, **When** the tree renders, **Then** the parent node also shows an indicator that it contains highlighted children
3. **Given** highlights are active, **When** the user acknowledges them (e.g., by expanding and viewing), **Then** the highlights can be cleared programmatically by the parent

---

### User Story 4 - Use the Tree in Storybook and Web-Shell (Priority: P3)

A developer working on the component needs to see it rendered with realistic data in Storybook. The web-shell demo also needs the tree to work without a real filesystem. In both environments, the tree is backed by an in-memory filesystem (memfs) pre-loaded with sample catalog data, providing a fully interactive experience identical to the real filesystem version.

**Why this priority**: Developer experience and demo capability. Important for iterating on the component and for stakeholder demonstrations, but not user-facing functionality.

**Independent Test**: Can be tested by mounting the component in Storybook with a memfs volume and verifying all interactions (expand, collapse, double-click, highlights) work identically to the real filesystem version.

**Acceptance Scenarios**:

1. **Given** a Storybook environment with a memfs volume containing sample STAC data, **When** the story renders, **Then** the tree displays the catalog structure interactively
2. **Given** the web-shell analysis view, **When** a plot is loaded, **Then** the STAC File Tree appears in the sidebar above the Activity panel, backed by memfs
3. **Given** the Storybook stories, **When** browsing available stories, **Then** there are stories for: empty catalog, populated catalog, catalog with highlighted changes, and single-item catalog

---

### Edge Cases

- What happens when the STAC store is empty (no catalogs)? The tree shows an empty state message indicating no catalogs are available.
- What happens when a catalog contains hundreds of items? The tree handles large catalogs without performance degradation, using lazy expansion (children loaded on expand) rather than upfront full traversal.
- What happens when the filesystem is unavailable or returns errors? The tree shows an error state with a message and optional retry action.
- What happens when a highlighted file is inside deeply nested folders? All ancestor nodes display a "contains changes" indicator even when collapsed.
- What happens when the user resizes the sidebar to very narrow widths? Long filenames are truncated with ellipsis; the tree remains usable with horizontal scroll if needed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST render a collapsible tree view representing the directory structure of a STAC catalog store
- **FR-002**: Tree nodes MUST distinguish between node types: catalogs (folders), collections, items, and assets (leaf files)
- **FR-003**: System MUST support expand and collapse interactions on any non-leaf node
- **FR-004**: System MUST emit a selection event when a user double-clicks a STAC Item node, providing the item's path
- **FR-005**: System MUST NOT emit selection events when double-clicking non-item nodes (catalogs, assets)
- **FR-006**: System MUST accept a list of "highlighted" file paths and visually distinguish those nodes from others
- **FR-007**: System MUST propagate highlight indicators up to ancestor nodes when highlighted children are inside collapsed subtrees
- **FR-008**: System MUST visually distinguish the currently-open item from other items in the tree
- **FR-009**: System MUST display an empty state when no catalogs exist in the store
- **FR-010**: System MUST display an error state when filesystem access fails
- **FR-011**: System MUST work identically whether backed by a real filesystem or an in-memory filesystem
- **FR-012**: System MUST be usable as a shared component across web-shell, Storybook, and VS Code extension contexts
- **FR-013**: System MUST use lazy expansion — child nodes are resolved when the user expands a parent, not on initial render
- **FR-014**: System MUST include Storybook stories covering: empty catalog, populated catalog, catalog with highlighted changes, and single-item catalog

### Key Entities

- **Tree Node**: Represents a single entry in the tree — has a display name, node type (catalog, collection, item, asset), path, expanded/collapsed state, and optional highlight flag
- **STAC Store**: The root-level directory containing one or more STAC catalogs; the tree renders one store at a time
- **Highlight Set**: A collection of file paths that should be visually marked as new or changed — provided by the parent component, typically after a snapshot operation
- **Filesystem Adapter**: The abstraction that allows the tree to read directory contents from either a real filesystem or memfs, presenting a uniform interface to the component

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Understand what files exist in the STAC store and navigate to plots for analysis
- **Key Decision(s)**:
  1. Which item to open for analysis (double-click to open)
  2. Which parts of the catalog to explore (expand/collapse navigation)
- **Decision Inputs**: File/folder names, node type icons, highlight indicators for new files, current-item marker

### Screen Progression

| Step | Screen/State          | User Action                   | Result                                                    |
|------|-----------------------|-------------------------------|-----------------------------------------------------------|
| 1    | Collapsed tree root   | Clicks expand on root catalog | Child catalogs and items revealed                         |
| 2    | Expanded catalog      | Clicks expand on an item      | Item's assets (snapshots, working file) become visible    |
| 3    | Item assets visible   | Double-clicks an item node    | Selection event emitted; parent opens plot in map view    |
| 4    | After snapshot        | Sees highlight on new files   | Analyst understands what changed; can expand to inspect   |

### UI States

- **Empty State**: Message "No catalogs found" with an informational icon, displayed when the store contains no catalogs
- **Loading State**: Spinner or skeleton shown while the filesystem adapter reads directory contents for an expanding node
- **Error State**: Message describing the filesystem error with a "Retry" action to re-attempt the directory read
- **Success State**: Fully rendered tree with collapsible nodes, type-appropriate icons, and any active highlights

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can browse and understand the full STAC catalog structure within 5 seconds of opening the sidebar
- **SC-002**: Users can open any plot from the tree in under 2 interactions (expand parent if needed, then double-click item)
- **SC-003**: After a snapshot operation, new files are visually identifiable without requiring the user to remember what existed before
- **SC-004**: The component renders identically in Storybook, web-shell, and VS Code extension contexts with no environment-specific workarounds
- **SC-005**: Catalogs containing up to 200 items render and respond to expand/collapse within 500 milliseconds perceived time
- **SC-006**: All four Storybook story states (empty, populated, highlighted changes, single-item) are demonstrable to stakeholders

## Assumptions

- The STAC store follows the directory layout established by the debrief-stac service: `store/catalog/item/` with assets in an `assets/` subdirectory
- The filesystem adapter abstraction can be injected as a prop or context, allowing the parent to provide either a real filesystem or memfs without the component needing to know which
- Highlight paths are absolute or store-relative paths that match the tree node paths exactly
- The component does not manage its own filesystem watching — the parent is responsible for notifying the component when the tree should refresh (e.g., after a snapshot)
- The tree renders one STAC store at a time; multi-store support is out of scope

## Dependencies

- **#074 (Snapshots)**: Provides the snapshot creation workflow that produces new files to visualize with change highlighting
- **#071 (Log Recording Service)**: Log entries trigger snapshot creation, which in turn creates the files the tree displays

## Out of Scope

- Filesystem watching (the parent triggers refresh)
- File editing, renaming, or deletion from the tree
- Multi-store simultaneous display
- Full-text search within the tree
- Asset file content preview
