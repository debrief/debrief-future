# Data Model: Move Track Tool (#079)

**Date**: 2026-03-06

## Entities

### Input: Track Feature (GeoJSON)

```
Feature {
  id: string                          // Feature ID (preserved in output)
  type: "Feature"
  geometry: {
    type: "LineString" | "MultiLineString"
    coordinates: [lon, lat, alt?, timestamp_ms?][]  // LineString
                 | [lon, lat, alt?, timestamp_ms?][][] // MultiLineString
  }
  properties: {
    kind: "TRACK"                     // Required — tool filters on this
    name: string                      // Track name
    positions: PositionRecord[]       // Per-position metadata (optional)
    ...                               // Other properties preserved unchanged
  }
}
```

### Output: Moved Track Feature (GeoJSON)

Structurally identical to input. Only `geometry.coordinates` lon/lat values change. All other properties, altitude, and timestamp values are preserved bit-identical.

```
Feature {
  id: string                          // Same as input (mutation tracking)
  type: "Feature"
  geometry: {
    type: "LineString" | "MultiLineString"  // Same as input
    coordinates: [lon', lat', alt, timestamp_ms][]  // Translated lon/lat
  }
  properties: {
    kind: "TRACK"                     // Unchanged
    ...                               // All properties unchanged
  }
}
```

### Tool Parameters

| Parameter | Type | Default | Constraints | Description |
|-----------|------|---------|-------------|-------------|
| `direction` | number | 90 | Normalised to [0, 360) | Compass bearing in degrees (0=N, 90=E) |
| `range_nm` | number | 5 | Must be >= 0 | Offset distance in nautical miles |

### Result Metadata

| Field | Value |
|-------|-------|
| Result type | `mutation/track/moved` |
| Source features | Input feature IDs |
| Label format | `"Moved {n} track(s) {range_nm} nm bearing {direction:03d}°"` |

## Algorithm (Pseudocode)

```
FUNCTION move_track(context, params):
    direction = params["direction"] mod 360
    range_nm = params["range_nm"]

    IF range_nm < 0:
        ERROR "Distance must be non-negative"

    tracks = FILTER context.features WHERE kind == "TRACK"

    IF tracks IS EMPTY:
        ERROR "No track features found in input"

    IF range_nm == 0:
        RETURN tracks unchanged (no-op)

    distance_km = range_nm * 1.852

    FOR EACH track IN tracks:
        IF geometry.type == "LineString":
            translate_coords(geometry.coordinates, direction, distance_km)
        ELSE IF geometry.type == "MultiLineString":
            FOR EACH segment IN geometry.coordinates:
                translate_coords(segment, direction, distance_km)

    RETURN tracks

FUNCTION translate_coords(coords, bearing, distance_km):
    FOR EACH coord IN coords:
        (new_lat, new_lon) = vincenty_destination(coord[1], coord[0], bearing, distance_km)
        coord[0] = new_lon
        coord[1] = new_lat
        // coord[2] (alt) and coord[3] (timestamp) unchanged
```

## Error Conditions

| Condition | Error Message |
|-----------|---------------|
| No track features | "No track features found in input" |
| Negative distance | "Distance must be non-negative" |
| Empty feature collection | "No track features found in input" |
