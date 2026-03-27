# Usage Example: Before/After Typed Patterns

## Python — Tool Function Signatures

### Before (dict[str, Any])

```python
# services/calc/debrief_calc/tools/track_stats.py
def execute(features: list[dict[str, Any]], ...) -> list[dict[str, Any]]:
    track = features[0]
    props = track.get("properties", {})
    name = props.get("platform_name", "Unknown")
    positions = props.get("positions", [])
    coords = track.get("geometry", {}).get("coordinates", [])
```

### After (Pydantic models)

```python
# services/calc/debrief_calc/tools/track_stats.py
from debrief_schemas import TrackFeature

def execute(features: list[dict[str, Any]], ...) -> list[dict[str, Any]]:
    track: TrackFeature = features[0]  # Type annotation for IDE/checker
    name = track["properties"]["platform_name"]
    positions = track["properties"]["positions"]
    coords = track["geometry"]["coordinates"]
```

## Python — Feature Type Alias

### Before

```python
# services/io/src/debrief_io/types.py
Feature = dict[str, Any]  # No type safety at all
```

### After

```python
# services/io/src/debrief_io/types.py
from debrief_schemas.unions import DebriefFeature
Feature = DebriefFeature  # Union of all 12 feature types
```

## Python — Provenance Models

### Before

```python
# services/calc/debrief_calc/models.py
class ParameterValue(BaseModel):
    value: Any  # No type safety
    default: bool = False
    tunable: bool = True

class LogEntry(BaseModel):
    activity_id: str = Field(..., alias="activityId")
    # ... 80 lines of hand-written Pydantic model
```

### After

```python
# services/calc/debrief_calc/models.py
from debrief_schemas import ParameterValue, LogEntry  # Generated from LinkML
# Zero hand-written lines — single source of truth
```

## TypeScript — Feature Property Access

### Before (propsRecord escape hatch)

```typescript
// apps/vscode/src/tools/setTrackColor.ts
import { propsRecord } from '../utils/featureProps';

function setTrackColor(feature: DebriefFeature) {
  const props = propsRecord(feature); // Cast to Record<string, unknown>
  const style = props.style as TrackStyle; // Another cast
  const name = props.platform_name as string; // And another
}
```

### After (type-narrowed access)

```typescript
// apps/vscode/src/tools/track/styling/setTrackColor.ts
import { isTrackFeature } from '@debrief/schemas';

function setTrackColor(feature: DebriefFeature) {
  if (!isTrackFeature(feature)) return;
  // TypeScript knows feature is TrackFeature — full autocomplete
  const style = feature.properties.style;
  const name = feature.properties.platform_name;
}
```

## TypeScript — Duplicate Elimination

### Before

```typescript
// apps/vscode/src/types/plot.ts — 200+ lines of hand-written types
export interface TrackFeature { ... }
export interface LocationFeature { ... }
export interface PositionStyle { ... }
export interface TimestampedPosition { ... }

// shared/utils/src/types.ts — duplicate definitions
export interface PositionStyle { ... }
export interface PositionStyleOverride { ... }

// shared/components/src/LogPanel/types.ts — more duplicates
export interface ParameterValue { ... }
export interface InputFeatureState { ... }
```

### After

```typescript
// All imports from single source of truth
import { TrackFeature, PositionStyle, TimestampedPosition } from '@debrief/schemas';
import { ParameterValue, InputFeatureState } from '@debrief/schemas';
// Zero hand-written duplicates
```

## TypeScript — Session-State Types

### Before

```typescript
// services/session-state/src/types/temporal.ts — hand-written
export interface TimeInstant { epoch: number; iso: string; }
export interface TemporalSlice { ... }
```

### After

```typescript
// services/session-state/src/types/temporal.ts
import type { TimeInstant, TemporalSlice } from '@debrief/schemas';
export type { TimeInstant, TemporalSlice }; // Re-export from schema
```
