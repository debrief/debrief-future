# Converter Contracts

Target package: `@debrief/utils` (source: `shared/utils/src/`).

## Exports

```typescript
import type { Coordinate } from '@debrief/schemas';

/**
 * Convert a canonical Coordinate object to a GeoJSON position tuple.
 *
 * Returns the coordinate in **GeoJSON axis order** — [longitude, latitude] —
 * per RFC 7946 §3.1.1. This is NOT the same order as Leaflet's LatLng
 * (which is [latitude, longitude]).
 *
 * @param coord — Canonical coordinate with named longitude/latitude fields.
 * @returns A length-2 tuple [longitude, latitude].
 */
export function toGeoJSONCoord(coord: Coordinate): [number, number];

/**
 * Convert a GeoJSON position tuple to a canonical Coordinate object.
 *
 * Accepts the tuple in **GeoJSON axis order** — [longitude, latitude] —
 * per RFC 7946 §3.1.1. For Leaflet's [lat, lng] order, use `L.latLng`
 * directly rather than this helper.
 *
 * @param tuple — A length-2 tuple [longitude, latitude].
 * @returns A Coordinate object.
 */
export function fromGeoJSONCoord(tuple: [number, number]): Coordinate;
```

## Contract assertions (unit tests)

```typescript
describe('toGeoJSONCoord', () => {
  it('returns GeoJSON-order tuple', () => {
    expect(toGeoJSONCoord({ longitude: -1.5, latitude: 51.5 }))
      .toEqual([-1.5, 51.5]);
  });
});

describe('fromGeoJSONCoord', () => {
  it('accepts GeoJSON-order tuple', () => {
    expect(fromGeoJSONCoord([-1.5, 51.5]))
      .toEqual({ longitude: -1.5, latitude: 51.5 });
  });
});

describe('round-trip identity', () => {
  it.each([
    { longitude: 0, latitude: 0 },
    { longitude: -180, latitude: -90 },
    { longitude: 180, latitude: 90 },
    { longitude: 179.9999, latitude: 89.9999 },
    { longitude: -0.1276, latitude: 51.5074 }, // London
    { longitude: 139.6917, latitude: 35.6895 }, // Tokyo
    { longitude: -74.0060, latitude: 40.7128 }, // New York
    { longitude: 151.2093, latitude: -33.8688 }, // Sydney
    { longitude: 0.000001, latitude: -0.000001 }, // sub-meter precision
  ])('round-trips %o unchanged', (coord) => {
    expect(fromGeoJSONCoord(toGeoJSONCoord(coord))).toEqual(coord);
  });
});
```

## Behavioural guarantees

- **Pure functions** — no side effects; deterministic; no dependencies beyond the type system.
- **No validation** — these are shape converters, not validators. Invalid coordinates pass through unchanged. Callers needing validation use `validateCoordinate` explicitly.
- **No coordinate system transformation** — these do not project, normalise, or modify values. They only swap between object and tuple representations of the same WGS84 lat/lon pair.
- **Tree-shakeable** — each helper is a named export with no shared state.

## Non-goals (explicit)

- Not a Leaflet converter. Use `L.latLng(coord.latitude, coord.longitude)` for that.
- Not a GeoJSON Feature/Geometry constructor. Callers compose higher-level GeoJSON objects themselves using these helpers for the coordinate layer.
- No Python equivalent in this feature (see research R-008).
