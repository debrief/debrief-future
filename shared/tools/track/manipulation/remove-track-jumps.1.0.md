---
name: remove-track-jumps
version: 1.0
category: track/manipulation
status: draft
created: 2026-02-07
migrated_from: org.mwc.debrief.core.ContextOperations.RemoveTrackJumps
---

# Remove Track Jumps

> Detect and smooth position jumps in a track by identifying speed anomalies and applying proportional offset corrections across affected legs.

## MCP

**Description**: Detects sudden position jumps in a track by comparing speeds between consecutive positions, then smooths the affected regions by applying proportional offset corrections. Uses a two-pass algorithm: first identifies jumps where speed exceeds a threshold multiplier of the previous speed, then corrects positions within each jump leg proportionally.

**When to use**: When the user has track data with GPS glitches, data transmission errors, or other anomalies that cause sudden unrealistic position jumps. Typically applied before analysis to clean up noisy track data.

**Parameters**:
- `features`: Track feature(s) to smooth (GeoJSON FeatureCollection with track segment or selected fixes)
- `speed_threshold_multiplier`: Factor above which a speed change is considered a jump (default: 3.0)

**Returns**: ToolResponse containing the modified track feature with jump positions corrected via proportional offset interpolation.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature`

**Constraints**:
- Feature must have `properties.kind == "TRACK"`
- Track must have at least 3 positions (need previous speed to detect jump)
- Positions must have coordinates and time properties

**Defaults**:
- `speed_threshold_multiplier`: 3.0

## Outputs

Returns a **ToolResponse** with mutation content items.

**Response Schema**: `specs/041-document-tool-results/data-model.md#MutationResult`

**Result Type**: `mutation/track/smoothed`

**Content Items**: One `MutationResult` for the smoothed track containing:
- `type`: "resource"
- `uri`: `feature://{feature_id}`
- `mimeType`: "application/geo+json"
- `text`: Serialized modified TrackFeature with corrected positions

**Annotations** (on each content item):
- `debrief:resultType`: `"mutation/track/smoothed"`
- `debrief:sourceFeatures`: `["{original_feature_id}"]`
- `debrief:label`: `"Removed {n} jump(s) from {track_id} ({n} leg(s) corrected with proportional offset)"`

## Algorithm

### Overview

Two-pass algorithm. Pass 1 iterates through positions computing inter-fix speeds and flags jumps where speed exceeds a threshold multiple of the previous speed. Each jump defines a "leg" bounded by known-good positions. Pass 2 corrects positions within each leg by applying a proportionally decreasing offset.

### Pseudocode

