# Usage Example: MultiPoint and MultiPolygon Features

## Creating a MultiPoint Feature (Python)

```python
from debrief_schemas import MultiPointFeature, MultiPointFeatureProperties, PointProperties, GeoJSONMultiPoint

# Create a MultiPoint Feature representing intercept points from a tool result
feature = MultiPointFeature(
    type="Feature",
    id="mp-intercept-001",
    geometry=GeoJSONMultiPoint(
        type="MultiPoint",
        coordinates=[[-4.1234, 50.3456], [-4.2345, 50.4567], [-4.3456, 50.5678]],
    ),
    properties=MultiPointFeatureProperties(
        kind="MULTI_POINT",
        label="Intercept Points",
        style=PointProperties(
            shape="circle",
            radius=6,
            fill=True,
            fill_color="#FF0000",
            fill_opacity=0.8,
            stroke=True,
            color="#CC0000",
            weight=2,
            opacity=1.0,
        ),
        source_tool="intercept-finder",
        source_features=["track-alpha", "track-bravo"],
    ),
)

# Serialise to JSON
json_str = feature.model_dump_json(indent=2)
print(json_str)
```

## Creating a MultiPolygon Feature (Python)

```python
from debrief_schemas import MultiPolygonFeature, MultiPolygonFeatureProperties, PolygonProperties, GeoJSONMultiPolygon

# Create a MultiPolygon Feature representing coverage zones
feature = MultiPolygonFeature(
    type="Feature",
    id="mpoly-coverage-001",
    geometry=GeoJSONMultiPolygon(
        type="MultiPolygon",
        coordinates=[
            [[[-4.0, 50.0], [-4.0, 50.5], [-3.5, 50.5], [-3.5, 50.0], [-4.0, 50.0]]],
            [[[-3.0, 51.0], [-3.0, 51.5], [-2.5, 51.5], [-2.5, 51.0], [-3.0, 51.0]]],
        ],
    ),
    properties=MultiPolygonFeatureProperties(
        kind="MULTI_POLYGON",
        label="Coverage Zones",
        style=PolygonProperties(
            fill=True,
            fill_color="#0000FF",
            fill_opacity=0.3,
            stroke=True,
            color="#0000CC",
            weight=2,
            opacity=0.8,
        ),
        source_tool="coverage-analyser",
        source_features=["exercise-boundary-01"],
    ),
)
```

## Using in TypeScript

```typescript
import type {
  MultiPointFeature,
  MultiPolygonFeature,
  GeoJSONMultiPoint,
  GeoJSONMultiPolygon,
} from '@debrief/schemas';

const multiPointResult: MultiPointFeature = {
  type: 'Feature',
  id: 'mp-intercept-001',
  geometry: {
    type: 'MultiPoint',
    coordinates: [[-4.1234, 50.3456], [-4.2345, 50.4567]],
  } as GeoJSONMultiPoint,
  properties: {
    kind: 'MULTI_POINT',
    label: 'Intercept Points',
    style: {
      shape: 'circle',
      radius: 6,
      fill_color: '#FF0000',
      color: '#CC0000',
    },
  },
};
```

## JSON Structure (for STAC storage)

A valid MultiPoint Feature in a STAC catalog plot:

```json
{
  "type": "Feature",
  "id": "mp-rendezvous-002",
  "geometry": {
    "type": "MultiPoint",
    "coordinates": [
      [-3.5000, 51.0000],
      [-3.6000, 51.1000]
    ]
  },
  "properties": {
    "kind": "MULTI_POINT",
    "label": "Rendezvous Candidates",
    "style": {
      "shape": "triangle",
      "radius": 8,
      "fill": true,
      "fill_color": "#00FF00",
      "fill_opacity": 0.6,
      "stroke": true,
      "color": "#009900",
      "weight": 1,
      "opacity": 0.9
    },
    "source_tool": "rendezvous-planner",
    "source_features": ["track-alpha", "track-bravo"],
    "description": "Candidate rendezvous positions from two track projections"
  }
}
```
