# Quickstart: Generate Reference Points Tool

**Feature**: 078-generate-reference-points

## Overview

The generate-reference-points tool creates a single MultiPoint feature containing a grid or scatter pattern of reference coordinates within a bounding box. It is the first step in the E03 buffer zone analysis chain. The MultiPoint approach keeps the FeatureCollection compact and provides a `pointMetadata` array for per-point information that downstream tools can extend.

## Usage

### Grid Pattern (Python)

```python
from debrief_calc.executor import run
from debrief_calc.models import SelectionContext, ContextType

context = SelectionContext(type=ContextType.NONE, features=[])
result = run("generate-reference-points", context, params={
    "pattern": "grid",
    "bounds": [-5, 49, 1, 52],
    "rows": 3,
    "cols": 4,
})

# result.features contains 1 MultiPoint feature with 12 coordinates
feature = result.features[0]
assert feature["geometry"]["type"] == "MultiPoint"
assert len(feature["geometry"]["coordinates"]) == 12
assert feature["properties"]["kind"] == "POINT"
assert feature["properties"]["locationType"] == "REFERENCE"
assert len(feature["properties"]["pointMetadata"]) == 12
assert feature["properties"]["pointMetadata"][0] == {"index": 0, "name": "Ref 1"}
```

### Scatter Pattern (Python)

```python
result = run("generate-reference-points", context, params={
    "pattern": "scatter",
    "bounds": [-5, 49, 1, 52],
    "count": 20,
    "seed": 42,
})

# result.features contains 1 MultiPoint feature with 20 coordinates
feature = result.features[0]
assert len(feature["geometry"]["coordinates"]) == 20
assert len(feature["properties"]["pointMetadata"]) == 20
```

### TypeScript (VS Code / Web-Shell)

```typescript
import { execute } from './tools/reference/generation/generateReferencePoints';

const features = execute([], {
  pattern: 'grid',
  bounds: [-5, 49, 1, 52],
  rows: 3,
  cols: 4,
});

// features contains 1 MultiPoint feature with 12 coordinates
const feature = features[0];
console.log(feature.geometry.type);                  // "MultiPoint"
console.log(feature.geometry.coordinates.length);    // 12
console.log(feature.properties.pointMetadata.length); // 12
```

## Key Behaviours

1. **Single MultiPoint feature**: All coordinates in one feature, not individual Point features
2. **pointMetadata**: Parallel array to coordinates — each entry has `index` and `name`; downstream tools (#081) add `zone` and `color` for per-point styling
3. **Grid**: Coordinates placed at regular latitude/longitude intervals, including boundary edges
4. **Scatter**: Uniform random distribution using a cross-language deterministic PRNG (LCG)
5. **Seed reproducibility**: Same seed always produces same coordinates in both Python and TypeScript
6. **Antimeridian**: Bounds with west > east correctly generate points across the date line
7. **Provenance**: Executor automatically attaches PROV log entries

## Integration with E03 Chain

```
generate-reference-points (#078)
        | MultiPoint feature with pointMetadata
        v
point-in-zone-classifier (#081)
        | Same feature, pointMetadata extended with zone + color
        v
zone-histogram-generator (#082)
        | Dataset artifact with counts per zone
        v
Results panel (E04)
```

## File Locations

| Component | Path |
|-----------|------|
| Tool spec | `shared/tools/reference/generation/generate-reference-points.1.0.md` |
| Python implementation | `services/calc/debrief_calc/tools/reference/generation.py` |
| Python tests | `services/calc/tests/tools/reference/test_generation.py` |
| TypeScript implementation | `apps/vscode/src/tools/reference/generation/generateReferencePoints.ts` |
| TypeScript tests | `apps/vscode/tests/unit/tools/reference/generateReferencePoints.test.ts` |
| Golden examples (grid) | `shared/tools/reference/generation/generate-reference-points.grid.{input,output}.json` |
| Golden examples (scatter) | `shared/tools/reference/generation/generate-reference-points.scatter.{input,output}.json` |
