---
name: symbol-interval
version: 1.0
category: track/styling
status: stable
---

# Symbol Interval

> Sets the time interval for displaying symbols on track positions.

## MCP

**Description**: Sets the time interval for displaying position symbols on track features. Symbols appear at regular time intervals along the track rather than at every recorded position.

**When to use**: When the user wants to reduce visual clutter by showing position symbols only at regular intervals, such as every 5 minutes or every hour, rather than at every data point.

**Parameters**:
- `features`: Track features to modify (GeoJSON FeatureCollection containing TrackFeature objects)
- `interval`: ISO 8601 duration string (e.g., "PT5M" for 5 minutes, "PT1H" for 1 hour)

**Returns**: ToolResponse containing MutationResult content items with symbol_interval property set.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature`

**Constraints**:
- Features must have `properties.kind == "TRACK"`
- At least one feature required
- Interval must be a valid ISO 8601 duration

**Defaults**:
- None (all parameters required)

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
    "debrief:label": "Set symbol interval to {interval} for {n} track(s)"
  }
}
```

**Annotations** (required on each content item):
- `debrief:resultType`: `mutation/track/styled`
- `debrief:sourceFeatures`: IDs of input track features
- `debrief:label`: Human-readable description (e.g., "Set symbol interval to PT30M for 3 track(s)")

## Algorithm

```pseudocode
FUNCTION symbol_interval(features: FeatureCollection, interval: string) -> ToolResponse:
    // Validate inputs
    IF features IS NULL OR features.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    IF interval IS NULL OR NOT is_valid_iso_duration(interval):
        RETURN build_error("interval must be a valid ISO 8601 duration (e.g., PT5M, PT1H)", "invalid_input", [])
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

        // Set symbol interval
        feature.properties.symbol_interval = interval

        // Ensure default_position_style has show_symbol = true
        IF feature.properties.default_position_style IS NULL:
            feature.properties.default_position_style = default_position_style()
        END IF
        feature.properties.default_position_style.show_symbol = true

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
        label: "Set symbol interval to {interval} for {n} track(s)"
    )

    RETURN build_response(content_items)
END FUNCTION

FUNCTION is_valid_iso_duration(duration: string) -> boolean:
    // Valid patterns:
    // PT[n]H - hours (e.g., PT1H)
    // PT[n]M - minutes (e.g., PT5M)
    // PT[n]S - seconds (e.g., PT30S)
    // PT[n]H[n]M - hours and minutes (e.g., PT1H30M)
    // P[n]D - days (e.g., P1D)
    // P[n]DT[n]H - days and hours (e.g., P1DT12H)
    RETURN duration matches ISO 8601 duration pattern
END FUNCTION

FUNCTION default_position_style() -> PositionStyle:
    RETURN {
        show_symbol: true,
        symbol: "circle",
        show_label: false
    }
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
| Invalid duration format (e.g., "5 minutes") | Return error response with valid format examples |
| Zero duration (PT0S) | Accept but has no practical effect (symbols on every position) |
| Duration longer than track | Accept - renderer will show 0-1 symbols depending on track length |
| Null interval parameter | Return error response: "interval must be a valid ISO 8601 duration" |
| No default_position_style | Initialize with show_symbol = true |
| Existing symbol_interval | Overwrite with new value |

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
        "default_position_style": {"show_symbol": false, "symbol": "circle", "show_label": false}
      }
    }
  ]
}
```

**Parameters**: `interval: "PT30M"` (every 30 minutes)

**Output** (ToolResponse format):
```json
{
  "content": [
    {
      "type": "resource",
      "uri": "feature://track-001",
      "mimeType": "application/geo+json",
      "text": "{\"type\":\"Feature\",\"id\":\"track-001\",\"geometry\":{\"type\":\"LineString\",\"coordinates\":[[-1.0,50.0],[-1.1,50.1]]},\"properties\":{\"kind\":\"TRACK\",\"platform_id\":\"VESSEL-A\",\"track_type\":\"SURFACE\",\"start_time\":\"2024-01-01T00:00:00Z\",\"end_time\":\"2024-01-01T01:00:00Z\",\"positions\":[{\"time\":\"2024-01-01T00:00:00Z\",\"coordinates\":[-1.0,50.0]},{\"time\":\"2024-01-01T01:00:00Z\",\"coordinates\":[-1.1,50.1]}],\"style\":{\"line\":{\"stroke\":true,\"color\":\"#3388ff\",\"weight\":3,\"opacity\":1.0},\"point\":{\"shape\":\"circle\",\"radius\":4,\"fill\":true,\"fill_color\":\"#3388ff\",\"fill_opacity\":0.8,\"stroke\":true,\"color\":\"#ffffff\",\"weight\":1,\"opacity\":1.0}},\"default_position_style\":{\"show_symbol\":true,\"symbol\":\"circle\",\"show_label\":false},\"symbol_interval\":\"PT30M\"}}",
      "annotations": {
        "debrief:resultType": "mutation/track/styled",
        "debrief:sourceFeatures": ["track-001"],
        "debrief:label": "Set symbol interval to PT30M for 1 track(s)"
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
    "message": "interval must be a valid ISO 8601 duration (e.g., PT5M, PT1H)",
    "data": {
      "debrief:errorCategory": "invalid_input",
      "debrief:affectedFeatures": []
    }
  }
}
```

### Golden Example Files

See:
- Input: `symbol-interval.basic.input.json`
- Output: `symbol-interval.basic.output.json`

## Changelog

### 1.0 (2026-02-05)
- Initial release
- Supports ISO 8601 duration format
- Automatically enables show_symbol in default_position_style

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Complete response structure
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_mutation()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for annotations

**Related Tools**:
- [set-track-color](./set-track-color.1.0.md) - Modify track line color
- [apply-symbol-style](./apply-symbol-style.1.0.md) - Modify position marker appearance
- [label-interval](./label-interval.1.0.md) - Configure label display intervals

**Schemas**:
- [TrackFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON track feature definition
- [PositionStyle](../../../schemas/src/linkml/styling.yaml) - Position styling options

**External**:
- [ISO 8601 Duration](https://en.wikipedia.org/wiki/ISO_8601#Durations) - Duration format specification
