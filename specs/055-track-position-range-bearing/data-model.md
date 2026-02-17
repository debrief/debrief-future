# Data Model: Track-Position to Track Range/Bearing

**Feature**: 055-track-position-range-bearing | **Date**: 2026-02-17

## Entities

### Tool Input (FeatureCollection)

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| `features` | `Feature[]` | Yes | — | Exactly 2 track features |
| `properties.tool.params.selected_position_index` | `integer` | Yes | — | Index into features[0]'s coordinates/times arrays, must be >= 0 and < length |

### Track Feature (Input)

Both features must be GeoJSON Features with LineString geometry and timestamped positions.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique feature identifier (e.g., `track-alpha`) |
| `type` | `"Feature"` | Yes | GeoJSON type |
| `geometry.type` | `"LineString"` | Yes | Track geometry type |
| `geometry.coordinates` | `[lon, lat][]` | Yes | Array of coordinate pairs |
| `properties.times` | `integer[]` | Yes | Epoch millisecond timestamps, same length as coordinates |
| `properties.debrief:kind` | `"TRACK"` | Yes | Feature kind |
| `properties.name` | `string` | No | Human-readable track name |

### Selected Position (Resolved)

The position resolved from `features[0]` at `selected_position_index`.

| Field | Type | Description |
|-------|------|-------------|
| `coordinates` | `[lon, lat]` | Coordinates from `features[0].geometry.coordinates[index]` |
| `time` | `integer` | Timestamp from `features[0].properties.times[index]` |
| `track_id` | `string` | From `features[0].id` |
| `position_index` | `integer` | The selected position index |

### Temporal Match (Intermediate Computation)

The position on the second track with the smallest absolute time difference.

| Field | Type | Description |
|-------|------|-------------|
| `matched_index` | `integer` | Index of the matched position in features[1] |
| `matched_coordinates` | `[lon, lat]` | Coordinates from `features[1].geometry.coordinates[matched_index]` |
| `matched_time` | `integer` | Timestamp from `features[1].properties.times[matched_index]` |
| `time_delta_ms` | `integer` | Absolute time difference in milliseconds |

### Measurement Result (Output)

| Field | Type | Description |
|-------|------|-------------|
| `range_nm` | `float` | Great-circle distance in nautical miles, rounded to 2 decimal places |
| `bearing_deg` | `float` | Initial bearing in degrees (0-360), rounded to 1 decimal place |
| `selected_track` | `string` | ID of the first track (source of selected position) |
| `selected_position_index` | `integer` | Index of the selected position |
| `selected_time` | `integer` | Timestamp of the selected position (epoch ms) |
| `selected_coordinates` | `[lon, lat]` | Coordinates of the selected position |
| `matched_track` | `string` | ID of the second track (source of matched position) |
| `matched_position_index` | `integer` | Index of the matched position |
| `matched_time` | `integer` | Timestamp of the matched position (epoch ms) |
| `matched_coordinates` | `[lon, lat]` | Coordinates of the matched position |
| `time_delta_ms` | `integer` | Absolute time difference in milliseconds |

### ToolResponse (Output)

| Field | Type | Description |
|-------|------|-------------|
| `content` | `ContentItem[]` | Exactly one measurement content item |

### ContentItem (Output)

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"resource"` | MCP content type |
| `uri` | `string` | `feature://measurement-position-range-bearing-{id}` |
| `mimeType` | `"application/json"` | JSON MIME type (not GeoJSON — this is a scalar measurement) |
| `text` | `string` | Serialised Measurement Result |
| `annotations.debrief:resultType` | `string` | `artifact/measurement/position_range_bearing` |
| `annotations.debrief:sourceFeatures` | `string[]` | `[features[0].id, features[1].id]` |
| `annotations.debrief:label` | `string` | e.g., "Range 3.67 nm, bearing 032.8° from track-alpha/positions/4 to track-bravo/positions/2" |

## Relationships

```
FeatureCollection ─── features[0] ───► Track Feature (selected track)
                                            │
                      selected_position_index
                                            │
                                            ▼
                                     Selected Position
                                     (coordinates, time)
                                            │
                                            │
FeatureCollection ─── features[1] ───► Track Feature (second track)
                                            │
                              find_closest_in_time()
                                            │
                                            ▼
                                     Temporal Match
                                     (matched_index, matched_coordinates, matched_time)
                                            │
                                            │
               ┌────────────────────────────┤
               ▼                            ▼
        haversine_distance()        initial_bearing()
               │                            │
               ▼                            ▼
          range_nm                    bearing_deg
               │                            │
               └────────────┬───────────────┘
                            ▼
                    Measurement Result
                            │
                            ▼
                      ContentItem
                   (in ToolResponse)
```

## State Transitions

This tool has no persistent state. It is a pure computation:

```
Input FeatureCollection + selected_position_index → Measurement Result (wrapped in ToolResponse)
```

No STAC catalog writes. No session state changes. The caller (frontend or log service) is responsible for displaying or persisting the measurement.

## Validation Rules

1. `features` must be a valid GeoJSON FeatureCollection
2. `features.features` must contain exactly 2 features
3. Both features must have `geometry.type == "LineString"`
4. Both features must have `properties.times` as a non-empty integer array
5. `properties.times` length must equal `geometry.coordinates` length for both features
6. `selected_position_index` must be >= 0 and < length of features[0]'s coordinates array
7. Both features must have a non-empty `id` property
