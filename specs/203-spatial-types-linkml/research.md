# Research: Spatial Types Consolidation

**Feature**: 203-spatial-types-linkml
**Phase**: 0 — Research & Design Decisions
**Date**: 2026-04-20

## Purpose

Resolve the three [NEEDS CLARIFICATION] markers in spec.md (FR-003, FR-004, FR-018) with explicit decisions, rationale, and rejected alternatives. Capture other design choices surfaced during research.

---

## R-001: `zoom` field placement on ViewportPolygon

**Context**: FR-003. The runtime TypeScript `ViewportPolygon` carries an optional `zoom?: number` field (used by the map to restore view state on rehydration). The LinkML `ViewportPolygon` does not have `zoom`. We need a single canonical shape.

### Decision

**Add `zoom: float` as an optional attribute to the LinkML `ViewportPolygon` class.**

```yaml
ViewportPolygon:
  description: Geographic area as a 4-corner polygon supporting rotated views (FR-012, FR-013)
  attributes:
    coordinates:
      description: Four corners in clockwise order [NW, NE, SE, SW]
      range: Coordinate
      multivalued: true
      required: true
      minimum_cardinality: 4
      maximum_cardinality: 4
    zoom:
      description: Map zoom level for restoring the view (optional)
      range: float
      required: false
```

### Rationale

- **Minimal schema change** — a single optional slot addition; no new class, no cascading refactor of consumers.
- **Matches existing runtime intent** — both duplicate TS copies already include `zoom?: number`; adopting it in LinkML brings the schema in line with demonstrated usage, not the other way around.
- **Semantically coherent** — `zoom` is meaningless without a viewport and always travels with one in the persisted state slice. Separating them (Option B) introduces avoidable indirection.
- **Non-breaking for existing data** — `zoom` is optional, so existing fixtures without a `zoom` field remain valid.

### Alternatives Considered

- **Option B: Sibling `ViewState { viewport: ViewportPolygon, zoom: float }` class**. Rejected: requires every consumer of `ViewportPolygon` to decide whether it wants the wrapper or the bare polygon; cascades typing changes through `SpatialSlice`, `SpatialActions`, and all map code that currently just reads `viewport.zoom`. The benefit (conceptual purity of a "polygon" type) is not proportionate to the churn.
- **Option C: Keep `zoom` out of the schema entirely, move it to a new top-level field in `SpatialSlice`**. Rejected: requires session-state store changes and adds a field that must always be kept in sync with the viewport's lifecycle (set together, cleared together). Higher drift risk than co-locating them.

### Impact

- `shared/schemas/src/linkml/session-state.yaml` — one attribute addition.
- Generated TS and Pydantic types gain optional `zoom`.
- Existing golden fixtures without `zoom` remain valid (optional field).
- One new fixture with `zoom` added to exercise the round-trip.

---

## R-002: `TimeFilter` canonical shape (epoch-millis vs `TimeInstant`)

**Context**: FR-004. The LinkML `TimeFilter` currently uses `range: TimeInstant` for both `start` and `end`. The runtime code uses `{ start: number | null, end: number | null }` — plain epoch milliseconds per Review Decision 5C (hot-path performance). The two shapes are incompatible, and we must pick one canonical form.

### Decision

**Change the LinkML `TimeFilter` to use nullable epoch-millisecond integers for both `start` and `end`, reversing the current schema to match Review Decision 5C.**

```yaml
TimeFilter:
  description: Constraints on the visible time window (epoch milliseconds; null = unbounded)
  attributes:
    start:
      description: Filter start as epoch milliseconds (null/missing = unbounded)
      range: integer
      required: false
    end:
      description: Filter end as epoch milliseconds (null/missing = unbounded)
      range: integer
      required: false
```

### Rationale

