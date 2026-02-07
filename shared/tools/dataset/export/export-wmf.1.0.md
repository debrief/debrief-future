---
name: export-wmf
version: 1.0
category: dataset/export
status: draft
created: 2026-02-07
migrated_from: org.mwc.cmap.plotViewer.actions.ExportWMF
---

# Export WMF

> Export the current plot view as a Windows Metafile (WMF) vector image.

## MCP

**Description**: Renders all visible features within the current view bounds to a Windows Metafile (WMF) vector format. Produces a scalable vector image suitable for embedding in documents and presentations.

**When to use**: When the user wants to export the plot as a vector image for use in reports or presentations, produce a scalable plot graphic in WMF format, or create a printable vector rendering of the current view.

**Parameters**:
- `features`: FeatureCollection containing all visible features to render
- `view_bounds`: Object with `north`, `south`, `east`, `west` bounds of the view area
- `output_filename`: Desired filename for the WMF output (e.g., "plot-export.wmf")

**Returns**: ToolResponse containing a WMF binary artifact.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#FeatureCollection`

**Constraints**:
- `view_bounds` must have valid latitude/longitude values
- `view_bounds.north` > `view_bounds.south`
- `view_bounds.east` > `view_bounds.west` (or wraps around antimeridian)
- `output_filename` should end with `.wmf`

**Defaults**:
- `output_filename`: "debrief-export.wmf" if not specified
- Empty feature collection produces an empty plot with just the map background

## Outputs

Returns a **ToolResponse** with a single artifact content item.

**Response Schema**: `specs/041-document-tool-results/data-model.md#ArtifactResult`

**Result Type**: `artifact/dataset/exported_wmf`

**Content Items**: One `ArtifactResult` containing:
- `type`: "resource"
- `uri`: `artifact://export-wmf/{output_filename}`
- `mimeType`: "image/x-wmf"
- `text`: Base64-encoded WMF binary content

**Annotations** (on each content item):
- `debrief:resultType`: `"artifact/dataset/exported_wmf"`
- `debrief:sourceFeatures`: IDs of all rendered features
- `debrief:label`: `"Exported plot as WMF with {n} visible layer(s)"`
- `debrief:href`: `"{output_filename}"`

## Algorithm

```pseudocode
FUNCTION export_wmf(features: FeatureCollection, view_bounds: ViewBounds,
                    output_filename: string) -> ToolResponse:
    // Validate inputs
    IF view_bounds IS NULL:
        RETURN build_error("view_bounds is required", "invalid_input", [])
    END IF

    IF view_bounds.north <= view_bounds.south:
        RETURN build_error("view_bounds.north must be greater than view_bounds.south", "invalid_input", [])
    END IF

    IF output_filename IS NULL OR output_filename IS EMPTY:
        output_filename = "debrief-export.wmf"
    END IF

    // Initialize WMF renderer
    wmf_renderer = create_wmf_renderer(view_bounds)

    // Collect source feature IDs
    source_ids = empty list
    visible_count = 0

    IF features IS NOT NULL AND features.features IS NOT EMPTY:
        // Render each feature layer
        FOR EACH feature IN features.features:
            source_ids.append(feature.id)

            IF feature.properties.kind == "TRACK":
                render_track_to_wmf(wmf_renderer, feature, view_bounds)
                visible_count = visible_count + 1

            ELSE IF feature.properties.kind == "SENSOR":
                render_sensor_to_wmf(wmf_renderer, feature, view_bounds)
                visible_count = visible_count + 1

            ELSE IF feature.properties.kind == "ZONE":
                render_zone_to_wmf(wmf_renderer, feature, view_bounds)
                visible_count = visible_count + 1
            END IF
        END FOR
    END IF

    // Finalize and encode WMF
    wmf_bytes = wmf_renderer.finalize()
    wmf_base64 = BASE64_ENCODE(wmf_bytes)

    // Build artifact response
    content_items = build_artifact(
        data: wmf_base64,
        mime: "image/x-wmf",
        result_subtype: "dataset/exported_wmf",
        source_feature_ids: source_ids,
        label: "Exported plot as WMF with " + visible_count + " visible layer(s)",
        href: output_filename
    )

    RETURN build_response(content_items)
END FUNCTION

FUNCTION render_track_to_wmf(renderer: WMFRenderer, track: TrackFeature, bounds: ViewBounds):
    // Extract style properties
    color = track.properties.style.line.color OR "#3388ff"
    weight = track.properties.style.line.weight OR 3

    // Draw track line
    renderer.set_pen(color, weight)
    coordinates = track.geometry.coordinates
    renderer.draw_polyline(project_coordinates(coordinates, bounds))

    // Draw position symbols
    FOR EACH position IN track.properties.positions:
        projected = project_point(position.coordinates, bounds)
        renderer.draw_symbol(projected, track.properties.default_position_style)
    END FOR
END FUNCTION

FUNCTION render_sensor_to_wmf(renderer: WMFRenderer, sensor: SensorFeature, bounds: ViewBounds):
    // Draw sensor contact bearing lines
    FOR EACH contact IN sensor.properties.contacts:
        renderer.draw_bearing_line(contact, bounds)
    END FOR
END FUNCTION
```

### Complexity

- **Time**: O(n * m) -- n features with m positions/contacts each
- **Space**: O(total rendered elements) -- WMF binary buffer

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Produce WMF with empty plot (background only) |
| Null features | Produce WMF with empty plot (background only) |
| Invalid view_bounds (north <= south) | Return error response: `invalid_input` |
| Features entirely outside view_bounds | Render but features will be clipped/invisible |
| Very large number of features | Render all; WMF file size may be large |
| Missing style on track | Use default style (blue line, weight 3) |
| Missing output_filename | Default to "debrief-export.wmf" |
| Mixed feature types (tracks, sensors, zones) | Render all types in order |

## Examples

### Basic Usage

**Input**: `export-wmf.basic.input.json`
**Output**: `export-wmf.basic.output.json`

Description: Exports a single track within specified view bounds as a WMF file.

### Edge Case: Empty Feature Collection

**Input**: `export-wmf.edge.input.json`
**Output**: `export-wmf.edge.output.json`

Description: Exports an empty plot view (no features) as a WMF file with just the background.

### Complex: Multiple Layers

**Input**: `export-wmf.complex.input.json`
**Output**: `export-wmf.complex.output.json`

Description: Exports a plot with 2 tracks and 1 sensor layer, producing a multi-layer WMF with 3 visible features.

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Renders tracks, sensors, and zones to WMF vector format
- Supports configurable view bounds and output filename

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_artifact()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for result annotations

**Related Tools**:
- [export-rtf](./export-rtf.1.0.md) - Export plot as RTF document
- [export-as-geo-pdf](./export-as-geo-pdf.1.0.md) - Export plot as georeferenced PDF

**Input Schemas**:
- [FeatureCollection](../../../schemas/src/linkml/geojson.yaml) - GeoJSON feature collection

**Legacy**:
- Debrief 3.x: `org.mwc.cmap.plotViewer.actions.ExportWMF`

**External**:
- [Windows Metafile Format](https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-wmf/) - WMF specification
