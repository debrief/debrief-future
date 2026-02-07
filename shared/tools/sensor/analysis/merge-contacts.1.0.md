---
name: merge-contacts
version: 1.0
category: sensor/analysis
status: draft
created: 2026-02-07
migrated_from: org.mwc.debrief.core.ContextOperations.MergeContacts
---

# Merge Contacts

> Merge sensor contacts from multiple sensors into a single combined contact list, sorted by time.

## MCP

**Description**: Merges sensor contacts from two or more sensors into a single new sensor feature with a combined contact list sorted chronologically. Each merged contact retains a `source_sensor` property for provenance.

**When to use**: When the user wants to combine detections from multiple sensors (e.g., hull sonar, towed array, radar) into a single timeline for analysis, or create a unified contact picture from disparate sensor sources.

**Parameters**:
- `features`: FeatureCollection containing 2 or more sensor features to merge
- `target_sensor_name`: Name for the merged sensor feature (e.g., "Merged Contacts")

**Returns**: ToolResponse containing a new sensor feature with all contacts merged and sorted by time.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#SensorFeature`

**Constraints**:
- At least 2 features with `properties.kind == "SENSOR"` required
- All source sensors should belong to the same platform (same `platform_id`)
- Each contact must have a `time` property for sorting

**Defaults**:
- `target_sensor_name`: "Merged Contacts" if not specified

## Outputs

Returns a **ToolResponse** with an addition content item.

**Response Schema**: `specs/041-document-tool-results/data-model.md#AdditionResult`

**Result Type**: `addition/sensor/merged`

**Content Items**: One `AdditionResult` containing:
- `type`: "resource"
- `uri`: `feature://merged-sensor-{id}`
- `mimeType`: "application/geo+json"
- `text`: Serialized new SensorFeature with merged contacts

**Annotations** (on each content item):
- `debrief:resultType`: `"addition/sensor/merged"`
- `debrief:sourceFeatures`: IDs of all source sensor features
- `debrief:label`: `"Merged {n} contacts from {m} sensors into {target_sensor_name}"`

## Algorithm

```pseudocode
FUNCTION merge_contacts(features: FeatureCollection, target_sensor_name: string) -> ToolResponse:
    // Validate inputs
    IF features IS NULL OR features.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    IF target_sensor_name IS NULL OR target_sensor_name IS EMPTY:
        target_sensor_name = "Merged Contacts"
    END IF

    // Collect sensor features
    sensors = empty list
    FOR EACH feature IN features.features:
        IF feature.properties.kind == "SENSOR":
            sensors.append(feature)
        END IF
    END FOR

    IF LENGTH(sensors) < 2:
        RETURN build_error("At least 2 sensor features required for merging", "invalid_input", [])
    END IF

    // Collect all contacts with source provenance
    all_contacts = empty list
    source_ids = empty list
    platform_id = sensors[0].properties.platform_id
    sensor_type = sensors[0].properties.sensor_type

    FOR EACH sensor IN sensors:
        source_ids.append(sensor.id)

        IF sensor.properties.contacts IS NULL OR sensor.properties.contacts IS EMPTY:
            CONTINUE
        END IF

        FOR EACH contact IN sensor.properties.contacts:
            // Add source sensor provenance
            contact.source_sensor = sensor.properties.sensor_name
            all_contacts.append(contact)
        END FOR
    END FOR

    // Sort all contacts by time
    sorted_contacts = SORT(all_contacts, BY contact.time ASCENDING)

    // Create new merged sensor feature
    merged_sensor = {
        type: "Feature",
        id: generate_unique_id("merged-sensor"),
        geometry: {type: "GeometryCollection", geometries: []},
        properties: {
            kind: "SENSOR",
            sensor_name: target_sensor_name,
            platform_id: platform_id,
            sensor_type: sensor_type,
            contacts: sorted_contacts
        }
    }

    total_contacts = LENGTH(sorted_contacts)
    total_sensors = LENGTH(sensors)

    // Build addition response
    content_items = build_addition(
        features: [merged_sensor],
        result_subtype: "sensor/merged",
        source_feature_ids: source_ids,
        label: "Merged " + total_contacts + " contacts from " + total_sensors + " sensors into " + target_sensor_name
    )

    RETURN build_response(content_items)
END FUNCTION
```

### Complexity

- **Time**: O(n log n) -- sorting all contacts dominates, where n is total contacts across all sensors
- **Space**: O(n) -- stores merged contacts list

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Return error response: `invalid_input`, "Input features required" |
| Only one sensor feature | Return error response: `invalid_input`, "At least 2 sensor features required for merging" |
| No sensor features in input | Return error response: `invalid_input`, "At least 2 sensor features required for merging" |
| Sensor with empty contacts list | Skip that sensor's contacts (contribute 0 contacts), but still count as a source sensor |
| Sensor with null contacts | Skip that sensor's contacts, still count as source |
| Contacts with identical timestamps | Both retained; sort is stable so original order within a sensor preserved |
| Different platform_ids across sensors | Use the platform_id from the first sensor |
| Mixed sensor types (SONAR + RADAR) | Use the sensor_type from the first sensor |
| Duplicate contact IDs across sensors | Retain both; source_sensor provenance distinguishes them |
| target_sensor_name not provided | Default to "Merged Contacts" |

## Examples

### Basic Usage

**Input**: `merge-contacts.basic.input.json`
**Output**: `merge-contacts.basic.output.json`

Description: Merges contacts from Port Array (2 contacts) and Starboard Array (1 contact) into a single "Merged Contacts" sensor with 3 contacts sorted by time.

### Edge Case: One Sensor Empty

**Input**: `merge-contacts.edge.input.json`
**Output**: `merge-contacts.edge.output.json`

Description: Merges a sensor with 2 contacts and a sensor with empty contacts list. Result contains only the 2 contacts from the non-empty sensor.

### Complex: Three Sensors (Hull Sonar, Towed Array, Radar)

**Input**: `merge-contacts.complex.input.json`
**Output**: `merge-contacts.complex.output.json`

Description: Merges contacts from 3 different sensors with interleaved timestamps into a single chronological contact list of 7 entries.

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Supports merging 2+ sensors with chronological sort
- Adds source_sensor provenance to each merged contact

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_addition()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for result annotations

**Related Tools**:
- [insert-sensor-arc](./insert-sensor-arc.1.0.md) - Insert a new arc contact into a sensor
- [delete-ambiguous-bearings](../calibration/delete-ambiguous-bearings.1.0.md) - Remove ambiguous bearing contacts

**Input Schemas**:
- [SensorFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON sensor feature definition
- [SensorContact](../../../schemas/src/linkml/geojson.yaml) - Sensor contact data model

**Legacy**:
- Debrief 3.x: `org.mwc.debrief.core.ContextOperations.MergeContacts`
