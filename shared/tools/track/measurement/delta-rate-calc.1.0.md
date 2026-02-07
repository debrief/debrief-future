---
name: delta-rate-calc
version: 1.0
category: track/measurement
status: draft
created: 2026-02-07
migrated_from: Debrief.Tools.Tote.Calculations.DeltaRateToteCalcImplementation
---

# Delta Rate Calc

> Calculate the rate of change of range (delta range rate) between two tracks.

## MCP

**Description**: Calculates how quickly the distance between two tracks is changing over time. A negative value indicates the tracks are closing; a positive value indicates they are opening. Computed by comparing ranges at two consecutive time positions.

**When to use**: When the user needs to know the closing or opening speed between two vessels. Important for collision avoidance and intercept analysis.

**Parameters**:
- `features`: FeatureCollection containing exactly two track features (primary and secondary)
- `time`: ISO 8601 timestamp at which to evaluate (uses this and the next position)
- `units`: Output units — one of `yds/s`, `m/s`, `kts` (default: `yds/s`)

**Returns**: A scalar measurement of the range rate in the specified units. Negative = closing, positive = opening.

## Inputs

**Schema**: `shared/schemas/geojson/FeatureCollection.schema.json`

**Constraints**:
- Exactly 2 features required, both with `debrief:kind = "track"`
- Both tracks must have at least two positions to compute a rate of change
- Positions must overlap in time

**Defaults**:
- `units`: `"yds/s"`

## Outputs

Returns a **ToolResponse** with a single artifact content item.

**Response Schema**: `specs/041-document-tool-results/data-model.md#ToolResponse`

**Result Type**: `artifact/measurement/delta_range_rate`

**Content Items**: One measurement result containing:
- `type`: `"resource"`
- `uri`: `feature://measurement-delta-rate-{id}`
- `mimeType`: `"application/geo+json"`
- `text`: Serialized measurement Feature with rate value

**Annotations**:
- `debrief:resultType`: `"artifact/measurement/delta_range_rate"`
- `debrief:sourceFeatures`: `["track-001", "track-002"]`
- `debrief:label`: `"Calculated delta range rate: {value} {units}"`

## Algorithm

```pseudocode
FUNCTION delta_rate_calc(input: FeatureCollection, time: Timestamp, units: string) -> ToolResponse:
    // Validate inputs
    IF input IS NULL OR input.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    IF LENGTH(input.features) < 2:
        RETURN build_error("Two track features required for delta rate calculation", "invalid_input", [])
    END IF

    primary = input.features[0]
    secondary = input.features[1]

    // Get positions at time T1 and T2
    // T1 = the position at or just before the specified time
    // T2 = the next position after T1
    primary_pos_t1 = get_position_at_time(primary, time)
    secondary_pos_t1 = get_position_at_time(secondary, time)

    primary_pos_t2 = get_next_position_after(primary, time)
    secondary_pos_t2 = get_next_position_after(secondary, time)

    IF primary_pos_t1 IS NULL OR secondary_pos_t1 IS NULL:
        RETURN build_error("No position available at specified time", "invalid_input", [])
    END IF

    IF primary_pos_t2 IS NULL OR secondary_pos_t2 IS NULL:
        RETURN build_error("Insufficient positions to calculate rate of change", "invalid_input", [])
    END IF

    // Calculate range at T1
    range_t1_degs = haversine_distance_degs(primary_pos_t1.coordinates, secondary_pos_t1.coordinates)
    range_t1_m = range_t1_degs * 60.0 * 1852.0

    // Calculate range at T2
    range_t2_degs = haversine_distance_degs(primary_pos_t2.coordinates, secondary_pos_t2.coordinates)
    range_t2_m = range_t2_degs * 60.0 * 1852.0

    // Calculate time interval in seconds
    dt_secs = time_difference_seconds(primary_pos_t1.time, primary_pos_t2.time)

    IF dt_secs == 0:
        RETURN build_error("Time interval is zero, cannot compute rate", "invalid_input", [])
    END IF

    // Calculate range rate in metres per second
    range_rate_mps = (range_t2_m - range_t1_m) / dt_secs

    // Convert to requested units
    IF units == "yds/s":
        range_rate = range_rate_mps * 1.09361
    ELSE IF units == "m/s":
        range_rate = range_rate_mps
    ELSE IF units == "kts":
        range_rate = range_rate_mps / 0.51444
    END IF

    // Build artifact response
    content_items = build_artifact(
        data: {
            measurement_type: "delta_range_rate",
            value: ROUND(range_rate, 1),
            units: units,
            time: time,
            primary_track: primary.id,
            secondary_track: secondary.id,
            range_at_t1: ROUND(range_t1_m * 1.09361),
            range_at_t2: ROUND(range_t2_m * 1.09361),
            time_interval_secs: dt_secs
        },
        mime: "application/geo+json",
        result_subtype: "measurement/delta_range_rate",
        source_feature_ids: [primary.id, secondary.id],
        label: "Calculated delta range rate: " + ROUND(range_rate, 1) + " " + units
    )

    RETURN build_response(content_items)
END FUNCTION
```

### Complexity

- **Time**: O(1) -- two distance calculations and a division
- **Space**: O(1) -- constant memory

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Empty input collection | Return error: `invalid_input`, "Input features required" |
| Only one track provided | Return error: `invalid_input`, "Two track features required" |
| No position at specified time | Return error: `invalid_input`, "No position available at specified time" |
| Only one position per track (no T2) | Return error: `invalid_input`, "Insufficient positions to calculate rate" |
| Time interval is zero | Return error: `invalid_input`, "Time interval is zero" |
| Tracks stationary (range rate = 0) | Return `0.0` in requested units |
| Tracks closing | Return negative value |
| Tracks opening | Return positive value |

## Examples

### Basic Example

**Input**: `delta-rate-calc.basic.input.json`
**Output**: `delta-rate-calc.basic.output.json`

Description: Calculates range rate between OWNSHIP and TARGET over the 5-minute interval from 10:30 to 10:35. Range decreases from approximately 7230 yds to 2645 yds, giving a rate of approximately -15.3 yds/s (closing).

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Supports yds/s, m/s, and kts output units
- Negative values indicate closing, positive indicate opening

## References

**Related Tools**:
- [range-calc](./range-calc.1.0.md) -- instantaneous range between tracks
- [bearing-calc](./bearing-calc.1.0.md) -- bearing between tracks
- [speed-calc](./speed-calc.1.0.md) -- speed of individual track

**Schemas**:
- `shared/schemas/geojson/FeatureCollection.schema.json`

**Legacy**:
- Debrief 3.x: `Debrief.Tools.Tote.Calculations.DeltaRateToteCalcImplementation`
