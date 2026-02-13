# Quickstart: Generate Reference Points Tool

**Feature**: 078-generate-reference-points

## Overview

The generate-reference-points tool creates Point features in a grid or scatter pattern within a bounding box. It is the first step in the E03 buffer zone analysis chain.

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

# result.features contains 12 Point features
assert len(result.features) == 12
assert result.features[0]["properties"]["kind"] == "POINT"
assert result.features[0]["properties"]["locationType"] == "REFERENCE"
```

### Scatter Pattern (Python)

```python
result = run("generate-reference-points", context, params={
    "pattern": "scatter",
    "bounds": [-5, 49, 1, 52],
    "count": 20,
    "seed": 42,
})

# result.features contains 20 randomly placed points
assert len(result.features) == 20
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

// features contains 12 Point features
console.log(features.length); // 12
console.log(features[0].properties.kind); // "POINT"
```

## Key Behaviours

1. **Grid**: Points placed at regular latitude/longitude intervals, including boundary edges
2. **Scatter**: Uniform random distribution using a cross-language deterministic PRNG (LCG)
3. **Seed reproducibility**: Same seed always produces same coordinates in both Python and TypeScript
4. **Antimeridian**: Bounds with west > east correctly generate points across the date line
5. **Provenance**: Executor automatically attaches PROV log entries to all generated features

## Integration with E03 Chain

```
generate-reference-points (#078)
        │ FeatureCollection of POINT/REFERENCE features
        ▼
point-in-zone-classifier (#081)
        │ Recolored features with zone membership
        ▼
zone-histogram-generator (#082)
        │ Dataset artifact with counts per zone
        ▼
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
