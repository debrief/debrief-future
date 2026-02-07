---
name: interpolate-track
version: 1.0
category: track/manipulation
status: draft
created: 2026-02-07
migrated_from: org.mwc.debrief.core.ContextOperations.InterpolateTrack
---

# Interpolate Track

> Resample a track's positions at regular time intervals, replacing the original positions with linearly interpolated ones.

## MCP

**Description**: Resamples a track at regular time intervals using linear interpolation between existing positions. Replaces all original positions with new evenly-spaced positions. This is a destructive operation -- original positions are discarded.

**When to use**: When the user needs evenly-spaced track positions for analysis, comparison between tracks sampled at different rates, or to regularize an irregularly-sampled track.

**Parameters**:
- `features`: Track feature to interpolate (GeoJSON FeatureCollection containing exactly one TrackFeature)
- `interval_seconds`: Time interval in seconds between interpolated positions

**Returns**: ToolResponse containing the modified track feature with regularly-spaced interpolated positions.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature`

**Constraints**:
- Exactly one track feature required (single selection)
- Feature must have `properties.kind == "TRACK"`
- Track must have at least 2 positions for interpolation
- `interval_seconds` must be a positive integer

**Defaults**:
- None (all parameters required; interval is typically selected via intermediate UI)

## Outputs

Returns a **ToolResponse** with mutation content items.

**Response Schema**: `specs/041-document-tool-results/data-model.md#MutationResult`

**Result Type**: `mutation/track/interpolated`

**Content Items**: One `MutationResult` for the interpolated track containing:
- `type`: "resource"
- `uri`: `feature://{feature_id}`
- `mimeType`: "application/geo+json"
- `text`: Serialized modified TrackFeature with interpolated positions

**Annotations** (on each content item):
- `debrief:resultType`: `"mutation/track/interpolated"`
- `debrief:sourceFeatures`: `["{original_feature_id}"]`
- `debrief:label`: `"Interpolated {track_id} at {interval}s intervals ({n} positions from original {m})"`

## Algorithm

### Overview

Enable the track's built-in interpolation capability, sample new positions at regular time steps from start to end, then replace all original positions with the interpolated ones.

### Pseudocode

```pseudocode
FUNCTION interpolate_track(input: FeatureCollection, interval_seconds: Integer) -> ToolResponse:
    // Validate inputs
    IF input IS NULL OR input.features IS EMPTY:
        RETURN build_error("No track features found in input", "invalid_input", [])
    END IF

    IF interval_seconds IS NULL OR interval_seconds <= 0:
        RETURN build_error("interval_seconds must be a positive integer", "invalid_input", [])
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

    IF LENGTH(track.properties.positions) < 2:
        RETURN build_error(
            "Track " + track.id + " has fewer than 2 positions; interpolation requires at least 2",
            "invalid_input",
            [track.id]
        )
    END IF

    original_count = LENGTH(track.properties.positions)
    start_time = track.properties.positions[0].time
    end_time = track.properties.positions[LAST].time
    interval = interval_seconds AS duration

    // Phase 1: Enable interpolation on the track
    enable_interpolation(track)

    // Phase 2: Sample interpolated positions at regular intervals
    new_positions = empty list

    // Include start position
    first_pos = get_interpolated_position(track, start_time)
    new_positions.append(first_pos)

    // Iterate from start+interval to end
    current_time = start_time + interval
    WHILE current_time < end_time:
        interpolated_pos = get_interpolated_position(track, current_time)
        new_positions.append(interpolated_pos)
        current_time = current_time + interval
    END WHILE

    // Include end position if not already at an interval boundary
    IF current_time != end_time AND new_positions[LAST].time != end_time:
        last_pos = get_interpolated_position(track, end_time)
        new_positions.append(last_pos)
    END IF

    // Phase 3: Replace positions
    track.properties.positions = new_positions

    // Rebuild geometry from new positions
    track.geometry.coordinates = empty list
    FOR EACH position IN new_positions:
        track.geometry.coordinates.append(position.coordinates)
    END FOR

    // Phase 4: Disable interpolation
    disable_interpolation(track)

    // Build response
    content_items = build_mutation(
        features: [track],
        result_subtype: "track/interpolated",
        source_feature_ids: [track.id],
        label: "Interpolated " + track.id + " at " + interval_seconds + "s intervals (" +
               LENGTH(new_positions) + " positions from original " + original_count + ")"
    )

    RETURN build_response(content_items)
END FUNCTION

FUNCTION get_interpolated_position(track: TrackFeature, time: DateTime) -> Position:
    // Find bracketing positions
    before = NULL
    after = NULL

    FOR EACH position IN track.properties.positions:
        IF position.time <= time:
            before = position
        END IF
        IF position.time >= time AND after IS NULL:
            after = position
        END IF
    END FOR

    // Exact match
    IF before.time == time:
        RETURN clone(before)
    END IF

    // Linear interpolation
    fraction = (time - before.time) / (after.time - before.time)

    interpolated = new Position()
    interpolated.time = time
    interpolated.coordinates[0] = before.coordinates[0] + fraction * (after.coordinates[0] - before.coordinates[0])
    interpolated.coordinates[1] = before.coordinates[1] + fraction * (after.coordinates[1] - before.coordinates[1])
    interpolated.course = interpolate_angle(before.course, after.course, fraction)
    interpolated.speed = before.speed + fraction * (after.speed - before.speed)
    interpolated.visible = true

    RETURN interpolated
END FUNCTION
```

