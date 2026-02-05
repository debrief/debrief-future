---
name: apply-symbol-style
version: 1.0
category: track/styling
status: stable
---

# Apply Symbol Style

> Applies a symbol style to position markers on track features.

## MCP

**Description**: Applies a symbol style to position markers on track features. Modifies the point styling properties that control how individual positions along the track are displayed.

**When to use**: When the user wants to change how position markers appear on tracks, such as changing the marker shape, size, or color to distinguish different track types or highlight specific data.

**Parameters**:
- `features`: Track features to modify (GeoJSON FeatureCollection containing TrackFeature objects)
- `symbol`: Marker shape to apply (circle, square, diamond, triangle, cross)
- `radius`: Optional marker radius in pixels (default: 4)
- `fill_color`: Optional fill color for markers (CSS color string)

**Returns**: Modified track features with updated point styling properties.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature`

**Constraints**:
- Features must have `properties.kind == "TRACK"`
- At least one feature required
- Symbol must be one of: circle, square, diamond, triangle, cross
- Radius must be positive if provided

**Defaults**:
- `radius`: 4
- `fill_color`: Use existing fill_color or track line color

## Outputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature` with `shared/schemas/src/linkml/styling.yaml#PointProperties`

**Result Type**: `mutation/track/styled`

**Annotations**:
- `sourceFeatures`: IDs of input track features
- `label`: "Applied {symbol} symbol to {n} track(s)"

## Algorithm

```pseudocode
FUNCTION apply_symbol_style(features: FeatureCollection, symbol: string, radius: float?, fill_color: string?) -> FeatureCollection:
    // Validate inputs
    IF features IS NULL OR features.features IS NULL:
        RAISE ValidationError("features is required")
    END IF

    valid_symbols = ["circle", "square", "diamond", "triangle", "cross"]
    IF symbol IS NULL OR symbol NOT IN valid_symbols:
        RAISE ValidationError("symbol must be one of: circle, square, diamond, triangle, cross")
    END IF

    IF radius IS NOT NULL AND radius <= 0:
        RAISE ValidationError("radius must be positive")
    END IF

    IF fill_color IS NOT NULL AND NOT is_valid_css_color(fill_color):
        RAISE ValidationError("fill_color must be a valid CSS color string")
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

        IF feature.properties.style.point IS NULL:
            feature.properties.style.point = default_point_properties()
        END IF

        // Apply symbol
        feature.properties.style.point.shape = symbol

        // Apply radius if provided
        IF radius IS NOT NULL:
            feature.properties.style.point.radius = radius
        END IF

        // Apply fill_color if provided
        IF fill_color IS NOT NULL:
            feature.properties.style.point.fill_color = fill_color
        ELSE IF feature.properties.style.point.fill_color IS NULL:
            // Default to line color if available
            IF feature.properties.style.line IS NOT NULL AND feature.properties.style.line.color IS NOT NULL:
                feature.properties.style.point.fill_color = feature.properties.style.line.color
            END IF
        END IF

        result.features.append(feature)
        processed_count = processed_count + 1
    END FOR

    IF processed_count == 0:
        RAISE ValidationError("No track features found in input")
    END IF

    RETURN result
END FUNCTION
```

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Raise ValidationError("No track features found in input") |
| Non-track features mixed in | Pass through non-track features unchanged, process only tracks |
| Feature with no style property | Initialize with default TrackStyle before applying symbol |
| Invalid symbol name | Raise ValidationError with list of valid symbols |
| Negative radius | Raise ValidationError("radius must be positive") |
| Zero radius | Raise ValidationError("radius must be positive") |
| No fill_color provided, line color exists | Use line color as fill_color |
| No fill_color provided, no line color | Use default fill_color |

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

**Parameters**: `symbol: "diamond"`, `radius: 6`, `fill_color: "#00FF00"`

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
        "track_type": "SURFACE",
        "start_time": "2024-01-01T00:00:00Z",
        "end_time": "2024-01-01T01:00:00Z",
        "positions": [
          {"time": "2024-01-01T00:00:00Z", "coordinates": [-1.0, 50.0]},
          {"time": "2024-01-01T01:00:00Z", "coordinates": [-1.1, 50.1]}
        ],
        "style": {
          "line": {"stroke": true, "color": "#3388ff", "weight": 3, "opacity": 1.0},
          "point": {"shape": "diamond", "radius": 6, "fill": true, "fill_color": "#00FF00", "fill_opacity": 0.8, "stroke": true, "color": "#ffffff", "weight": 1, "opacity": 1.0}
        },
        "default_position_style": {"show_symbol": true, "symbol": "circle", "show_label": false}
      }
    }
  ]
}
```

### Golden Example Files

See:
- Input: `apply-symbol-style.basic.input.json`
- Output: `apply-symbol-style.basic.output.json`

## Changelog

### 1.0 (2026-02-05)
- Initial release
- Supports five symbol shapes: circle, square, diamond, triangle, cross
- Optional radius and fill_color parameters

## References

**Related Tools**:
- [set-track-color](./set-track-color.1.0.md) - Modify track line color
- [label-interval](./label-interval.1.0.md) - Configure label display intervals
- [symbol-interval](./symbol-interval.1.0.md) - Configure symbol display intervals

**Schemas**:
- [TrackFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON track feature definition
- [PointProperties](../../../schemas/src/linkml/styling.yaml) - Point styling options

**Legacy**:
- Debrief 3.x: `org.mwc.debrief.core.actions.SetSymbolStyle`
