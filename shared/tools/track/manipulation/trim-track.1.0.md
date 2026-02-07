---
name: trim-track
version: 1.0
category: track/manipulation
status: draft
created: 2026-02-07
migrated_from: org.mwc.debrief.core.ContextOperations.TrimTrack
---

# Trim Track

> Trim one or more tracks to a specified time window, permanently removing positions outside the window.

## MCP

**Description**: Trims track features to a specified time period by removing all positions outside the given start/end time window. This is a destructive operation -- removed positions cannot be recovered.

**When to use**: When the user wants to reduce a track to a specific time period, remove extraneous data before/after an event of interest, or clip tracks to match a particular analysis window (typically from the Time Controller).

**Parameters**:
- `features`: Track features to trim (GeoJSON FeatureCollection containing TrackFeature objects)
- `start_time`: ISO 8601 timestamp for the beginning of the retention window
- `end_time`: ISO 8601 timestamp for the end of the retention window

**Returns**: ToolResponse containing modified track features with positions outside the time window removed.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature`

**Constraints**:
- Features must have `properties.kind == "TRACK"`
- At least one track feature required
- `start_time` must be before `end_time`
- Both `start_time` and `end_time` must be valid ISO 8601 timestamps

**Defaults**:
- None (all parameters required)

## Outputs

Returns a **ToolResponse** with mutation content items.

**Response Schema**: `specs/041-document-tool-results/data-model.md#MutationResult`

**Result Type**: `mutation/track/trimmed`

**Content Items**: One `MutationResult` per trimmed track feature containing:
- `type`: "resource"
- `uri`: `feature://{feature_id}`
- `mimeType`: "application/geo+json"
- `text`: Serialized modified TrackFeature with trimmed positions

**Annotations** (on each content item):
- `debrief:resultType`: `"mutation/track/trimmed"`
- `debrief:sourceFeatures`: `["{original_feature_id}"]`
- `debrief:label`: `"Trimmed {track_id} to {start} - {end} ({n} positions retained, {m} removed)"`

## Algorithm

### Overview

For each selected track, remove all position fixes whose timestamps fall outside the specified time window. Update the track's geometry and time bounds accordingly.

### Pseudocode

```pseudocode
FUNCTION trim_track(input: FeatureCollection, start_time: DateTime, end_time: DateTime) -> ToolResponse:
    // Validate inputs
    IF input IS NULL OR input.features IS EMPTY:
        RETURN build_error("No track features found in input", "invalid_input", [])
    END IF

    IF start_time IS NULL OR end_time IS NULL:
        RETURN build_error("start_time and end_time are required", "invalid_input", [])
    END IF

    IF start_time >= end_time:
        RETURN build_error("start_time must be before end_time", "invalid_input", [])
    END IF

    modified_features = empty list

    FOR EACH feature IN input.features:
        // Skip non-track features
        IF feature.properties.kind != "TRACK":
            CONTINUE
        END IF

        original_count = LENGTH(feature.properties.positions)
        retained_positions = empty list

        // Filter positions to those within the time window
        FOR EACH position IN feature.properties.positions:
            IF position.time >= start_time AND position.time <= end_time:
                retained_positions.append(position)
            END IF
        END FOR

        removed_count = original_count - LENGTH(retained_positions)

        // Skip if no positions remain (track entirely outside window)
        IF retained_positions IS EMPTY:
            CONTINUE
        END IF

        // Update feature with trimmed data
        feature.properties.positions = retained_positions
        feature.properties.start_time = retained_positions[0].time
        feature.properties.end_time = retained_positions[LAST].time

        // Rebuild geometry from retained positions
        feature.geometry.coordinates = empty list
        FOR EACH position IN retained_positions:
            feature.geometry.coordinates.append(position.coordinates)
        END FOR

        // Build content item
        content_item = build_mutation(
            features: [feature],
            result_subtype: "track/trimmed",
            source_feature_ids: [feature.id],
            label: "Trimmed " + feature.id + " to " + start_time + " - " + end_time +
                   " (" + LENGTH(retained_positions) + " positions retained, " +
                   removed_count + " removed)"
        )

        modified_features.append(content_item)
    END FOR

    IF modified_features IS EMPTY:
        RETURN build_error("No track features found in input", "invalid_input", [])
    END IF

    RETURN build_response(modified_features)
END FUNCTION
```

### Complexity

- **Time**: O(n * m) where n = number of tracks, m = average positions per track
- **Space**: O(n * m) for the retained position lists

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Return error response with `invalid_input` category |
| No track features in collection | Return error response: "No track features found in input" |
| Non-track features mixed in | Skip non-track features, process only tracks |
| Trim window encompasses entire track | Return track unchanged (all positions retained) |
| Trim window excludes entire track | Skip track (no positions remain); if all tracks excluded, return error |
| start_time equals end_time | Return only positions at exactly that timestamp (if any) |
| start_time after end_time | Return error: "start_time must be before end_time" |
| Null start_time or end_time | Return error: "start_time and end_time are required" |
| Single position within window | Return track with one position; geometry becomes single-coordinate LineString |
| Track with no positions array | Skip track |

## Examples

### Basic Usage

**Input**: `trim-track.basic.input.json`
**Output**: `trim-track.basic.output.json`

Description: Trims a 5-position track (10:00-10:20) to the window 10:05-10:15, retaining 3 of 5 positions.

### Edge Case: Empty Input

**Input**: `trim-track.edge.input.json`
**Output**: `trim-track.edge.output.json`

Description: Demonstrates error handling when an empty feature collection is provided.

### Complex: Multiple Tracks with Mixed Features

**Input**: `trim-track.complex.input.json`
**Output**: `trim-track.complex.output.json`

Description: Trims two tracks to 10:05-10:10 while skipping a non-track sensor feature. Each track retains 2 of 5 positions.

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Supports trimming one or more tracks to a time window
- Destructive operation: positions outside window are permanently removed

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_mutation()`, `build_response()`, `build_error()`

**Related Tools**:
- [interpolate-track](./interpolate-track.1.0.md) - Resample positions at regular intervals
- [merge-tracks](./merge-tracks.1.0.md) - Combine multiple tracks into one

**Input Schemas**:
- [TrackFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON track feature definition

**Legacy**:
- Debrief 3.x: `org.mwc.debrief.core.ContextOperations.TrimTrack`

**External**:
- Feature 049: Language-neutral tool documentation model
