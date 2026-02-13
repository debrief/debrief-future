---
name: generate-courses-speeds
version: 1.0
category: track/manipulation
status: draft
created: 2026-02-13
---

# Generate Courses and Speeds

> Derives course (bearing) and speed (knots) for each position in a track from consecutive position pairs using great-circle math.

## MCP

**Description**: Calculates course (initial bearing in degrees) and speed (knots) between consecutive track positions using Haversine distance and great-circle bearing formulas. Writes derived values into each position's metadata, overriding any existing values.

**When to use**: When an analyst needs navigational data (heading and speed) for a track whose positions lack course/speed values, or when existing values need recalculating from the geometry.

**Parameters**: None — operates directly on the selected track feature(s).

**Returns**: Mutation ToolResponse with enriched track feature(s) containing course and speed at every position.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature`

**Constraints**:
- FeatureCollection must contain at least one feature with `kind: TRACK`
- Each track must have a `positions` array with `time` (ISO8601) for each entry
- Coordinates are read from `geometry.coordinates[i]` (NOT from positions — per schema contract)
- Position count must match coordinate count (index-aligned)

**Defaults**: None — no parameters.

## Outputs

Tools return a **ToolResponse** containing one or more content items with Debrief annotations.

**Response Schema**: `specs/041-document-tool-results/data-model.md#ToolResponse`

### Result Type Path

**Format**: `{top_type}/{domain}/{specific_type}`

The `result_subtype` used in builder functions is `track/courses_speeds`.

### Annotations

Required on each content item:
- `debrief:resultType`: `mutation/track/courses_speeds`
- `debrief:sourceFeatures`: Array of input track feature IDs
- `debrief:label`: Human-readable description, e.g. "Generated courses and speeds for 5 position(s)"

## Algorithm

```pseudocode
FUNCTION generate_courses_speeds(input: FeatureCollection) -> ToolResponse:
    // Validate inputs
    IF input IS NULL OR input.features IS EMPTY:
        RETURN build_error("No track features found in input", "invalid_input", [])
    END IF

    modified_features = empty list
    source_ids = empty list

    FOR EACH feature IN input.features:
        kind = feature.properties.kind
        IF kind != "TRACK":
            CONTINUE
        END IF

        source_ids.append(feature.id)
        coords = feature.geometry.coordinates    // [lon, lat] pairs
        positions = feature.properties.positions  // TimestampedPosition array
        N = LENGTH(positions)

        // Single-position track: return unchanged
        IF N <= 1:
            modified_features.append(feature)
            CONTINUE
        END IF

        // Phase 1: Compute course and speed for legs 0..N-2
        FOR i = 0 TO N - 2:
            lon1 = coords[i][0]
            lat1 = coords[i][1]
            lon2 = coords[i + 1][0]
            lat2 = coords[i + 1][1]

            distance_nm = haversine_distance(lon1, lat1, lon2, lat2)
            bearing = initial_bearing(lon1, lat1, lon2, lat2)

            // Parse timestamps and compute elapsed time
            time1 = parse_iso8601(positions[i].time)
            time2 = parse_iso8601(positions[i + 1].time)
            elapsed_seconds = time2 - time1

            // Handle zero distance (stationary vessel)
            IF distance_nm == 0:
                positions[i].course = 0
                positions[i].speed = 0
            ELSE IF elapsed_seconds <= 0:
                // Zero or negative time: compute bearing, set speed to 0
                positions[i].course = bearing
                positions[i].speed = 0
            ELSE:
                elapsed_hours = elapsed_seconds / 3600
                positions[i].course = bearing
                positions[i].speed = distance_nm / elapsed_hours
            END IF
        END FOR

        // Phase 2: Last position carries forward from penultimate leg
        positions[N - 1].course = positions[N - 2].course
        positions[N - 1].speed = positions[N - 2].speed

        modified_features.append(feature)
    END FOR

    IF modified_features IS EMPTY:
        RETURN build_error("No track features found in input", "invalid_input", [])
    END IF

    content_items = build_mutation(
        features: modified_features,
        result_subtype: "track/courses_speeds",
        source_feature_ids: source_ids,
        label: "Generated courses and speeds for " + LENGTH(positions) + " position(s)"
    )

    RETURN build_response(content_items)
END FUNCTION

FUNCTION haversine_distance(lon1: Number, lat1: Number, lon2: Number, lat2: Number) -> Number:
    // Convert degrees to radians
    lon1_r = radians(lon1)
    lat1_r = radians(lat1)
    lon2_r = radians(lon2)
    lat2_r = radians(lat2)

    dlon = lon2_r - lon1_r
    dlat = lat2_r - lat1_r

    a = sin(dlat / 2) ^ 2 + cos(lat1_r) * cos(lat2_r) * sin(dlon / 2) ^ 2
    c = 2 * asin(sqrt(a))

    // Earth radius in nautical miles
    RETURN c * 3440.065
END FUNCTION

FUNCTION initial_bearing(lon1: Number, lat1: Number, lon2: Number, lat2: Number) -> Number:
    lon1_r = radians(lon1)
    lat1_r = radians(lat1)
    lon2_r = radians(lon2)
    lat2_r = radians(lat2)

    dlon = lon2_r - lon1_r
    x = sin(dlon) * cos(lat2_r)
    y = cos(lat1_r) * sin(lat2_r) - sin(lat1_r) * cos(lat2_r) * cos(dlon)
    bearing_deg = degrees(atan2(x, y))

    // Normalise to [0, 360)
    RETURN (bearing_deg + 360) mod 360
END FUNCTION
```

