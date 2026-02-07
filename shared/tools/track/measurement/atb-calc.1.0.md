---
name: atb-calc
version: 1.0
category: track/measurement
status: draft
created: 2026-02-07
migrated_from: Debrief.Tools.Tote.Calculations.atbCalc
---

# Angle to Bow Calculator

> Calculates the angle-to-bow (ATB) from the target's perspective, showing how the target is oriented relative to the ownship-to-target line of bearing.

## MCP

**Description**: Computes the angle-to-bow between an ownship and target track. ATB is the relative bearing computed from the target's perspective: the angle between the target's heading and the bearing from target back to ownship. This is equivalent to `rel-bearing-calc` with primary and secondary tracks swapped in the bearing computation, using the target's course instead of ownship's.

**When to use**: When the user needs to understand the target's aspect (how the target is oriented relative to the observer). ATB is used in torpedo firing solutions, sonar classification, and visual identification. A zero ATB means the target is bow-on; 180 means stern-on.

**Parameters**:
- `features`: FeatureCollection containing exactly two track features (ownship and target)
- `format`: Bearing convention - `"UK"` for -180..+180 or `"US"` for 0..360 (default: `"UK"`)
- `time`: ISO 8601 timestamp at which to evaluate

**Returns**: ToolResponse containing a measurement Feature with the computed angle-to-bow value.

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

**Result Type**: `artifact/measurement/angle_to_bow`

**Content Items**: One measurement Feature containing:
- `type`: `"resource"`
- `uri`: `feature://{measurement_id}`
- `mimeType`: `"application/geo+json"`
- `text`: Serialized GeoJSON Feature with measurement properties

**Annotations** (on each content item):
- `debrief:resultType`: `"artifact/measurement/angle_to_bow"`
- `debrief:sourceFeatures`: `["track-ownship", "track-target"]`
- `debrief:label`: `"Angle to bow: {value} deg ({format}) from target perspective"`

### Measurement Feature Properties

| Property | Type | Description |
|----------|------|-------------|
| `kind` | string | Always `"MEASUREMENT"` |
| `measurement_type` | string | Always `"angle_to_bow"` |
| `value` | number | The angle-to-bow in degrees |
| `units` | string | Always `"degrees"` |
| `format` | string | `"UK"` or `"US"` |
| `bearing_target_to_ownship` | number | Absolute bearing from target to ownship (0-360) |
| `target_course` | number | The target's course at measurement time (0-360) |
| `time` | string | ISO 8601 timestamp of the measurement |
| `source_tracks` | array | IDs of the source track features |

## Algorithm

```pseudocode
FUNCTION atb_calc(input: FeatureCollection, params: ATBParams) -> ToolResponse:
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

    // Get positions at requested time
    own_pos = get_position_at_time(ownship, time)
    tgt_pos = get_position_at_time(target, time)

    IF own_pos IS NULL OR tgt_pos IS NULL:
        RETURN build_error("Track does not cover requested time", "invalid_input", [])
    END IF

    // Check for co-located tracks
    IF own_pos.coordinates == tgt_pos.coordinates:
        RETURN build_error("Tracks are co-located at requested time; bearing is undefined", "computation_error", [ownship.id, target.id])
    END IF

    // KEY DIFFERENCE FROM rel-bearing-calc:
    // ATB swaps primary/secondary - compute bearing FROM target TO ownship
    // and subtract the TARGET's course (not ownship's)

    // Step 1: Compute absolute bearing from TARGET to OWNSHIP
    bearing_target_to_ownship = geodetic_bearing(tgt_pos.coordinates, own_pos.coordinates)

    // Step 2: Get TARGET course in degrees
    target_course = tgt_pos.course  // degrees, 0-360

    // Step 3: Compute angle-to-bow
    atb = bearing_target_to_ownship - target_course

    // Step 4: Normalize to selected format
    IF format == "UK":
        // Normalize to -180..+180
        WHILE atb > 180:
            atb = atb - 360
        END WHILE
        WHILE atb < -180:
            atb = atb + 360
        END WHILE
    ELSE IF format == "US":
        // Normalize to 0..360
        WHILE atb < 0:
            atb = atb + 360
        END WHILE
        WHILE atb >= 360:
            atb = atb - 360
        END WHILE
    END IF

    // Build measurement feature (geometry at target position)
    measurement = build_measurement_feature(
        id: generate_id("measurement-atb"),
        geometry: Point(tgt_pos.coordinates),
        measurement_type: "angle_to_bow",
        value: atb,
        units: "degrees",
        format: format,
        bearing_target_to_ownship: bearing_target_to_ownship,
        target_course: target_course,
        time: time,
        source_tracks: [ownship.id, target.id]
    )

    content_items = build_artifact(
        data: measurement,
        mime: "application/geo+json",
        result_subtype: "measurement/angle_to_bow",
        source_feature_ids: [ownship.id, target.id],
        label: "Angle to bow: " + ROUND(atb, 2) + " deg (" + format + ") from target perspective"
    )

    RETURN build_response(content_items)
END FUNCTION
```

### Relationship to rel-bearing-calc

ATB extends `relBearingCalc` in legacy Debrief. The only algorithmic difference is that in `calculate()`, the primary and secondary tracks are swapped:

| Aspect | rel-bearing-calc | atb-calc |
|--------|-----------------|----------|
| Bearing direction | ownship -> target | target -> ownship |
| Course used | ownship course | target course |
| Geometry point | ownship position | target position |
| Tactical meaning | "Where is the target relative to my bow?" | "What aspect of the target am I seeing?" |

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
| Target heading directly toward ownship (bow-on) | ATB = 0 degrees |
| Target heading directly away from ownship (stern-on) | ATB = 180 (UK/US) |
| Target beam-on port | UK: -90; US: 270 |
| Target beam-on starboard | UK: +90; US: 90 |
| Missing `format` parameter | Default to UK format |

## Examples

### Basic Usage (UK Format)

**Input**: `atb-calc.basic.input.json`
**Output**: `atb-calc.basic.output.json`

Description: Two tracks at T10:30 - target heading south (180) with bearing from target to ownship approximately 213 degrees. ATB in UK format is approximately +32.74 degrees (ownship is on target's starboard bow quarter).

### Edge Case: Co-located Tracks

**Input**: `atb-calc.edge.input.json`
**Output**: `atb-calc.edge.output.json`

Description: Both tracks at the same position. Bearing from target to ownship is undefined, so the tool returns a computation error.

### Complex: US Format at T10:35

**Input**: `atb-calc.complex.input.json`
**Output**: `atb-calc.complex.output.json`

Description: Full 3-position tracks evaluated at T10:35 using US format. The geometry has changed as the tracks move, producing a different ATB value than at T10:30.

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Supports UK (-180..+180) and US (0..360) bearing formats
- Derived from relBearingCalc with primary/secondary swap

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_artifact()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for result annotations

**Related Tools**:
- [rel-bearing-calc](./rel-bearing-calc.1.0.md) - Relative bearing from ownship perspective (parent algorithm)
- [bearing-rate-calc](./bearing-rate-calc.1.0.md) - Rate of change of bearing

**Input Schemas**:
- [TrackFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON track feature definition

**Legacy**:
- Debrief 3.x: `Debrief.Tools.Tote.Calculations.atbCalc` (extends `relBearingCalc`)
