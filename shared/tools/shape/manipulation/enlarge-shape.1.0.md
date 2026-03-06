---
name: enlarge-shape
version: 1.0
category: shape/manipulation
status: draft
---

# Enlarge Shape

> Scales annotation shapes by a multiplicative factor relative to an origin point (default: geometric centroid).

## MCP

**Description**: Scales annotation shapes (circles, rectangles, lines, vectors, text) by a multiplicative factor relative to a specified origin point. Uses linear interpolation of geographic coordinate differences.

**When to use**: When an analyst needs to enlarge, shrink, or proportionally resize one or more shape annotations relative to their geometric center or a custom anchor point.

**Parameters**:
- `scale_factor`: Multiplicative scaling factor. Default: 3.0. Must be >= 0. Preset choices: [0.25, 0.5, 1.5, 2.0, 3.0, 5.0].
- `origin`: Scaling origin as [longitude, latitude]. Default: geometric centroid of the shape.

**Returns**: Mutation ToolResponse with scaled annotation features.

## Inputs

**Schema**: `shared/schemas/src/linkml/annotations.yaml#{CircleAnnotation, RectangleAnnotation, LineAnnotation, TextAnnotation, VectorAnnotation}`

**Constraints**:
- FeatureCollection must contain at least one annotation feature
- Non-annotation features are silently skipped during processing
- Scale factor must be non-negative; negative values return an error
- Scale factor of 0 collapses all vertices to the origin point (degenerate geometry)
- Scale factor of 1.0 returns features unchanged (identity/no-op)
- Origin, if provided, must be a valid [longitude, latitude] coordinate

**Defaults**:
- `scale_factor`: 3.0
- `origin`: Geometric centroid (arithmetic mean of vertices, excluding closing vertex for polygons)

**Parameter Presets**:
- `scale_factor` is declared as `type="number"` with `choices=[0.25, 0.5, 1.5, 2.0, 3.0, 5.0]`
- Presets enable frontend context menus for quick selection
- Any non-negative numeric value is accepted via custom input — presets are convenience, not constraints

## Outputs

Tools return a **ToolResponse** containing one or more content items with Debrief annotations.

**Response Schema**: `specs/041-document-tool-results/data-model.md#ToolResponse`

### Result Type Path

**Format**: `{top_type}/{domain}/{specific_type}`

The `result_subtype` used in builder functions is `shape/scaled`.

### Annotations

Required on each content item:
- `debrief:resultType`: `mutation/shape/scaled`
- `debrief:sourceFeatures`: Array of input feature IDs that were scaled
- `debrief:label`: Human-readable description in format "Scaled {n} shape(s) by factor {scale_factor} from {origin_description}"

## Algorithm

