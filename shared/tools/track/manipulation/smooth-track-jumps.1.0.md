---
name: smooth-track-jumps
version: 1.0
category: track/manipulation
status: draft
created: 2026-02-07
migrated_from: org.mwc.debrief.core.ContextOperations.SmoothTrackJumps
---

# Smooth Track Jumps

> Smooths position jumps in a track segment by replacing outlier positions with interpolated values.

## MCP

**Description**: Identifies position jumps in a track segment where the implied speed between consecutive fixes exceeds a threshold multiple of the nominal speed, then replaces each jumped fix with an interpolated position calculated from its predecessor and successor.

**When to use**: When the user has a track segment with GPS/sensor glitches causing position spikes, and wants to clean the track by replacing outlier positions with smoothly interpolated values. This differs from "remove track jumps" (which deletes positions) -- this tool replaces them.

**Parameters**:
- `features`: FeatureCollection containing exactly one track segment feature
- `speed_threshold_multiplier`: Factor applied to `nominal_speed_kn` to determine the jump detection threshold (e.g., 3.0 means positions implying >3x nominal speed are considered jumps)

**Returns**: ToolResponse containing the modified track segment with jumped positions replaced by interpolated coordinates.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackSegmentFeature`

**Constraints**:
- Exactly one feature with `properties.kind == "TRACK_SEGMENT"` required
- Segment must have at least 3 positions (need predecessor and successor for interpolation)
- Each position must have `time` and `coordinates`
- Segment must have `nominal_speed_kn` property
- `speed_threshold_multiplier` must be a positive number

**Defaults**:
- `speed_threshold_multiplier`: 3.0

## Outputs

Returns a **ToolResponse** with a single mutation content item.

**Response Schema**: `specs/041-document-tool-results/data-model.md#MutationResult`

**Result Type**: `mutation/track/smoothed`

**Content Items**: One `MutationResult` containing the modified segment feature:
- `type`: "resource"
- `uri`: `feature://{segment_id}`
- `mimeType`: "application/geo+json"
- `text`: Serialized modified TRACK_SEGMENT feature

**Modified Feature properties** (additions):
- `smoothed_count`: Number of positions that were smoothed
- Each smoothed position has `smoothed: true` flag

**Annotations** (on each content item):
- `debrief:resultType`: `"mutation/track/smoothed"`
- `debrief:sourceFeatures`: `["{segment_id}"]`
- `debrief:label`: `"Smoothed {n} position jump(s) in {platform_name} segment"`

## Algorithm

```pseudocode
FUNCTION smooth_track_jumps(features: FeatureCollection, speed_threshold_multiplier: number) -> ToolResponse:
    // Validate inputs
    IF features IS NULL OR features.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    IF speed_threshold_multiplier IS NULL OR speed_threshold_multiplier <= 0:
        speed_threshold_multiplier = 3.0
    END IF

    // Find track segment feature
    segment = NULL
    FOR EACH feature IN features.features:
        IF feature.properties.kind == "TRACK_SEGMENT":
            segment = feature
            BREAK
        END IF
    END FOR

    IF segment IS NULL:
        RETURN build_error("No track segment feature found in input", "invalid_input", [])
    END IF

    positions = segment.properties.positions
    nominal_speed = segment.properties.nominal_speed_kn

    IF positions IS NULL OR LENGTH(positions) < 3:
        RETURN build_error(
            "Segment must have at least 3 positions for smoothing",
            "invalid_input", [segment.id]
        )
    END IF

    IF nominal_speed IS NULL OR nominal_speed <= 0:
        RETURN build_error(
            "Segment must have a positive nominal_speed_kn property",
            "invalid_input", [segment.id]
        )
    END IF

    threshold_speed = nominal_speed * speed_threshold_multiplier

    // Step 1: Identify jump positions (findFixesToFix)
    jump_indices = empty list
    FOR i = 1 TO LENGTH(positions) - 1:
        distance_nm = geodesic_distance_nm(
            positions[i - 1].coordinates,
            positions[i].coordinates
        )
        dt_hours = time_difference_hours(positions[i - 1].time, positions[i].time)

        IF dt_hours > 0:
            implied_speed = distance_nm / dt_hours
            IF implied_speed > threshold_speed:
                jump_indices.append(i)
            END IF
        END IF
    END FOR

    // Step 2: Replace each jumped position with interpolation
    smoothed_positions = COPY(positions)
    smoothed_count = 0

    FOR EACH idx IN jump_indices:
        // Find valid predecessor (skip consecutive jumps)
        pred_idx = idx - 1
        WHILE pred_idx IN jump_indices AND pred_idx > 0:
            pred_idx = pred_idx - 1
        END WHILE

        // Find valid successor (skip consecutive jumps)
        succ_idx = idx + 1
        WHILE succ_idx IN jump_indices AND succ_idx < LENGTH(positions) - 1:
            succ_idx = succ_idx + 1
        END WHILE

        // Only smooth if we have valid predecessor and successor
        IF pred_idx >= 0 AND succ_idx < LENGTH(positions)
           AND pred_idx NOT IN jump_indices AND succ_idx NOT IN jump_indices:

            // Calculate interpolation fraction based on time
            total_time = time_difference_seconds(
                positions[pred_idx].time, positions[succ_idx].time
            )
            elapsed_time = time_difference_seconds(
                positions[pred_idx].time, positions[idx].time
            )
            fraction = elapsed_time / total_time

            // Linear interpolation of coordinates
            interp_lon = positions[pred_idx].coordinates[0]
                + fraction * (positions[succ_idx].coordinates[0]
                              - positions[pred_idx].coordinates[0])
            interp_lat = positions[pred_idx].coordinates[1]
                + fraction * (positions[succ_idx].coordinates[1]
                              - positions[pred_idx].coordinates[1])

            smoothed_positions[idx].coordinates = [interp_lon, interp_lat]
            smoothed_positions[idx].smoothed = true
            smoothed_count = smoothed_count + 1
        END IF
    END FOR

    // Step 3: Rebuild geometry from smoothed positions
    coords = [pos.coordinates FOR pos IN smoothed_positions]
    segment.geometry = {type: "LineString", coordinates: coords}
    segment.properties.positions = smoothed_positions
    segment.properties.smoothed_count = smoothed_count

    // Build mutation response
    content_items = build_mutation(
        features: [segment],
        result_subtype: "track/smoothed",
        source_feature_ids: [segment.id],
        label: "Smoothed " + smoothed_count + " position jump(s) in "
               + segment.properties.platform_name + " segment"
    )

    RETURN build_response(content_items)
END FUNCTION
```

