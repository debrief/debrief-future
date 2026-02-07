---
name: insert-sensor-arc
version: 1.0
category: sensor/analysis
status: draft
created: 2026-02-07
migrated_from: org.mwc.debrief.core.ContextOperations.GenerateNewInsertSensorArcAction
---

# Insert Sensor Arc

> Insert a new sensor arc (bearing/range fan) contact into a sensor's contact list.

## MCP

**Description**: Inserts a new sensor arc contact with specified bearing, arc width, range, frequency, and time into an existing sensor. The new contact is inserted in chronological order among existing contacts.

**When to use**: When the user wants to manually add a bearing fan or sensor detection arc to a sensor, create a synthetic sensor contact for analysis, or fill in missing sensor data at a specific time.

**Parameters**:
- `features`: FeatureCollection containing exactly one sensor feature
- `arc_params`: Object with arc properties -- `time` (required), `bearing` (required), `arc_width` (required), `range` (optional), `frequency` (optional)

**Returns**: ToolResponse containing the modified sensor feature with the new arc contact inserted.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#SensorFeature`

**Constraints**:
- Exactly one feature with `properties.kind == "SENSOR"` required
- `arc_params.time` must be a valid ISO 8601 timestamp
- `arc_params.bearing` must be 0-360 degrees
- `arc_params.arc_width` must be a positive number (degrees)
- `arc_params.range` is optional, in metres
- `arc_params.frequency` is optional, in Hz

**Defaults**:
- `arc_params.range`: null if not specified
- `arc_params.frequency`: null if not specified

## Outputs

Returns a **ToolResponse** with an addition content item.

**Response Schema**: `specs/041-document-tool-results/data-model.md#AdditionResult`

**Result Type**: `addition/sensor/arc`

**Content Items**: One `AdditionResult` containing:
- `type`: "resource"
- `uri`: `feature://{sensor_feature_id}`
- `mimeType`: "application/geo+json"
- `text`: Serialized modified SensorFeature with new arc contact inserted

**Annotations** (on each content item):
- `debrief:resultType`: `"addition/sensor/arc"`
- `debrief:sourceFeatures`: `["{sensor_feature_id}"]`
- `debrief:label`: `"Inserted sensor arc at bearing {bearing} deg, range {range}m on {sensor_name}"`

## Algorithm

```pseudocode
FUNCTION insert_sensor_arc(features: FeatureCollection, arc_params: ArcParams) -> ToolResponse:
    // Validate inputs
    IF features IS NULL OR features.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    IF arc_params IS NULL:
        RETURN build_error("arc_params is required", "invalid_input", [])
    END IF

    IF arc_params.time IS NULL:
        RETURN build_error("arc_params.time is required", "invalid_input", [])
    END IF

    IF arc_params.bearing IS NULL OR arc_params.bearing < 0 OR arc_params.bearing > 360:
        RETURN build_error("arc_params.bearing must be between 0 and 360 degrees", "invalid_input", [])
    END IF

    IF arc_params.arc_width IS NULL OR arc_params.arc_width <= 0:
        RETURN build_error("arc_params.arc_width must be a positive number", "invalid_input", [])
    END IF

    // Find sensor feature
    sensor = NULL
    FOR EACH feature IN features.features:
        IF feature.properties.kind == "SENSOR":
            sensor = feature
            BREAK
        END IF
    END FOR

    IF sensor IS NULL:
        RETURN build_error("No sensor feature found in input", "invalid_input", [])
    END IF

    // Create new arc contact
    new_contact = {
        id: generate_unique_id("arc-generated"),
        time: arc_params.time,
        bearing: arc_params.bearing,
        arc_width: arc_params.arc_width,
        range: arc_params.range OR NULL,
        frequency: arc_params.frequency OR NULL,
        contact_type: "ARC"
    }

    // Initialize contacts if null
    IF sensor.properties.contacts IS NULL:
        sensor.properties.contacts = empty list
    END IF

    // Insert in chronological order
    insert_position = 0
    FOR i = 0 TO LENGTH(sensor.properties.contacts) - 1:
        IF sensor.properties.contacts[i].time <= new_contact.time:
            insert_position = i + 1
        ELSE:
            BREAK
        END IF
    END FOR

    INSERT new_contact AT insert_position IN sensor.properties.contacts

    // Build label
    label = "Inserted sensor arc at bearing " + arc_params.bearing + " deg"
    IF arc_params.range IS NOT NULL:
        label = label + ", range " + arc_params.range + "m"
    END IF
    label = label + " on " + sensor.properties.sensor_name

    // Build addition response
    content_items = build_addition(
        features: [sensor],
        result_subtype: "sensor/arc",
        source_feature_ids: [sensor.id],
        label: label
    )

    RETURN build_response(content_items)
END FUNCTION
```

### Complexity

- **Time**: O(n) -- single scan of contacts list for insertion point
- **Space**: O(1) -- adds one contact in-place

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Return error response: `invalid_input`, "Input features required" |
| No sensor features in input | Return error response: `invalid_input`, "No sensor feature found in input" |
| Sensor with no contacts (empty list) | Insert arc as the only contact |
| Sensor with null contacts | Initialize contacts list, insert arc |
| Missing arc_params.time | Return error response: `invalid_input`, "arc_params.time is required" |
| Bearing out of range (negative or >360) | Return error response: `invalid_input`, "arc_params.bearing must be between 0 and 360 degrees" |
| Arc width of zero or negative | Return error response: `invalid_input`, "arc_params.arc_width must be a positive number" |
| Range not specified | Set range to null in created contact |
| Frequency not specified | Set frequency to null in created contact |
| Time between existing contacts | Insert in correct chronological position |
| Time before all existing contacts | Insert at beginning of contacts list |
| Time after all existing contacts | Insert at end of contacts list |

## Examples

### Basic Usage

**Input**: `insert-sensor-arc.basic.input.json`
**Output**: `insert-sensor-arc.basic.output.json`

Description: Inserts a sensor arc with bearing 90 deg, arc width 10 deg, range 5000m, and frequency 150 Hz into a sensor with one existing contact.

### Edge Case: Empty Contacts with Minimal Parameters

**Input**: `insert-sensor-arc.edge.input.json`
**Output**: `insert-sensor-arc.edge.output.json`

Description: Inserts an arc with only bearing and arc_width (no range or frequency) into a sensor with an empty contacts list.

### Complex: Insert Between Existing Contacts

**Input**: `insert-sensor-arc.complex.input.json`
**Output**: `insert-sensor-arc.complex.output.json`

Description: Inserts a fully-specified arc at 08:30 between existing contacts at 08:00 and 09:00, maintaining chronological order.

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Supports bearing, arc_width, range, frequency, and time parameters
- Maintains chronological ordering of contacts

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_addition()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for result annotations

**Related Tools**:
- [merge-contacts](./merge-contacts.1.0.md) - Merge contacts from multiple sensors
- [delete-ambiguous-bearings](../calibration/delete-ambiguous-bearings.1.0.md) - Remove ambiguous bearing contacts

**Input Schemas**:
- [SensorFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON sensor feature definition
- [SensorContact](../../../schemas/src/linkml/geojson.yaml) - Sensor contact data model

**Legacy**:
- Debrief 3.x: `org.mwc.debrief.core.ContextOperations.GenerateNewInsertSensorArcAction`