```pseudocode
FUNCTION compute_centroid(geometry) -> [lon, lat]:
    // Compute arithmetic mean of vertices
    IF geometry.type == "Polygon":
        ring = geometry.coordinates[0]  // Exterior ring
        // Exclude closing vertex (last == first for closed polygons)
        IF ring[0] == ring[length(ring) - 1]:
            vertices = ring[0 .. length(ring) - 2]
        ELSE:
            vertices = ring
        END IF
    ELSE IF geometry.type == "LineString":
        vertices = geometry.coordinates
    ELSE IF geometry.type == "Point":
        RETURN geometry.coordinates  // Single point IS the centroid
    END IF

    sum_lon = 0
    sum_lat = 0
    FOR EACH vertex IN vertices:
        sum_lon = sum_lon + vertex[0]
        sum_lat = sum_lat + vertex[1]
    END FOR

    RETURN [sum_lon / length(vertices), sum_lat / length(vertices)]
END FUNCTION

FUNCTION scale_coordinate(coord, origin, scale_factor) -> [lon, lat]:
    new_lon = origin[0] + (coord[0] - origin[0]) * scale_factor
    new_lat = origin[1] + (coord[1] - origin[1]) * scale_factor

    // Clamp latitude to [-90, 90]
    new_lat = max(-90, min(90, new_lat))

    // Normalise longitude to [-180, 180]
    new_lon = ((new_lon + 180) mod 360) - 180

    RETURN [new_lon, new_lat]
END FUNCTION

FUNCTION enlarge_shape(input: FeatureCollection, scale_factor: number, origin: [lon, lat] | null) -> ToolResponse:
    IF input IS NULL OR input.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    // Validate scale factor
    IF scale_factor < 0:
        RETURN build_error("Scale factor must be non-negative", "invalid_input", [])
    END IF

    modified_features = empty list
    source_ids = empty list

    FOR EACH feature IN input.features:
        kind = feature.properties.kind

        IF kind NOT IN {CIRCLE, RECTANGLE, LINE, TEXT, VECTOR}:
            CONTINUE  // Skip non-annotation features silently
        END IF

        source_ids.append(feature.id)

        // Determine scaling origin
        IF origin IS NOT NULL:
            scaling_origin = origin
        ELSE:
            scaling_origin = compute_centroid(feature.geometry)
        END IF

        // Scale factor of 1.0 is a no-op — return feature unchanged
        IF scale_factor == 1.0:
            modified_features.append(feature)
            CONTINUE
        END IF

        IF kind == "CIRCLE":
            // Polygon geometry: scale all vertices in all rings
            FOR EACH ring IN feature.geometry.coordinates:
                FOR i = 0 TO length(ring) - 1:
                    ring[i] = scale_coordinate(ring[i], scaling_origin, scale_factor)
                END FOR
            END FOR
            // Update center property if present
            IF feature.properties.center IS NOT NULL:
                feature.properties.center = scale_coordinate(
                    feature.properties.center, scaling_origin, scale_factor
                )
            END IF

        ELSE IF kind == "RECTANGLE":
            // Polygon geometry: scale all vertices in all rings
            FOR EACH ring IN feature.geometry.coordinates:
                FOR i = 0 TO length(ring) - 1:
                    ring[i] = scale_coordinate(ring[i], scaling_origin, scale_factor)
                END FOR
            END FOR

        ELSE IF kind == "LINE":
            // LineString geometry: scale all coordinates
            FOR i = 0 TO length(feature.geometry.coordinates) - 1:
                feature.geometry.coordinates[i] = scale_coordinate(
                    feature.geometry.coordinates[i], scaling_origin, scale_factor
                )
            END FOR

        ELSE IF kind == "TEXT":
            // Point geometry: scale single coordinate
            feature.geometry.coordinates = scale_coordinate(
                feature.geometry.coordinates, scaling_origin, scale_factor
            )

        ELSE IF kind == "VECTOR":
            // LineString geometry: scale all coordinates
            FOR i = 0 TO length(feature.geometry.coordinates) - 1:
                feature.geometry.coordinates[i] = scale_coordinate(
                    feature.geometry.coordinates[i], scaling_origin, scale_factor
                )
            END FOR
            // Update origin property; preserve range and bearing
            IF feature.properties.origin IS NOT NULL:
                feature.properties.origin = scale_coordinate(
                    feature.properties.origin, scaling_origin, scale_factor
                )
            END IF
        END IF

        modified_features.append(feature)
    END FOR

    IF modified_features IS EMPTY:
        RETURN build_error("No annotation features found", "invalid_input", [])
    END IF

    // Determine origin description for label
    IF origin IS NOT NULL:
        origin_desc = "[{origin[0]}, {origin[1]}]"
    ELSE:
        origin_desc = "centroid"
    END IF

    // Build response with mutation result type
    content_items = build_mutation(
        features: modified_features,
        result_subtype: "shape/scaled",
        source_feature_ids: source_ids,
        label: "Scaled {count} shape(s) by factor {scale_factor} from {origin_desc}"
    )

    RETURN build_response(content_items)
END FUNCTION
```

### Response Builder Functions

| Function | Result Type | Use When |
|----------|-------------|----------|
| `build_mutation(features, subtype, sources, label)` | `mutation/*` | Modifying existing features |
| `build_error(message, category, affected_ids)` | Error | Reporting failures |

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Return error with `invalid_input` category and message "Input features required" |
| Scale factor of 1.0 (no-op) | Return annotation features unchanged; include in result with provenance recording factor 1.0 |
| Scale factor of 0 | Collapse all vertices to the origin point; return degenerate geometry with provenance |
| Negative scale factor | Return error with `invalid_input` category and message "Scale factor must be non-negative" |
| Very large scale factor (e.g., 1000) near poles | Clamp output latitude to [-90, 90]; normalise longitude to [-180, 180] |
| Non-annotation features | Skip silently; process only CIRCLE, RECTANGLE, LINE, TEXT, VECTOR kinds |
| No annotation features after filtering | Return error with `invalid_input` category and message "No annotation features found" |
| Polygon with multiple rings (holes) | Scale all rings (exterior and interior) relative to the same origin |
| CIRCLE annotation with `center` property | Update center by scaling it relative to the origin (same formula as vertices) |
| VECTOR annotation with `origin` property | Update origin by scaling it relative to the scaling origin; preserve `range` and `bearing` |
| TEXT annotation (Point geometry) | Scale the single coordinate relative to the origin |
| Closing vertex in polygon ring | Scale the closing vertex identically to the first vertex (maintains ring closure) |
| Custom origin at a vertex of the shape | That vertex remains fixed; all others scale outward (or inward) from it |
| Custom origin outside the shape | All vertices shift relative to the external origin point |
| Antimeridian crossing (lon > 180 or < -180) | Normalise longitude to [-180, 180] using formula: `((lon + 180) mod 360) - 180` |

