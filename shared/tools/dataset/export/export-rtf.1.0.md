---
name: export-rtf
version: 1.0
category: dataset/export
status: draft
created: 2026-02-07
migrated_from: org.mwc.cmap.plotViewer.actions.ExportRTF
---

# Export RTF

> Export the current plot view as a Rich Text Format (RTF) document with embedded plot graphics.

## MCP

**Description**: Renders the current plot view into an RTF document with the plot graphic embedded as a metafile image. The resulting RTF can be opened in word processors for report generation and documentation.

**When to use**: When the user wants to export the plot for inclusion in a word processor document, create an RTF report containing the current plot view, or produce a document-embeddable rendering of the tactical picture.

**Parameters**:
- `features`: FeatureCollection containing all visible features to render
- `view_bounds`: Object with `north`, `south`, `east`, `west` bounds of the view area
- `output_filename`: Desired filename for the RTF output (e.g., "plot-export.rtf")

**Returns**: ToolResponse containing an RTF document artifact with embedded plot graphic.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#FeatureCollection`

**Constraints**:
- `view_bounds` must have valid latitude/longitude values
- `view_bounds.north` > `view_bounds.south`
- `view_bounds.east` > `view_bounds.west` (or wraps around antimeridian)
- `output_filename` should end with `.rtf`

**Defaults**:
- `output_filename`: "debrief-export.rtf" if not specified
- Empty feature collection produces an RTF with an empty plot graphic

## Outputs

Returns a **ToolResponse** with a single artifact content item.

**Response Schema**: `specs/041-document-tool-results/data-model.md#ArtifactResult`

**Result Type**: `artifact/dataset/exported_rtf`

**Content Items**: One `ArtifactResult` containing:
- `type`: "resource"
- `uri`: `artifact://export-rtf/{output_filename}`
- `mimeType`: "application/rtf"
- `text`: RTF document content with embedded plot graphic

**Annotations** (on each content item):
- `debrief:resultType`: `"artifact/dataset/exported_rtf"`
- `debrief:sourceFeatures`: IDs of all rendered features
- `debrief:label`: `"Exported plot as RTF with {n} visible layer(s)"`
- `debrief:href`: `"{output_filename}"`

## Algorithm

```pseudocode
FUNCTION export_rtf(features: FeatureCollection, view_bounds: ViewBounds,
                    output_filename: string) -> ToolResponse:
    // Validate inputs
    IF view_bounds IS NULL:
        RETURN build_error("view_bounds is required", "invalid_input", [])
    END IF

    IF view_bounds.north <= view_bounds.south:
        RETURN build_error("view_bounds.north must be greater than view_bounds.south", "invalid_input", [])
    END IF

    IF output_filename IS NULL OR output_filename IS EMPTY:
        output_filename = "debrief-export.rtf"
    END IF

    // Step 1: Render plot to WMF (reuse WMF rendering logic)
    wmf_renderer = create_wmf_renderer(view_bounds)
    source_ids = empty list
    visible_count = 0

    IF features IS NOT NULL AND features.features IS NOT EMPTY:
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

    wmf_bytes = wmf_renderer.finalize()

    // Step 2: Wrap WMF in RTF document
    rtf_content = build_rtf_document(wmf_bytes)

    // Build artifact response
    content_items = build_artifact(
        data: rtf_content,
        mime: "application/rtf",
        result_subtype: "dataset/exported_rtf",
        source_feature_ids: source_ids,
        label: "Exported plot as RTF with " + visible_count + " visible layer(s)",
        href: output_filename
    )

    RETURN build_response(content_items)
END FUNCTION

FUNCTION build_rtf_document(wmf_bytes: bytes) -> string:
    // RTF document header
    rtf = "{\rtf1\ansi\deff0"

    // Document metadata
    rtf = rtf + "{\info{\title Debrief Plot Export}}"

    // Embed WMF as picture
    wmf_hex = HEX_ENCODE(wmf_bytes)
    rtf = rtf + "\par {\pict\wmetafile8 " + wmf_hex + "}"

    // Close document
    rtf = rtf + "}"

    RETURN rtf
END FUNCTION
```

### Complexity

- **Time**: O(n * m) -- rendering n features with m positions/contacts each, plus RTF encoding
- **Space**: O(total rendered elements) -- WMF buffer plus RTF document

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Produce RTF with empty plot graphic |
| Null features | Produce RTF with empty plot graphic |
| Invalid view_bounds (north <= south) | Return error response: `invalid_input` |
| Features outside view_bounds | Render but features clipped/invisible in embedded graphic |
| Very large number of features | Render all; RTF file size may be large |
| Missing style on track | Use default style (blue line, weight 3) |
| Missing output_filename | Default to "debrief-export.rtf" |
| Mixed feature types | Render all types in layer order |

## Examples

### Basic Usage

**Input**: `export-rtf.basic.input.json`
**Output**: `export-rtf.basic.output.json`

Description: Exports a single track as an RTF document with embedded plot graphic.

### Edge Case: Empty Feature Collection

**Input**: `export-rtf.edge.input.json`
**Output**: `export-rtf.edge.output.json`

Description: Exports an empty plot (no features) as an RTF document with blank graphic.

### Complex: Multi-Layer Export

**Input**: `export-rtf.complex.input.json`
**Output**: `export-rtf.complex.output.json`

Description: Exports 2 tracks and 1 sensor layer as an RTF document with a composite plot graphic.

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Renders plot to WMF then embeds in RTF document
- Supports tracks, sensors, and zones

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_artifact()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for result annotations

**Related Tools**:
- [export-wmf](./export-wmf.1.0.md) - Export plot as WMF vector image (reused for rendering)
- [export-as-geo-pdf](./export-as-geo-pdf.1.0.md) - Export plot as georeferenced PDF

**Input Schemas**:
- [FeatureCollection](../../../schemas/src/linkml/geojson.yaml) - GeoJSON feature collection

**Legacy**:
- Debrief 3.x: `org.mwc.cmap.plotViewer.actions.ExportRTF`

**External**:
- [RTF Specification](https://learn.microsoft.com/en-us/previous-versions/office/) - Rich Text Format specification
