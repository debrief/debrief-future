---
name: rainbow-shade-sonar-cuts
version: 1.0
category: track/styling
status: draft
created: 2026-02-07
migrated_from: org.mwc.debrief.core.ContextOperations.RainbowShadeSonarCuts
---

# Rainbow Shade Sonar Cuts

> Color-code sonar contacts by time using one of three shading modes.

## MCP

**Description**: Applies time-based color shading to sonar contacts. Supports three modes: RAINBOW_SHADE (HSB hue ramp), BLUE_RED_SPECTRUM (linear blue-to-red), and CLEAR_SHADE (reset to default color).

**When to use**: When the user wants to visually distinguish sonar contacts by time, apply a rainbow or spectrum color gradient to bearing lines, or reset contact colors to defaults.

**Parameters**:
- `features`: FeatureCollection containing one or more sensor features with sonar contacts
- `mode`: Shading mode -- one of `RAINBOW_SHADE`, `BLUE_RED_SPECTRUM`, or `CLEAR_SHADE`

**Returns**: ToolResponse containing modified sensor features with updated contact colors.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#SensorFeature`

**Constraints**:
- Features must have `properties.kind == "SENSOR"`
- Each sensor must have a non-empty `contacts` array
- Each contact must have a `time` property
- Mode must be one of `RAINBOW_SHADE`, `BLUE_RED_SPECTRUM`, `CLEAR_SHADE`

**Defaults**:
- `mode`: `RAINBOW_SHADE` if not specified

## Outputs

Returns a **ToolResponse** with mutation content items.

**Response Schema**: `specs/041-document-tool-results/data-model.md#MutationResult`

**Result Type**: `mutation/sensor/shaded`

**Content Items**: One `MutationResult` per modified sensor feature containing:
- `type`: "resource"
- `uri`: `feature://{sensor_feature_id}`
- `mimeType`: "application/geo+json"
- `text`: Serialized modified SensorFeature with updated contact colors

**Annotations** (on each content item):
- `debrief:resultType`: `"mutation/sensor/shaded"`
- `debrief:sourceFeatures`: `["{sensor_feature_id}"]`
- `debrief:label`: `"{mode_description} shaded {n} sonar contact(s) on {sensor_name}"`

## Algorithm

```pseudocode
FUNCTION rainbow_shade_sonar_cuts(features: FeatureCollection, mode: string) -> ToolResponse:
    // Validate inputs
    IF features IS NULL OR features.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    IF mode IS NULL:
        mode = "RAINBOW_SHADE"
    END IF

    IF mode NOT IN ["RAINBOW_SHADE", "BLUE_RED_SPECTRUM", "CLEAR_SHADE"]:
        RETURN build_error("mode must be RAINBOW_SHADE, BLUE_RED_SPECTRUM, or CLEAR_SHADE", "invalid_input", [])
    END IF

    modified_features = empty list
    source_ids = empty list

    FOR EACH feature IN features.features:
        // Skip non-sensor features
        IF feature.properties.kind != "SENSOR":
            CONTINUE
        END IF

        contacts = feature.properties.contacts
        IF contacts IS NULL OR contacts IS EMPTY:
            CONTINUE
        END IF

        source_ids.append(feature.id)

        // Sort contacts by time
        sorted_contacts = SORT(contacts, BY contact.time ASCENDING)
        start_time = sorted_contacts[0].time
        end_time = sorted_contacts[LAST].time
        total_duration = end_time - start_time

        FOR EACH contact IN sorted_contacts:
            // Compute time proportion (0.0 to 1.0)
            IF total_duration == 0:
                proportion = 0.0
            ELSE:
                proportion = (contact.time - start_time) / total_duration
            END IF

            // Initialize style if not present
            IF contact.style IS NULL:
                contact.style = {}
            END IF

            IF mode == "RAINBOW_SHADE":
                // HSB color with hue varying by time
                hue = proportion
                saturation = 0.8
                brightness = 0.7
                contact.style.color = hsb_to_color(hue, saturation, brightness)

            ELSE IF mode == "BLUE_RED_SPECTRUM":
                // Linear interpolation from blue (0,0,255) to red (255,0,0)
                r = ROUND(255 * proportion)
                g = 0
                b = ROUND(255 * (1.0 - proportion))
                contact.style.color = rgb_to_color(r, g, b)

            ELSE IF mode == "CLEAR_SHADE":
                // Reset to default color
                contact.style.color = DEFAULT_CONTACT_COLOR
            END IF
        END FOR

        feature.properties.contacts = sorted_contacts
        modified_features.append(feature)
    END FOR

    IF modified_features IS EMPTY:
        RETURN build_error("No sensor features with contacts found in input", "invalid_input", [])
    END IF

    // Build mutation response
    content_items = build_mutation(
        features: modified_features,
        result_subtype: "sensor/shaded",
        source_feature_ids: source_ids,
        label: mode_label(mode) + " shaded " + total_contacts + " sonar contact(s) on " + sensor_names
    )

    RETURN build_response(content_items)
END FUNCTION

FUNCTION hsb_to_color(hue: float, saturation: float, brightness: float) -> string:
    // Convert HSB values to a CSS-compatible color string
    RETURN "hsb(" + FORMAT(hue, 3) + "," + saturation + "," + brightness + ")"
END FUNCTION

FUNCTION rgb_to_color(r: int, g: int, b: int) -> string:
    RETURN "rgb(" + r + "," + g + "," + b + ")"
END FUNCTION

CONSTANT DEFAULT_CONTACT_COLOR = "#3388ff"

FUNCTION mode_label(mode: string) -> string:
    IF mode == "RAINBOW_SHADE": RETURN "Rainbow"
    IF mode == "BLUE_RED_SPECTRUM": RETURN "Blue-red spectrum"
    IF mode == "CLEAR_SHADE": RETURN "Cleared shading on"
END FUNCTION
```

