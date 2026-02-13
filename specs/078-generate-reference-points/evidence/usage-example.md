# Usage Example: Generate Reference Points

## Python

```python
from debrief_calc.models import ContextType, SelectionContext
from debrief_calc.tools.reference.generation import generate_reference_points

# Create a polygon feature representing the zone
polygon = {
    "type": "Feature",
    "id": "zone-charlie",
    "geometry": {
        "type": "Polygon",
        "coordinates": [[[-5, 49], [1, 49], [1, 52], [-5, 52], [-5, 49]]],
    },
    "properties": {"kind": "RECTANGLE"},
}
context = SelectionContext(type=ContextType.SINGLE, features=[polygon])

# Grid pattern: 3 rows x 4 columns
grid_result = generate_reference_points(context, {
    "pattern": "grid",
    "rows": 3,
    "cols": 4,
})
feature = grid_result[0]
# feature["geometry"]["type"] == "MultiPoint"
# feature["geometry"]["coordinates"] has 12 points
# feature["properties"]["pointMetadata"] has 12 entries

# Scatter pattern: 20 points with seed for reproducibility
scatter_result = generate_reference_points(context, {
    "pattern": "scatter",
    "count": 20,
    "seed": 42,
})
feature = scatter_result[0]
# feature["geometry"]["type"] == "MultiPoint"
# feature["geometry"]["coordinates"] has 20 points within bounds
# Same seed always produces identical output
```

## TypeScript

```typescript
import { execute } from './tools/reference/generation/generateReferencePoints';

const polygon = {
  type: 'Feature' as const,
  id: 'zone-charlie',
  geometry: {
    type: 'Polygon',
    coordinates: [[[-5, 49], [1, 49], [1, 52], [-5, 52], [-5, 49]]],
  },
  properties: { kind: 'RECTANGLE' },
};

// Grid pattern
const gridResult = execute([polygon], {
  pattern: 'grid',
  rows: 3,
  cols: 4,
});
// gridResult[0].geometry.coordinates.length === 12

// Scatter pattern with seed
const scatterResult = execute([polygon], {
  pattern: 'scatter',
  count: 20,
  seed: 42,
});
// scatterResult[0].geometry.coordinates.length === 20
// Identical output to Python with same seed
```

## Output Structure

Both languages produce a single MultiPoint feature:

```json
{
  "type": "Feature",
  "id": "ref-grid",
  "geometry": {
    "type": "MultiPoint",
    "coordinates": [[-5.0, 49.0], [-3.0, 49.0], ...]
  },
  "properties": {
    "kind": "POINT",
    "locationType": "REFERENCE",
    "name": "Reference Points (grid 3x4)",
    "style": { "shape": "square", "color": "#666666", "radius": 5 },
    "pointMetadata": [
      { "index": 0, "name": "Ref 1" },
      { "index": 1, "name": "Ref 2" },
      ...
    ]
  }
}
```

## Integration with Downstream Tools

The generated MultiPoint feature feeds directly into the E03 buffer zone analysis chain:

1. **generate-reference-points** (#078) -- requires a RECTANGLE/CIRCLE polygon, produces MultiPoint with pointMetadata
2. **point-in-zone-classifier** (#081) -- reads pointMetadata, adds zone/color fields
3. **zone-histogram-generator** (#082) -- counts entries per zone
