---
name: speed-calc
version: 1.0
category: track/measurement
status: draft
created: 2026-02-07
migrated_from: Debrief.Tools.Tote.Calculations.speedCalc
---

# Speed Calc

> Calculate the current speed of a track at the specified time.

## MCP

**Description**: Retrieves the speed of the primary track at a given time. The speed value is read directly from the track position's speed property. Returns the speed in knots.

**When to use**: When the user needs to know how fast a vessel is travelling at a specific moment. Commonly displayed in the tote panel.

**Parameters**:
- `features`: FeatureCollection containing at least one track feature
- `time`: ISO 8601 timestamp at which to evaluate the speed

**Returns**: A scalar measurement of speed in knots.

## Inputs

**Schema**: `shared/schemas/geojson/FeatureCollection.schema.json`

**Constraints**:
- At least 1 feature required with `debrief:kind = "track"`
- Track must have a position at or interpolatable to the specified time
- Position must have a `speed` property

**Defaults**:
- None (all parameters required)

## Outputs

Returns a **ToolResponse** with a single artifact content item.

**Response Schema**: `specs/041-document-tool-results/data-model.md#ToolResponse`

**Result Type**: `artifact/measurement/speed`

**Content Items**: One measurement result containing:
- `type`: `"resource"`
- `uri`: `feature://measurement-speed-{id}`
- `mimeType`: `"application/geo+json"`
- `text`: Serialized measurement Feature with speed value in knots

**Annotations**:
- `debrief:resultType`: `"artifact/measurement/speed"`
- `debrief:sourceFeatures`: `["track-001"]`
- `debrief:label`: `"Calculated speed: {value} kts"`

## Algorithm

```pseudocode
FUNCTION speed_calc(input: FeatureCollection, time: Timestamp) -> ToolResponse:
    // Validate inputs
    IF input IS NULL OR input.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    primary = input.features[0]

    IF primary.properties["debrief:kind"] != "track":
        RETURN build_error("Feature must be a track", "invalid_input", [primary.id])
    END IF

    // Get position at the specified time
    position = get_position_at_time(primary, time)

    IF position IS NULL:
        RETURN build_error("No position available at specified time", "invalid_input", [primary.id])
    END IF

    // Read speed directly from position
    // Legacy: primary.getSpeed() returns knots
    speed_kts = position.speed

    IF speed_kts IS NULL OR speed_kts IS NaN:
        RETURN build_error("No speed data available at specified time", "invalid_input", [primary.id])
    END IF

    // Build artifact response
    content_items = build_artifact(
        data: {
            measurement_type: "speed",
            value: speed_kts,
            units: "kts",
            time: time,
            primary_track: primary.id,
            primary_position: position.coordinates
        },
        mime: "application/geo+json",
        result_subtype: "measurement/speed",
        source_feature_ids: [primary.id],
        label: "Calculated speed: " + speed_kts + " kts"
    )

    RETURN build_response(content_items)
END FUNCTION
```

### Complexity

- **Time**: O(1) -- direct property lookup from position
- **Space**: O(1) -- constant memory

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Empty input collection | Return error: `invalid_input`, "Input features required" |
| Feature is not a track | Return error: `invalid_input`, "Feature must be a track" |
| No position at specified time | Return error: `invalid_input`, "No position available at specified time" |
| Speed property is null | Return error: `invalid_input`, "No speed data available at specified time" |
| Speed is NaN | Return error: `invalid_input`, "No speed data available at specified time" |
| Speed is zero | Return `0.0` kts (valid stationary track) |
| Speed is negative | Return the value as-is (implementation may flag as warning) |

## Examples

### Basic Example

**Input**: `speed-calc.basic.input.json`
**Output**: `speed-calc.basic.output.json`

Description: Retrieves speed of OWNSHIP at time 2024-01-15T10:30:00Z. Returns 12.0 knots.

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Speed always returned in knots (native unit)

## References

**Related Tools**:
- [course-calc](./course-calc.1.0.md) -- course of a single track
- [speed-delta-average-calc](./speed-delta-average-calc.1.0.md) -- average speed change over period

**Schemas**:
- `shared/schemas/geojson/FeatureCollection.schema.json`

**Legacy**:
- Debrief 3.x: `Debrief.Tools.Tote.Calculations.speedCalc`
