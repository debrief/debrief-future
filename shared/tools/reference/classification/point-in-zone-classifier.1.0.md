---
name: point-in-zone-classifier
version: 1.0
category: reference/classification
status: draft
---

# Point-in-Zone Classifier

> Classifies reference points by buffer zone membership, updating per-point metadata with zone assignment and color.

## MCP

**Description**: Classifies each coordinate in a MultiPoint reference feature by testing containment against concentric detection zone polygons. Updates per-point metadata with zone name and color, enabling visual distinction of points by detection likelihood.

**When to use**: When an analyst has generated reference points and buffer zones and needs to see which points fall within each detection zone. Typically step 4 of the E03 buffer zone analysis cascade.

**Parameters**: None — the tool operates on the selected features directly.

**Returns**: Mutation ToolResponse containing the modified MultiPoint feature with updated `pointMetadata` (zone, color) and a `pointColors` array for per-point rendering.

## Inputs

**Schema**: `ContextType.MULTI` — requires exactly two features:
- One feature with `kind: "POINT"` and `locationType: "REFERENCE"` (MultiPoint geometry)
- One feature with `kind: "ZONE"` (MultiPolygon geometry)

**Constraints**:
- Reference feature must have MultiPoint geometry with at least one coordinate
- Reference feature must have a `pointMetadata` array parallel to coordinates
- Zone feature must have MultiPolygon geometry with at least one polygon
- Zone feature must have a `zones` array with metadata for each polygon

**Defaults**: None — no parameters.

## Outputs

**Response Schema**: `specs/041-document-tool-results/data-model.md#ToolResponse`

### Result Type Path

`mutation/reference/classified_points`

The `result_subtype` is `reference/classified_points`.

### Annotations

- `debrief:resultType`: `mutation/reference/classified_points`
- `debrief:sourceFeatures`: `[<reference feature id>, <zone feature id>]`
- `debrief:label`: `"Classified {N} points: {n1} in 75%, {n2} in 50%, {n3} in 25%, {n4} outside"`

## Algorithm

### Point-in-Polygon (Ray Casting)

```pseudocode
FUNCTION point_in_polygon(px: float, py: float, ring: list[list[float]]) -> boolean:
    // Ray-casting algorithm: count edge crossings of a horizontal ray to the right
    inside = false
    n = length(ring)

    j = n - 1
    FOR i = 0 TO n - 1:
        xi = ring[i][0]
        yi = ring[i][1]
        xj = ring[j][0]
        yj = ring[j][1]

        // Check if ray crosses this edge
        IF ((yi > py) != (yj > py)) AND (px < (xj - xi) * (py - yi) / (yj - yi) + xi):
            inside = NOT inside
        END IF

        j = i
    END FOR

    RETURN inside
END FUNCTION
```

### Classification

