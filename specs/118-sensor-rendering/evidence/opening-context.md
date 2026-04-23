## What We're Building

Until now, sensor data in Debrief Future has been invisible. You could import it, store it, and inspect it in the Layers panel, but the map showed nothing -- no bearing lines, no coverage fans, no visual indication that an ownship was observing anything at all.

This changes with #118. We're adding a custom Leaflet canvas layer that draws sensor bearing lines directly on the map. Each sensor contact produces a line from the host platform's interpolated position, extending outward along the observed bearing. Contacts with range data get a line of that length. Contacts without range get a line extending to 5 degrees of latitude -- the same cap Legacy Debrief uses.

Ambiguous bearings (common with towed arrays) render as a second line in a darker shade of the sensor colour. Snail mode fading works exactly as it does for track rendering: contacts fade from full colour to black as they age out of the trail window.

## How It Fits

This is Phase 3 of the Sensor Data Pipeline epic (E07). Phase 1 (#116) overhauled the sensor schema. Phase 2 (#117) added REP sensor import. This phase makes that imported data visible. Phase 4 (#119) will refine the bearing line origins with array offset calculations (PLAIN, WORM, MEASURED modes) -- for now, origins default to the host platform position.

The rendering layer follows the same pattern as `TemporalTrackLayer` and `PositionSymbolsLayer` -- a React component that wraps a Leaflet layer, receiving `currentTime` and `displayMode` as props from MapView.

## Key Decisions

- **Canvas rendering, not SVG**: A single canvas layer draws all bearing lines, avoiding DOM overhead. With 500+ contacts per sensor, creating individual React elements would not scale.
- **Geodesic bearing calculations**: Lines use haversine destination formulas rather than projected coordinates, so bearings remain accurate at all latitudes.
- **Origin interpolation**: The host platform position is linearly interpolated at each contact's timestamp using binary search on the track's positions array. This produces smooth, accurate origins even when fix intervals are sparse.
- **No new dependencies**: Everything is built on existing Leaflet and react-leaflet primitives.
- **Display property fallbacks**: The rendering layer reads display properties (colour, line style, label position) from the schema when available, falling back to sensible defaults inherited from the host track.
