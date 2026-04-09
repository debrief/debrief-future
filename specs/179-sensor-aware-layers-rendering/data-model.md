# Data Model — 179 Sensor-Aware Layers Rendering

**Feature**: `179-sensor-aware-layers-rendering`
**Phase**: 1 — Design & Contracts

## Scope

This feature introduces **no new persisted entities**, **no schema changes**, and **no new LinkML types**. The underlying `SensorData` / `SensorContact` / `TrackProperties.sensors` shapes were shipped by E07 #116 and are already present in `shared/schemas/src/generated/typescript/types.ts` (lines 664, 685, 774).

What this feature does change is the **in-memory `DisplayItem` tree** produced by `flattenFeatures()` — a pure render-time derivation with no persistence surface. This document describes that derivation.

## Inputs (unchanged, reference only)

### `SensorData` — from `@debrief/schemas`

```ts
interface SensorData {
  name: string;               // e.g. "TOWED_ARRAY" — stable identity
  base_frequency?: number;    // Hz — not rendered in this PR (info popover, follow-up)
  offset?: number;            // metres — not rendered in this PR
  worm_in_hole?: boolean;     // not rendered in this PR
  contacts: SensorContact[];  // time-ordered by importer contract
}
```

### `SensorContact` — from `@debrief/schemas`

```ts
interface SensorContact {
  time: string;                  // ISO 8601 — rendered as row label via formatTime()
  bearing: number;               // degrees 0-360 — rendered zero-padded as sublabel
  range?: number;                // metres — info popover only
  frequency?: number;            // Hz — info popover only
  ambiguous_bearing?: number;    // degrees — rendered inline as "NNN° / NNN°"
  label?: string;                // info popover only
  comment?: string;              // info popover only
}
```

### `TrackProperties.sensors` — from `@debrief/schemas`

```ts
interface TrackProperties extends BaseFeatureProperties {
  // ...existing fields...
  sensors?: SensorData[];  // optional; may be undefined, [], or populated
}
```

## Extended output — `DisplayItem`

The `DisplayItem` type defined in `shared/components/src/FeatureList/flattenFeatures.ts:25` gains three new values on its `type` discriminator:

```ts
// BEFORE
type DisplayItemType = 'feature' | 'position' | 'point' | 'polygon' | 'segment';

// AFTER (this feature)
type DisplayItemType =
  | 'feature'   // unchanged — top-level track / point / polygon / reference feature
  | 'position'  // unchanged — child of a track under the "Positions" group
  | 'point'     // unchanged — child of a multi-point feature
  | 'polygon'   // unchanged — child of a multi-polygon feature
  | 'segment'   // unchanged — child of a compound track under the "Track Segments" group
  | 'group'     // NEW — virtual header for "Positions", "Sensors", "Track Segments"
  | 'sensor'    // NEW — one named entry under a "Sensors" group
  | 'contact';  // NEW — one measurement under a sensor
```

No new fields are added to `DisplayItem`. All new row kinds ride on the existing shape:

| Field | Group row | Sensor row | Contact row |
|---|---|---|---|
| `type` | `'group'` | `'sensor'` | `'contact'` |
| `id` | `${featureId}/positions` \| `${featureId}/sensors` \| `${featureId}/segments` | `${featureId}/sensors/${sensorName}` | `${featureId}/sensors/${sensorName}/contacts/${index}` |
| `label` | `Positions (N)` \| `Sensors (N)` \| `Track Segments (N)` | `${sensor.name}` | Formatted time (via `formatTime(contact.time)`) |
| `sublabel` | `null` | `"${N} contacts"` | Zero-padded bearing, optionally slash-separated for ambiguous |
| `depth` | 1 | 2 | 3 |
| `parentId` | `featureId` | `${featureId}/sensors` | `${featureId}/sensors/${sensorName}` |
| `isExpandable` | `true` (even for zero count — shows "No X" placeholder when empty) | `true` (even for zero contacts — shows "No contacts" placeholder) | `false` |
| `feature` | `null` | `null` | `null` |
| `index` | `null` | index in `sensors[]` (stable across reorderings via name, not index) | index in `contacts[]` |

## Depth rules

Row depth determines the indent applied by `FeatureRow` (12px + 20px per depth level — see `FeatureRow.tsx:171`).

```
Track row                                                                 depth 0
  ├── Positions (1023)    [group]                                         depth 1
  │     └── 12:34:56   045° 12.0kts   [position]                          depth 2
  ├── Track Segments (3)  [group]                                         depth 1
  │     └── ALPHA        [segment]                                        depth 2
  │           └── 12:34:56   045° 12.0kts   [position]                    depth 3
  └── Sensors (2)         [group]                                         depth 1
        ├── TOWED_ARRAY   42 contacts   [sensor]                          depth 2
        │     └── 12:34:56   045°                   [contact]             depth 3
        └── HULL_ARRAY    17 contacts   [sensor]                          depth 2
              └── 12:34:56   130°                   [contact]             depth 3
```

