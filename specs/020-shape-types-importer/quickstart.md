# Quickstart: Shape Types Importer

## Prerequisites

- Python 3.11+
- pnpm (for Storybook)
- uv (for Python package management)

## Setup

```bash
# Install Python dependencies
cd services/io
uv sync

# Install Storybook dependencies
cd shared/components
pnpm install
```

## Parse REP File with Shapes

```python
from debrief_io import parse_rep_file

# Parse a REP file containing shape annotations
result = parse_rep_file("exercise.rep")

# Access parsed shapes
for feature in result.features:
    if feature["properties"]["kind"] in ["ELLIPSE", "POLY", "WHEEL"]:
        print(f"Shape: {feature['properties']['kind']}")
        print(f"  Geometry: {feature['geometry']['type']}")
```

## Generate Storybook Fixtures

```bash
# From repo root
cd services/io
python scripts/generate-storybook-fixtures.py

# Output: shared/components/src/fixtures/all-shapes.geojson
```

## View Shapes in Storybook

```bash
cd shared/components
pnpm storybook

# Open: http://localhost:6006/?path=/story/components-mapview--shape-types
```

## Shape Type Examples

### ELLIPSE

```
;ELLIPSE: @A 240115 120000 50.5000N 004.3000W 045 5000 2500
```

Produces a rotated ellipse with:
- Center: 50.5°N, 4.3°W
- Semi-major axis: 5000m (oriented 45° from North)
- Semi-minor axis: 2500m

### WHEEL

```
;WHEEL: @B 50.5000N 004.3000W 1000 5000
```

Produces a donut shape with:
- Center: 50.5°N, 4.3°W
- Inner radius: 1000m
- Outer radius: 5000m

### POLY

```
;POLY: @C "Patrol Area" 4 50.5N 4.3W 50.6N 4.3W 50.6N 4.2W 50.5N 4.2W
```

Produces a 4-vertex closed polygon (auto-closes).

### SENSOR

```
;SENSOR: @D "TRACK_001" 50.5000N 004.3000W 045 10000 "Active Sonar"
```

Produces a line from observer position along bearing 045° for 10km.

## Testing

```bash
# Run shape parser tests
cd services/io
uv run pytest tests/test_annotations/test_shapes.py -v

# Run schema validation tests
cd shared/schemas
uv run pytest tests/test_annotations.py -v
```

## Common Issues

### Shape not rendering in Storybook

1. Check the `kind` property matches expected value
2. Verify geometry coordinates are [longitude, latitude] (GeoJSON order)
3. Check style properties include required fields

### Ellipse appears distorted

Ellipse approximation uses geodesic conversion at center latitude. Very large ellipses (>50km) may show distortion near poles.

### Wheel inner ring not showing

GeoJSON requires opposite winding for holes. Verify:
- Outer ring: counter-clockwise
- Inner ring: clockwise (reversed)
