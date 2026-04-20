# Data Model: Boundary GeoJSON feature (LinkML)

**Feature**: 212-linkml-feature-types
**Date**: 2026-04-20
**Source-of-truth location**: `shared/schemas/src/linkml/geojson.yaml` (after relocation from `session-state.yaml`)
**Generated artefacts**: `shared/schemas/src/generated/{typescript/types.ts, python/debrief_schemas/*.py, json-schema/*.json}`

This document describes the **schema entities** added / widened by this feature. It is language-neutral: the LinkML source is the contract, the generated code is derived. Do not hand-edit generated files.

---

## Entity: `GeoJSONFeature` *(widened; existing name reused)*

**Role**: Loose GeoJSON Feature used at parse / MCP / file-read boundaries, before the caller has discriminated to a specific `DebriefFeature` subtype. The single schema-rooted replacement for the three hand-written interfaces deleted by this feature (`SafeFeature`, `shared/utils/src/types.ts#GeoJSONFeature`, `services/session-state/src/types/results.ts#GeoJSONFeature`).

**Attributes**:

| Name | Type | Required | Notes |
|------|------|----------|-------|
| `type` | string literal `"Feature"` | ✅ required | Discriminator; enforced via LinkML `equals_string: "Feature"`. |
| `id` | `string \| integer` (union) | optional | Modelled via LinkML `any_of` on `[string, integer]`. Generator maps to TS `string \| number` and Pydantic `str \| int`. Silently stringifying is forbidden (spec edge case). |
| `geometry` | `GeoJSONBoundaryGeometry` | optional (nullable) | `required: false` generates `geometry?: GeoJSONBoundaryGeometry` in TS; every existing `!feature.geometry` / `== null` check continues to accept both `undefined` and `null`. |
| `properties` | `Any` (open-ended) | optional (nullable) | LinkML `range: Any` — the documented Article II exception for external-contract open-ended fields. Generated TS: `properties?: unknown`. |

**Validation rules**:
- `type` must equal the literal string `"Feature"`; any other value is invalid (golden-fixture `invalid/wrong-type.json`).
- `type` must be present; absence is invalid (golden-fixture `invalid/missing-type.json`).
- No other fields are required. A minimal valid instance is `{"type": "Feature"}`.
- `id`, `geometry`, `properties` may be present-and-null, absent, or present-and-populated. All three states are valid.

**State transitions**: None — this is a value type, not a stateful entity. Its only "transition" is **boundary-crossing**: from the pre-discrimination state (instance of `GeoJSONFeature`) to the post-discrimination state (instance of a `DebriefFeature` variant), via the type-guard functions in `@debrief/schemas#unions` (out of scope — those already exist).

**Relationship to `DebriefFeature` (out of scope)**:
- Every valid `DebriefFeature` instance is also a valid `GeoJSONFeature` instance (structurally). Consumers should narrow `GeoJSONFeature` → `DebriefFeature` variant *once*, at the boundary, via the existing `isTrackFeature` / `isReferenceLocation` / `isMultiPointFeature` / `isMultiPolygonFeature` / `isAnnotationFeature` guards.
- The reverse direction (treating a `DebriefFeature` as a `GeoJSONFeature`) requires no conversion — it is safe by structural subtyping.

**Documentation comment** (FR-008 / SC-009):

> "Loose GeoJSON Feature for parse-boundary use. Use this only at parse boundaries (JSON.parse, MCP results, file reads). Code past the parse boundary should narrow to `DebriefFeature` (or a specific subtype) via the existing type guards in `@debrief/schemas#unions`."

The documentation comment is sourced from the LinkML `description` field and rendered by `gen-typescript` as a JSDoc block on the generated interface.

---

## Entity: `GeoJSONBoundaryGeometry` *(new)*

**Role**: Loose GeoJSON geometry used at the same parse boundaries as `GeoJSONFeature`. Replaces the hand-written `SafeGeometry` interface.

**Attributes**:

| Name | Type | Required | Notes |
|------|------|----------|-------|
| `type` | string (not enum-restricted) | ✅ required | Just a string — not an enum. Boundary geometry has not yet been narrowed to a specific geometry type; the caller validates `type` downstream. Typed geometry classes (`GeoJSONPoint`, `GeoJSONLineString`, etc.) already exist in `geojson.yaml` for post-narrowing use. |
| `coordinates` | `Any` | optional | Untyped at this boundary; consumers that need typed coordinates narrow via `shared/utils/src/bounds.ts#coerceCoordinates` (or equivalent). |

