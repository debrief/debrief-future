# Before / After: Bounds Utility Consolidation

## (a) `shared/utils/src/bounds.ts` — public surface before and after

### Before (4 exported functions)

```typescript
export function calculateBounds(features: ReadonlyArray<BoundsInputFeature>): Bounds | null
export function mergeBounds(a: Bounds | null, b: Bounds | null): Bounds | null
export function boundsToLeaflet(bounds: Bounds): [[number, number], [number, number]]
export function isValidBounds(bounds: Bounds): boolean
```

No `expandBounds`, `isPointInBounds`, `bboxOverlapsViewport`, `viewportToBounds`,
or `filterBySpatialExtent`. No pre-computed bbox fast-path.

### After (9 exported functions)

```typescript
export function calculateBounds(features: ReadonlyArray<BoundsInputFeature>): Bounds | null
  // + pre-computed bbox fast-path (FR-008)
  // + BoundsInputFeature.bbox field extended to ReadonlyArray<number> | null | undefined
export function mergeBounds(a: Bounds | null, b: Bounds | null): Bounds | null
export function boundsToLeaflet(bounds: Bounds): [[number, number], [number, number]]
export function isValidBounds(bounds: Bounds): boolean
export function expandBounds(bounds: Bounds, paddingPercent?: number): Bounds
export function isPointInBounds(lon: number, lat: number, bounds: Bounds): boolean
export function bboxOverlapsViewport(itemBbox: Bounds, viewportBbox: Bounds): boolean
export function viewportToBounds(viewport: ViewportPolygon): Bounds | null
export function filterBySpatialExtent<T extends { bbox: Bounds | null }>(
  items: readonly T[], viewportBbox: Bounds): T[]
```

---

## (b) Deleted: `shared/components/src/utils/bounds.ts`

| Stat | Value |
|------|-------|
| Lines | 215 |
| Exported functions | 6 (`calculateBounds`, `expandBounds`, `isPointInBounds`, `bboxOverlapsViewport`, `viewportToBounds`, `filterBySpatialExtent`) |
| Why deleted | All 6 functions now hosted in `shared/utils/src/bounds.ts`; duplicate implementation removed |
| Replacement | `import { ... } from '@debrief/utils'` |

The duplicate `calculateBounds` in the deleted file used `as`-casts for bbox access
(`feature as typeof feature & { bbox?: number[] }`). The unified implementation
uses the extended `BoundsInputFeature.bbox` field and the `isValidBboxTuple` narrowing
predicate — zero `as`-casts (Article XV compliance).

---

## (c) `shared/components/src/index.ts` barrel — zero consumer-visible rename

### Before

```typescript
export { calculateBounds, bboxOverlapsViewport, filterBySpatialExtent, viewportToBounds }
  from './utils/bounds';
```

### After

```typescript
export { calculateBounds, bboxOverlapsViewport, filterBySpatialExtent, viewportToBounds }
  from '@debrief/utils';
```

The exported symbol names are **identical**. Zero churn for external consumers
(SC-006): no `import` statement in `apps/vscode/`, `apps/web-shell/`, or
`apps/loader/` needed to change.
