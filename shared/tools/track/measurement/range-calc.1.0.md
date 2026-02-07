---
name: range-calc
version: 1.0
category: track/measurement
status: draft
created: 2026-02-07
migrated_from: Debrief.Tools.Tote.Calculations.rangeCalc
---

# Range Calc

> Calculate the range (distance) between two tracks at the current time.

## MCP

**Description**: Calculates the geodesic distance between the primary and secondary track positions at a given time. Returns the range converted to the user's preferred distance units.

**When to use**: When the user needs to know the distance between two vessels or platforms at a specific point in time. Commonly used in the tote panel to display real-time separation.

**Parameters**:
- `features`: FeatureCollection containing exactly two track features (primary and secondary)
- `time`: ISO 8601 timestamp at which to evaluate positions
- `units`: Distance units for output — one of `yds`, `km`, `nm`, `m` (default: `yds`)

**Returns**: A scalar measurement of the range between the two tracks in the specified units.

## Inputs

**Schema**: `shared/schemas/geojson/FeatureCollection.schema.json`

**Constraints**:
- Exactly 2 features required, both with `debrief:kind = "track"`
- Both tracks must have a position at or interpolatable to the specified time
- The `units` parameter must be one of: `yds`, `km`, `nm`, `m`

**Defaults**:
- `units`: `"yds"` (yards)

## Outputs

Returns a **ToolResponse** with a single artifact content item.

**Response Schema**: `specs/041-document-tool-results/data-model.md#ToolResponse`

**Result Type**: `artifact/measurement/range`

**Content Items**: One measurement result containing:
- `type`: `"resource"`
- `uri`: `feature://measurement-range-{id}`
- `mimeType`: `"application/geo+json"`
- `text`: Serialized measurement Feature with value and units

**Annotations**:
- `debrief:resultType`: `"artifact/measurement/range"`
- `debrief:sourceFeatures`: `["track-001", "track-002"]`
- `debrief:label`: `"Calculated range: {value} {units}"`

## Algorithm

```pseudocode
FUNCTION range_calc(input: FeatureCollection, time: Timestamp, units: string) -> ToolResponse:
    // Validate inputs
    IF input IS NULL OR input.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    IF LENGTH(input.features) < 2:
        RETURN build_error("Two track features required for range calculation", "invalid_input", [])
    END IF

    primary = input.features[0]
    secondary = input.features[1]

    // Get positions at the specified time
    primary_pos = get_position_at_time(primary, time)
    secondary_pos = get_position_at_time(secondary, time)

    IF primary_pos IS NULL OR secondary_pos IS NULL:
        RETURN build_error("No position available at specified time", "invalid_input", [])
    END IF

    // Calculate range using great-circle distance
    // Legacy: primary.getLocation().rangeFrom(secondary.getLocation())
    range_degs = haversine_distance_degs(primary_pos.coordinates, secondary_pos.coordinates)

    // Convert from degrees to user-preferred units
    // 1 degree of great circle = 60 nautical miles
    range_nm = range_degs * 60.0
    range_value = convert_distance(range_nm, "nm", units)

    // Build artifact response
    content_items = build_artifact(
        data: {
            measurement_type: "range",
            value: range_value,
            units: units,
            time: time,
            primary_track: primary.id,
            secondary_track: secondary.id,
            primary_position: primary_pos.coordinates,
            secondary_position: secondary_pos.coordinates
        },
        mime: "application/geo+json",
        result_subtype: "measurement/range",
        source_feature_ids: [primary.id, secondary.id],
        label: "Calculated range: " + ROUND(range_value) + " " + units
    )

    RETURN build_response(content_items)
END FUNCTION

FUNCTION convert_distance(value_nm: float, from: string, to: string) -> float:
    // Convert nautical miles to target unit
    IF to == "nm":
        RETURN value_nm
    ELSE IF to == "yds":
        RETURN value_nm * 2025.372
    ELSE IF to == "km":
        RETURN value_nm * 1.852
    ELSE IF to == "m":
        RETURN value_nm * 1852.0
    END IF
END FUNCTION

FUNCTION haversine_distance_degs(coord1: [lon, lat], coord2: [lon, lat]) -> float:
    // Returns great-circle distance in degrees
    lat1 = TO_RADIANS(coord1[1])
    lat2 = TO_RADIANS(coord2[1])
    dlat = TO_RADIANS(coord2[1] - coord1[1])
    dlon = TO_RADIANS(coord2[0] - coord1[0])

    a = SIN(dlat / 2) ^ 2 + COS(lat1) * COS(lat2) * SIN(dlon / 2) ^ 2
    c = 2 * ATAN2(SQRT(a), SQRT(1 - a))

    // Convert radians to degrees
    RETURN TO_DEGREES(c)
END FUNCTION
```

### Complexity

- **Time**: O(1) -- single distance calculation between two points
- **Space**: O(1) -- constant memory for coordinates and result

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Empty input collection | Return error: `invalid_input`, "Input features required" |
| Only one track provided | Return error: `invalid_input`, "Two track features required for range calculation" |
| No position at specified time | Return error: `invalid_input`, "No position available at specified time" |
| Tracks at same location (range = 0) | Return `0` in requested units |
| Invalid units parameter | Return error: `invalid_input`, "Unsupported distance unit" |
| Null coordinates on a position | Return error: `invalid_input`, "No position available at specified time" |
| Very large distances (antipodal) | Haversine handles correctly up to 180 degrees |

## Examples

### Basic Example

**Input**: `range-calc.basic.input.json`
**Output**: `range-calc.basic.output.json`

Description: Calculates range between OWNSHIP at [-1.0, 50.0] and TARGET at [-0.95, 50.05] at time 2024-01-15T10:30:00Z. Returns approximately 7230 yards.

### Error: Missing Second Track

**Input**:
```json
{
  "type": "FeatureCollection",
  "features": [{"type": "Feature", "id": "track-001", "properties": {"debrief:kind": "track"}}],
  "properties": {"tool": "range-calc", "params": {"units": "yds"}, "time": "2024-01-15T10:30:00Z"}
}
```

**Output**:
```json
{
  "error": {
    "code": -32000,
    "message": "Two track features required for range calculation",
    "data": {"debrief:errorCategory": "invalid_input", "debrief:affectedFeatures": []}
  }
}
```

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Supports yards, kilometres, nautical miles, and metres output
- Uses Haversine great-circle distance formula

## References

**Related Tools**:
- [bearing-calc](./bearing-calc.1.0.md) -- bearing between two tracks
- [swt-range-calc](./swt-range-calc.1.0.md) -- SWT-integrated variant of range calculation
- [delta-rate-calc](./delta-rate-calc.1.0.md) -- rate of change of range

**Schemas**:
- `shared/schemas/geojson/FeatureCollection.schema.json`

**Legacy**:
- Debrief 3.x: `Debrief.Tools.Tote.Calculations.rangeCalc`