## Examples

### Basic Example: Scaling a Rectangle by Factor 3.0 from Centroid

**Input** (FeatureCollection with a single rectangle):
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "id": "rect-001",
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-1.0, 51.0],
          [-0.5, 51.0],
          [-0.5, 51.5],
          [-1.0, 51.5],
          [-1.0, 51.0]
        ]]
      },
      "properties": {
        "kind": "RECTANGLE",
        "label": "Exercise Area"
      }
    }
  ],
  "parameters": {
    "scale_factor": 3.0
  }
}
```

**Centroid computation** (arithmetic mean of 4 unique vertices):
- lon: (-1.0 + -0.5 + -0.5 + -1.0) / 4 = -0.75
- lat: (51.0 + 51.0 + 51.5 + 51.5) / 4 = 51.25

**Scaling** (each vertex: `origin + (vertex - origin) * 3.0`):
- [-1.0, 51.0] → [-0.75 + (-0.25)*3, 51.25 + (-0.25)*3] = [-1.5, 50.5]
- [-0.5, 51.0] → [-0.75 + (0.25)*3, 51.25 + (-0.25)*3] = [0.0, 50.5]
- [-0.5, 51.5] → [0.0, 52.0]
- [-1.0, 51.5] → [-1.5, 52.0]
- [-1.0, 51.0] → [-1.5, 50.5] (closing vertex)

**Output** (ToolResponse):
```json
{
  "content": [
    {
      "type": "resource",
      "uri": "feature://rect-001",
      "mimeType": "application/geo+json",
      "text": "{\"id\":\"rect-001\",\"type\":\"Feature\",\"geometry\":{\"type\":\"Polygon\",\"coordinates\":[[[-1.5,50.5],[0.0,50.5],[0.0,52.0],[-1.5,52.0],[-1.5,50.5]]]},\"properties\":{\"kind\":\"RECTANGLE\",\"label\":\"Exercise Area\"}}",
      "annotations": {
        "debrief:resultType": "mutation/shape/scaled",
        "debrief:sourceFeatures": ["rect-001"],
        "debrief:label": "Scaled 1 shape(s) by factor 3.0 from centroid"
      }
    }
  ]
}
```

### Golden Example Files

For testable examples, create sister files in the same directory:

| Example | Input File | Output File | Validates |
|---------|-----------|-------------|-----------|
| basic-polygon | `enlarge-shape.basic-polygon.input.json` | `enlarge-shape.basic-polygon.output.json` | Core scaling from centroid (factor 3.0) |
| custom-origin | `enlarge-shape.custom-origin.input.json` | `enlarge-shape.custom-origin.output.json` | Custom origin support (factor 2.0, origin at vertex) |
| noop | `enlarge-shape.noop.input.json` | `enlarge-shape.noop.output.json` | Identity transformation (factor 1.0) |

### Error Response Example

```json
{
  "error": {
    "code": -32000,
    "message": "Scale factor must be non-negative",
    "data": {
      "debrief:errorCategory": "invalid_input",
      "debrief:affectedFeatures": []
    }
  }
}
```

## Changelog

### 1.0 (2026-02-13)
- Initial release
- Supports CIRCLE, RECTANGLE, LINE, TEXT, VECTOR annotation kinds
- Uses linear interpolation of geographic coordinate differences for scaling
- Supports custom origin point or automatic centroid computation
- Handles latitude clamping and longitude normalisation for extreme scaling
- Declares `scale_factor` with preset choices [0.25, 0.5, 1.5, 2.0, 3.0, 5.0] for frontend context menus

## References

**Related Tools**:
- [move-shape](./move-shape.1.0.md) - Sibling shape manipulation tool; translates shapes by bearing and distance

**Schemas**:
- [annotations.yaml](../../schemas/src/linkml/annotations.yaml) - Annotation feature definitions (CircleAnnotation, RectangleAnnotation, LineAnnotation, TextAnnotation, VectorAnnotation)
- [common.yaml](../../schemas/src/linkml/common.yaml) - FeatureKindEnum and shared types

**Template**:
- [TEMPLATE.md](../TEMPLATE.md) - Tool specification template

**External**:
- [Geographic coordinate system](https://en.wikipedia.org/wiki/Geographic_coordinate_system) — latitude/longitude reference system used for coordinate scaling
