---
name: convert-track-to-lightweight
version: 1.0
category: track/manipulation
status: draft
created: 2026-02-07
migrated_from: org.mwc.debrief.core.ContextOperations.ConvertTrackToLightweightTrack
---

# Convert Track to Lightweight Track

> Converts one or more full tracks to lightweight tracks, preserving core positional data while dropping extended metadata such as sensors, position styling, and platform identifiers.

## MCP

**Description**: Converts full track features into lightweight track features. Each full track produces a corresponding lightweight track that preserves the essential positional data (time, coordinates, course, speed) and name/color but discards heavier metadata like sensor attachments, position-level styling, and detailed platform identification.

**When to use**: When the user wants to reduce a track to its minimal representation for performance reasons, bulk display, or export. Lightweight tracks consume less memory and render faster when detailed per-position metadata is not needed.

**Parameters**:
- `features`: One or more full track features to convert (GeoJSON FeatureCollection with `kind = "TRACK"`)

**Returns**: ToolResponse containing one mutated lightweight track feature per input track.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature`

**Constraints**:
- Features must have `properties.kind == "TRACK"`
- At least one feature required

**Defaults**:
- If no custom color is set on the track, defaults to gold (`#FFD700`)
- Lightweight line weight defaults to 2

## Outputs

Returns a **ToolResponse** with mutation content items.

**Response Schema**: `specs/041-document-tool-results/data-model.md#MutationResult`

**Result Type**: `mutation/track/converted`

**Content Items**: One `MutationResult` per converted track:
- `type`: "resource"
- `uri`: `feature://{new_lightweight_track_id}`
- `mimeType`: "application/geo+json"
- `text`: Serialized LightweightTrackFeature

**Annotations** (on each content item):
- `debrief:resultType`: `"mutation/track/converted"`
- `debrief:sourceFeatures`: `["{original_track_id}"]`
- `debrief:label`: `"Converted track {name} to lightweight track"`

## Algorithm

```pseudocode
FUNCTION convert_track_to_lightweight(features: FeatureCollection) -> ToolResponse:
    // Validate inputs
    IF features IS NULL OR features.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    // Filter to full track features only
    tracks = empty list
    FOR EACH feature IN features.features:
        IF feature.properties.kind == "TRACK":
            tracks.append(feature)
        END IF
    END FOR

    IF tracks IS EMPTY:
        RETURN build_error("No track features found in input", "invalid_input", [])
    END IF

    converted_features = empty list
    source_ids = empty list

    FOR EACH track IN tracks:
        source_ids.append(track.id)

        // Create new lightweight track feature
        new_lw_track = {
            type: "Feature",
            id: generate_converted_id(track.id),
            geometry: DEEP_COPY(track.geometry),
            properties: {}
        }

        // Set kind to lightweight track
        new_lw_track.properties.kind = "LIGHTWEIGHT_TRACK"

        // Copy name (drop platform_id — lightweight tracks use platform_name only)
        new_lw_track.properties.platform_name = track.properties.platform_name

        // Copy time bounds
        new_lw_track.properties.start_time = track.properties.start_time
        new_lw_track.properties.end_time = track.properties.end_time

        // Copy positions, preserving only core properties
        new_lw_track.properties.positions = empty list
        FOR EACH position IN track.properties.positions:
            lw_position = {
                time: position.time,
                coordinates: COPY(position.coordinates),
                course: position.course,
                speed: position.speed
            }
            // Drop: label, symbol, color, depth, and any position-specific metadata
            new_lw_track.properties.positions.append(lw_position)
        END FOR

        // Determine color: use custom color from track, or default gold
        source_color = track.properties.style.line.color
        IF source_color IS NULL:
            source_color = "#FFD700"  // DebriefColors.GOLD
        END IF

        // Apply lightweight styling (line only, no point styling)
        new_lw_track.properties.style = {
            line: {
                stroke: true,
                color: source_color,
                weight: 2,
                opacity: 1.0
            }
        }

        // Dropped properties (not carried to lightweight):
        //   - platform_id
        //   - track_type
        //   - sensors
        //   - default_position_style
        //   - point style

        converted_features.append(new_lw_track)
    END FOR

    // Build mutation response
    content_items = build_mutation(
        features: converted_features,
        result_subtype: "track/converted",
        source_feature_ids: source_ids,
        label: "Converted track " + tracks[0].properties.platform_name
            + " to lightweight track"
    )

    RETURN build_response(content_items)
END FUNCTION

FUNCTION generate_converted_id(source_id: string) -> string:
    // Replace "track-" prefix with "lw-track-" and append "-converted"
    // or generate a new UUID-based ID referencing the source
    RETURN derive_id(source_id, "converted")
END FUNCTION
```

