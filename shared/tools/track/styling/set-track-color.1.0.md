---
name: set-track-color
version: 1.0
category: track/styling
status: stable
---

# Set Track Color

> Sets the display color for one or more track features.

## MCP

**Description**: Sets the display color for track features. Modifies the line color property of each track's style, making tracks visually distinct.

**When to use**: When the user wants to change track visibility, distinguish tracks by category, highlight specific tracks, or apply a color coding scheme to their data.

**Parameters**:
- `features`: Track features to modify (GeoJSON FeatureCollection containing TrackFeature objects)
- `color`: CSS color value to apply (e.g., "#FF0000", "red", "rgb(255,0,0)")

**Returns**: ToolResponse containing modified track features with updated line color.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature`

**Constraints**:
- Features must have `properties.kind == "TRACK"`
- At least one feature required
- Color must be a valid CSS color string

**Defaults**:
- None (all parameters required)

## Outputs

Returns a **ToolResponse** with mutation content items.

**Response Schema**: `specs/041-document-tool-results/data-model.md#MutationResult`

**Result Type**: `mutation/track/styled`

**Content Items**: One `MutationResult` per modified track feature containing:
- `type`: "resource"
- `uri`: `feature://{feature_id}`
- `mimeType`: "application/geo+json"
- `text`: Serialized modified TrackFeature

**Annotations** (on each content item):
- `debrief:resultType`: `"mutation/track/styled"`
- `debrief:sourceFeatures`: `["{original_feature_id}"]`
- `debrief:label`: `"Set color to {color} for {n} track(s)"`

## Algorithm

