---
name: bearing-rate-calc
version: 1.0
category: track/measurement
status: draft
created: 2026-02-07
migrated_from: Debrief.Tools.Tote.Calculations.bearingRateCalc
---

# Bearing Rate Calculator

> Calculates the rate of change of bearing (bearing rate / bDot) between ownship and target tracks in degrees per minute.

## MCP

**Description**: Computes the instantaneous rate of change of bearing between an ownship and target track at a given time. Uses the courses and speeds of both tracks plus their geometric relationship (bearing and range) to derive the analytical bearing rate. Result is expressed as an absolute value with a Left/Right direction indicator.

**When to use**: When the user needs bearing rate for target motion analysis (TMA), passive sonar tracking, or torpedo fire-control solutions. Bearing rate indicates how quickly the line of sight to the target is rotating. A high bearing rate at close range suggests a crossing target; a near-zero bearing rate may indicate a constant-bearing decreasing-range (CBDR) collision situation.

**Parameters**:
- `features`: FeatureCollection containing exactly two track features (ownship and target)
- `time`: ISO 8601 timestamp at which to evaluate

**Returns**: ToolResponse containing a measurement Feature with bearing rate value (deg/min), direction (Left/Right), and supporting intermediate values.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature`

**Constraints**:
- Exactly two track features required: `features[0]` = ownship, `features[1]` = target
- Both features must have `properties.kind == "TRACK"`
- Both tracks must have at least one position at or interpolatable to the requested time
- Each position must include `course` (degrees), `speed` (knots), and `coordinates` (lon, lat)
- Range between tracks must be non-zero at the requested time

**Defaults**:
- None (all parameters required)

## Outputs

Returns a **ToolResponse** with artifact content items.

**Response Schema**: `specs/041-document-tool-results/data-model.md#ArtifactResult`

**Result Type**: `artifact/measurement/bearing_rate`

**Content Items**: One measurement Feature containing:
- `type`: `"resource"`
- `uri`: `feature://{measurement_id}`
- `mimeType`: `"application/geo+json"`
- `text`: Serialized GeoJSON Feature with measurement properties

**Annotations** (on each content item):
- `debrief:resultType`: `"artifact/measurement/bearing_rate"`
- `debrief:sourceFeatures`: `["track-ownship", "track-target"]`
- `debrief:label`: `"Bearing rate: {value} deg/min {direction}"`

### Measurement Feature Properties

| Property | Type | Description |
|----------|------|-------------|
| `kind` | string | Always `"MEASUREMENT"` |
| `measurement_type` | string | Always `"bearing_rate"` |
| `value` | number | Absolute value of bearing rate in deg/min |
| `units` | string | Always `"deg/min"` |
| `direction` | string | `"Left"` (bearing decreasing) or `"Right"` (bearing increasing) |
| `signed_value` | number | Signed bearing rate: negative = Left, positive = Right |
| `range_yards` | number | Range between tracks in yards |
| `bearing` | number | Absolute bearing from ownship to target in degrees |
| `time` | string | ISO 8601 timestamp of the measurement |
| `source_tracks` | array | IDs of the source track features |

## Algorithm

### Overview

The bearing rate (bDot) is computed analytically from the geometry and kinematics of both tracks. The method resolves each track's velocity into components along and across the line of bearing, then computes the angular rate from the cross-range speed components and the range.

### Pseudocode

