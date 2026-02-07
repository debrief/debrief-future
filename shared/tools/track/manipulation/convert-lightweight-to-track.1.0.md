---
name: convert-lightweight-to-track
version: 1.0
category: track/manipulation
status: draft
created: 2026-02-07
migrated_from: org.mwc.debrief.core.ContextOperations.ConvertLightweightTrackToTrack
---

# Convert Lightweight Track to Track

> Converts one or more lightweight tracks to full tracks, preserving all positions and adding full track metadata and styling defaults.

## MCP

**Description**: Converts lightweight track features into full track features. Each lightweight track produces a corresponding full track that inherits the name, color, and all positional data (time, coordinates, course, speed) while gaining the richer metadata structure of a full track including point styling and platform identification.

**When to use**: When the user needs the full feature set of a track (such as sensor attachments, symbol styling, or detailed position metadata) on data that was originally loaded as a lightweight track. This is common when lightweight tracks from bulk imports need to be promoted for detailed analysis.

**Parameters**:
- `features`: One or more lightweight track features to convert (GeoJSON FeatureCollection with `kind = "LIGHTWEIGHT_TRACK"`)

**Returns**: ToolResponse containing one mutated full track feature per input lightweight track.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#LightweightTrackFeature`

**Constraints**:
- Features must have `properties.kind == "LIGHTWEIGHT_TRACK"`
- At least one feature required
- Features must NOT already be full tracks (`kind == "TRACK"`)

**Defaults**:
- If no custom color is set on the lightweight track, defaults to gold (`#FFD700`)
- Full track style defaults are applied (point shape, radius, fill properties)

## Outputs

Returns a **ToolResponse** with mutation content items.

**Response Schema**: `specs/041-document-tool-results/data-model.md#MutationResult`

**Result Type**: `mutation/track/converted`

**Content Items**: One `MutationResult` per converted track:
- `type`: "resource"
- `uri`: `feature://{new_track_id}`
- `mimeType`: "application/geo+json"
- `text`: Serialized full TrackFeature

**Annotations** (on each content item):
- `debrief:resultType`: `"mutation/track/converted"`
- `debrief:sourceFeatures`: `["{original_lightweight_track_id}"]`
- `debrief:label`: `"Converted lightweight track {name} to full track"`

## Algorithm

```pseudocode
FUNCTION convert_lightweight_to_track(features: FeatureCollection) -> ToolResponse:
    // Validate inputs
    IF features IS NULL OR features.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    // Filter to lightweight track features only
    lw_tracks = empty list
    FOR EACH feature IN features.features:
        IF feature.properties.kind == "LIGHTWEIGHT_TRACK":
            lw_tracks.append(feature)
        END IF
    END FOR

    IF lw_tracks IS EMPTY:
        RETURN build_error("No lightweight track features found in input", "invalid_input", [])
    END IF

    converted_features = empty list
    source_ids = empty list

    FOR EACH lw_track IN lw_tracks:
        source_ids.append(lw_track.id)

        // Create new full track feature
        new_track = {
            type: "Feature",
            id: generate_converted_id(lw_track.id),
            geometry: DEEP_COPY(lw_track.geometry),
            properties: {}
        }

        // Set kind to full track
        new_track.properties.kind = "TRACK"

        // Copy name
        new_track.properties.platform_name = lw_track.properties.platform_name

        // Set default track type
        new_track.properties.track_type = "SURFACE"

        // Copy time bounds
        new_track.properties.start_time = lw_track.properties.start_time
        new_track.properties.end_time = lw_track.properties.end_time

        // Copy all positions, preserving time, coordinates, course, speed
        new_track.properties.positions = empty list
        FOR EACH position IN lw_track.properties.positions:
            new_position = {
                time: position.time,
                coordinates: COPY(position.coordinates),
                course: position.course,
                speed: position.speed
            }
            new_track.properties.positions.append(new_position)
        END FOR

        // Determine color: use custom color from lightweight track, or default gold
        source_color = lw_track.properties.style.line.color
        IF source_color IS NULL:
            source_color = "#FFD700"  // DebriefColors.GOLD
        END IF

        // Apply full track styling with inherited color
        new_track.properties.style = {
            line: {
                stroke: true,
                color: source_color,
                weight: 3,
                opacity: 1.0
            },
            point: {
                shape: "circle",
                radius: 4,
                fill: true,
                fill_color: source_color,
                fill_opacity: 0.8,
                stroke: true,
                color: "#ffffff",
                weight: 1,
                opacity: 1.0
            }
        }

        converted_features.append(new_track)
    END FOR

    // Build mutation response
    content_items = build_mutation(
        features: converted_features,
        result_subtype: "track/converted",
        source_feature_ids: source_ids,
        label: "Converted lightweight track "
            + lw_tracks[0].properties.platform_name + " to full track"
    )

    RETURN build_response(content_items)
END FUNCTION

FUNCTION generate_converted_id(source_id: string) -> string:
    // Replace "lw-track-" prefix with "track-" and append "-converted"
    // or generate a new UUID-based ID referencing the source
    RETURN derive_id(source_id, "converted")
END FUNCTION
```

