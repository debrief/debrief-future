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
- `symbol`: Optional marker shape to apply (circle, square, diamond, triangle, cross; default: "circle")
- `radius`: Optional marker radius in pixels (default: 4)
- `fill_color`: Optional fill color for markers (CSS color string)

**Returns**: ToolResponse containing MutationResult content items with modified track features.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature`

**Constraints**:
- Features must have `properties.kind == "TRACK"`
- At least one feature required
- Symbol must be one of: circle, square, diamond, triangle, cross (if provided)
- Radius must be positive if provided

**Defaults**:
- `symbol`: "circle"
- `radius`: 4
- `fill_color`: Use existing fill_color or track line color

## Outputs

Tools return a **ToolResponse** containing one or more content items with Debrief annotations.

**Response Schema**: `specs/041-document-tool-results/data-model.md#ToolResponse`

**Result Type**: `mutation/track/styled`

**Content Item Structure** (MutationResult):
```json
{
  "type": "resource",
  "uri": "feature://{feature-id}",
  "mimeType": "application/geo+json",
  "text": "{...serialized modified TrackFeature...}",
  "annotations": {
    "debrief:resultType": "mutation/track/styled",
    "debrief:sourceFeatures": ["{original-feature-id}"],
    "debrief:label": "Applied {symbol} symbol to {n} track(s)"
  }
}
```

**Annotations** (required on each content item):
- `debrief:resultType`: `mutation/track/styled`
- `debrief:sourceFeatures`: IDs of input track features
- `debrief:label`: Human-readable description (e.g., "Applied diamond symbol to 3 track(s)")

## Algorithm

```pseudocode
FUNCTION apply_symbol_style(features: FeatureCollection, symbol: string?, radius: float?, fill_color: string?) -> ToolResponse:
    // Validate inputs
    IF features IS NULL OR features.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    // Default symbol to "circle" if not provided
    IF symbol IS NULL:
        symbol = "circle"
    END IF

    valid_symbols = ["circle", "square", "diamond", "triangle", "cross"]
    IF symbol NOT IN valid_symbols:
        RETURN build_error("symbol must be one of: circle, square, diamond, triangle, cross", "invalid_input", [])
    END IF

    IF radius IS NOT NULL AND radius <= 0:
        RETURN build_error("radius must be positive", "invalid_input", [])
    END IF

    IF fill_color IS NOT NULL AND NOT is_valid_css_color(fill_color):
        RETURN build_error("fill_color must be a valid CSS color string", "invalid_input", [])
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

        modified_features.append(feature)
    END FOR

    IF modified_features IS EMPTY:
        RETURN build_error("No track features found in input", "invalid_input", [])
    END IF

    // Build response with mutation result type
    content_items = build_mutation(
        features: modified_features,
        result_subtype: "track/styled",
        source_feature_ids: source_ids,
        label: "Applied {symbol} symbol to {n} track(s)"
    )

    RETURN build_response(content_items)
END FUNCTION
```

### Response Builder Functions

| Function | Result Type | Use When |
|----------|-------------|----------|
| `build_mutation(features, subtype, sources, label)` | `mutation/*` | Modifying existing features |
| `build_error(message, category, affected_ids)` | Error | Reporting failures |
| `build_response(content_items)` | ToolResponse | Wrapping content for return |

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Return error response with `invalid_input` category |
| No track features in input | Return error response: "No track features found in input" |
| Non-track features mixed in | Skip non-track features, process only tracks |
| Feature with no style property | Initialize with default TrackStyle before applying symbol |
| No symbol provided | Default to "circle" |
| Invalid symbol name | Return error response with list of valid symbols |
| Negative radius | Return error response: "radius must be positive" |
| Zero radius | Return error response: "radius must be positive" |
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

**Output** (ToolResponse format):
```json
{
  "content": [
    {
      "type": "resource",
      "uri": "feature://track-001",
      "mimeType": "application/geo+json",
      "text": "{\"type\":\"Feature\",\"id\":\"track-001\",\"geometry\":{\"type\":\"LineString\",\"coordinates\":[[-1.0,50.0],[-1.1,50.1]]},\"properties\":{\"kind\":\"TRACK\",\"platform_id\":\"VESSEL-A\",\"track_type\":\"SURFACE\",\"start_time\":\"2024-01-01T00:00:00Z\",\"end_time\":\"2024-01-01T01:00:00Z\",\"positions\":[{\"time\":\"2024-01-01T00:00:00Z\",\"coordinates\":[-1.0,50.0]},{\"time\":\"2024-01-01T01:00:00Z\",\"coordinates\":[-1.1,50.1]}],\"style\":{\"line\":{\"stroke\":true,\"color\":\"#3388ff\",\"weight\":3,\"opacity\":1.0},\"point\":{\"shape\":\"diamond\",\"radius\":6,\"fill\":true,\"fill_color\":\"#00FF00\",\"fill_opacity\":0.8,\"stroke\":true,\"color\":\"#ffffff\",\"weight\":1,\"opacity\":1.0}},\"default_position_style\":{\"show_symbol\":true,\"symbol\":\"circle\",\"show_label\":false}}}",
      "annotations": {
        "debrief:resultType": "mutation/track/styled",
        "debrief:sourceFeatures": ["track-001"],
        "debrief:label": "Applied diamond symbol to 1 track(s)"
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
    "message": "symbol must be one of: circle, square, diamond, triangle, cross",
    "data": {
      "debrief:errorCategory": "invalid_input",
      "debrief:affectedFeatures": []
    }
  }
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

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Complete response structure
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_mutation()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for annotations

**Related Tools**:
- [set-track-color](./set-track-color.1.0.md) - Modify track line color
- [label-interval](./label-interval.1.0.md) - Configure label display intervals
- [symbol-interval](./symbol-interval.1.0.md) - Configure symbol display intervals

**Schemas**:
- [TrackFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON track feature definition
- [PointProperties](../../../schemas/src/linkml/styling.yaml) - Point styling options

**Legacy**:
- Debrief 3.x: `org.mwc.debrief.core.actions.SetSymbolStyle`
