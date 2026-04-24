# Research: Unify `shared/components` bounds utilities with `@debrief/utils`

**Feature**: 219-unify-bounds-utilities
**Phase**: 0 (Outline & Research)
**Status**: Complete — no [NEEDS CLARIFICATION] markers remain
**Date**: 2026-04-21

This document resolves the five open design questions carried from the spec. Each research item (R-###) states the question, the options considered, the decision, the rationale, and any knock-on implication for the Phase 1 design.

---

## R-001 — Input-type contract for the unified `calculateBounds`

**Question**: The two pre-unification implementations disagree on the input type. `@debrief/utils` uses a **structural-minimum** `BoundsInputFeature` (`{ geometry?: { type: string; coordinates: unknown } | null }`). `shared/components` uses a **nominal LinkML** `DebriefFeatureCollection | DebriefFeature[]` signature. Which wins for the unified module?

**Options considered**:

| Option | Summary | Type safety | Coupling | Migration cost |
|--------|---------|-------------|----------|----------------|
| A — Keep structural-minimum `BoundsInputFeature` (current `@debrief/utils`) | Widest input; accepts `DebriefFeature`, `SafeFeature`, `GeoJSONFeature`, and any future LinkML-derived variant via TS structural subtyping. Existing narrowing gate (`coerceCoordinates`) provides Article XV.5 compliance. | High — `unknown` is narrowed at one explicit gate; no `any` anywhere. | Zero coupling to `@debrief/schemas`. | Consumers need no change (structural subtyping). |
| B — Adopt nominal `DebriefFeature[]` (promote current `shared/components` signature) | Forces all callers (including VS Code extension callers today passing `SafeFeature[]`) to convert. | High at call sites but requires runtime conversion at MCP / JSON boundaries. | `@debrief/utils` takes a hard dep on `@debrief/schemas`. | HIGH — VS Code extension `mapPanel.ts` currently passes `SafeFeature` through generic MCP; would need converters. |
| C — TypeScript overloads (accept both) | Two signatures; resolved at compile time. | High. | Same coupling as B. | Moderate — but overloads hide which branch actually runs, hurting readability. |
| D — Union input type (`DebriefFeature[] \| SafeFeature[] \| GeoJSONFeature[] \| BoundsInputFeature[]`) | Explicit enumerated union. | High. | Hard dep on `@debrief/schemas`. | Moderate — TS union narrowing at call site can be awkward. |

**Decision**: **Option A** — keep structural-minimum `BoundsInputFeature`, extended to include the optional `bbox` field for R-002.

**Rationale**:
1. Option A already works today for `@debrief/utils` consumers (VS Code `mapPanel.ts`). SC-006 requires zero call-site churn for those.
2. Structural subtyping means `DebriefFeature[]`, `SafeFeature[]`, and `GeoJSONFeature[]` all assign to `ReadonlyArray<BoundsInputFeature>` without `as`-casts — FR-016 is satisfied automatically.
3. Avoids a new hard dep from `@debrief/utils` onto `@debrief/schemas` for this signature. (R-003 discusses the `ViewportPolygon` case which needs a separate decision.)
4. Keeps `@debrief/utils` schema-agnostic — supports Article II (schema is the contract but `@debrief/utils` is a generic utility package, not a schema consumer).

**Implications for Phase 1**:
- `BoundsInputFeature` stays private to `shared/components/utils/bounds.ts`... wait — it stays private to `shared/utils/src/bounds.ts`. **No export.**
- Extended with `bbox?: Bounds | null` (see R-002).
- Data model doc lists it as a "module-private shape" not a "public entity".
- Quickstart doc explicitly states "pass any `DebriefFeature[]`, `SafeFeature[]`, or `GeoJSONFeature[]` — structural match is automatic".

**Alternative kept in reserve**: If a future feature needs first-class public typing for the three families (e.g. `#212` landing LinkML-generated `SafeFeature`), Option D can retrofit without breaking A.

---

## R-002 — Pre-computed `bbox` fast-path: trigger shape and fallback rules

**Question**: Feature #211 (absorbed here) says "honour `feature.bbox` when present". What counts as "present and valid"? What happens when the `bbox` is malformed?

**Options considered**:

| Option | `bbox` present rule | Malformed `bbox` behaviour | Risk |
|--------|---------------------|----------------------------|------|
| A — Permissive: any truthy `bbox`, skip feature on malform | `feature.bbox != null` | Entire feature skipped; bounds do not include it. | Data loss if bbox is wrong — silent hole in fit. |
| B — Strict-shape: require `length >= 4` and all finite numbers, fall back to coord walk otherwise | `Array.isArray(bbox) && bbox.length >= 4 && bbox.slice(0,4).every(Number.isFinite)` | Falls back to `extractCoordinates`. | Slightly more work at runtime; no data loss. |
| C — Exact-shape: require `length === 4` AND all finite AND in valid lat/lon ranges, else fall back | Same as B plus range check | Falls back to coord walk. | Most pedantic; matches `isValidBounds()` semantics. Useful guard against garbage bboxes from untrusted JSON. |

**Decision**: **Option B** — length-and-finiteness check, fall back to coordinate walk on malform.

**Rationale**:
1. Matches current `shared/components` behaviour (which checks `bbox.length >= 4`) with one addition: it also rejects non-finite entries (`NaN`, `Infinity`) which `shared/components` does not. Non-finite entries in a `bbox` would contaminate the reducer's `Math.min`/`Math.max` — this is a latent bug in the current implementation that the unification can trivially fix.
2. Option C's range check belongs in `isValidBounds()` (already exported). Callers who want strict validation can compose: `if (isValidBounds(feature.bbox as Bounds)) { fast-path } else { slow-path }`. Baking it into `calculateBounds` over-constrains the helper.
3. Article I.3 ("no silent failures") — Option A silently drops features with malformed bbox. Option B recovers gracefully. Article I wins.

**Implications for Phase 1**:
- Contract for `calculateBounds` adds the trigger rule to the docstring: *"If `feature.bbox` is an array of length ≥ 4 whose first four elements are all finite numbers, the fast-path is taken. Otherwise (including `undefined`, `null`, wrong length, or any non-finite element), the coordinate walk runs for that feature."*
- FR-011 test sets `bbox = [NaN, 0, 10, 10]` and verifies the coordinate walk runs (not the fast-path) — guarantees the finiteness check is enforced.
- A new private helper `isValidBboxTuple(bbox: unknown): bbox is Bounds` is introduced to centralise the check (Article XV.5 — narrowing gate).

---

## R-003 — `ViewportPolygon` import: `@debrief/schemas` dep vs structural redeclaration

**Question**: `viewportToBounds` consumes `ViewportPolygon` from `@debrief/schemas`. `@debrief/utils` today imports nothing from `@debrief/schemas`. Which approach is best for the unified module?

**Options considered**:

| Option | Approach | Coupling | Type fidelity | Risk |
|--------|----------|----------|---------------|------|
| A — Add `@debrief/schemas` as a dep of `@debrief/utils` and `import type { ViewportPolygon }` | Direct import of the LinkML-generated type. | `@debrief/utils` → `@debrief/schemas`. | Highest — the function accepts exactly the schema-typed viewport. | Creates a package cycle risk if `@debrief/schemas` ever imports from `@debrief/utils` (currently doesn't). Must verify no cycle. |
| B — Redeclare a structural-minimum `ViewportPolygonLike` shape locally | Mirror: `{ coordinates: ReadonlyArray<{ longitude: number; latitude: number }> }`. | Zero. | Lower — drifts if LinkML schema evolves. | Silent drift if the schema changes; same class of bug this feature is fixing. |
| C — Move `viewportToBounds` to a new sub-module like `@debrief/utils/spatial` that has the `@debrief/schemas` dep | Scope the dep to just this one function. | Moderate. | Highest. | Fragments the unification work; contradicts the single-canonical-module goal. |

**Decision**: **Option A** — add `@debrief/schemas` as a `@debrief/utils` dependency and `import type { ViewportPolygon }` at the top of `shared/utils/src/bounds.ts`.

**Rationale**:
1. `@debrief/schemas` is the authoritative source for `ViewportPolygon`. Redeclaring (Option B) is the very class of drift this feature eliminates — to solve bounds drift by introducing viewport drift would be perverse.
2. The dep is **type-only** (`import type`), so there is zero runtime impact and zero bundle-size impact.
3. Package-cycle check: `@debrief/schemas` (per `shared/schemas/package.json` — verified at plan time) has no dependency on `@debrief/utils`. Adding `@debrief/utils → @debrief/schemas` is an acyclic addition.
4. The coupling is already transitively present: every app consuming `@debrief/utils` (VS Code, web-shell, loader) already pulls `@debrief/schemas` via `@debrief/components`. The dep graph edge is being made explicit, not created.

**Implications for Phase 1**:
- `shared/utils/package.json` gains `"@debrief/schemas": "workspace:*"` in `dependencies`.
- `shared/utils/src/bounds.ts` adds `import type { ViewportPolygon } from '@debrief/schemas';` at the top.
- Contract for `viewportToBounds` documents the dep explicitly.
- A one-line check in Phase 2 tasks: verify no cycle introduced (via `pnpm why @debrief/utils` from `shared/schemas/`).

**Alternative kept in reserve**: Option C (spatial sub-module) if a later feature needs to isolate schema-aware utilities from schema-agnostic ones. Not justified now.

---

## R-004 — Pre-computed `bbox` fast-path: type-safe access pattern (no `as any`)

**Question**: The current `shared/components` implementation uses `const featureWithBbox = feature as typeof feature & { bbox?: number[] };` to read `bbox`. Under Article XV, how does the unified module read `bbox` without a type assertion?

**Options considered**:

| Option | Pattern | Article XV-compliant? | Readability |
|--------|---------|----------------------|-------------|
| A — Extend `BoundsInputFeature` to include `bbox?: Bounds \| null` | The reader accesses `feature.bbox` directly — no cast. | ✅ Yes — all `any` avoided, no `as` used. | High — the shape declares what it reads. |
| B — Type-guard helper `hasBbox(feature): feature is T & { bbox: Bounds }` | Compact but introduces an extra abstraction. | ✅ Yes | Moderate. |
| C — `in` operator: `if ('bbox' in feature && ...)` | TS narrows to `feature & { bbox: unknown }`; still needs R-002's finite check. | ✅ Yes | Lower — verbose at call site. |

**Decision**: **Option A** — extend the `BoundsInputFeature` shape to include `bbox?: Bounds | null`.

**Rationale**:
1. Consistency with R-001: the input contract is already a structural minimum; adding one more optional field is the same pattern.
2. Structural subtyping makes it work: every LinkML feature type already admits `bbox?: Bounds | null | undefined` (LinkML models `bbox` on Feature and FeatureCollection). `SafeFeature` and `GeoJSONFeature` do too. Therefore, no existing caller's type fails to assign.
3. The private `isValidBboxTuple` narrowing from R-002 provides the runtime guard; TS has only to see `unknown`-like at the entry, a typed `Bounds` after the guard. No `as` needed.

**Implications for Phase 1**:
- `BoundsInputFeature` becomes: `{ geometry?: ...; bbox?: Bounds | null | undefined }`.
- `calculateBounds` body: `if (feature.bbox !== undefined && feature.bbox !== null && isValidBboxTuple(feature.bbox)) { /* fast-path */ }`.
- Zero `as`, zero `any`. Passes Article XV CI gate.

---

## R-005 — Test migration strategy

**Question**: Five helper-specific test blocks currently live across two files in `shared/components/src/utils/`:
1. `__tests__/utils.test.ts` — `calculateBounds` (~53 lines), `expandBounds` (~9 lines), `isPointInBounds` (~12 lines) tests.
2. `bounds.test.ts` — `viewportToBounds` (~97 lines), `bboxOverlapsViewport` (~100 lines), `filterBySpatialExtent` (~45 lines) tests.

How are these migrated to `shared/utils/tests/bounds.test.ts` without rewriting the assertions?

**Options considered**:

| Option | Approach | Risk of drift | Work |
|--------|----------|---------------|------|
| A — Copy-paste intact; update imports; delete originals in one atomic commit | Move as-is; only `import` paths change. | Zero (identical assertions). | Low. |
| B — Rewrite using `@debrief/utils`'s existing test style | Harmonise with `shared/utils/tests/bounds.test.ts` conventions. | Moderate — any rewrite introduces the risk of changing the assertion. | High. |
| C — Leave tests in place and point them at `@debrief/utils` imports | Zero move; only imports change. | Zero. | Violates SC-001 / FR-014 — tests for a `@debrief/utils` symbol shouldn't live in `@debrief/components`. |

**Decision**: **Option A** — copy the test blocks verbatim into `shared/utils/tests/bounds.test.ts`, update the import paths, delete the origin files in the same commit.

**Rationale**:
1. Zero drift risk (Article I.4 — reproducibility). The test assertions ARE the contract for the five helpers. Changing them risks drifting the contract.
2. `vitest` is the test runner in both packages today — no syntax or API differences to reconcile.
3. SC-003 (zero net loss of assertions) is trivially satisfied by Option A.

**Implications for Phase 1**:
- Quickstart doc includes a short "test migration" note confirming the tests move verbatim.
- Task generation (Phase 2, via `/speckit.tasks`) creates:
  - T-MIG-1: Copy test blocks from `shared/components/src/utils/__tests__/utils.test.ts` + `shared/components/src/utils/bounds.test.ts` into `shared/utils/tests/bounds.test.ts`, updating imports.
  - T-MIG-2: Delete `shared/components/src/utils/bounds.test.ts` and the `calculateBounds`/`expandBounds`/`isPointInBounds` `describe` blocks from `__tests__/utils.test.ts`.
  - T-FAST-1: Add new fast-path test (FR-011).

**Alternative kept in reserve**: If the migrated tests duplicate assertions already present in `shared/utils/tests/bounds.test.ts` (e.g. basic `calculateBounds` coverage), those duplicates are deleted rather than retained — to be identified during T-MIG-1 execution, not during planning.

---

## Summary

| ID | Topic | Decision | Phase 1 impact |
|----|-------|----------|----------------|
| R-001 | Input type | Structural-minimum `BoundsInputFeature` | Data model |
| R-002 | Fast-path trigger | Length ≥ 4 + finite elements, else fall back | Contract + private narrowing helper |
| R-003 | `ViewportPolygon` import | Add `@debrief/schemas` type-only dep to `@debrief/utils` | package.json + import stmt |
| R-004 | Fast-path type safety | Extend `BoundsInputFeature` with `bbox?` | Data model |
| R-005 | Test migration | Verbatim copy + delete origins | Task breakdown (Phase 2) |

**All NEEDS CLARIFICATION resolved.** Ready for Phase 1.
