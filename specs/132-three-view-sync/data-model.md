# Data Model: Three-View Synchronization and Filter State

**Feature**: 132-three-view-sync
**Date**: 2026-03-07

## Entities

### BrowserFilterState (New — session-state store slice)

Holds the browser-level filter state across all three axes.

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `metadataFilteredIds` | `ReadonlySet<string> \| null` | Set of exercise IDs passing the metadata filter. Null = no metadata filter active (all pass). | `null` |
| `metadataExpression` | `FilterExpression \| null` | The CQL2 filter expression from the filter bar. Stored for persistence/debugging. | `null` |
| `spatialFilterActive` | `boolean` | Whether the map viewport should be used as a spatial filter. | `false` |
| `temporalFilterActive` | `boolean` | Whether the timeline range should be used as a temporal filter. | `false` |

**Notes**:
- Spatial bounds (`viewport`) and temporal range (`timeFilter`) are already in the session store's `SpatialSlice` and `TemporalSlice` respectively. No duplication needed.
- `metadataFilteredIds` is set by the filter bar's `onFilteredItems` callback. The IDs are extracted from the filtered items array.
- `spatialFilterActive` defaults to `false` — spatial filtering activates when the `StacBrowser` component mounts and the map emits its first viewport event.
- `temporalFilterActive` defaults to `false` — temporal filtering activates when the user first adjusts the timeline range handles.

### BrowserFilterActions (New — session-state store slice)

| Action | Signature | Description |
|--------|-----------|-------------|
| `setMetadataFilteredIds` | `(ids: ReadonlySet<string> \| null) => void` | Update metadata-filtered exercise IDs |
| `setMetadataExpression` | `(expr: FilterExpression \| null) => void` | Update the CQL2 expression (for persistence) |
| `setSpatialFilterActive` | `(active: boolean) => void` | Enable/disable spatial filtering |
| `setTemporalFilterActive` | `(active: boolean) => void` | Enable/disable temporal filtering |
| `clearAllBrowserFilters` | `() => void` | Reset all browser filters to defaults |

### StacBrowserItem (Existing — filter-engine types)

Already defined in `shared/components/src/filter-engine/types.ts`. Extends `CatalogOverviewItem` with Debrief extension properties.

| Field | Type | Source |
|-------|------|--------|
| `id` | `string` | `CatalogOverviewItem` |
| `title` | `string` | `CatalogOverviewItem` |
| `itemPath` | `string` | `CatalogOverviewItem` |
| `bbox` | `[number, number, number, number] \| null` | `CatalogOverviewItem` |
| `datetime` | `string \| null` | `CatalogOverviewItem` |
| `startDatetime` | `string \| null` | `CatalogOverviewItem` |
| `endDatetime` | `string \| null` | `CatalogOverviewItem` |
| `vesselClasses` | `readonly string[]` | `StacBrowserItem` |
| `tags` | `readonly string[]` | `StacBrowserItem` |
| `featureTags` | `readonly string[]` | `StacBrowserItem` |
| `author` | `string \| null` | `StacBrowserItem` |
| `trackNames` | `readonly string[]` | `StacBrowserItem` |
| `nationalities` | `readonly string[]` | `StacBrowserItem` |
| `collection` | `string \| null` | `StacBrowserItem` |
| `modified` | `string \| null` | `StacBrowserItem` |

### Bounds (Existing — utils/types)

`type Bounds = [number, number, number, number]` — `[minLon, minLat, maxLon, maxLat]`

### ViewportPolygon (Existing — session-state spatial types)

4-corner polygon `[NW, NE, SE, SW]` supporting rotated views. For non-rotated views, extract AABB: `[min(lons), min(lats), max(lons), max(lats)]`.

### TimeFilter (Existing — session-state temporal types)

```
{ start: TimeInstant | null, end: TimeInstant | null }
```

Where `TimeInstant = { epoch: number, iso: string }`.

## Relationships

```
BrowserFilterState
  ├── metadataFilteredIds ──> derived from FilterBar.onFilteredItems()
  ├── spatial ──> reads SpatialSlice.viewport (existing)
  └── temporal ──> reads TemporalSlice.timeFilter (existing)

StacBrowser (component)
  ├── receives: items: StacBrowserItem[]
  ├── uses: useBrowserFilter(items) → filteredItems
  ├── passes filteredItems to:
  │   ├── ExerciseListView
  │   ├── MapView (footprints)
  │   └── TimelineView (bars)
  └── passes full items to:
      └── FilterBar (needs full set for dropdown options)
```

## State Transitions

```
Initial State:
  metadataFilteredIds = null
  spatialFilterActive = false
  temporalFilterActive = false
  → All items visible in all views

Metadata Filter Added:
  metadataFilteredIds = Set([id1, id2, ...])
  → Views show only items in set (AND with spatial/temporal)

Spatial Filter Activated (first map viewport event):
  spatialFilterActive = true
  → Views filter items by bbox overlap with viewport

Temporal Filter Activated (user adjusts timeline range):
  temporalFilterActive = true
  → Views filter items by time overlap with range

All Filters Cleared:
  clearAllBrowserFilters()
  → metadataFilteredIds = null, spatialFilterActive = false, temporalFilterActive = false
  → All items visible again
```