```pseudocode
FUNCTION remove_track_jumps(input: FeatureCollection, speed_threshold_multiplier: Float) -> ToolResponse:
    // Validate inputs
    IF input IS NULL OR input.features IS EMPTY:
        RETURN build_error("No track features found in input", "invalid_input", [])
    END IF

    IF speed_threshold_multiplier IS NULL:
        speed_threshold_multiplier = 3.0
    END IF

    // Find track feature
    track = NULL
    FOR EACH feature IN input.features:
        IF feature.properties.kind == "TRACK":
            track = feature
            BREAK
        END IF
    END FOR

    IF track IS NULL:
        RETURN build_error("No track features found in input", "invalid_input", [])
    END IF

    positions = track.properties.positions
    IF LENGTH(positions) < 3:
        RETURN build_error(
            "Track must have at least 3 positions for jump detection",
            "invalid_input",
            [track.id]
        )
    END IF

    // ========================================
    // PASS 1: Detect jumps and define legs
    // ========================================
    legs = empty list
    previous_speed = NULL

    FOR i FROM 1 TO LENGTH(positions) - 1:
        current_speed = calculate_speed(positions[i-1], positions[i])

        IF previous_speed IS NOT NULL AND previous_speed > 0:
            IF current_speed > speed_threshold_multiplier * previous_speed:
                // Jump detected between positions[i-1] and positions[i]
                leg = new Leg()
                leg.start_index = i - 2       // last known-good position before jump
                leg.previous_index = i - 1    // position before the jump
                leg.jump_index = i            // the jumped position
                leg.lock_index = find_lock_point(positions, i, previous_speed, speed_threshold_multiplier)

                // Calculate expected position by extrapolating from pre-jump trajectory
                expected_step_lon = positions[i-1].coordinates[0] - positions[i-2].coordinates[0]
                expected_step_lat = positions[i-1].coordinates[1] - positions[i-2].coordinates[1]
                expected_lon = positions[i-1].coordinates[0] + expected_step_lon
                expected_lat = positions[i-1].coordinates[1] + expected_step_lat

                // Offset = lock_point - (jump_point + extrapolated_step)
                leg.offset_lon = positions[leg.lock_index].coordinates[0] - expected_lon
                leg.offset_lat = positions[leg.lock_index].coordinates[1] - expected_lat

                legs.append(leg)
            END IF
        END IF

        previous_speed = current_speed
    END FOR

    // If no jumps found, return track unchanged
    IF legs IS EMPTY:
        content_items = build_mutation(
            features: [track],
            result_subtype: "track/smoothed",
            source_feature_ids: [track.id],
            label: "No jumps detected in " + track.id + " (track returned unchanged)"
        )
        RETURN build_response(content_items)
    END IF

    // ========================================
    // PASS 2: Apply proportional offsets
    // ========================================
    FOR EACH leg IN legs:
        leg_start_time = positions[leg.jump_index].time
        leg_end_time = positions[leg.lock_index].time
        leg_duration = leg_end_time - leg_start_time

        FOR j FROM leg.jump_index TO leg.lock_index - 1:
            // Calculate proportional factor (1.0 at jump, 0.0 at lock)
            time_into_leg = positions[j].time - leg_start_time
            IF leg_duration > 0:
                proportion = 1.0 - (time_into_leg / leg_duration)
            ELSE:
                proportion = 0.5
            END IF

            // Apply proportional offset correction
            positions[j].coordinates[0] = positions[j].coordinates[0] + (leg.offset_lon * proportion)
            positions[j].coordinates[1] = positions[j].coordinates[1] + (leg.offset_lat * proportion)
        END FOR
    END FOR

    // Recalculate speeds for corrected positions
    FOR i FROM 1 TO LENGTH(positions) - 1:
        positions[i].speed = calculate_speed(positions[i-1], positions[i])
    END FOR

    // Rebuild geometry
    track.geometry.coordinates = empty list
    FOR EACH position IN positions:
        track.geometry.coordinates.append(position.coordinates)
    END FOR

    // Build response
    content_items = build_mutation(
        features: [track],
        result_subtype: "track/smoothed",
        source_feature_ids: [track.id],
        label: "Removed " + LENGTH(legs) + " jump(s) from " + track.id +
               " (" + LENGTH(legs) + " leg(s) corrected with proportional offset)"
    )

    RETURN build_response(content_items)
END FUNCTION

FUNCTION find_lock_point(positions: List, jump_index: Integer, baseline_speed: Float, threshold: Float) -> Integer:
    // Find the next position where speed returns to normal
    FOR i FROM jump_index + 1 TO LENGTH(positions) - 1:
        speed = calculate_speed(positions[i-1], positions[i])
        IF speed <= threshold * baseline_speed:
            RETURN i
        END IF
    END FOR
    // Default to last position if no lock point found
    RETURN LENGTH(positions) - 1
END FUNCTION

FUNCTION calculate_speed(pos_a: Position, pos_b: Position) -> Float:
    distance = haversine_distance(pos_a.coordinates, pos_b.coordinates)
    time_diff = pos_b.time - pos_a.time  // in seconds
    IF time_diff <= 0:
        RETURN 0.0
    END IF
    RETURN distance / time_diff  // meters per second
END FUNCTION
```

### Complexity

- **Time**: O(n * k) where n = total positions, k = number of jump legs (typically k << n, so effectively O(n))
- **Space**: O(k) for the leg definitions

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Return error: "No track features found in input" |
| Track with fewer than 3 positions | Return error: "Track must have at least 3 positions" |
| No jumps detected | Return track unchanged with informational label |
| Jump at the very end of track | Lock point defaults to last position; offset applied to remaining positions |
| Jump at position index 1 | Start index clamps to 0; extrapolation uses first two positions |
| Multiple consecutive jumps | Each jump creates a separate leg; legs may overlap and corrections compound |
| All positions are jumps (erratic data) | Every pair triggers a leg; proportional corrections applied throughout |
| Zero time difference between positions | Speed calculated as 0; no jump detected at that transition |
| Speed threshold of 0 | Every speed change triggers a jump; not recommended |
| Negative speed threshold | Return error: "speed_threshold_multiplier must be positive" |

## Examples

### Basic Usage

**Input**: `remove-track-jumps.basic.input.json`
**Output**: `remove-track-jumps.basic.output.json`

Description: A 6-position track with one obvious jump at position 4 (speed 80 kts vs baseline 10 kts). The jump is detected, and the affected position is corrected via proportional offset to produce a smooth track.

### Edge Case: No Jumps

**Input**: `remove-track-jumps.edge.input.json`
**Output**: `remove-track-jumps.edge.output.json`

Description: A smooth 5-position track with consistent 10-knot speed. No jumps are detected and the track is returned unchanged.

### Complex: Multiple Jumps

**Input**: `remove-track-jumps.complex.input.json`
**Output**: `remove-track-jumps.complex.output.json`

Description: A 10-position track with two separate jump events (at positions 3 and 8). Both jumps are detected and corrected independently, producing a smooth track with consistent spacing.

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Two-pass algorithm: detect then correct
- Proportional offset correction within jump legs
- Configurable speed threshold multiplier

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_mutation()`, `build_response()`, `build_error()`

**Related Tools**:
- [interpolate-track](./interpolate-track.1.0.md) - Resample positions at regular intervals
- [trim-track](./trim-track.1.0.md) - Remove positions outside a time window

**Input Schemas**:
- [TrackFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON track feature definition

**Legacy**:
- Debrief 3.x: `org.mwc.debrief.core.ContextOperations.RemoveTrackJumps`

**External**:
- Feature 049: Language-neutral tool documentation model
