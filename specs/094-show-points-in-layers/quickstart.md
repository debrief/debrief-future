# Quickstart: Show Child Points in Layers Panel

**Feature**: 094-show-points-in-layers
**Date**: 2026-02-13

## What This Feature Does

Adds expand/collapse functionality to the FeatureList (Layers panel) so that composite features — tracks, multi-point results, and multi-polygon results — can be expanded to reveal their child elements. Clicking a child row selects it using a selection path (e.g., `track-001/positions/4`) that identifies both the parent feature and the specific child.

## Key Files to Modify

### Level Registry (session-state)

**File**: `services/session-state/src/utils/selectionPath.ts`

Add two new level definitions to `LEVEL_REGISTRY`:
- `points` (index-addressed) — for MultiPoint geometry children
- `polygons` (index-addressed) — for MultiPolygon geometry children

### Type Definitions (shared/components)

**File**: `shared/components/src/utils/types.ts`

- Import `MultiPointFeature` and `MultiPolygonFeature` from `@debrief/schemas`
- Extend `DebriefFeature` union to include both
- Add type guards: `isMultiPointFeature()`, `isMultiPolygonFeature()`
- Add utility: `isExpandableFeature()` (checks kind + data)

### FeatureList Component (shared/components)

**File**: `shared/components/src/FeatureList/FeatureList.tsx`

- Add `expandedIds` state (`useState<Set<string>>`)
- Add `flattenFeatures()` function to compute display items from `(features, expandedIds)`
- Update virtualizer `count` to use `flattenedItems.length`
- Render `DisplayItem` rows using depth-based indentation
- Handle chevron clicks (expand/collapse) vs row body clicks (selection)
- Add child-selected indicator for collapsed parents with selected children

### FeatureRow Component (shared/components)

**File**: `shared/components/src/FeatureList/FeatureRow.tsx`

- Accept `depth`, `isExpandable`, `isExpanded`, `hasChildSelected` props
- Render chevron icon for expandable rows
- Apply indentation based on depth
- Show child-selected indicator dot when collapsed with selected children
- Support child row variant styling (smaller text, subtle background)

### FeatureList CSS (shared/components)

**File**: `shared/components/src/FeatureList/FeatureList.css`

- Add depth-based padding classes
- Add chevron icon styles with rotation transition
- Add child row variant styles
- Add child-selected indicator dot styles

### Storybook Stories

**File**: `shared/components/src/FeatureList/FeatureList.stories.tsx`

- Add `WithExpansion` story showing track expansion
- Add `MultiPointExpansion` story
- Add `MultiPolygonExpansion` story
- Add `MixedSelection` story with parent + child selections
- Add `LargeTrack` story for performance (1000+ positions)

### Unit Tests

**File**: `shared/components/src/FeatureList/FeatureList.test.tsx`

- Test expandability detection per feature kind
- Test flattening logic (correct count, correct order, correct depths)
- Test chevron click triggers expansion
- Test child row click produces correct selection path
- Test collapse preserves child selection
- Test child-selected indicator on collapsed parent

## Implementation Order

1. **Level registry** — Add `points` and `polygons` to `selectionPath.ts`
2. **Types** — Extend `DebriefFeature` union and add type guards
3. **Flattening logic** — Create `flattenFeatures()` utility (pure function, easy to unit test)
4. **FeatureRow updates** — Add chevron, depth indentation, child variant
5. **FeatureList integration** — Wire expand state, flattened items, selection paths
6. **CSS** — Styling for all new visual elements
7. **Stories** — Interactive demos for each feature kind
8. **Tests** — Unit tests for flattening, selection paths, expand/collapse

## Testing Approach

```bash
# Run unit tests
cd shared/components && pnpm test

# Run Storybook for visual verification
cd shared/components && pnpm storybook

# Run E2E tests (if applicable)
cd shared/components && pnpm e2e
```

## Verification Checklist

- [ ] Track row shows chevron; click expands to show timestamped positions
- [ ] Multi-point row shows chevron; click expands to show indexed points
- [ ] Multi-polygon row shows chevron; click expands to show indexed polygons
- [ ] Child click sets selection path (e.g., `track-001/positions/4`)
- [ ] Ctrl+click on child adds to selection (mixed-depth)
- [ ] Collapsing parent preserves child selection
- [ ] Collapsed parent with selected child shows indicator
- [ ] Non-expandable features (points, annotations) show no chevron
- [ ] Virtualisation handles 1000+ child items without lag
- [ ] Existing selection behaviour unchanged for non-expandable features
