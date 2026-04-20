# Contract: `@debrief/utils` bounds utility (post-consolidation, v2)

**Feature**: 200-bounds-consolidation
**Date**: 2026-04-19
**Scope**: The exported surface of `shared/utils/src/bounds.ts` (re-exported from `@debrief/utils`) **and** the new internal call contract of `apps/vscode/src/webview/mapPanel.ts::fitToSelection()`.

This is not a network/HTTP contract — there is no API to design here. This document captures the **module-level contract** of the consolidated utility and of the one call site being rewritten, together with the **narrowing-gate contract** introduced by FR-007. It is the artefact a reviewer compares the implementation against, and the artefact `tasks.md` will reference for acceptance.

---

## Exported symbols (after this change)

All four exports continue to live at the package root: `import { ... } from '@debrief/utils'`.

### `calculateBounds(features) → Bounds | null`  ⚠ SIGNATURE WIDENED

**Before**:

```ts
function calculateBounds(features: GeoJSONFeature[]): Bounds | null
```

**After**:

```ts
function calculateBounds(
  features: ReadonlyArray<{
    geometry: { type: string; coordinates: unknown } | null | undefined;
  }>
): Bounds | null
```

**Behavioural contract**:

1. Iterates over `features` once. For each `feature`:
   - If `feature.geometry` is `null` or `undefined`, **skip** the feature (no exception, no contribution to the running min/max). *(FR-002, R2 null-guard)*
   - Otherwise, pass `feature.geometry.coordinates` through `coerceCoordinates` (the narrowing gate — see below). If the gate returns `null`, **skip** the feature. *(FR-007, R6)*
   - Otherwise, dispatch on `feature.geometry.type` and accumulate every well-formed `[lon, lat]` pair into the running min/max.
2. After the loop:
   - If no usable coordinate was ever seen (empty input, or every feature skipped), return `null`.
   - Otherwise, return `[minLon, minLat, maxLon, maxLat]`.
3. Pure function: no side effects, no mutation of `features` (enforced by `ReadonlyArray<>`).
4. Total over all input shapes accepted by the parameter type — **never throws** for any value of that type.

**Inputs accepted without `as`-cast** (compile-time guarantee via structural subtyping):

- `GeoJSONFeature[]` (from `@debrief/utils` types).
- `SafeFeature[]` (from `@debrief/utils` types).
- `DebriefFeature[]` (from `@debrief/schemas` — LinkML-derived union).
- The VS Code alias `GeoJSONFeature` from `apps/vscode/src/types/import.ts` (which is `SafeFeature` under another name).

**Behavioural deltas vs. the pre-change shared implementation**:

- ✅ **NEW**: null/undefined `geometry` is skipped instead of throwing. (The previously-VS-Code-only null-guard, now canonical.)
- ✅ **NEW**: malformed `coordinates` (shape mismatch caught by `coerceCoordinates`) is skipped instead of throwing or producing wrong bounds. Pre-change this was implicit in the switch's fall-through; now it is an explicit single-gate decision.
- (Otherwise behaviourally identical.)

### `coerceCoordinates(raw: unknown) → CoordinateTree | null`  ⚠ NEW PRIVATE HELPER

Private to `bounds.ts`; not exported from `@debrief/utils`.

**Signature**:

```ts
type CoordinateTree =
  | number[]          // Point
  | number[][]        // LineString, MultiPoint
  | number[][][]      // Polygon, MultiLineString
  | number[][][][];   // MultiPolygon

function coerceCoordinates(raw: unknown): CoordinateTree | null;
```

**Behavioural contract**:

1. **Never throws.** Returns `null` for any input that is not a tree of numbers with depth 1–4.
2. Returns `raw` narrowed to `CoordinateTree` otherwise.
3. Uses `Array.isArray` and `typeof v === 'number'` only — no `any`, no double-cast (`as unknown as X`), no external dependency.
4. **Stateless; pure.** Called exactly once per feature in `calculateBounds`.

**Why it is the narrowing gate (FR-007, SC-009)**:

- Single named location → one line for a reviewer to inspect. SC-009's "reviewable in a single location" requirement is satisfied.
- Typed return type → every downstream branch reads `CoordinateTree`, never `unknown`. Article XV.5's "every point where untyped data enters the system MUST validate through a typed model before the data is used in application code" is honoured.
- Anchored by comment to Article XV.5 at its definition site (FR-007 requirement).

### `mergeBounds(a, b) → Bounds | null` (UNCHANGED)

```ts
function mergeBounds(a: Bounds | null, b: Bounds | null): Bounds | null
```

Returns component-wise `[min(a₀,b₀), min(a₁,b₁), max(a₂,b₂), max(a₃,b₃)]` with null-passthrough on either input. Byte-identical between the two pre-change copies; no migration needed.

### `boundsToLeaflet(bounds) → [[number, number], [number, number]]` (UNCHANGED)

```ts
function boundsToLeaflet(bounds: Bounds): [[number, number], [number, number]]
```

Returns `[[minLat, minLon], [maxLat, maxLon]]` — Leaflet's `LatLngBoundsLiteral` order. No change.

### `isValidBounds(bounds) → boolean` (UNCHANGED)

```ts
function isValidBounds(bounds: Bounds): boolean
```

Returns `true` iff every coordinate is in valid lon/lat range and `min ≤ max` on both axes. No change.

---

## Removed symbols

- The entire local module `apps/vscode/src/utils/bounds.ts` is **deleted**, removing the duplicate exports of `calculateBounds`, `mergeBounds`, `boundsToLeaflet`, `isValidBounds`, and the `Bounds` re-export from that path.
- The duplicate test file `apps/vscode/tests/unit/bounds.test.ts` is **deleted**.
- No other symbol is added or removed in `@debrief/utils`.

