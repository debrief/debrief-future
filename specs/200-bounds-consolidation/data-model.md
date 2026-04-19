# Phase 1 Data Model: Consolidate bounds utilities into @debrief/utils

**Feature**: 200-bounds-consolidation
**Date**: 2026-04-19
**Inputs**: spec.md (Key Entities), research.md (R1, R2)

This is a refactor of an internal utility, not a new data feature. There are no new persisted entities, no schema additions, and no API surface changes. This document describes the **type-level data shapes** that bound (no pun intended) the change, so reviewers can verify that every input/output relationship is preserved.

---

## Entities

### `Bounds` (unchanged)

The output type of `calculateBounds` and the input type of `mergeBounds`, `boundsToLeaflet`, and `isValidBounds`.

| Field | Type | Notes |
|-------|------|-------|
| `[0]` minLon | `number` | Western edge of the rectangle. |
| `[1]` minLat | `number` | Southern edge. |
| `[2]` maxLon | `number` | Eastern edge. |
| `[3]` maxLat | `number` | Northern edge. |

- **Where defined**: `shared/utils/src/types.ts` (existing).
- **Exported via**: `@debrief/utils` package root (existing).
- **Validation rules**: `isValidBounds(b)` returns `true` iff `-180 ≤ minLon ≤ maxLon ≤ 180` and `-90 ≤ minLat ≤ maxLat ≤ 90`. Unchanged by this work.
- **Nullability**: `calculateBounds` and `mergeBounds` may return `Bounds | null` (when no usable coordinates exist or when both inputs to a merge are `null`). Unchanged.

### `BoundsFeature` (NEW — private to `shared/utils/src/bounds.ts`)

The structural-minimum shape that `calculateBounds` reads from each input element. Defined locally inside `bounds.ts` (per research R1); **not** exported from the package — it is an implementation detail that exists solely to widen the function's parameter so both `GeoJSONFeature[]` and `SafeFeature[]` flow through without `as`-casts.

| Field | Type | Notes |
|-------|------|-------|
| `geometry` | `{ type: string; coordinates: unknown } \| null \| undefined` | Optional/nullable so the null-guard (R2) is well-typed. `unknown` for `coordinates` is narrowed inside `extractCoordinates` per geometry-type branch (existing runtime checks). |

- **Why it exists**: To absorb the `SafeFeature.geometry: SafeGeometry | null` and `GeoJSONFeature.geometry: { type, coordinates }` shapes under one parameter type without committing to a third public feature type.
- **Why it is private**: Article XV (no `any`) and IX (minimal public surface). `BoundsFeature` carries `unknown` deliberately at the boundary — it should not propagate as a public type.

### `GeoJSONFeature` (unchanged — read-only reference)

Defined in `shared/utils/src/types.ts`. Continues to exist; continues to be a structural supertype-compatible input to `calculateBounds` (its required `geometry` is assignable to the new optional/nullable parameter).

### `SafeFeature` (unchanged — read-only reference)

Defined in `shared/utils/src/types.ts`. Re-exported under the alias `GeoJSONFeature` from `apps/vscode/src/types/import.ts`. After this change, `SafeFeature[]` (and the alias) flows directly into `calculateBounds` from `mapPanel.ts` with no `as`-cast at the call site.

---

## Relationships

```
SafeFeature[]      ─┐
GeoJSONFeature[]   ─┼──► calculateBounds(...) ──► Bounds | null
ReadonlyArray<X>   ─┘
where X is structurally compatible with BoundsFeature

Bounds | null  +  Bounds | null  ──► mergeBounds(...) ──► Bounds | null
Bounds                              ──► boundsToLeaflet(...) ──► [[number, number], [number, number]]
Bounds                              ──► isValidBounds(...) ──► boolean
```

No new edges; the diagram simply documents that `SafeFeature[]` is now a first-class accepted input shape (it was previously incompatible with the shared signature, which is what produced the duplication).

---

## State transitions

None. The bounds utility is pure (input → output, no internal state, no side effects). This is unchanged.

---

## Validation rules (delta from current)

| Rule | Before | After | Source |
|------|--------|-------|--------|
| Feature with `geometry === null` is skipped silently. | Only in VS Code-local copy. | In canonical `shared/utils/src/bounds.ts`, applies to every consumer. | FR-002, R2 |
| Feature with `geometry === undefined` is skipped silently. | Effectively yes (the null-guard `if (!feature.geometry)` short-circuits both). | Same. Made explicit by the optional/nullable type. | FR-002, R2 |
| Empty input array returns `null`. | Both copies. | Canonical only. | Existing. |
| Coordinate values outside valid lon/lat ranges still contribute to the bounds calculation. | Both copies. | Canonical only. | Existing — `isValidBounds` is the validation step, not `calculateBounds`. Unchanged. |
| Malformed coordinates (e.g., a Point whose `coordinates` array has fewer than two numeric elements) are skipped silently within `extractCoordinates`. | Both copies. | Canonical only. | Existing. |

No other validation rule changes. The `SC-006` regression test in `shared/utils/tests/bounds.test.ts` is the artefact that locks in row 1 above.

---

## Out of scope

- The deeper "two types for one entity" smell between `SafeFeature` and `GeoJSONFeature` (research R1, Option B) is **not** addressed here. If pursued, it is a separate, larger refactor with its own spec.
- No changes to `boundsToLeaflet` or `isValidBounds`. Their signatures and bodies are byte-identical between the two copies; no consumer of these helpers needs to change.
