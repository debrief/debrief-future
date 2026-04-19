# Phase 0 Research: Consolidate bounds utilities into @debrief/utils

**Feature**: 200-bounds-consolidation
**Date**: 2026-04-19
**Inputs**: spec.md, plan.md (Technical Context), `apps/vscode/src/utils/bounds.ts`, `shared/utils/src/bounds.ts`, `shared/utils/src/types.ts`, `apps/vscode/src/types/import.ts`, `apps/vscode/src/webview/mapPanel.ts`

This document resolves the open implementation choices identified in the spec and the plan's Technical Context. There are no `[NEEDS CLARIFICATION]` markers in the spec; the items below are the planning-phase decisions the spec deferred to here.

---

## R1. How should `SafeFeature` and `GeoJSONFeature` be reconciled at the `@debrief/utils` boundary?

**Context**: `shared/utils/src/types.ts` defines two related but incompatible feature types:

- `GeoJSONFeature.geometry` is **required** with concrete coordinate arrays.
- `SafeFeature.geometry` is `SafeGeometry | null` with `coordinates: unknown` (used at JSON.parse / MCP boundaries to avoid `any`).

`apps/vscode/src/types/import.ts` re-exports `SafeFeature` under the alias `GeoJSONFeature`, and `mapPanel.ts` passes arrays of that type into the local `calculateBounds`. The current shared `calculateBounds(features: GeoJSONFeature[])` would not accept `SafeFeature[]` because `SafeFeature.geometry` can be `null`. This is the root cause of the duplication.

The spec (FR-006) calls for the reconciliation to happen at the `@debrief/utils` boundary, with two acceptable sub-options.

### Decision

**Option A — Widen `calculateBounds`'s parameter to a structural minimum.**

Change the signature from:

```ts
export function calculateBounds(features: GeoJSONFeature[]): Bounds | null
```

to a structurally-minimum input type that accepts both `GeoJSONFeature[]` and `SafeFeature[]`:

```ts
type BoundsFeature = {
  geometry: { type: string; coordinates: unknown } | null | undefined;
};

export function calculateBounds(
  features: ReadonlyArray<BoundsFeature>
): Bounds | null
```

`BoundsFeature` is a local helper type **defined inside `bounds.ts`** (not exported from the package). It is the minimal shape `calculateBounds` actually reads. Both `GeoJSONFeature` and `SafeFeature` are structural supertypes of this shape (modulo nullability), so both flow through with no `as`-cast at the call site. Inside the function, the existing `extractCoordinates` helper already accepts `{ type: string; coordinates: number[] | number[][] | number[][][] }` — we keep its internal contract by narrowing `coordinates: unknown` to the existing union via a single typed boundary inside `extractCoordinates` (which already does runtime shape-checks per geometry type, so the narrowing is empirically sound).

`ReadonlyArray<>` is used because the function does not mutate the input; it costs nothing and slightly improves the call-site contract.

### Rationale

- **Minimum-surface change.** Only `bounds.ts` is touched; no other module sees a type-shape change. This matches the backlog item's "Low complexity" rating and the `199 / 201 / 202 / E11 / E12` parallelisation note.
- **No `any` introduced.** `unknown` is allowed by Article XV (it is a *real* type that forces narrowing); the existing `extractCoordinates` already performs runtime type checks (`typeof point[0] === 'number'`) that constitute a typed boundary. We make this narrowing explicit at the entry to the switch.
- **No new public type to maintain.** `BoundsFeature` is a private helper. We do not commit to a third public feature type alongside `GeoJSONFeature` and `SafeFeature`.
- **Both `null` and `undefined` covered.** Lifting the null-guard (R2) catches both.
- **Preserves all existing call sites.** `GeoJSONFeature[]` is a structural subtype of `ReadonlyArray<BoundsFeature>` (its required `geometry` is assignable to the optional/nullable one), so the existing in-`shared/utils` callers and tests continue to compile without change.

### Alternatives considered

