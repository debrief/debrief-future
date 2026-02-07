---
name: reformat-fixes
version: 1.0
category: track/styling
status: draft
created: 2026-02-07
migrated_from: Debrief.Tools.FilterOperations.ReformatFixes
---

# Reformat Fixes

> Reformat position fix display symbols and labels across selected tracks.

## MCP

**Description**: Reformats the display of position fixes on track features by changing the symbol type and label visibility for every fix in the selected tracks. This is a batch styling operation that applies uniform formatting to all positions.

**When to use**: When the user wants to change how position fixes are displayed on one or more tracks, such as switching all fix symbols from squares to diamonds, hiding or showing fix labels, or applying a consistent visual format across multiple tracks.

**Parameters**:
- `features`: Track features to modify (GeoJSON FeatureCollection containing TrackFeature objects)
- `symbol`: Symbol shape to apply to all fixes (e.g., "SQUARE", "CIRCLE", "DIAMOND", "TRIANGLE", "CROSS")
- `show_label`: Whether to display labels on fixes (boolean)

**Returns**: ToolResponse containing MutationResult content items with all position fixes reformatted.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature`

**Constraints**:
- Features must have `properties.kind == "TRACK"`
- At least one feature required
- Symbol must be one of: SQUARE, CIRCLE, DIAMOND, TRIANGLE, CROSS
- Each track must contain a `positions` array

**Defaults**:
- `show_label`: true (labels shown by default)

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
    "debrief:label": "Reformatted fixes to {symbol} symbol, labels {shown|hidden} for {n} track(s)"
  }
}
```

**Annotations** (required on each content item):
- `debrief:resultType`: `mutation/track/styled`
- `debrief:sourceFeatures`: IDs of input track features
- `debrief:label`: Human-readable description (e.g., "Reformatted fixes to DIAMOND symbol, labels hidden for 3 track(s)")

## Algorithm

```pseudocode
FUNCTION reformat_fixes(features: FeatureCollection, symbol: string, show_label: boolean) -> ToolResponse:
    // Validate inputs
    IF features IS NULL OR features.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    valid_symbols = ["SQUARE", "CIRCLE", "DIAMOND", "TRIANGLE", "CROSS"]
    IF symbol IS NULL OR symbol NOT IN valid_symbols:
        RETURN build_error("symbol must be one of: SQUARE, CIRCLE, DIAMOND, TRIANGLE, CROSS", "invalid_input", [])
    END IF

    // Default show_label to true if not provided
    IF show_label IS NULL:
        show_label = true
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

        // Reformat each position fix
        IF feature.properties.positions IS NOT NULL:
            FOR EACH position IN feature.properties.positions:
                // Set the symbol type on each fix
                position.symbol = symbol

                // Set label visibility on each fix
                position.show_label = show_label
            END FOR
        END IF

        // Update the track-level default position style to match
        IF feature.properties.default_position_style IS NULL:
            feature.properties.default_position_style = {
                show_symbol: true,
                symbol: symbol,
                show_label: show_label
            }
        ELSE:
            feature.properties.default_position_style.symbol = symbol
            feature.properties.default_position_style.show_label = show_label
        END IF

        // Update point style shape to match new symbol
        IF feature.properties.style IS NOT NULL AND feature.properties.style.point IS NOT NULL:
            feature.properties.style.point.shape = symbol
        END IF

        modified_features.append(feature)
    END FOR

    IF modified_features IS EMPTY:
        RETURN build_error("No track features found in input", "invalid_input", [])
    END IF

    // Determine label description
    label_state = "shown"
    IF NOT show_label:
        label_state = "hidden"
    END IF

    // Build response with mutation result type
    content_items = build_mutation(
        features: modified_features,
        result_subtype: "track/styled",
        source_feature_ids: source_ids,
        label: "Reformatted fixes to " + symbol + " symbol, labels " + label_state + " for " + LENGTH(modified_features) + " track(s)"
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
| Invalid symbol name (e.g., "STAR") | Return error response with list of valid symbols |
| Track with empty positions array | Accept track, no positions to reformat; still update default_position_style |
| Track with null positions | Accept track, skip position iteration; still update default_position_style |
| Null show_label parameter | Default to true (labels shown) |
| Feature with no style property | Skip point style update; still update positions and default_position_style |
| Feature with no default_position_style | Initialize with new symbol and show_label values |
| Positions missing symbol property | Set symbol property (effectively adding it) |
| Multiple tracks in input | Apply same formatting to all track features |

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
        "coordinates": [[-1.0, 50.0], [-1.02, 50.01], [-1.04, 50.02]]
      },
      "properties": {
        "kind": "TRACK",
        "platform_id": "VESSEL-A",
        "platform_name": "Vessel Alpha",
        "track_type": "SURFACE",
        "start_time": "2024-01-01T10:00:00Z",
        "end_time": "2024-01-01T10:10:00Z",
        "positions": [
          {"time": "2024-01-01T10:00:00Z", "coordinates": [-1.0, 50.0], "symbol": "SQUARE", "label": "FIX-001", "show_label": true, "visible": true},
          {"time": "2024-01-01T10:05:00Z", "coordinates": [-1.02, 50.01], "symbol": "SQUARE", "label": "FIX-002", "show_label": true, "visible": true},
          {"time": "2024-01-01T10:10:00Z", "coordinates": [-1.04, 50.02], "symbol": "SQUARE", "label": "FIX-003", "show_label": true, "visible": true}
        ],
        "style": {
          "line": {"stroke": true, "color": "#3388ff", "weight": 3, "opacity": 1.0},
          "point": {"shape": "SQUARE", "radius": 4, "fill": true, "fill_color": "#3388ff", "fill_opacity": 0.8, "stroke": true, "color": "#ffffff", "weight": 1, "opacity": 1.0}
        },
        "default_position_style": {"show_symbol": true, "symbol": "SQUARE", "show_label": true}
      }
    }
  ]
}
```

