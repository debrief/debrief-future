# Data Model: Schema-Validated GeoJSON Across All Services

**Feature**: 115-schema-validated-tool-io
**Date**: 2026-02-28

## Entity Overview

```
┌─────────────────────┐
│   FeatureKindEnum   │  Discriminator: 12 values
└────────┬────────────┘
         │ dispatches to
         ▼
┌─────────────────────┐     ┌──────────────────┐
│  FEATURE_MODEL_MAP  │────▶│  Feature Models   │  12 Pydantic classes
│  (kind → class)     │     │  (TrackFeature,   │
└─────────────────────┘     │   ReferenceLocation, │
                            │   CircleAnnotation,  │
                            │   ...)               │
                            └──────────┬───────────┘
                                       │ properties contain
                                       ▼
                            ┌──────────────────┐
                            │ Properties class  │  Per-kind: TrackProperties,
                            │ (kind: Literal,   │  ReferenceLocationProperties, ...
                            │  provenance: [...],│
                            │  domain fields)   │
                            └──────────┬───────────┘
                                       │ provenance entries
                                       ▼
                            ┌──────────────────┐
                            │    LogEntry       │  PROV-aligned provenance
                            │ (activity_id,    │  (already in schema)
                            │  timestamp,       │
                            │  was_generated_by)│
                            └──────────────────┘
```

## Entities

### Feature Models (existing, 12 classes)

Each feature model represents a GeoJSON Feature with typed properties. The `kind` literal in properties serves as the discriminator.

| Kind | Model Class | Properties Class | Geometry |
|------|-------------|------------------|----------|
| TRACK | TrackFeature | TrackProperties | LineString / MultiLineString |
| POINT | ReferenceLocation | ReferenceLocationProperties | Point / MultiPoint |
| NARRATIVE | NarrativeEntry | NarrativeEntryProperties | EmptyPoint |
| CIRCLE | CircleAnnotation | CircleAnnotationProperties | Polygon |
| RECTANGLE | RectangleAnnotation | RectangleAnnotationProperties | Polygon |
| LINE | LineAnnotation | LineAnnotationProperties | LineString |
| TEXT | TextAnnotation | TextAnnotationProperties | Point |
| VECTOR | VectorAnnotation | VectorAnnotationProperties | LineString |
| POLY | PolyAnnotation | PolyAnnotationProperties | Polygon |
| MULTI_POINT | MultiPointFeature | MultiPointFeatureProperties | MultiPoint |
| MULTI_POLYGON | MultiPolygonFeature | MultiPolygonFeatureProperties | MultiPolygon |
| SYSTEM | SystemState | SystemStateProperties | EmptyPoint |

### Schema Enums (existing, used for parameter validation)

| Enum | Values | Used By |
|------|--------|---------|
| MarkerSymbolEnum | circle, square, triangle, diamond, cross | apply-symbol-style |
| NamedColorEnum | red, green, blue, yellow, orange, purple, cyan, magenta, white, black, grey | set-track-color |
| DurationPresetEnum | PT1M, PT5M, PT15M, PT30M, PT1H, PT2H, PT6H, PT12H, PT24H | label-interval, symbol-interval |
| ReferencePointPatternEnum | grid, scatter | generate-reference-points |
| PointShapeEnum | circle, square, triangle, diamond, cross | (styling) |

### LogEntry (existing, standalone)

Already defined in schema. Fields: `activity_id`, `timestamp`, `was_generated_by`, `used`, `generated`, `execution_duration`, `generated_result_id`, `tune`.

### ValidationError (new)

A structured error returned when schema validation fails at any service boundary.

| Field | Type | Description |
|-------|------|-------------|
| boundary | string | Where validation failed: "parser_output", "tool_input", "tool_output", "catalog_write", "catalog_read" |
| feature_id | string | ID of the feature that failed validation |
| feature_kind | string | The `kind` value of the feature |
| field_path | string | Dot-delimited path to the invalid field (e.g., "properties.positions.0.time") |
| expected | string | What was expected (type, value set, etc.) |
| actual | string | What was actually found |
| message | string | Human-readable error description |

### FEATURE_MODEL_MAP (new)

A dictionary mapping `FeatureKindEnum` string values to their corresponding Pydantic model classes. Lives in `debrief_schemas` package.

## Schema Changes Required (Prerequisites)

### Addition: `provenance` field on all feature properties classes

All 12 feature properties classes need:
```
provenance: Optional[list[LogEntry]] = []
```

This reflects the actual runtime data — every feature that passes through the tool executor has a provenance array attached.

### Addition: `__datasets` field on range-bearing result properties

The `range-bearing` tool outputs features with `__datasets` containing time-series data. This needs to be a declared field, not an extra property. May require a new properties class or extension of an existing one.

### Fix: TypeScript geometry coordinate types

The LinkML → TypeScript generator produces `number[]` for geometry coordinates where the actual runtime type is nested arrays (e.g., `number[][]` for MultiPoint, `number[][][][]` for MultiPolygon). The generator post-processing should fix this.

## State Transitions

Features pass through validation at multiple boundaries:

```
[File on disk]
     │
     ▼
[IO Parser] ──validate──▶ [GeoJSON Feature]
     │                          │
     ▼                          ▼
[STAC Catalog] ◀──validate──── [Store]
     │
     ▼
[Retrieve] ──validate──▶ [GeoJSON Feature]
     │
     ▼
[Tool Input] ──validate──▶ [Handler]
     │
     ▼
[Tool Output] ──validate──▶ [GeoJSON Feature + Provenance]
```

All transitions are pass/fail — either the feature validates and proceeds, or validation fails and the operation is rejected with a structured error.
