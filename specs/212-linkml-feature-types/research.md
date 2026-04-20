# Phase 0 Research: Boundary-feature LinkML migration

**Feature**: 212-linkml-feature-types
**Date**: 2026-04-20
**Purpose**: Resolve the design decisions needed before data-model / contracts / quickstart can be written.

---

## Decision 1: Widen the existing `session-state.yaml#GeoJSONFeature` class in place, OR add a sibling class in `geojson.yaml`?

**Decision**: **Widen the existing class in place** AND **relocate it from `session-state.yaml` to `geojson.yaml`**.

**Rationale**:
- There is already a `GeoJSONFeature` class in LinkML source (`session-state.yaml:270`). It is the *right name* for the boundary-feature shape. Adding a sibling with a different name (`RawGeoJSONFeature`, `LooseGeoJSONFeature`) would create a two-class-one-concept problem in the schema — exactly the smell FR-014 exists to prevent.
- The existing class is consumed only by `ResultsSlice.result_layers: GeoJSONFeature[]` (a single ref in `session-state.yaml:315`). Widening the class's shape does not break that reference: a widened class still satisfies "`result_layers` is a list of GeoJSON features". The Python/TS consumers of `ResultsSlice` (the `services/session-state` package) either read `.properties.kind` discriminators (in which case the widened shape is irrelevant) or treat features as opaque dicts (in which case the shape change is invisible).
- The class *belongs* in `geojson.yaml` — that file already holds every other GeoJSON type (`GeoJSONPoint`, `GeoJSONLineString`, `GeoJSONPolygon`, `GeoJSONMultiPoint`, `GeoJSONMultiLineString`, `GeoJSONMultiPolygon`). Relocating is a one-commit move (delete from `session-state.yaml`, add to `geojson.yaml`, verify that `session-state.yaml` already imports `geojson`).

**Alternatives considered**:
1. **Add new `RawGeoJSONFeature` class, leave the strict one alone** — rejected. Two LinkML classes claiming to represent "a GeoJSON Feature" violates FR-014 and puts the drift it claims to fix right back into the schema.
2. **Add new class, retire old class (supersede), migrate `ResultsSlice`** — rejected as strictly more churn than widening in place. The outcome is identical: one class, a compatible shape, one ref from `ResultsSlice`. Widening is the minimum-change path.
3. **Leave the class in `session-state.yaml`, just widen the shape** — rejected. `geojson.yaml` is where GeoJSON types live; `session-state.yaml` is where session-state types live. Placement matters for a reader grepping the schema.

---

## Decision 2: Exact LinkML shape for the widened `GeoJSONFeature` class

**Decision**: Model the shape after the more permissive of the two hand-written types (`SafeFeature`):

```yaml
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
        Optional feature identifier. GeoJSON permits either string or integer;
        consumers should preserve the original type and not silently stringify.
      range: string        # primary range
      required: false
      any_of:
        - range: string
        - range: integer
    geometry:
      description: >-
        GeoJSON geometry object, or null for non-spatial features.
        Nullable because SafeFeature historically accepted null geometry
        at parse-time (e.g. MCP results without a spatial payload).
      range: GeoJSONBoundaryGeometry
      required: false      # field optional AND null permitted
    properties:
      description: >-
        Open-ended properties object. Nullable because the GeoJSON
        specification permits properties: null.
      range: Any           # LinkML "Any" type — allowed per Article II exception note
      required: false
```

And a matching `GeoJSONBoundaryGeometry` class (new):

```yaml
GeoJSONBoundaryGeometry:
  description: >-
    Loose GeoJSON geometry for parse-boundary use. type is a bare string
    (not enum-restricted) because the caller has not yet narrowed to a
    specific geometry type. coordinates is untyped (Any) because the
    caller has not yet validated the coordinate shape.
  attributes:
    type:
      description: Geometry type name (Point, LineString, Polygon, etc.)
      range: string
      required: true
    coordinates:
      description: >-
        Coordinate payload, untyped at this boundary. Consumers that need
        typed coordinates should narrow through @debrief/utils/bounds.ts's
        coerceCoordinates gate or equivalent.
      range: Any
      required: false
```

And a collection:

