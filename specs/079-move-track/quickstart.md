# Quickstart: Move Track Tool (#079)

## Python Usage

```python
from debrief_calc.executor import run
from debrief_calc.models import SelectionContext, ContextType

# Create context with a track feature
context = SelectionContext(
    type=ContextType.MULTI,
    features=[track_feature],  # GeoJSON Feature with kind="TRACK"
)

# Move track 5 nm due South
result = run("move-track", context, params={
    "direction": 180,
    "range_nm": 5,
})

assert result.success
moved_track = result.features[0]
```

## TypeScript Usage

```typescript
import { execute } from './tools/track/manipulation/moveTrack';

const movedFeatures = execute(
  [trackFeature],  // GeoJSON features with kind="TRACK"
  { direction: 180, rangeNm: 5 }
);
```

## Via MCP (tool invocation)

```json
{
  "name": "move-track",
  "arguments": {
    "direction": 180,
    "range_nm": 5
  }
}
```

## Key Points

- Distance is in nautical miles (1 nm = 1.852 km)
- Direction is compass bearing (0=North, 90=East, 180=South, 270=West)
- Only lon/lat coordinates change; altitude and timestamps are preserved
- Provenance is attached automatically by the executor
- Zero distance returns the track unchanged (no-op)
