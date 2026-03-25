# Data Model: Cradle-to-Grave Typing

**Feature:** 173-cradle-to-grave-typing
**Date:** 2026-03-24

This feature does not introduce new data structures. It enforces the existing LinkML-generated types throughout the codebase where untyped `dict`/`Record` patterns currently exist.

---

## Canonical Type Locations

### Python (Pydantic models)

| Type | Package | Import Path | Used For |
|------|---------|-------------|----------|
| `TrackFeature` | `debrief-schemas` | `from debrief_schemas import TrackFeature` | Track features with LineString geometry |
| `ReferenceLocation` | `debrief-schemas` | `from debrief_schemas import ReferenceLocation` | Point features (reference locations) |
| `NarrativeEntry` | `debrief-schemas` | `from debrief_schemas import NarrativeEntry` | Timestamped narrative log entries |
| `CircleAnnotation` | `debrief-schemas` | `from debrief_schemas import CircleAnnotation` | Circle annotation shapes |
| `RectangleAnnotation` | `debrief-schemas` | `from debrief_schemas import RectangleAnnotation` | Rectangle annotation shapes |
| `LineAnnotation` | `debrief-schemas` | `from debrief_schemas import LineAnnotation` | Line annotation shapes |
| `TextAnnotation` | `debrief-schemas` | `from debrief_schemas import TextAnnotation` | Text annotation shapes |
| `VectorAnnotation` | `debrief-schemas` | `from debrief_schemas import VectorAnnotation` | Vector annotation shapes |
| `PolyAnnotation` | `debrief-schemas` | `from debrief_schemas import PolyAnnotation` | Polygon annotation shapes |
| `MultiPointFeature` | `debrief-schemas` | `from debrief_schemas import MultiPointFeature` | Multi-point tool results |
| `MultiPolygonFeature` | `debrief-schemas` | `from debrief_schemas import MultiPolygonFeature` | Multi-polygon tool results |
| `SystemState` | `debrief-schemas` | `from debrief_schemas import SystemState` | Plot-level system records |
| `LogEntry` | `debrief-schemas` | `from debrief_schemas import LogEntry` | PROV-aligned provenance |
| `WasGeneratedBy` | `debrief-schemas` | `from debrief_schemas import WasGeneratedBy` | Provenance activity record |
| `ParameterValue` | `debrief-schemas` | `from debrief_schemas import ParameterValue` | Tool parameter values |
| `InputFeatureState` | `debrief-schemas` | `from debrief_schemas import InputFeatureState` | Pre-operation feature snapshots |
| `validate_feature()` | `debrief-schemas` | `from debrief_schemas.validation import validate_feature` | Runtime validation dispatch |
| `FEATURE_MODEL_MAP` | `debrief-schemas` | `from debrief_schemas.validation import FEATURE_MODEL_MAP` | Kind → Model lookup |

### Python Union Type (to be added)

```python
# In debrief_schemas or debrief_schemas.validation
DebriefFeature = Union[
    TrackFeature, ReferenceLocation, NarrativeEntry,
    CircleAnnotation, RectangleAnnotation, LineAnnotation,
    TextAnnotation, VectorAnnotation, PolyAnnotation,
    MultiPointFeature, MultiPolygonFeature, SystemState,
]
```

This union does not exist today in Python. It needs to be added to `debrief_schemas` (or `debrief_schemas.validation`) so tool functions can declare `list[DebriefFeature]` instead of `list[dict[str, Any]]`.

### TypeScript (Generated interfaces)

| Type | Package | Import Path | Used For |
|------|---------|-------------|----------|
| `TrackFeature` | `@debrief/schemas` | `import { TrackFeature } from '@debrief/schemas'` | Track features |
| `ReferenceLocation` | `@debrief/schemas` | `import { ReferenceLocation } from '@debrief/schemas'` | Reference locations |
| `DebriefFeature` | `@debrief/schemas` | `import { DebriefFeature } from '@debrief/schemas'` | Union of all feature types |
| `isTrackFeature()` | `@debrief/schemas` | `import { isTrackFeature } from '@debrief/schemas'` | Type guard for narrowing |
| `isReferenceLocation()` | `@debrief/schemas` | `import { isReferenceLocation } from '@debrief/schemas'` | Type guard for narrowing |
| `isMultiPointFeature()` | `@debrief/schemas` | `import { isMultiPointFeature } from '@debrief/schemas'` | Type guard for narrowing |
| `isMultiPolygonFeature()` | `@debrief/schemas` | `import { isMultiPolygonFeature } from '@debrief/schemas'` | Type guard for narrowing |
| `isAnnotationFeature()` | `@debrief/schemas` | `import { isAnnotationFeature } from '@debrief/schemas'` | Type guard for narrowing |

### Types Pending TS Generation (Phase 0-1)

These exist in LinkML but are not generated to TypeScript yet. Requires adding imports to `debrief.yaml`:

| LinkML Module | Types | Consumer |
|---------------|-------|----------|
| `session-state.yaml` | `SessionState`, `TemporalSlice`, `SpatialSlice`, `FeaturesSlice`, `DocumentSlice`, `TimeInstant`, `TimeRange`, `TimeFilter` | `@debrief/session-state` |
| `tool-result.yaml` | `ToolResultAnnotations`, `DatasetEntry`, `DatasetMetadata`, `DatasetSeries` | `ChartRenderer`, tool UI |
| `log-entry.yaml` | `LogEntry`, `ParameterValue`, `InputFeatureState` | `LogPanel`, `toolService` |

---

## Prohibited Patterns (After Migration)

### Python — Prohibited

```python
# PROHIBITED: Untyped domain data
feature: dict[str, Any] = ...
features: list[dict[str, Any]] = ...
props = feature.get("properties", {})
kind = props.get("kind")

# REQUIRED: Typed domain data
feature: TrackFeature = ...
features: list[DebriefFeature] = ...
props = feature.properties
kind = feature.properties.kind
```

### TypeScript — Prohibited

```typescript
// PROHIBITED: Untyped domain data
const props = feature.properties as Record<string, unknown>;
const name = propsRecord(feature).platform_name;
const f = obj as unknown as DebriefFeature;

// REQUIRED: Type-narrowed access
if (isTrackFeature(feature)) {
  const name = feature.properties.platform_name;  // TS knows this exists
}
```

---

## Validation Flow

### Python: Dict → Pydantic Model

```
JSON.parse / file read
    → dict[str, Any]                    (untyped)
    → validate_feature(dict)            (FEATURE_MODEL_MAP dispatch)
    → TrackFeature / ReferenceLocation  (typed Pydantic model)
    → tool function receives model
    → tool function returns model
    → .model_dump() for JSON response
```

### TypeScript: JSON.parse → DebriefFeature

```
JSON.parse(content)
    → SafeFeatureCollection             (loose type, unknown geometry)
    → isTrackFeature(f) guard           (discriminated union narrowing)
    → TrackFeature                      (fully typed)
    → component/tool receives typed feature
```
