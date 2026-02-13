# Quickstart: Add MultiPoint and MultiPolygon Feature Schemas

**Feature**: 081-add-multi-feature-styling

## What This Feature Adds

Two new GeoJSON geometry classes (`GeoJSONMultiPoint`, `GeoJSONMultiPolygon`) and two new Feature types (`MultiPointFeature`, `MultiPolygonFeature`) to the LinkML master schema, enabling tools to return multi-point and multi-polygon results with proper styling.

## Prerequisites

- Python 3.11+ with `uv` installed
- Node.js with `pnpm` installed
- LinkML (`pip install linkml>=1.7.0`)

## Implementation Steps

### Step 1: Add Geometry Classes to LinkML

Edit `shared/schemas/src/linkml/geojson.yaml` — add after `GeoJSONMultiLineString`:

```yaml
  GeoJSONMultiPoint:
    description: GeoJSON MultiPoint geometry for multi-point tool results
    attributes:
      type:
        description: Geometry type discriminator
        range: string
        required: true
        equals_string: "MultiPoint"
      coordinates:
        description: Array of [longitude, latitude] positions
        range: float
        multivalued: true
        required: true

  GeoJSONMultiPolygon:
    description: GeoJSON MultiPolygon geometry for multi-polygon tool results
    attributes:
      type:
        description: Geometry type discriminator
        range: string
        required: true
        equals_string: "MultiPolygon"
      coordinates:
        description: Array of polygon coordinate arrays (each an array of linear rings)
        range: float
        multivalued: true
        required: true
```

### Step 2: Add FeatureKindEnum Values

Edit `shared/schemas/src/linkml/common.yaml` — add to FeatureKindEnum:

```yaml
      MULTI_POINT:
        description: Multi-point tool result (MultiPoint geometry)
      MULTI_POLYGON:
        description: Multi-polygon tool result (MultiPolygon geometry)
```

### Step 3: Add Feature Types

Edit `shared/schemas/src/linkml/geojson.yaml` — add new sections:

```yaml
  MultiPointFeatureProperties:
    description: Properties for a MultiPointFeature
    attributes:
      kind:
        description: Feature type discriminator
        range: FeatureKindEnum
        required: true
        equals_string: "MULTI_POINT"
      label:
        description: Human-readable result label
        required: true
      style:
        description: Point styling for all positions
        range: PointProperties
        required: true
      source_tool:
        description: Name of calculation tool that produced this result
      source_features:
        description: IDs of input features used to generate this result
        range: string
        multivalued: true
      description:
        description: Additional description or notes

  MultiPointFeature:
    description: GeoJSON Feature for multi-point tool results
    attributes:
      type:
        description: GeoJSON type discriminator
        range: string
        required: true
        equals_string: "Feature"
      id:
        description: Unique identifier (UUID recommended)
        required: true
      geometry:
        description: MultiPoint geometry
        range: GeoJSONMultiPoint
        required: true
      properties:
        description: Feature properties and styling
        range: MultiPointFeatureProperties
        required: true
      bbox:
        description: Bounding box [minLon, minLat, maxLon, maxLat]
        range: float
        multivalued: true
        minimum_cardinality: 4
        maximum_cardinality: 4

  MultiPolygonFeatureProperties:
    description: Properties for a MultiPolygonFeature
    attributes:
      kind:
        description: Feature type discriminator
        range: FeatureKindEnum
        required: true
        equals_string: "MULTI_POLYGON"
      label:
        description: Human-readable result label
        required: true
      style:
        description: Polygon styling for all regions
        range: PolygonProperties
        required: true
      source_tool:
        description: Name of calculation tool that produced this result
      source_features:
        description: IDs of input features used to generate this result
        range: string
        multivalued: true
      description:
        description: Additional description or notes

  MultiPolygonFeature:
    description: GeoJSON Feature for multi-polygon tool results
    attributes:
      type:
        description: GeoJSON type discriminator
        range: string
        required: true
        equals_string: "Feature"
      id:
        description: Unique identifier (UUID recommended)
        required: true
      geometry:
        description: MultiPolygon geometry
        range: GeoJSONMultiPolygon
        required: true
      properties:
        description: Feature properties and styling
        range: MultiPolygonFeatureProperties
        required: true
      bbox:
        description: Bounding box [minLon, minLat, maxLon, maxLat]
        range: float
        multivalued: true
        minimum_cardinality: 4
        maximum_cardinality: 4
```

### Step 4: Run Schema Generation

```bash
cd shared/schemas
make generate
```

### Step 5: Update Generation Script

Edit `shared/schemas/scripts/generate.py` — add to `entity_types` list:

```python
"MultiPointFeature",
"MultiPolygonFeature",
```

### Step 6: Create Golden Fixtures

Create valid and invalid fixture files in `shared/schemas/src/fixtures/valid/` and `shared/schemas/src/fixtures/invalid/`.

See `contracts/` directory for example JSON structures.

### Step 7: Update Tests

1. **test_golden.py**: Add imports and ENTITY_MAP entries
2. **test_golden.py**: Add to `nested_coord_types` set
3. **test_schema_compare.py**: Update FeatureKindEnum expected values

### Step 8: Run Tests

```bash
cd shared/schemas
uv run pytest tests/ -v
pnpm exec tsc --noEmit
```

## Verification

All of these should pass:
- `uv run pytest tests/test_golden.py -v` — golden fixture validation
- `uv run pytest tests/test_roundtrip.py -v` — round-trip serialisation
- `uv run pytest tests/test_schema_compare.py -v` — schema comparison
- `pnpm exec tsc --noEmit` — TypeScript compilation
