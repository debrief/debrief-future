# Phase 1 Data Model: Consolidate bounds utilities

**Feature**: `200-bounds-consolidation`
**Date**: 2026-04-18
**Scope**: Type-surface diff only — this refactor introduces **no new entities, no schema changes, no persisted state**.

## Entity inventory

**None.** This feature is a pure internal refactor of utility functions. It does not add, remove, or modify any schema, LinkML class, Pydantic model, STAC asset, file format, or persisted type.

## Type-surface changes

The refactor touches one internal type (the `calculateBounds` parameter shape) and re-uses three already-existing types from `@debrief/utils`. For completeness, the three pre-existing types are summarised here so that reviewers can confirm they remain unchanged.

### Unchanged — `Bounds` (already in `@debrief/utils`)

```typescript
export type Bounds = [number, number, number, number];
// [minLon, minLat, maxLon, maxLat]
```

Source: `shared/utils/src/types.ts:35`. Unchanged by this refactor. Remains the return type of `calculateBounds` and the sole parameter type of `boundsToLeaflet` / `isValidBounds`.

### Unchanged — `GeoJSONFeature` (already in `@debrief/utils`)

```typescript
export interface GeoJSONFeature {
  type: 'Feature';
  id?: string;
  geometry: {
    type: string;
    coordinates: number[] | number[][] | number[][][];
  };
  properties: Record<string, unknown> | null;
}
```

Source: `shared/utils/src/types.ts:14`. Unchanged. `geometry` remains non-nullable here — this type continues to describe "a GeoJSON feature that provably has geometry". The widened `calculateBounds` parameter merely *also* accepts the wider `SafeFeature`; it does not widen `GeoJSONFeature` itself.

### Unchanged — `SafeFeature` (already in `@debrief/utils`)

```typescript
export interface SafeFeature {
  type: 'Feature';
  id?: string | number;
  geometry: SafeGeometry | null;
  properties: Record<string, unknown> | null;
}

export interface SafeGeometry {
  type: string;
  coordinates: unknown;
}
```

Source: `shared/utils/src/types.ts:41-55`. Unchanged. This is the type that the vscode call site passes to `calculateBounds` today (via `parseResult.features: GeoJSONFeature[]` where `GeoJSONFeature` is aliased to `SafeFeature` in `apps/vscode/src/types/import.ts:95`).

### New — `FeatureLikeForBounds` (internal, not exported)

A function-internal structural alias for the widened parameter of `calculateBounds` (and, symmetrically, the input to `extractCoordinates`). Intentionally unexported; callers continue to pass `GeoJSONFeature[]` or `SafeFeature[]` and never name this type.

```typescript
// shared/utils/src/bounds.ts — not re-exported from index.ts
type FeatureLikeForBounds = {
  readonly geometry?: {
    readonly type: string;
    readonly coordinates: unknown;
  } | null;
};
```

**Assignability matrix** (what flows into `calculateBounds` without casts):

| Caller's array element type | Assignable to `FeatureLikeForBounds`? | Why |
|------------------------------|---------------------------------------|-----|
| `GeoJSONFeature` | ✅ Yes | `geometry` is non-optional and non-null — stricter than the parameter's `geometry?: ... \| null`, so trivially assignable. `coordinates: number[] \| ...` is assignable to `coordinates: unknown`. |
| `SafeFeature` | ✅ Yes | `geometry: SafeGeometry \| null` matches exactly. `SafeGeometry.coordinates: unknown` matches exactly. |
| A plain-object literal from `JSON.parse`, shape unknown | ✅ Yes | Any shape with `geometry?.type: string` and `geometry?.coordinates: unknown` matches. |
| A `DebriefFeature` from `@debrief/components` | ✅ Yes (incidentally) | `DebriefFeature` has `geometry: Geometry` (required), which is assignable. Not a goal of this refactor — the `shared/components` `calculateBounds` is a separate function (see research.md Decision 4). |

### Unchanged — `GeoJSONFeatureCollection`, `DebriefFeature`, `DebriefFeatureCollection`, `PositionStyle`, etc.

All other exports from `@debrief/utils` and `@debrief/components` are untouched.

## Validation rules

No new validation rules. The runtime validation inside `calculateBounds` continues to:

1. Skip features where `feature.geometry` is falsy (**new behaviour for the shared copy**, existing behaviour for the vscode copy).
2. In `extractCoordinates`, per-geometry-type cast from `coordinates: unknown` to the expected geometry-specific shape, then filter out coordinates whose `[lon, lat]` pair is not a pair of numbers (length-check plus `typeof … === 'number'`). **Unchanged.**
3. Return `null` when no valid `[lon, lat]` pair was ever accumulated. **Unchanged.**

## State transitions

**None.** `calculateBounds` is a pure function; `mergeBounds` is a pure function; the refactor does not introduce state.

## Relationships

**None** in the sense of entity-relationship modelling. The *code-level* relationships affected are:

- `apps/vscode/src/webview/mapPanel.ts` —  previously depended on `apps/vscode/src/utils/bounds` → now depends on `@debrief/utils`.
- `apps/vscode/tests/unit/bounds.test.ts` — deleted (had a dependency on `apps/vscode/src/utils/bounds`).
- `apps/vscode/src/utils/bounds.ts` — deleted (had no in-tree dependents after the migration above).

## Data-flow diagram

Not applicable — no data entities are introduced, moved, or transformed. The only thing that flows is the feature array at the function boundary, and its shape is unchanged from the caller's perspective.
