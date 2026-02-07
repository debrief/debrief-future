---
name: bearing-calc
version: 1.0
category: track/measurement
status: draft
created: 2026-02-07
migrated_from: Debrief.Tools.Tote.Calculations.bearingCalc
---

# Bearing Calc

> Calculate the bearing from the primary track to the secondary track at the current time.

## MCP

**Description**: Calculates the true bearing (azimuth) from the primary track's position to the secondary track's position at a given time. Returns the result in degrees (0-360).

**When to use**: When the user needs to know the direction from one vessel to another. Commonly displayed in the tote panel alongside range.

**Parameters**:
- `features`: FeatureCollection containing exactly two track features (primary and secondary)
- `time`: ISO 8601 timestamp at which to evaluate positions

**Returns**: A scalar measurement of the bearing in degrees from true north (0-360).

## Inputs

**Schema**: `shared/schemas/geojson/FeatureCollection.schema.json`

**Constraints**:
- Exactly 2 features required, both with `debrief:kind = "track"`
- Both tracks must have a position at or interpolatable to the specified time

**Defaults**:
- None (all parameters required)

## Outputs

Returns a **ToolResponse** with a single artifact content item.

**Response Schema**: `specs/041-document-tool-results/data-model.md#ToolResponse`

**Result Type**: `artifact/measurement/bearing`

**Content Items**: One measurement result containing:
- `type`: `"resource"`
- `uri`: `feature://measurement-bearing-{id}`
- `mimeType`: `"application/geo+json"`
- `text`: Serialized measurement Feature with value in degrees

**Annotations**:
- `debrief:resultType`: `"artifact/measurement/bearing"`
- `debrief:sourceFeatures`: `["track-001", "track-002"]`
- `debrief:label`: `"Calculated bearing: {value} degs"`

## Algorithm

```pseudocode
FUNCTION bearing_calc(input: FeatureCollection, time: Timestamp) -> ToolResponse:
    // Validate inputs
    IF input IS NULL OR input.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    IF LENGTH(input.features) < 2:
        RETURN build_error("Two track features required for bearing calculation", "invalid_input", [])
    END IF

    primary = input.features[0]
    secondary = input.features[1]

    // Get positions at the specified time
    primary_pos = get_position_at_time(primary, time)
    secondary_pos = get_position_at_time(secondary, time)

    IF primary_pos IS NULL OR secondary_pos IS NULL:
        RETURN build_error("No position available at specified time", "invalid_input", [])
    END IF

    // Calculate bearing from primary to secondary
    // Legacy: secondary.getLocation().bearingFrom(primary.getLocation())
    bearing_rads = calculate_initial_bearing(
        primary_pos.coordinates,
        secondary_pos.coordinates
    )

    // Clip radians to 0..2*PI range
    IF bearing_rads < 0:
        bearing_rads = bearing_rads + 2 * PI
    END IF

    // Convert to degrees
    bearing_degs = TO_DEGREES(bearing_rads)

    // Normalize to 0-360 range
    bearing_degs = bearing_degs MOD 360.0
    IF bearing_degs < 0:
        bearing_degs = bearing_degs + 360.0
    END IF

    // Build artifact response
    content_items = build_artifact(
        data: {
            measurement_type: "bearing",
            value: ROUND(bearing_degs, 1),
            units: "degs",
            time: time,
            primary_track: primary.id,
            secondary_track: secondary.id,
            primary_position: primary_pos.coordinates,
            secondary_position: secondary_pos.coordinates
        },
        mime: "application/geo+json",
        result_subtype: "measurement/bearing",
        source_feature_ids: [primary.id, secondary.id],
        label: "Calculated bearing: " + ROUND(bearing_degs, 1) + " degs"
    )

    RETURN build_response(content_items)
END FUNCTION

FUNCTION calculate_initial_bearing(from: [lon, lat], to: [lon, lat]) -> float:
    // Returns initial bearing in radians from 'from' to 'to'
    lat1 = TO_RADIANS(from[1])
    lat2 = TO_RADIANS(to[1])
    dlon = TO_RADIANS(to[0] - from[0])

    x = SIN(dlon) * COS(lat2)
    y = COS(lat1) * SIN(lat2) - SIN(lat1) * COS(lat2) * COS(dlon)

    RETURN ATAN2(x, y)
END FUNCTION
```

### Complexity

- **Time**: O(1) -- single bearing calculation between two points
- **Space**: O(1) -- constant memory for coordinates and result

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Empty input collection | Return error: `invalid_input`, "Input features required" |
| Only one track provided | Return error: `invalid_input`, "Two track features required for bearing calculation" |
| No position at specified time | Return error: `invalid_input`, "No position available at specified time" |
| Tracks at same location | Return `0.0` degrees (bearing undefined but defaults to 0) |
| Bearing wraps past 360 | Normalize to 0-360 range (e.g., -10 becomes 350) |
| Tracks at antipodal positions | Bearing is indeterminate; return 0.0 |
| Null coordinates | Return error: `invalid_input`, "No position available at specified time" |

## Examples

### Basic Example

**Input**: `bearing-calc.basic.input.json`
**Output**: `bearing-calc.basic.output.json`

Description: Calculates bearing from OWNSHIP at [-1.0, 50.0] to TARGET at [-0.95, 50.05] at time 2024-01-15T10:30:00Z. Returns approximately 32.8 degrees (northeast).

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Bearing returned in degrees (0-360) from true north
- Uses forward azimuth formula on WGS84 sphere

## References

**Related Tools**:
- [range-calc](./range-calc.1.0.md) -- range between two tracks
- [doppler-calc](./doppler-calc.1.0.md) -- Doppler shift uses bearing internally
- [course-calc](./course-calc.1.0.md) -- course of a single track (not inter-track)

**Schemas**:
- `shared/schemas/geojson/FeatureCollection.schema.json`

**Legacy**:
- Debrief 3.x: `Debrief.Tools.Tote.Calculations.bearingCalc`
