# Contract: Boundary GeoJSON feature schema

**Feature**: 212-linkml-feature-types
**Contract form**: LinkML class definitions — the schema source itself is the contract. Generated TypeScript / Pydantic / JSON Schema outputs are derived; consumer code depends on them but they are not hand-maintained.

This document captures the **declarative contract** — the exact LinkML YAML fragments to add, and the public TypeScript API surface the generator produces from them. Implementation phase copies this YAML into `shared/schemas/src/linkml/geojson.yaml` and runs `make -C shared/schemas generate`.

---

## LinkML source — new / widened classes

To be added to `shared/schemas/src/linkml/geojson.yaml`:

```yaml
  GeoJSONBoundaryGeometry:
    description: >-
      Loose GeoJSON geometry for parse-boundary use. type is a bare string
      (not enum-restricted) because the caller has not yet narrowed to a
      specific geometry type. coordinates is untyped (Any) because the
      caller has not yet validated the coordinate shape.

      Post-narrowing consumers should use the typed geometry classes
      (GeoJSONPoint, GeoJSONLineString, GeoJSONPolygon, GeoJSONMultiPoint,
      GeoJSONMultiLineString, GeoJSONMultiPolygon) defined above in this file.

      Feature 212-linkml-feature-types (subsumes #204).
    attributes:
      type:
        description: Geometry type name (Point, LineString, Polygon, etc.)
        range: string
        required: true
      coordinates:
        description: >-
          Coordinate payload, untyped at this boundary. Consumers that need
          typed coordinates should narrow through
          @debrief/utils/bounds.ts#coerceCoordinates or an equivalent gate.
        range: Any
        required: false

  GeoJSONFeature:
    description: >-
      Loose GeoJSON Feature for parse-boundary use. Use this only at parse
      boundaries (JSON.parse, MCP results, file reads). Code past the parse
      boundary should narrow to DebriefFeature (or a specific subtype) via
      the existing type guards in @debrief/schemas#unions.

      Feature 212-linkml-feature-types (subsumes #204).
    attributes:
      type:
        description: GeoJSON object type — always "Feature"
        range: string
        required: true
        equals_string: "Feature"
      id:
        description: >-
          Optional feature identifier. GeoJSON permits either string or
          integer; consumers should preserve the original type and not
          silently stringify.
        range: string
        required: false
        any_of:
          - range: string
          - range: integer
      geometry:
        description: >-
          GeoJSON geometry object, or absent for non-spatial features.
          Absence is valid because SafeFeature historically accepted null
          geometry at parse-time (e.g. MCP results without a spatial
          payload).
        range: GeoJSONBoundaryGeometry
        required: false
      properties:
        description: >-
          Open-ended properties object. Absence is valid because the GeoJSON
          specification permits properties: null.
        range: Any
        required: false

  GeoJSONFeatureCollection:
    description: >-
      GeoJSON FeatureCollection containing boundary-shape features.
      Replaces hand-written SafeFeatureCollection and GeoJSONFeatureCollection
      in shared/utils/src/types.ts.

      Feature 212-linkml-feature-types (subsumes #204).
    attributes:
      type:
        description: GeoJSON object type — always "FeatureCollection"
        range: string
        required: true
        equals_string: "FeatureCollection"
      features:
        description: Array of boundary-shape GeoJSON features
        range: GeoJSONFeature
        multivalued: true
        required: true
        inlined_as_list: true
```

---

## LinkML source — removal from `session-state.yaml`

The existing `GeoJSONFeature` class in `shared/schemas/src/linkml/session-state.yaml` (lines 270-286) is **deleted**. The `ResultsSlice.result_layers` reference at `session-state.yaml:315` continues to reference `GeoJSONFeature` — but now resolved via the import of `geojson.yaml` at the top of `session-state.yaml`. No edit to `ResultsSlice` is required.

Verify before deletion: `session-state.yaml` already has `imports: [...  geojson ...]` — if not, add it.

---

## Expected TypeScript output (derived, for reference)

`shared/schemas/src/generated/typescript/types.ts` (regenerated):

