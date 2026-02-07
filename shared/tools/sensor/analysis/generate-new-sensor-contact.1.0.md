---
name: generate-new-sensor-contact
version: 1.0
category: sensor/analysis
status: draft
created: 2026-02-07
migrated_from: org.mwc.debrief.core.ContextOperations.GenerateNewSensorContact
---

# Generate New Sensor Contact

> Create a new manual sensor contact entry and insert it into an existing sensor's cut list.

## MCP

**Description**: Creates a new manual sensor contact (bearing cut) with specified parameters and inserts it into the selected sensor's cut list at the correct chronological position. Used for manually adding bearing observations to a sensor dataset.

**When to use**: When the user wants to manually add a sensor contact, insert a bearing observation at a specific time, or supplement existing sensor data with a manual observation.

**Parameters**:
- `features`: FeatureCollection containing exactly one sensor feature to add the contact to
- `contact`: Object with contact parameters (time, bearing, range, frequency, label)

**Returns**: ToolResponse containing the modified sensor feature with the new contact inserted in chronological order.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#SensorFeature`

**Constraints**:
- Exactly one feature with `properties.kind == "SENSOR"` required
- Contact `time` is required (ISO 8601 timestamp)
- Contact `bearing` is required (degrees, 0-360)
- Contact `range`, `frequency`, and `label` are optional

**Defaults**:
- `contact.range`: NULL (no range specified)
- `contact.frequency`: NULL (no frequency specified)
- `contact.label`: NULL (no label)
- `contact.origin`: Interpolated from host track positions at the contact time, or NULL if host track not available

## Outputs

Returns a **ToolResponse** with the modified sensor feature containing the new contact.

**Response Schema**: `specs/041-document-tool-results/data-model.md#AdditionResult`

**Result Type**: `addition/sensor/contact`

**Content Items**: One content item containing:
- `type`: "resource"
- `uri`: `feature://{sensor_feature_id}`
- `mimeType`: "application/geo+json"
- `text`: Serialized modified SensorFeature with the new contact inserted

**Annotations** (on each content item):
- `debrief:resultType`: `"addition/sensor/contact"`
- `debrief:sourceFeatures`: `["{sensor_feature_id}"]`
- `debrief:label`: `"Added manual contact '{label}' to sensor {sensor_name} at {time}"`

## Algorithm

```pseudocode
FUNCTION generate_new_sensor_contact(features: FeatureCollection, contact: ContactParams) -> ToolResponse:
    // Validate inputs
    IF features IS NULL OR features.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
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

    // Validate contact parameters
    IF contact IS NULL:
        RETURN build_error("Contact parameters required", "invalid_input", [sensor.id])
    END IF

    IF contact.time IS NULL:
        RETURN build_error("Contact time is required", "invalid_input", [sensor.id])
    END IF

    IF contact.bearing IS NULL:
        RETURN build_error("Contact bearing is required", "invalid_input", [sensor.id])
    END IF

    IF contact.bearing < 0 OR contact.bearing >= 360:
        RETURN build_error("Bearing must be between 0 and 360 degrees", "invalid_input", [sensor.id])
    END IF

    // Determine origin for the new contact
    // Interpolate from host track if available, otherwise NULL
    origin = NULL
    IF sensor.properties.cuts IS NOT NULL AND LENGTH(sensor.properties.cuts) >= 2:
        // Find the two cuts that bracket the contact time
        before_cut = NULL
        after_cut = NULL
        FOR EACH cut IN sensor.properties.cuts:
            IF cut.time <= contact.time:
                before_cut = cut
            END IF
            IF cut.time >= contact.time AND after_cut IS NULL:
                after_cut = cut
            END IF
        END FOR

        IF before_cut IS NOT NULL AND after_cut IS NOT NULL
           AND before_cut.origin IS NOT NULL AND after_cut.origin IS NOT NULL:
            // Linear interpolation between bracketing origins
            fraction = time_fraction(before_cut.time, after_cut.time, contact.time)
            origin = interpolate_coordinates(before_cut.origin, after_cut.origin, fraction)
        END IF
    END IF

    // Build the new sensor contact
    new_cut = {
        time: contact.time,
        bearing: contact.bearing
    }

    IF contact.range IS NOT NULL:
        new_cut.range = contact.range
    END IF

    IF contact.frequency IS NOT NULL:
        new_cut.frequency = contact.frequency
    END IF

    IF contact.label IS NOT NULL:
        new_cut.label = contact.label
    END IF

    IF origin IS NOT NULL:
        new_cut.origin = origin
    END IF

    // Insert contact into cuts list in chronological order
    IF sensor.properties.cuts IS NULL:
        sensor.properties.cuts = empty list
    END IF

    sensor.properties.cuts.append(new_cut)
    sensor.properties.cuts = SORT(sensor.properties.cuts, BY cut.time ASCENDING)

    // Build label
    label_text = "Added manual contact"
    IF contact.label IS NOT NULL:
        label_text += " '" + contact.label + "'"
    END IF
    label_text += " to sensor " + (sensor.properties.sensor_name OR "Unknown")
    label_text += " at " + contact.time

    // Build addition response
    content_items = build_addition(
        features: [sensor],
        result_subtype: "sensor/contact",
        source_feature_ids: [sensor.id],
        label: label_text
    )

    RETURN build_response(content_items)
END FUNCTION

FUNCTION time_fraction(start_time: string, end_time: string, target_time: string) -> float:
    // Calculate the fraction of time elapsed between start and end
    total = parse_time(end_time) - parse_time(start_time)
    IF total == 0:
        RETURN 0.5
    END IF
    elapsed = parse_time(target_time) - parse_time(start_time)
    RETURN elapsed / total
END FUNCTION

FUNCTION interpolate_coordinates(coord_a: [lon, lat], coord_b: [lon, lat], fraction: float) -> [lon, lat]:
    lon = coord_a[0] + (coord_b[0] - coord_a[0]) * fraction
    lat = coord_a[1] + (coord_b[1] - coord_a[1]) * fraction
    RETURN [lon, lat]
END FUNCTION
```

