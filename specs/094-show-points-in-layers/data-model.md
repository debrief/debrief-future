# Data Model: Show Child Points in Layers Panel

**Feature**: 094-show-points-in-layers
**Date**: 2026-02-13

## Entities

### DisplayItem

A single row in the flattened virtual list. Represents either a top-level feature or a child element within an expanded feature.

| Field       | Type                                        | Description                                                                         |
|-------------|---------------------------------------------|-------------------------------------------------------------------------------------|
| type        | `'feature' \| 'position' \| 'point' \| 'polygon' \| 'segment'` | Discriminator for the row kind                              |
| id          | `string`                                    | Selection path for this item (e.g., `track-001` or `track-001/positions/4`)         |
| label       | `string`                                    | Display label for the row                                                           |
| depth       | `number`                                    | Nesting depth (0 = top-level, 1 = child of feature, 2 = child of segment)          |
| parentId    | `string \| null`                            | Feature ID of the parent (null for top-level features)                              |
| isExpandable| `boolean`                                   | Whether this item can be expanded to show children                                  |
| feature     | `DebriefFeature` (for type `'feature'` only) | Reference to the original feature (for rendering feature rows)                     |
| index       | `number \| null`                            | Child index within parent (null for top-level features)                             |
| sublabel    | `string \| null`                            | Secondary info (e.g., time range for features, course/speed for positions)          |

### ExpandedState

UI-only state tracking which features are expanded in the Layers panel.

| Field        | Type            | Description                                       |
|--------------|-----------------|---------------------------------------------------|
| expandedIds  | `Set<string>`   | Set of feature IDs (or segment paths) currently expanded |

### Level Registry Extensions

Two new entries added to the existing level registry in `selectionPath.ts`.

| Level Name | Addressing Mode | Description                                        |
|------------|----------------|----------------------------------------------------|
| `points`   | `index`        | Individual point within a MultiPoint geometry      |
| `polygons` | `index`        | Individual polygon within a MultiPolygon geometry  |

These join the existing entries:

| Level Name   | Addressing Mode | Description                                        |
|-------------|----------------|----------------------------------------------------|
| `positions` | `index`        | Individual position within a track or segment      |
| `segments`  | `id`           | Named track segment                               |

## Relationships

```
DebriefFeature (top-level)
├── TrackFeature (kind: TRACK)
│   ├── positions[0..N]  → DisplayItem (type: 'position', path: {id}/positions/{i})
│   └── segments[0..M]   → DisplayItem (type: 'segment', path: {id}/segments/{name})
│       └── positions[0..N] → DisplayItem (type: 'position', path: {id}/segments/{name}/positions/{i})
├── MultiPointFeature (kind: MULTI_POINT)
│   └── geometry.coordinates[0..N] → DisplayItem (type: 'point', path: {id}/points/{i})
└── MultiPolygonFeature (kind: MULTI_POLYGON)
    └── geometry.coordinates[0..N] → DisplayItem (type: 'polygon', path: {id}/polygons/{i})
```

## Expandability Rules

A feature is expandable if:

| Feature Kind     | Condition                                            |
|-----------------|------------------------------------------------------|
| `TRACK`         | Always (tracks always have positions)                |
| `MULTI_POINT`   | `geometry.coordinates.length > 0`                    |
| `MULTI_POLYGON` | `geometry.coordinates.length > 0`                    |
| All others      | Not expandable                                       |

A segment within a compound track is expandable if it has associated positions.

## Child Label Derivation

| Child Type   | Primary Label                                  | Sublabel                        |
|-------------|------------------------------------------------|---------------------------------|
| Position    | `PositionStyleOverride.label` or formatted `TimestampedPosition.time` | Course/speed if available |
| Point       | `Point {index + 1}`                            | `[lon, lat]` coordinates        |
| Polygon     | `Polygon {index + 1}`                          | Vertex count                    |
| Segment     | `SegmentMetadata.name`                         | Segment type                    |

## Selection Path Construction

Child selection paths are built by concatenating the parent feature ID with the level name and child index/id:

```
Parent click:   "{featureId}"
Position click: "{featureId}/positions/{index}"
Point click:    "{featureId}/points/{index}"
Polygon click:  "{featureId}/polygons/{index}"
Segment click:  "{featureId}/segments/{segmentName}"
Nested position: "{featureId}/segments/{segmentName}/positions/{index}"
```

## State Flow

```
User clicks chevron on feature row
  → toggleExpand(featureId)
  → expandedIds updated (Set add/delete)
  → flattenedItems recomputed (useMemo)
  → virtualizer count updated
  → new child rows appear/disappear

User clicks child row
  → selection path constructed: "{featureId}/{levelName}/{index}"
  → onSelectionChange(Set([path])) or addToSelection for Ctrl+click
  → session-state normalises path via normalisePath()
  → selection propagated to all panels
```
