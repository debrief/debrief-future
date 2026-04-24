# Quickstart: Unified `@debrief/utils/bounds` Module

**Feature**: 219-unify-bounds-utilities
**Audience**: contributors working anywhere in the monorepo who need to compute, merge, expand, or filter-by spatial bounds.
**Before this feature**: bounds helpers lived in two places with diverging behaviour. After: one module, one import path.

---

## TL;DR

```typescript
import {
  calculateBounds,
  mergeBounds,
  expandBounds,
  isPointInBounds,
  bboxOverlapsViewport,
  viewportToBounds,
  filterBySpatialExtent,
  boundsToLeaflet,
  isValidBounds,
  type Bounds,
} from '@debrief/utils';
```

All nine bounds helpers live in `@debrief/utils`. Pass any feature type you like — `DebriefFeature`, `SafeFeature`, `GeoJSONFeature` — `calculateBounds` accepts them all via structural subtyping (no casts needed).

---

## Consumer migration (one-time)

If your file imports from `@debrief/components` for `calculateBounds`, `bboxOverlapsViewport`, `filterBySpatialExtent`, or `viewportToBounds`: **no change required**. The `@debrief/components` barrel continues to re-export those four symbols from `@debrief/utils`.

If your file imports from `@debrief/components` for `expandBounds` or `isPointInBounds`: switch to `@debrief/utils`. (These were not previously re-exported from `@debrief/components` anyway.)

If your file imports directly from `shared/components/src/utils/bounds` (relative path): update to `@debrief/utils`. This path is removed by this feature.

```diff
-import { calculateBounds, expandBounds } from '../utils/bounds';
+import { calculateBounds, expandBounds } from '@debrief/utils';
```

---

## What changed behaviourally

**Only one change is visible at runtime**:

- `calculateBounds` now honours a pre-computed `feature.bbox` (if present and valid) and skips the per-coordinate walk for that feature. This matches what `shared/components`'s `calculateBounds` always did; it's new to `@debrief/utils`.

**Everything else is byte-identical** to the pre-unification implementations. FR-019 / FR-020 / FR-021 explicitly forbid any other observable change.

---

## Which feature types can I pass to `calculateBounds`?

Any feature shape that carries `geometry?: { type: string; coordinates: unknown } | null` and optionally `bbox?: Bounds | null`. That structural minimum covers:

| Type family | Defined in | Pass-through works? |
|-------------|-----------|---------------------|
| `DebriefFeature[]` (LinkML-generated union) | `@debrief/schemas` | ✅ |
| `DebriefFeatureCollection.features` | `@debrief/schemas` | ✅ (unwrap the collection yourself) |
| `SafeFeature[]` | `@debrief/utils/types` | ✅ |
| `GeoJSONFeature[]` | `@debrief/utils/types` | ✅ |
| Any future LinkML-derived Feature subtype | `@debrief/schemas` | ✅ (structural match is automatic) |

**Note on `DebriefFeatureCollection`**: unlike the old `shared/components` version, the unified `calculateBounds` does NOT accept a FeatureCollection object directly — pass `collection.features` instead. This is the only call-site signature tightening in the feature; `MapView` and any other collection-passing caller is updated in the same PR.

---

## Example: typical `MapView` fit-to-selection

```typescript
import {
  calculateBounds,
  expandBounds,
  boundsToLeaflet,
} from '@debrief/utils';

function fitMapToFeatures(map: L.Map, features: DebriefFeature[]): void {
  const bounds = calculateBounds(features);
  if (bounds === null) return;

  const padded = expandBounds(bounds, 0.1);
  map.fitBounds(boundsToLeaflet(padded));
}
```

## Example: pre-computed `bbox` fast-path

```typescript
import { calculateBounds } from '@debrief/utils';

// STAC items with pre-computed bboxes
const stacItems = [
  { geometry: { type: 'Polygon', coordinates: [/* … */] }, bbox: [-10, 40, 0, 50] },
  { geometry: { type: 'Polygon', coordinates: [/* … */] }, bbox: [-5, 45, 5, 55] },
];

// Fast-path: no coordinate walk executed; bounds derived from `bbox` alone.
const bounds = calculateBounds(stacItems);
// → [-10, 40, 5, 55]
```

If a `bbox` is malformed (wrong length, `NaN` / `Infinity` entries), the call silently falls back to walking that feature's coordinates — no throw, no data loss.

## Example: spatial filter on a STAC browser

```typescript
import {
  viewportToBounds,
  filterBySpatialExtent,
} from '@debrief/utils';

const viewportBbox = viewportToBounds(currentViewport);
if (viewportBbox !== null) {
  const visibleItems = filterBySpatialExtent(catalogItems, viewportBbox);
  // visibleItems: CatalogItem[] — T preserved
}
```

---

## Type safety

- **No `any`** anywhere in the module — Article XV.2 compliant.
- **Two narrowing gates** — `coerceCoordinates` for untyped `coordinates`; `isValidBboxTuple` for untyped `bbox`. Both are type-predicate functions (no `as` casts).
- **Compile-time type tests** live at `shared/utils/tests/bounds.types.test-d.ts` and verify every feature family assigns without cast (FR-016 / contract CB-7).

---

## Where the tests live

- **Implementation tests**: `shared/utils/tests/bounds.test.ts` — all runtime behavioural assertions for the nine helpers, including the new pre-computed-`bbox` fast-path test.
- **Type-level tests**: `shared/utils/tests/bounds.types.test-d.ts` — `expectTypeOf` assertions that `DebriefFeature[]`, `SafeFeature[]`, `GeoJSONFeature[]` all assign without cast.
- **Indirect E2E coverage**: existing `MapView` and `StacBrowser` Storybook stories / Playwright specs continue to exercise the consumers and therefore the migrated helpers.

---

## Troubleshooting

### "Type `DebriefFeatureCollection` is not assignable to parameter of type `BoundsInput`"

This error means you have an older build of `@debrief/utils`. Since FR-001,
`calculateBounds` accepts both `DebriefFeatureCollection` and plain feature
arrays directly — no `.features` unwrap required. Rebuild:

```bash
pnpm --filter @debrief/utils build
```

If the error persists after rebuilding, confirm you're importing from
`@debrief/utils` (not a stale local copy of the deleted
`shared/components/src/utils/bounds.ts`).

### "Module not found: `shared/components/src/utils/bounds`"

Your file still imports from the deleted path. Switch to `@debrief/utils`.

### The fast-path is firing when I don't want it to

Strip `bbox` before calling:

```typescript
const featuresWithoutBbox = features.map(({ bbox: _bbox, ...rest }) => rest);
const bounds = calculateBounds(featuresWithoutBbox);
```

This is intentional — there is no "force re-compute" flag on `calculateBounds` (spec Edge Cases).

---

## Further reading

- Feature spec: [spec.md](./spec.md)
- Research decisions: [research.md](./research.md)
- Module contract: [contracts/bounds-module.md](./contracts/bounds-module.md)
- Data-model entities: [data-model.md](./data-model.md)
