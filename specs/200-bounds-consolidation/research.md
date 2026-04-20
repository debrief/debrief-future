# Phase 0 Research: Consolidate bounds utilities into @debrief/utils

**Feature**: 200-bounds-consolidation (v2 post-review)
**Date**: 2026-04-19
**Inputs**: spec.md (v2), plan.md (Technical Context), `apps/vscode/src/utils/bounds.ts`, `shared/utils/src/bounds.ts`, `shared/utils/src/types.ts`, `apps/vscode/src/types/import.ts`, `apps/vscode/src/webview/mapPanel.ts`, `shared/components/src/utils/bounds.ts` (for out-of-scope confirmation).

This document resolves the implementation-choice items deferred by the spec. There are no `[NEEDS CLARIFICATION]` markers in spec v2; the items below are the planning-phase decisions the spec left to here. v2 adds **R6** (narrowing-gate design for FR-007) and **R7** (fitToSelection rewrite ordering) over v1; R2's TDD ordering is corrected.

---

## R1. How should `SafeFeature` and `GeoJSONFeature` be reconciled at the `@debrief/utils` boundary?

### Context

`shared/utils/src/types.ts` defines two related but incompatible feature types:

- `GeoJSONFeature.geometry` is **required**, with concrete coordinate arrays.
- `SafeFeature.geometry` is `SafeGeometry | null` with `coordinates: unknown` (used at JSON.parse / MCP boundaries to avoid `any`).

`apps/vscode/src/types/import.ts` re-exports `SafeFeature` under the alias `GeoJSONFeature`, and `mapPanel.ts` passes arrays of that type into the local `calculateBounds`. The current shared `calculateBounds(features: GeoJSONFeature[])` would not accept `SafeFeature[]` because `SafeFeature.geometry` can be `null`. This is the root cause of the duplication.

FR-006 requires the reconciliation at the `@debrief/utils` boundary.

### Decision

**Widen `calculateBounds`'s parameter to a structural minimum, exposed as a private helper type inside `bounds.ts`.**

Change the signature from:

```ts
export function calculateBounds(features: GeoJSONFeature[]): Bounds | null
```

to:

```ts
// Private to bounds.ts — the structural minimum calculateBounds reads.
// Both GeoJSONFeature and SafeFeature are assignable to this shape.
type BoundsInputFeature = {
  geometry: { type: string; coordinates: unknown } | null | undefined;
};

export function calculateBounds(
  features: ReadonlyArray<BoundsInputFeature>
): Bounds | null
```

`BoundsInputFeature` is **defined inside `bounds.ts`** and **not exported** from the package. It is the minimal shape `calculateBounds` actually reads. `ReadonlyArray<>` is used because the function does not mutate the input.

### Rationale

- **Minimum-surface change.** Only `bounds.ts` is touched; no other module sees a type-shape change. Matches the backlog item's "Low complexity" rating.
- **No `any` introduced.** `unknown` is allowed by Article XV (it is a *real* type that forces narrowing). The narrowing itself is the subject of R6.
- **No new public type to maintain.** `BoundsInputFeature` is a private helper. We do not commit to a third public feature type alongside `GeoJSONFeature` and `SafeFeature`.
- **Both `null` and `undefined` covered.** Lifting the null-guard (R2) catches both.
- **Preserves all existing call sites.** `GeoJSONFeature[]` is a structural subtype of `ReadonlyArray<BoundsInputFeature>`; existing in-`shared/utils` callers and tests continue to compile without change.

### Alternatives considered

- **Option B — reconcile `SafeFeature` and `GeoJSONFeature` inside `@debrief/utils` (shared structural base).** Addresses the deeper "two types for one entity" smell. **Rejected** for this work: (a) much larger blast radius (every consumer of either type sees a type change); (b) conflates a Low-complexity cleanup with a separate, larger refactor; (c) the smell is tracked as a deferred backlog item (spec v2 "Out of Scope").
- **Option C — `as`-cast at the `mapPanel.ts` call site.** Rejected explicitly by FR-006 and by Article XV.

---

## R2. Where does the null-geometry guard live, and in what order are test + guard introduced? *(corrected from v1)*

### Context

The VS Code-local copy contains:

```ts
for (const feature of features) {
  if (!feature.geometry) {
    continue;
  }
  ...
}
```

The shared copy lacks this guard and would throw on a feature with a missing geometry. Spec US2 and FR-002 require the guard to be preserved for every consumer.

