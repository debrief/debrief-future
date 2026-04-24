# Contract: Unified `@debrief/utils/bounds` Module

**Feature**: 219-unify-bounds-utilities
**Phase**: 1 (Design & Contracts)
**Module path**: `shared/utils/src/bounds.ts`
**Exports from package**: `@debrief/utils` (re-exported via `shared/utils/src/index.ts`)

This contract defines the **public surface** of the unified bounds module after this feature lands. Because `@debrief/utils` is a TypeScript library rather than a network service, the "API contract" is the set of exported TypeScript signatures plus their behavioural guarantees.

Every exported symbol below MUST exist with the signature shown. Every "Guarantees" bullet MUST be verifiable by an automated test.

---

## Exported symbols (9 functions + 1 type)

### `type Bounds`

```typescript
export type Bounds = [number, number, number, number];
```

- **Shape**: `[minLon, minLat, maxLon, maxLat]`.
- **Re-exported from**: `shared/utils/src/types.ts`.
- **Unchanged by this feature.**

---

### `calculateBounds`

```typescript
export function calculateBounds(
  features: ReadonlyArray<BoundsInputFeature>
): Bounds | null;
```

Where `BoundsInputFeature` is module-private:

```typescript
type BoundsInputFeature = {
  geometry?: { type: string; coordinates: unknown } | null | undefined;
  bbox?: Bounds | null | undefined;
};
```

**Behavioural guarantees**:

| ID | Guarantee | Verified by |
|----|-----------|-------------|
| CB-1 | Returns `null` for `[]`. | Existing test. |
| CB-2 | Returns `null` when every feature has `null` / `undefined` geometry and no valid `bbox`. | New test (migrated). |
| CB-3 | Skips features with `null` / `undefined` geometry. | Existing test. |
| CB-4 | For features carrying a **valid** pre-computed `feature.bbox` (array, `length >= 4`, first four elements `Number.isFinite`), the fast-path is taken — the coordinate walk is NOT executed for that feature. | FR-011 new test: set `bbox = [0, 0, 5, 5]` and `geometry.coordinates` describing a different extent; assert the result matches the `bbox`-derived extent. |
| CB-5 | For features whose `bbox` is absent, malformed (wrong length, non-finite element), or non-array, the coordinate walk runs for that feature; no throw. | FR-011 companion test: `bbox = [NaN, 0, 10, 10]` → coordinate walk runs; `bbox = [1, 2, 3]` (length 3) → walk runs. |
| CB-6 | For features without `feature.bbox`, output is byte-identical to the pre-change `@debrief/utils` `calculateBounds` (FR-010 — no common-path regression). | Existing test suite (unmodified) continues to pass. |
| CB-7 | Accepts `DebriefFeature[]`, `DebriefFeatureCollection.features`, `SafeFeature[]`, `GeoJSONFeature[]`, and `BoundsInputFeature[]` at the call site without `as`-cast (FR-016). | Compile-time type-check test file (`shared/utils/tests/bounds.types.test-d.ts`, using `expectTypeOf`). |
| CB-8 | Produces correct bounds for all 6 GeoJSON geometry types (Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon). | Existing `@debrief/utils` test suite. |
| CB-9 | Never throws. | Existing test T006 (no-throw on malformed input). |

**Input-signature note**: `DebriefFeatureCollection` is NOT accepted directly in the parameter type. Callers passing a collection unwrap via `features.features` or `Array.isArray(x) ? x : x.features`. This matches existing `@debrief/utils` `calculateBounds` behaviour; the `shared/components` pre-unification version accepted collections directly — **this is a deliberate contract narrowing**. Consumer-migration tasks (Phase 2) wrap callers that pass collections. FR-019 byte-identical-output guarantee is preserved because `MapView` and other affected callers are updated to unwrap explicitly.

---

### `mergeBounds`

```typescript
export function mergeBounds(a: Bounds | null, b: Bounds | null): Bounds | null;
```

**Unchanged by this feature.** Guarantees preserved as-is.

---

### `boundsToLeaflet`

```typescript
export function boundsToLeaflet(
  bounds: Bounds
): [[number, number], [number, number]];
```

**Unchanged by this feature.** Guarantees preserved as-is.

---

### `isValidBounds`

```typescript
export function isValidBounds(bounds: Bounds): boolean;
```

**Unchanged by this feature.** Guarantees preserved as-is.

---

### `expandBounds`

```typescript
export function expandBounds(
  bounds: Bounds,
  paddingPercent?: number
): Bounds;
```

- **Default**: `paddingPercent = 0.1` (10 %).
- **New to `@debrief/utils`** (migrated from `shared/components`).

**Behavioural guarantees**:

| ID | Guarantee | Verified by |
|----|-----------|-------------|
| EB-1 | For `paddingPercent = 0.1` and `bounds = [0, 0, 10, 10]`, returns `[-1, -1, 11, 11]`. | Migrated test. |
| EB-2 | For `paddingPercent = 0`, returns `bounds` unchanged in value. | Migrated test. |
| EB-3 | For zero-width or zero-height bounds, pads are zero on that axis (no division by zero). | Migrated test. |

---

### `isPointInBounds`

```typescript
export function isPointInBounds(
  lon: number,
  lat: number,
  bounds: Bounds
): boolean;
```

- **New to `@debrief/utils`** (migrated from `shared/components`).

**Behavioural guarantees**:

| ID | Guarantee | Verified by |
|----|-----------|-------------|
| PIB-1 | Returns `true` when the point is strictly inside the bounds. | Migrated test. |
| PIB-2 | Returns `true` for points on the bound edges (inclusive). | Migrated test. |
| PIB-3 | Returns `false` for points outside. | Migrated test. |

---

### `bboxOverlapsViewport`