### Response Builder Functions

| Function | Result Type | Use When |
|----------|-------------|----------|
| `build_mutation(features, subtype, sources, label)` | `mutation/*` | Converting produces a modified feature |
| `build_error(message, category, affected_ids)` | Error | Reporting validation failures |

### Properties Dropped During Conversion

The following full-track properties are intentionally discarded:

| Property | Reason |
|----------|--------|
| `platform_id` | Lightweight tracks identify by name only |
| `track_type` | Not applicable to lightweight representation |
| `sensors` | Sensor attachments require full track infrastructure |
| `default_position_style` | Lightweight tracks do not support per-position styling |
| `style.point` | Lightweight tracks render lines only, no position markers |
| Per-position metadata (label, symbol, depth) | Reduced to core properties only |

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Return error: `invalid_input`, "Input features required" |
| No full tracks in input | Return error: `invalid_input`, "No track features found" |
| Lightweight track (kind=LIGHTWEIGHT_TRACK) in input | Skip it; only convert full tracks |
| Track with no custom color | Use default gold color (`#FFD700`) |
| Track with no positions | Create lightweight track with empty positions array |
| Multiple tracks | Convert each independently, return multiple content items |
| Track with segments (grouped track) | Flatten all segment positions into a single positions array |
| Null course or speed on a position | Preserve null values in the converted position |
| Track with no style property | Apply default lightweight style with gold color |

## Examples

### Basic Example

**Input** (FeatureCollection with 1 full track):
```json
{
  "features": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "id": "track-ownship",
        "geometry": {
          "type": "LineString",
          "coordinates": [[-1.0, 50.0], [-1.02, 50.01]]
        },
        "properties": {
          "kind": "TRACK",
          "platform_id": "PLAT-001",
          "platform_name": "OWNSHIP",
          "track_type": "SURFACE",
          "start_time": "2024-06-15T10:00:00Z",
          "end_time": "2024-06-15T10:05:00Z",
          "positions": [
            {"time": "2024-06-15T10:00:00Z", "coordinates": [-1.0, 50.0], "course": 45.0, "speed": 12.0},
            {"time": "2024-06-15T10:05:00Z", "coordinates": [-1.02, 50.01], "course": 47.0, "speed": 12.5}
          ],
          "sensors": [{"sensor_id": "S-001", "sensor_name": "Towed Array"}],
          "style": {
            "line": {"stroke": true, "color": "#FF0000", "weight": 3, "opacity": 1.0},
            "point": {"shape": "circle", "radius": 4}
          }
        }
      }
    ]
  }
}
```

**Output** (ToolResponse): A lightweight track with `kind = "LIGHTWEIGHT_TRACK"`, preserving the name "OWNSHIP", positions, and red color. The `sensors`, `platform_id`, `track_type`, and `point` styling are dropped.

### Golden Example Files

See:
- Input: `convert-track-to-lightweight.basic.input.json`
- Output: `convert-track-to-lightweight.basic.output.json`

### Error Response Example

```json
{
  "error": {
    "code": -32000,
    "message": "No track features found in input",
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
- Converts full tracks to lightweight tracks preserving core positional data
- Drops sensors, position styling, platform ID, and track type
- Inherits color from source or defaults to gold
- Reduces line weight from full track default (3) to lightweight default (2)

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_mutation()`, `build_response()`, `build_error()`

**Related Tools**:
- [convert-lightweight-to-track](./convert-lightweight-to-track.1.0.md) - Inverse operation
- [group-tracks](./group-tracks.1.0.md) - Group full tracks together
- [group-lightweight-tracks](./group-lightweight-tracks.1.0.md) - Group lightweight tracks together

**Input Schemas**:
- [TrackFeature](../../../../shared/schemas/src/linkml/geojson.yaml) - GeoJSON full track feature (input type)
- [LightweightTrackFeature](../../../../shared/schemas/src/linkml/geojson.yaml) - GeoJSON lightweight track feature (output type)

**Legacy**:
- Debrief 3.x: `org.mwc.debrief.core.ContextOperations.ConvertTrackToLightweightTrack`
- Color default: `MWC.GUI.Properties.DebriefColors.GOLD`
- Line style: `MWC.GUI.Properties.LineStylePropertyEditor`
