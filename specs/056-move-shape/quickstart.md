# Quickstart: Move Shape Tool Spec

**Feature**: 056-move-shape | **Date**: 2026-02-10

## What This Feature Produces

This feature creates a **tool specification** (not code). The deliverables are:

1. A markdown tool spec at `shared/tools/shape/manipulation/move-shape.1.0.md`
2. Golden I/O example JSON files in the same directory

## Directory Layout

```
shared/tools/shape/manipulation/
├── move-shape.1.0.md                        # The tool specification
├── move-shape.basic-polygon.input.json      # Golden input: circle annotation
├── move-shape.basic-polygon.output.json     # Golden output: translated circle
├── move-shape.vector.input.json             # Golden input: vector annotation
└── move-shape.vector.output.json            # Golden output: translated vector
```

## Template to Follow

The spec follows `shared/tools/TEMPLATE.md` with these 9 required sections:

1. **Metadata** (YAML front matter): `name: move-shape`, `version: 1.0`, `category: shape/manipulation`, `status: draft`
2. **MCP**: LLM description, when to use, parameters, returns
3. **Inputs**: Schema reference to `annotations.yaml`, constraints, defaults
4. **Outputs**: ToolResponse with `mutation/shape/translated` result type
5. **Algorithm**: Pseudocode for great-circle translation of all annotation kinds
6. **Edge Cases**: Table covering empty input, zero distance, antimeridian, polar, non-annotations
7. **Examples**: Inline examples + references to golden fixture files
8. **Changelog**: Version 1.0 initial release
9. **References**: Links to related schemas, template, legacy code

## Key Algorithm

The core operation is the Vincenty destination formula applied to every coordinate:

```
For each coordinate [lon, lat]:
  lat_rad = lat * π / 180
  lon_rad = lon * π / 180
  bearing_rad = direction * π / 180
  d = distance_km / 6371.0  (angular distance)

  lat2 = asin(sin(lat_rad) * cos(d) + cos(lat_rad) * sin(d) * cos(bearing_rad))
  lon2 = lon_rad + atan2(sin(bearing_rad) * sin(d) * cos(lat_rad), cos(d) - sin(lat_rad) * sin(lat2))

  Normalise lon2 to [-180, 180]
  Convert back to degrees
```

## Verification

After creating the spec, verify:

- [ ] All 9 sections present and non-empty
- [ ] Golden input JSON is valid GeoJSON FeatureCollection
- [ ] Golden output JSON is valid ToolResponse format
- [ ] Algorithm pseudocode covers all 5 annotation kinds (CIRCLE, RECTANGLE, LINE, TEXT, VECTOR)
- [ ] Edge cases table has 5+ entries
- [ ] Provenance label includes direction and distance
- [ ] Result type is `mutation/shape/translated`
