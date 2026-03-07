# Usage Example: Three-View Synchronization

## Filter-Narrow-Discover Workflow

This walkthrough demonstrates the core "filter → narrow → discover" workflow that the three-view synchronization enables.

### 1. Start: All Exercises Visible

The StacBrowser loads with all exercises visible across three synchronized views:
- **FilterBar** (top): Empty — no filters active
- **ExerciseListView** (left): Shows all 5 exercises sorted by recency
- **MapView** (right-top): Shows all exercise bounding boxes on the map
- **TimelineView** (right-bottom): Shows all exercise temporal extents as bars

### 2. Add Metadata Filter: "Nationality = French"

User clicks (+) in FilterBar, selects "Nationality", picks "French".

**Result**: All three views update simultaneously:
- FilterBar shows 1 active lozenge: `Nationality: French`
- ExerciseListView narrows to 3 exercises (CASEX Alpha, GROUPEX Charlie, ASW Echo)
- MapView highlights only the 3 matching bounding boxes
- TimelineView shows only the 3 matching temporal bars
- Status: `activeFilterCount = 1`

### 3. Pan Map: Spatial Filtering

User pans the map to focus on the English Channel area (bbox: [-10, 45, 10, 58]).

**Result**: Views further narrow:
- ExerciseListView shows 2 exercises (CASEX Alpha, GROUPEX Charlie) — ASW Echo has no bbox, so it still passes
- TimelineView shows matching temporal bars
- Status: `activeFilterCount = 2` (metadata + spatial)

### 4. Adjust Timeline: Temporal Filtering

User drags the timeline range handles to January 2025 only.

**Result**: Views narrow to the intersection of all three axes:
- Only exercises matching ALL criteria appear:
  - French nationality AND overlapping map viewport AND within January 2025
- Status: `activeFilterCount = 3`

### 5. Zero Results

User narrows timeline to a period with no exercises.

**Result**:
- All views show empty state
- "No exercises match the current filters (3 active)" message appears
- "Clear all filters" button is available
- FilterBar remains visible with all lozenges intact

### 6. Recovery

User clicks "Clear all filters" or removes a lozenge.

**Result**: Views repopulate as filters are relaxed.

## Code Example

```tsx
import { StacBrowser } from '@debrief/components';
import type { StacBrowserItem, VesselTaxonomyNode } from '@debrief/components';

function CatalogPage() {
  const items: StacBrowserItem[] = [...]; // from STAC catalog
  const taxonomy: VesselTaxonomyNode[] = [...]; // vessel class hierarchy

  return (
    <StacBrowser
      items={items}
      taxonomy={taxonomy}
      onItemSelect={(itemPath) => openExercise(itemPath)}
    />
  );
}
```

## API: useBrowserFilter Hook

For custom layouts, the `useBrowserFilter` hook can be used directly:

```tsx
import { useBrowserFilter } from '@debrief/components';

const { filteredItems, activeFilterCount, hasNoResults, clearAllFilters } =
  useBrowserFilter({
    items,
    metadataFilteredIds: new Set(['ex-001', 'ex-003']),
    spatialFilterActive: true,
    viewportCoordinates: [[-10, 45], [10, 45], [10, 58], [-10, 58]],
    temporalFilterActive: false,
    timeFilter: null,
    clearAllFilters: () => resetFilters(),
  });

// filteredItems = items matching metadata AND spatial AND temporal
// activeFilterCount = 2 (metadata + spatial)
// hasNoResults = false (assuming items match)
```
