# Usage Example — RawGeoJSONFeature

`RawGeoJSONFeature` is the schema-rooted parse-boundary type used before a
payload is narrowed to a Debrief domain variant (TrackFeature,
ReferenceLocation, SystemState, MultiPointFeature, MultiPolygonFeature).
Post-narrowing, callers use the existing type guards in
`@debrief/schemas/unions.ts`.

## TypeScript

```ts
import type { RawGeoJSONFeature, RawGeoJSONFeatureCollection } from '@debrief/schemas';

// Parse-boundary: no narrowing yet.
const raw: RawGeoJSONFeature = {
  type: 'Feature',
  id: 'track-001',           // string | number | undefined
  geometry: { type: 'Point', coordinates: [0, 0] },
  properties: { sensor: 'radar' },  // Record<string, unknown> | null | undefined
};

// Integer id — both forms are accepted.
const rawInt: RawGeoJSONFeature = {
  type: 'Feature',
  id: 42,
  geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
};

// Absent id + null properties are both permitted per RFC 7946 §3.2.
const rawNoId: RawGeoJSONFeature = {
  type: 'Feature',
  geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
  properties: null,
};

// FeatureCollection
const rawFc: RawGeoJSONFeatureCollection = {
  type: 'FeatureCollection',
  features: [raw, rawInt, rawNoId],
};

// Exhaustive geometry narrowing — the TypeScript compiler proves the switch
// is complete because `geometry` is a discriminated union of the seven
// geometry classes.
function geometryKind(feature: RawGeoJSONFeature): string {
  switch (feature.geometry.type) {
    case 'Point':           return 'Point';
    case 'LineString':      return 'LineString';
    case 'Polygon':         return 'Polygon';
    case 'MultiPoint':      return 'MultiPoint';
    case 'MultiLineString': return 'MultiLineString';
    case 'MultiPolygon':    return 'MultiPolygon';
    default: {
      const _exhaustive: never = feature.geometry;
      return _exhaustive;
    }
  }
}
```

## Python

```python
from debrief_schemas import RawGeoJSONFeature, RawGeoJSONFeatureCollection

# Parse-boundary: no narrowing yet.
raw = RawGeoJSONFeature.model_validate({
    "type": "Feature",
    "id": "track-001",
    "geometry": {"type": "Point", "coordinates": [0.0, 0.0]},
    "properties": {"sensor": "radar"},
})
assert raw.id == "track-001"
assert type(raw.geometry).__name__ == "GeoJSONPoint"

# Integer id
raw_int = RawGeoJSONFeature.model_validate({
    "type": "Feature",
    "id": 42,
    "geometry": {"type": "LineString", "coordinates": [[0, 0], [1, 1]]},
})
assert raw_int.id == 42

# Absent id + null properties are both valid.
raw_no_id = RawGeoJSONFeature.model_validate({
    "type": "Feature",
    "geometry": {"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 0]]]},
    "properties": None,
})
assert raw_no_id.id is None
assert raw_no_id.properties is None

# FeatureCollection with mixed id shapes
raw_fc = RawGeoJSONFeatureCollection.model_validate({
    "type": "FeatureCollection",
    "features": [
        {"type": "Feature", "id": "a", "geometry": {"type": "Point", "coordinates": [0, 0]}},
        {"type": "Feature", "id": 1, "geometry": {"type": "Point", "coordinates": [1, 1]}},
        {"type": "Feature", "geometry": {"type": "Point", "coordinates": [2, 2]}},
    ],
})
assert len(raw_fc.features) == 3
```

## Narrowing past the parse boundary

```ts
import type { RawGeoJSONFeature } from '@debrief/schemas';
import { isTrackFeature, isReferenceLocation } from '@debrief/schemas/unions';

function handle(feature: RawGeoJSONFeature) {
  if (isTrackFeature(feature)) {
    // feature is now a TrackFeature — geometry is LineString|MultiLineString,
    // properties.kind === 'TRACK', etc.
    const firstPoint = feature.geometry.coordinates[0];
  } else if (isReferenceLocation(feature)) {
    // feature is now a ReferenceLocation
  } else {
    // Either another domain variant or genuinely unclassified.
  }
}
```
