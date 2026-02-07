---
name: export-track-as-csv
version: 1.0
category: dataset/export
status: draft
created: 2026-02-07
migrated_from: org.mwc.debrief.core.ContextOperations.ExportTrackAsCSV
---

# Export Track As CSV

> Export track positions as a CSV file in UK Track Exchange Format V1.0.

## MCP

**Description**: Exports a single track's position data as a CSV file conforming to the UK Track Exchange Format V1.0 specification. Produces a CSV with header comments and rows containing lat, long, DTG, and metadata columns.

**When to use**: When the user wants to export a track for interchange with other maritime analysis systems, produce a CSV file of track positions, or share track data in the UK Track Exchange Format.

**Parameters**:
- `features`: FeatureCollection containing exactly one track feature to export
- `metadata`: Object with export metadata fields (unit_name, case_number, classification, type, flag, sensor, supplied_by, provenance, info_cutoff_date, purpose, distribution_statement)

**Returns**: ToolResponse containing a CSV artifact with header comments and position rows in UK Track Exchange Format V1.0.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature`

**Constraints**:
- Exactly one feature with `properties.kind == "TRACK"` required
- Feature must have a `positions` array with at least one position
- Each position must have `time` and `coordinates` ([lon, lat])
- Metadata fields are optional; missing values produce empty CSV cells

**Defaults**:
- `metadata.unit_name`: Feature's `platform_name` if not specified
- `metadata.type`: Feature's `track_type` if not specified
- All other metadata fields: empty string if not specified

## Outputs

Returns a **ToolResponse** with a single artifact content item.

**Response Schema**: `specs/041-document-tool-results/data-model.md#ArtifactResult`

**Result Type**: `artifact/dataset/exported_csv`

**Content Items**: One `ArtifactResult` containing:
- `type`: "resource"
- `uri`: `artifact://export-track-as-csv/{platform_name}.csv`
- `mimeType`: "text/csv"
- `text`: Full CSV content including header comments and data rows

**Annotations** (on each content item):
- `debrief:resultType`: `"artifact/dataset/exported_csv"`
- `debrief:sourceFeatures`: `["{track_feature_id}"]`
- `debrief:label`: `"Exported track {platform_name} as CSV ({n} positions)"`
- `debrief:href`: `"{platform_name}.csv"`

## Algorithm

```pseudocode
FUNCTION export_track_as_csv(features: FeatureCollection, metadata: ExportMetadata) -> ToolResponse:
    // Validate inputs
    IF features IS NULL OR features.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    // Find track feature
    track = NULL
    FOR EACH feature IN features.features:
        IF feature.properties.kind == "TRACK":
            track = feature
            BREAK
        END IF
    END FOR

    IF track IS NULL:
        RETURN build_error("No track feature found in input", "invalid_input", [])
    END IF

    IF track.properties.positions IS NULL OR track.properties.positions IS EMPTY:
        RETURN build_error("Track has no positions to export", "invalid_input", [track.id])
    END IF

    // Resolve metadata defaults
    unit_name = metadata.unit_name OR track.properties.platform_name OR ""
    case_number = metadata.case_number OR ""
    classification = metadata.classification OR ""
    type = metadata.type OR track.properties.track_type OR ""
    flag = metadata.flag OR ""
    sensor = metadata.sensor OR ""
    supplied_by = metadata.supplied_by OR ""
    provenance = metadata.provenance OR ""
    info_cutoff_date = metadata.info_cutoff_date OR ""
    purpose = metadata.purpose OR ""
    distribution_statement = metadata.distribution_statement OR ""

    // Build CSV header comments
    csv_lines = empty list
    csv_lines.append("// UK Track Exchange Format V1.0")
    csv_lines.append("// Exported from Debrief")
    csv_lines.append("// Unit Name: " + unit_name)
    csv_lines.append("// Case Number: " + case_number)
    csv_lines.append("// Classification: " + classification)

    // Build CSV column header
    columns = "Lat,Long,DTG,UnitName,CaseNumber,Type,Flag,Sensor,"
             + "MajorAxis,SemiMajorAxis,SemiMinorAxis,"
             + "Course,Speed,Depth,Likelihood,Confidence,"
             + "SuppliedBy,Provenance,InfoCutoffDate,Purpose,"
             + "Classification,DistributionStatement"
    csv_lines.append(columns)

    // Build CSV data rows
    FOR EACH position IN track.properties.positions:
        lat = position.coordinates[1]
        lon = position.coordinates[0]
        dtg = position.time
        course = position.course OR ""
        speed = position.speed OR ""
        depth = position.depth OR ""
        major_axis = position.major_axis OR ""
        semi_major_axis = position.semi_major_axis OR ""
        semi_minor_axis = position.semi_minor_axis OR ""
        likelihood = position.likelihood OR ""
        confidence = position.confidence OR ""

        row = lat + "," + lon + "," + dtg + ","
            + unit_name + "," + case_number + "," + type + ","
            + flag + "," + sensor + ","
            + major_axis + "," + semi_major_axis + "," + semi_minor_axis + ","
            + course + "," + speed + "," + depth + ","
            + likelihood + "," + confidence + ","
            + supplied_by + "," + provenance + "," + info_cutoff_date + ","
            + purpose + "," + classification + "," + distribution_statement

        csv_lines.append(row)
    END FOR

    csv_content = JOIN(csv_lines, newline)
    position_count = LENGTH(track.properties.positions)

    // Build artifact response
    content_items = build_artifact(
        data: csv_content,
        mime: "text/csv",
        result_subtype: "dataset/exported_csv",
        source_feature_ids: [track.id],
        label: "Exported track " + unit_name + " as CSV (" + position_count + " positions)",
        href: unit_name + ".csv"
    )

    RETURN build_response(content_items)
END FUNCTION
```

### Complexity

- **Time**: O(n) -- iterates once over n positions
- **Space**: O(n) -- stores one CSV row per position

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Return error response: `invalid_input`, "Input features required" |
| No track features in input | Return error response: `invalid_input`, "No track feature found in input" |
| Track with no positions | Return error response: `invalid_input`, "Track has no positions to export" |
| Multiple tracks in input | Export only the first track found |
| Missing metadata fields | Use empty strings for missing metadata values |
| Position missing course/speed/depth | Write empty CSV cells for missing kinematic values |
| Position missing optional ellipse fields | Write empty CSV cells for MajorAxis, SemiMajorAxis, SemiMinorAxis |
| Metadata unit_name not provided | Fall back to track's `platform_name` property |
| Non-track features mixed in | Skip non-track features, use first track |
| Special characters in metadata values | Include as-is; CSV quoting not applied (values assumed alphanumeric) |

## Examples

### Basic Usage

**Input**: `export-track-as-csv.basic.input.json`
**Output**: `export-track-as-csv.basic.output.json`

Description: Exports a two-position OWNSHIP surface track with full metadata as UK Track Exchange Format V1.0 CSV.

### Error Response Example

```json
{
  "error": {
    "code": -32000,
    "message": "No track feature found in input",
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
- Supports UK Track Exchange Format V1.0 with 22 columns
- Wizard metadata mapped to tool parameters

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_artifact()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for result annotations

**Related Tools**:
- [export-track-to-gpx](./export-track-to-gpx.1.0.md) - Export track as GPX file
- [copy-time-data-to-clipboard](./copy-time-data-to-clipboard.1.0.md) - Copy time-position data to clipboard

**Input Schemas**:
- [TrackFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON track feature definition

**Legacy**:
- Debrief 3.x: `org.mwc.debrief.core.ContextOperations.ExportTrackAsCSV`

**External**:
- UK Track Exchange Format V1.0 specification
