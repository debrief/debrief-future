# Usage example — feature 203

Demonstrates how an application developer consumes the consolidated spatial types
and new utility helpers introduced by feature 203.

## Importing the canonical types

After this feature, all three types come from `@debrief/schemas` (the
LinkML-generated TypeScript package):

```typescript
import type { Coordinate, ViewportPolygon, TimeFilter } from '@debrief/schemas';

// Canonical shapes:
//   Coordinate       = { longitude: number; latitude: number }
//   ViewportPolygon  = { coordinates: Coordinate[]; zoom?: number }
//   TimeFilter       = { start?: number; end?: number }  // epoch ms; missing = unbounded

const london: Coordinate = { longitude: -0.1276, latitude: 51.5074 };

const viewport: ViewportPolygon = {
  coordinates: [
    { longitude: -1, latitude: 52 }, // NW
    { longitude: 1, latitude: 52 },  // NE
    { longitude: 1, latitude: 51 },  // SE
    { longitude: -1, latitude: 51 }, // SW
  ],
  zoom: 10,
};

const window: TimeFilter = { start: 1704067200000, end: 1704153600000 };
```

## Round-tripping at the GeoJSON / Leaflet boundary

`@debrief/utils` now exports two pure converter helpers that confine tuple-form
handling to the wire-format boundary (RFC 7946):

```typescript
import { toGeoJSONCoord, fromGeoJSONCoord } from '@debrief/utils';

// Object form → GeoJSON tuple (longitude first, per RFC 7946 §3.1.1):
const tuple = toGeoJSONCoord(london);        // [-0.1276, 51.5074]

// GeoJSON tuple → object form:
const back = fromGeoJSONCoord(tuple);        // { longitude: -0.1276, latitude: 51.5074 }

// Round-trip identity — asserted by unit tests across a canonical fixture set:
JSON.stringify(london) === JSON.stringify(fromGeoJSONCoord(toGeoJSONCoord(london)));
// => true
```

**Leaflet note**: Leaflet's `LatLng` uses the opposite order (`[lat, lng]`).
Use `L.latLng(coord.latitude, coord.longitude)` for Leaflet — these helpers are
specifically for GeoJSON axis order.

## Validating viewport polygons

```typescript
import {
  validateCoordinate,
  validateViewportPolygon,
  calculateViewportCenter,
} from '@debrief/utils';

validateCoordinate({ longitude: 181, latitude: 0 });
// => false (longitude out of range)

validateViewportPolygon(viewport);
// => true (4 valid corners)

validateViewportPolygon({ coordinates: viewport.coordinates.slice(0, 3) });
// => false (cardinality violation — TypeScript type relaxes to Coordinate[],
// runtime enforces the 4-corner contract)

calculateViewportCenter(viewport);
// => { longitude: 0, latitude: 51.5 }
```

## Handling legacy persisted state

The persistence layer handles legacy (pre-feature-203) tuple-form coordinates
automatically via `coerceViewport`, invoked by `applySessionState` at load time
— callers don't need to branch on the shape:

```typescript
import { loadSession } from '@debrief/session-state';

// A v1.0.0 file with tuple-form viewport rehydrates into canonical object form.
const result = await loadSession(store, '/path/to/legacy.debrief.json');
// result.success === true
// store.getState().viewport.coordinates[0] === { longitude: ..., latitude: ... }
//                           ^— NOT a tuple, always the object form
```

The `SCHEMA_VERSION` bump to `'1.1.0'` surfaces in save metadata so that
operators can tell which files have been migrated. The legacy-tuple branch is
annotated `REMOVABLE:` so it can be deleted once all production data has been
re-saved under 1.1.0 (tracked as a follow-up).
