# Data Model: Unify `shared/components` bounds utilities with `@debrief/utils`

**Feature**: 219-unify-bounds-utilities
**Phase**: 1 (Design & Contracts)
**Date**: 2026-04-21

This feature is a code-refactor: it introduces no persisted data, no schema evolution, and no new LinkML classes. The "data model" captured here is the set of **TypeScript types** that the unified `@debrief/utils/bounds` module reads, produces, and passes through. Each entity is classified as:

- **Unchanged** — the type exists before this feature and is not modified by it.
- **Extended** — the type exists and gains one or more fields.
- **New** — the type is introduced by this feature.

No persisted-data validation or state transitions apply.

---

## Entities

### 1. `Bounds` — *Unchanged*

**Canonical location**: `shared/utils/src/types.ts`
**Public?**: Yes — exported from `@debrief/utils`.
**Shape**: `[number, number, number, number]` — `[minLon, minLat, maxLon, maxLat]`.
**Consumed by**: every helper in the unified module; every consumer of the unified module.
**Produced by**: `calculateBounds`, `mergeBounds`, `expandBounds`, `viewportToBounds`.
**Validation**: `isValidBounds(bounds): boolean` — checks lat/lon ranges and that min ≤ max.

No change introduced by this feature.

---

### 2. `BoundsInputFeature` — *Extended*

**Canonical location**: `shared/utils/src/bounds.ts` (module-private, not exported — per R-001 decision).
**Public?**: No — structural-minimum shape used as the `calculateBounds` parameter type.

**Current shape** (before this feature):

```typescript
type BoundsInputFeature = {
  geometry?: { type: string; coordinates: unknown } | null | undefined;
};
```

**Extended shape** (after this feature, per R-004):

```typescript
type BoundsInputFeature = {
  geometry?: { type: string; coordinates: unknown } | null | undefined;
  bbox?: Bounds | null | undefined;
};
```

**Why extended**: Enables the pre-computed `bbox` fast-path (R-002) without any `as`-cast at the read site. Every in-tree feature family (`DebriefFeature`, `SafeFeature`, `GeoJSONFeature`) structurally admits `bbox?: Bounds | null | undefined` because LinkML models `bbox` as an optional 4-tuple on every Feature and FeatureCollection and both hand-written families do too.

**Structural subtyping guarantee**: No caller needs to change to pass `DebriefFeature[]`, `SafeFeature[]`, or `GeoJSONFeature[]` — all three are assignable to `ReadonlyArray<BoundsInputFeature>` both before and after the extension.

**Validation rules** (applied at read time by `calculateBounds`):

| Field | Rule | On violation |
|-------|------|--------------|
| `geometry` | `null \| undefined` → skip feature | (silent skip — unchanged) |
| `geometry.coordinates` | Narrowed by `coerceCoordinates` gate | Returns `null` → feature skipped |
| `bbox` | Must be `Array.isArray`, `length >= 4`, and `bbox[0..3].every(Number.isFinite)` | Fast-path declined; coordinate walk runs for this feature |

---

### 3. `ViewportPolygon` — *Unchanged* (but newly imported into `@debrief/utils`)

**Canonical location**: `shared/schemas/src/generated/typescript/` (LinkML-generated).
**Public?**: Yes — exported from `@debrief/schemas`.
**Shape**: `{ coordinates: ReadonlyArray<{ longitude: number; latitude: number }> }` — a 4-corner closed polygon ordered `[NW, NE, SE, SW]`.
**Consumed by**: `viewportToBounds` (only).
**Validation**: The polygon must have exactly 4 corners; degenerate polygons (zero area) return `null` from `viewportToBounds`.

**What changes in this feature**: `@debrief/utils` starts importing this type (type-only import). See R-003 for the package-dep rationale. The type itself is unchanged.

---

### 4. `CoordinateTree` — *Unchanged*

**Canonical location**: `shared/utils/src/bounds.ts` (module-private).
**Public?**: No.
**Shape**: `number[] | number[][] | number[][][] | number[][][][]`.
**Role**: Output of the `coerceCoordinates` narrowing gate (Article XV.5). Consumed by `extractCoordinates`.

No change introduced by this feature.

---

### 5. `FilterBySpatialExtentInput<T>` — *New (implicit generic constraint)*

**Canonical location**: `shared/utils/src/bounds.ts` (inlined in function signature — no standalone type alias).
**Public?**: Yes — via the `filterBySpatialExtent` function signature: `<T extends { bbox: Bounds | null }>`.
**Role**: The generic constraint that describes the item shape `filterBySpatialExtent` operates on.

**Why listed here**: This is the only *new* publicly-observable type constraint this feature introduces into `@debrief/utils`. It mirrors the existing `shared/components` signature byte-for-byte (FR-006) — it's listed as "new" only because `@debrief/utils` did not previously host this helper.

**No runtime representation**: The generic parameter is erased at compile time. No validation rules, no state.

---

## Removed Entities

These types were either private to the deleted `shared/components/src/utils/bounds.ts` or are removed in favour of the unified equivalents.

| Removed | Location | Replacement |
|---------|----------|-------------|
| `extractAllCoordinates(coords: unknown): number[][]` (private helper) | `shared/components/src/utils/bounds.ts` | Unused after deletion — replaced by `@debrief/utils`'s `coerceCoordinates` + `extractCoordinates` pipeline (stronger typing, Article XV.5 narrowing gate). |
| `typeof feature & { bbox?: number[] }` (inline intersection) | `shared/components/src/utils/bounds.ts` line 57 | Replaced by the extended `BoundsInputFeature` shape (R-004). |

---

## Relationships

```
BoundsInputFeature ──► calculateBounds ──► Bounds | null
                                             │
                                             ├──► mergeBounds ──► Bounds | null
                                             ├──► expandBounds ──► Bounds
                                             ├──► isPointInBounds ──► boolean
                                             ├──► boundsToLeaflet ──► [[number, number], [number, number]]
                                             └──► isValidBounds ──► boolean

ViewportPolygon    ──► viewportToBounds ──► Bounds | null
Bounds × Bounds    ──► bboxOverlapsViewport ──► boolean
ReadonlyArray<T>   ──► filterBySpatialExtent ──► T[]
  where T extends { bbox: Bounds | null }
```

No cycles. `BoundsInputFeature` is consumed, never produced; `Bounds` is both produced and consumed (it composes).

---

## Type-safety invariants (enforced by the module)

1. **No `any` anywhere** (Article XV.2) — verified by pyright-equivalent (`tsc --noEmit --strict`).
2. **Single narrowing gate for `unknown` coordinates** (Article XV.5) — `coerceCoordinates` is the only place that converts `unknown` to `CoordinateTree`.
3. **New narrowing gate for `unknown` bbox** — `isValidBboxTuple` is the only place that confirms a value is a usable `Bounds`. Both gates return boolean type predicates; neither uses `as`.
4. **No re-export of schema types** (FR-018) — the module does not re-export `DebriefFeature`, `SafeFeature`, `GeoJSONFeature`, or `ViewportPolygon`. Consumers import those from their canonical sources.

---

## LinkML impact

**None.** No `.yaml` sources change. No schema generation re-runs. Article II is trivially satisfied: the unified module consumes a LinkML-generated type (`ViewportPolygon`) as a type-only import from `@debrief/schemas`; the feature does not introduce, rename, or modify any schema class.
