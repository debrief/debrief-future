# Data Model: Timeline/Gantt View with Temporal Filtering

**Feature**: 131-timeline-gantt-view
**Date**: 2026-03-06

## Entities

### TimeRange

Represents a continuous time interval.

| Field | Type | Description |
|-------|------|-------------|
| `min` | `number` (epoch ms) | Start of range |
| `max` | `number` (epoch ms) | End of range |

**Validation**: `min < max`; if `min === max`, pad by ±1 hour (3,600,000 ms).

### TemporalFilter

The active temporal filter derived from the user's time range selection on the timeline.

| Field | Type | Description |
|-------|------|-------------|
| `start` | `number` (epoch ms) | Left boundary of the selected range |
| `end` | `number` (epoch ms) | Right boundary of the selected range |

**Validation**: `start < end`. Setting temporal filter to `null` means "no temporal filter" (all items pass).

**Overlap semantics**: An exercise passes the temporal filter if its temporal extent overlaps the selected range:
```
itemStart <= filter.end AND itemEnd >= filter.start
```

Where `itemStart` and `itemEnd` are derived from `start_datetime` / `end_datetime` / `datetime` via `parseTime()` fallback chain.

### StacBrowserItem (existing — from #126)

Extended STAC item consumed by the timeline. Defined in `shared/components/src/filter-engine/types.ts`.

| Field | Type | Source |
|-------|------|--------|
| `id` | `string` | STAC Item ID |
| `title` | `string` | Item title |
| `itemPath` | `string` | Path to item.json |
| `bbox` | `[number, number, number, number] \| null` | Bounding box |
| `datetime` | `string \| null` | Single datetime (ISO 8601 fallback) |
| `startDatetime` | `string \| null` | Range start (ISO 8601) |
| `endDatetime` | `string \| null` | Range end (ISO 8601) |
| `vesselClasses` | `readonly string[]` | Vessel classification paths |
| `tags` | `readonly string[]` | Plot-level tags |
| `featureTags` | `readonly string[]` | Feature-level tags |
| `author` | `string \| null` | Author |
| `trackNames` | `readonly string[]` | Platform track names |
| `nationalities` | `readonly string[]` | ISO 3166-1 alpha-2 codes |
| `collection` | `string \| null` | STAC Collection ID |

### TimelineBarData (derived — computed at render time)

Layout data for a single exercise bar on the timeline. Not stored; computed from `StacBrowserItem` + `TimeRange`.

| Field | Type | Description |
|-------|------|-------------|
| `item` | `StacBrowserItem` | Source item |
| `x` | `number` | Horizontal offset in chart coordinates |
| `width` | `number` | Bar width (min 4px) |
| `y` | `number` | Vertical offset (row index * row height) |
| `isPoint` | `boolean` | True if start === end (renders as circle) |
| `colour` | `string \| null` | Colour from colour scheme, or null for default |
| `hasTime` | `boolean` | True if any temporal data exists |

## Relationships

```
StacBrowserItem (source data)
  └─> TimelineBarData (computed per render)
        └─> SVG <rect> or <circle> (visual)

TemporalFilter (user interaction output)
  └─> Shared Filter State Store (#132)
        └─> List View (#129) — re-filters
        └─> Map View (#130) — re-filters

TimeRange (computed from all items)
  └─> Time axis rendering
  └─> Brush boundary limits
```

## State Transitions

### Temporal Filter State Machine

```
[No Filter] ──[user drags brush]──> [Active Filter]
     ↑                                      │
     │                                      │
     └──[user resets / removes brush]───────┘

[Active Filter] ──[user adjusts handle]──> [Active Filter (updated)]
[Active Filter] ──[user drags brush body]──> [Active Filter (panned)]
```

### Timeline Rendering States

```
[Loading] ──[items received]──> [Populated]
[Populated] ──[all items filtered out]──> [Empty / No Matches]
[Empty / No Matches] ──[filters relaxed]──> [Populated]
[Any State] ──[data error]──> [Error]
```
