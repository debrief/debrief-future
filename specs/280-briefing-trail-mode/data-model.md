# Data Model: Briefing Renderer Honours Trail Display Mode

**Feature**: 280-briefing-trail-mode
**Date**: 2026-06-01

This feature **persists nothing new** and **changes no schema** (FR-006). It reads
data already present in the exported briefing and derives an in-memory read-model
for rendering. The "entities" below are therefore (a) existing typed boundary
inputs the renderer already receives, and (b) a small derived read-model used by
the rendering layer.

## Boundary inputs (existing — consumed, not defined here)

Per Constitution Article IV.5, these are **not** re-declared; the renderer reads
them through their canonical generated/source types.

### Scene (`SceneFeature`, from `@debrief/components` / LinkML `geojson.yaml`)

| Field | Type | Notes |
|-------|------|-------|
| `properties.display_mode` | `DisplayMode \| undefined` | `'full'` \| `'trail'`. Absent in legacy/pre-#258 briefings. The only field this feature newly reads. |
| `properties.viewport` | viewport (centre + zoom) | Already consumed for fly-to (unchanged). |
| `properties.visible_feature_ids` | `string[]` | Already consumed for visibility scoping (unchanged). |

`DisplayMode` is the generated enum from `@debrief/schemas` (sourced from
`session-state.yaml`), reused verbatim — `'full' | 'trail'`.

### Track feature (existing exported shape)

A platform track in the briefing `FeatureCollection`:

| Field | Type | Notes |
|-------|------|-------|
| `geometry.type` | `'LineString'` | Only `LineString` features participate in time-driven rendering. |
| `geometry.coordinates` | `[lon, lat][]` | Ordered vertices. |
| `properties.timestamps` | `string[]` (ISO-8601) | **Parallel** to `coordinates` (same length, ≥2). Already present — this is what drives the existing moving dot. |
| `properties.colour` | `string \| undefined` | Stroke colour (default `#1f77b4`). |
| `properties.id` \/ `id` | `string` | Feature identifier (stable Polyline key source). |

### Current playback time (existing store state)

| Field | Type | Notes |
|-------|------|-------|
| `currentTime` | `number` (epoch ms) | Single source advanced by both the time-slider and the playback driver via `setCurrentTime`. Drives the trail head **and** the moving dot. |

## Derived read-model (in-memory, this feature)

### `TemporalTrack` (renderer-local derivation)

Computed by filtering the scene's visible line features to those that are valid
temporal tracks. Shared by the trail render **and** the moving-dot render so the
two are always consistent (a track participates in both or neither).

| Field | Type | Derivation |
|-------|------|-----------|
| `id` | `string` | `properties.id ?? feature.id` |
| `coords` | `[lon, lat][]` | `geometry.coordinates` |
| `epochsMs` | `number[]` | `properties.timestamps.map(Date.parse)` |
| `colour` | `string` | `properties.colour ?? DEFAULT_TRACK_COLOR` |
| `name` | `string` | `properties.name ?? ''` |

**Validity gate** (a `LineString` qualifies as a `TemporalTrack` only if all hold):
`Array.isArray(timestamps)` · `coords.length === timestamps.length` ·
`coords.length >= 2` · every `Date.parse(ts)` is not `NaN`.

A `LineString` that fails the gate, and every non-`LineString` line/area feature,
is **not** a `TemporalTrack`: it renders in full via the existing `<GeoJSON>`
layer in both modes (FR-007, FR-009).

### Display-coordinate mapping (the pure function under test)

The core, unit-testable transform:

```
displayCoords(track: TemporalTrack, isTrail: boolean, currentTimeMs: number) -> [lon, lat][]
  = isTrail
      ? sliceTrackToTime(track.coords, track.epochsMs, currentTimeMs)   // grows with time
      : track.coords                                                    // whole track
```

where `isTrail = (currentScene?.properties.display_mode === 'trail')`.

## State transitions / behaviour

There is no persisted state machine. The observable behaviour is a pure function
of `(active scene's display_mode, currentTime)`:

| `display_mode` | `currentTime` vs track window | Visible track |
|----------------|-------------------------------|---------------|
| `trail` | before first timestamp | empty (nothing yet) |
| `trail` | within window | grows monotonically to nearest sample ≤ now |
| `trail` | at/after last timestamp | full track |
| `full` / absent / unrecognised | any | full track |
| any (track fails validity gate) | any | full track (fallback, no dot) |

## Constraints

- **Performance**: `displayCoords` runs per visible temporal track per frame in
  Trail mode. `sliceTrackToTime` is O(log n) + O(k) copy; with stable-keyed
  `<Polyline>` in-place updates this sustains smooth playback for typical track
  sizes (hundreds–low thousands of vertices). No per-frame layer teardown.
- **Type safety (Article XV)**: no `any`. `display_mode` is read as
  `DisplayMode | undefined` and compared to the `'trail'` literal; `epochsMs`
  is `number[]`; the ISO→epoch narrowing happens once at the validity gate.