```typescript
export function bboxOverlapsViewport(
  itemBbox: Bounds,
  viewportBbox: Bounds
): boolean;
```

- **New to `@debrief/utils`** (migrated from `shared/components`).

**Behavioural guarantees**:

| ID | Guarantee | Verified by |
|----|-----------|-------------|
| BOV-1 | Standard AABB overlap when neither bbox crosses the antimeridian. | Migrated test. |
| BOV-2 | Correct overlap detection when the item bbox crosses the antimeridian (`itemBbox[0] > itemBbox[2]`). | Migrated test. |
| BOV-3 | Correct overlap detection when the viewport bbox crosses the antimeridian. | Migrated test. |
| BOV-4 | Returns `true` when both bboxes cross the antimeridian (they always overlap longitudinally). | Migrated test. |
| BOV-5 | Edge-touching (shared edge) counts as overlapping. | Migrated test. |
| BOV-6 | Latitude-only separation returns `false` regardless of longitude. | Migrated test. |

---

### `viewportToBounds`

```typescript
import type { ViewportPolygon } from '@debrief/schemas';

export function viewportToBounds(
  viewport: ViewportPolygon
): Bounds | null;
```

- **New to `@debrief/utils`** (migrated from `shared/components`).
- **Introduces type-only dep** of `@debrief/utils` on `@debrief/schemas` (see research R-003).

**Behavioural guarantees**:

| ID | Guarantee | Verified by |
|----|-----------|-------------|
| VTB-1 | For a non-rotated 4-corner polygon, returns the axis-aligned enclosing bounds. | Migrated test. |
| VTB-2 | For a rotated 4-corner polygon, returns the axis-aligned enclosing rectangle (AABB). | Migrated test. |
| VTB-3 | Returns `null` for degenerate polygons (zero longitudinal or latitudinal extent). | Migrated test. |
| VTB-4 | Correctly handles the object-form `{ longitude, latitude }` coordinate shape (FR-022 regression from #130). | Migrated test. |

---

### `filterBySpatialExtent`

```typescript
export function filterBySpatialExtent<T extends { bbox: Bounds | null }>(
  items: readonly T[],
  viewportBbox: Bounds
): T[];
```

- **New to `@debrief/utils`** (migrated from `shared/components`).

**Behavioural guarantees**:

| ID | Guarantee | Verified by |
|----|-----------|-------------|
| FBSE-1 | Excludes items whose `bbox` is `null`. | Migrated test. |
| FBSE-2 | Returns items whose `bbox` overlaps `viewportBbox` (per `bboxOverlapsViewport`). | Migrated test. |
| FBSE-3 | Preserves the generic type parameter — return type is `T[]`, not `{ bbox: ... }[]`. | Migrated test. |

---

## Non-goals (explicit)

The following symbols are **NOT** exported from the unified module, despite being referenced in the pre-unification `shared/components` implementation:

| Symbol | Disposition | Rationale |
|--------|-------------|-----------|
| `BoundsInputFeature` | Not exported | R-001 decision — keeping the shape private preserves flexibility to extend structurally without committing to a public contract. |
| `CoordinateTree` | Not exported | Module-internal narrowing product. |
| `extractAllCoordinates` (old private helper) | Deleted | Replaced by `@debrief/utils`'s stronger `coerceCoordinates` + `extractCoordinates` pipeline. |
| `DebriefFeature`, `SafeFeature`, `GeoJSONFeature`, `ViewportPolygon` (re-exports) | NOT re-exported (FR-018) | Consumers import these from their canonical locations (`@debrief/schemas` / `@debrief/utils/types`). |

---

## Barrel re-export (`@debrief/components`)

To satisfy FR-013 / SC-006, the `shared/components/src/index.ts` barrel MUST continue to export the four symbols it currently re-exports (`calculateBounds`, `bboxOverlapsViewport`, `filterBySpatialExtent`, `viewportToBounds`). After this feature, those are re-exported **from `@debrief/utils`** rather than from the deleted local copy:

```typescript
// shared/components/src/index.ts (barrel — representative snippet)
export {
  calculateBounds,
  bboxOverlapsViewport,
  filterBySpatialExtent,
  viewportToBounds,
} from '@debrief/utils';
```

`expandBounds` and `isPointInBounds` were NOT previously re-exported from `@debrief/components` and MUST NOT be newly re-exported (keeps the `@debrief/components` surface minimal; callers that want them import from `@debrief/utils` directly).

---

## Contract test manifest

The following test files MUST exist after this feature lands (for `/speckit.tasks` to enumerate):

| File | Purpose | New / Modified / Deleted |
|------|---------|--------------------------|
| `shared/utils/tests/bounds.test.ts` | Absorbs migrated assertions + fast-path test | Modified (grows) |
| `shared/utils/tests/bounds.types.test-d.ts` | Compile-time type assertions for FR-016 (CB-7) | **New** |
| `shared/components/src/utils/bounds.test.ts` | Was home to viewportToBounds / bboxOverlapsViewport / filterBySpatialExtent | **Deleted** |
| `shared/components/src/utils/__tests__/utils.test.ts` | `calculateBounds` / `expandBounds` / `isPointInBounds` blocks removed | Modified (shrinks) |

---

## Package manifest changes

| File | Change |
|------|--------|
| `shared/utils/package.json` | Add `"@debrief/schemas": "workspace:*"` to `dependencies`. |
| `shared/utils/src/index.ts` | Add 5 new re-exports (expandBounds, isPointInBounds, bboxOverlapsViewport, viewportToBounds, filterBySpatialExtent). |
| `shared/components/package.json` | No change (already depends on `@debrief/utils` transitively). Confirm dep is declared (not just present in lockfile). |
| `shared/components/src/index.ts` | Update barrel to re-export from `@debrief/utils`. |