```pseudocode
FUNCTION bearing_rate_calc(input: FeatureCollection, params: BearingRateParams) -> ToolResponse:
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

    // Validate tracks
    IF ownship.properties.kind != "TRACK" OR target.properties.kind != "TRACK":
        RETURN build_error("Both features must be track features", "invalid_input", [ownship.id, target.id])
    END IF

    // Get positions at requested time
    own_pos = get_position_at_time(ownship, time)
    tgt_pos = get_position_at_time(target, time)

    IF own_pos IS NULL OR tgt_pos IS NULL:
        RETURN build_error("Track does not cover requested time", "invalid_input", [])
    END IF

    // Step 1: Compute bearing and range from ownship to target
    brg_deg = geodetic_bearing(own_pos.coordinates, tgt_pos.coordinates)
    brg_rad = RADIANS(brg_deg)
    range_deg = geodetic_range_degrees(own_pos.coordinates, tgt_pos.coordinates)
    range_yards = range_deg * 60.0 * 2025.37  // Degs2Yds: 1 deg = 60 nm, 1 nm = 2025.37 yds

    // Step 2: Check for zero range
    IF range_yards < 1.0:
        RETURN build_error(
            "Range between tracks is zero; bearing rate is undefined (division by zero)",
            "computation_error",
            [ownship.id, target.id]
        )
    END IF

    // Step 3: Extract course and speed for both tracks
    oCrse = RADIANS(own_pos.course)   // ownship course in radians
    oSpd = own_pos.speed               // ownship speed in knots
    tCrse = RADIANS(tgt_pos.course)   // target course in radians
    tSpd = tgt_pos.speed               // target speed in knots

    // Step 4: Compute relative angles
    relBrg = brg_rad - oCrse            // relative bearing (ownship frame)
    ATB = brg_rad - PI - tCrse          // angle-to-bow component (target frame)

    // Step 5: Compute speed-across components
    TSA = tSpd * SIN(ATB)               // Target Speed Across
    OSA = oSpd * SIN(relBrg)            // Own Speed Across
    RSA = TSA + OSA                     // Resultant Speed Across

    // Step 6: Compute bearing rate (bDot)
    // Formula: bDot = (6080 / PI) * RSA / range_yards
    // where 6080 = feet per nautical mile, used as conversion factor
    bDot = (6080.0 / PI) * RSA / range_yards   // result in deg/min

    // Step 7: Determine direction
    IF bDot < 0:
        direction = "Left"
    ELSE:
        direction = "Right"
    END IF

    // Build measurement feature
    measurement = build_measurement_feature(
        id: generate_id("measurement-bearing-rate"),
        geometry: Point(own_pos.coordinates),
        measurement_type: "bearing_rate",
        value: ABS(bDot),
        units: "deg/min",
        direction: direction,
        signed_value: bDot,
        range_yards: range_yards,
        bearing: brg_deg,
        time: time,
        source_tracks: [ownship.id, target.id]
    )

    content_items = build_artifact(
        data: measurement,
        mime: "application/geo+json",
        result_subtype: "measurement/bearing_rate",
        source_feature_ids: [ownship.id, target.id],
        label: "Bearing rate: " + ROUND(ABS(bDot), 4) + " deg/min " + direction
    )

    RETURN build_response(content_items)
END FUNCTION

FUNCTION geodetic_range_degrees(from_lonlat: [number, number], to_lonlat: [number, number]) -> number:
    // Great-circle distance in degrees
    lat1 = RADIANS(from_lonlat[1])
    lon1 = RADIANS(from_lonlat[0])
    lat2 = RADIANS(to_lonlat[1])
    lon2 = RADIANS(to_lonlat[0])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = SIN(dlat/2)^2 + COS(lat1) * COS(lat2) * SIN(dlon/2)^2
    c = 2 * ASIN(SQRT(a))
    RETURN DEGREES(c)
END FUNCTION
```

### Key Constants

| Constant | Value | Usage |
|----------|-------|-------|
| Degs2Yds multiplier | `60 * 2025.37` | Convert degrees of arc to yards (1 deg = 60 nm, 1 nm = 2025.37 yds) |
| bDot conversion | `6080 / PI` | Convert resultant speed across to angular rate in deg/min |

### Complexity

- **Time**: O(n) where n is the number of positions (for time interpolation lookup)
- **Space**: O(1) - constant space for a single measurement result

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Return error: `invalid_input`, "Input requires at least two track features" |
| Single track only | Return error: `invalid_input`, "Input requires at least two track features" |
| Non-track feature in input | Return error: `invalid_input`, "Both features must be track features" |
| Co-located tracks (zero range) | Return error: `computation_error`, "Range is zero; bearing rate undefined" |
| Range < 1 yard | Return error: `computation_error` (numerical instability threshold) |
| Parallel tracks (same course, same speed) | bDot approaches 0 as tracks converge to parallel |
| Reciprocal courses (head-on) | Large bearing rate; direction depends on offset geometry |
| Both tracks stationary (speed = 0) | bDot = 0, direction = "Right" (convention for zero) |
| Exactly zero bDot | Report as 0.0 deg/min Right (CBDR warning condition) |
| Time outside track coverage | Return error: `invalid_input`, "Track does not cover requested time" |

## Examples

### Basic Usage

**Input**: `bearing-rate-calc.basic.input.json`
**Output**: `bearing-rate-calc.basic.output.json`

Description: Ownship heading NE at 12 kts, target heading south at 8 kts, evaluated at T10:30. Range is approximately 3.57 nm. Bearing rate is approximately 0.4731 deg/min Right, indicating the bearing is slowly opening to the right.

### Edge Case: Co-located Tracks

**Input**: `bearing-rate-calc.edge.input.json`
**Output**: `bearing-rate-calc.edge.output.json`

Description: Both tracks at the same position (zero range). The bearing rate formula requires division by range, so the tool returns a computation error.

### Complex: Closer Range at T10:35

**Input**: `bearing-rate-calc.complex.input.json`
**Output**: `bearing-rate-calc.complex.output.json`

Description: Full 3-position tracks evaluated at T10:35 when the tracks are much closer (approximately 1.30 nm). The reduced range causes a significantly higher bearing rate of approximately 7.8641 deg/min Right, demonstrating the inverse-range relationship.

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Analytical bearing rate from course, speed, bearing, and range
- Left/Right direction indicator with absolute value display

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_artifact()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for result annotations

**Related Tools**:
- [rel-bearing-calc](./rel-bearing-calc.1.0.md) - Relative bearing (used as input component)
- [atb-calc](./atb-calc.1.0.md) - Angle-to-bow (used as input component)

**Input Schemas**:
- [TrackFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON track feature definition

**Legacy**:
- Debrief 3.x: `Debrief.Tools.Tote.Calculations.bearingRateCalc`
