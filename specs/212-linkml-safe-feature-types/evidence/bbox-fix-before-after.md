# Incidental bbox fix — `extractCoordinates` → `calculateBounds` (#212 VR-3 / R2)

**Feature**: `212-linkml-safe-feature-types` | **Captured**: 2026-06-01

While dissolving the category-(a) coordinate-read gap in `stacService`, the
hand-rolled `calculateBboxFromFeatures` + `extractCoordinates` pair was deleted
in favour of the shared `@debrief/utils` `calculateBounds`. This fixed a latent
correctness bug: the removed helper only handled **three** of the seven GeoJSON
geometry types, silently producing an incorrect (or empty) bbox for Multi*
geometries.

## Before — `stacService.extractCoordinates` (removed)

```ts
private extractCoordinates(geometry: SafeGeometry): number[][] {
  const coords: number[][] = [];
  if (geometry.type === 'Point') {              // ✅ handled
    ...
  } else if (geometry.type === 'LineString') {  // ✅ handled
    ...
  } else if (geometry.type === 'Polygon') {     // ✅ handled
    ...
  }
  // MultiPoint / MultiLineString / MultiPolygon / GeometryCollection
  //   → fall through, coords stays []  ❌ SILENTLY OMITTED
  return coords;
}
```

A STAC item whose only feature is a `MultiPolygon` therefore yielded **no
coordinates** → `calculateBboxFromFeatures` returned `null` → the item's `bbox`
was never updated (stale `[0,0,0,0]` or absent).

## After — `@debrief/utils` `calculateBounds`

`calculateBounds` walks coordinates through the cast-free
`coerceCoordinates` / `detectDepth` narrowing gate and handles **all seven**
geometry families, plus a pre-computed `feature.bbox` fast-path. It accepts
`IngressFeature[]` (and `RawGeoJSONFeature[]` / `DebriefFeature[]`) without a
cast via the module-private `BoundsInputFeature` structural minimum.

```ts
// stacService.addFeatures (after)
const newBbox = calculateBounds(featureCollection.features);
if (newBbox) { item.bbox = newBbox; }
```

## Proof — unit test over a MultiPolygon feature

`apps/vscode/tests/unit/stacService.test.ts` →
`addFeatures › computes a correct bbox for a MultiPolygon feature (Multi* fix)`:

```ts
geometry: {
  type: 'MultiPolygon',
  coordinates: [
    [[[-5, -5], [5, -5], [5, 5], [-5, 5], [-5, -5]]],   // polygon 1
    [[[10, 10], [20, 10], [20, 20], [10, 20], [10, 10]]], // polygon 2
  ],
}
// expected bbox spans BOTH polygons:
expect(writtenItemObj.bbox).toEqual([-5, -5, 20, 20]);   // ✅ passes
```

| Geometry type | old `extractCoordinates` | new `calculateBounds` |
|---------------|--------------------------|-----------------------|
| Point / LineString / Polygon | ✅ covered | ✅ covered |
| MultiPoint / MultiLineString / **MultiPolygon** | ❌ omitted (empty bbox) | ✅ covered |

The shared utility already had MultiPolygon coverage
(`shared/utils/tests/bounds.test.ts › MultiPolygon → covers every vertex …`),
which `stacService` now inherits for free — the bbox computation is no longer
duplicated, and the three `as number[]*` casts the old helper carried are gone.
