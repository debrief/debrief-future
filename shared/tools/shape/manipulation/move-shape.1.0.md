---
name: move-shape
version: 1.0
category: shape/manipulation
status: draft
---

# Move Shape

> Translates annotation shapes by a given compass bearing and distance using great-circle (spherical Earth) math.

## MCP

**Description**: Translates annotation shapes (circles, rectangles, lines, vectors, text) by compass bearing and distance. Uses Vincenty destination formula for great-circle accuracy.

**When to use**: When an analyst needs to reposition one or more shape annotations by a uniform direction and distance.

**Parameters**:
- `direction`: Compass bearing in degrees (0=North, 90=East). Default: 90. Range: [0, 360).
- `distance_km`: Translation distance in kilometres. Default: 5. Must be >= 0.

**Returns**: Mutation ToolResponse with translated annotation features.

## Inputs

**Schema**: `shared/schemas/src/linkml/annotations.yaml#{CircleAnnotation, RectangleAnnotation, LineAnnotation, TextAnnotation, VectorAnnotation}`

**Constraints**:
- FeatureCollection must contain at least one annotation feature
- Non-annotation features are silently skipped during processing
- Distance must be non-negative; negative values return an error
- Direction is normalized to [0, 360) range via modulo arithmetic

**Defaults**:
- `direction`: 90 (East)
- `distance_km`: 5

## Outputs

Tools return a **ToolResponse** containing one or more content items with Debrief annotations.

**Response Schema**: `specs/041-document-tool-results/data-model.md#ToolResponse`

### Result Type Path

**Format**: `{top_type}/{domain}/{specific_type}`

The `result_subtype` used in builder functions is `shape/translated`.

### Annotations

Required on each content item:
- `debrief:resultType`: `mutation/shape/translated`
- `debrief:sourceFeatures`: Array of input feature IDs that were translated
- `debrief:label`: Human-readable description in format "Translated {n} shape(s) {distance} km bearing {direction}°"

## Algorithm

```pseudocode
FUNCTION translate_point(lat, lon, bearing, distance_km) -> (lat2, lon2):
    // Convert to radians
    lat1 = radians(lat)
    lon1 = radians(lon)
    brng = radians(bearing)
    d = distance_km / 6371.0  // Angular distance in radians (Earth radius = 6371 km)

    // Vincenty destination formula
    lat2 = asin(sin(lat1) * cos(d) + cos(lat1) * sin(d) * cos(brng))
    lon2 = lon1 + atan2(sin(brng) * sin(d) * cos(lat1), cos(d) - sin(lat1) * sin(lat2))

    // Normalise longitude to [-180, 180]
    lon2_deg = degrees(lon2)
    lon2_deg = ((lon2_deg + 180) mod 360) - 180

    RETURN (degrees(lat2), lon2_deg)
END FUNCTION

FUNCTION move_shape(input: FeatureCollection, direction: number, distance_km: number) -> ToolResponse:
    IF input IS NULL OR input.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    // Normalise direction to [0, 360)
    direction = direction mod 360

    // Zero distance is a no-op: return annotations unchanged
    IF distance_km == 0:
        // Filter to annotation features only
        annotation_features = FILTER(input.features, f -> f.properties.kind IN {CIRCLE, RECTANGLE, LINE, TEXT, VECTOR})
        IF annotation_features IS EMPTY:
            RETURN build_error("No annotation features found", "invalid_input", [])
        END IF
        source_ids = MAP(annotation_features, f -> f.id)
        content_items = build_mutation(
            features: annotation_features,
            result_subtype: "shape/translated",
            source_feature_ids: source_ids,
            label: "Translated {count} shape(s) 0 km bearing {direction:03d}°"
        )
        RETURN build_response(content_items)
    END IF

    // Validate distance
    IF distance_km < 0:
        RETURN build_error("Distance must be non-negative", "invalid_input", [])
    END IF

    modified_features = empty list
    source_ids = empty list

    FOR EACH feature IN input.features:
        kind = feature.properties.kind

        IF kind NOT IN {CIRCLE, RECTANGLE, LINE, TEXT, VECTOR}:
            CONTINUE  // Skip non-annotation features silently
        END IF

        source_ids.append(feature.id)

        IF kind == "CIRCLE":
            // Translate all polygon ring vertices
            FOR EACH ring IN feature.geometry.coordinates:
                FOR i = 0 TO length(ring) - 1:
                    coord = ring[i]
                    ring[i] = translate_point(coord[1], coord[0], direction, distance_km)
                END FOR
            END FOR
            // Update center property if present
            IF feature.properties.center IS NOT NULL:
                center = feature.properties.center
                feature.properties.center = translate_point(center[1], center[0], direction, distance_km)
            END IF

        ELSE IF kind == "RECTANGLE":
            // Translate all polygon ring vertices
            FOR EACH ring IN feature.geometry.coordinates:
                FOR i = 0 TO length(ring) - 1:
                    coord = ring[i]
                    ring[i] = translate_point(coord[1], coord[0], direction, distance_km)
                END FOR
            END FOR

        ELSE IF kind == "LINE":
            // Translate all LineString coordinates
            FOR i = 0 TO length(feature.geometry.coordinates) - 1:
                coord = feature.geometry.coordinates[i]
                feature.geometry.coordinates[i] = translate_point(coord[1], coord[0], direction, distance_km)
            END FOR

        ELSE IF kind == "TEXT":
            // Translate single Point coordinate
            coord = feature.geometry.coordinates
            feature.geometry.coordinates = translate_point(coord[1], coord[0], direction, distance_km)

        ELSE IF kind == "VECTOR":
            // Translate all LineString coordinates
            FOR i = 0 TO length(feature.geometry.coordinates) - 1:
                coord = feature.geometry.coordinates[i]
                feature.geometry.coordinates[i] = translate_point(coord[1], coord[0], direction, distance_km)
            END FOR
            // Update origin property if present; preserve range and bearing
            IF feature.properties.origin IS NOT NULL:
                origin = feature.properties.origin
                feature.properties.origin = translate_point(origin[1], origin[0], direction, distance_km)
            END IF
        END IF

        modified_features.append(feature)
    END FOR

    IF modified_features IS EMPTY:
        RETURN build_error("No annotation features found", "invalid_input", [])
    END IF

    // Build response with mutation result type
    content_items = build_mutation(
        features: modified_features,
        result_subtype: "shape/translated",
        source_feature_ids: source_ids,
        label: "Translated {count} shape(s) {distance_km} km bearing {direction:03d}°"
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
| Zero distance (distance_km=0) | Return annotation features unchanged (no-op); include in result with label showing 0 km |
| Negative distance | Return error with `invalid_input` category and message "Distance must be non-negative" |
| Non-annotation features | Skip silently; process only CIRCLE, RECTANGLE, LINE, TEXT, VECTOR kinds |
| No annotation features after filtering | Return error with `invalid_input` category and message "No annotation features found" |
| Antimeridian crossing (lon > 180) | Normalise longitude to [-180, 180] using formula: `((lon + 180) mod 360) - 180` |
| Near poles (lat → ±90) | Vincenty formula handles correctly; longitude convergence at poles is expected behaviour |
| Direction >= 360 | Normalise using modulo: `direction mod 360` |
| Direction < 0 | Normalise using modulo: `(direction mod 360 + 360) mod 360` to ensure [0, 360) |
| CircleAnnotation without `center` property | Translate geometry only; skip center property update (no-op for center) |
| VectorAnnotation without `origin` property | Translate geometry only; skip origin property update (no-op for origin) |
| Mixed annotation and non-annotation features | Process only annotations; silently skip others; return translated annotations with source IDs of processed features |

## Examples

### Basic Example: Translating a Circle Annotation East

**Input** (FeatureCollection with a single circle):
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "id": "circle-1",
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [-1.0, 51.0],
            [-0.9, 51.0],
            [-0.9, 51.1],
            [-1.0, 51.1],
            [-1.0, 51.0]
          ]
        ]
      },
      "properties": {
        "kind": "CIRCLE",
        "center": [-0.95, 51.05],
        "radius_km": 5.0
      }
    }
  ]
}
```

