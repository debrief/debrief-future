# Data Model: List View with Spatial Thumbnails

**Feature**: 129-list-view-thumbnails
**Date**: 2026-03-06

## Entities

### ExerciseListItem

Extends `CatalogOverviewItem` with STAC extension metadata for display in the list view.

| Field | Type | Required | Source | Description |
|-------|------|----------|--------|-------------|
| `id` | `string` | Yes | `item.id` | STAC Item identifier |
| `title` | `string` | Yes | `item.properties.title` | Exercise display name |
| `itemPath` | `string` | Yes | computed | Path to item.json relative to store root |
| `bbox` | `[number, number, number, number] \| null` | No | `item.bbox` | Geographic bounds [west, south, east, north] |
| `datetime` | `string \| null` | No | `item.properties.datetime` | Single datetime (ISO 8601) |
| `startDatetime` | `string \| null` | No | `item.properties.start_datetime` | Range start (ISO 8601) |
| `endDatetime` | `string \| null` | No | `item.properties.end_datetime` | Range end (ISO 8601) |
| `vesselClasses` | `string[]` | Yes | `item.properties["debrief:vessel_classes"]` | Vessel taxonomy paths |
| `tags` | `string[]` | Yes | `item.properties["debrief:tags"]` | Plot-level tags |
| `author` | `string \| null` | No | `item.properties["debrief:author"]` | Exercise author |
| `nationalities` | `string[]` | Yes | `item.properties["debrief:nationalities"]` | ISO 3166-1 alpha-2 codes |
| `trackNames` | `string[]` | Yes | `item.properties["debrief:track_names"]` | Track platform names |
| `trackDataHref` | `string \| null` | No | `item.assets.data.href` | Path to GeoJSON track data for thumbnail |

**Computed fields** (derived at render time):

| Field | Type | Derivation |
|-------|------|------------|
| `duration` | `number \| null` | `endDatetime - startDatetime` in milliseconds; null if either missing |
| `durationLabel` | `string` | Human-readable: "2 hours", "3 days", "1 week" |
| `dateLabel` | `string` | Formatted range: "12 Jan 2024 – 14 Jan 2024" or single date |

### SortConfiguration

Analyst's current sort selection, persisted in component state.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `dimension` | `SortDimension` | Yes | `'recency'` | Active sort criterion |
| `direction` | `SortDirection` | Yes | `'desc'` | Sort order |

**SortDimension** enum: `'recency' | 'title' | 'duration'`

**SortDirection** enum: `'asc' | 'desc'`

**Default sort per dimension**:

| Dimension | Default Direction | Sort Field |
|-----------|-------------------|------------|
| `recency` | `desc` | `startDatetime ?? datetime` |
| `title` | `asc` | `title` (locale-aware) |
| `duration` | `desc` | computed `duration` |

### RecentlyOpenedEntry

Record of an exercise previously opened by the analyst.

| Field | Type | Required | Source | Description |
|-------|------|----------|--------|-------------|
| `plotId` | `string` | Yes | `RecentPlot.plotId` | STAC Item ID |
| `title` | `string` | Yes | `RecentPlot.title` | Exercise title |
| `storeId` | `string` | Yes | `RecentPlot.storeId` | STAC store identifier |
| `lastOpened` | `string` | Yes | `RecentPlot.lastOpened` | ISO 8601 timestamp |
| `uri` | `string` | Yes | `RecentPlot.uri` | Quick-open URI |

**Computed fields**:

| Field | Type | Derivation |
|-------|------|------------|
| `relativeTime` | `string` | From `lastOpened`: "2 hours ago", "yesterday", "3 days ago" |

**Ordering**: Always sorted by `lastOpened` descending (most recent first).

**Maximum count**: Configurable, default 10 (from `debrief.recentPlots.maxCount`).

## Entity Relationships

```
ExerciseListItem (extends CatalogOverviewItem)
  ├── displayed in: ListView (main scrollable list)
  ├── sorted by: SortConfiguration
  ├── filtered by: shared filter state (from #132 / #126)
  └── thumbnail rendered from: trackDataHref → GeoJSON

RecentlyOpenedEntry
  ├── displayed in: ListView ("Recently Opened" section)
  ├── references: ExerciseListItem (by plotId)
  ├── persisted by: RecentPlotsService (extension host)
  └── communicated via: postMessage protocol

SortConfiguration
  ├── controls ordering of: ExerciseListItem[]
  ├── persisted in: component local state (session-scoped)
  └── survives: filter changes (not reset when filters change)
```

## State Flow

```
Extension Host                    Webview (List View)
─────────────                    ──────────────────
StacService.listItems()
  → items: StacItemSummary[]
                                  ← loadExerciseList message
ExerciseListItem[] ──────────────→ items prop
                                    │
RecentPlotsService                  │
  → plots: RecentPlot[]            │
                                  ← loadRecentPlots message
RecentlyOpenedEntry[] ───────────→ recentItems prop
                                    │
                                  Component renders:
                                    ├── Recently Opened section
                                    ├── Sort control
                                    └── Virtualised exercise list
                                         └── Spatial thumbnails
                                    │
                                  User clicks exercise
                                    │
                                  → openExercise message
                                  ──────────────────→
openItem(itemPath)
addRecentPlot(...)
  → updated recentPlots
                                  ← updateRecentPlots message
RecentlyOpenedEntry[] ───────────→ recentItems updated
```
