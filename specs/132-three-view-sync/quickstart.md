# Quickstart: Three-View Synchronization and Filter State

**Feature**: 132-three-view-sync

## What This Feature Does

Adds a shared filter state layer that synchronizes the filter bar, list view, map view, and timeline view. When a user adds a metadata filter, zooms the map, or adjusts the timeline range, all views update to show only the matching exercises.

## Architecture Overview

```
┌──────────────────────────────────────────────────┐
│                   StacBrowser                     │
│  (orchestrator — composes all views + filters)    │
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │ useBrowserFilter(items)                     │  │
│  │  reads: metadataFilteredIds, viewport,      │  │
│  │         timeFilter, spatialActive, tempAct  │  │
│  │  returns: filteredItems[]                   │  │
│  └──────────────────┬──────────────────────────┘  │
│                     │                             │
│  ┌─────────┐  ┌────┴────┐  ┌────────┐  ┌──────┐  │
│  │FilterBar│  │ListView │  │MapView │  │Time  │  │
│  │(full    │  │(filtered│  │(filtered│  │line  │  │
│  │ items)  │  │ items)  │  │ items)  │  │(filt)│  │
│  └────┬────┘  └─────────┘  └────┬───┘  └──┬───┘  │
│       │                         │          │      │
│       │ onFilteredItems()       │ viewport │ time │
│       │ → setMetadataFilteredIds│ change   │range │
│       │                         │ → store  │→store│
│  ┌────┴─────────────────────────┴──────────┴───┐  │
│  │       Zustand Session Store                  │  │
│  │  ┌──────────────┐  ┌────────┐  ┌──────────┐ │  │
│  │  │BrowserFilter │  │Spatial │  │Temporal  │ │  │
│  │  │Slice (NEW)   │  │Slice   │  │Slice     │ │  │
│  │  └──────────────┘  └────────┘  └──────────┘ │  │
│  └──────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

## Key Components

### 1. BrowserFilterSlice (services/session-state)

New Zustand store slice holding:
- `metadataFilteredIds`: Set of exercise IDs passing the filter bar's CQL2 filter
- `metadataExpression`: The CQL2 expression (for persistence)
- `spatialFilterActive`: Whether viewport is used as filter
- `temporalFilterActive`: Whether timeline range is used as filter

### 2. useBrowserFilter Hook (shared/components)

Composition hook that:
1. Reads `metadataFilteredIds`, `viewport`, `timeFilter` from store
2. Applies all three filters using AND logic
3. Returns `filteredItems[]` for child views

### 3. StacBrowser Component (shared/components)

Parent orchestrator that:
- Receives full `items` array from data provider
- Calls `useBrowserFilter(items)` to get filtered set
- Passes `filteredItems` to ListView, MapView, TimelineView
- Passes full `items` to FilterBar (needs all items for dropdown options)
- Handles layout (filter bar on top, views in split panels)

### 4. Filter Utilities (shared/components/utils)

- `spatial-filter.ts`: `viewportToBounds()`, `bboxOverlaps()`
- `temporal-filter.ts`: `temporalOverlaps()`, `parseEpoch()`
- `computeFilteredItems()`: Applies all three axes

## Data Flow

1. **Metadata filter change**: FilterBar → `onFilteredItems(items)` → extract IDs → `store.setMetadataFilteredIds(ids)` → `useBrowserFilter` recomputes → all views update
2. **Spatial filter change**: Map → `onViewportChange(bounds)` → `store.setViewport(viewport)` → `useBrowserFilter` recomputes → list + timeline update
3. **Temporal filter change**: Timeline → `onTimeRangeChange(range)` → `store.setTimeFilter(filter)` → `useBrowserFilter` recomputes → list + map update

## Testing Approach

1. **Unit tests** for filter utilities: `bboxOverlaps`, `temporalOverlaps`, `computeFilteredItems`
2. **Unit tests** for `BrowserFilterSlice`: store actions and state transitions
3. **Component tests** for `useBrowserFilter`: verify correct filtering with mock store
4. **Storybook stories** for `StacBrowser`: interactive demo with mock exercises
5. **Playwright E2E**: verify synchronized updates across all views in Storybook

## Implementation Order

1. Filter utilities (`spatial-filter.ts`, `temporal-filter.ts`) — pure functions, easy to test
2. `BrowserFilterSlice` — new Zustand slice, independent of UI
3. `useBrowserFilter` hook — composition logic
4. `StacBrowser` component — layout + wiring
5. Storybook stories — visual verification
6. Playwright E2E — automated cross-view sync verification
