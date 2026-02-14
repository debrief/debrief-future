---
name: generate-reference-points
version: 1.0
category: reference/generation
status: draft
---

# Generate Reference Points

> Generates a grid or scatter pattern of reference points within a bounding box, producing a single MultiPoint feature.

## MCP

**Description**: Generates a grid or scatter pattern of reference points within the bounds of a selected polygon. Creates a single GeoJSON MultiPoint feature with evenly spaced (grid) or randomly distributed (scatter) coordinates. Used as the first step of buffer zone analysis.

**When to use**: When an analyst has selected a zone polygon (RECTANGLE or CIRCLE) and needs a set of reference points filling that area for spatial analysis, such as buffer zone classification or coverage assessment.

**Parameters**:
- `pattern`: Generation pattern — "grid" for evenly spaced rows/columns, "scatter" for random distribution
- `rows`: Number of rows (grid pattern only, default: 5)
- `cols`: Number of columns (grid pattern only, default: 5)
- `count`: Number of points to generate (scatter pattern only, default: 25)
- `seed`: Random seed for reproducible scatter generation (scatter pattern only, optional)

**Returns**: Addition ToolResponse containing a single MultiPoint feature with `kind: "POINT"`, `locationType: "REFERENCE"`, and a parallel `pointMetadata` array.

## Inputs

**Schema**: Requires exactly one polygon feature — `ContextType.SINGLE` with `input_kinds: ["RECTANGLE", "CIRCLE"]`. The bounding box [west, south, east, north] is derived from the polygon geometry coordinates by computing min/max of longitude and latitude across the outer ring.

**Constraints**:
- Input feature must have Polygon geometry with at least one coordinate ring
- Derived bounding box must have positive area (west != east, south != north)
- `south < north` (latitude ordering)
- `rows` and `cols` must be positive integers (grid pattern)
- `count` must be a positive integer (scatter pattern)
- When `west > east`, the bounding box crosses the antimeridian

**Defaults**:
- `rows`: 5
- `cols`: 5
- `count`: 25
- `seed`: null (non-deterministic)

## Outputs

**Response Schema**: `specs/041-document-tool-results/data-model.md#ToolResponse`

### Result Type Path

`addition/reference/generated_points`

The `result_subtype` is `reference/generated_points`.

### Annotations

- `debrief:resultType`: `addition/reference/generated_points`
- `debrief:sourceFeatures`: `[<polygon feature id>]`
- `debrief:label`: `"Generated {N} reference points ({pattern}) in [{W},{S},{E},{N}]"`

## Algorithm

### Grid Pattern

```pseudocode
FUNCTION generate_grid(bounds: BoundingBox, rows: integer, cols: integer) -> Feature:
    west, south, east, north = bounds

    // Handle antimeridian crossing
    effective_east = east
    IF west > east:
        effective_east = east + 360
    END IF

    coordinates = empty list
    metadata = empty list

    FOR r = 0 TO rows - 1:
        IF rows = 1:
            lat = (south + north) / 2
        ELSE:
            lat = south + r * (north - south) / (rows - 1)
        END IF

        FOR c = 0 TO cols - 1:
            IF cols = 1:
                lon = (west + effective_east) / 2
            ELSE:
                lon = west + c * (effective_east - west) / (cols - 1)
            END IF

            // Normalise longitude to [-180, 180]
            IF lon > 180:
                lon = lon - 360
            END IF

            coordinates.append([lon, lat])
            metadata.append({index: r * cols + c, name: "Ref " + (r * cols + c + 1)})
        END FOR
    END FOR

    RETURN build_multipoint_feature("ref-grid", coordinates, metadata,
        name: "Reference Points (grid " + rows + "x" + cols + ")")
END FUNCTION
```

### Scatter Pattern

```pseudocode
FUNCTION generate_scatter(bounds: BoundingBox, count: integer, seed: integer | null) -> Feature:
    west, south, east, north = bounds

    // Handle antimeridian crossing
    effective_east = east
    IF west > east:
        effective_east = east + 360
    END IF

    // Initialise LCG PRNG
    IF seed IS NOT NULL:
        state = seed
    ELSE:
        state = system_time_based_seed()
    END IF

    coordinates = empty list
    metadata = empty list

    FOR i = 0 TO count - 1:
        state = lcg_next(state)
        lon_frac = state / 2^32
        state = lcg_next(state)
        lat_frac = state / 2^32

        lon = west + lon_frac * (effective_east - west)
        lat = south + lat_frac * (north - south)

        // Normalise longitude to [-180, 180]
        IF lon > 180:
            lon = lon - 360
        END IF

        coordinates.append([lon, lat])
        metadata.append({index: i, name: "Ref " + (i + 1)})
    END FOR

    RETURN build_multipoint_feature("ref-scatter", coordinates, metadata,
        name: "Reference Points (scatter " + count + ")")
END FUNCTION
```

### Cross-Language LCG PRNG

```pseudocode
// Linear Congruential Generator — Numerical Recipes constants
// These constants MUST be identical in Python and TypeScript implementations
CONSTANT LCG_MULTIPLIER = 1664525
CONSTANT LCG_INCREMENT  = 1013904223
CONSTANT LCG_MODULUS    = 2^32  // 4294967296

FUNCTION lcg_next(state: integer) -> integer:
    RETURN (LCG_MULTIPLIER * state + LCG_INCREMENT) MOD LCG_MODULUS
END FUNCTION
```

