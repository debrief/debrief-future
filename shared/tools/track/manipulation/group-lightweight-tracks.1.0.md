---
name: group-lightweight-tracks
version: 1.0
category: track/manipulation
status: draft
created: 2026-02-07
migrated_from: org.mwc.debrief.core.ContextOperations.GroupLightweightTracks
---

# Group Lightweight Tracks

> Groups multiple lightweight tracks into a single lightweight track by merging all positions into the earliest track.

## MCP

**Description**: Groups two or more lightweight tracks into a single lightweight track. Tracks are sorted chronologically by start time, the earliest becomes the target, and all positions from the other tracks are moved into it.

**When to use**: When the user wants to combine multiple lightweight tracks that represent the same or related platforms. Unlike full track grouping, lightweight grouping merges positions directly rather than creating named segments.

**Parameters**:
- `features`: Two or more lightweight track features to group (GeoJSON FeatureCollection with `kind = "LIGHTWEIGHT_TRACK"`)

**Returns**: ToolResponse containing a single mutated lightweight track feature with all positions merged.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#LightweightTrackFeature`

**Constraints**:
- All features must have `properties.kind == "LIGHTWEIGHT_TRACK"`
- At least 2 lightweight track features required
- Must not include full tracks (`kind == "TRACK"`) -- those use `group-tracks` instead

**Defaults**:
- None (all parameters required)

## Outputs

Returns a **ToolResponse** with mutation content items.

**Response Schema**: `specs/041-document-tool-results/data-model.md#MutationResult`

**Result Type**: `mutation/track/grouped`

**Content Items**: One `MutationResult` containing the grouped lightweight track:
- `type`: "resource"
- `uri`: `feature://{target_track_id}`
- `mimeType`: "application/geo+json"
- `text`: Serialized grouped LightweightTrackFeature

**Annotations** (on each content item):
- `debrief:resultType`: `"mutation/track/grouped"`
- `debrief:sourceFeatures`: IDs of all input lightweight tracks
- `debrief:label`: `"Grouped {n} lightweight tracks into {target_name}"`

## Algorithm

```pseudocode
FUNCTION group_lightweight_tracks(features: FeatureCollection) -> ToolResponse:
    // Validate inputs
    IF features IS NULL OR features.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    // Filter to lightweight track features only (exclude full tracks)
    lw_tracks = empty list
    FOR EACH feature IN features.features:
        IF feature.properties.kind == "LIGHTWEIGHT_TRACK":
            lw_tracks.append(feature)
        END IF
    END FOR

    IF LENGTH(lw_tracks) < 2:
        RETURN build_error(
            "At least 2 lightweight track features required for grouping",
            "invalid_input", []
        )
    END IF

    // Sort tracks chronologically by start time
    SORT lw_tracks BY feature.properties.start_time ASCENDING

    // Use the first (earliest) track as the target
    target = DEEP_COPY(lw_tracks[0])
    source_ids = empty list

    // Collect all source IDs
    FOR EACH track IN lw_tracks:
        source_ids.append(track.id)
    END FOR

    // Merge positions from all non-target tracks into the target
    all_coordinates = COPY(target.geometry.coordinates)
    merged_positions = COPY(target.properties.positions)

    FOR EACH track IN lw_tracks:
        IF track.id == target.id:
            CONTINUE
        END IF

        // Move all positions from source to target
        FOR EACH position IN track.properties.positions:
            merged_positions.append(position)
        END FOR

        // Accumulate geometry coordinates
        FOR EACH coord IN track.geometry.coordinates:
            all_coordinates.append(coord)
        END FOR
    END FOR

    // Update target with merged data
    target.properties.positions = merged_positions
    target.geometry.coordinates = all_coordinates

    // Update time bounds to span all merged tracks
    target.properties.end_time = lw_tracks[LENGTH(lw_tracks) - 1].properties.end_time

    // Build mutation response
    content_items = build_mutation(
        features: [target],
        result_subtype: "track/grouped",
        source_feature_ids: source_ids,
        label: "Grouped " + LENGTH(lw_tracks) + " lightweight tracks into "
            + target.properties.platform_name
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
| Single lightweight track | Return error: `invalid_input`, "At least 2 lightweight track features required" |
| Mixed TRACK and LIGHTWEIGHT_TRACK | Filter out full TRACK features; group only lightweight tracks; error if fewer than 2 remain |
| All features are full tracks (kind=TRACK) | Return error: `invalid_input`, "At least 2 lightweight track features required" (use `group-tracks` instead) |
| Tracks with identical start times | Stable sort preserves input order; first in input becomes target |
| Null start_time on a track | Return error: `invalid_input`, "Track missing start_time" |
| Tracks with no positions | Include in group but contribute no positions |

## Examples

### Basic Example

**Input** (FeatureCollection with 2 lightweight tracks):
```json
{
  "features": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "id": "lw-track-ownship",
        "properties": {
          "kind": "LIGHTWEIGHT_TRACK",
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
        "id": "lw-track-target1",
        "properties": {
          "kind": "LIGHTWEIGHT_TRACK",
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

**Output** (ToolResponse): A single lightweight track named "OWNSHIP" with all 4 positions merged.

### Golden Example Files

See:
- Input: `group-lightweight-tracks.basic.input.json`
- Output: `group-lightweight-tracks.basic.output.json`

### Error Response Example

```json
{
  "error": {
    "code": -32000,
    "message": "At least 2 lightweight track features required for grouping",
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
- Supports grouping of 2+ lightweight tracks sorted by start time
- Merges positions directly into target (no segment structure)
- Preserves target track's name, style, and identity

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_mutation()`, `build_response()`, `build_error()`

**Related Tools**:
- [group-tracks](./group-tracks.1.0.md) - Same operation for full tracks (uses segments)
- [convert-lightweight-to-track](./convert-lightweight-to-track.1.0.md) - Convert lightweight track to full
- [convert-track-to-lightweight](./convert-track-to-lightweight.1.0.md) - Convert full track to lightweight

**Input Schemas**:
- [LightweightTrackFeature](../../../../shared/schemas/src/linkml/geojson.yaml) - GeoJSON lightweight track feature definition

**Legacy**:
- Debrief 3.x: `org.mwc.debrief.core.ContextOperations.GroupLightweightTracks`
- Core algorithm: `Debrief.Wrappers.Track.LightweightTrackWrapper.groupTracks()`
