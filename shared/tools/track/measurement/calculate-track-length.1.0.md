---
name: calculate-track-length
version: 1.0
category: track/measurement
status: draft
created: 2026-02-07
migrated_from: org.mwc.debrief.core.ContextOperations.CalculateTrackLength
---

# Calculate Track Length

> Calculate the total distance along a track by summing distances between consecutive visible positions.

## MCP

**Description**: Calculates the total path length of a track by summing the great-circle distances between each pair of consecutive visible positions. Only visible (non-hidden) positions are included in the calculation. Returns the total length in the user's preferred distance units.

**When to use**: When the user needs to know the total distance a vessel has travelled along its track. Available as a context menu operation on track features.

**Parameters**:
- `features`: FeatureCollection containing at least one track feature
- `units`: Distance units for output -- one of `yds`, `km`, `nm`, `m` (default: `nm`)

**Returns**: A scalar measurement of the total track length in the specified units.

## Inputs

**Schema**: `shared/schemas/geojson/FeatureCollection.schema.json`

**Constraints**:
- At least 1 feature required with `debrief:kind = "track"`
- Track must have at least 2 visible positions

**Defaults**:
- `units`: `"nm"` (nautical miles)

## Outputs

Returns a **ToolResponse** with a single artifact content item.

**Response Schema**: `specs/041-document-tool-results/data-model.md#ToolResponse`

**Result Type**: `artifact/measurement/track_length`

**Content Items**: One measurement result containing:
- `type`: `"resource"`
- `uri`: `feature://measurement-track-length-{id}`
- `mimeType`: `"application/geo+json"`
- `text`: Serialized measurement Feature with total length

**Annotations**:
- `debrief:resultType`: `"artifact/measurement/track_length"`
- `debrief:sourceFeatures`: `["track-001"]`
- `debrief:label`: `"Calculated track length: {value} {units}"`

## Algorithm

```pseudocode
FUNCTION calculate_track_length(input: FeatureCollection, units: string) -> ToolResponse:
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
        RETURN build_error("At least two positions required for track length", "invalid_input", [primary.id])
    END IF

    // Filter to visible positions only
    visible_positions = empty list
    FOR EACH pos IN positions:
        IF pos.visible IS NULL OR pos.visible == true:
            visible_positions.append(pos)
        END IF
    END FOR

    IF LENGTH(visible_positions) < 2:
        RETURN build_error("At least two visible positions required", "invalid_input", [primary.id])
    END IF

    // Sum distances between consecutive visible positions
    // Legacy: sum of rangeFrom() between consecutive visible positions
    total_distance_nm = 0.0
    num_segments = 0

    FOR i FROM 0 TO LENGTH(visible_positions) - 2:
        coord1 = visible_positions[i].coordinates
        coord2 = visible_positions[i + 1].coordinates

        segment_degs = haversine_distance_degs(coord1, coord2)
        segment_nm = segment_degs * 60.0

        total_distance_nm = total_distance_nm + segment_nm
        num_segments = num_segments + 1
    END FOR

    // Convert to requested units
    total_distance = convert_distance(total_distance_nm, "nm", units)

    // Build artifact response
    content_items = build_artifact(
        data: {
            measurement_type: "track_length",
            value: ROUND(total_distance, 2),
            units: units,
            time: positions[0].time,
            primary_track: primary.id,
            num_segments: num_segments,
            num_visible_positions: LENGTH(visible_positions)
        },
        mime: "application/geo+json",
        result_subtype: "measurement/track_length",
        source_feature_ids: [primary.id],
        label: "Calculated track length: " + ROUND(total_distance, 2) + " " + units
    )

    RETURN build_response(content_items)
END FUNCTION

FUNCTION convert_distance(value_nm: float, from: string, to: string) -> float:
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
```

### Complexity

- **Time**: O(n) -- iterates over all visible position pairs
- **Space**: O(n) -- stores filtered visible positions list

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Empty input collection | Return error: `invalid_input`, "Input features required" |
| Feature is not a track | Return error: `invalid_input`, "Feature must be a track" |
| Only one position | Return error: `invalid_input`, "At least two positions required" |
| All positions hidden | Return error: `invalid_input`, "At least two visible positions required" |
| Single visible position | Return error: `invalid_input`, "At least two visible positions required" |
| Positions without `visible` property | Treat as visible (default true) |
| Track with zero-length segment (duplicate positions) | Include segment with 0 distance |
| Invalid units parameter | Return error: `invalid_input`, "Unsupported distance unit" |

## Examples

### Basic Example

**Input**: `calculate-track-length.basic.input.json`
**Output**: `calculate-track-length.basic.output.json`

Description: Calculates total length of OWNSHIP track from [-1.0, 50.0] to [-0.98, 50.02] (two visible positions). Returns approximately 1.42 nm.

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Supports yards, kilometres, nautical miles, and metres
- Only visible positions are included in length calculation

## References

**Related Tools**:
- [range-calc](./range-calc.1.0.md) -- point-to-point range
- [speed-calc](./speed-calc.1.0.md) -- instantaneous speed

**Schemas**:
- `shared/schemas/geojson/FeatureCollection.schema.json`

**Legacy**:
- Debrief 3.x: `org.mwc.debrief.core.ContextOperations.CalculateTrackLength`