### Feature Construction

```pseudocode
FUNCTION build_multipoint_feature(id: string, coordinates: list, metadata: list, name: string) -> Feature:
    RETURN {
        type: "Feature",
        id: id,
        geometry: {
            type: "MultiPoint",
            coordinates: coordinates
        },
        properties: {
            kind: "POINT",
            locationType: "REFERENCE",
            name: name,
            style: {
                shape: "square",
                color: "#666666",
                radius: 5
            },
            pointMetadata: metadata
        }
    }
END FUNCTION
```

### Bounds Extraction

```pseudocode
FUNCTION extract_bounds_from_polygon(feature: Feature) -> BoundingBox:
    // Extract outer ring coordinates from Polygon geometry
    coordinates = feature.geometry.coordinates[0]
    lons = [c[0] FOR c IN coordinates]
    lats = [c[1] FOR c IN coordinates]
    RETURN [min(lons), min(lats), max(lons), max(lats)]
END FUNCTION
```

### Entry Point

```pseudocode
FUNCTION generate_reference_points(context: SelectionContext, params: dict) -> list[Feature]:
    // Extract bounds from the selected polygon feature
    polygon = context.features[0]
    bounds = extract_bounds_from_polygon(polygon)
    validate_bounds(bounds)

    pattern = params["pattern"]

    IF pattern = "grid":
        rows = params.get("rows", 5)
        cols = params.get("cols", 5)
        validate_positive_integer(rows, "rows")
        validate_positive_integer(cols, "cols")
        feature = generate_grid(bounds, rows, cols)
    ELSE IF pattern = "scatter":
        count = params.get("count", 25)
        seed = params.get("seed", null)
        validate_positive_integer(count, "count")
        feature = generate_scatter(bounds, count, seed)
    ELSE:
        RETURN build_error("Pattern must be 'grid' or 'scatter'", "invalid_input", [])
    END IF

    RETURN [feature]
END FUNCTION
```

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| No polygon feature provided | Return error: "Requires exactly one polygon feature" |
| Zero-area polygon (degenerate line/point) | Return error: "Bounding box must have positive area" |
| south >= north in derived bounds | Return error: "South ({s}) must be less than north ({n})" |
| Negative or zero rows/cols | Return error: "Grid dimensions must be positive integers" |
| count = 0 or negative | Return error: "Count must be a positive integer" |
| Antimeridian crossing (west > east) | Generate points across date line, normalise longitudes to [-180, 180] |
| 1x1 grid | Single coordinate at bounding box centre |
| No seed for scatter | Use system time as seed (non-reproducible) |
| Very large grid (1000x1000) | Generate all points; no artificial limit |

## Examples

### Golden Example Files

- Grid input: `generate-reference-points.grid.input.json`
- Grid output: `generate-reference-points.grid.output.json`
- Scatter input: `generate-reference-points.scatter.input.json`
- Scatter output: `generate-reference-points.scatter.output.json`

### Grid Example (3x4)

**Input**: A RECTANGLE polygon with bounds [-5, 49, 1, 52], `pattern="grid"`, `rows=3`, `cols=4`

**Output**: MultiPoint feature with 12 coordinates at evenly spaced intervals:
- Row 0 (lat=49.0): [-5, 49], [-3, 49], [-1, 49], [1, 49]
- Row 1 (lat=50.5): [-5, 50.5], [-3, 50.5], [-1, 50.5], [1, 50.5]
- Row 2 (lat=52.0): [-5, 52], [-3, 52], [-1, 52], [1, 52]

### Scatter Example (20 points, seed=42)

**Input**: A RECTANGLE polygon with bounds [-5, 49, 1, 52], `pattern="scatter"`, `count=20`, `seed=42`

**Output**: MultiPoint feature with 20 coordinates uniformly distributed within bounds, deterministic for seed=42.

## Changelog

### 1.0 (2026-02-13)
- Initial release with grid and scatter patterns
- Requires a polygon feature (RECTANGLE or CIRCLE) — bounds derived from geometry
- Cross-language LCG PRNG for deterministic scatter
- MultiPoint geometry with parallel pointMetadata array

## References

**Related Tools**:
- Point-in-Zone Classifier (#081) — Consumes generated points, classifies by buffer zone
- Zone Histogram Generator (#082) — Counts classified points per zone

**Schemas**:
- [ReferenceLocation](../../../schemas/src/linkml/geojson.yaml) — GeoJSON Feature schema for reference points
- [PointMetadataEntry](../../../schemas/src/linkml/geojson.yaml) — Per-point metadata within MultiPoint
- [FeatureKindEnum](../../../schemas/src/linkml/common.yaml) — Feature type discriminator (POINT)
- [LocationTypeEnum](../../../schemas/src/linkml/common.yaml) — Location type (REFERENCE)

**External**:
- [GeoJSON RFC 7946](https://datatracker.ietf.org/doc/html/rfc7946) — GeoJSON specification
- [Numerical Recipes LCG](https://en.wikipedia.org/wiki/Linear_congruential_generator) — PRNG constants used for scatter pattern
