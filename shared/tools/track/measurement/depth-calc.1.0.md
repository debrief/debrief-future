---
name: depth-calc
version: 1.0
category: track/measurement
status: draft
created: 2026-02-07
migrated_from: Debrief.Tools.Tote.Calculations.depthCalc
---

# Depth Calc

> Calculate the depth of a track at the specified time.

## MCP

**Description**: Retrieves the depth of the primary track at a given time. The depth value is read directly from the track position's depth property. Returns depth in metres. Handles NaN and invalid depth values gracefully.

**When to use**: When the user needs to know the depth of a vessel (typically a submarine) at a specific moment. Commonly displayed in the tote panel.

**Parameters**:
- `features`: FeatureCollection containing at least one track feature
- `time`: ISO 8601 timestamp at which to evaluate the depth

**Returns**: A scalar measurement of depth in metres (positive downward).

## Inputs

**Schema**: `shared/schemas/geojson/FeatureCollection.schema.json`

**Constraints**:
- At least 1 feature required with `debrief:kind = "track"`
- Track must have a position at or interpolatable to the specified time

**Defaults**:
- None (all parameters required)

## Outputs

Returns a **ToolResponse** with a single artifact content item.

**Response Schema**: `specs/041-document-tool-results/data-model.md#ToolResponse`

**Result Type**: `artifact/measurement/depth`

**Content Items**: One measurement result containing:
- `type`: `"resource"`
- `uri`: `feature://measurement-depth-{id}`
- `mimeType`: `"application/geo+json"`
- `text`: Serialized measurement Feature with depth value in metres

**Annotations**:
- `debrief:resultType`: `"artifact/measurement/depth"`
- `debrief:sourceFeatures`: `["track-002"]`
- `debrief:label`: `"Calculated depth: {value} m"`

## Algorithm

```pseudocode
FUNCTION depth_calc(input: FeatureCollection, time: Timestamp) -> ToolResponse:
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

    // Read depth from position
    // Legacy: primary.getDepth() returns metres
    depth_m = position.depth

    // Handle NaN/invalid depth (legacy Debrief behavior)
    IF depth_m IS NULL OR depth_m IS NaN:
        depth_m = 0.0
    END IF

    // Build artifact response
    content_items = build_artifact(
        data: {
            measurement_type: "depth",
            value: depth_m,
            units: "m",
            time: time,
            primary_track: primary.id,
            primary_position: position.coordinates
        },
        mime: "application/geo+json",
        result_subtype: "measurement/depth",
        source_feature_ids: [primary.id],
        label: "Calculated depth: " + depth_m + " m"
    )

    RETURN build_response(content_items)
END FUNCTION
```

### Complexity

- **Time**: O(1) -- direct property lookup
- **Space**: O(1) -- constant memory

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Empty input collection | Return error: `invalid_input`, "Input features required" |
| Feature is not a track | Return error: `invalid_input`, "Feature must be a track" |
| No position at specified time | Return error: `invalid_input`, "No position available at specified time" |
| Depth property is null | Return `0.0` metres (surface vessel convention) |
| Depth is NaN | Return `0.0` metres (legacy Debrief behavior) |
| Depth is zero | Return `0.0` metres (surface vessel) |
| Depth is negative | Return the value as-is (may indicate altitude above sea level) |

## Examples

### Basic Example

**Input**: `depth-calc.basic.input.json`
**Output**: `depth-calc.basic.output.json`

Description: Retrieves depth of TARGET at time 2024-01-15T10:30:00Z. Returns 50.0 metres.

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Depth always returned in metres
- NaN and null depth values default to 0.0 (surface)

## References

**Related Tools**:
- [speed-calc](./speed-calc.1.0.md) -- speed of a single track
- [course-calc](./course-calc.1.0.md) -- course of a single track

**Schemas**:
- `shared/schemas/geojson/FeatureCollection.schema.json`

**Legacy**:
- Debrief 3.x: `Debrief.Tools.Tote.Calculations.depthCalc`