### Complexity

- **Time**: O(n log n) per sensor -- sorting contacts by time dominates
- **Space**: O(n) -- stores modified contacts list

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Return error response: `invalid_input`, "Input features required" |
| No sensor features in input | Return error response: `invalid_input`, "No sensor features with contacts found in input" |
| Sensor with no contacts | Skip sensor, do not include in output |
| Single contact (zero duration) | Assign proportion 0.0; RAINBOW_SHADE gives hue=0 (red), BLUE_RED gives pure blue |
| Contacts with identical timestamps | All contacts get proportion 0.0 (same color) |
| Invalid mode string | Return error response: `invalid_input`, "mode must be RAINBOW_SHADE, BLUE_RED_SPECTRUM, or CLEAR_SHADE" |
| CLEAR_SHADE mode | Reset all contact colors to default (#3388ff) |
| Contact missing style property | Initialize empty style object before applying color |
| Multiple sensors in input | Process each sensor independently with its own time range |
| Mixed sensor and non-sensor features | Skip non-sensor features, process only sensors |

## Examples

### Basic Usage

**Input**: `rainbow-shade-sonar-cuts.basic.input.json`
**Output**: `rainbow-shade-sonar-cuts.basic.output.json`

Description: Applies RAINBOW_SHADE mode to a single sensor with 3 contacts spanning 10 minutes. Contacts receive hue values at 0.0, 0.5, and 1.0.

### Edge Case: Single Contact with CLEAR_SHADE

**Input**: `rainbow-shade-sonar-cuts.edge.input.json`
**Output**: `rainbow-shade-sonar-cuts.edge.output.json`

Description: Applies CLEAR_SHADE mode to a sensor with a single contact, resetting its color to the default value.

### Complex: Multiple Sensors with BLUE_RED_SPECTRUM

**Input**: `rainbow-shade-sonar-cuts.complex.input.json`
**Output**: `rainbow-shade-sonar-cuts.complex.output.json`

Description: Applies BLUE_RED_SPECTRUM to two sensors (Port Array with 5 contacts, Starboard Array with 3 contacts). Each sensor's contacts are shaded independently based on their own time range.

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Supports three shading modes: RAINBOW_SHADE, BLUE_RED_SPECTRUM, CLEAR_SHADE
- Processes multiple sensors independently

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_mutation()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for result annotations

**Related Tools**:
- [set-track-color](./set-track-color.1.0.md) - Modify track line color
- [apply-symbol-style](./apply-symbol-style.1.0.md) - Modify position marker appearance

**Input Schemas**:
- [SensorFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON sensor feature definition
- [SensorContact](../../../schemas/src/linkml/geojson.yaml) - Sensor contact data model

**Legacy**:
- Debrief 3.x: `org.mwc.debrief.core.ContextOperations.RainbowShadeSonarCuts`
