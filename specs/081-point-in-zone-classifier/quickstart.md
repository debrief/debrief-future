# Quickstart: Point-in-Zone Classifier

## What It Does

Classifies reference points by which detection zone they fall within, updating each point's metadata with the zone name and color. Points outside all zones get `zone: "none"` and `color: "#666666"`.

## Prerequisites

1. Reference points generated via generate-reference-points (#078)
2. Detection zones generated via buffer-zone-generator (#080)

## Usage

### Python (debrief-calc MCP)

```python
from debrief_calc.models import ContextType, SelectionContext
from debrief_calc.tools.reference.classification import point_in_zone_classifier

# ref_feature: MultiPoint feature from generate-reference-points
# zone_feature: MultiPolygon feature from buffer-zone-generator

context = SelectionContext(
    type=ContextType.MULTI,
    features=[ref_feature, zone_feature],
)

result = point_in_zone_classifier(context, {})
# result: [classified MultiPoint feature with updated pointMetadata and pointColors]

classified = result[0]
print(classified["properties"]["pointMetadata"][0])
# {"index": 0, "name": "Ref 1", "zone": "75%", "color": "#9C27B0"}

print(classified["properties"]["pointColors"])
# ["#9C27B0", "#9C27B0", "#F44336", "#FF9800", "#666666", "#666666"]
```

### TypeScript (web-shell / VS Code)

```typescript
import { execute, toolDefinition } from './tools/reference/classification/pointInZoneClassifier';

const features = [refFeature, zoneFeature];
const result = execute(features, {});
// result: [classified MultiPoint feature]

const classified = result[0];
console.log(classified.properties.pointMetadata[0]);
// { index: 0, name: "Ref 1", zone: "75%", color: "#9C27B0" }

console.log(classified.properties.pointColors);
// ["#9C27B0", "#9C27B0", "#F44336", "#FF9800", "#666666", "#666666"]
```

## How Classification Works

1. For each coordinate in the MultiPoint geometry:
   - Test against zone polygons in order (innermost first → outermost)
   - First zone that contains the point wins (innermost = highest likelihood)
   - If no zone contains the point → "none"
2. Update the `pointMetadata` entry for that coordinate with `zone` and `color`
3. Build a `pointColors` array for the renderer

## Testing

```bash
# Run golden example validation
cd services/calc
uv run pytest tests/tools/reference/test_classification.py -v

# Run TypeScript tests
cd apps/web-shell
pnpm test -- --grep "point-in-zone"
```

## File Locations

| Artifact | Path |
|----------|------|
| Tool spec | `shared/tools/reference/classification/point-in-zone-classifier.1.0.md` |
| Python impl | `services/calc/debrief_calc/tools/reference/classification.py` |
| Python tests | `services/calc/tests/tools/reference/test_classification.py` |
| TS impl | `apps/web-shell/src/tools/reference/classification/pointInZoneClassifier.ts` |
| TS tests | `apps/web-shell/src/tools/reference/classification/pointInZoneClassifier.test.ts` |
| VS Code impl | `apps/vscode/src/tools/reference/classification/pointInZoneClassifier.ts` |
| Golden examples | `shared/tools/reference/classification/point-in-zone-classifier.*.json` |