- **Option B — Reconcile `SafeFeature` and `GeoJSONFeature` inside `@debrief/utils` (shared structural base).** This would address the deeper "two types for one entity" smell flagged in the prior code-quality audit. **Rejected** for this work because: (a) it has a much larger blast radius (every consumer of either type potentially sees a type change); (b) it conflates this Low-complexity cleanup with a separate, larger refactor; (c) the audit-flagged smell is independently tracked and should land as its own item to keep PRs reviewable. The prior session's `200-bounds-consolidation` branch (commit `b55c1d7e`) is consistent with this reasoning — we should not expand scope here.
- **Option C — `as`-cast at the `mapPanel.ts` call site.** Rejected explicitly by FR-006 (and by Article XV — `as`-casts launder type information). This is also the very smell the duplication arose to avoid; reintroducing it at the call site would defeat the purpose of consolidation.

---

## R2. Where does the null-geometry guard live, and how is its behaviour locked in?

**Context**: The VS Code-local copy contains:

```ts
for (const feature of features) {
  if (!feature.geometry) {
    continue;
  }
  ...
}
```

The shared copy lacks this guard and would throw (or compute over `undefined.coordinates`) on a feature with a missing geometry. The spec's User Story 2 and FR-002 require the guard to be preserved for every consumer.

### Decision

1. **Lift the guard into `shared/utils/src/bounds.ts`**, in the canonical `calculateBounds` loop, with the **same semantics** as the VS Code copy: any feature whose `geometry` is `null` or `undefined` is skipped silently and the rest of the collection still contributes to the bounds. The widened parameter type from R1 already permits `geometry: ... | null | undefined`, so the guard is `if (!feature.geometry) continue;` exactly as in the VS Code copy.
2. **Add a regression test** in `shared/utils/tests/bounds.test.ts` that:
   - Calls `calculateBounds` with a feature collection mixing one feature whose `geometry` is `null` (or `undefined`) and one or more valid features.
   - Asserts: (a) no exception is thrown; (b) the returned bounds equal what would be computed from the valid features alone.
3. **Write the test first** (TDD, per Article VII). Before lifting the guard, the test should fail against the current shared implementation (proving it is a real regression test and not a no-op). After lifting the guard, it must pass.

### Rationale

- **Strictly safer for every existing caller.** No caller of the shared `calculateBounds` is known to wrap it in a try/catch for null-geometry handling, and `mapPanel.ts` (the one VS Code consumer) already depends on the skip-and-continue behaviour. Lifting the guard reduces the surface for silent breakage.
- **TDD locks in the spec's gating behavioural guarantee.** User Story 2 is the gate that protects users from a regression; encoding it as an executable test in the canonical location is the durable mechanism.
- **No call-site changes.** Once the guard is in `@debrief/utils`, deleting the VS Code-local guard (which is in the file that gets deleted anyway) requires zero further work.

### Alternatives considered

- **Filter at the call site in `mapPanel.ts`.** Rejected — this re-creates per-consumer divergence (the next consumer of the shared utility would have to know to filter too) and runs counter to the spec's "single canonical implementation" goal.
- **Throw a typed error on null geometry instead of skipping.** Rejected — this is a behaviour change, not a refactor. It would break the only known consumer and would require coordinated changes outside this work's scope. If thrown errors are ever the right behaviour, that is a separate, intentional change with its own spec.

---

## R3. Are there other in-tree consumers of `apps/vscode/src/utils/bounds.ts` that we have not accounted for?

**Context**: Risk-of-omission check — if there is a third consumer of the local copy that the spec missed, deletion will break it.

### Decision

There are exactly two consumers, both already accounted for. Repository search at planning time:

```
grep -rn "from.*['\"].*utils/bounds['\"]" apps/vscode/src/ apps/vscode/tests/
→ apps/vscode/src/webview/mapPanel.ts:39: ... from '../utils/bounds'
→ apps/vscode/tests/unit/bounds.test.ts:11:} from '../../src/utils/bounds'
```

No other file in `apps/vscode/` references the local path. The plan covers both:

- `mapPanel.ts` — flip its import to `@debrief/utils` (FR-005).
- `apps/vscode/tests/unit/bounds.test.ts` — delete (FR-004); coverage subsumed by `shared/utils/tests/bounds.test.ts`.

