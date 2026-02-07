---
name: speed-delta-average-calc
version: 1.0
category: track/measurement
status: draft
created: 2026-02-07
migrated_from: Debrief.Tools.Tote.Calculations.speedDeltaAverageCalc
---

# Speed Delta Average Calc

> Calculate the average speed change over a period for a single track.

## MCP

**Description**: Calculates the average rate of speed change across all consecutive position pairs in a track. Returns the mean absolute speed delta in knots. Useful for detecting acceleration and deceleration phases.

**When to use**: When the user needs to assess how much a vessel's speed is changing on average, to identify acceleration events or steady-state periods.

**Parameters**:
- `features`: FeatureCollection containing at least one track feature
- `time`: ISO 8601 timestamp (used for context; calculation uses all positions in the track)

**Returns**: A scalar measurement of the average speed change in knots.

## Inputs

**Schema**: `shared/schemas/geojson/FeatureCollection.schema.json`

**Constraints**:
- At least 1 feature required with `debrief:kind = "track"`
- Track must have at least 2 positions with speed data

**Defaults**:
- None (all parameters required)

## Outputs

Returns a **ToolResponse** with a single artifact content item.

**Response Schema**: `specs/041-document-tool-results/data-model.md#ToolResponse`

**Result Type**: `artifact/measurement/speed_delta_average`

**Content Items**: One measurement result containing:
- `type`: `"resource"`
- `uri`: `feature://measurement-speed-delta-avg-{id}`
- `mimeType`: `"application/geo+json"`
- `text`: Serialized measurement Feature with average speed delta

**Annotations**:
- `debrief:resultType`: `"artifact/measurement/speed_delta_average"`
- `debrief:sourceFeatures`: `["track-001"]`
- `debrief:label`: `"Calculated average speed change: {value} kts"`

## Algorithm

```pseudocode
FUNCTION speed_delta_average_calc(input: FeatureCollection, time: Timestamp) -> ToolResponse:
    // Validate inputs
    IF input IS NULL OR input.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    primary = input.features[0]

    IF primary.properties["debrief:kind"] != "track":
        RETURN build_error("Feature must be a track", "invalid_input", [primary.id])
    END IF

    positions = primary.properties["debrief:positions"]

    IF positions IS NULL OR LENGTH(positions) < 2:
        RETURN build_error("At least two positions required for speed delta average", "invalid_input", [primary.id])
    END IF

    // Calculate speed deltas between consecutive positions
    total_delta = 0.0
    num_deltas = 0

    FOR i FROM 0 TO LENGTH(positions) - 2:
        speed_1 = positions[i].speed
        speed_2 = positions[i + 1].speed

        IF speed_1 IS NOT NULL AND speed_2 IS NOT NULL
           AND speed_1 IS NOT NaN AND speed_2 IS NOT NaN:
            delta = ABS(speed_2 - speed_1)
            total_delta = total_delta + delta
            num_deltas = num_deltas + 1
        END IF
    END FOR

    IF num_deltas == 0:
        RETURN build_error("No valid speed data for delta calculation", "invalid_input", [primary.id])
    END IF

    average_delta = total_delta / num_deltas

    // Build artifact response
    content_items = build_artifact(
        data: {
            measurement_type: "speed_delta_average",
            value: ROUND(average_delta, 1),
            units: "kts",
            time: time,
            primary_track: primary.id,
            num_positions: LENGTH(positions),
            period_start: positions[0].time,
            period_end: positions[LENGTH(positions) - 1].time
        },
        mime: "application/geo+json",
        result_subtype: "measurement/speed_delta_average",
        source_feature_ids: [primary.id],
        label: "Calculated average speed change: " + ROUND(average_delta, 1) + " kts"
    )

    RETURN build_response(content_items)
END FUNCTION
```

### Complexity

- **Time**: O(n) -- iterates over all consecutive position pairs
- **Space**: O(1) -- running total, no additional storage

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Empty input collection | Return error: `invalid_input`, "Input features required" |
| Feature is not a track | Return error: `invalid_input`, "Feature must be a track" |
| Only one position | Return error: `invalid_input`, "At least two positions required" |
| All positions have same speed | Return `0.0` knots |
| Some positions have null speed | Skip those pairs, average only valid deltas |
| All speeds are NaN | Return error: `invalid_input`, "No valid speed data" |
| Speed is negative at some position | Use absolute difference regardless |

## Examples

### Basic Example

**Input**: `speed-delta-average-calc.basic.input.json`
**Output**: `speed-delta-average-calc.basic.output.json`

Description: Calculates average speed change for OWNSHIP with two positions both at 12.0 knots. Since speed is constant, returns 0.0 knots.

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Returns absolute average (always non-negative)
- Speed deltas computed in knots

## References

**Related Tools**:
- [speed-calc](./speed-calc.1.0.md) -- instantaneous speed
- [course-delta-average-calc](./course-delta-average-calc.1.0.md) -- average course change

**Schemas**:
- `shared/schemas/geojson/FeatureCollection.schema.json`

**Legacy**:
- Debrief 3.x: `Debrief.Tools.Tote.Calculations.speedDeltaAverageCalc`
