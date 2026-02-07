---
name: convert-absolute-tma-to-relative
version: 1.0
category: track/manipulation
status: draft
created: 2026-02-07
migrated_from: org.mwc.debrief.core.ContextOperations.ConvertAbsoluteTmaToRelative
---

# Convert Absolute TMA To Relative

> Converts an absolute TMA (Target Motion Analysis) segment to a relative representation using bearing and range from an ownship track.

## MCP

**Description**: Converts an absolute TMA solution segment into a relative bearing/range representation referenced to the ownship's sensor array position. Calculates the offset vector between the TMA start position and the sensor origin, then expresses each TMA data point as bearing and range from the corresponding ownship position.

**When to use**: When the user has an absolute TMA solution (positions in geographic coordinates) and needs to convert it to a relative representation for comparison with sensor data, bearing-only analysis, or tactical display showing target motion relative to the observer platform.

**Parameters**:
- `features`: FeatureCollection containing one TMA segment (ABSOLUTE type) and one ownship track

**Returns**: ToolResponse containing the converted TMA segment with relative bearing/range values added to each position.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TMASegmentFeature`, `shared/schemas/src/linkml/geojson.yaml#TrackFeature`

**Constraints**:
- Exactly one feature with `properties.kind == "TMA_SEGMENT"` and `properties.segment_type == "ABSOLUTE"` required
- Exactly one feature with `properties.kind == "TRACK"` and `properties.is_ownship == true` required
- TMA segment must have at least 1 position
- Ownship track must have a position at or before the TMA start time
- Ownship must have `sensor_array_center` property (or default to first position)

**Defaults**:
- `sensor_array_center`: Falls back to ownship's first position coordinates if not specified

## Outputs

Returns a **ToolResponse** with a single mutation content item.

**Response Schema**: `specs/041-document-tool-results/data-model.md#MutationResult`

**Result Type**: `mutation/track/tma_converted`

**Content Items**: One `MutationResult` containing the converted TMA segment feature:
- `type`: "resource"
- `uri`: `feature://tma-rel-{id_suffix}`
- `mimeType`: "application/geo+json"
- `text`: Serialized RELATIVE TMA_SEGMENT feature

**Converted Feature properties** (changes and additions):
- `segment_type`: Changed from "ABSOLUTE" to "RELATIVE"
- `ownship_track_id`: ID of the ownship reference track
- `origin_offset`: `{range_nm, bearing_deg}` offset at TMA start time
- Each position gains: `bearing_from_ownship`, `range_from_ownship_nm`

**Annotations** (on each content item):
- `debrief:resultType`: `"mutation/track/tma_converted"`
- `debrief:sourceFeatures`: `["{tma_id}", "{ownship_id}"]`
- `debrief:label`: `"Converted {platform_name} TMA from absolute to relative (ref: {ownship_name})"`

## Algorithm

```pseudocode
FUNCTION convert_absolute_tma_to_relative(features: FeatureCollection) -> ToolResponse:
    // Validate inputs
    IF features IS NULL OR features.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    // Find TMA segment and ownship track
    tma_segment = NULL
    ownship = NULL

    FOR EACH feature IN features.features:
        IF feature.properties.kind == "TMA_SEGMENT"
           AND feature.properties.segment_type == "ABSOLUTE":
            tma_segment = feature
        ELSE IF feature.properties.kind == "TRACK"
                AND feature.properties.is_ownship == true:
            ownship = feature
        END IF
    END FOR

    IF tma_segment IS NULL:
        RETURN build_error(
            "No absolute TMA segment found in input",
            "invalid_input", []
        )
    END IF

    IF ownship IS NULL:
        RETURN build_error(
            "No ownship track found in input",
            "invalid_input", []
        )
    END IF

    tma_positions = tma_segment.properties.positions
    ownship_positions = ownship.properties.positions

    IF tma_positions IS NULL OR tma_positions IS EMPTY:
        RETURN build_error(
            "TMA segment has no positions",
            "invalid_input", [tma_segment.id]
        )
    END IF

    // Step 1: Get sensor origin at TMA start time
    sensor_origin = ownship.properties.sensor_array_center
    IF sensor_origin IS NULL:
        sensor_origin = ownship_positions[0].coordinates
    END IF

    // Step 2: Calculate initial offset vector (TMA start relative to sensor)
    tma_start = tma_positions[0].coordinates
    origin_bearing = calculate_bearing(sensor_origin, tma_start)
    origin_range = geodesic_distance_nm(sensor_origin, tma_start)

    // Step 3: For each TMA position, compute bearing/range from ownship
    relative_positions = empty list
    FOR EACH tma_pos IN tma_positions:
        // Find ownship position at corresponding time
        ownship_pos = interpolate_position(ownship_positions, tma_pos.time)

        IF ownship_pos IS NULL:
            // Use nearest ownship position if interpolation not possible
            ownship_pos = find_nearest_position(ownship_positions, tma_pos.time)
        END IF

        bearing = calculate_bearing(ownship_pos.coordinates, tma_pos.coordinates)
        range_nm = geodesic_distance_nm(ownship_pos.coordinates, tma_pos.coordinates)

        relative_pos = COPY(tma_pos)
        relative_pos.bearing_from_ownship = ROUND(bearing, 1)
        relative_pos.range_from_ownship_nm = ROUND(range_nm, 3)
        relative_positions.append(relative_pos)
    END FOR

    // Step 4: Build converted segment
    converted_id = "tma-rel-" + extract_suffix(tma_segment.id)
    converted_segment = COPY(tma_segment)
    converted_segment.id = converted_id
    converted_segment.properties.segment_type = "RELATIVE"
    converted_segment.properties.ownship_track_id = ownship.id
    converted_segment.properties.origin_offset = {
        range_nm: ROUND(origin_range, 3),
        bearing_deg: ROUND(origin_bearing, 1)
    }
    converted_segment.properties.positions = relative_positions

    // Build mutation response
    content_items = build_mutation(
        features: [converted_segment],
        result_subtype: "track/tma_converted",
        source_feature_ids: [tma_segment.id, ownship.id],
        label: "Converted " + tma_segment.properties.platform_name
               + " TMA from absolute to relative (ref: "
               + ownship.properties.platform_name + ")"
    )

    RETURN build_response(content_items)
END FUNCTION

FUNCTION calculate_bearing(from_coords: [lon, lat], to_coords: [lon, lat]) -> number:
    // Compute initial bearing from 'from' to 'to' using Haversine formula
    // Returns bearing in degrees [0, 360)
    dlon = to_coords[0] - from_coords[0]
    lat1 = TO_RADIANS(from_coords[1])
    lat2 = TO_RADIANS(to_coords[1])
    dlon_rad = TO_RADIANS(dlon)

    x = SIN(dlon_rad) * COS(lat2)
    y = COS(lat1) * SIN(lat2) - SIN(lat1) * COS(lat2) * COS(dlon_rad)

    bearing = TO_DEGREES(ATAN2(x, y))
    RETURN (bearing + 360) MOD 360
END FUNCTION

FUNCTION interpolate_position(positions: list, target_time: timestamp) -> Position:
    // Find bracketing positions and linearly interpolate
    FOR i = 0 TO LENGTH(positions) - 2:
        IF positions[i].time <= target_time AND positions[i + 1].time >= target_time:
            fraction = time_fraction(positions[i].time, positions[i + 1].time, target_time)
            interp_lon = positions[i].coordinates[0]
                + fraction * (positions[i + 1].coordinates[0] - positions[i].coordinates[0])
            interp_lat = positions[i].coordinates[1]
                + fraction * (positions[i + 1].coordinates[1] - positions[i].coordinates[1])
            RETURN {coordinates: [interp_lon, interp_lat], time: target_time}
        END IF
    END FOR
    RETURN NULL
END FUNCTION
```