### Complexity

- **Time**: O(n + k) where n = original positions, k = new interpolated positions (k = ceil(duration / interval))
- **Space**: O(k) for the new position list

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Return error response with `invalid_input` category |
| Track with fewer than 2 positions | Return error: "Track {id} has fewer than 2 positions" |
| Interval larger than track duration | Return only start and end positions |
| Interval exactly divides track duration | Return positions at exact interval boundaries (no leftover end position) |
| Interval does not divide evenly | Include final position at track end time |
| Interval of zero or negative | Return error: "interval_seconds must be a positive integer" |
| Track with only 2 positions | Interpolate between them at the given interval |
| Multiple track features provided | Process only the first track (single selection tool) |
| Irregular original spacing | Interpolate linearly between whatever positions bracket each time step |

## Examples

### Basic Usage

**Input**: `interpolate-track.basic.input.json`
**Output**: `interpolate-track.basic.output.json`

Description: Resamples a 5-position track (5-min intervals, 10:00-10:20) at 10-minute intervals, producing 3 evenly-spaced positions at 10:00, 10:10, and 10:20.

### Edge Case: Single Position Track

**Input**: `interpolate-track.edge.input.json`
**Output**: `interpolate-track.edge.output.json`

Description: Demonstrates error handling when a track has only one position, which is insufficient for interpolation.

### Complex: Irregular Intervals

**Input**: `interpolate-track.complex.input.json`
**Output**: `interpolate-track.complex.output.json`

Description: Resamples a track with irregularly-spaced positions (gaps of 2, 7, 2, and 7 minutes) at a regular 6-minute interval, producing 4 evenly-spaced positions.

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Linear interpolation of coordinates, course, and speed
- Intermediate UI for interval selection (not modeled in spec)

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_mutation()`, `build_response()`, `build_error()`

**Related Tools**:
- [trim-track](./trim-track.1.0.md) - Remove positions outside a time window
- [remove-track-jumps](./remove-track-jumps.1.0.md) - Smooth position jumps

**Input Schemas**:
- [TrackFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON track feature definition

**Legacy**:
- Debrief 3.x: `org.mwc.debrief.core.ContextOperations.InterpolateTrack`

**External**:
- Feature 049: Language-neutral tool documentation model