v1 of this research stated "write the test first, then lift the guard — the test should fail against today's shared implementation." That framing is **compile-impossible**: today's shared `calculateBounds(features: GeoJSONFeature[])` where `GeoJSONFeature.geometry` is *required* rejects `{ geometry: null }` at compile time. You cannot author the failing test until the parameter has been widened.

### Decision

**Corrected TDD ordering** (three discrete steps, each landable as its own commit):

1. **Widen parameter** (from R1). Pure type change — no runtime behaviour change. At this point, the code still throws on a null-geometry feature at runtime (because `geometry.type` on `null` still throws). The existing tests continue to pass because they never pass a null-geometry input.
2. **Add the failing null-geometry regression test** in `shared/utils/tests/bounds.test.ts`. With the widened parameter from step 1, the test now compiles. Run it: it fails at runtime (the thrown `TypeError`). This proves the test is a real regression test, not a no-op.
3. **Lift the null-guard** into `shared/utils/src/bounds.ts`: add `if (!feature.geometry) continue;` at the top of the per-feature loop. Re-run the test from step 2: it passes.

The regression test asserts:

- No exception is thrown when the input mixes one feature with `geometry: null` and one or more features with valid geometry.
- The returned bounds equal what would be computed from the valid features alone.
- An equivalent assertion for `geometry: undefined` (Article XV-safe, because `BoundsInputFeature.geometry` is `null | undefined`).

### Rationale

- **Strictly safer for every existing caller.** No caller is known to wrap `calculateBounds` in a try/catch for null-geometry handling; `mapPanel.ts` (the one VS Code consumer) depends on the skip-and-continue behaviour.
- **TDD locks in the spec's gating behavioural guarantee.** US2 is the gate that protects users from a regression; encoding it as an executable test in the canonical location is the durable mechanism.
- **Three-step ordering is honest.** A reviewer can walk the commit graph and verify: compile-safe → test-fails → guard-fixes. v1's conflated ordering hid that the first step was a type change, not a behavioural one.

### Alternatives considered

- **Filter at the call site in `mapPanel.ts`.** Rejected — re-creates per-consumer divergence and runs counter to SC-001.
- **Throw a typed error on null geometry.** Rejected — behaviour change, not refactor; would break the only known consumer.

---

## R3. Are there other in-tree consumers of `apps/vscode/src/utils/bounds.ts` that we have not accounted for?

### Context

Risk-of-omission check — if there is a third consumer of the local copy that the spec missed, deletion will break it.

### Decision

There are exactly two consumers, both already accounted for. Repository search at planning time:

```
grep -rn "from.*['\"].*utils/bounds['\"]" apps/vscode/src/ apps/vscode/tests/
→ apps/vscode/src/webview/mapPanel.ts:39 ... from '../utils/bounds'
→ apps/vscode/tests/unit/bounds.test.ts:11 ... from '../../src/utils/bounds'
```

No other file in `apps/vscode/` references the local path. The plan covers both:

- `mapPanel.ts` — flip its import to `@debrief/utils` (FR-005).
- `apps/vscode/tests/unit/bounds.test.ts` — delete (FR-004); coverage subsumed by `shared/utils/tests/bounds.test.ts`.

The local re-export of the `Bounds` type in `apps/vscode/src/utils/bounds.ts` is not a separate consumer concern: `Bounds` is already re-exported from `@debrief/utils`, so any indirect importer can take it from there. Verified by grep: no file outside the deletion targets imports `Bounds` via the `apps/vscode/src/utils/bounds` path.

### Rationale

- FR-003 is safe iff the consumer set is exhaustively enumerated.

### Alternatives considered

- **Leave a re-export shim at the old path.** Rejected — defeats SC-001's intent (it leaves a phantom second source).

---

## R4. Should the `mapPanel.ts` import switch use the package-root specifier or a deep path?

### Context

`@debrief/utils` exposes `calculateBounds` and `mergeBounds` from its `index.ts` (verified).

### Decision

**Use the package-root specifier**:

```ts
import { calculateBounds, mergeBounds } from '@debrief/utils';
```

### Rationale

- Matches the convention established for the `Bounds` type in the deleted file and how other VS Code modules consume `@debrief/utils`.
- Honours package boundaries — consumers depend on the public surface (`index.ts`), not on internal file layout.
- Tree-shaking is preserved; no measurable bundle-size effect.

### Alternatives considered

- **Deep import (`@debrief/utils/src/bounds`).** Rejected — bypasses the package's public surface.

---

