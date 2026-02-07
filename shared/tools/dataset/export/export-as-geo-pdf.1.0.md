---
name: export-as-geo-pdf
version: 1.0
category: dataset/export
status: draft
created: 2026-02-07
migrated_from: org.mwc.debrief.core.actions.ExportAsGeoPDFHandler
---

# Export As Geo PDF

> Export the current plot view as a georeferenced PDF with embedded geospatial metadata for use in GIS tools.

## MCP

**Description**: Renders the current plot view into a PDF with embedded geospatial coordinate metadata (GeoPDF). The output can be opened in GIS tools that recognize georeferenced PDFs, allowing users to query coordinates and overlay additional geospatial data.

**When to use**: When the user wants to export the plot as a georeferenced PDF for GIS interoperability, produce a printable map with embedded coordinate information, or create a PDF that preserves spatial reference for downstream analysis tools.

**Parameters**:
- `features`: FeatureCollection containing all visible features to render
- `view_bounds`: Object with `north`, `south`, `east`, `west` bounds of the view area
- `pdf_options`: Object with optional PDF settings -- `page_size`, `orientation`, `title`, `classification`, `include_scale_bar`, `include_grid`, `crs`
- `output_filename`: Desired filename for the PDF output (e.g., "plot-export.pdf")

**Returns**: ToolResponse containing a georeferenced PDF artifact.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#FeatureCollection`

**Constraints**:
- `view_bounds` must have valid latitude/longitude values
- `view_bounds.north` > `view_bounds.south`
- `view_bounds.east` > `view_bounds.west` (or wraps around antimeridian)
- `output_filename` should end with `.pdf`

**Defaults**:
- `output_filename`: "debrief-export.pdf" if not specified
- `pdf_options.page_size`: "A4"
- `pdf_options.orientation`: "landscape"
- `pdf_options.title`: null (no title banner)
- `pdf_options.classification`: null (no classification marking)
- `pdf_options.include_scale_bar`: false
- `pdf_options.include_grid`: false
- `pdf_options.crs`: "EPSG:4326" (WGS84)

## Outputs

Returns a **ToolResponse** with a single artifact content item.

**Response Schema**: `specs/041-document-tool-results/data-model.md#ArtifactResult`

**Result Type**: `artifact/dataset/exported_geo_pdf`

**Content Items**: One `ArtifactResult` containing:
- `type`: "resource"
- `uri`: `artifact://export-as-geo-pdf/{output_filename}`
- `mimeType`: "application/pdf"
- `text`: Base64-encoded PDF binary content with geospatial metadata

**Annotations** (on each content item):
- `debrief:resultType`: `"artifact/dataset/exported_geo_pdf"`
- `debrief:sourceFeatures`: IDs of all rendered features
- `debrief:label`: `"Exported georeferenced PDF with {n} visible layer(s), bounds: {south}S-{north}N, {west}W-{east}W"`
- `debrief:href`: `"{output_filename}"`

## Algorithm