```pseudocode
FUNCTION set_track_color(features: FeatureCollection, color: string) -> ToolResponse:
    // Validate inputs
    IF features IS NULL OR features.features IS EMPTY:
        RETURN build_error("features is required", "invalid_input", [])
    END IF

    IF color IS NULL OR NOT is_valid_css_color(color):
        RETURN build_error("color must be a valid CSS color string", "invalid_input", [])
    END IF

    modified_features = empty list
    source_ids = empty list

    FOR EACH feature IN features.features:
        // Skip non-track features
        IF feature.properties.kind != "TRACK":
            CONTINUE
        END IF

        // Collect source ID for provenance
        source_ids.append(feature.id)

        // Initialize style if not present
        IF feature.properties.style IS NULL:
            feature.properties.style = default_track_style()
        END IF

        IF feature.properties.style.line IS NULL:
            feature.properties.style.line = default_line_properties()
        END IF

        // Apply color to line properties
        feature.properties.style.line.color = color

        modified_features.append(feature)
    END FOR

    IF modified_features IS EMPTY:
        RETURN build_error("No track features found in input", "invalid_input", [])
    END IF

    // Build mutation response
    content_items = build_mutation(
        features: modified_features,
        result_subtype: "track/styled",
        source_feature_ids: source_ids,
        label: "Set color to " + color + " for " + LENGTH(modified_features) + " track(s)"
    )

    RETURN build_response(content_items)
END FUNCTION

FUNCTION default_track_style() -> TrackStyle:
    RETURN {
        line: default_line_properties(),
        point: default_point_properties()
    }
END FUNCTION

FUNCTION default_line_properties() -> LineProperties:
    RETURN {
        stroke: true,
        color: "#3388ff",
        weight: 3,
        opacity: 1.0
    }
END FUNCTION

FUNCTION default_point_properties() -> PointProperties:
    RETURN {
        shape: "circle",
        radius: 4,
        fill: true,
        fill_color: "#3388ff",
        fill_opacity: 0.8,
        stroke: true,
        color: "#ffffff",
        weight: 1,
        opacity: 1.0
    }
END FUNCTION

FUNCTION is_valid_css_color(color: string) -> boolean:
    // Accept hex colors (#RGB, #RRGGBB, #RRGGBBAA)
    // Accept named colors (red, blue, etc.)
    // Accept rgb(), rgba(), hsl(), hsla() functions
    RETURN color matches CSS color pattern
END FUNCTION
```

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Return error response: `invalid_input`, "No track features found in input" |
| Non-track features mixed in | Skip non-track features, process only tracks |
| Feature with no style property | Initialize with default TrackStyle before applying color |
| Feature with style but no line | Initialize line with default LineProperties before applying color |
| Invalid color string (e.g., "notacolor") | Return error response: `invalid_input`, "color must be a valid CSS color string" |
| Color with alpha channel (#RRGGBBAA) | Accept and apply the color including alpha |
| Named color (e.g., "red") | Accept and apply the named color |
| RGB/RGBA function (e.g., "rgb(255,0,0)") | Accept and apply the function notation |
| Null features parameter | Return error response: `invalid_input`, "features is required" |
| Null color parameter | Return error response: `invalid_input`, "color must be a valid CSS color string" |

## Examples

### Basic Example

**Input** (FeatureCollection):
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": "track-001",
      "geometry": {
        "type": "LineString",
        "coordinates": [[-1.0, 50.0], [-1.1, 50.1]]
      },
      "properties": {
        "kind": "TRACK",
        "platform_id": "VESSEL-A",
        "platform_name": "Vessel Alpha",
        "track_type": "SURFACE",
        "start_time": "2024-01-01T00:00:00Z",
        "end_time": "2024-01-01T01:00:00Z",
        "positions": [
          {"time": "2024-01-01T00:00:00Z", "coordinates": [-1.0, 50.0]},
          {"time": "2024-01-01T01:00:00Z", "coordinates": [-1.1, 50.1]}
        ],
        "style": {
          "line": {"stroke": true, "color": "#3388ff", "weight": 3, "opacity": 1.0},
          "point": {"shape": "circle", "radius": 4, "fill": true, "fill_color": "#3388ff", "fill_opacity": 0.8, "stroke": true, "color": "#ffffff", "weight": 1, "opacity": 1.0}
        },
        "default_position_style": {"show_symbol": true, "symbol": "circle", "show_label": false}
      }
    }
  ]
}
```

**Color parameter**: `"#FF0000"`

**Output** (ToolResponse):
```json
{
  "content": [
    {
      "type": "resource",
      "uri": "feature://track-001",
      "mimeType": "application/geo+json",
      "text": "{\"type\":\"Feature\",\"id\":\"track-001\",\"geometry\":{\"type\":\"LineString\",\"coordinates\":[[-1.0,50.0],[-1.1,50.1]]},\"properties\":{\"kind\":\"TRACK\",\"platform_id\":\"VESSEL-A\",\"style\":{\"line\":{\"color\":\"#FF0000\",\"stroke\":true,\"weight\":3,\"opacity\":1.0}}}}",
      "annotations": {
        "debrief:resultType": "mutation/track/styled",
        "debrief:sourceFeatures": ["track-001"],
        "debrief:label": "Set color to #FF0000 for 1 track(s)"
      }
    }
  ]
}
```

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

### Golden Example Files

See:
- Input: `set-track-color.basic.input.json`
- Output: `set-track-color.basic.output.json`

## Changelog

### 1.0 (2026-02-05)
- Initial release
- Supports hex colors, named colors, and CSS color functions
- Initializes missing style properties with sensible defaults

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_mutation()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for result annotations

**Related Tools**:
- [apply-symbol-style](./apply-symbol-style.1.0.md) - Modify position marker appearance
- [label-interval](./label-interval.1.0.md) - Configure label display intervals
- [symbol-interval](./symbol-interval.1.0.md) - Configure symbol display intervals

**Input Schemas**:
- [TrackFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON track feature definition
- [TrackStyle](../../../schemas/src/linkml/styling.yaml) - Track styling properties
- [LineProperties](../../../schemas/src/linkml/styling.yaml) - Line styling options

**Legacy**:
- Debrief 3.x: `org.mwc.debrief.core.actions.SetTrackColor`