## R5. Risk register and mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| A third consumer of the VS Code-local `bounds.ts` exists that grep missed. | Very low | Build-break in `apps/vscode`. | Tasks include a `grep` sweep for both `utils/bounds` and the symbol names across the entire `apps/vscode/` tree before deletion; CI typecheck catches any miss. |
| The widened parameter type inadvertently accepts something the function cannot handle. | Low (addressed by R6). | Silent skip of valid coordinates. | R6 specifies an explicit narrowing gate. `extractCoordinates` returns `[]` for unrecognised geometry types — same behaviour as today for the same inputs. |
| The duplicate VS Code test is the only place a particular behaviour is asserted. | Low | Silent loss of test coverage. | Tasks include a side-by-side diff of the two test files; any unique assertion in the VS Code copy is migrated into the shared test file before the VS Code copy is deleted. |
| Behaviour difference in `mergeBounds` between the two copies. | Very low | Wrong viewport on import. | Side-by-side diff confirmed identical signatures and bodies at planning time. |
| `fitToSelection` rewrite (R7) regresses on Point/LineString selections. | Low | User-visible viewport bug on an exercised code path. | SC-007 test matrix covers every geometry type in isolation; quickstart Step 6 exercises a Point/LineString selection manually. |
| Narrowing gate (R6) introduces a performance regression on large plots. | Very low | User-visible lag on plot open. | Gate is a `typeof` + `Array.isArray` check — microseconds per feature. Performance budget is dominated by coordinate iteration, not by the gate. |
| Prior session's branch `origin/200-bounds-consolidation` (unmerged) lands first and creates a conflict. | Low (no recent activity) | Merge conflict at PR time. | Spec v2 records a supersede decision. Implementation phase should ensure the prior branch is closed before the #200 PR merges. |

---

## R6. Narrowing gate design for FR-007 *(new in v2)*

### Context

FR-007 requires an explicit, reviewable narrowing gate for the untyped `coordinates: unknown` that R1's widened parameter admits. The gate must:

- Live at a single named location at the utility's entry point.
- Produce a typed output before any per-geometry-type branch reads it.
- Use no `any` and no double-cast patterns (`as unknown as X`).
- Be anchored in source to Article XV.5 via comment or named helper (SC-009).

### Decision

**Introduce a single named helper `coerceCoordinates(unknown): CoordinateTree | null` as the narrowing gate**, called exactly once per feature — immediately after the null-guard, before the `switch` on geometry type. Its body uses `Array.isArray` + recursive `typeof` checks; its return type is the pre-change coordinate union.

```ts
// Article XV.5 — explicit narrowing gate. The widened parameter (R1) admits
// `coordinates: unknown`; this function is the single reviewable step that
// converts it to a typed shape. Returns null if the input is not a valid
// coordinate tree (caller treats null as "skip this feature").
type CoordinateTree =
  | number[]          // Point
  | number[][]        // LineString, MultiPoint
  | number[][][]      // Polygon, MultiLineString
  | number[][][][];   // MultiPolygon

function coerceCoordinates(raw: unknown): CoordinateTree | null {
  // Runtime shape check. Uses Array.isArray + typeof; no any, no double-cast.
  // ...
}
```

The `switch (geometry.type)` block that follows takes a **typed** `CoordinateTree` as its payload. Each branch narrows from `CoordinateTree` to the specific sub-type it handles (still using runtime checks; still no `any`). The existing `extractCoordinates` helper is either folded into this shape or kept as a thin wrapper — the tasks phase decides which is cleaner.

### Rationale

- **Single point of entry.** One named function is the reviewable gate — satisfies SC-009's "reviewable in a single location" requirement.
- **Returns `null` on shape mismatch, not throws.** Keeps `calculateBounds`'s contract (never throws) intact.
- **Comment explicitly anchors to Article XV.5.** SC-009 requires the gate to be "anchored by comment" to the constitution article that motivates it.
- **Uses `typeof` and `Array.isArray` only.** These are the project's existing runtime-narrowing idiom (grep `Array.isArray` across the monorepo for prior art); no new library needed.
- **Return type is the pre-change coordinate union.** Downstream code (the switch block) sees exactly the types it sees today — zero semantic change for the existing per-geometry-type branches.

### Alternatives considered

- **Inline narrowing inside the `switch` branches.** Rejected — spreads the narrowing across six locations, defeats SC-009's "single reviewable gate" requirement.
- **`zod` or similar schema-validation library.** Rejected — new runtime dependency (Article IX), overkill for a pure structural check, not the project's existing idiom.
- **User-defined type predicates (`function isX(v: unknown): v is X`) at each branch.** Rejected — spreads the narrowing, conflates "is this a valid coordinate tree?" with "is this specifically a LineString?". The gate's one job is "is this the right tree shape?"; per-branch narrowing is a separate concern.

