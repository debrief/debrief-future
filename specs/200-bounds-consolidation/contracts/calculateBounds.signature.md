# Contract: `calculateBounds` signature (post-refactor)

**Feature**: `200-bounds-consolidation`
**Date**: 2026-04-18

This feature has no API endpoints, no MCP tools, no JSON contract, and no schema file. Its public surface is a single TypeScript function signature exported from `@debrief/utils`. This document pins that signature as the behavioural/type contract that the refactor must deliver.

## Canonical location

`shared/utils/src/bounds.ts` — re-exported through `shared/utils/src/index.ts` as part of `@debrief/utils`.

## Signature

```typescript
// shared/utils/src/bounds.ts

/**
 * Calculate bounds from an array of features that may or may not have geometry.
 *
 * Features whose `geometry` is null or undefined are silently skipped.
 * Returns null if no feature contributed a valid [lon, lat] pair.
 *
 * @param features Array of features (GeoJSONFeature[], SafeFeature[], or any
 *                 structurally compatible shape)
 * @returns Bounds [minLon, minLat, maxLon, maxLat] or null
 */
export function calculateBounds(
  features: ReadonlyArray<{
    readonly geometry?: {
      readonly type: string;
      readonly coordinates: unknown;
    } | null;
  }>
): Bounds | null;
```

## Signature of `mergeBounds` (unchanged)

```typescript
export function mergeBounds(
  a: Bounds | null,
  b: Bounds | null
): Bounds | null;
```

## Signature of `boundsToLeaflet` (unchanged)

```typescript
export function boundsToLeaflet(
  bounds: Bounds
): [[number, number], [number, number]];
```

## Signature of `isValidBounds` (unchanged)

```typescript
export function isValidBounds(bounds: Bounds): boolean;
```

## Behavioural contract (what `calculateBounds` MUST do)

| Input | Expected output |
|-------|-----------------|
| `[]` | `null` |
| `[{ geometry: { type: 'Point', coordinates: [10, 20] }, ... }]` | `[10, 20, 10, 20]` |
| `[{ geometry: { type: 'LineString', coordinates: [[0,0],[10,10],[5,15]] }, ... }]` | `[0, 0, 10, 15]` |
| `[{ geometry: { type: 'Point', coordinates: [-10, -20] } }, { geometry: { type: 'LineString', coordinates: [[5,5],[15,25]] } }]` | `[-10, -20, 15, 25]` |
| `[{ geometry: { type: 'Polygon', coordinates: [[[0,0],[10,0],[10,10],[0,10],[0,0]]] } }]` | `[0, 0, 10, 10]` |
| `[{ geometry: null }]` | `null` *(new — all features skipped)* |
| `[{}]` (geometry field omitted) | `null` *(new — falsy geometry skipped)* |
| `[{ geometry: null }, { geometry: { type: 'LineString', coordinates: [[0,0],[10,10]] } }]` | `[0, 0, 10, 10]` *(new — null skipped, valid retained)* |
| `[{ geometry: { type: 'LineString', coordinates: [] } }]` | `null` *(empty coords contribute nothing)* |

The first five rows lock in the existing behaviour inherited from `shared/utils/src/bounds.ts` (FR-008 bit-for-bit guarantee). The three `(new)` rows lock in the null-guard lift (FR-002).

## Type-compatibility contract (what MUST type-check at call sites)

All of the following calls MUST type-check under `strict: true` without any new `as` casts, `// @ts-expect-error`, or `// eslint-disable-*` on the call-site line:

```typescript
// apps/vscode/src/webview/mapPanel.ts
import { calculateBounds, mergeBounds } from '@debrief/utils';
import type { GeoJSONFeature } from '../types/import';   // alias of SafeFeature
const parseResult: { features: GeoJSONFeature[] } = /* ... */;
const newBounds = calculateBounds(parseResult.features);   // ✅ must compile
const merged = mergeBounds(currentPlot.bbox, newBounds);   // ✅ must compile

// shared/utils/tests/bounds.test.ts
import type { GeoJSONFeature } from '../src/types.js';
const features: GeoJSONFeature[] = [ /* ... */ ];
const bounds = calculateBounds(features);   // ✅ must compile
```

## Out-of-scope for this contract

- The `shared/components/src/utils/bounds.ts` `calculateBounds` (distinct function, `DebriefFeature`-typed, different signature — see research.md Decision 4). Not touched by this refactor and not referenced by this contract.
- Any change to `Bounds`, `GeoJSONFeature`, `SafeFeature`, or `SafeGeometry` type declarations.
- Any change to the private `extractCoordinates` helper's behaviour (its signature does change to accept `{ type: string; coordinates: unknown }` — narrowing via per-case casts — but its output for all existing inputs is identical).
