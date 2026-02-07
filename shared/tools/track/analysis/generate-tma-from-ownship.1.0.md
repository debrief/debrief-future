---
name: generate-tma-from-ownship
version: 1.0
category: track/analysis
status: draft
created: 2026-02-07
migrated_from: Debrief.Wrappers.Track.GenerateTrack
---

# Generate TMA from Ownship

> Generate a target TMA segment by projecting from ownship positions with a range/bearing offset and constant course/speed.

## MCP

**Description**: Generates a TMA (Target Motion Analysis) segment by taking an ownship track, applying a range and bearing offset to establish an initial target position, then projecting target positions at a constant course and speed for each time step within the requested time window.

**When to use**: When the user has an ownship track and wants to create an initial target track hypothesis at a given range and bearing from ownship, moving on a specified course and speed. This is typically the first step in manual TMA, creating a seed solution for refinement.

**Parameters**:
- `features`: FeatureCollection containing the ownship track (with `is_ownship = true`)
- `start_time`: Start of the time window for the generated segment
- `end_time`: End of the time window for the generated segment
- `range_offset_nm`: Distance from ownship to target start position in nautical miles
- `bearing_offset_deg`: Bearing from ownship to target start position in degrees (0-360)
- `initial_course`: Estimated target course in degrees (0-360)
- `initial_speed`: Estimated target speed in knots

**Returns**: ToolResponse containing one TMA_SEGMENT feature representing the generated target track.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature`

**Constraints**:
- Exactly one feature with `kind == "TRACK"` and `is_ownship == true` required
- Ownship track must have at least one position within the requested time window
- `range_offset_nm` must be positive
- `bearing_offset_deg` must be in range [0, 360)
- `initial_course` must be in range [0, 360)
- `initial_speed` must be non-negative

**Defaults**:
- None; all parameters are required

## Outputs

Returns a **ToolResponse** with one addition content item.

**Response Schema**: `specs/041-document-tool-results/data-model.md#AdditionResult`

**Result Type**: `addition/analysis/tma_segment`

**Content Items**: One `AdditionResult` containing:
- `type`: "resource"
- `uri`: `feature://{generated-tma-id}`
- `mimeType`: "application/geo+json"
- `text`: Serialized TMA_SEGMENT GeoJSON Feature

**Annotations** (on each content item):
- `debrief:resultType`: `"addition/analysis/tma_segment"`
- `debrief:sourceFeatures`: ID of the ownship track
- `debrief:label`: `"Generated TMA segment from ownship positions ({n} fixes, course={c}, speed={s} kts, offset={r}nm at {b})"`

## Algorithm

