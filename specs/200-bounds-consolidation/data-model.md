# Phase 1 Data Model: Consolidate bounds utilities into @debrief/utils

**Feature**: 200-bounds-consolidation (v2)
**Date**: 2026-04-19
**Inputs**: spec.md v2 (Key Entities), research.md (R1, R2, R6, R7)

This is a refactor of an internal utility, not a new data feature. No new persisted entities, no schema additions, no API surface changes. This document describes the **type-level data shapes** that bound the change, so reviewers can verify that every input/output relationship is preserved.

---

## Entities

### `Bounds` (unchanged)

The output of `calculateBounds` and the input of `mergeBounds`, `boundsToLeaflet`, `isValidBounds`.

| Field | Type | Notes |
|-------|------|-------|
| `[0]` minLon | `number` | Western edge. |
| `[1]` minLat | `number` | Southern edge. |
| `[2]` maxLon | `number` | Eastern edge. |
| `[3]` maxLat | `number` | Northern edge. |

- **Where defined**: `shared/utils/src/types.ts` (existing).
- **Exported via**: `@debrief/utils` package root (existing).
- **Validation**: `isValidBounds(b)` returns `true` iff `-180 ≤ minLon ≤ maxLon ≤ 180` and `-90 ≤ minLat ≤ maxLat ≤ 90`. Unchanged.
- **Nullability**: `calculateBounds` and `mergeBounds` may return `Bounds | null`. Unchanged.

### `BoundsInputFeature` (NEW — private to `shared/utils/src/bounds.ts`)

The structural-minimum shape `calculateBounds` reads from each input element. Defined locally inside `bounds.ts` (per research R1); **not** exported from the package.

| Field | Type | Notes |
|-------|------|-------|
| `geometry` | `{ type: string; coordinates: unknown } \| null \| undefined` | Optional/nullable so the null-guard (R2) is well-typed. `unknown` for `coordinates` is narrowed by the `coerceCoordinates` gate (R6). |

- **Why private**: Article IX (minimal public surface) and Article XV (`unknown` should not propagate as a public type).
- **Structural compatibility**: `GeoJSONFeature[]`, `SafeFeature[]`, and `DebriefFeature[]` (and its variants) are all assignable to `ReadonlyArray<BoundsInputFeature>` via TypeScript's structural-subtyping rules. No `as`-cast required at any call site.

### `CoordinateTree` (NEW — private to `shared/utils/src/bounds.ts`)

The **output** of the narrowing gate (R6). Represents the union of coordinate-array shapes the utility can process. Not exported.

```ts
type CoordinateTree =
  | number[]          // Point
  | number[][]        // LineString, MultiPoint
  | number[][][]      // Polygon, MultiLineString
  | number[][][][];   // MultiPolygon
```

- **Why it exists**: The widened parameter admits `coordinates: unknown`; the narrowing gate converts that to `CoordinateTree | null`. Every per-geometry-type branch in `extractCoordinates` then reads a typed `CoordinateTree` — zero `any`, zero double-cast.
- **Null case**: Returned from `coerceCoordinates` when the input is not an array-of-numbers / array-of-arrays-of-numbers / ... tree. Treated by the caller as "skip this feature".

### `GeoJSONFeature` (unchanged — read-only reference)

Defined in `shared/utils/src/types.ts`. Continues to exist. A structural supertype-compatible input to `calculateBounds` (required `geometry` is assignable to the new optional/nullable parameter).

### `SafeFeature` (unchanged — read-only reference)

Defined in `shared/utils/src/types.ts`. Re-exported under the alias `GeoJSONFeature` from `apps/vscode/src/types/import.ts`. After this change, `SafeFeature[]` flows directly into `calculateBounds` from `mapPanel.ts` with no `as`-cast.

### `DebriefFeature` (unchanged — read-only reference)

LinkML-derived union type exported from `@debrief/schemas`, consumed by `mapPanel.ts` as the type of `this.currentFeatures`. A structural supertype-compatible input to the widened `calculateBounds` (R7).

---

## Relationships

