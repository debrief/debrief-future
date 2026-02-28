# Research: Schema-Validated GeoJSON Across All Services

**Feature**: 115-schema-validated-tool-io
**Date**: 2026-02-28

## R1: Schema Model Configuration — `extra = "forbid"` vs Open Extension

### Context

The generated Pydantic models use `ConfiguredBaseModel` with `extra = "forbid"` (`shared/schemas/src/generated/python/debrief_schemas/__init__.py:41`). This rejects any fields not defined in the model.

However, tools currently attach undeclared properties to features:
- `provenance: list[LogEntry]` — appended to `properties` by `executor.py` after tool execution
- `__datasets: list[dict]` — written by `range-bearing` tool into feature properties
- `debrief:resultType` — added at the MCP layer in `result_builder.py` annotations (not in GeoJSON properties, so not affected)

`LogEntry` IS defined in the schema as a standalone class, but NO feature properties class (e.g., `TrackProperties`) declares a `provenance` field.

### Decision: Add missing fields to the schema; keep `extra = "forbid"`

### Rationale

The constitution mandates provenance on every transformation (Article III.1) and strict typing (Article XV). The schema should define what features actually contain. Adding `provenance: Optional[list[LogEntry]]` to all feature property classes makes the schema truthful rather than changing its strictness.

Keeping `extra = "forbid"` provides maximum safety — any undeclared field is immediately caught, preventing the drift that caused the `apply-symbol-style` bug.

### Prerequisites Required

Before validation can be enforced, the LinkML schema must be extended with:
1. `provenance: Optional[list[LogEntry]]` on all feature property classes (Track, Point, Narrative, all annotations, MultiPoint, MultiPolygon)
2. `__datasets` field on the range-bearing result properties (or a new `DatasetFeatureProperties` class)
3. Regenerate all derived schemas (Pydantic, JSON Schema, TypeScript)

### Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| Change to `extra = "allow"` | No schema changes needed | Loses strictness; contradicts Constitution XV |
| Strip extras before validation | Works with current schema | Hacky; provenance should be in the contract |
| Validate before provenance attachment only | Simple for tool outputs | Doesn't help with input validation or catalog |

## R2: Feature Dispatch Mechanism — Kind-to-Model Mapping

### Context

There is no discriminated union type for features in the schema. Each feature class (TrackFeature, ReferenceLocation, etc.) is independent, with a `Literal["KIND"]` on its properties class. No `validate_feature()` helper exists.

### Decision: Create a `FEATURE_MODEL_MAP` dispatch dictionary

A mapping from `FeatureKindEnum` value to the corresponding Pydantic model class:

```
FEATURE_MODEL_MAP = {
    "TRACK": TrackFeature,
    "POINT": ReferenceLocation,
    "NARRATIVE": NarrativeEntry,
    "CIRCLE": CircleAnnotation,
    "RECTANGLE": RectangleAnnotation,
    "LINE": LineAnnotation,
    "TEXT": TextAnnotation,
    "VECTOR": VectorAnnotation,
    "POLY": PolyAnnotation,
    "MULTI_POINT": MultiPointFeature,
    "MULTI_POLYGON": MultiPolygonFeature,
    "SYSTEM": SystemState,
}
```

This lives in the `debrief_schemas` package as a public API, not in individual services.

### Rationale

Centralising the dispatch in the schema package means all consumers (calc, io, stac) share the same mapping. Adding a new feature kind automatically surfaces in all validation points when the map is updated.

### Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| Pydantic discriminated union (`Annotated[Union[...], Field(discriminator="kind")]`) | Automatic dispatch; most Pydantic-idiomatic | `kind` is nested in `properties`, not top-level; Pydantic discriminator requires top-level field |
| Per-service dispatch functions | Services can customise | Duplicated logic; drift between services |
| Registry pattern with decorators | Extensible | Over-engineered for a fixed enum |

## R3: Validation Placement in the Executor Flow

### Context

The current executor flow (`executor.py`):
1. Get tool from registry
2. Validate context type and kinds
3. Execute handler → `list[dict[str, Any]]`
4. Create LogEntry provenance
5. Attach provenance to output features
6. Set output_kind on features
7. Call `validate_tool_output()` (GeoJSON structure + provenance check)
8. Return ToolResult

### Decision: Validate outputs between handler return and provenance attachment

Schema validation of tool outputs should happen at step 3.5 — after the handler returns but before provenance is attached. This validates the tool's actual output against the schema.

Input validation should happen at step 2.5 — validate each feature in `SelectionContext.features` against its `kind` schema before passing to the handler.

The existing `validate_tool_output()` (step 7) remains — it validates provenance completeness AFTER attachment.

### Rationale

- Validating outputs before provenance avoids the need for `provenance` to be in the schema during the transition period (though it should be added as R1 states)
- Validating inputs before handler execution gives tools clean, schema-compliant data
- Keeping the existing provenance check preserves the safety net for provenance completeness

### Flow After Change

1. Get tool from registry
2. Validate context type and kinds
3. **Validate input features against schema by kind** ← NEW
4. Execute handler → `list[dict[str, Any]]`
5. **Validate output features against schema by kind** ← NEW
6. Create LogEntry provenance
7. Attach provenance to output features
8. Set output_kind on features
9. Call `validate_tool_output()` (provenance completeness check)
10. Return ToolResult