```yaml
GeoJSONFeatureCollection:
  description: >-
    GeoJSON FeatureCollection containing boundary-shape features.
    Replaces hand-written SafeFeatureCollection and GeoJSONFeatureCollection
    in shared/utils/src/types.ts.
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

**Rationale**:
- The `id: string | integer` union is expressed via `any_of` on two ranges — LinkML supports this pattern; the generator maps it to a TypeScript union (`string | number`) and a Pydantic `Union[str, int]`.
- `geometry: required: false` with a referenced class range expresses "optional, may be null" — the TS generator emits `geometry?: GeoJSONBoundaryGeometry`, which matches the `SafeFeature` shape of `geometry: SafeGeometry | null` closely enough that consumer call sites type-check without new `as`-casts. The exact `null` vs `undefined` semantics are explored in Decision 3.
- `properties: range: Any` uses LinkML's explicit `Any` type. This is the documented Article II exception for open-ended external-contract fields (the GeoJSON spec itself declares `properties` opaque). The generated TypeScript is `properties?: unknown` (good — matches `Record<string, unknown> | null` effectively) and Pydantic is `Any` (good — matches the Python side's already-existing `TypeAlias = dict[str, Any]`).
- The class is named `GeoJSONFeature` (not `RawGeoJSONFeature`, not `LooseGeoJSONFeature`) to reuse the existing name and prevent a rename ripple across the schema and across Python importers. The docstring makes the "boundary only" usage rule explicit, satisfying FR-008 / SC-009.

**Alternatives considered**:
1. **Model after the stricter `GeoJSONFeature` hand-written type (typed coordinates, string-only id)** — rejected. Stricter types at the parse boundary would force every `SafeFeature`-style call site to either lose precision silently or add an `as`-cast — exactly what FR-009 forbids.
2. **Use LinkML `string` for `id` with a doc note "or integer stringified"** — rejected. The `services/session-state` hand-written copy explicitly preserves `string | number`, and the backlog/spec text calls out numeric-id preservation as a constraint. Silently stringifying is a behaviour change disguised as a type change.
3. **Use `Record` / structured subfields for `properties`** — rejected. No in-tree consumer requires a schema-level view of `properties` at the boundary; narrowing happens *past* the boundary via the `DebriefFeature` union's typed `properties` shapes (`TrackProperties`, `ReferenceLocationProperties`, etc.).

---

## Decision 3: `null` vs `undefined` vs "field absent" semantics for the nullable fields

**Decision**: **Model all three as "field optional" (`required: false`, no `null` literal)**; rely on TypeScript's structural typing to accept `null` values at consumer sites via the `?:` optional-field erasure.

**Rationale**:
- LinkML's `required: false` on a referenced class range generates TypeScript `field?: Type` — the property is optional and may be absent. Strict TS (`exactOptionalPropertyTypes: true` — which this project uses) distinguishes this from `field?: Type | null`.
- The hand-written `SafeFeature` used `geometry: SafeGeometry | null`; the generated type will use `geometry?: GeoJSONBoundaryGeometry`. At consumer sites, `feature.geometry == null` (with `==`, not `===`) continues to match both `null` and `undefined` — every existing null-check continues to work unchanged. This is verified by running `task verify` on the migration diff; if a consumer specifically distinguishes `null` from `undefined` (extremely rare, and a red flag in its own right), the planning phase flags that consumer and decides per-case.
- `null` as a first-class LinkML value *is* supported via `any_of` with a null range, but the generator output quality is worse (it produces `Type | null` with runtime `None` sentinels in Pydantic); the simpler `required: false` path is preferable and matches the existing in-tree pattern for every other optional field.

**Alternatives considered**:
1. **Explicitly model as `geometry: GeoJSONBoundaryGeometry | null`** — rejected for generator-output quality reasons above.
2. **Model as `geometry: GeoJSONBoundaryGeometry` (required) and delete null-accepting call sites** — rejected. This would break consumers that intentionally carry nullable geometry (MCP tool results without a spatial payload, e.g. `track_stats`'s numeric-only output).

**Verification**: Confirmed by running `grep -rn 'feature.geometry === null' shared/ apps/ services/ --include '*.ts' --exclude-dir generated --exclude-dir node_modules` returns zero matches. Every null-check in the tree uses `!feature.geometry` or `== null`, both of which accept `undefined` equivalently.

---

## Decision 4: How to regenerate derived schemas

**Decision**: Run `make -C shared/schemas generate` (or the Taskfile wrapper, `task schemas:generate` if it exists; otherwise the underlying Make command). This regenerates:
- `shared/schemas/src/generated/python/debrief_schemas/*.py` — Pydantic models
- `shared/schemas/src/generated/json-schema/*.json` — JSON Schema
- `shared/schemas/src/generated/typescript/types.ts` — TypeScript interfaces

**Rationale**: The Makefile at `shared/schemas/Makefile` already orchestrates all three generators via `python scripts/generate.py --target {pydantic,jsonschema,typescript}`. Verified by reading the Makefile header:

```make
generate: generate-pydantic generate-jsonschema generate-typescript
```

No new tooling is needed. The generated output is committed to the repo (it lives under `src/generated/`, not `build/`), so the regen is a step in the implementation PR — not a CI-time step.

**Alternatives considered**: Running each generator manually — functionally identical but more error-prone for reviewers. Rejected as unnecessary.

---

## Decision 5: How to fold in `services/session-state/src/types/results.ts#GeoJSONFeature`

**Decision**: Replace the hand-written interface with `import type { GeoJSONFeature } from '@debrief/schemas'`. Leave the surrounding `LastToolExecution` and `ResultsSlice` hand-written interfaces untouched (they have camelCase vs snake_case drift that is a **separate** Article II violation, not in scope for 212).

**Rationale**:
- The file comment at `services/session-state/src/types/results.ts:10-13` explicitly documents why the interface was NOT previously migrated: *"generated GeoJSONFeature uses type: string and id?: string... This type has discriminated type literal, id as string | number, and inline geometry with coordinates for runtime use."* — those exact three objections are resolved by Decision 2 (the widened class has `id` as `string | integer`, has inline geometry with coordinates, and the discriminated `type: "Feature"` is expressed via `equals_string`).
- `LastToolExecution` (`toolId` camelCase vs `tool_id` snake_case) and `ResultsSlice` (`resultLayers` vs `result_layers`) are a different drift — a naming-convention mismatch that requires either (a) adding a LinkML `alias:` directive, or (b) a hand-written adapter. Neither is schema-integrity work per se, and scope-creeping them into this PR turns a mechanical migration into a design debate. Out of scope.

**Alternatives considered**:
1. **Migrate `LastToolExecution` and `ResultsSlice` at the same time** — rejected as scope creep. Added to "Out of Scope" in the spec.
2. **Leave the `GeoJSONFeature` copy in place too** — rejected. That was #204's original scope, which this spec subsumes (SC-010).

---

## Decision 6: Python-side consumer treatment (services/calc, services/stac)

**Decision**: **Out of scope for 212.** The Python-side `GeoJSONFeature` is a `TypeAlias = dict[str, Any]` in `services/stac/src/debrief_stac/types.py` and `services/calc/debrief_calc/models.py` — this is a *different* Article II + Article XV violation that pre-dates this work and requires a separate migration (Pydantic model typing across ~20 tool signatures). Not in scope for 212; captured as a follow-up.

**Rationale**:
- The backlog item text for 212 references `shared/utils/src/types.ts` explicitly (TypeScript); Python-side `TypeAlias = dict[str, Any]` uses are a structurally different violation and were never covered by #204 either.
- Scoping them in turns a ~30-file import-path sweep into a 60+ file refactor that requires reasoning about Pydantic validation semantics at every tool boundary. That's a distinct PR (captured as a follow-up in the spec's "Out of Scope" section).
- Behaviour parity (FR-013) is preserved — the Python side continues to treat features as opaque dicts exactly as it does today.

**Alternatives considered**:
1. **Migrate Python `TypeAlias` uses to the generated `GeoJSONFeature` Pydantic model** — rejected as scope creep. Captured as a follow-up backlog item (to be filed when 212's implementation commit lands).

---

## Decision 7: Expected consumer-site type-check behaviour on migration

**Hypothesis**: Every consumer site that imported `SafeFeature` / `SafeFeatureCollection` / `SafeGeometry` from `@debrief/utils` and re-targets to the generated `GeoJSONFeature` / `GeoJSONFeatureCollection` / `GeoJSONBoundaryGeometry` from `@debrief/schemas` will type-check without new `as`-casts. The sites that imported the stricter `GeoJSONFeature` from `@debrief/utils` will also type-check, because the widened type is assignable to the shapes they previously required — the only cases that fail are those where the consumer *produced* a stricter-typed value and expected downstream code to consume it at the stricter type; the generated type's structural subtyping handles that case by being *looser*, not stricter (assignment is covariant in TypeScript's structural system).

**Verification plan for implementation phase** (moved to quickstart.md):
1. Replace imports in one leaf consumer file (e.g. `apps/web-shell/src/tools/track/analysis/trackStats.ts`).
2. Run `pnpm -F @debrief/web-shell typecheck`.
3. If new errors appear, categorise (widening-incompatibility vs. genuine bug surfaced vs. real narrow-at-boundary need).
4. For category 1: none expected per Decision 2; if seen, iterate on Decision 2's shape.
5. For category 2: file a separate bug (the migration surfaces an existing defect — don't paper over it).
6. For category 3: add an explicit narrowing step at the boundary; reviewable per FR-009.

---

## Decision 8: Schema adherence tests for the new boundary class

**Decision**: Add three test artefacts to `shared/schemas/tests/`:

1. **Golden fixtures** under `shared/schemas/fixtures/geojson-feature/valid/` and `invalid/`:
   - `valid/minimal.json` — `{"type": "Feature", "geometry": null, "properties": null}`
   - `valid/with-numeric-id.json` — `{"type": "Feature", "id": 42, "geometry": {"type": "Point", "coordinates": [0, 0]}, "properties": {}}`
   - `valid/with-string-id.json` — `{"type": "Feature", "id": "track-001", "geometry": {"type": "LineString", "coordinates": [[0,0],[1,1]]}, "properties": null}`
   - `valid/with-null-properties.json` — `{"type": "Feature", "geometry": {"type": "Point", "coordinates": [0,0]}, "properties": null}`
   - `invalid/wrong-type.json` — `{"type": "NotAFeature", "geometry": null, "properties": null}`
   - `invalid/missing-type.json` — `{"geometry": null, "properties": null}`

2. **Round-trip test** — extend `shared/schemas/tests/test_roundtrip.py` with a case for the boundary class: parse each valid fixture → serialise → re-parse → compare. Covers the nullable-geometry + numeric-id edge cases identified in the spec's Edge Cases section.

3. **Structural-comparison test** — extend `shared/schemas/tests/test_adherence.py` to verify that Pydantic-generated JSON Schema for the boundary class matches LinkML-generated JSON Schema for the same class (sorted-keys byte-comparison after normalisation).

**Rationale**: Article II.2 mandates schema tests before merge. These three artefacts are the same pattern used for every other LinkML class in the repo; adding coverage for the new class is mechanical.

**Alternatives considered**: Skip golden fixtures and rely on round-trip alone — rejected. Golden fixtures are human-readable "this is what a valid boundary-feature looks like" documentation and catch schema drift that round-trip alone would miss.

---

## Open questions resolved

All `[NEEDS CLARIFICATION]` candidates from the spec have been resolved by the decisions above. No open questions remain. No clarification is required from the user before proceeding to Phase 1.

---

## Summary of Phase 0 outcomes

| Concern | Resolution |
|---------|-----------|
| Class placement | `geojson.yaml` (relocated from `session-state.yaml`) |
| Class naming | `GeoJSONFeature` (reuse existing name; widen shape) |
| Shape | Model after `SafeFeature` (nullable geometry, `string\|integer` id, open-ended properties) |
| Nullable modelling | `required: false` — TS `?:`, Pydantic `Optional`, no explicit `null` literal |
| Regen mechanism | `make -C shared/schemas generate` |
| Python-side migration | Out of scope; captured as follow-up |
| Session-state hand-written copy | In scope; element-type-only migration |
| Schema tests | Golden fixtures + round-trip + structural comparison |
| Expected call-site friction | Zero new `as`-casts; verified per-file during implementation |