**Validation rules**:
- `type` is required; absence is invalid.
- `coordinates` may be absent (for geometries that don't carry coordinates directly — e.g. a `GeometryCollection` carries `geometries: [...]` instead). This is a real edge case in the GeoJSON spec; not accepting it would make the boundary type stricter than GeoJSON itself.
- No value validation on `coordinates` at the schema level. The existing narrowing gate in `@debrief/utils` performs that validation post-boundary.

**Relationship to existing typed geometries** (`GeoJSONPoint`, `GeoJSONLineString`, `GeoJSONPolygon`, `GeoJSONMultiPoint`, `GeoJSONMultiLineString`, `GeoJSONMultiPolygon`): these remain the **post-narrowing** canonical types. The boundary geometry is strictly looser; assignment is one-way (post-narrow value is assignable to the boundary type, not the reverse without a cast).

---

## Entity: `GeoJSONFeatureCollection` *(new)*

**Role**: GeoJSON FeatureCollection containing boundary-shape features. Replaces the hand-written `SafeFeatureCollection` and `GeoJSONFeatureCollection` interfaces.

**Attributes**:

| Name | Type | Required | Notes |
|------|------|----------|-------|
| `type` | string literal `"FeatureCollection"` | ✅ required | Discriminator; enforced via LinkML `equals_string: "FeatureCollection"`. |
| `features` | multivalued `GeoJSONFeature` | ✅ required | Array. Empty array is valid. Each element is a boundary-shape feature (may carry a null geometry). |

**Validation rules**:
- `type` must equal the literal string `"FeatureCollection"`.
- `features` must be present; may be empty.
- No ordering constraint on `features`.

---

## Removal list (hand-written types deleted by this feature)

The following entities are **removed** from the codebase. They have no post-migration replacement by the same name — consumers re-target to the three entities above.

| Removed from | Removed symbol | Replaced by |
|--------------|----------------|-------------|
| `shared/utils/src/types.ts` | `interface GeoJSONFeature` | `@debrief/schemas#GeoJSONFeature` (widened) |
| `shared/utils/src/types.ts` | `interface GeoJSONFeatureCollection` | `@debrief/schemas#GeoJSONFeatureCollection` (new) |
| `shared/utils/src/types.ts` | `interface SafeGeometry` | `@debrief/schemas#GeoJSONBoundaryGeometry` (new) |
| `shared/utils/src/types.ts` | `interface SafeFeature` | `@debrief/schemas#GeoJSONFeature` (widened) |
| `shared/utils/src/types.ts` | `interface SafeFeatureCollection` | `@debrief/schemas#GeoJSONFeatureCollection` (new) |
| `services/session-state/src/types/results.ts` | `interface GeoJSONFeature` | `@debrief/schemas#GeoJSONFeature` (widened) |

Six hand-written symbols collapse into three generated entities.

---

## Consumer-side import migration

Every in-tree TypeScript consumer that currently imports any of the six removed symbols must re-target to `@debrief/schemas`:

**Before**:
```typescript
import type { SafeFeature, SafeFeatureCollection, SafeGeometry } from '@debrief/utils';
import type { GeoJSONFeature } from '@debrief/utils';
```

**After**:
```typescript
import type {
  GeoJSONFeature,
  GeoJSONFeatureCollection,
  GeoJSONBoundaryGeometry,
} from '@debrief/schemas';
```

The consumer code itself (function bodies, type annotations at call sites) does not change. The only diff is the import path.

---

## Schema-adherence test fixtures (to be added)

| Fixture path | Contents | Purpose |
|--------------|----------|---------|
| `shared/schemas/fixtures/geojson-feature/valid/minimal.json` | `{"type": "Feature"}` | Minimal valid instance — all optional fields omitted. |
| `shared/schemas/fixtures/geojson-feature/valid/with-nullable-geometry.json` | `{"type": "Feature", "geometry": null, "properties": null}` | Explicit null geometry + null properties. |
| `shared/schemas/fixtures/geojson-feature/valid/with-numeric-id.json` | `{"type": "Feature", "id": 42, "geometry": {"type": "Point", "coordinates": [0, 0]}, "properties": {}}` | Numeric id + typed geometry payload. |
| `shared/schemas/fixtures/geojson-feature/valid/with-string-id.json` | `{"type": "Feature", "id": "track-001", "geometry": {"type": "LineString", "coordinates": [[0,0],[1,1]]}, "properties": null}` | String id + LineString payload. |
| `shared/schemas/fixtures/geojson-feature/invalid/wrong-type.json` | `{"type": "NotAFeature"}` | `equals_string` constraint violation. |
| `shared/schemas/fixtures/geojson-feature/invalid/missing-type.json` | `{"geometry": null, "properties": null}` | Required-field violation. |

Four valid + two invalid fixtures cover every branch of the validation rules above. The `test_roundtrip.py` and `test_adherence.py` test files extend to cover these fixtures; no new test file is required.

---

## Python-side impact

The new classes are regenerated into `shared/schemas/src/generated/python/debrief_schemas/geojson.py` (or whichever module the generator targets). Python services that currently use `TypeAlias = dict[str, Any]` (in `services/calc` and `services/stac`) are NOT migrated by this feature — they remain as they are today. Future migration of Python services to the generated Pydantic model is tracked as a follow-up (out of scope, see spec's "Out of Scope" section).

The Pydantic model output is expected to be:

```python
class GeoJSONBoundaryGeometry(BaseModel):
    type: str
    coordinates: Any | None = None

class GeoJSONFeature(BaseModel):
    type: Literal["Feature"]
    id: str | int | None = None
    geometry: GeoJSONBoundaryGeometry | None = None
    properties: Any | None = None

class GeoJSONFeatureCollection(BaseModel):
    type: Literal["FeatureCollection"]
    features: list[GeoJSONFeature]
```

(Exact output depends on `gen-pydantic`'s emit settings; the shape above is what the existing generator produces for equivalent LinkML patterns elsewhere in the repo.)

---

## Ref: the existing `GeoJSONFeature` LinkML class (to be widened)

For reference, the pre-change class in `session-state.yaml:270` is:

```yaml
GeoJSONFeature:
  description: >
    GeoJSON Feature representation used for tool result layers.
    Feature 109-unify-result-layer-lifecycle.
  attributes:
    type:
      range: string
      required: true
    id:
      range: string         # string-only
      required: false
    geometry:
      range: GeoJSONGeometry # required, stricter sub-class
      required: true         # cannot be null
```

The post-change class replaces that shape per Entity: `GeoJSONFeature` above. The three attributes that change: `id` becomes `string | integer`; `geometry` becomes `GeoJSONBoundaryGeometry` (looser) and `required: false`; `properties` is added. The class also relocates from `session-state.yaml` to `geojson.yaml`.