The local re-export of the `Bounds` type from `apps/vscode/src/utils/bounds.ts` (`export type { Bounds };`, line 11) is **not** a separate consumer concern: `Bounds` is already re-exported from `@debrief/utils` (the local file just re-re-exports the same symbol), so any indirect importer can take it from `@debrief/utils` directly. A `grep` for `import.*Bounds.*from.*['\"].*utils/bounds['\"]` should return zero results outside the deletion targets; if it returns any, those imports must be flipped to `@debrief/utils` in the same PR.

### Rationale

- The deletion in FR-003 is safe iff the consumer set is fully enumerated. The grep output above is exhaustive for the `bounds` symbol path under `apps/vscode/`.

### Alternatives considered

- **Leave a re-export shim in place at the old path.** Rejected — this defeats the consolidation's purpose (it leaves a phantom second source). The whole point of FR-003 is that there is **no** local `bounds.ts` in `apps/vscode/` after the change.

---

## R4. Should the `mapPanel.ts` import switch use the package-root specifier or a deep path?

**Context**: `@debrief/utils` exposes `calculateBounds` and `mergeBounds` from its `index.ts` (verified). The new import in `mapPanel.ts` could be either `from '@debrief/utils'` (package root) or a deep path.

### Decision

**Use the package-root specifier**: `import { calculateBounds, mergeBounds } from '@debrief/utils';`

### Rationale

- Matches the convention already established for `Bounds` in the deleted file, and matches how other VS Code modules consume `@debrief/utils` symbols.
- Honours package boundaries — consumers depend on the public surface (`index.ts`), not on file-internal paths.
- Tree-shaking with the project's bundler is preserved; no measurable bundle-size effect from importing two named symbols from the package root rather than a deep path.

### Alternatives considered

- **Deep import (`@debrief/utils/src/bounds`)**. Rejected — bypasses the package's public surface and creates a coupling to internal layout.

---

## R5. Risk register and mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| A third consumer of the VS Code-local `bounds.ts` exists that grep missed (e.g. dynamic import, string-built path). | Very low | Build-break in `apps/vscode`. | Tasks include a `grep` sweep for both `utils/bounds` and the symbol names `calculateBounds`/`mergeBounds` across the entire `apps/vscode/` tree before deletion; CI typecheck would catch any miss before merge. |
| The widened parameter type (R1, Option A) inadvertently accepts something the function cannot handle (e.g. a feature with a coordinate shape `extractCoordinates` does not branch on). | Low | Silent skip of valid coordinates. | `extractCoordinates` already returns an empty array for unrecognised geometry types — the same behaviour as today for the same inputs. No regression; behaviour is preserved. |
| The duplicate VS Code test is the only place a particular behaviour is asserted (i.e. coverage is **not** fully subsumed by the shared test file). | Low | Silent loss of test coverage. | Tasks include a side-by-side diff of the two test files; any unique assertion in the VS Code copy is migrated into the shared test file before the VS Code copy is deleted. (Spot-check: the two test files differ only in the import path per the spec; this is a one-pass verification, not a research task.) |
| Behaviour difference in `mergeBounds` between the two copies. | Very low | Wrong viewport on import. | Side-by-side diff of `mergeBounds` in both files: identical signatures, identical bodies. No drift. (Confirmed in Read of both files at planning time.) |
| The prior session's branch `200-bounds-consolidation` (unmerged) lands first and creates a conflict with this work. | Low (no recent activity) | Merge conflict at PR time. | The spec's checklist already flags this; the next phase (`/speckit.tasks` or implementation) should pull and reconcile the prior branch's spec/plan if it is still current, or supersede them. |

---

## Summary of decisions feeding Phase 1

- **R1**: Widen `calculateBounds` to a private structural-minimum parameter type (`ReadonlyArray<BoundsFeature>`); no new public type. Both `GeoJSONFeature[]` and `SafeFeature[]` flow through.
- **R2**: Lift the null-geometry guard into the canonical `shared/utils/src/bounds.ts`. Add a TDD-style regression test in `shared/utils/tests/bounds.test.ts` first; lift guard second.
- **R3**: Two consumers, both accounted for. Sweep with `grep` before deletion; no other action needed.
- **R4**: Import via the `@debrief/utils` package root, not a deep path.
- **R5**: All risks are low; mitigations are folded into the task list.

No NEEDS CLARIFICATION remains. Phase 1 may proceed.
