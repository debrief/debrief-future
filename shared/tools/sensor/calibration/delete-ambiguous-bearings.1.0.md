---
name: delete-ambiguous-bearings
version: 1.0
category: sensor/calibration
status: draft
created: 2026-02-07
migrated_from: org.mwc.debrief.track_shift.views.BearingResidualsView
---

# Delete Ambiguous Bearings

> Remove sensor bearing measurements that are ambiguous (dual-bearing solutions where port/starboard cannot be determined).

## MCP

**Description**: Deletes ambiguous bearing measurements from sensor contact lists. Ambiguous bearings are dual-solution contacts where the port/starboard side cannot be determined due to towed array geometry. Contacts flagged as ambiguous are removed, retaining only unambiguous bearings.

**When to use**: When the user wants to clean up sensor data by removing unreliable ambiguous bearing measurements, prepare sensor data for analysis that requires unambiguous bearings, or filter bearing residuals.

**Parameters**:
- `features`: FeatureCollection containing one or more sensor features with bearing contacts

**Returns**: ToolResponse containing modified sensor features with ambiguous contacts removed.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#SensorFeature`

**Constraints**:
- Features must have `properties.kind == "SENSOR"`
- Each sensor must have a `contacts` array
- Each contact must have an `ambiguous` boolean property (or be treated as unambiguous if missing)

**Defaults**:
- Contacts without an `ambiguous` property are treated as unambiguous (retained)

## Outputs

Returns a **ToolResponse** with mutation content items.

**Response Schema**: `specs/041-document-tool-results/data-model.md#MutationResult`

**Result Type**: `mutation/sensor/filtered`

**Content Items**: One `MutationResult` per modified sensor feature containing:
- `type`: "resource"
- `uri`: `feature://{sensor_feature_id}`
- `mimeType`: "application/geo+json"
- `text`: Serialized modified SensorFeature with ambiguous contacts removed

**Annotations** (on each content item):
- `debrief:resultType`: `"mutation/sensor/filtered"`
- `debrief:sourceFeatures`: `["{sensor_feature_id}"]`
- `debrief:deletedFeatures`: IDs of removed ambiguous contacts
- `debrief:label`: `"Deleted {n} ambiguous bearing(s) from {sensor_name} ({m} contacts remaining)"`

## Algorithm

```pseudocode
FUNCTION delete_ambiguous_bearings(features: FeatureCollection) -> ToolResponse:
    // Validate inputs
    IF features IS NULL OR features.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    modified_features = empty list
    source_ids = empty list

    FOR EACH feature IN features.features:
        // Skip non-sensor features
        IF feature.properties.kind != "SENSOR":
            CONTINUE
        END IF

        contacts = feature.properties.contacts
        IF contacts IS NULL:
            CONTINUE
        END IF

        source_ids.append(feature.id)

        retained_contacts = empty list
        deleted_ids = empty list

        FOR EACH contact IN contacts:
            IF contact.ambiguous == true:
                // Contact is ambiguous -- mark for deletion
                deleted_ids.append(contact.id)
            ELSE:
                // Contact is unambiguous or ambiguous flag is absent -- retain
                retained_contacts.append(contact)
            END IF
        END FOR

        // Update sensor with filtered contacts
        feature.properties.contacts = retained_contacts

        modified_features.append({
            feature: feature,
            deleted_ids: deleted_ids,
            deleted_count: LENGTH(deleted_ids),
            remaining_count: LENGTH(retained_contacts)
        })
    END FOR

    IF modified_features IS EMPTY:
        RETURN build_error("No sensor features found in input", "invalid_input", [])
    END IF

    // Build mutation response with deletion annotations
    content_items = empty list
    FOR EACH result IN modified_features:
        item = build_mutation_item(
            feature: result.feature,
            result_subtype: "sensor/filtered",
            source_feature_ids: [result.feature.id],
            deleted_features: result.deleted_ids,
            label: "Deleted " + result.deleted_count + " ambiguous bearing(s) from "
                   + result.feature.properties.sensor_name
                   + " (" + result.remaining_count + " contacts remaining)"
        )
        content_items.append(item)
    END FOR

    RETURN build_response(content_items)
END FUNCTION
```

### Complexity

- **Time**: O(n * m) -- iterates over n sensors with m contacts each
- **Space**: O(m) -- stores retained contacts list per sensor

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Return error response: `invalid_input`, "Input features required" |
| No sensor features in input | Return error response: `invalid_input`, "No sensor features found in input" |
| Sensor with no contacts | Skip sensor, do not include in output |
| No ambiguous contacts found | Return sensor unchanged with 0 deletions reported |
| All contacts are ambiguous | Return sensor with empty contacts array |
| Contact missing `ambiguous` property | Treat as unambiguous (retain the contact) |
| Multiple sensors in input | Process each sensor independently |
| Mixed sensor and non-sensor features | Skip non-sensor features |
| Contact with `ambiguous: false` | Retain the contact |

## Examples

### Basic Usage

**Input**: `delete-ambiguous-bearings.basic.input.json`
**Output**: `delete-ambiguous-bearings.basic.output.json`

Description: Removes 1 ambiguous bearing from a sensor with 3 contacts, leaving 2 unambiguous contacts.

### Edge Case: No Ambiguous Bearings

**Input**: `delete-ambiguous-bearings.edge.input.json`
**Output**: `delete-ambiguous-bearings.edge.output.json`

Description: All contacts are unambiguous; sensor is returned unchanged with 0 deletions.

### Complex: Multiple Sensors with Mixed Ambiguity

**Input**: `delete-ambiguous-bearings.complex.input.json`
**Output**: `delete-ambiguous-bearings.complex.output.json`

Description: Processes two sensors -- Port Array (3 of 5 ambiguous) and Starboard Array (1 of 2 ambiguous). Each sensor is filtered independently.

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Filters contacts based on `ambiguous` boolean property
- Reports deletion counts and remaining contacts per sensor

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_mutation()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for result annotations

**Related Tools**:
- [merge-contacts](../analysis/merge-contacts.1.0.md) - Merge contacts from multiple sensors
- [insert-sensor-arc](../analysis/insert-sensor-arc.1.0.md) - Insert new sensor arc contact

**Input Schemas**:
- [SensorFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON sensor feature definition
- [SensorContact](../../../schemas/src/linkml/geojson.yaml) - Sensor contact data model

**Legacy**:
- Debrief 3.x: `org.mwc.debrief.track_shift.views.BearingResidualsView` (inner class)