---

## Caller-side contracts (in `apps/vscode`)

### Plot-open path — `mapPanel.ts` import flip (FR-005)

`apps/vscode/src/webview/mapPanel.ts` MUST import bounds helpers via the package root:

```ts
import { calculateBounds, mergeBounds } from '@debrief/utils';
```

It MUST NOT cast its features array at the call site. Its current call shape is preserved:

```ts
const newBounds = calculateBounds(parseResult.features);  // parseResult.features: SafeFeature[]
const mergedBounds = mergeBounds(currentPlot.bbox, newBounds);
```

### Selection-zoom path — `fitToSelection()` rewrite (FR-008, US4)

**Before** (inline loop, ~30 LOC, Point+LineString only):

```ts
let minLat = Infinity; let maxLat = -Infinity;
let minLng = Infinity; let maxLng = -Infinity;
for (const feature of selectedFeatures) {
  const geom = feature.geometry as { type: string; coordinates: unknown };
  if (geom.type === 'LineString') { /* ... */ }
  else if (geom.type === 'Point') { /* ... */ }
  // else: silently skipped — the bug US4 fixes
}
this.fitBounds([[minLat, minLng], [maxLat, maxLng]]);
```

**After** (one-line utility call):

```ts
const bounds = calculateBounds(selectedFeatures);   // selectedFeatures: DebriefFeature[]
if (bounds === null) return;                        // preserves unchanged-viewport fallback (FR-009)
this.fitBounds(boundsToLeaflet(bounds));
```

**Contract guarantees**:

- Every geometry type supported by `calculateBounds` (Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon) contributes to the selection's viewport. *(FR-008, US4 acceptance scenarios 2–4)*
- A selection containing only null-geometry features resolves to `bounds === null` → early-return → unchanged viewport. *(US4 acceptance scenario 5, edge case)*
- An empty selection hits the existing early-return **before** `calculateBounds` is called — no change in map viewport. *(FR-009, US4 acceptance scenario 6)*
- No `as`-cast at the call site — `DebriefFeature[]` flows through R1's widening via structural subtyping. *(FR-006, US3 — generalised to the selection path)*

---

## Verification matrix

Each row is independently verifiable. `tasks.md` (Phase 2) will turn each row into an executable check.

| # | Verification | How | Maps to |
|---|--------------|-----|---------|
| C1 | Exactly one definition of `calculateBounds` and `mergeBounds` exists under `shared/utils/` and `apps/` (excluding `shared/components/`). | `grep -rn "export function calculateBounds\|export function mergeBounds" shared/utils apps/` returns exactly one match each. | SC-001, FR-001 |
| C2 | `apps/vscode` contains no `bounds.ts` or `bounds.test.ts`. | `find apps/vscode -name 'bounds.ts' -o -name 'bounds.test.ts'` returns no rows. | SC-002, FR-003, FR-004 |
| C3 | `mapPanel.ts` imports from `@debrief/utils`. | `grep -n "calculateBounds\|mergeBounds" apps/vscode/src/webview/mapPanel.ts` shows the package-root import. | FR-005 |
| C4 | `calculateBounds` accepts `SafeFeature[]` and `DebriefFeature[]` without `as`-cast. | `pnpm --filter apps/vscode typecheck` passes; manual diff of `mapPanel.ts` shows no new `as` at either call site. | FR-006, US3 |
| C5 | Null-geometry feature in a mixed collection returns the bounds of the valid features — no exception. | New unit test in `shared/utils/tests/bounds.test.ts`; passes. | FR-002, US2, SC-006 |
| C6 | Each of Point / LineString / Polygon / MultiPoint / MultiLineString / MultiPolygon produces correct non-null bounds in isolation. | Six new unit tests in `shared/utils/tests/bounds.test.ts`; all pass. | FR-008, US4, SC-007 |
| C7 | `calculateBounds` returns `null` (not throws) for features whose `coordinates` is a shape `coerceCoordinates` rejects. | New unit test: `coordinates: "oops"`, `null`, `[]`, `[["x"]]` → `null` bounds. | FR-007, SC-009, R6 |
| C8 | The narrowing gate is a single named function with a comment anchoring it to Article XV.5; contains no `any` and no `as unknown as X`. | Code-review inspection of `shared/utils/src/bounds.ts`; enforced in perpetuity by the repo's ESLint `no-explicit-any` rule. | FR-007, SC-009 |
| C9 | `fitToSelection` with a Point+LineString-only selection zooms to the same viewport as before. | Manual smoke test per quickstart Step 7. | FR-008 (regression path), US4 AS-1, SC-008 |
| C10 | `fitToSelection` with a selection containing Polygon and/or MultiPolygon zooms to the selected extent (not the pre-change Point+LineString subset). | Manual smoke test per quickstart Step 7. | FR-008, US4 AS-2/AS-3, SC-008 |
| C11 | `fitToSelection` with an empty selection leaves the viewport unchanged. | Manual smoke test per quickstart Step 7; existing code path not touched by the rewrite. | FR-009, US4 AS-6 |
| C12 | Other call sites of `calculateBounds`/`mergeBounds`/`boundsToLeaflet`/`isValidBounds` continue to compile and behave identically. | Full repo `task verify` passes (lint + typecheck + tests). | FR-010, FR-011 |
| C13 | VS Code map auto-zoom on plot open is unchanged for a normal plot. | Manual smoke test per quickstart Step 6. | FR-012, US2, SC-005 |
