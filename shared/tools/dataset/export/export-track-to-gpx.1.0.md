---
name: export-track-to-gpx
version: 1.0
category: dataset/export
status: draft
created: 2026-02-07
migrated_from: org.mwc.debrief.core.operations.ExportTrackToGPX
---

# Export Track To GPX

> Export one or more tracks as a GPX file with track points containing lat, lon, elevation, time, and Debrief extensions for course and speed.

## MCP

**Description**: Exports one or more tracks as a GPX 1.1 XML file. Each track becomes a `<trk>` element with `<trkpt>` entries for every position, including standard GPX fields (lat, lon, elevation, time) and Debrief-specific extensions (course, speed).

**When to use**: When the user wants to export track data for use in GPS software, mapping applications, or other systems that consume GPX files.

**Parameters**:
- `features`: FeatureCollection containing one or more track features to export

**Returns**: ToolResponse containing a GPX XML artifact with track segments and trackpoints.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature`

**Constraints**:
- At least one feature with `properties.kind == "TRACK"` required
- Each track must have a `positions` array with at least one position
- Each position must have `time` and `coordinates` ([lon, lat])

**Defaults**:
- Elevation defaults to negated depth value (depth 50m becomes elevation -50.0); 0.0 if no depth
- Track name defaults to `platform_name`; falls back to feature `id`

## Outputs

Returns a **ToolResponse** with one artifact content item per exported track.

**Response Schema**: `specs/041-document-tool-results/data-model.md#ArtifactResult`

**Result Type**: `artifact/dataset/exported_gpx`

**Content Items**: One `ArtifactResult` per track containing:
- `type`: "resource"
- `uri`: `artifact://export-track-to-gpx/{platform_name}.gpx`
- `mimeType`: "application/gpx+xml"
- `text`: Full GPX XML content

**Annotations** (on each content item):
- `debrief:resultType`: `"artifact/dataset/exported_gpx"`
- `debrief:sourceFeatures`: `["{track_feature_ids}"]`
- `debrief:label`: `"Exported track {name} as GPX ({n} trackpoints)"`
- `debrief:href`: `"{platform_name}.gpx"`

## Algorithm

```pseudocode
FUNCTION export_track_to_gpx(features: FeatureCollection) -> ToolResponse:
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

    // Build GPX XML document
    gpx_header = '<?xml version="1.0" encoding="UTF-8"?>'
    gpx_open = '<gpx version="1.1" creator="Debrief"'
             + ' xmlns="http://www.topografix.com/GPX/1/1"'
             + ' xmlns:debrief="http://www.debrief.info/gpx/extensions">'

    trk_elements = empty list
    source_ids = empty list
    total_points = 0

    FOR EACH track IN tracks:
        source_ids.append(track.id)
        track_name = track.properties.platform_name OR track.id
        track_type = track.properties.track_type OR ""

        trk_xml = "  <trk>"
        trk_xml += "    <name>" + track_name + "</name>"
        IF track_type IS NOT EMPTY:
            trk_xml += "    <type>" + track_type + "</type>"
        END IF
        trk_xml += "    <trkseg>"

        IF track.properties.positions IS NOT NULL:
            FOR EACH position IN track.properties.positions:
                lat = position.coordinates[1]
                lon = position.coordinates[0]
                elevation = IF position.depth IS NOT NULL THEN -1 * position.depth ELSE 0.0
                time = position.time

                trkpt = '      <trkpt lat="' + lat + '" lon="' + lon + '">'
                trkpt += "        <ele>" + elevation + "</ele>"
                trkpt += "        <time>" + time + "</time>"

                // Add Debrief extensions if course or speed present
                IF position.course IS NOT NULL OR position.speed IS NOT NULL:
                    trkpt += "        <extensions>"
                    IF position.course IS NOT NULL:
                        trkpt += "          <debrief:course>" + position.course + "</debrief:course>"
                    END IF
                    IF position.speed IS NOT NULL:
                        trkpt += "          <debrief:speed>" + position.speed + "</debrief:speed>"
                    END IF
                    trkpt += "        </extensions>"
                END IF

                trkpt += "      </trkpt>"
                trk_xml += trkpt
                total_points += 1
            END FOR
        END IF

        trk_xml += "    </trkseg>"
        trk_xml += "  </trk>"
        trk_elements.append(trk_xml)
    END FOR

    gpx_close = "</gpx>"
    gpx_content = gpx_header + newline + gpx_open + newline
                + JOIN(trk_elements, newline) + newline + gpx_close

    // Determine filename
    IF LENGTH(tracks) == 1:
        filename = (tracks[0].properties.platform_name OR tracks[0].id) + ".gpx"
        label = "Exported track " + filename[:-4] + " as GPX (" + total_points + " trackpoints)"
    ELSE:
        filename = "tracks_export.gpx"
        label = "Exported " + LENGTH(tracks) + " tracks as GPX (" + total_points + " trackpoints)"
    END IF

    // Build artifact response
    content_items = build_artifact(
        data: gpx_content,
        mime: "application/gpx+xml",
        result_subtype: "dataset/exported_gpx",
        source_feature_ids: source_ids,
        label: label,
        href: filename
    )

    RETURN build_response(content_items)
END FUNCTION
```

### Complexity

- **Time**: O(t * p) -- iterates over t tracks and p positions per track
- **Space**: O(t * p) -- stores the full GPX XML string

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Return error response: `invalid_input`, "Input features required" |
| No track features in input | Return error response: `invalid_input`, "No track features found in input" |
| Track with no positions | Include `<trk>` element with empty `<trkseg>` |
| Multiple tracks in input | All tracks included as separate `<trk>` elements in one GPX file |
| Position with depth > 0 (submerged) | Elevation is negated depth (depth 50 becomes ele -50.0) |
| Position missing depth | Elevation defaults to 0.0 |
| Position missing course and speed | Omit `<extensions>` block for that trackpoint |
| Position missing only course | Include `<extensions>` with speed only |
| Track missing platform_name | Use feature `id` as track name |
| Non-track features mixed in | Skip non-track features |
| Special characters in track name | XML-escape the name value |

## Examples

### Basic Usage

**Input**: `export-track-to-gpx.basic.input.json`
**Output**: `export-track-to-gpx.basic.output.json`

Description: Exports a two-position OWNSHIP surface track as GPX 1.1 with elevation, time, course, and speed extensions.

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
- GPX 1.1 output with Debrief namespace extensions for course and speed
- Supports multiple tracks in a single GPX file

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_artifact()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for result annotations

**Related Tools**:
- [export-track-as-csv](./export-track-as-csv.1.0.md) - Export track as CSV in UK Track Exchange Format
- [copy-time-data-to-clipboard](./copy-time-data-to-clipboard.1.0.md) - Copy time-position data to clipboard

**Input Schemas**:
- [TrackFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON track feature definition

**Legacy**:
- Debrief 3.x: `org.mwc.debrief.core.operations.ExportTrackToGPX`

**External**:
- [GPX 1.1 Schema](https://www.topografix.com/GPX/1/1/) - GPS Exchange Format specification