```pseudocode
FUNCTION generate_tma_from_ownship(features: FeatureCollection, start_time: timestamp,
                                    end_time: timestamp, range_offset_nm: float,
                                    bearing_offset_deg: float, initial_course: float,
                                    initial_speed: float) -> ToolResponse:
    // Validate inputs
    IF features IS NULL OR features.features IS EMPTY:
        RETURN build_error("No ownship track found in input features", "invalid_input", [])
    END IF

    // Find ownship track
    ownship = NULL
    FOR EACH feature IN features.features:
        IF feature.properties.kind == "TRACK" AND feature.properties.is_ownship == true:
            ownship = feature
            BREAK
        END IF
    END FOR

    IF ownship IS NULL:
        RETURN build_error("No ownship track found in input features", "invalid_input", [])
    END IF

    // Clamp time window to ownship track extent
    time_clamped = false
    effective_start = start_time
    effective_end = end_time

    track_start = ownship.properties.start_time
    track_end = ownship.properties.end_time

    IF effective_start < track_start:
        effective_start = track_start
        time_clamped = true
    END IF

    IF effective_end > track_end:
        effective_end = track_end
        time_clamped = true
    END IF

    // Filter ownship positions within effective time window
    ownship_positions = empty list
    FOR EACH pos IN ownship.properties.positions:
        IF pos.time >= effective_start AND pos.time <= effective_end:
            ownship_positions.append(pos)
        END IF
    END FOR

    IF ownship_positions IS EMPTY:
        RETURN build_error("No ownship positions within requested time window", "insufficient_data", [ownship.id])
    END IF

    // Calculate initial target position using range/bearing offset from first ownship position
    first_ownship_pos = ownship_positions[0]
    initial_target_pos = offset_position(
        first_ownship_pos.coordinates,
        bearing_offset_deg,
        range_offset_nm
    )

    // Generate target positions at constant course/speed
    tma_positions = empty list
    tma_coordinates = empty list

    FOR EACH i, ownship_pos IN ENUMERATE(ownship_positions):
        IF i == 0:
            target_coords = initial_target_pos
        ELSE:
            // Calculate time delta from first position in minutes
            delta_minutes = MINUTES_BETWEEN(ownship_positions[0].time, ownship_pos.time)
            // Project from initial position at constant course/speed
            distance_nm = initial_speed * (delta_minutes / 60.0)
            target_coords = offset_position(initial_target_pos, initial_course, distance_nm)
        END IF

        tma_positions.append({
            time: ownship_pos.time,
            coordinates: target_coords,
            course: FLOAT(initial_course),
            speed: FLOAT(initial_speed)
        })
        tma_coordinates.append(target_coords)
    END FOR

    // Build TMA feature properties
    tma_properties = {
        kind: "TMA_SEGMENT",
        segment_type: "ABSOLUTE",
        platform_id: "TMA-FROM-OWNSHIP",
        platform_name: "TMA from ownship positions",
        host_track_id: ownship.id,
        start_time: effective_start,
        end_time: effective_end,
        estimated_course: FLOAT(initial_course),
        estimated_speed: FLOAT(initial_speed),
        range_offset_nm: range_offset_nm,
        bearing_offset_deg: bearing_offset_deg,
        positions: tma_positions,
        style: {
            line: {stroke: true, color: "#FF6600", weight: 2, opacity: 0.8, dashArray: "5,5"}
        }
    }

    // Add time clamping metadata if applicable
    IF time_clamped:
        tma_properties.time_clamped = true
        tma_properties.requested_start = start_time
        tma_properties.requested_end = end_time
    END IF

    // Build the TMA Feature
    tma_id = "tma-from-ownship-" + DERIVE_SUFFIX(ownship.id)
    tma_feature = {
        type: "Feature",
        id: tma_id,
        geometry: {type: "LineString", coordinates: tma_coordinates},
        properties: tma_properties
    }

    // Build label
    label = "Generated TMA segment from ownship positions (" + LENGTH(tma_positions) + " fixes, course=" + initial_course + ", speed=" + initial_speed + " kts, offset=" + range_offset_nm + "nm at " + FORMAT_BEARING(bearing_offset_deg) + ")"
    IF time_clamped:
        label = "Generated TMA segment from ownship positions (" + LENGTH(tma_positions) + " fixes, time window clamped to track extent)"
    END IF

    content_items = build_addition(
        features: [tma_feature],
        result_subtype: "analysis/tma_segment",
        source_feature_ids: [ownship.id],
        label: label
    )

    RETURN build_response(content_items)
END FUNCTION

FUNCTION offset_position(origin: [lon, lat], bearing_deg: float, distance_nm: float) -> [lon, lat]:
    // Convert bearing to radians and calculate new position using spherical earth model
    // Uses great-circle offset: new_lat = asin(sin(lat)*cos(d/R) + cos(lat)*sin(d/R)*cos(brg))
    // new_lon = lon + atan2(sin(brg)*sin(d/R)*cos(lat), cos(d/R) - sin(lat)*sin(new_lat))
    // R = 3440.065 nm (earth radius in nautical miles)
    RETURN [new_lon, new_lat]
END FUNCTION
```

### Complexity

- **Time**: O(n) -- iterates over n ownship positions within the time window
- **Space**: O(n) -- stores one target position per ownship position

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Return error response: `invalid_input`, "No ownship track found" |
| No ownship track (missing `is_ownship` flag) | Return error response: `invalid_input`, "No ownship track found" |
| Requested time window exceeds track extent | Clamp to track extent, set `time_clamped = true`, include `requested_start`/`requested_end` in properties |
| No positions within clamped time window | Return error response: `insufficient_data` |
| Bearing of 0 degrees (due north) | Correctly offset position to the north |
| Very large range offset | Compute offset using great-circle math for accuracy |

## Examples

### Basic Usage

**Input**: `generate-tma-from-ownship.basic.input.json`
**Output**: `generate-tma-from-ownship.basic.output.json`

Description: Generates a TMA segment from a straight-line ownship track with a 5nm offset at bearing 090, target course 180 at 8 kts, for a subset of the ownship time window (6 fixes).

### Complex: Ownship Manoeuvre with Full Time Window

**Input**: `generate-tma-from-ownship.complex.input.json`
**Output**: `generate-tma-from-ownship.complex.output.json`

Description: Generates a 20-fix TMA segment from an ownship track that includes a course change at minute 10. The target maintains constant course 225 at 6 kts throughout, offset 3nm at bearing 270.

### Edge Case: Time Window Exceeds Track

**Input**: `generate-tma-from-ownship.edge-1.input.json`
**Output**: `generate-tma-from-ownship.edge-1.output.json`

Description: Requested time window (09:55-10:30) exceeds ownship track extent (10:00-10:01). Time is clamped to track extent and the output includes `time_clamped` flag.

### Edge Case: Empty Features

**Input**: `generate-tma-from-ownship.edge-2.input.json`
**Output**: `generate-tma-from-ownship.edge-2.output.json`

Description: Empty feature collection produces an `invalid_input` error indicating no ownship track was found.

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Generates TMA segment from ownship with range/bearing offset
- Constant course/speed projection along the time window
- Supports time window clamping to track extent

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_addition()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for result annotations

**Related Tools**:
- [generate-tma-from-infill](./generate-tma-from-infill.1.0.md) - Converts infill segments to TMA segments
- [generate-tma-segment-from-cuts](./generate-tma-segment-from-cuts.1.0.md) - Generates TMA by fitting to sensor bearing cuts

**Input Schemas**:
- [TrackFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON track feature definition

**Legacy**:
- Debrief 3.x: `Debrief.Wrappers.Track.GenerateTrack`
