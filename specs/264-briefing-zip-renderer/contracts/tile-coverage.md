# Contract — Basemap tile coverage computation

**Surface**: pure function used by the export command
**Entry**: `apps/vscode/src/services/briefingZipExport/computeTileCoverage.ts`

## Purpose

Given the set of Scenes in the exported Storyboard, compute the minimal
set of `(z, x, y)` tile coordinates that the briefing SPA will need at
playback time. The export command then downloads exactly those tiles
(R2 — research.md).

## Signature

```ts
import type { SceneFeature } from '@debrief/schemas';

export interface TileCoord {
  z: number;
  x: number;
  y: number;
}

export interface TileCoverageInput {
  scenes: readonly SceneFeature[];          // ordered by (timestamp, creation_order)
  tilePadding: number;                       // tiles of padding around each viewport (default 1)
  interpolationSamples: number;              // samples per time-range Scene (default = 0 means "auto: 250ms intervals")
}

export interface TileCoverageOutput {
  tiles: readonly TileCoord[];               // deduplicated, sorted by (z, x, y)
  maxZoom: number;                           // for the SPA's TileLayer maxZoom prop
  approxBytes: number;                       // rough estimate at ~5 KB/tile, for UI progress
}

export function computeTileCoverage(input: TileCoverageInput): TileCoverageOutput;
```

## Algorithm

Flavour branch uses `isTimeRangeScene(scene)` from
`@debrief/components/storyboard` — the same predicate the playback
service uses. Post-narrowing, time-range Scenes are typed
`TimeRangeSceneFeature`, which makes `viewport_end` non-optional and
`time_range.start`/`.end` (ISO-8601 strings) non-optional on the
narrowed value.

```text
for each scene in input.scenes:
    if not isTimeRangeScene(scene):
        # instant Scene
        addCoverage(scene.properties.viewport, scene.properties.viewport.zoom)
    else:
        # time-range Scene (#263) — viewport_end and time_range are present
        let v_start = scene.properties.viewport
        let v_end   = scene.properties.viewport_end
        addCoverage(v_start, v_start.zoom)
        addCoverage(v_end,   v_end.zoom)
        # sample the interpolation path so mid-tween pans don't show holes
        for f in [0..1] step (1 / samples):
            v = lerpViewport(v_start, v_end, f)
            z = roundedLerp(v_start.zoom, v_end.zoom, f)
            addCoverage(v, z)
        # cover every integer zoom between start and end
        for z in [min(v_start.zoom, v_end.zoom) .. max(v_start.zoom, v_end.zoom)]:
            addCoverage(v_start, z)
            addCoverage(v_end, z)

deduplicate tiles
sort by (z, x, y)
return { tiles, maxZoom = max(z over all tiles), approxBytes }
```

The `time_range` field (`{ start: ISO8601, end: ISO8601 }`) is *not*
consumed by tile coverage — only viewports and zooms matter for the
spatial tile set. Sample count for the interpolation path is wall-clock
based (default ~250 ms apart) and is derived from the Scene's
`transition_duration_ms` rather than from the time range itself.

### `addCoverage(viewport, zoom)`

Computes the bounding tile rectangle for `viewport` at `zoom`, expanded
by `tilePadding` tiles in every direction, and adds each `(z, x, y)` to
the working set. The bounding rectangle uses Leaflet's standard spherical
Mercator projection (`L.CRS.EPSG3857`) consistent with the authoring
`MapView`.

### `lerpViewport(a, b, f)`

Linear blend of `center` (interpolate longitude with wraparound aware
of antimeridian) and `zoom` (real-valued during the lerp, rounded only
when picking which integer zoom's tiles to include).

### `roundedLerp(za, zb, f)`

`Math.round(za + (zb - za) * f)`. Used to decide which integer zoom
level's tile grid to cover at sample `f`.

## Invariants

- **No tile is ever requested twice** — output is deduplicated by
  `(z, x, y)` triple.
- **No external network in this function** — it is pure arithmetic.
  The download step lives in the calling export command.
- **Bounded output** — for a viewport at zoom 12 with padding 1, the
  tile rectangle is at most ~6×6 = 36 tiles. A 30-Scene Storyboard
  with all time-range Scenes plus 4 interpolation samples each lands
  at ~30 × (2 + 4) × 36 ≈ 6 500 tiles max — bounded and predictable.
- **Pure**: same input → same output, no I/O.

## Test obligations

```ts
describe('computeTileCoverage', () => {
  it('returns empty for empty scenes input', …);
  it('covers a single instant Scene at its captured zoom only', …);
  it('covers two instant Scenes that share a viewport with no duplicates', …);
  it('covers a time-range Scene at start, end, and intermediate zooms', …);
  it('honours tilePadding (0, 1, 2)', …);
  it('handles antimeridian-crossing time-range Scenes correctly', …);
  it('produces a deterministic, sorted output', …);
});
```

Spec mapping: FR-011, FR-027, FR-028.