**Parameters**: `symbol: "DIAMOND"`, `show_label: false`

**Output** (ToolResponse format):
```json
{
  "content": [
    {
      "type": "resource",
      "uri": "feature://track-001",
      "mimeType": "application/geo+json",
      "text": "{\"type\":\"Feature\",\"id\":\"track-001\",\"geometry\":{\"type\":\"LineString\",\"coordinates\":[[-1.0,50.0],[-1.02,50.01],[-1.04,50.02]]},\"properties\":{\"kind\":\"TRACK\",\"platform_id\":\"VESSEL-A\",\"platform_name\":\"Vessel Alpha\",\"track_type\":\"SURFACE\",\"start_time\":\"2024-01-01T10:00:00Z\",\"end_time\":\"2024-01-01T10:10:00Z\",\"positions\":[{\"time\":\"2024-01-01T10:00:00Z\",\"coordinates\":[-1.0,50.0],\"symbol\":\"DIAMOND\",\"label\":\"FIX-001\",\"show_label\":false,\"visible\":true},{\"time\":\"2024-01-01T10:05:00Z\",\"coordinates\":[-1.02,50.01],\"symbol\":\"DIAMOND\",\"label\":\"FIX-002\",\"show_label\":false,\"visible\":true},{\"time\":\"2024-01-01T10:10:00Z\",\"coordinates\":[-1.04,50.02],\"symbol\":\"DIAMOND\",\"label\":\"FIX-003\",\"show_label\":false,\"visible\":true}],\"style\":{\"line\":{\"stroke\":true,\"color\":\"#3388ff\",\"weight\":3,\"opacity\":1.0},\"point\":{\"shape\":\"DIAMOND\",\"radius\":4,\"fill\":true,\"fill_color\":\"#3388ff\",\"fill_opacity\":0.8,\"stroke\":true,\"color\":\"#ffffff\",\"weight\":1,\"opacity\":1.0}},\"default_position_style\":{\"show_symbol\":true,\"symbol\":\"DIAMOND\",\"show_label\":false}}}",
      "annotations": {
        "debrief:resultType": "mutation/track/styled",
        "debrief:sourceFeatures": ["track-001"],
        "debrief:label": "Reformatted fixes to DIAMOND symbol, labels hidden for 1 track(s)"
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
    "message": "symbol must be one of: SQUARE, CIRCLE, DIAMOND, TRIANGLE, CROSS",
    "data": {
      "debrief:errorCategory": "invalid_input",
      "debrief:affectedFeatures": []
    }
  }
}
```

### Golden Example Files

See:
- Input: `reformat-fixes.basic.input.json`
- Output: `reformat-fixes.basic.output.json`

## Changelog

### 1.0 (2026-02-07)
- Initial release migrated from Legacy Debrief
- Supports five symbol shapes: SQUARE, CIRCLE, DIAMOND, TRIANGLE, CROSS
- Configurable label visibility per fix
- Updates track-level default_position_style and point style to match

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Complete response structure
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_mutation()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for annotations

**Related Tools**:
- [apply-symbol-style](./apply-symbol-style.1.0.md) - Modify position marker appearance (single style property)
- [set-track-color](./set-track-color.1.0.md) - Modify track line color
- [label-interval](./label-interval.1.0.md) - Configure label display intervals
- [hide-reveal-objects](./hide-reveal-objects.1.0.md) - Toggle visibility of objects within a time period

**Schemas**:
- [TrackFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON track feature definition
- [PositionStyle](../../../schemas/src/linkml/styling.yaml) - Position styling options
- [PointProperties](../../../schemas/src/linkml/styling.yaml) - Point styling options

**Legacy**:
- Debrief 3.x: `Debrief.Tools.FilterOperations.ReformatFixes`
