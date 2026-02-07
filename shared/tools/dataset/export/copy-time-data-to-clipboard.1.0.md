---
name: copy-time-data-to-clipboard
version: 1.0
category: dataset/export
status: draft
created: 2026-02-07
migrated_from: Debrief.Tools.FilterOperations.CopyTimeDataToClipboard
---

# Copy Time Data To Clipboard

> Copy time-stamped position data from one or more tracks to clipboard as tab-separated text.

## MCP

**Description**: Copies time-stamped position data (time, lat, lon, course, speed, depth) from one or more tracks to the clipboard as tab-separated text. Useful for pasting track position data into spreadsheets or analysis tools.

**When to use**: When the user wants to copy track position data for external analysis, paste track kinematic data into a spreadsheet, or extract a time series of positions from selected tracks.

**Parameters**:
- `features`: FeatureCollection containing one or more track features

**Returns**: ToolResponse containing tab-separated position data as a text artifact suitable for clipboard placement.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature`

**Constraints**:
- At least one feature with `properties.kind == "TRACK"` required
- Each track must have a `positions` array with at least one position
- Each position must have `time` and `coordinates` ([lon, lat])

**Defaults**:
- None (all parameters required)

## Outputs

Returns a **ToolResponse** with a single artifact content item.

**Response Schema**: `specs/041-document-tool-results/data-model.md#ArtifactResult`

**Result Type**: `artifact/dataset/time_series_table`

**Content Items**: One `ArtifactResult` containing:
- `type`: "resource"
- `uri`: `artifact://copy-time-data-to-clipboard/{track_names}`
- `mimeType`: "text/plain"
- `text`: Tab-separated table with header row and one data row per position across all tracks

**Annotations** (on each content item):
- `debrief:resultType`: `"artifact/dataset/time_series_table"`
- `debrief:sourceFeatures`: `["{track_feature_ids}"]`
- `debrief:label`: `"Copied time data for {n} track(s) ({m} positions) to clipboard"`

## Algorithm

```pseudocode
FUNCTION copy_time_data_to_clipboard(features: FeatureCollection) -> ToolResponse:
    // Validate inputs
    IF features IS NULL OR features.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    // Collect track features
    tracks = empty list
    FOR EACH feature IN features.features:
        IF feature.properties.kind == "TRACK":
            tracks.append(feature)
        END IF
    END FOR

    IF tracks IS EMPTY:
        RETURN build_error("No track features found in input", "invalid_input", [])
    END IF

    // Build tab-separated header
    lines = empty list
    lines.append("Track" + TAB + "Time" + TAB + "Lat" + TAB + "Lon"
               + TAB + "Course (deg)" + TAB + "Speed (kts)" + TAB + "Depth (m)")

    source_ids = empty list
    total_positions = 0

    // Build data rows for each track
    FOR EACH track IN tracks:
        source_ids.append(track.id)
        track_name = track.properties.platform_name OR track.id

        IF track.properties.positions IS NULL OR track.properties.positions IS EMPTY:
            CONTINUE
        END IF

        // Sort positions by time
        sorted_positions = SORT(track.properties.positions, BY position.time ASCENDING)

        FOR EACH position IN sorted_positions:
            lat = position.coordinates[1]
            lon = position.coordinates[0]
            time_str = position.time
            course_str = IF position.course IS NOT NULL THEN FORMAT_NUMBER(position.course) ELSE ""
            speed_str = IF position.speed IS NOT NULL THEN FORMAT_NUMBER(position.speed) ELSE ""
            depth_str = IF position.depth IS NOT NULL THEN FORMAT_NUMBER(position.depth) ELSE ""

            lines.append(track_name + TAB + time_str + TAB + lat + TAB + lon
                       + TAB + course_str + TAB + speed_str + TAB + depth_str)
            total_positions += 1
        END FOR
    END FOR

    IF total_positions == 0:
        RETURN build_error("Selected tracks have no positions", "invalid_input", source_ids)
    END IF

    table_text = JOIN(lines, newline)
    track_count = LENGTH(tracks)

    // Build URI from track names
    IF track_count == 1:
        uri_suffix = tracks[0].properties.platform_name OR tracks[0].id
    ELSE:
        uri_suffix = track_count + "_tracks"
    END IF

    // Build artifact response
    content_items = build_artifact(
        data: table_text,
        mime: "text/plain",
        result_subtype: "dataset/time_series_table",
        source_feature_ids: source_ids,
        label: "Copied time data for " + track_count + " track(s) (" + total_positions + " positions) to clipboard"
    )

    RETURN build_response(content_items)
END FUNCTION
```

### Complexity

- **Time**: O(t * p log p) -- sorts p positions per track for t tracks
- **Space**: O(t * p) -- stores one text row per position across all tracks

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Return error response: `invalid_input`, "Input features required" |
| No track features in input | Return error response: `invalid_input`, "No track features found in input" |
| All tracks have no positions | Return error response: `invalid_input`, "Selected tracks have no positions" |
| Multiple tracks in input | Include all tracks interleaved, each row prefixed with track name |
| Track with no positions array | Skip that track, continue with others |
| Position missing course | Write empty cell for course column |
| Position missing speed | Write empty cell for speed column |
| Position missing depth | Write empty cell for depth column |
| Positions in unsorted order | Sort by time ascending within each track |
| Non-track features mixed in | Skip non-track features |
| Track missing platform_name | Use feature `id` as track name in rows |

## Examples

### Basic Usage

**Input**: `copy-time-data-to-clipboard.basic.input.json`
**Output**: `copy-time-data-to-clipboard.basic.output.json`

Description: Copies two positions from OWNSHIP track with time, lat, lon, course, speed, and depth columns as tab-separated text.

### Error Response Example

```json
{
  "error": {
    "code": -32000,
    "message": "No track features found in input",
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
- Tab-separated output with Track, Time, Lat, Lon, Course, Speed, Depth columns
- Supports multiple tracks in a single output table

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_artifact()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for result annotations

**Related Tools**:
- [copy-bearings-to-clipboard](./copy-bearings-to-clipboard.1.0.md) - Copy sensor bearing data to clipboard
- [export-track-as-csv](./export-track-as-csv.1.0.md) - Export track as CSV file
- [export-track-to-gpx](./export-track-to-gpx.1.0.md) - Export track as GPX file

**Input Schemas**:
- [TrackFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON track feature definition

**Legacy**:
- Debrief 3.x: `Debrief.Tools.FilterOperations.CopyTimeDataToClipboard`
