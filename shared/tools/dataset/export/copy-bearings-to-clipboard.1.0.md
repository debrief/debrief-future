---
name: copy-bearings-to-clipboard
version: 1.0
category: dataset/export
status: draft
created: 2026-02-07
migrated_from: org.mwc.debrief.core.ContextOperations.CopyBearingsToClipboard
---

# Copy Bearings To Clipboard

> Copy sensor bearing data to clipboard in tab-separated tabular format.

## MCP

**Description**: Copies sensor cut data (time, bearing, frequency) from a single sensor to the clipboard as tab-separated text. Useful for pasting bearing data into spreadsheets or other analysis tools.

**When to use**: When the user wants to copy sensor bearing data for external analysis, paste bearing data into a spreadsheet, or extract bearing-time-frequency data from a sensor.

**Parameters**:
- `features`: FeatureCollection containing exactly one sensor feature

**Returns**: ToolResponse containing tab-separated bearing data as a text artifact suitable for clipboard placement.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#SensorFeature`

**Constraints**:
- Exactly one feature with `properties.kind == "SENSOR"` required
- Feature must have a `cuts` array with at least one sensor cut
- Each cut must have `time` and `bearing` fields; `frequency` is optional

**Defaults**:
- None (all parameters required)

## Outputs

Returns a **ToolResponse** with a single artifact content item.

**Response Schema**: `specs/041-document-tool-results/data-model.md#ArtifactResult`

**Result Type**: `artifact/dataset/bearing_table`

**Content Items**: One `ArtifactResult` containing:
- `type`: "resource"
- `uri`: `artifact://copy-bearings-to-clipboard/{sensor_name}`
- `mimeType`: "text/plain"
- `text`: Tab-separated table with header row and one data row per cut

**Annotations** (on each content item):
- `debrief:resultType`: `"artifact/dataset/bearing_table"`
- `debrief:sourceFeatures`: `["{sensor_feature_id}"]`
- `debrief:label`: `"Copied {n} bearing cuts from sensor {sensor_name} to clipboard"`

## Algorithm

```pseudocode
FUNCTION copy_bearings_to_clipboard(features: FeatureCollection) -> ToolResponse:
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

    IF sensor.properties.cuts IS NULL OR sensor.properties.cuts IS EMPTY:
        RETURN build_error("Sensor has no cuts to copy", "invalid_input", [sensor.id])
    END IF

    sensor_name = sensor.properties.sensor_name OR "Unknown"

    // Build tab-separated header
    lines = empty list
    lines.append("Time" + TAB + "Bearing (deg)" + TAB + "Frequency (Hz)")

    // Build data rows sorted by time
    sorted_cuts = SORT(sensor.properties.cuts, BY cut.time ASCENDING)

    FOR EACH cut IN sorted_cuts:
        time_str = cut.time
        bearing_str = FORMAT_NUMBER(cut.bearing)
        frequency_str = IF cut.frequency IS NOT NULL THEN FORMAT_NUMBER(cut.frequency) ELSE ""

        lines.append(time_str + TAB + bearing_str + TAB + frequency_str)
    END FOR

    table_text = JOIN(lines, newline)
    cut_count = LENGTH(sorted_cuts)

    // Build artifact response
    content_items = build_artifact(
        data: table_text,
        mime: "text/plain",
        result_subtype: "dataset/bearing_table",
        source_feature_ids: [sensor.id],
        label: "Copied " + cut_count + " bearing cuts from sensor " + sensor_name + " to clipboard"
    )

    RETURN build_response(content_items)
END FUNCTION
```

### Complexity

- **Time**: O(n log n) -- sorts n cuts by time, then iterates once
- **Space**: O(n) -- stores one text row per cut

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Return error response: `invalid_input`, "Input features required" |
| No sensor features in input | Return error response: `invalid_input`, "No sensor feature found in input" |
| Sensor with no cuts | Return error response: `invalid_input`, "Sensor has no cuts to copy" |
| Multiple sensors in input | Use only the first sensor found |
| Cut missing frequency field | Write empty cell for frequency column |
| Cut missing bearing field | Skip that cut (bearing is required for meaningful output) |
| Cuts in unsorted order | Sort by time ascending before output |
| Non-sensor features mixed in | Skip non-sensor features |
| Sensor name not set | Use "Unknown" as fallback sensor name |

## Examples

### Basic Usage

**Input**: `copy-bearings-to-clipboard.basic.input.json`
**Output**: `copy-bearings-to-clipboard.basic.output.json`

Description: Copies two bearing cuts from TOWED_ARRAY sensor with time, bearing, and frequency columns as tab-separated text.

### Error Response Example

```json
{
  "error": {
    "code": -32000,
    "message": "No sensor feature found in input",
    "data": {
      "debrief:errorCategory": "invalid_input",
      "debrief:affectedFeatures": []
    }
  }
}
```

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Tab-separated output with Time, Bearing, Frequency columns
- Sorts cuts by time ascending

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_artifact()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for result annotations

**Related Tools**:
- [copy-time-data-to-clipboard](./copy-time-data-to-clipboard.1.0.md) - Copy time-position data to clipboard
- [export-track-as-csv](./export-track-as-csv.1.0.md) - Export track as CSV file

**Input Schemas**:
- [SensorFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON sensor feature definition

**Legacy**:
- Debrief 3.x: `org.mwc.debrief.core.ContextOperations.CopyBearingsToClipboard`
