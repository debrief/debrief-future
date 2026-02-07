---
name: hide-reveal-objects
version: 1.0
category: track/styling
status: draft
created: 2026-02-07
migrated_from: Debrief.Tools.FilterOperations.HideRevealObjects
---

# Hide/Reveal Objects

> Toggle visibility of plot objects within a time period.

## MCP

**Description**: Shows or hides position objects within a specified time window across one or more layers/tracks. This is a temporal filtering operation that sets the `visible` property on each position whose timestamp falls within the given time range.

**When to use**: When the user wants to hide or reveal objects (positions, fixes) that fall within a specific time period. Useful for focusing analysis on a particular time window, decluttering the display during a busy period, or progressively revealing track data.

**Parameters**:
- `features`: Track/layer features to modify (GeoJSON FeatureCollection containing TrackFeature objects)
- `start_time`: Start of the time window (ISO 8601 datetime string, inclusive)
- `end_time`: End of the time window (ISO 8601 datetime string, inclusive)
- `visible`: Whether to show (true) or hide (false) objects in the time window

**Returns**: ToolResponse containing MutationResult content items with visibility toggled on matching positions.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature`

**Constraints**:
- Features must have `properties.kind == "TRACK"`
- At least one feature required
- `start_time` must be a valid ISO 8601 datetime
- `end_time` must be a valid ISO 8601 datetime
- `end_time` must be greater than or equal to `start_time`
- Each track must contain a `positions` array with `time` properties

**Defaults**:
- `visible`: false (hide by default)

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
    "debrief:label": "{Shown|Hidden} {n} object(s) in time period {start} to {end} across {m} track(s)"
  }
}
```

**Annotations** (required on each content item):
- `debrief:resultType`: `mutation/track/styled`
- `debrief:sourceFeatures`: IDs of input track features
- `debrief:label`: Human-readable description (e.g., "Hidden 5 object(s) in time period 2024-01-01T10:00:00Z to 2024-01-01T10:30:00Z across 2 track(s)")

## Algorithm

