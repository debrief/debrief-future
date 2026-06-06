# Usage Example: the shared SystemState helper

The single pure helper (`@debrief/session-state`) reads and writes all four
`SystemState` variants + per-feature visibility against a `FeatureCollection`.
It performs no I/O and never mutates its input.

## Read view-state from a loaded plot

```typescript
import {
  readSystemStateFromFeatureCollection,
  readHiddenFeatureIds,
} from '@debrief/session-state';

const map = readSystemStateFromFeatureCollection(featureCollection);
// map.spatial?.viewport, map.temporal?.start_time, map.selection?.selected_ids, …
// Absent variant ⇒ key absent (defaults applied by the caller). A malformed /
// duplicate / cross-field-invalid feature throws SystemStateLoadError naming
// the offending feature id (strict-on-import).

const hiddenIds = readHiddenFeatureIds(featureCollection); // ['track-07', …]
```

## Hydrate the store on plot open (host bridge)

```typescript
import { hydrateStoreFromFeatures } from '@debrief/session-state';

// Restores viewport / rotation / time window / playhead / time filter /
// display mode / step / rate / selection + the hidden set into the store.
hydrateStoreFromFeatures(store.getState(), featureCollection.features);
```

## Write view-state into the plot on save (host bridge)

```typescript
import { applyStateToFeatures } from '@debrief/session-state';

// Upserts state.spatial / state.temporal / state.selection and sets
// properties.visible:false on hidden features. active_storyboard is left
// untouched (preserved as pass-through). Returns a NEW feature array.
const features = applyStateToFeatures(mapPanel.getCurrentFeatures(), store.getState());
storeFeatureCollection(storePath, plotUri, features); // writes features.geojson only
```

## Low-level write (pure)

```typescript
import { writeSystemStateIntoFeatureCollection } from '@debrief/session-state';

const next = writeSystemStateIntoFeatureCollection(fc, {
  spatial: { viewport, rotation: 0 },
  temporal: { start_time: '2024-01-01T00:00:00Z', end_time: '2024-01-07T00:00:00Z' },
});
```

## Before / after `features.geojson`

**Before** (a plain plot — geographic features only):

```json
{
  "type": "FeatureCollection",
  "features": [
    { "type": "Feature", "id": "track-hms-defender", "geometry": { "type": "LineString", "coordinates": [/*…*/] }, "properties": { "kind": "TRACK", "name": "HMS Defender" } }
  ]
}
```

**After** an explicit save with a viewport, a scoped time window + playhead, a
selection, and one hidden feature — the same file is now self-describing:

```json
{
  "type": "FeatureCollection",
  "features": [
    { "type": "Feature", "id": "track-hms-defender", "geometry": { "type": "LineString", "coordinates": [/*…*/] },
      "properties": { "kind": "TRACK", "name": "HMS Defender" } },
    { "type": "Feature", "id": "track-frigate-07", "geometry": { "type": "LineString", "coordinates": [/*…*/] },
      "properties": { "kind": "TRACK", "name": "Frigate 07", "visible": false } },

    { "type": "Feature", "id": "state.spatial", "geometry": { "type": "Point", "coordinates": [] },
      "properties": { "kind": "SYSTEM", "state_type": "spatial",
        "viewport": { "coordinates": [ {"longitude":-4.5,"latitude":50.8}, {"longitude":-3.0,"latitude":50.8}, {"longitude":-3.0,"latitude":50.0}, {"longitude":-4.5,"latitude":50.0} ], "zoom": 9 },
        "rotation": 0 } },
    { "type": "Feature", "id": "state.temporal", "geometry": { "type": "Point", "coordinates": [] },
      "properties": { "kind": "SYSTEM", "state_type": "temporal",
        "start_time": "2024-01-01T00:00:00.000Z", "end_time": "2024-01-07T00:00:00.000Z",
        "current_time": "2024-01-04T00:00:00.000Z" } },
    { "type": "Feature", "id": "state.selection", "geometry": { "type": "Point", "coordinates": [] },
      "properties": { "kind": "SYSTEM", "state_type": "selection",
        "selected_ids": ["track-hms-defender"], "selected_primary": "track-hms-defender" } }
  ]
}
```

Opening **only** this file on another host restores the exact view — no sidecar.
See `evidence/features-before.json` / `evidence/features-after.json` for the
real captured payloads, and `screenshots/roundtrip-host-b.png` for the restored
view loaded from the file alone.
