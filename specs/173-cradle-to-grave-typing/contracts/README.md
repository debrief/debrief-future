# Import Contracts: Cradle-to-Grave Typing

**Feature:** 173-cradle-to-grave-typing

## Canonical Import Paths

### Python — Feature Models

```python
# CANONICAL: All feature types from debrief_schemas
from debrief_schemas import (
    TrackFeature,
    ReferenceLocation,
    NarrativeEntry,
    CircleAnnotation,
    RectangleAnnotation,
    LineAnnotation,
    TextAnnotation,
    VectorAnnotation,
    PolyAnnotation,
    MultiPointFeature,
    MultiPolygonFeature,
    SystemState,
)

# CANONICAL: Union type (to be added)
from debrief_schemas import DebriefFeature

# CANONICAL: Provenance models
from debrief_schemas import LogEntry, WasGeneratedBy, ParameterValue, InputFeatureState

# CANONICAL: Validation
from debrief_schemas.validation import validate_feature, FEATURE_MODEL_MAP
```

### Python — Prohibited Imports

```python
# PROHIBITED: Hand-written duplicates in calc/models.py
from debrief_calc.models import LogEntry          # DELETE — use debrief_schemas
from debrief_calc.models import ParameterValue    # DELETE — use debrief_schemas
from debrief_calc.models import WasGeneratedBy    # DELETE — use debrief_schemas

# PROHIBITED: Untyped alias in io/types.py
from debrief_io.types import Feature              # DELETE — use DebriefFeature union
```

### TypeScript — Feature Types

```typescript
// CANONICAL: All feature types from @debrief/schemas
import {
  TrackFeature,
  ReferenceLocation,
  DebriefFeature,
  isTrackFeature,
  isReferenceLocation,
  isMultiPointFeature,
  isMultiPolygonFeature,
  isAnnotationFeature,
} from '@debrief/schemas';

// CANONICAL: Provenance types
import { LogEntry, ParameterValue, InputFeatureState } from '@debrief/schemas';
```

### TypeScript — Prohibited Imports

```typescript
// PROHIBITED: Escape hatch (to be eliminated)
import { propsRecord } from '../utils/featureProps';

// PROHIBITED: Hand-written duplicates
import { TrackFeature } from '../types/plot';           // DELETE — use @debrief/schemas
import { PositionStyle } from '../../shared/utils';     // DELETE — use @debrief/schemas
import { LogEntry } from '../services/toolService';     // DELETE — use @debrief/schemas
```

### TypeScript — Boundary Types (Keep)

```typescript
// KEEP: SafeFeature is the pre-validation step at JSON.parse boundaries
import { SafeFeature, SafeFeatureCollection } from '@debrief/utils';

// KEEP: ResolvedPositionStyle is a rendering-specific derived type
import { ResolvedPositionStyle } from '@debrief/utils';

// KEEP: Track is a UI view-model projection
import { Track } from '../types/plot';
```

## Contract Rules

1. **Domain data** (features, provenance, tool results) MUST be imported from `debrief_schemas` / `@debrief/schemas`
2. **View-model types** (UI projections, rendering helpers) MAY be hand-written in the consuming package
3. **Boundary types** (`SafeFeature`, `SafeFeatureCollection`) are the only approved "untyped" step — they exist to accept `JSON.parse` output before validation
4. **No new `dict[str, Any]`** for domain data in Python — use Pydantic models
5. **No new `Record<string, unknown>`** for domain data in TypeScript — use discriminated union + type guards
6. **No new `as unknown as`** casts on domain data in TypeScript — narrow with type guards