```typescript
/**
 * Loose GeoJSON geometry for parse-boundary use. type is a bare string
 * (not enum-restricted) because the caller has not yet narrowed to a
 * specific geometry type. coordinates is untyped (Any) because the caller
 * has not yet validated the coordinate shape.
 *
 * Post-narrowing consumers should use the typed geometry classes
 * (GeoJSONPoint, GeoJSONLineString, GeoJSONPolygon, GeoJSONMultiPoint,
 * GeoJSONMultiLineString, GeoJSONMultiPolygon).
 */
export interface GeoJSONBoundaryGeometry {
    type: string;
    coordinates?: unknown;
}

/**
 * Loose GeoJSON Feature for parse-boundary use. Use this only at parse
 * boundaries (JSON.parse, MCP results, file reads). Code past the parse
 * boundary should narrow to DebriefFeature (or a specific subtype) via
 * the existing type guards in @debrief/schemas#unions.
 */
export interface GeoJSONFeature {
    type: "Feature";
    id?: string | number;
    geometry?: GeoJSONBoundaryGeometry;
    properties?: unknown;
}

/**
 * GeoJSON FeatureCollection containing boundary-shape features. Replaces
 * hand-written SafeFeatureCollection and GeoJSONFeatureCollection.
 */
export interface GeoJSONFeatureCollection {
    type: "FeatureCollection";
    features: GeoJSONFeature[];
}
```

Notes:
- `type: "Feature"` is a literal-type because of `equals_string: "Feature"` (TypeScript generator treats `equals_string` as a literal narrow).
- `id?: string | number` — the `any_of` on `[string, integer]` union becomes `string | number` in TS (because LinkML `integer` maps to TS `number`).
- `geometry?: ...` (no `| null`) — `required: false` generates an optional field. Consumers that pass `{ geometry: null }` continue to work at runtime; at compile time, strict optional-property TS (`exactOptionalPropertyTypes: true`) would flag `null` assignment — in that case, the consumer either removes the `null` literal (use `undefined`) or drops the field entirely. This is a mechanical transform, not a logic change. See quickstart.md for the one-line codemod.
- `properties?: unknown` — LinkML `Any` maps to TS `unknown` (not `any`, per Article XV).

---

## Expected Pydantic output (derived, for reference)

`shared/schemas/src/generated/python/debrief_schemas/<geojson_module>.py` (regenerated):

```python
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict


class GeoJSONBoundaryGeometry(BaseModel):
    model_config = ConfigDict(extra="allow")  # matches existing generator pattern

    type: str
    coordinates: Optional[Any] = None


class GeoJSONFeature(BaseModel):
    model_config = ConfigDict(extra="allow")

    type: Literal["Feature"]
    id: Optional[str | int] = None
    geometry: Optional[GeoJSONBoundaryGeometry] = None
    properties: Optional[Any] = None


class GeoJSONFeatureCollection(BaseModel):
    model_config = ConfigDict(extra="allow")

    type: Literal["FeatureCollection"]
    features: list[GeoJSONFeature]
```

Notes:
- Pydantic `Optional[str | int]` permits `None`, `str`, or `int`.
- `Literal["Feature"]` enforces the `equals_string` constraint at runtime during `model_validate`.
- `extra="allow"` matches the existing generator pattern for all boundary classes in the repo (permits unknown fields at parse time without discarding them).

---

## Contract stability

- The **class name** `GeoJSONFeature` is retained (widened). Renaming to `RawGeoJSONFeature` or similar was considered and rejected in `research.md` (Decision 1).
- The **import path** for TypeScript consumers is `@debrief/schemas`. For Python consumers that opt in to the Pydantic model (not required by this feature — all Python services continue to use `TypeAlias = dict[str, Any]`), the import is from `debrief_schemas`.
- **Breaking-change status**: the `session-state.yaml#GeoJSONFeature` class's shape changes. The sole consumer (`ResultsSlice.result_layers`) is not broken because the change is a *widening* — every value that was valid before remains valid. No migration is needed for stored session-state documents.
- **Schema version bump**: per Article XIV (pre-release freedom), no schema version bump is required. Per Article II.3 post-v4.0.0 this would be a widening, which is non-breaking.

---

## Test contract

The LinkML schema is considered correctly installed when:

1. `make -C shared/schemas generate` completes without error.
2. `make -C shared/schemas test` passes (includes round-trip + adherence tests for the new class).
3. The golden fixtures listed in `data-model.md` validate against both LinkML-generated JSON Schema and Pydantic-generated JSON Schema with identical accept/reject decisions.

The contract is considered "live" for consumers when:

4. `pnpm --filter @debrief/schemas build` produces a valid TypeScript artefact.
5. A consumer package (`pnpm --filter @debrief/utils typecheck`) type-checks against the regenerated types with no new errors.

See `quickstart.md` for the exact commands and the incremental verification order.