---

## R7. `fitToSelection` rewrite ordering and selection-to-feature mapping *(new in v2)*

### Context

FR-008 replaces the inline bounds loop in `mapPanel.ts::fitToSelection()` (lines ~430–460) with a call to the consolidated `calculateBounds`. The inline loop is limited to Point + LineString and silently skips everything else; the rewrite fixes that silent miss.

Two design questions:

1. **Ordering relative to the utility work.** Can the rewrite land before or after the import flip (FR-005)? Can it land in the same commit as the flip?
2. **Selection-to-feature mapping.** `fitToSelection` resolves selected IDs against `this.currentFeatures` (typed as `DebriefFeature[]`). Can `DebriefFeature[]` flow into the widened `calculateBounds` parameter?

### Decision

**Ordering**: land the rewrite in the same commit as the import flip. Reasoning:

- The rewrite's new call site is `calculateBounds(selectedFeatures)`. That call is only type-legal after the parameter has been widened (R1).
- The rewrite's correctness is verified by the SC-007 per-geometry-type unit tests, which land in the earlier commit that lifts the null-guard (R2).
- A separate commit for the rewrite would still need the shared test, so splitting adds ceremony without audit value.

**Selection-to-feature mapping**: `DebriefFeature[]` satisfies `BoundsInputFeature`'s structural minimum. `DebriefFeature` is a LinkML-derived union type (TrackFeature | ReferenceLocation | Multi* | annotation features); every variant has a `geometry` property and, where it exists, that geometry has `type: string` + `coordinates`. The structural fit is:

- `DebriefFeature.geometry` on annotation types can be a concrete `Point`/`LineString`/etc. shape — assignable to `{ type: string; coordinates: unknown } | null | undefined` by TypeScript's structural subtyping.
- On features where the LinkML-generated type makes `geometry` required, the optional/nullable widening of `BoundsInputFeature.geometry` still accepts them (widening, not narrowing).

**Caveat**: if a concrete `DebriefFeature` variant defines `geometry` with a shape that `BoundsInputFeature` does not accept (e.g. a discriminated-union where `type` is a literal rather than `string`), TypeScript's structural-subtyping rules still make the literal assignable to `string`. Verified at planning time by spot-checking the generated types in `@debrief/schemas`. If a variant ever diverges, a single-line intersection type at the call site (`selectedFeatures as ReadonlyArray<BoundsInputFeature>`) would defeat FR-006's "no `as`-cast at the call site" — so we would instead revisit R1's widening shape. Likelihood: very low.

### Rationale

- **Single commit reduces ceremony without harming reviewability.** Reviewer reads: "switched one import + rewrote one method to use the thing we just imported." Clear causal chain.
- **Test coverage lands first.** SC-007 tests in the null-guard commit means the rewrite commit has passing tests from first push.
- **No new types at the call site.** `DebriefFeature[]` flows through R1's widening without laundering — exactly what FR-006 demands.

### Alternatives considered

- **Defer the rewrite to a follow-up PR.** Rejected — `/speckit.review` accepted "fold into this PR" for Issue 3; separating it would waste the scoping decision.
- **Land the rewrite in a commit before the widening.** Rejected — not type-legal (the new call site wouldn't compile until R1 landed).
- **Introduce a local adapter type `SelectedFeature = DebriefFeature & BoundsInputFeature`.** Rejected — adds a type for no benefit; TypeScript's structural subtyping handles the assignment for free.

---

## Summary of decisions feeding Phase 1

- **R1**: Widen `calculateBounds` to `ReadonlyArray<BoundsInputFeature>` (a private structural-minimum type). Both `GeoJSONFeature[]`, `SafeFeature[]`, and `DebriefFeature[]` flow through.
- **R2** (*corrected*): Three-step TDD. (1) widen parameter → (2) add failing null-geometry test → (3) lift null-guard. Each step is its own commit.
- **R3**: Two consumers, both accounted for. Sweep with `grep` before deletion; no other action needed.
- **R4**: Import via the `@debrief/utils` package root.
- **R5**: All risks are low; mitigations folded into the task list.
- **R6** *(new)*: Single named helper `coerceCoordinates(unknown): CoordinateTree | null` is the narrowing gate. Anchored by comment to Article XV.5. Returns typed union; null on shape mismatch. No `any`, no double-cast.
- **R7** *(new)*: `fitToSelection` rewrite lands in the same commit as the import flip. `DebriefFeature[]` flows through R1's widening via structural subtyping — no call-site cast.

No NEEDS CLARIFICATION remains. Phase 1 may proceed.
