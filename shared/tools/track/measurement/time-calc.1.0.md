---
name: time-calc
version: 1.0
category: track/measurement
status: draft
created: 2026-02-07
migrated_from: Debrief.Tools.Tote.Calculations.timeCalc
---

# Time Calc

> Display the current time for a track position.

## MCP

**Description**: Returns the formatted timestamp for the primary track's position at the specified time. This is primarily a display utility that confirms which time slice is being viewed for a track.

**When to use**: When the user needs to see the exact timestamp associated with a track position, particularly in the tote panel where the current time step is displayed.

**Parameters**:
- `features`: FeatureCollection containing at least one track feature
- `time`: ISO 8601 timestamp at which to evaluate
- `format`: Output format — `"ISO8601"` (default) or `"HHmmss"` or `"ddHHmmss"`

**Returns**: A measurement containing the formatted timestamp string.

## Inputs

**Schema**: `shared/schemas/geojson/FeatureCollection.schema.json`

**Constraints**:
- At least 1 feature required with `debrief:kind = "track"`
- Track must have a position at or near the specified time

**Defaults**:
- `format`: `"ISO8601"`

## Outputs

Returns a **ToolResponse** with a single artifact content item.

**Response Schema**: `specs/041-document-tool-results/data-model.md#ToolResponse`

**Result Type**: `artifact/measurement/time`

**Content Items**: One measurement result containing:
- `type`: `"resource"`
- `uri`: `feature://measurement-time-{id}`
- `mimeType`: `"application/geo+json"`
- `text`: Serialized measurement Feature with formatted time string

**Annotations**:
- `debrief:resultType`: `"artifact/measurement/time"`
- `debrief:sourceFeatures`: `["track-001"]`
- `debrief:label`: `"Current time: {formatted_time}"`

## Algorithm

```pseudocode
FUNCTION time_calc(input: FeatureCollection, time: Timestamp, format: string) -> ToolResponse:
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

    // Format the timestamp
    // Legacy: returns formatted timestamp string
    position_time = position.time

    IF format == "HHmmss":
        formatted = format_time(position_time, "HH:mm:ss")
    ELSE IF format == "ddHHmmss":
        formatted = format_time(position_time, "dd HH:mm:ss")
    ELSE:
        formatted = position_time  // ISO 8601 string as-is
    END IF

    // Build artifact response
    content_items = build_artifact(
        data: {
            measurement_type: "time",
            value: formatted,
            units: format,
            time: position_time,
            primary_track: primary.id,
            primary_position: position.coordinates
        },
        mime: "application/geo+json",
        result_subtype: "measurement/time",
        source_feature_ids: [primary.id],
        label: "Current time: " + formatted
    )

    RETURN build_response(content_items)
END FUNCTION
```

### Complexity

- **Time**: O(1) -- direct property lookup and formatting
- **Space**: O(1) -- constant memory

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Empty input collection | Return error: `invalid_input`, "Input features required" |
| Feature is not a track | Return error: `invalid_input`, "Feature must be a track" |
| No position at specified time | Return error: `invalid_input`, "No position available at specified time" |
| Time property is null on position | Return error: `invalid_input`, "No time data available" |
| Invalid format parameter | Default to ISO 8601 format |
| Time between positions (interpolated) | Return the interpolated time |

## Examples

### Basic Example

**Input**: `time-calc.basic.input.json`
**Output**: `time-calc.basic.output.json`

Description: Retrieves the timestamp for OWNSHIP at the current tote time. Returns "2024-01-15T10:30:00Z".

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Supports ISO 8601, HH:mm:ss, and dd HH:mm:ss formats

## References

**Related Tools**:
- [speed-calc](./speed-calc.1.0.md) -- speed at a time
- [course-calc](./course-calc.1.0.md) -- course at a time
- [depth-calc](./depth-calc.1.0.md) -- depth at a time

**Schemas**:
- `shared/schemas/geojson/FeatureCollection.schema.json`

**Legacy**:
- Debrief 3.x: `Debrief.Tools.Tote.Calculations.timeCalc`
