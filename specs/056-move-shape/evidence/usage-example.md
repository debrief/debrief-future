# Usage Example: Move Shape Tool (056)

## Python

```python
from debrief_calc.models import ContextType, SelectionContext
from debrief_calc.tools.shape.manipulation.move_shape import move_shape

# A circle annotation at [0, 50]
circle = {
    "type": "Feature",
    "id": "circle-001",
    "geometry": {
        "type": "Polygon",
        "coordinates": [[[0.0, 50.009], [0.014, 50.0], [0.0, 49.991], [-0.014, 50.0], [0.0, 50.009]]]
    },
    "properties": {
        "kind": "CIRCLE",
        "center": [0.0, 50.0],
        "radius": 1000,
        "label": "Exercise Area"
    }
}

context = SelectionContext(type=ContextType.SINGLE, features=[circle])
params = {"direction": 90, "distance_km": 5}

result = move_shape(context, params)

# Result: circle translated 5 km East
print(result[0]["properties"]["center"])
# → [0.0699547821186286, 49.99997897171822]
# center shifted ~0.07° East, latitude essentially unchanged
```

## TypeScript

```typescript
import { execute } from './tools/shape/manipulation/moveShape';

const circle = {
  type: 'Feature' as const,
  id: 'circle-001',
  geometry: {
    type: 'Polygon',
    coordinates: [[[0.0, 50.009], [0.014, 50.0], [0.0, 49.991], [-0.014, 50.0], [0.0, 50.009]]],
  },
  properties: {
    kind: 'CIRCLE',
    center: [0.0, 50.0],
    radius: 1000,
    label: 'Exercise Area',
  },
};

const result = execute([circle], { direction: 90, distance_km: 5 });

console.log(result[0].properties.center);
// → [0.0699547821186286, 49.99997897171822]
```

## How It Works

1. The tool accepts annotation features (CIRCLE, RECTANGLE, LINE, TEXT, VECTOR)
2. Each coordinate is translated using the Vincenty destination formula
3. Special properties are updated: `center` for circles, `origin` for vectors
4. Vector `range` and `bearing` are preserved (only the origin moves)
5. Non-annotation features are silently skipped
