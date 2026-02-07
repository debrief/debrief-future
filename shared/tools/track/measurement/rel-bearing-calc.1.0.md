---
name: rel-bearing-calc
version: 1.0
category: track/measurement
status: draft
created: 2026-02-07
migrated_from: Debrief.Tools.Tote.Calculations.relBearingCalc
---

# Relative Bearing Calculator

> Calculates the relative bearing from ownship to a target track at a given time.

## MCP

**Description**: Computes the relative bearing between an ownship track and a target track. The relative bearing is the angle between the ownship's heading (course) and the line-of-sight bearing to the target, expressed in either UK (-180 to +180) or US (0 to 360) format.

**When to use**: When the user needs to know where a target is relative to the ownship's heading. Common in tactical picture analysis, target designation, and situational awareness displays. Requires two tracks with overlapping time coverage.

**Parameters**:
- `features`: FeatureCollection containing exactly two track features (ownship and target)
- `format`: Bearing convention - `"UK"` for -180..+180 or `"US"` for 0..360 (default: `"UK"`)
- `time`: ISO 8601 timestamp at which to evaluate the bearing

**Returns**: ToolResponse containing a measurement Feature with the computed relative bearing value, units, and format indicator.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature`

**Constraints**:
- Exactly two track features required: `features[0]` = ownship, `features[1]` = target
- Both features must have `properties.kind == "TRACK"`
- Both tracks must have at least one position at or interpolatable to the requested time
- Each position must include `course` (degrees, 0-360) and `coordinates` (lon, lat)
- `format` must be `"UK"` or `"US"`

**Defaults**:
- `format`: `"UK"` (green relative, -180 to +180)

## Outputs

Returns a **ToolResponse** with artifact content items.

**Response Schema**: `specs/041-document-tool-results/data-model.md#ArtifactResult`

**Result Type**: `artifact/measurement/relative_bearing`

**Content Items**: One measurement Feature containing:
- `type`: `"resource"`
- `uri`: `feature://{measurement_id}`
- `mimeType`: `"application/geo+json"`
- `text`: Serialized GeoJSON Feature with measurement properties

**Annotations** (on each content item):
- `debrief:resultType`: `"artifact/measurement/relative_bearing"`
- `debrief:sourceFeatures`: `["track-ownship", "track-target"]`
- `debrief:label`: `"Relative bearing: {value} deg ({format}) from ownship to target"`

### Measurement Feature Properties

| Property | Type | Description |
|----------|------|-------------|
| `kind` | string | Always `"MEASUREMENT"` |
| `measurement_type` | string | Always `"relative_bearing"` |
| `value` | number | The relative bearing in degrees |
| `units` | string | Always `"degrees"` |
| `format` | string | `"UK"` or `"US"` |
| `absolute_bearing` | number | The absolute bearing from ownship to target (0-360) |
| `ownship_course` | number | The ownship course at measurement time (0-360) |
| `time` | string | ISO 8601 timestamp of the measurement |
| `source_tracks` | array | IDs of the source track features |

## Algorithm

