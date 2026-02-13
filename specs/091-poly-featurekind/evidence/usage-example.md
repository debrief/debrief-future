# Usage Example: Validating a POLY Feature

## Python — Pydantic Validation

```python
import json
from debrief_schemas import PolyAnnotation

# Load a POLY feature (e.g., from STAC catalog or IO service output)
data = {
    "type": "Feature",
    "id": "poly-patrol-zone",
    "geometry": {
        "type": "Polygon",
        "coordinates": [[
            [-5.0, 50.0], [-4.0, 50.0], [-4.0, 51.0],
            [-5.0, 51.0], [-5.0, 50.0]
        ]]
    },
    "properties": {
        "kind": "POLY",
        "vertex_count": 4,
        "label": "Patrol Zone Alpha",
        "symbol": "@A",
        "style": {
            "fill": True,
            "fill_color": "#FF0000",
            "fill_opacity": 0.2,
            "stroke": True,
            "color": "#CC0000",
            "weight": 2,
            "opacity": 1.0,
            "line_cap": "round",
            "line_join": "miter",
            "dash_array": None
        },
        "source_file": "sample.rep",
        "line_number": 42
    }
}

# Validate — raises ValidationError if invalid
feature = PolyAnnotation(**data)
print(f"Kind: {feature.properties.kind}")       # POLY
print(f"Vertices: {feature.properties.vertex_count}")  # 4
print(f"Label: {feature.properties.label}")      # Patrol Zone Alpha
```

## TypeScript — Type Checking

```typescript
import { FeatureKindEnum } from '@debrief/schemas';

// POLY is now a valid enum value
const kind: FeatureKindEnum = FeatureKindEnum.POLY;

// Type-safe feature construction
const polyFeature = {
  type: 'Feature' as const,
  id: 'poly-001',
  geometry: {
    type: 'Polygon' as const,
    coordinates: [[[-5, 50], [-4, 50], [-4, 51], [-5, 51], [-5, 50]]]
  },
  properties: {
    kind: FeatureKindEnum.POLY,
    vertex_count: 4,
    label: 'Patrol Zone',
    style: { /* PolygonProperties */ }
  }
};
```

## Confirming LINE supports polylines

```python
from debrief_schemas import LineAnnotation

# Multi-vertex LINE (polyline with 5 points) — validates successfully
polyline_data = {
    "type": "Feature",
    "id": "line-polyline-001",
    "geometry": {
        "type": "LineString",
        "coordinates": [[-5, 50], [-4.5, 50.3], [-4, 50.1], [-3.5, 50.5], [-3, 50.2]]
    },
    "properties": {
        "kind": "LINE",
        "label": "Multi-vertex route",
        "style": {
            "stroke": True, "color": "#FF00FF", "weight": 2,
            "opacity": 1.0, "line_cap": "round", "line_join": "round"
        }
    }
}

line = LineAnnotation(**polyline_data)
print(f"Kind: {line.properties.kind}")  # LINE
# No POLYLINE kind needed — LINE handles multi-vertex LineStrings
```
