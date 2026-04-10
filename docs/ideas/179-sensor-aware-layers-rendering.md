# Sensor-Aware Track Rendering in the Layers Panel

## Problem

The Layers component (`FeatureList`) currently has two expansion behaviours for a `TrackFeature`:

1. **Simple track** (no segments) — expanding the track shows its positions directly as children
2. **Compound track** (multiple segments) — expanding the track shows segments, which in turn expand to their positions

Neither behaviour acknowledges **sensor data embedded under `track.properties.sensors[]`** (E07 #116). Once sensor import (#117) is complete, analysts will have no way to verify from the Layers panel that a track carries sensor data at all — let alone inspect which named sensors exist or how many contacts each one holds. This is a direct gap in the "verify loaded data" workflow that analysts rely on when importing legacy REP files.

## Current Code

- `shared/components/src/FeatureList/flattenFeatures.ts`
  - `flattenTrackChildren()` — handles the simple-track path (tracks with `positions`)
  - `flattenSegments()` — handles the compound-track path (tracks with `segments`)
- `shared/components/src/FeatureList/FeatureList.tsx` — owns expansion state and virtualisation

Both code paths currently ignore `props.sensors`.

## Proposed Behaviour

When a track is expanded, the panel should choose one of four layouts based on `(hasSensors, segmentCount)`:

### Case A — No sensors, single segment (current behaviour, unchanged)

```
Track
 └── Position 1
 └── Position 2
 └── ...
```

### Case B — No sensors, multiple segments (add a "Track Segments" grouping)

```
Track
 └── Track Segments
      └── Segment "ALPHA"
           └── Position 1
           └── ...
      └── Segment "BRAVO"
           └── ...
```

Today the FeatureList shows segments as direct children of the track, with no intermediate grouping row. This change introduces a single virtual "Track Segments" group row so the track expands symmetrically with Case C/D.

### Case C — Has sensors, single segment

```
Track
 └── Positions
      └── Position 1
      └── Position 2
      └── ...
 └── Sensors
      └── TOWED_ARRAY (42 contacts)
           └── 12:34:56  045°
           └── 12:35:01  046°
           └── ...
      └── HULL_ARRAY (17 contacts)
           └── ...
```

- `Positions` is a new virtual group row wrapping what used to be the direct-child position rows.
- `Sensors` is a new virtual group row whose children are the named entries in `props.sensors[]`.
- Each named sensor expands to show its `contacts[]` array.

### Case D — Has sensors, multiple segments (combination of B and C)

```
Track
 └── Track Segments
      └── Segment "ALPHA"
           └── ...
 └── Sensors
      └── TOWED_ARRAY (42 contacts)
           └── ...
```

## Data Model (depends on #116)

This feature assumes the E07 #116 sensor schema overhaul is in place:

- `TrackFeature.properties.sensors?: SensorData[]`
- `SensorData.name: string` (e.g. `"TOWED_ARRAY"`)
- `SensorData.contacts: SensorContact[]` (time-ordered)
- `SensorContact.time: datetime`
- `SensorContact.bearing: float`
- `SensorContact.label?: string`

The `hasSensors` predicate is `(props.sensors?.length ?? 0) > 0`.

## Implementation Sketch

Extend `DisplayItem.type` in `flattenFeatures.ts` with three new row kinds:

- `'group'` — a virtual grouping row with no backing data (`Positions`, `Sensors`, `Track Segments`)
- `'sensor'` — a named sensor row (one per `SensorData`)
- `'contact'` — a single `SensorContact`

The path-based ID scheme extends naturally:

- Group rows: `${featureId}/positions`, `${featureId}/sensors`, `${featureId}/segments`
- Sensor rows: `${featureId}/sensors/${sensorName}`
- Contact rows: `${featureId}/sensors/${sensorName}/contacts/${index}`

`flattenTrackChildren()` becomes a dispatcher that selects one of the four layouts based on `(hasSensors, segments?.length)`. The existing `flattenSegments()` function is reused for the segment sub-tree, wrapped under the new `Track Segments` group row when needed.

Group rows are always expandable and **default to collapsed**. When a track is expanded the analyst sees two (or three, for Case D) rows: `Positions`, `Sensors`, and optionally `Track Segments`. This keeps the default view quiet for tracks with hundreds of positions and requires one extra click to drill into sensor data. The existing `expandedIds` state machine handles this with no changes — the new group IDs follow the same add/remove pattern as every other expandable row.

## Row Display Format

Sensor and contact rows follow the same label/sublabel pattern used for positions today (`getPositionLabel` / `getPositionSublabel` in `flattenFeatures.ts`).

| Row kind | Label | Sublabel | Notes |
|----------|-------|----------|-------|
| `group` (`Positions`, `Sensors`, `Track Segments`) | Group name | null | Non-selectable group header |
| `sensor` | Sensor name | `"N contacts"` | e.g. `"TOWED_ARRAY"` / `"42 contacts"` |
| `contact` | Formatted time | Bearing in degrees | e.g. `"12:34:56"` / `"045°"` |
| `contact` (ambiguous) | Formatted time | `"primary° / ambiguous°"` | e.g. `"12:34:56"` / `"045° / 225°"` — single row, not two siblings |

Time formatting reuses the existing `formatTime()` helper. Bearing formatting uses `Math.round()` for whole degrees, matching how course is shown on position rows (`flattenFeatures.ts:74`).

Optional fields (`range`, `frequency`, `contact.label`, `comment`) are **not** shown inline on the row — they belong in an info popover if needed (the existing `onInfoClick` / `onChildInfoClick` hook already supports this pattern).

## What This Enables

- **Data verification** — the primary driver: after importing a REP file, the analyst can expand a track and immediately see whether sensor data loaded, which named sensors exist, and how many contacts each one holds
- **Selection** — clicking a sensor name selects all its contacts (via `hasChildSelected` prefix matching, already in place); clicking a single contact selects it individually
- **Visibility toggles** — the existing `hiddenIds` mechanism extends to sensor and contact rows for free, giving per-sensor and per-contact visibility control (feeds into #118 map rendering — a sensor hidden in the Layers panel should not render bearing lines)
- **Parity with E07 storage model** — the Layers panel becomes an honest reflection of the `track.properties.sensors` embedding pattern

## Success Criteria

- All four cases (A/B/C/D) render correctly in `FeatureList.stories.tsx`
- A track with sensors shows `Positions` and `Sensors` group rows (collapsed by default) when expanded
- Each named sensor shows a contact count in its sublabel (`"TOWED_ARRAY"` / `"42 contacts"`)
- Contact rows show time as label and bearing as sublabel (`"12:34:56"` / `"045°"`)
- Ambiguous bearings render as a single row with slash-separated sublabel (`"045° / 225°"`) — not two sibling rows
- Selection propagates correctly: selecting a sensor row highlights all child contacts; child selection propagates up to the parent via `hasChildSelected`
- Virtualisation still works: a track with 10,000 contacts must not break scroll performance
- Case A (no sensors, single segment) is visually unchanged from today — this is the dominant existing case and must not regress

## Constraints

- Schema dependency: requires `SensorData` and `SensorContact` shapes from #116 (hard blocker)
- Demo-ready data dependency: most useful once #117 (REP sensor import) lands, but the component work itself only needs the schema
- Must preserve the existing virtualisation contract — row height stays constant
- Sensor row labels must remain stable under sensor reordering (use `name` as the stable key, not array index)
- Empty-sensors-array tracks (`sensors: []`) behave as Case A/B — no `Sensors` group row is shown
- Must work offline (Constitution Art. I) — no schema changes, purely a UI rendering change

## Out of Scope

- Map rendering of sensors — owned by #118
- Array offset calculations — owned by #119
- Sensor editing UI (create/delete/rename sensors, edit contacts)
- Sensor filtering by time range in the Layers panel (time filtering is the Time Controller's job)
- Changes to the `NarrativeLog` container pattern from #152 — that is a separate grouping concern
