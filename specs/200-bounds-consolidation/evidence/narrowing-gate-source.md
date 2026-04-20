# Narrowing-gate source evidence (T015 / T021)

**Feature**: 200-bounds-consolidation
**Covers**: C7, C8, FR-007, SC-009.
**Date**: 2026-04-20
**Git SHA**: `94089b5`

---

## Source — the single named narrowing gate

Excerpt from `shared/utils/src/bounds.ts`, lines 38–63:

```ts
/**
 * Article XV.5 — explicit narrowing gate for untyped coordinate input.
 *
 * `calculateBounds`'s widened parameter admits `coordinates: unknown`. This
 * function is the single reviewable step that converts that `unknown` to a
 * typed `CoordinateTree` before any per-geometry-type branch reads it. Uses
 * `Array.isArray` + `typeof` only — no `any`, no double-cast, no external
 * dependency. Returns `null` when the input is not a tree of numbers with
 * depth 1–4 (caller treats `null` as "skip this feature").
 */
function coerceCoordinates(raw: unknown): CoordinateTree | null {
  const depth = detectDepth(raw);
  if (depth === null) {
    return null;
  }
  switch (depth) {
    case 1:
      return raw as number[];
    case 2:
      return raw as number[][];
    case 3:
      return raw as number[][][];
    case 4:
      return raw as number[][][][];
  }
}
```

The function is:

- **Single**: one named helper, one reviewable site.
- **Article XV.5 anchored**: comment references the constitution article
  FR-007 and SC-009 specify.
- **Cast-safe**: the four `as`-casts in the switch are regular (single)
  casts following a full structural validation performed by `detectDepth`.
  They are *not* double-cast (`as unknown as X`) patterns — they convert
  `unknown[]` to a more specific typed shape only after every leaf has
  been confirmed to be a number at runtime.

## Grep evidence — zero `any` and zero double-cast in `bounds.ts`

```
$ grep -nE "\bany\b|as unknown as" shared/utils/src/bounds.ts
43: * typed `CoordinateTree` before any per-geometry-type branch reads it. Uses
44: * `Array.isArray` + `typeof` only — no `any`, no double-cast, no external
```

Both matches are comment-only uses (the word "any" appearing in prose
inside the JSDoc block that documents the gate). No occurrence of the
`any` type and no `as unknown as X` double-cast pattern appears in any
code line.

## Grep evidence — gate is called exactly once from `calculateBounds`

```
$ grep -n "coerceCoordinates\|Article XV" shared/utils/src/bounds.ts
29: * the `coerceCoordinates` narrowing gate (see below) and consumed by the
39: * Article XV.5 — explicit narrowing gate for untyped coordinate input.
48:function coerceCoordinates(raw: unknown): CoordinateTree | null {
72: * "never throws" contract of `coerceCoordinates`.
130:    const coords = coerceCoordinates(feature.geometry.coordinates);
```

- One definition (line 48).
- One call site in `calculateBounds` (line 130), immediately after the
  null-guard and before any per-geometry-type branch reads the result.
- Two JSDoc references (lines 29, 72) and one Article XV.5 anchor
  (line 39).

## Structural contract confirmation

From `coerceCoordinates`'s contract (research R6 + contracts/bounds-utility.md):

- **Never throws.** Verified by the T004 narrowing-gate shape-mismatch
  tests: `coordinates: "oops"`, `null`, `[]`, and `[["x", "y"]]` all
  return `null` bounds without throwing.
- **Returns `null` on shape mismatch.** Verified by the same T004 tests.
- **Returns a typed `CoordinateTree` otherwise.** Verified by the T007
  per-geometry-type tests — Point / LineString / Polygon / MultiPoint /
  MultiLineString / MultiPolygon all produce correct bounds.

## ESLint enforcement

The repository's ESLint configuration carries the `@typescript-eslint/no-explicit-any`
rule at error severity, which enforces SC-009's "zero uses of `any`" in
perpetuity. Any future change that reintroduces `any` in this file would
fail the lint gate and be blocked from merging.

---

*(C7, C8; FR-007; SC-009.)*