### Response Builder Functions

| Function | Result Type | Use When |
|----------|-------------|----------|
| `build_mutation(features, subtype, sources, label)` | `mutation/*` | Modifying existing features |
| `build_error(message, category, affected_ids)` | Error | Reporting failures |

### Complexity

- **Time**: O(n) where n = number of positions
- **Space**: O(1) — mutation in place, no auxiliary data structures

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Return error with `invalid_input` category: "No track features found in input" |
| No TRACK kind features | Return error with `invalid_input` category: "No track features found in input" |
| Single-position track | Return track unchanged (no course/speed written); include in result |
| Two-position track | Compute for position 0; position 1 carries forward same values |
| Stationary vessel (zero distance) | Set course=0, speed=0 for that leg |
| Zero time interval (identical timestamps) | Compute bearing normally, set speed=0 |
| Negative time interval (out-of-order timestamps) | Compute bearing normally, set speed=0 |
| Existing course/speed values | Override with freshly computed values |
| Antimeridian crossing | Handled by atan2 in bearing formula; no special handling needed |
| Near-polar positions | Bearing formula handles correctly; longitude convergence is expected |
| Mixed TRACK and non-TRACK features | Process only TRACK features; skip others silently |

## Examples

### Golden Example Files

- Input: `generate-courses-speeds.basic.input.json` — 3-position track with existing course/speed (values 999 to show override clearly)
- Output: `generate-courses-speeds.basic.output.json` — ToolResponse with computed course ~32.67°/~32.61° and speed ~7.14/~7.13 knots
- Input: `generate-courses-speeds.edge.input.json` — Single-position track
- Output: `generate-courses-speeds.edge.output.json` — Track returned unchanged

## Changelog

### 1.0 (2026-02-13)
- Initial release
- Derives course (bearing) and speed (knots) from consecutive track positions
- Uses Haversine distance and great-circle initial bearing formulas
- Handles edge cases: single position, stationary vessel, zero time interval
- Overrides existing course/speed values

## References

**Related Tools**:
- [interpolate-track](./interpolate-track.1.0.md) — Interpolates positions at regular time intervals (another track manipulation tool)

**Schemas**:
- [TimestampedPosition](../../schemas/src/linkml/common.yaml) — `course` (degrees, 0-360) and `speed` (knots) fields
- [TrackFeature](../../schemas/src/linkml/geojson.yaml) — Track feature with LineString geometry and positions array

**Template**:
- [TEMPLATE.md](../TEMPLATE.md) — Tool specification template

**Math Reference**:
- [range_bearing.py](../../../../services/calc/debrief_calc/tools/range_bearing.py) — `_calculate_bearing` and `_calculate_range` functions
- [track_stats.py](../../../../services/calc/debrief_calc/tools/track_stats.py) — `_haversine_distance` function

**External**:
- [Haversine formula](https://en.wikipedia.org/wiki/Haversine_formula) — great-circle distance between two points on a sphere
- [Forward azimuth](https://en.wikipedia.org/wiki/Great-circle_navigation#Course) — initial bearing for great-circle navigation
- Earth radius: 3440.065 nautical miles (6371.0 km)
