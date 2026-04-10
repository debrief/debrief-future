# Usage Example: Sensor-Aware Track Rendering

## Storybook Walkthrough

Open the `TracksWithSensors` story in Storybook:

```
Components / FeatureList / Tracks With Sensors
```

The story displays five tracks demonstrating all four layout cases plus edge cases.

### Case A — Simple Track (No Sensors)

**Track**: "Case A — Simple Track"

1. Click the chevron to expand the track
2. Three position rows appear as direct children at depth 1
3. Each position shows timestamp label with zero-padded course sublabel (e.g. `090° 12.5kts`)
4. No group rows appear — this is the unchanged legacy behaviour

### Case B — Compound Track (No Sensors)

**Track**: "Case B — Compound (No Sensors)"

1. Click the chevron to expand the track
2. A single `Track Segments (2)` group row appears at depth 1
3. Click the group row's chevron to expand it
4. Two segment rows (`leg-alpha`, `leg-bravo`) appear at depth 2
5. Each segment is further expandable to show nested positions

### Case C — Track with Sensors

**Track**: "Case C — Track with Sensors"

1. Click the chevron to expand the track
2. Two group rows appear: `Positions (3)` and `Sensors (2)`
3. Expand `Sensors (2)` — two sensor rows appear:
   - `TOWED_ARRAY` with `42 contacts` sublabel
   - `HULL_ARRAY` with `17 contacts` sublabel
4. Expand `TOWED_ARRAY` — contact rows appear with:
   - Timestamp label (formatted via `Date.toLocaleTimeString()`)
   - Zero-padded bearing sublabel (e.g. `045°`)
   - First contact shows ambiguous bearing: `045° / 225°`
5. Click any contact row — it becomes selected; parent sensor shows child-selected indicator when collapsed

### Case D — Compound Track with Sensors

**Track**: "Case D — Compound + Sensors"

1. Click the chevron to expand the track
2. Two group rows appear: `Track Segments (2)` and `Sensors (1)`
3. Both groups are independently expandable
4. The symmetry between Cases B and D is visible — segments always get the wrapper when sensors are present

### Edge Cases

**Track**: "Edge Cases — Zero/Ambiguous"

1. Expand the track to see `Positions (1)` and `Sensors (2)` groups
2. Expand `Sensors (2)`:
   - `EMPTY_SENSOR` shows `0 contacts` — expanding it shows a "No contacts" placeholder
   - `AMBIGUOUS_SENSOR` shows `2 contacts` — expanding it reveals:
     - Contact 1: `045° / 225°` (ambiguous bearing displayed as single row)
     - Contact 2: `359°` (normal bearing)

## Selection Behaviour

- Click any row's **label** to select it — `selectedIds` updates with exactly one path ID
- Click a **group row** (e.g. `Sensors (2)`) — selects `track-id/sensors` as a single entry, no fan-out
- Click a **contact row** — selects `track-id/sensors/TOWED_ARRAY/contacts/0`
- Parent rows show child-selected indicator (blue dot) when collapsed with a selected descendant

## Info Icon

The story enables `showInfoIcon={true}`. Contact rows display the info icon; clicking it shows an alert with the contact's details. Sensor rows and group rows do not show the info icon.
