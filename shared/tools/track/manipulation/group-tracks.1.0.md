---
name: group-tracks
version: 1.0
category: track/manipulation
status: draft
created: 2026-02-07
migrated_from: org.mwc.debrief.core.ContextOperations.GroupTracks
---

# Group Tracks

> Groups multiple tracks into a single track containing track segments, using the earliest track as the target.

## MCP

**Description**: Groups two or more tracks into a single composite track. The tracks are sorted chronologically by start time, and the earliest track becomes the target. Each source track's positions are added as a named segment within the target track.

**When to use**: When the user wants to combine multiple related tracks into a single grouped track. Commonly used when separate track legs represent the same platform and should be unified into one composite track with distinct segments.

**Parameters**:
- `features`: Two or more track features to group (GeoJSON FeatureCollection with `kind = "TRACK"`)

**Returns**: ToolResponse containing a single mutated track feature with all source tracks merged as segments.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature`

**Constraints**:
- All features must have `properties.kind == "TRACK"`
- At least 2 track features required
- Track segments must not have overlapping time periods

**Defaults**:
- None (all parameters required)

## Outputs

Returns a **ToolResponse** with mutation content items.

**Response Schema**: `specs/041-document-tool-results/data-model.md#MutationResult`

**Result Type**: `mutation/track/grouped`

**Content Items**: One `MutationResult` containing the grouped track feature:
- `type`: "resource"
- `uri`: `feature://{target_track_id}`
- `mimeType`: "application/geo+json"
- `text`: Serialized grouped TrackFeature with segments

**Annotations** (on each content item):
- `debrief:resultType`: `"mutation/track/grouped"`
- `debrief:sourceFeatures`: IDs of all input tracks
- `debrief:label`: `"Grouped {n} tracks into {target_name}"`

## Algorithm

```pseudocode
FUNCTION group_tracks(features: FeatureCollection) -> ToolResponse:
    // Validate inputs
    IF features IS NULL OR features.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    // Filter to track features only
    tracks = empty list
    FOR EACH feature IN features.features:
        IF feature.properties.kind == "TRACK":
            tracks.append(feature)
        END IF
    END FOR

    IF LENGTH(tracks) < 2:
        RETURN build_error("At least 2 track features required for grouping", "invalid_input", [])
    END IF

    // Sort tracks chronologically by start time
    SORT tracks BY feature.properties.start_time ASCENDING

    // Check for overlapping time periods between segments
    FOR i FROM 0 TO LENGTH(tracks) - 2:
        current_end = tracks[i].properties.end_time
        next_start = tracks[i + 1].properties.start_time
        IF current_end > next_start:
            RETURN build_error(
                "Track segments overlap: " + tracks[i].properties.platform_name
                    + " ends after " + tracks[i + 1].properties.platform_name + " starts",
                "invalid_input",
                [tracks[i].id, tracks[i + 1].id]
            )
        END IF
    END FOR

    // Use the first (earliest) track as the target
    target = DEEP_COPY(tracks[0])
    source_ids = empty list

    // Collect all source IDs
    FOR EACH track IN tracks:
        source_ids.append(track.id)
    END FOR

    // Build segments array from all tracks
    segments = empty list
    all_coordinates = empty list

    FOR EACH track IN tracks:
        segment = {
            name: track.properties.platform_name,
            start_time: track.properties.start_time,
            end_time: track.properties.end_time,
            positions: track.properties.positions
        }
        segments.append(segment)

        // Accumulate all coordinates for the composite geometry
        FOR EACH coord IN track.geometry.coordinates:
            all_coordinates.append(coord)
        END FOR
    END FOR

    // Update the target track
    target.properties.segments = segments
    target.properties.end_time = tracks[LENGTH(tracks) - 1].properties.end_time
    target.geometry.coordinates = all_coordinates

    // Remove the flat positions array (replaced by segments)
    // Retain positions from the target's own original segment if needed
    // The segments array now holds all positional data

    // Build mutation response
    content_items = build_mutation(
        features: [target],
        result_subtype: "track/grouped",
        source_feature_ids: source_ids,
        label: "Grouped " + LENGTH(tracks) + " tracks into " + target.properties.platform_name
    )

    RETURN build_response(content_items)
END FUNCTION
```

### Response Builder Functions

| Function | Result Type | Use When |
|----------|-------------|----------|
| `build_mutation(features, subtype, sources, label)` | `mutation/*` | Grouping modifies the target track |
| `build_error(message, category, affected_ids)` | Error | Reporting validation failures |

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Return error: `invalid_input`, "Input features required" |
| Single track feature | Return error: `invalid_input`, "At least 2 track features required for grouping" |
| Mixed kinds (TRACK and non-TRACK) | Filter out non-TRACK features, group only tracks; error if fewer than 2 tracks remain |
| Overlapping time periods | Return error: `invalid_input`, describing which tracks overlap |
| Tracks with identical start times | Stable sort preserves input order; first in input becomes target |
| Null start_time on a track | Return error: `invalid_input`, "Track missing start_time" |
| Tracks already in a group | Flatten existing segments into the new group |

## Examples

### Basic Example

**Input** (FeatureCollection with 2 tracks):
```json
{
  "features": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "id": "track-ownship",
        "properties": {
          "kind": "TRACK",
          "platform_name": "OWNSHIP",
          "start_time": "2024-06-15T10:00:00Z",
          "end_time": "2024-06-15T10:05:00Z",
          "positions": [
            {"time": "2024-06-15T10:00:00Z", "coordinates": [-1.0, 50.0]},
            {"time": "2024-06-15T10:05:00Z", "coordinates": [-1.02, 50.01]}
          ]
        }
      },
      {
        "type": "Feature",
        "id": "track-target1",
        "properties": {
          "kind": "TRACK",
          "platform_name": "TARGET-1",
          "start_time": "2024-06-15T10:02:00Z",
          "end_time": "2024-06-15T10:07:00Z",
          "positions": [
            {"time": "2024-06-15T10:02:00Z", "coordinates": [-0.95, 50.05]},
            {"time": "2024-06-15T10:07:00Z", "coordinates": [-0.93, 50.03]}
          ]
        }
      }
    ]
  }
}
```

**Output** (ToolResponse): A single grouped track named "OWNSHIP" (earliest start time) with 2 segments.

### Golden Example Files

See:
- Input: `group-tracks.basic.input.json`
- Output: `group-tracks.basic.output.json`

### Error Response Example

```json
{
  "error": {
    "code": -32000,
    "message": "At least 2 track features required for grouping",
    "data": {
      "debrief:errorCategory": "invalid_input",
      "debrief:affectedFeatures": []
    }
  }
}
```

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Supports grouping of 2+ full tracks sorted by start time
- Validates non-overlapping time periods
- Preserves positions as named segments in output

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_mutation()`, `build_response()`, `build_error()`

**Related Tools**:
- [group-lightweight-tracks](./group-lightweight-tracks.1.0.md) - Same operation for lightweight tracks
- [convert-track-to-lightweight](./convert-track-to-lightweight.1.0.md) - Convert full track to lightweight
- [convert-lightweight-to-track](./convert-lightweight-to-track.1.0.md) - Convert lightweight track to full

**Input Schemas**:
- [TrackFeature](../../../../shared/schemas/src/linkml/geojson.yaml) - GeoJSON track feature definition

**Legacy**:
- Debrief 3.x: `org.mwc.debrief.core.ContextOperations.GroupTracks`
- Core algorithm: `Debrief.Wrappers.TrackWrapper.groupTracks()`