### Complexity

- **Time**: O(n) -- single pass to detect jumps, single pass to interpolate
- **Space**: O(n) -- copy of positions array

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Return error: `invalid_input`, "Input features required" |
| No track segment in input | Return error: `invalid_input`, "No track segment feature found in input" |
| Segment with fewer than 3 positions | Return error: `invalid_input`, "Segment must have at least 3 positions" |
| No jumps detected | Return segment unchanged with `smoothed_count: 0` |
| Consecutive jump positions | Each jumped fix interpolates between nearest valid predecessor and successor |
| Jump at first position (index 0) | Cannot smooth (no predecessor); position left unchanged |
| Jump at last position | Cannot smooth (no successor); position left unchanged |
| Missing `nominal_speed_kn` | Return error: `invalid_input`, "Segment must have a positive nominal_speed_kn" |
| Zero time interval between positions | Skip speed check for that interval (avoid division by zero) |
| Threshold multiplier <= 0 | Use default value of 3.0 |

## Examples

### Basic Usage

**Input**: `smooth-track-jumps.basic.input.json`
**Output**: `smooth-track-jumps.basic.output.json`

Description: 5-position segment with a single position jump at index 2 (coordinates [-1.50, 50.50] far from expected track). Smoothed to interpolated position [-1.02, 50.02].

### Edge Case 1: No Jumps Detected

**Input**: `smooth-track-jumps.edge-1.input.json`
**Output**: `smooth-track-jumps.edge-1.output.json`

Description: 5-position segment with all positions smoothly progressing. No jumps detected, segment returned unchanged with `smoothed_count: 0`.

### Edge Case 2: Consecutive Jump Positions

**Input**: `smooth-track-jumps.edge-2.input.json`
**Output**: `smooth-track-jumps.edge-2.output.json`

Description: 6-position segment with two consecutive jumps at indices 2 and 3. Both interpolated between the nearest valid predecessor (index 1) and successor (index 4).

### Complex: Multiple Non-consecutive Jumps

**Input**: `smooth-track-jumps.complex.input.json`
**Output**: `smooth-track-jumps.complex.output.json`

Description: 9-position segment with two separate jump positions at indices 3 and 7, each smoothed independently using their respective neighbors.

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Implements jump detection via implied speed threshold
- Uses linear interpolation for replacement positions
- Handles consecutive jumps by finding nearest valid neighbors
- Distinct from RemoveTrackJumps (which deletes rather than replaces)

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_mutation()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for result annotations

**Related Tools**:
- [split-tracks-into-legs](./split-tracks-into-legs.1.0.md) - Split tracks by time gaps (preprocessing step)
- [generate-infill-segment](./generate-infill-segment.1.0.md) - Fill gaps between segments

**Input Schemas**:
- [TrackSegmentFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON track segment feature definition

**Legacy**:
- Debrief 3.x: `org.mwc.debrief.core.ContextOperations.SmoothTrackJumps`
- Utility: `findFixesToFix` for jump identification