```pseudocode
FUNCTION rel_bearing_calc(input: FeatureCollection, params: RelBearingParams) -> ToolResponse:
    // Validate inputs
    IF input IS NULL OR input.features IS EMPTY:
        RETURN build_error("Input requires at least two track features (ownship and target)", "invalid_input", [])
    END IF

    IF LENGTH(input.features) < 2:
        RETURN build_error("Input requires at least two track features (ownship and target)", "invalid_input", [])
    END IF

    ownship = input.features[0]
    target = input.features[1]
    time = params.time
    format = params.format OR "UK"

    // Validate tracks
    IF ownship.properties.kind != "TRACK" OR target.properties.kind != "TRACK":
        RETURN build_error("Both features must be track features", "invalid_input", [ownship.id, target.id])
    END IF

    // Get positions at requested time (interpolate if necessary)
    own_pos = get_position_at_time(ownship, time)
    tgt_pos = get_position_at_time(target, time)

    IF own_pos IS NULL OR tgt_pos IS NULL:
        RETURN build_error("Track does not cover requested time", "invalid_input", [])
    END IF

    // Check for co-located tracks
    IF own_pos.coordinates == tgt_pos.coordinates:
        RETURN build_error("Tracks are co-located at requested time; bearing is undefined", "computation_error", [ownship.id, target.id])
    END IF

    // Step 1: Compute absolute bearing from ownship to target
    absolute_bearing = geodetic_bearing(own_pos.coordinates, tgt_pos.coordinates)
    // Result is in degrees, 0-360 (clockwise from north)

    // Step 2: Get ownship course in degrees
    own_course = own_pos.course  // degrees, 0-360

    // Step 3: Compute relative bearing
    rel_bearing = absolute_bearing - own_course

    // Step 4: Normalize to selected format
    IF format == "UK":
        // Normalize to -180..+180
        WHILE rel_bearing > 180:
            rel_bearing = rel_bearing - 360
        END WHILE
        WHILE rel_bearing < -180:
            rel_bearing = rel_bearing + 360
        END WHILE
    ELSE IF format == "US":
        // Normalize to 0..360
        WHILE rel_bearing < 0:
            rel_bearing = rel_bearing + 360
        END WHILE
        WHILE rel_bearing >= 360:
            rel_bearing = rel_bearing - 360
        END WHILE
    END IF

    // Build measurement feature
    measurement = build_measurement_feature(
        id: generate_id("measurement-rel-bearing"),
        geometry: Point(own_pos.coordinates),
        measurement_type: "relative_bearing",
        value: rel_bearing,
        units: "degrees",
        format: format,
        absolute_bearing: absolute_bearing,
        ownship_course: own_course,
        time: time,
        source_tracks: [ownship.id, target.id]
    )

    // Build artifact response
    content_items = build_artifact(
        data: measurement,
        mime: "application/geo+json",
        result_subtype: "measurement/relative_bearing",
        source_feature_ids: [ownship.id, target.id],
        label: "Relative bearing: " + ROUND(rel_bearing, 2) + " deg (" + format + ") from ownship to target"
    )

    RETURN build_response(content_items)
END FUNCTION

FUNCTION geodetic_bearing(from_lonlat: [number, number], to_lonlat: [number, number]) -> number:
    // Initial bearing on great circle from point A to point B
    lat1 = RADIANS(from_lonlat[1])
    lon1 = RADIANS(from_lonlat[0])
    lat2 = RADIANS(to_lonlat[1])
    lon2 = RADIANS(to_lonlat[0])

    dlon = lon2 - lon1
    x = SIN(dlon) * COS(lat2)
    y = COS(lat1) * SIN(lat2) - SIN(lat1) * COS(lat2) * COS(dlon)
    bearing_rad = ATAN2(x, y)
    bearing_deg = DEGREES(bearing_rad)

    IF bearing_deg < 0:
        bearing_deg = bearing_deg + 360
    END IF

    RETURN bearing_deg
END FUNCTION
```

### Complexity

- **Time**: O(n) where n is the number of positions (for time interpolation lookup)
- **Space**: O(1) - constant space for a single measurement result

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Return error: `invalid_input`, "Input requires at least two track features" |
| Single track feature only | Return error: `invalid_input`, "Input requires at least two track features" |
| Non-track feature in input | Return error: `invalid_input`, "Both features must be track features" |
| Co-located tracks (zero range) | Return error: `computation_error`, "Tracks are co-located; bearing is undefined" |
| Time outside track coverage | Return error: `invalid_input`, "Track does not cover requested time" |
| Ownship course is 0 (due North) | Relative bearing equals absolute bearing |
| Target directly ahead (rel bearing = 0) | Return 0 in both UK and US formats |
| Target directly astern (rel bearing = 180) | UK: +180; US: 180 |
| Result exactly at -180 boundary | UK: normalize to +180 (avoid ambiguous -180) |
| Missing `format` parameter | Default to UK format |

## Examples

### Basic Usage (UK Format)

**Input**: `rel-bearing-calc.basic.input.json`
**Output**: `rel-bearing-calc.basic.output.json`

Description: Two tracks at T10:30 - ownship heading NE (045) with target bearing approximately 033 from ownship. Relative bearing in UK format is approximately -12.30 degrees (target is slightly left of bow).

### Edge Case: Empty Input

**Input**: `rel-bearing-calc.edge.input.json`
**Output**: `rel-bearing-calc.edge.output.json`

Description: Empty feature collection produces an error response indicating two tracks are required.

### Complex: US Format with Multi-Position Tracks

**Input**: `rel-bearing-calc.complex.input.json`
**Output**: `rel-bearing-calc.complex.output.json`

Description: Full 3-position tracks evaluated at T10:30 using US bearing convention (0-360). The same geometry yields approximately 347.70 degrees US format.

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Supports UK (-180..+180) and US (0..360) bearing formats
- Uses geodetic (great-circle) bearing computation

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_artifact()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for result annotations

**Related Tools**:
- [atb-calc](./atb-calc.1.0.md) - Angle-to-bow (same algorithm with primary/secondary swapped)
- [bearing-rate-calc](./bearing-rate-calc.1.0.md) - Rate of change of bearing

**Input Schemas**:
- [TrackFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON track feature definition

**Legacy**:
- Debrief 3.x: `Debrief.Tools.Tote.Calculations.relBearingCalc`