## R4: Enum Replacement Strategy

### Context

Tools hardcode enum values:
- `apply-symbol-style`: `valid_symbols = {"circle", "square", "triangle", "diamond", "cross"}`
- `generate-reference-points`: `if pattern not in ("grid", "scatter")`
- `set-track-color`: `param_type="NamedColor"` declared but values not enforced

The schema defines matching enums: `MarkerSymbolEnum`, `ReferencePointPatternEnum`, `NamedColorEnum`, `DurationPresetEnum`.

### Decision: Import schema enums and use `ToolParameter.choices` generation from enum values

1. Replace hardcoded sets with: `{e.value for e in MarkerSymbolEnum}`
2. Generate `ToolParameter.choices` from enum values at registration time
3. Validate incoming parameter values against the enum at executor level (before handler)

### Rationale

Single source of truth — adding a value to the schema enum immediately propagates to all tools. No tool-level code changes needed for new enum values.

## R5: IO Service — Parser Validation Strategy

### Context

`debrief-io` declares `debrief-schemas` as a dependency but never imports from it. The `types.py` file defines `Feature = Any` with a comment: "Using Any to avoid circular imports." All 17+ annotation builders and the REP parser return `dict[str, Any]`.

### Decision: Add schema validation at the parser handler boundary

Each handler's `parse()` method returns a list of features. Validate each feature against the schema after construction, before returning from the handler. Use the same `FEATURE_MODEL_MAP` dispatch.

### Rationale

Validating at the handler boundary catches malformed features at birth. The `Feature = Any` alias should be replaced with a proper union type once the schema prerequisite (R1) is complete.

## R6: STAC Service — Type Alias Replacement

### Context

`debrief-stac` declares `debrief-schemas` as a dependency but never imports from it. `types.py` defines 5 type aliases that all resolve to `dict[str, Any]`: `STACCatalog`, `STACItem`, `STACAsset`, `GeoJSONFeature`, `GeoJSONFeatureCollection`.

### Decision: Replace GeoJSON type aliases with schema types; keep STAC-specific aliases as TypedDicts

- `GeoJSONFeature` → use the feature union type from `debrief_schemas`
- `GeoJSONFeatureCollection` → typed dict with `features: list[FeatureUnion]`
- `STACCatalog`, `STACItem`, `STACAsset` → convert to TypedDicts (STAC structures are not GeoJSON features, so they don't map to schema models)

### Rationale

GeoJSON types should come from the schema (single source of truth). STAC types are a separate standard — they should be typed but don't need schema validation (STAC structure is validated by STAC compliance, not Debrief schemas).

## R7: Frontend — TypeScript Type Migration

### Context

TypeScript frontend already imports from `@debrief/schemas` extensively (30+ import sites). Key gaps:
- `apps/vscode/src/services/stacService.ts`: Custom `SafeFeature` interface (lines 43-57)
- `shared/components/diff/src/diffFeatureCollections.ts`: Custom `GeoJSONFeature` interface
- `shared/components/src/FeatureList/flattenFeatures.ts`: `as unknown` casts for geometry coordinates
- `apps/web-shell/src/App.tsx`: `as any` casts

The TypeScript schema interfaces use `kind: string` (not Literal types), limiting compile-time narrowing.

### Decision: Replace workaround types with schema imports; fix coordinate type mismatch in schema generator

1. Replace `SafeFeature` → `TrackFeature | ReferenceLocation | ...` from `@debrief/schemas`
2. Replace diff module's `GeoJSONFeature` → use `DebriefFeature` from `shared/components/src/utils/types.ts` (which already defines the union)
3. Fix `flattenFeatures.ts` coordinate casts by correcting the LinkML → TypeScript generator for geometry coordinate types
4. Replace `as any` casts in web-shell with proper typed handlers

### Rationale

`shared/components/src/utils/types.ts` already defines `DebriefFeature` union and type guards (`isTrackFeature()`, etc.). Most of the infrastructure exists — the remaining workaround types are stragglers that predate the unified type system.

The coordinate type mismatch (`number[]` in schema vs `number[][]` at runtime for MultiPoint) indicates a generator bug that should be fixed at source rather than worked around with casts.

## R8: Phased Implementation Order

### Decision

| Phase | Scope | Rationale |
|-------|-------|-----------|
| 1 | Schema prerequisites (add `provenance`, `__datasets` fields; fix TS coordinate types) | Unblocks all downstream work |
| 2 | Core validation infrastructure (`FEATURE_MODEL_MAP`, `validate_feature()`, error types) | Shared by all services |
| 3 | Calc service migration (executor hooks, enum replacement, 11 tools) | Highest impact; ADR-008 primary target |
| 4 | IO service migration (parser output validation) | Second most impactful; features born here |
| 5 | STAC service migration (type aliases, storage validation) | Persistence boundary |
| 6 | Frontend migration (workaround type removal, cast elimination) | Compile-time safety |

### Rationale

Each phase is independently shippable and testable. Phase 1 is a prerequisite but small. Phase 2 creates shared infrastructure. Phases 3-6 are independent of each other and could be parallelised, but are ordered by impact.