### Complexity

- **Time**: O(n log n) -- sorts n+1 cuts after insertion
- **Space**: O(n) -- stores the modified cuts list

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Return error response: `invalid_input`, "Input features required" |
| No sensor features in input | Return error response: `invalid_input`, "No sensor feature found in input" |
| Missing contact parameters | Return error response: `invalid_input`, "Contact parameters required" |
| Missing contact time | Return error response: `invalid_input`, "Contact time is required" |
| Missing contact bearing | Return error response: `invalid_input`, "Contact bearing is required" |
| Bearing out of range (negative or >= 360) | Return error response: `invalid_input`, "Bearing must be between 0 and 360 degrees" |
| Sensor with no existing cuts | Initialize empty cuts list, add the new contact as the only cut |
| Contact time before all existing cuts | Insert at beginning of cuts list |
| Contact time after all existing cuts | Append to end of cuts list |
| Contact time matches existing cut | Insert adjacent (duplicates allowed) |
| Multiple sensors in input | Use only the first sensor found |
| Cannot interpolate origin (insufficient data) | Set origin to NULL on new contact |
| Non-sensor features mixed in | Skip non-sensor features |

## Examples

### Basic Usage

**Input**: `generate-new-sensor-contact.basic.input.json`
**Output**: `generate-new-sensor-contact.basic.output.json`

Description: Adds a manual sensor contact at bearing 046 deg with range 5000m and frequency 150.25 Hz to the TOWED_ARRAY sensor between two existing cuts. Origin is interpolated from adjacent cut origins.

### Error Response Example

```json
{
  "error": {
    "code": -32000,
    "message": "Contact bearing is required",
    "data": {
      "debrief:errorCategory": "invalid_input",
      "debrief:affectedFeatures": ["sensor-towed-array"]
    }
  }
}
```

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Supports bearing, range, frequency, and label parameters
- Interpolates contact origin from adjacent cuts when possible
- Inserts new contact in chronological order

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_addition()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for result annotations

**Related Tools**:
- [copy-bearings-to-clipboard](../../dataset/export/copy-bearings-to-clipboard.1.0.md) - Copy sensor bearing data to clipboard

**Input Schemas**:
- [SensorFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON sensor feature definition

**Legacy**:
- Debrief 3.x: `org.mwc.debrief.core.ContextOperations.GenerateNewSensorContact`