### Complexity

- **Time**: O(n * m) -- for each of n TMA positions, search m ownship positions (can be reduced to O(n + m) with two-pointer approach)
- **Space**: O(n) -- stores converted positions

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Return error: `invalid_input`, "Input features required" |
| No absolute TMA segment | Return error: `invalid_input`, "No absolute TMA segment found in input" |
| No ownship track | Return error: `invalid_input`, "No ownship track found in input" |
| TMA already relative | Return error: `invalid_input`, "No absolute TMA segment found" (segment_type != "ABSOLUTE") |
| TMA and ownship co-located | Bearing is 0.0, range is 0.0 for co-located positions |
| Single-position TMA segment | Compute single bearing/range pair; geometry remains Point |
| TMA time outside ownship time range | Use nearest ownship position (extrapolation warning) |
| Missing `sensor_array_center` | Fall back to ownship's first position coordinates |
| Ownship with single position | Use that position for all TMA timestamps |

## Examples

### Basic Usage

**Input**: `convert-absolute-tma-to-relative.basic.input.json`
**Output**: `convert-absolute-tma-to-relative.basic.output.json`

Description: 3-position absolute TMA segment with ownship moving east. Converts to relative with bearing/range from ownship at each time step.

### Edge Case 1: Co-located TMA and Ownship

**Input**: `convert-absolute-tma-to-relative.edge-1.input.json`
**Output**: `convert-absolute-tma-to-relative.edge-1.output.json`

Description: TMA segment starting at same position as ownship. Produces zero bearing and range at start, with values remaining near zero as both move on same course.

### Edge Case 2: Single-position TMA

**Input**: `convert-absolute-tma-to-relative.edge-2.input.json`
**Output**: `convert-absolute-tma-to-relative.edge-2.output.json`

Description: Single-point TMA segment. Computes one bearing/range pair; geometry stays as Point.

### Complex: Diverging Tracks with Maneuvering Ownship

**Input**: `convert-absolute-tma-to-relative.complex.input.json`
**Output**: `convert-absolute-tma-to-relative.complex.output.json`

Description: 5-position TMA with ownship executing a gradual course change (45 to 65 degrees). TMA tracks away on a different heading (290 to 310 degrees), producing increasing range and shifting bearing over time.

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Computes relative bearing and range from ownship sensor array center
- Supports interpolation of ownship position at TMA timestamps
- Handles single-position and co-located edge cases

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_mutation()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for result annotations

**Related Tools**:
- [generate-infill-segment](./generate-infill-segment.1.0.md) - Generate interpolated data between segments

**Input Schemas**:
- [TMASegmentFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON TMA segment feature definition
- [TrackFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON track feature definition

**Legacy**:
- Debrief 3.x: `org.mwc.debrief.core.ContextOperations.ConvertAbsoluteTmaToRelative`
- Uses: `RelativeTMASegment`, `AbsoluteTMASegment` from Debrief track model