**Invocation**: direction=90 (East), distance_km=10

**Output** (ToolResponse):
```json
{
  "content": [
    {
      "type": "resource",
      "uri": "feature://circle-1",
      "mimeType": "application/geo+json",
      "text": "{\"id\":\"circle-1\",\"type\":\"Feature\",\"geometry\":{\"type\":\"Polygon\",\"coordinates\":[[[-0.905,51.0],[-0.805,51.0],[-0.805,51.1],[-0.905,51.1],[-0.905,51.0]]]},\"properties\":{\"kind\":\"CIRCLE\",\"center\":[-0.855,51.05],\"radius_km\":5.0}}",
      "annotations": {
        "debrief:resultType": "mutation/shape/translated",
        "debrief:sourceFeatures": ["circle-1"],
        "debrief:label": "Translated 1 shape(s) 10 km bearing 090°"
      }
    }
  ]
}
```

### Golden Example Files

For testable examples, create sister files in the same directory:
- Input: `move-shape.basic-polygon.input.json` — FeatureCollection with rectangle or circle
- Output: `move-shape.basic-polygon.output.json` — ToolResponse with translated features
- Input: `move-shape.vector.input.json` — FeatureCollection with vector annotation
- Output: `move-shape.vector.output.json` — ToolResponse with translated vector

### Error Response Example

```json
{
  "error": {
    "code": -32000,
    "message": "No annotation features found",
    "data": {
      "debrief:errorCategory": "invalid_input",
      "debrief:affectedFeatures": []
    }
  }
}
```

## Changelog

### 1.0 (2026-02-10)
- Initial release
- Supports CIRCLE, RECTANGLE, LINE, TEXT, VECTOR annotation kinds
- Uses Vincenty destination formula for great-circle accuracy
- Handles antimeridian crossing and pole convergence

## References

**Related Tools**:
- None yet (first shape manipulation tool in taxonomy)

**Schemas**:
- [annotations.yaml](../../schemas/src/linkml/annotations.yaml) - Annotation feature definitions (CircleAnnotation, RectangleAnnotation, LineAnnotation, TextAnnotation, VectorAnnotation)
- [common.yaml](../../schemas/src/linkml/common.yaml) - FeatureKindEnum and shared types

**Template**:
- [TEMPLATE.md](../TEMPLATE.md) - Tool specification template

**External**:
- [Vincenty destination formula](https://en.wikipedia.org/wiki/Vincenty%27s_formulae) — accurate great-circle navigation calculations
- WGS84 datum (Earth radius ≈ 6371 km) — standard for geographic coordinates