```pseudocode
FUNCTION classify_points(context: SelectionContext) -> list[Feature]:
    // Extract features by kind
    ref_feature = null
    zone_feature = null

    FOR EACH feature IN context.features:
        IF feature.properties.kind = "POINT" AND feature.properties.locationType = "REFERENCE":
            ref_feature = feature
        ELSE IF feature.properties.kind = "ZONE":
            zone_feature = feature
        END IF
    END FOR

    // Validate inputs
    IF ref_feature IS NULL:
        RETURN build_error("No reference point feature found", "invalid_input", [])
    END IF
    IF zone_feature IS NULL:
        RETURN build_error("No zone feature found", "invalid_input", [])
    END IF
    IF ref_feature.geometry.type != "MultiPoint":
        RETURN build_error("Reference feature must have MultiPoint geometry", "invalid_input", [ref_feature.id])
    END IF
    IF zone_feature.geometry.type != "MultiPolygon":
        RETURN build_error("Zone feature must have MultiPolygon geometry", "invalid_input", [zone_feature.id])
    END IF

    coordinates = ref_feature.geometry.coordinates
    metadata = ref_feature.properties.pointMetadata
    zone_polygons = zone_feature.geometry.coordinates  // array of polygon rings
    zone_info = zone_feature.properties.zones          // array of zone metadata

    IF length(metadata) != length(coordinates):
        RETURN build_error("pointMetadata length must match coordinates length", "invalid_input", [ref_feature.id])
    END IF

    // Classify each point
    point_colors = empty list
    zone_counts = {}  // zone name -> count

    FOR i = 0 TO length(coordinates) - 1:
        px = coordinates[i][0]  // longitude
        py = coordinates[i][1]  // latitude

        assigned_zone = "none"
        assigned_color = "#666666"

        // Test zones innermost first (index 0 = highest likelihood)
        FOR z = 0 TO length(zone_polygons) - 1:
            ring = zone_polygons[z][0]  // outer ring of this polygon

            IF point_in_polygon(px, py, ring):
                assigned_zone = zone_info[z].name
                assigned_color = zone_info[z].style.fill_color
                    OR zone_info[z].style.color
                BREAK  // innermost match wins
            END IF
        END FOR

        // Update metadata entry (preserve existing fields)
        metadata[i].zone = assigned_zone
        metadata[i].color = assigned_color
        point_colors.append(assigned_color)

        // Track counts
        IF assigned_zone NOT IN zone_counts:
            zone_counts[assigned_zone] = 0
        END IF
        zone_counts[assigned_zone] = zone_counts[assigned_zone] + 1
    END FOR

    // Build classified feature (copy of original with updated metadata)
    classified = deep_copy(ref_feature)
    classified.properties.pointMetadata = metadata
    classified.properties.pointColors = point_colors

    // Build label
    label_parts = empty list
    FOR EACH zone IN zone_info:
        count = zone_counts.get(zone.name, 0)
        label_parts.append(count + " in " + zone.name)
    END FOR
    outside_count = zone_counts.get("none", 0)
    label_parts.append(outside_count + " outside")
    label = "Classified " + length(coordinates) + " points: " + join(label_parts, ", ")

    RETURN [classified]
END FUNCTION
```

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| No reference point feature in input | Return error: "No reference point feature found" |
| No zone feature in input | Return error: "No zone feature found" |
| Reference feature is not MultiPoint | Return error: "Reference feature must have MultiPoint geometry" |
| Zone feature is not MultiPolygon | Return error: "Zone feature must have MultiPolygon geometry" |
| Empty coordinates array (0 points) | Return feature unchanged with empty pointMetadata and pointColors arrays |
| pointMetadata length != coordinates length | Return error: "pointMetadata length must match coordinates length" |
| Point exactly on zone boundary | Treated as inside (standard ray-casting boundary inclusion) |
| All points outside all zones | All points get zone="none", color="#666666" |
| All points inside innermost zone | All points get innermost zone assignment |
| Re-classification (metadata already has zone/color) | Existing zone/color fields are overwritten with new values |
| Zone feature has empty zones array | All points classified as "none" |
| Multiple zone features in input | Only the first ZONE feature is used |
| Multiple reference features in input | Only the first POINT/REFERENCE feature is used |

## Examples

### Golden Example Files

- Basic input: `point-in-zone-classifier.basic.input.json`
- Basic output: `point-in-zone-classifier.basic.output.json`
- All-outside input: `point-in-zone-classifier.all-outside.input.json`
- All-outside output: `point-in-zone-classifier.all-outside.output.json`

### Basic Example

**Input**: A MultiPoint feature with 6 reference points and a MultiPolygon zone feature with 3 concentric zones. Points are positioned so that 2 fall in the innermost zone, 2 in the middle zone, and 2 outside all zones.

**Output**: The same MultiPoint feature with updated `pointMetadata` entries (zone and color fields added) and a `pointColors` array for per-point rendering.

### All-Outside Example

**Input**: A MultiPoint feature with 4 reference points and a MultiPolygon zone feature, where all points are far from the zones.

**Output**: All points classified with zone="none" and color="#666666".

## Changelog

### 1.0 (2026-02-17)
- Initial release with ray-casting point-in-polygon
- Innermost-first zone priority
- Per-point metadata update (zone, color)
- pointColors array for renderer support

## References

**Related Tools**:
- [generate-reference-points](../generation/generate-reference-points.1.0.md) — Produces the MultiPoint input
- [buffer-zone-generator](../../sensor/detection/buffer-zone-generator.1.0.md) — Produces the zone MultiPolygon input
- Zone Histogram Generator (#082) — Downstream consumer; counts classified points per zone

**Schemas**:
- [ReferenceLocation](../../../schemas/src/linkml/geojson.yaml) — GeoJSON Feature schema for reference points
- [PointMetadataEntry](../../../schemas/src/linkml/geojson.yaml) — Per-point metadata within MultiPoint
- [FeatureKindEnum](../../../schemas/src/linkml/common.yaml) — Feature type discriminator (POINT, ZONE)

**External**:
- [GeoJSON RFC 7946](https://datatracker.ietf.org/doc/html/rfc7946) — GeoJSON specification
- [Ray Casting Algorithm](https://en.wikipedia.org/wiki/Point_in_polygon#Ray_casting_algorithm) — Point-in-polygon test