### Response Builder Functions

| Function | Result Type | Use When |
|----------|-------------|----------|
| `build_mutation(features, subtype, sources, label)` | `mutation/*` | Converting produces a modified feature |
| `build_error(message, category, affected_ids)` | Error | Reporting validation failures |

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Return error: `invalid_input`, "Input features required" |
| No lightweight tracks in input | Return error: `invalid_input`, "No lightweight track features found" |
| Full track (kind=TRACK) in input | Skip it; only convert lightweight tracks |
| Lightweight track with no custom color | Use default gold color (`#FFD700`) |
| Lightweight track with no positions | Create full track with empty positions array |
| Multiple lightweight tracks | Convert each independently, return multiple content items |
| Null course or speed on a position | Preserve null values in the converted position |
| Lightweight track with no style property | Apply full default track style with gold color |

## Examples

### Basic Example

**Input** (FeatureCollection with 1 lightweight track):
```json
{
  "features": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "id": "lw-track-ownship",
        "geometry": {
          "type": "LineString",
          "coordinates": [[-1.0, 50.0], [-1.02, 50.01]]
        },
        "properties": {
          "kind": "LIGHTWEIGHT_TRACK",
          "platform_name": "OWNSHIP",
          "start_time": "2024-06-15T10:00:00Z",
          "end_time": "2024-06-15T10:05:00Z",
          "positions": [
            {"time": "2024-06-15T10:00:00Z", "coordinates": [-1.0, 50.0], "course": 45.0, "speed": 12.0},
            {"time": "2024-06-15T10:05:00Z", "coordinates": [-1.02, 50.01], "course": 47.0, "speed": 12.5}
          ],
          "style": {
            "line": {"stroke": true, "color": "#FF0000", "weight": 2, "opacity": 1.0}
          }
        }
      }
    ]
  }
}
```

**Output** (ToolResponse): A full track with `kind = "TRACK"`, inheriting the name "OWNSHIP", all positions, and the red color, with added point styling defaults.

### Golden Example Files

See:
- Input: `convert-lightweight-to-track.basic.input.json`
- Output: `convert-lightweight-to-track.basic.output.json`

### Error Response Example

```json
{
  "error": {
    "code": -32000,
    "message": "No lightweight track features found in input",
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
- Converts lightweight tracks to full tracks preserving all positional data
- Inherits color from source or defaults to gold
- Adds full track styling (line and point properties)

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_mutation()`, `build_response()`, `build_error()`

**Related Tools**:
- [convert-track-to-lightweight](./convert-track-to-lightweight.1.0.md) - Inverse operation
- [group-tracks](./group-tracks.1.0.md) - Group full tracks together
- [group-lightweight-tracks](./group-lightweight-tracks.1.0.md) - Group lightweight tracks together

**Input Schemas**:
- [LightweightTrackFeature](../../../../shared/schemas/src/linkml/geojson.yaml) - GeoJSON lightweight track feature
- [TrackFeature](../../../../shared/schemas/src/linkml/geojson.yaml) - GeoJSON full track feature (output type)

**Legacy**:
- Debrief 3.x: `org.mwc.debrief.core.ContextOperations.ConvertLightweightTrackToTrack`
- Color default: `MWC.GUI.Properties.DebriefColors.GOLD`