```pseudocode
FUNCTION export_as_geo_pdf(features: FeatureCollection, view_bounds: ViewBounds,
                           pdf_options: PDFOptions, output_filename: string) -> ToolResponse:
    // Validate inputs
    IF view_bounds IS NULL:
        RETURN build_error("view_bounds is required", "invalid_input", [])
    END IF

    IF view_bounds.north <= view_bounds.south:
        RETURN build_error("view_bounds.north must be greater than view_bounds.south", "invalid_input", [])
    END IF

    IF output_filename IS NULL OR output_filename IS EMPTY:
        output_filename = "debrief-export.pdf"
    END IF

    // Resolve PDF options defaults
    page_size = pdf_options.page_size OR "A4"
    orientation = pdf_options.orientation OR "landscape"
    title = pdf_options.title OR NULL
    classification = pdf_options.classification OR NULL
    include_scale_bar = pdf_options.include_scale_bar OR false
    include_grid = pdf_options.include_grid OR false
    crs = pdf_options.crs OR "EPSG:4326"

    // Initialize PDF renderer with geospatial metadata
    pdf_renderer = create_geo_pdf_renderer(
        page_size: page_size,
        orientation: orientation,
        bounds: view_bounds,
        crs: crs
    )

    // Add title banner if specified
    IF title IS NOT NULL:
        pdf_renderer.add_title(title)
    END IF

    // Add classification marking if specified
    IF classification IS NOT NULL:
        pdf_renderer.add_classification_banner(classification)
    END IF

    // Render features
    source_ids = empty list
    visible_count = 0

    IF features IS NOT NULL AND features.features IS NOT EMPTY:
        FOR EACH feature IN features.features:
            source_ids.append(feature.id)

            IF feature.properties.kind == "TRACK":
                render_track_to_pdf(pdf_renderer, feature, view_bounds)
                visible_count = visible_count + 1

            ELSE IF feature.properties.kind == "SENSOR":
                render_sensor_to_pdf(pdf_renderer, feature, view_bounds)
                visible_count = visible_count + 1

            ELSE IF feature.properties.kind == "ZONE":
                render_zone_to_pdf(pdf_renderer, feature, view_bounds)
                visible_count = visible_count + 1
            END IF
        END FOR
    END IF

    // Add optional overlays
    IF include_grid:
        pdf_renderer.add_coordinate_grid(view_bounds, crs)
    END IF

    IF include_scale_bar:
        pdf_renderer.add_scale_bar(view_bounds)
    END IF

    // Embed geospatial metadata (OGC GeoPDF)
    pdf_renderer.embed_geo_registration(
        bounds: view_bounds,
        crs: crs,
        neatline: compute_neatline(view_bounds)
    )

    // Finalize PDF
    pdf_bytes = pdf_renderer.finalize()
    pdf_base64 = BASE64_ENCODE(pdf_bytes)

    // Build bounds description for label
    bounds_desc = FORMAT(view_bounds.south) + "S-" + FORMAT(view_bounds.north) + "N, "
                + FORMAT(ABS(view_bounds.west)) + "W-" + FORMAT(ABS(view_bounds.east)) + "W"

    // Build artifact response
    content_items = build_artifact(
        data: pdf_base64,
        mime: "application/pdf",
        result_subtype: "dataset/exported_geo_pdf",
        source_feature_ids: source_ids,
        label: "Exported georeferenced PDF with " + visible_count + " visible layer(s), bounds: " + bounds_desc,
        href: output_filename
    )

    RETURN build_response(content_items)
END FUNCTION

FUNCTION compute_neatline(bounds: ViewBounds) -> array:
    // Compute the neatline polygon for geo-registration
    // Returns array of [lon, lat] pairs forming the view boundary
    RETURN [
        [bounds.west, bounds.south],
        [bounds.east, bounds.south],
        [bounds.east, bounds.north],
        [bounds.west, bounds.north],
        [bounds.west, bounds.south]
    ]
END FUNCTION
```

### Complexity

- **Time**: O(n * m) -- rendering n features with m positions/contacts, plus PDF encoding and geo-registration
- **Space**: O(total rendered elements) -- PDF buffer with embedded geospatial metadata

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Produce GeoPDF with empty plot (map background and geo-registration only) |
| Null features | Produce GeoPDF with empty plot and geo-registration |
| Invalid view_bounds (north <= south) | Return error response: `invalid_input` |
| Features outside view_bounds | Render but features clipped/invisible; geo-registration still valid |
| Very large view extent (global) | Accept; geo-registration covers full extent |
| Missing pdf_options | Use all defaults (A4, landscape, no title, no grid) |
| Empty pdf_options object | Use all defaults |
| Invalid page_size | Use default "A4" |
| Missing output_filename | Default to "debrief-export.pdf" |
| Non-WGS84 CRS specified | Apply coordinate transformation before rendering |

## Examples

### Basic Usage

**Input**: `export-as-geo-pdf.basic.input.json`
**Output**: `export-as-geo-pdf.basic.output.json`

Description: Exports a single track as a georeferenced PDF on A4 landscape with default options.

### Edge Case: Single Point Track, Minimal Options

**Input**: `export-as-geo-pdf.edge.input.json`
**Output**: `export-as-geo-pdf.edge.output.json`

Description: Exports a stationary single-point track in a tight view bounds with empty pdf_options, demonstrating default behavior.

### Complex: Full Options with Multiple Layers

**Input**: `export-as-geo-pdf.complex.input.json`
**Output**: `export-as-geo-pdf.complex.output.json`

Description: Exports 2 tracks, 1 sensor, and 1 zone on A3 landscape with title, classification marking, scale bar, and coordinate grid enabled.

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Supports OGC GeoPDF geospatial metadata embedding
- Configurable page size, orientation, title, classification, grid, scale bar
- Renders tracks, sensors, and zones

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_artifact()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for result annotations

**Related Tools**:
- [export-wmf](./export-wmf.1.0.md) - Export plot as WMF vector image
- [export-rtf](./export-rtf.1.0.md) - Export plot as RTF document

**Input Schemas**:
- [FeatureCollection](../../../schemas/src/linkml/geojson.yaml) - GeoJSON feature collection

**Legacy**:
- Debrief 3.x: `org.mwc.debrief.core.actions.ExportAsGeoPDFHandler`

**External**:
- [OGC GeoPDF](https://www.ogc.org/standard/geopdf/) - Geospatial PDF encoding standard
- [PDF Reference](https://www.adobe.com/devnet/pdf/pdf_reference.html) - PDF specification