```
GeoJSONFeature[]   ─┐
SafeFeature[]      ─┤
DebriefFeature[]   ─┼──► calculateBounds(features: ReadonlyArray<BoundsInputFeature>)
                    │         │
                    │         ├─ per-feature: if (!feature.geometry) continue;           ← null-guard (R2)
                    │         ├─ per-feature: const coords = coerceCoordinates(raw);     ← narrowing gate (R6)
                    │         │                                                            coords: CoordinateTree | null
                    │         ├─ if (coords === null) continue;
                    │         └─ switch (feature.geometry.type) { ... }                  ← reads typed CoordinateTree
                    │
                    └──► returns Bounds | null

Bounds | null  +  Bounds | null  ──► mergeBounds(...) ──► Bounds | null       (UNCHANGED)
Bounds                              ──► boundsToLeaflet(...) ──► [[number, number], [number, number]]  (UNCHANGED)
Bounds                              ──► isValidBounds(...) ──► boolean         (UNCHANGED)
```

No new edges in the public graph; `SafeFeature[]` and `DebriefFeature[]` are now first-class accepted inputs (they were previously incompatible with the shared signature, which is what produced the duplication).

### `fitToSelection` call graph (changed)

```
Before (v1 / pre-change):
  fitToSelection()
    ├── resolve selected IDs → selectedFeatures: DebriefFeature[]
    ├── inline loop over selectedFeatures
    │     ├── if (geom.type === 'LineString') { ... }
    │     ├── else if (geom.type === 'Point') { ... }
    │     └── else { silently skip }          ← the bug US4 / FR-008 fixes
    └── fitBounds([[minLat, minLng], [maxLat, maxLng]])

After:
  fitToSelection()
    ├── resolve selected IDs → selectedFeatures: DebriefFeature[]
    ├── const bounds = calculateBounds(selectedFeatures);
    ├── if (bounds === null) return;          ← honours the spec's unchanged-viewport fallback
    └── fitBounds(boundsToLeaflet(bounds));
```

---

## State transitions

None. The bounds utility is pure (input → output, no internal state, no side effects). The `fitToSelection` rewrite preserves the existing early-return for an empty selection; no new states introduced.

---

## Validation rules (delta from current)

| Rule | Before | After | Source |
|------|--------|-------|--------|
| Feature with `geometry === null` is skipped silently. | Only in VS Code-local copy. | In canonical `shared/utils/src/bounds.ts`, applies to every consumer. | FR-002, R2 |
| Feature with `geometry === undefined` is skipped silently. | Effectively yes. | Same. Made explicit by the optional/nullable parameter type. | FR-002, R2 |
| Empty input array returns `null`. | Both copies. | Canonical only. | Existing. |
| Feature with unrecognised coordinate tree (non-array or array with non-numeric leaves) is skipped. | Implicit in `extractCoordinates`'s switch fall-through. | **Made explicit** by `coerceCoordinates` returning `null` for shape mismatch. | FR-007, R6 |
| `fitToSelection` honours Polygon / MultiPolygon / MultiPoint / MultiLineString selections. | **No** — silently skipped. | **Yes** — handled by `calculateBounds`. | FR-008, US4 |
| `fitToSelection` preserves unchanged viewport on empty selection. | Yes. | Yes (preserved). | FR-009 |

---

## Test shape (new coverage added by this work)

New assertions in `shared/utils/tests/bounds.test.ts`:

1. **Null-geometry regression** (FR-002, SC-006): input mixing `{ geometry: null }` and valid features returns correct bounds from the valid subset; no throw.
2. **Undefined-geometry regression** (FR-002): same as (1) with `{ geometry: undefined }`.
3. **All-null-geometry corpus** (edge case): input where every feature has null geometry returns `null`.
4. **Per-geometry-type correctness** (FR-008, SC-007) — six independent tests, one per supported geometry type: Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon. Each asserts `calculateBounds([featureWithGivenGeometryType])` returns the correct four-number tuple.
5. **Narrowing-gate shape-mismatch** (FR-007): input where `coordinates` is `"not an array"`, `null`, `[]`, or `[["string"]]` returns `null` bounds without throwing. Locks in `coerceCoordinates`'s contract.

Deleted assertions: the entirety of `apps/vscode/tests/unit/bounds.test.ts` — every case in it has an equivalent in the new shared-test-file corpus above, or is already present in the existing `shared/utils/tests/bounds.test.ts`.

---

## Out of scope

- The deeper "two types for one entity" smell between `SafeFeature` and `GeoJSONFeature` (research R1, alternative B) — deferred backlog item.
- `shared/components/src/utils/bounds.ts` (separate implementation with different input type and additional helpers) — deferred backlog item.
- Changes to `boundsToLeaflet` or `isValidBounds`. Their signatures and bodies are byte-identical between the two pre-change copies; no consumer needs to change.
