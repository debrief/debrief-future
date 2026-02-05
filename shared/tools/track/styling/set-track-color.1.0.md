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

**Returns**: Modified track features with updated line color in their style properties.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature`

**Constraints**:
- Features must have `properties.kind == "TRACK"`
- At least one feature required
- Color must be a valid CSS color string

**Defaults**:
- None (all parameters required)

## Outputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature` with `shared/schemas/src/linkml/styling.yaml#TrackStyle`

**Result Type**: `mutation/track/styled`

**Annotations**:
- `sourceFeatures`: IDs of input track features
- `label`: "Set color to {color} for {n} track(s)"

## Algorithm

```pseudocode
FUNCTION set_track_color(features: FeatureCollection, color: string) -> FeatureCollection:
    // Validate inputs
    IF features IS NULL OR features.features IS NULL:
        RAISE ValidationError("features is required")
    END IF

    IF color IS NULL OR NOT is_valid_css_color(color):
        RAISE ValidationError("color must be a valid CSS color string")
    END IF

    result = empty FeatureCollection
    processed_count = 0

    FOR EACH feature IN features.features:
        // Skip non-track features
        IF feature.properties.kind != "TRACK":
            result.features.append(feature)  // Pass through unchanged
            CONTINUE
        END IF

        // Initialize style if not present
        IF feature.properties.style IS NULL:
            feature.properties.style = default_track_style()
        END IF

        IF feature.properties.style.line IS NULL:
            feature.properties.style.line = default_line_properties()
        END IF

        // Apply color to line properties
        feature.properties.style.line.color = color

        result.features.append(feature)
        processed_count = processed_count + 1
    END FOR

    IF processed_count == 0:
        RAISE ValidationError("No track features found in input")
    END IF

    RETURN result
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
| Empty feature collection | Raise ValidationError("No track features found in input") |
| Non-track features mixed in | Pass through non-track features unchanged, process only tracks |
| Feature with no style property | Initialize with default TrackStyle before applying color |
| Feature with style but no line | Initialize line with default LineProperties before applying color |
| Invalid color string (e.g., "notacolor") | Raise ValidationError("color must be a valid CSS color string") |
| Color with alpha channel (#RRGGBBAA) | Accept and apply the color including alpha |
| Named color (e.g., "red") | Accept and apply the named color |
| RGB/RGBA function (e.g., "rgb(255,0,0)") | Accept and apply the function notation |
| Null features parameter | Raise ValidationError("features is required") |
| Null color parameter | Raise ValidationError("color must be a valid CSS color string") |

## Examples

### Basic Example

**Input**:
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

**Output**:
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
          "line": {"stroke": true, "color": "#FF0000", "weight": 3, "opacity": 1.0},
          "point": {"shape": "circle", "radius": 4, "fill": true, "fill_color": "#3388ff", "fill_opacity": 0.8, "stroke": true, "color": "#ffffff", "weight": 1, "opacity": 1.0}
        },
        "default_position_style": {"show_symbol": true, "symbol": "circle", "show_label": false}
      }
    }
  ]
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

**Related Tools**:
- [apply-symbol-style](./apply-symbol-style.1.0.md) - Modify position marker appearance
- [label-interval](./label-interval.1.0.md) - Configure label display intervals
- [symbol-interval](./symbol-interval.1.0.md) - Configure symbol display intervals

**Schemas**:
- [TrackFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON track feature definition
- [TrackStyle](../../../schemas/src/linkml/styling.yaml) - Track styling properties
- [LineProperties](../../../schemas/src/linkml/styling.yaml) - Line styling options

**Legacy**:
- Debrief 3.x: `org.mwc.debrief.core.actions.SetTrackColor`