**Note**: The position rows under the `Positions` group sit at depth 2 — one level deeper than they do today. This is a deliberate consequence of the new wrapper and applies only in Cases C and D. Case A (no sensors, no segments) keeps positions at depth 1 (unchanged) because there is no `Positions` wrapper in that case. This is important for FR-008 (Case-A regression guard): Case A's row depths, IDs, and labels all stay identical to today except for the course-padding change.

## Path-scheme contract

The ID format is load-bearing — it drives `hasChildSelected`, `hiddenIds`, and any future path-based lookup. The full grammar:

```
feature-id       = <string, opaque to FeatureList>
group-id         = feature-id "/" ( "positions" | "sensors" | "segments" )
sensor-id        = feature-id "/sensors/" sensor-name
contact-id       = sensor-id "/contacts/" contact-index
segment-id       = feature-id "/segments/" segment-name       (unchanged from today)
position-id      = feature-id "/positions/" position-index    (unchanged when no Positions wrapper)
                 = feature-id "/positions/" position-index    (same — the wrapper does not inject its name into child IDs)
```

**Design rationale for the position-id stability**: position rows inside the new `Positions` wrapper keep their existing `${featureId}/positions/${index}` ID scheme — not `${featureId}/positions/positions/${index}`. The wrapper is a rendering concern only; position identity stays tied to the feature + index.

Selection prefix-matching follows:

```
selecting any id starting with `${featureId}/`         → hasChildSelected(featureId) = true
selecting any id starting with `${featureId}/sensors/` → hasChildSelected(`${featureId}/sensors`) = true
selecting any id starting with `${sensorId}/`          → hasChildSelected(sensorId) = true
```

## Four-case dispatcher

The existing `flattenTrackChildren` function becomes a dispatcher that picks one of four code paths based on `(hasSensors, segmentCount)`:

```
hasSensors   = (props.sensors?.length ?? 0) > 0
segmentCount = props.segments?.length ?? 0
```

| Case | `hasSensors` | `segmentCount` | Behaviour |
|---|---|---|---|
| **A** | false | 0 or 1 | Current behaviour — positions as direct children of track, depth 1 |
| **B** | false | >1 | `Track Segments (N)` group row → existing `flattenSegments` sub-tree, one level deeper |
| **C** | true | 0 or 1 | `Positions (N)` + `Sensors (N)` group rows → positions under first, named sensors under second |
| **D** | true | >1 | `Track Segments (N)` + `Sensors (N)` group rows |

Case A is explicitly the unchanged fall-through — no wrapper row is inserted. This guarantees FR-008 (byte-for-byte identical except for FR-018 course padding).

## Invariants

1. **Row height is constant.** All new row kinds (`group`, `sensor`, `contact`) use the same `rowHeight` as `position`, `segment`, `point`, `polygon`. The `useVirtualizer` `estimateSize` callback returns a single value (FR-011).
2. **Path IDs are unique within a single `flattenFeatures` call** *assuming sensor names are unique within a track* (see Decision 6 in `research.md`).
3. **`flattenFeatures` is pure.** No mutations to inputs; no side effects; no async; no logging; no persistence.
4. **Expansion state is stored in the existing `expandedIds: Set<string>`** passed from `FeatureList`. Group rows default to collapsed because their IDs are not in `expandedIds` on first expand of the parent track.
5. **Zero-contact sensors and empty groups still render the row** (`isExpandable: true`) — expanding shows a `"No contacts"` / `"No child items"` placeholder, consistent with the existing pattern.
6. **Sensor identity is the `name` string**, not the array index. If `SensorData[]` is reordered (e.g. by a sort tool), existing `selectedIds` and `expandedIds` remain stable because their path IDs key off `name`.

## Data-flow diagram

```
┌─────────────────────────┐
│  DebriefFeature[]       │  input: raw feature array (from host app)
│  .properties.sensors?   │
└───────────┬─────────────┘
            │
            │  flattenFeatures(features, expandedIds)
            │  — pure function, no I/O
            ▼
┌─────────────────────────┐
│  DisplayItem[]          │  output: flat virtualiser-ready list
│  (feature, group,       │
│   position, sensor,     │
│   contact, segment, …)  │
└───────────┬─────────────┘
            │
            │  consumed by useVirtualizer + FeatureRow
            ▼
┌─────────────────────────┐
│  Virtualised DOM rows   │  user-facing output
└─────────────────────────┘
```

## What does NOT change

- `@debrief/schemas` — zero edits to `.yaml` source or generated files.
- `SensorData` / `SensorContact` type definitions.
- `TrackProperties.sensors` shape.
- LinkML source (`shared/schemas/src/linkml/geojson.yaml`).
- Any Pydantic or JSON Schema generated file.
- Any STAC storage format.
- Any service API.