```pseudocode
FUNCTION hide_reveal_objects(features: FeatureCollection, start_time: string, end_time: string, visible: boolean) -> ToolResponse:
    // Validate inputs
    IF features IS NULL OR features.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    IF start_time IS NULL OR NOT is_valid_iso_datetime(start_time):
        RETURN build_error("start_time must be a valid ISO 8601 datetime", "invalid_input", [])
    END IF

    IF end_time IS NULL OR NOT is_valid_iso_datetime(end_time):
        RETURN build_error("end_time must be a valid ISO 8601 datetime", "invalid_input", [])
    END IF

    IF parse_datetime(end_time) < parse_datetime(start_time):
        RETURN build_error("end_time must be greater than or equal to start_time", "invalid_input", [])
    END IF

    // Default visible to false (hide) if not provided
    IF visible IS NULL:
        visible = false
    END IF

    modified_features = empty list
    source_ids = empty list
    total_affected_objects = 0

    FOR EACH feature IN features.features:
        // Skip non-track features
        IF feature.properties.kind != "TRACK":
            CONTINUE
        END IF

        // Collect source ID for provenance
        source_ids.append(feature.id)

        // Process each position in the track
        IF feature.properties.positions IS NOT NULL:
            FOR EACH position IN feature.properties.positions:
                // Check if position falls within the time window (inclusive)
                IF position.time IS NOT NULL:
                    position_time = parse_datetime(position.time)
                    window_start = parse_datetime(start_time)
                    window_end = parse_datetime(end_time)

                    IF position_time >= window_start AND position_time <= window_end:
                        position.visible = visible
                        total_affected_objects = total_affected_objects + 1
                    END IF
                END IF
            END FOR
        END IF

        modified_features.append(feature)
    END FOR

    IF modified_features IS EMPTY:
        RETURN build_error("No track features found in input", "invalid_input", [])
    END IF

    // Determine action description
    action = "Hidden"
    IF visible:
        action = "Shown"
    END IF

    // Build response with mutation result type
    content_items = build_mutation(
        features: modified_features,
        result_subtype: "track/styled",
        source_feature_ids: source_ids,
        label: action + " " + total_affected_objects + " object(s) in time period " + start_time + " to " + end_time + " across " + LENGTH(modified_features) + " track(s)"
    )

    RETURN build_response(content_items)
END FUNCTION

FUNCTION is_valid_iso_datetime(datetime: string) -> boolean:
    // Accept ISO 8601 datetime formats:
    // YYYY-MM-DDTHH:MM:SSZ
    // YYYY-MM-DDTHH:MM:SS+HH:MM
    // YYYY-MM-DDTHH:MM:SS.sssZ
    RETURN datetime matches ISO 8601 datetime pattern
END FUNCTION

FUNCTION parse_datetime(datetime: string) -> DateTime:
    // Parse ISO 8601 datetime string into comparable DateTime value
    RETURN parsed DateTime object
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
| Time window covers no positions | Accept; no positions modified, label reports 0 affected objects |
| Time window covers all positions | All positions have visibility set to the `visible` parameter value |
| start_time equals end_time | Accept; only positions at that exact time are affected |
| end_time before start_time | Return error response: "end_time must be greater than or equal to start_time" |
| Null start_time or end_time | Return error response specifying the missing parameter |
| Positions missing time property | Skip positions without a `time` property (do not modify) |
| Track with empty positions array | Accept track; no positions to modify, still included in output |
| Track with null positions | Accept track; skip position iteration, still included in output |
| Null visible parameter | Default to false (hide objects) |
| Positions already in desired state | Set visibility anyway (idempotent operation) |

## Examples

### Basic Example: Hiding Objects in a Time Window

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

**Parameters**: `start_time: "2024-01-01T10:00:00Z"`, `end_time: "2024-01-01T10:05:00Z"`, `visible: false`

**Output** (ToolResponse format):
```json
{
  "content": [
    {
      "type": "resource",
      "uri": "feature://track-001",
      "mimeType": "application/geo+json",
      "text": "{\"type\":\"Feature\",\"id\":\"track-001\",\"geometry\":{\"type\":\"LineString\",\"coordinates\":[[-1.0,50.0],[-1.02,50.01],[-1.04,50.02]]},\"properties\":{\"kind\":\"TRACK\",\"platform_id\":\"VESSEL-A\",\"platform_name\":\"Vessel Alpha\",\"track_type\":\"SURFACE\",\"start_time\":\"2024-01-01T10:00:00Z\",\"end_time\":\"2024-01-01T10:10:00Z\",\"positions\":[{\"time\":\"2024-01-01T10:00:00Z\",\"coordinates\":[-1.0,50.0],\"symbol\":\"SQUARE\",\"label\":\"FIX-001\",\"show_label\":true,\"visible\":false},{\"time\":\"2024-01-01T10:05:00Z\",\"coordinates\":[-1.02,50.01],\"symbol\":\"SQUARE\",\"label\":\"FIX-002\",\"show_label\":true,\"visible\":false},{\"time\":\"2024-01-01T10:10:00Z\",\"coordinates\":[-1.04,50.02],\"symbol\":\"SQUARE\",\"label\":\"FIX-003\",\"show_label\":true,\"visible\":true}],\"style\":{\"line\":{\"stroke\":true,\"color\":\"#3388ff\",\"weight\":3,\"opacity\":1.0},\"point\":{\"shape\":\"SQUARE\",\"radius\":4,\"fill\":true,\"fill_color\":\"#3388ff\",\"fill_opacity\":0.8,\"stroke\":true,\"color\":\"#ffffff\",\"weight\":1,\"opacity\":1.0}},\"default_position_style\":{\"show_symbol\":true,\"symbol\":\"SQUARE\",\"show_label\":true}}}",
      "annotations": {
        "debrief:resultType": "mutation/track/styled",
        "debrief:sourceFeatures": ["track-001"],
        "debrief:label": "Hidden 2 object(s) in time period 2024-01-01T10:00:00Z to 2024-01-01T10:05:00Z across 1 track(s)"
      }
    }
  ]
}
```

Note: Positions at T10:00 and T10:05 fall within the inclusive time window and are hidden (`visible: false`). The position at T10:10 is outside the window and remains visible.

### Error Response Example

```json
{
  "error": {
    "code": -32000,
    "message": "end_time must be greater than or equal to start_time",
    "data": {
      "debrief:errorCategory": "invalid_input",
      "debrief:affectedFeatures": []
    }
  }
}
```

### Golden Example Files

See:
- Input: `hide-reveal-objects.basic.input.json`
- Output: `hide-reveal-objects.basic.output.json`

## Changelog

### 1.0 (2026-02-07)
- Initial release migrated from Legacy Debrief
- Supports show and hide operations via `visible` boolean
- Time window comparison is inclusive on both bounds
- Positions without timestamps are skipped

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Complete response structure
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_mutation()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for annotations

**Related Tools**:
- [reformat-fixes](./reformat-fixes.1.0.md) - Reformat fix symbols and labels
- [set-track-color](./set-track-color.1.0.md) - Modify track line color
- [apply-symbol-style](./apply-symbol-style.1.0.md) - Modify position marker appearance
- [label-interval](./label-interval.1.0.md) - Configure label display intervals

**Schemas**:
- [TrackFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON track feature definition
- [PositionStyle](../../../schemas/src/linkml/styling.yaml) - Position styling options

**Legacy**:
- Debrief 3.x: `Debrief.Tools.FilterOperations.HideRevealObjects`
