# FeatureList Component API Contract

**Feature**: 094-show-points-in-layers
**Date**: 2026-02-13

## Props Changes

### New Props (additive — no breaking changes)

```typescript
interface FeatureListProps {
  // ... existing props unchanged ...

  /**
   * Called when a feature's expand/collapse state is toggled.
   * The component manages expansion state internally, but this callback
   * allows consumers to react to expansion changes if needed.
   */
  onToggleExpand?: (featureId: string, isExpanded: boolean) => void;
}
```

### Changed Props (semantics extended)

```typescript
interface FeatureListProps {
  /**
   * Set of selected feature IDs or selection paths.
   * Now accepts both flat IDs ("track-001") and nested paths ("track-001/positions/4").
   * Selection paths are displayed as selected child rows when the parent is expanded.
   * When a child path is in the set and the parent is collapsed, the parent shows
   * a "child selected" indicator.
   */
  selectedIds?: Set<string>;

  /**
   * Called with the new complete selection set after a click.
   * For child row clicks, the set contains selection paths (not flat IDs).
   * Example: Set(["track-001/positions/4"]) after clicking position 4 of track-001.
   */
  onSelectionChange?: (ids: Set<string>) => void;

  /**
   * Features to display. Extended union now includes MultiPointFeature
   * and MultiPolygonFeature in addition to TrackFeature and ReferenceLocation.
   */
  features: DebriefFeatureCollection | DebriefFeature[];
}
```

## DebriefFeature Union Extension

```typescript
// Before (current)
type DebriefFeature = TrackFeature | ReferenceLocation;

// After (extended)
type DebriefFeature =
  | TrackFeature
  | ReferenceLocation
  | MultiPointFeature
  | MultiPolygonFeature;
```

## New Type Guards

```typescript
function isMultiPointFeature(feature: DebriefFeature): feature is MultiPointFeature;
function isMultiPolygonFeature(feature: DebriefFeature): feature is MultiPolygonFeature;
function isExpandableFeature(feature: DebriefFeature): boolean;
```

## New Internal Types

```typescript
/**
 * A single row in the flattened display list.
 * Used internally by FeatureList for virtualisation.
 */
type DisplayItemType = 'feature' | 'position' | 'point' | 'polygon' | 'segment';

interface DisplayItem {
  type: DisplayItemType;
  id: string;           // selection path
  label: string;
  sublabel: string | null;
  depth: number;
  parentId: string | null;
  isExpandable: boolean;
  feature: DebriefFeature | null;
  index: number | null;
}
```

## Level Registry Extension

```typescript
// Added to LEVEL_REGISTRY in selectionPath.ts
['points', { name: 'points', addressingMode: 'index',
             description: 'Individual point within a MultiPoint geometry' }],
['polygons', { name: 'polygons', addressingMode: 'index',
               description: 'Individual polygon within a MultiPolygon geometry' }],
```

## Backward Compatibility

- All existing `FeatureListProps` remain unchanged in behaviour
- `selectedIds` containing flat IDs continue to work identically
- `onSelectionChange` callbacks that only handle flat IDs will receive path strings for child selections — consumers that don't understand paths can use `getRoot(path)` to extract the feature ID
- Features without expandable children render exactly as before
- The `onSelect` (deprecated) callback is unchanged — it fires with the feature ID only (not paths) for parent row clicks
