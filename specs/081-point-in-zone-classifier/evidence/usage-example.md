# Usage Example: Point-in-Zone Classifier

## Python

```python
from debrief_calc.models import ContextType, SelectionContext
from debrief_calc.tools.reference.classification import point_in_zone_classifier

# ref_feature from generate-reference-points (#078)
# zone_feature from buffer-zone-generator (#080)

context = SelectionContext(
    type=ContextType.MULTI,
    features=[ref_feature, zone_feature],
)

result = point_in_zone_classifier(context, {})
classified = result[0]

# Per-point classification
for md in classified["properties"]["pointMetadata"]:
    print(f"{md['name']}: zone={md['zone']}, color={md['color']}")
# Output:
#   Ref 1: zone=75%, color=#9C27B0
#   Ref 2: zone=75%, color=#9C27B0
#   Ref 3: zone=75%, color=#9C27B0
#   Ref 4: zone=50%, color=#F44336
#   Ref 5: zone=none, color=#666666
#   Ref 6: zone=none, color=#666666

# Per-point colors for renderer
print(classified["properties"]["pointColors"])
# ["#9C27B0", "#9C27B0", "#9C27B0", "#F44336", "#666666", "#666666"]
```

## TypeScript

```typescript
import { execute } from './tools/reference/classification/pointInZoneClassifier';

const result = execute([refFeature, zoneFeature], {});
const classified = result[0];

// Per-point classification
for (const md of classified.properties.pointMetadata) {
    console.log(`${md.name}: zone=${md.zone}, color=${md.color}`);
}

// Per-point colors for renderer
console.log(classified.properties.pointColors);
```

## E03 Pipeline Integration

The classifier fits into the E03 buffer zone analysis chain:

```
Step 1: generate-reference-points  → MultiPoint (POINT/REFERENCE)
Step 2: (move track)               → Track feature updated
Step 3: buffer-zone-generator      → MultiPolygon (ZONE)
Step 4: point-in-zone-classifier   → MultiPoint (classified, with pointColors)
Step 5: zone-histogram-generator   → Histogram (counts per zone)
```

When the track moves (step 2), the PROV cascade reruns steps 3-5 automatically.
