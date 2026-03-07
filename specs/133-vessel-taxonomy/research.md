# Research: Vessel Taxonomy and Hierarchical Filtering

**Feature**: 133-vessel-taxonomy
**Date**: 2026-03-07

## R1: CascadingMenu Search Extension

**Decision**: Create a new `SearchableCascadingMenu` wrapper component rather than adding search directly to `CascadingMenu`.

**Rationale**: CascadingMenu already manages 7 state variables (position, highlightedIndex, submenu, hoverTimeout). Adding search logic would mix concerns. A wrapper preserves the existing component's focused responsibility and keeps search as an opt-in feature.

**Alternatives considered**:
- **New prop on CascadingMenu** (`searchable: boolean`): Rejected because it bloats the component with ~200 lines of search/filter logic and complicates keyboard navigation (highlighted index no longer maps cleanly to filtered items).
- **Filtering at call site** (pre-filter items before passing to CascadingMenu): Rejected because every consumer would need to implement their own search input and tree-filtering logic.

**Implementation**:
- New file: `shared/components/src/CascadingMenu/SearchableCascadingMenu.tsx`
- Wraps CascadingMenu with an optional search input above the menu
- Uses a pure utility function `filterCascadingItems(items, query)` to recursively filter the tree while preserving ancestor chains
- Exports the wrapper alongside the existing CascadingMenu (no breaking changes)
- Search clears when menu is dismissed and re-opened

## R2: Taxonomy Match Count Computation

**Decision**: Create a new hook `useTaxonomyMatchCounts()` separate from `useDistinctValues()`.

**Rationale**: `useDistinctValues()` extracts flat lists of available values per filter type. Match counting is fundamentally different — it's per-node, hierarchical, and needs the descendant map. Separate hook maintains single-responsibility.

**Alternatives considered**:
- **Extend `useDistinctValues()`**: Rejected because the return type (`Record<FilterType, string[]>`) doesn't accommodate per-node counts, and the computation logic is unrelated.
- **Inline computation in ValueEditor**: Rejected because counts need the full item set (possibly pre-filtered by other active filters), which ValueEditor doesn't have access to.

**Implementation**:
- New file: `shared/components/src/FilterBar/useTaxonomyMatchCounts.ts`
- Input: `items: readonly StacBrowserItem[]`, `taxonomy: readonly VesselTaxonomyNode[]`
- Output: `Map<string, number>` (nodeId → count of matching items)
- Uses `buildDescendantMap()` from existing taxonomy.ts for subtree expansion
- Called in FilterBar, counts passed through to Lozenge → ValueEditor → CascadingMenu
- For filtered counts (reflecting other active filters): FilterBar pre-filters items excluding vessel-class predicates before passing to the hook

**Count semantics**: Count per node = number of items with at least one `vesselClasses` entry in the node's descendant path set. An exercise with both Type 23 and Type 26 frigates counts once toward "Frigate".

## R3: Human-Readable Label Resolution

**Decision**: Create a utility module `labelResolver.ts` with a `buildTaxonomyLabelMap()` function and a `resolveTaxonomyLabel()` lookup.

**Rationale**: Labels need resolving in multiple places (Lozenge display, CascadingMenu current-selection marking, future tooltip text). A standalone utility is reusable and testable without component coupling.

**Alternatives considered**:
- **Resolve in Lozenge component** (tree traversal at render time): Rejected because it triggers traversal on every render and adds tree-walking logic to a display component.
- **Resolve in adapter** (extend `taxonomyToCascadingItems()`): Considered but insufficient — the adapter converts *to* menu items, but label resolution is needed *from* a stored value (path or ID) back to human-readable text.

**Implementation**:
- New file: `shared/components/src/FilterBar/labelResolver.ts`
- `buildTaxonomyLabelMap(taxonomy)`: Pre-computes `Map<string, string>` (nodeId → label) with O(n) tree walk
- `resolveTaxonomyLabel(value, labelMap)`: O(1) lookup, returns label or falls back to raw value
- For path values like `surface/warship/frigate/type23`: extract the last path segment as the lookup key
- Called once in FilterBar (memoized), label map passed as prop to Lozenge

**Current state**: Lozenges display raw path IDs (e.g., `surface/warship/frigate/type23`). After this change, they display the leaf node label (e.g., "Type 23 Frigate").

## R4: CascadingMenuItem Extension for Counts

**Decision**: Add an optional `badge?: string` property to `CascadingMenuItem` rather than a numeric `matchCount`.

**Rationale**: Using a string badge is more flexible (can show "(12)", "(0)", or other annotations) and doesn't require CascadingMenu to know about filtering semantics. The badge is purely a display concern.

**Alternatives considered**:
- **Numeric `matchCount` property**: Rejected because CascadingMenu would need to format the number and decide rendering logic.
- **Count rendered outside CascadingMenu**: Rejected because counts need to appear inline with each menu item label.

**Implementation**:
- Add `badge?: string` to `CascadingMenuItem` interface
- CascadingMenu renders badge next to the label (subtle muted style)
- `taxonomyToCascadingItems()` adapter enhanced to accept counts map and set badges
- Nodes with count 0 get `disabled: true` and badge "(0)"

## R5: Current-Selection Marking

**Decision**: Use the existing `current` property on `CascadingMenuItem` to mark the currently selected vessel class when the editor re-opens.

**Rationale**: CascadingMenu already renders a checkmark (✓) for items with `current: true`. No new rendering logic needed — only the adapter needs to accept the current value and set the flag.

**Implementation**:
- Extend `taxonomyToCascadingItems()` to accept optional `currentValue?: string`
- When converting nodes, set `current: true` on the node whose ID matches the current value
- For path values: match against the last segment of the stored path

## R6: Existing Storybook Coverage Gap

**Finding**: FilterBar.stories.tsx has 7 stories but none specifically exercise taxonomy navigation. The "All Filter Types" story includes a vessel-class lozenge with raw path `surface/warship/frigate/type23` but doesn't test the dropdown interaction.

**Decision**: Add a dedicated "Vessel Taxonomy" story section with 4+ variants.

**Stories needed**:
1. **Full Tree Navigation** — CascadingMenu with all 4 taxonomy levels, `selectableBranches` enabled
2. **With Search** — SearchableCascadingMenu wrapper demonstrating type-ahead filtering
3. **With Match Counts** — Badge counts from 100 mock items
4. **Branch Selection** — Selecting a parent node and verifying lozenge label
5. **Zero-Count Nodes** — Dimmed/disabled nodes when filters narrow results
