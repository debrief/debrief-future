# Contract: `@debrief/utils` bounds utility (post-consolidation)

**Feature**: 200-bounds-consolidation
**Date**: 2026-04-19
**Scope**: The exported surface of `shared/utils/src/bounds.ts`, re-exported from `@debrief/utils`.

This is not a network/HTTP contract — there is no API to design here. This document captures the **module-level contract** of the consolidated utility: the exact exported symbols, their signatures, and their behavioural guarantees. It is the artefact a reviewer compares the implementation against, and the artefact `tasks.md` will reference for acceptance.

---

## Exported symbols (after this change)

All four exports continue to live at the package root: `import { ... } from '@debrief/utils'`.

### `calculateBounds(features) → Bounds | null`  ⚠ SIGNATURE WIDENED

**Before** (current shared signature):

```ts
function calculateBounds(features: GeoJSONFeature[]): Bounds | null
```

**After** (this work):

```ts
function calculateBounds(
  features: ReadonlyArray<{
    geometry: { type: string; coordinates: unknown } | null | undefined;
  }>
): Bounds | null
```

**Behavioural contract**:

1. Iterates over `features` once. For each `feature`:
   - If `feature.geometry` is `null` or `undefined`, **skip** the feature (no exception, no contribution to the running min/max).
   - Otherwise, dispatch on `feature.geometry.type` and accumulate every well-formed `[lon, lat]` pair into the running min/max.
2. After the loop:
   - If no usable coordinate was ever seen (empty input, or every feature skipped/malformed), return `null`.
   - Otherwise, return `[minLon, minLat, maxLon, maxLat]`.
3. Pure function: no side effects, no mutation of `features` (enforced by `ReadonlyArray<>`).
4. Total over all input shapes accepted by the parameter type — **never throws** for any value of that type.

**Inputs accepted without `as`-cast** (compile-time guarantee):

- `GeoJSONFeature[]` (from `@debrief/utils` types).
- `SafeFeature[]` (from `@debrief/utils` types).
- The VS Code alias `GeoJSONFeature` from `apps/vscode/src/types/import.ts` (which is `SafeFeature` under another name).
- Any other array of objects that structurally matches the parameter shape.

**Behavioural deltas vs. the pre-change shared implementation**:

- ✅ **NEW**: null/undefined `geometry` is skipped instead of throwing on `undefined.coordinates`. This is the previously-VS-Code-only null-guard, now canonical.
- (Otherwise behaviourally identical.)

### `mergeBounds(a, b) → Bounds | null` (UNCHANGED)

```ts
function mergeBounds(a: Bounds | null, b: Bounds | null): Bounds | null
```

**Behavioural contract**:

- If `a` is null, return `b` (which may itself be null).
- If `b` is null, return `a`.
- Otherwise, return the component-wise `[min(a₀,b₀), min(a₁,b₁), max(a₂,b₂), max(a₃,b₃)]`.
- Pure; never throws.

No change. Byte-identical between the two pre-change copies; no migration needed.

### `boundsToLeaflet(bounds) → [[number, number], [number, number]]` (UNCHANGED)

```ts
function boundsToLeaflet(
  bounds: Bounds
): [[number, number], [number, number]]
```

**Behavioural contract**: Returns `[[minLat, minLon], [maxLat, maxLon]]` — Leaflet's `LatLngBoundsLiteral` order ([south, west], [north, east]). No change.

### `isValidBounds(bounds) → boolean` (UNCHANGED)

```ts
function isValidBounds(bounds: Bounds): boolean
```

**Behavioural contract**: Returns `true` iff every coordinate is in valid lon/lat range and `min ≤ max` on both axes. No change.

---

## Removed symbols (after this change)

- The entire local module `apps/vscode/src/utils/bounds.ts` is **deleted**, removing the duplicate exports of `calculateBounds`, `mergeBounds`, `boundsToLeaflet`, `isValidBounds`, and the `Bounds` re-export from that path.
- The duplicate test file `apps/vscode/tests/unit/bounds.test.ts` is **deleted**.
- No other symbol is added or removed in `@debrief/utils`.

---

## Caller-side contract (in `apps/vscode`)

`apps/vscode/src/webview/mapPanel.ts` MUST import bounds helpers via the package root:

```ts
import { calculateBounds, mergeBounds } from '@debrief/utils';
```

It MUST NOT cast its features array at the call site. Its current call shape is preserved:

```ts
const localBounds = calculateBounds(features);
const merged = mergeBounds(existing, localBounds);
```

---

## Verification matrix

Each row is independently verifiable. `tasks.md` (Phase 2) will turn each row into an executable check.

| # | Verification | How | Maps to |
|---|--------------|-----|---------|
| C1 | Exactly one definition of `calculateBounds` and `mergeBounds` exists in the monorepo, in `shared/utils/src/bounds.ts`. | `grep -rn "export function calculateBounds\|export function mergeBounds" .` returns exactly one match each. | SC-001, FR-001 |
| C2 | `apps/vscode` contains no `bounds.ts` or `bounds.test.ts`. | `find apps/vscode -name 'bounds.ts' -o -name 'bounds.test.ts'` returns no rows. | SC-002, FR-003, FR-004 |
| C3 | `mapPanel.ts` imports from `@debrief/utils` (not from a VS Code-local path). | `grep -n "calculateBounds\|mergeBounds" apps/vscode/src/webview/mapPanel.ts` shows the package-root import. | FR-005 |
| C4 | `calculateBounds` accepts `SafeFeature[]` (the type behind `mapPanel.ts`'s features array) without `as`-cast. | `pnpm --filter apps/vscode typecheck` passes with no new errors; manual diff of `mapPanel.ts` shows no new `as` at the call site. | FR-006, US3 |
| C5 | A feature collection containing one feature with `geometry: null` and one with valid `geometry` returns the bounds of the valid one — no exception. | New unit test in `shared/utils/tests/bounds.test.ts`; passes. | FR-002, US2, SC-006 |
| C6 | All other existing call sites continue to compile and behave identically. | Full repo `task verify` passes (lint + typecheck + tests). | FR-007, FR-008 |
| C7 | VS Code map's auto-zoom on plot open is unchanged for a normal plot. | Manual smoke test per `quickstart.md`. | FR-009, US2, SC-005 |