- **Respects the performance decision already made** — Review Decision 5C (documented in the 132-three-view-sync feature comments) chose epoch integers to avoid allocating `TimeInstant` objects in hot-path state updates (time-slider drag can fire hundreds of updates per second). Reversing that decision would regress performance for no clear benefit.
- **Convergence via schema, not via runtime** — the schema is the expected convergence point for this kind of conflict. Runtime code already encodes the operational constraint; the schema has not been exercised in this code path until now.
- **`TimeInstant` is redundant in the filter context** — `TimeInstant` duplicates information (`epoch: int` and `iso: string` both encode the same point in time). For a filter that a user drags continuously, carrying the string form adds allocation pressure and risks the two representations drifting out of sync.
- **Consistency with `TimeRange` is not required** — `TimeRange` (bounds of loaded data) is a low-churn value that benefits from the `TimeInstant` dual-representation for interop/logging. `TimeFilter` (user's visible window) is a high-churn value. Different shapes for different performance profiles are defensible.
- **Pre-release freedom (Article XIV)** — schema evolution is explicitly permitted until v4.0.0; we can make this change without deprecation ceremony.

### Alternatives Considered

- **Option B: Change runtime to adopt `TimeInstant` objects**. Rejected: reverses Review Decision 5C. The project already analysed this trade-off when the epoch form was adopted; no new evidence justifies reversing.
- **Option C: Formalise "serialisation form" (`TimeInstant`) vs "runtime form" (epoch) with explicit converters**. Rejected: introduces two types to maintain for one concept; doubles the surface area; the converters would need to be called at every boundary crossing. For pre-v4.0.0, the single-type solution is cheaper. If the dual-shape becomes necessary later (e.g., for human-readable log output), it can be added as follow-up without blocking the consolidation.

### Impact

- `shared/schemas/src/linkml/session-state.yaml` — `TimeFilter` class updated; `TimeInstant` class retained (still used by `TimeRange`).
- Generated Pydantic `TimeFilter` shape changes from objects with `TimeInstant` attributes to nullable integers. This is a breaking change at the Python boundary — but `TimeFilter` has no known Python consumer today (the code path is TypeScript-only).
- Round-trip tests for `TimeFilter` must be updated to exercise the new shape.

### Note on Python consumers

A quick grep of the Python codebase for `TimeFilter` references is a P1 implementation step to confirm the "no known Python consumer" assertion. If a consumer exists, that service adopts the nullable-integer shape.

---

## R-003: Persisted state migration strategy

**Context**: FR-018. The `@debrief/session-state` store persists across page reloads (web-shell) and VS Code workspace restarts (extension). Existing persisted state may contain tuple-form coordinates. Changing the canonical shape to objects means rehydration must handle legacy data.

### Decision

**Silent in-place migration on rehydration.** The rehydration layer detects tuple-shaped coordinates (arrays of length 2 with both elements as numbers) and converts them to object form before writing them to the store. The persistence schema version is bumped from its current value (see `services/session-state/src/persistence/`) to the next increment so mid-migration state is detectable.

### Rationale

- **Deterministic conversion** — tuple `[lon, lat]` → `{ longitude: lon, latitude: lat }` has no ambiguity. Every legacy tuple produces exactly one object-form coordinate.
- **Zero user-visible disruption** — users do not lose viewport state, do not see an error banner, do not need to reset their session.
- **Article XIV (Pre-Release Freedom) permits a harder approach but does not require it** — we have the freedom to break persisted state, but if a smooth migration is cheap and correct, we take it.
- **Version bump is cheap insurance** — if a future refactor needs to break persistence, the version guard tells us what shape we're reading.
- **Migration code is self-removing** — a one-line comment annotates the migration as temporary; once all production sessions have migrated (trivial for a pre-release product), the migration branch can be deleted in a follow-up.

### Alternatives Considered

- **Option B: Version bump with user-facing "session must be reset" message**. Rejected as too disruptive for a deterministic conversion. Appropriate if the conversion were lossy or ambiguous; it is neither.
- **Option C: Defer — assume persisted state is empty in practice**. Rejected because we know persisted state exists (web-shell is used daily; VS Code workspaces persist). Assuming it is empty would produce "coordinate shape mismatch" runtime errors on every user's next session. Noisy and avoidable.

### Impact

- `services/session-state/src/persistence/` gains a narrow migration step invoked during rehydration.
- Persistence schema version bumped by 1.
- One migration-specific unit test: given a legacy tuple-shaped state blob, assert the rehydrated store holds object-shaped coordinates.

---

## R-004: Converter helper naming and axis semantics

**Context**: FR-013, FR-014. Clear naming prevents latitude/longitude transposition bugs.

### Decision

```typescript
/**
 * Convert a canonical Coordinate object to a GeoJSON position tuple.
 * @returns [longitude, latitude] — GeoJSON axis order per RFC 7946.
 */
export function toGeoJSONCoord(coord: Coordinate): [number, number];

/**
 * Convert a GeoJSON position tuple to a canonical Coordinate object.
 * @param tuple — [longitude, latitude] — GeoJSON axis order per RFC 7946.
 *   NOTE: This is NOT Leaflet LatLng order. Use L.latLng(lat, lon) directly for Leaflet.
 */
export function fromGeoJSONCoord(tuple: [number, number]): Coordinate;
```

### Rationale

- **Names name the target format** — `toGeoJSONCoord` / `fromGeoJSONCoord` make the tuple order explicit; `toTuple` / `fromTuple` would invite Leaflet-order mistakes.
- **JSDoc commits axis order** — RFC 7946 citation makes the contract unambiguous.
- **Leaflet disclaimer** — explicit guidance to use `L.latLng` for Leaflet prevents misuse.

### Alternatives Considered

- **`toLonLat` / `fromLonLat`**. Rejected: encodes axis order in the name but does not signal which wire format this corresponds to. A reader unfamiliar with GeoJSON could reasonably misuse it.
- **A single bidirectional class like `GeoJSONCoordAdapter`**. Rejected: two pure functions are simpler and tree-shake better.

---

## R-005: Validator placement and shape

**Context**: FR-012. `validateCoordinate` and `validateViewportPolygon` currently live in `services/session-state/src/types/spatial.ts` and operate on tuples. They must move to `@debrief/utils` and operate on the canonical object form.

### Decision

- Move to `shared/utils/src/spatial-validators.ts` (new file).
- Signatures accept canonical object-form inputs:

  ```typescript
  export function validateCoordinate(coord: Coordinate): boolean;
  export function validateViewportPolygon(viewport: ViewportPolygon): boolean;
  ```

- Bounds checks remain unchanged: `longitude ∈ [-180, 180]`, `latitude ∈ [-90, 90]`.
- Unit tests for both move to `shared/utils/src/__tests__/spatial-validators.test.ts`.

### Rationale

- `@debrief/utils` is already a zero-dependency shared utility package and is a natural home for schema-type helpers.
- Moving preserves the existing tests (shape-adjusted to object form).
- `calculateViewportCenter` is a compute helper (not a validator), so it stays in `services/session-state` and is adjusted to use canonical inputs/outputs — or moved alongside the validators if it's equally generic. Default: move it with the validators.

### Alternatives Considered

- **Keep validators in `services/session-state` and re-export from `@debrief/utils`**. Rejected: the idea doc mandates validators move to utils; re-exports add indirection without benefit.
- **Put validators in `@debrief/schemas` alongside generated types**. Rejected: `@debrief/schemas` is the generated-output package; hand-authored utilities would pollute its "only generated code" discipline.

---

## R-006: Handling LinkML-generated array types for `ViewportPolygon.coordinates`

**Context**: Edge Case in spec. `gen-typescript` may emit `Coordinate[]` (open-ended array) rather than a fixed 4-tuple. Runtime validators enforce 4-corner cardinality at the validation boundary.

### Decision

**Accept `Coordinate[]` at the type level; enforce `length === 4` at the validator level.**

### Rationale

- **TypeScript tuple types and LinkML cardinality constraints do not translate perfectly.** LinkML's `minimum_cardinality`/`maximum_cardinality` are JSON-Schema-level constraints; `gen-typescript` typically emits them as `Coordinate[]` for ergonomic reasons.
- **Validator is the right enforcement point** — code receiving a `ViewportPolygon` from a persistence layer, a service response, or a user-supplied JSON file passes through the validator; the validator fails loud on a non-4-corner input.
- **Avoids a hand-patched type declaration** — keeping the generated type as-is preserves the "schema is canonical" principle. Layering a tighter tuple type in a separate file would reintroduce the duplication we're trying to eliminate.

### Alternatives Considered

- **Hand-patched tuple type in `@debrief/schemas`**. Rejected: reintroduces a hand-authored type for a schema-derived concept; violates Article II (Schema Integrity) even if only at the TS layer.
- **LinkML custom generator emitting fixed-length tuples**. Rejected: disproportionate engineering effort (write/maintain a custom generator plugin) for a constraint better expressed as a validation rule.

---

## R-007: Audit surface and boundary-coverage approach

**Context**: FR-016. Existing code that crosses the GeoJSON/Leaflet boundary must be updated to call the new converters. We need a bounded audit, not an exhaustive sweep (out-of-scope).

### Decision

**Audit scope is: any file that currently imports `Coordinate`, `ViewportPolygon`, or `TimeFilter` from `services/session-state` or `shared/components/src/utils/spatial-types.ts`.** Any remaining hand-rolled tuple construction in those files is replaced with `toGeoJSONCoord` / `fromGeoJSONCoord` or documented as "intentional — Leaflet direct call, use `L.latLng`".

### Rationale

- **Bounded and verifiable** — the grep that produces the audit list is deterministic; reviewers can rerun it.
- **Consistent with the refactor's scope** — files that need to be edited anyway because their imports change are the natural boundary for "also clean up your conversions".
- **Leaves untouched boundaries for follow-up** — code that constructs tuples for pure-Leaflet calls without touching these types keeps working; if it becomes a problem, it is tracked separately.

---

## R-008: Python-side symmetry (deferred)

**Context**: Assumption A5, Out of Scope. Python services read/write GeoJSON through `debrief-io` and `debrief-calc`. They could, in principle, benefit from symmetric converters.

### Decision

**Defer Python converter helpers.** Python code uses Pydantic models with named attributes (`coord.longitude`, `coord.latitude`), and GeoJSON handling is concentrated in `debrief-io`'s parsers which already perform the conversion inline. No identified hot path where named converters would reduce duplication.

### Rationale

- **No duplicated Python declarations** — unlike TS, the Python side has exactly one `Coordinate` (Pydantic-generated) and no duplication to consolidate.
- **Focus matters** — this feature is scoped to remove TS duplication. Adding Python helpers without a driving need would expand scope.

### Follow-up

Track in backlog if a concrete Python call-site surfaces needing these helpers. Not a blocker.

---

## Summary of resolutions

| Spec marker | Resolution | Impact |
|-------------|-----------|--------|
| FR-003 (zoom placement) | R-001: add `zoom` as optional attribute to `ViewportPolygon` | Low — one LinkML line, backwards-compatible |
| FR-004 (TimeFilter shape) | R-002: change LinkML `TimeFilter` to nullable epoch-integer | Medium — schema change, round-trip fixtures updated |
| FR-018 (persistence migration) | R-003: silent in-place migration + version bump | Low — narrow, deterministic, self-removing |

Spec will be updated to replace the three markers with the decisions above.
