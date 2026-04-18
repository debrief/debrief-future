# Phase 0 Research: Consolidate bounds utilities

**Feature**: `200-bounds-consolidation`
**Date**: 2026-04-18
**Purpose**: Resolve the single open implementation choice deferred by the spec (FR-003), surface any unknowns, and confirm that no `NEEDS CLARIFICATION` remains before Phase 1.

## Open questions at the start of this phase

1. **How to make `calculateBounds` accept both the narrow `GeoJSONFeature` (from `shared/utils/src/types.ts`) and the wider `SafeFeature` (from the same file, used at the vscode call site)?** Spec FR-003 listed two sub-options. This research chooses one.
2. **Is there any hidden consumer of `apps/vscode/src/utils/bounds.ts` beyond `mapPanel.ts` + the duplicate test?** Must be confirmed before deletion (spec FR-004, FR-007).
3. **What does the canonical null-guard look like in TypeScript, given that `SafeFeature.geometry` is `SafeGeometry | null`?** Must match existing vscode behaviour exactly (spec FR-002, FR-008).
4. **Are there other `bounds.ts` files in the repo that could be confused with the ones under consolidation?** Matters because a sloppy "collapse duplicates" could sweep in something out of scope.

No `NEEDS CLARIFICATION` markers remain in the spec — these are implementation-choice questions, not spec-level gaps.

---

## Decision 1: Widen `calculateBounds`'s parameter type (FR-003, Option A)

**Decision**: Widen `calculateBounds`'s parameter to a minimal structural type — `ReadonlyArray<{ geometry?: { type: string; coordinates: unknown } | null }>` — and narrow `coordinates` from `unknown` to the expected per-geometry-type shape inside the existing `extractCoordinates` helper (which already does per-case casts today).

**Rationale**:

- Minimum surface change. The parameter sits at a single function; widening it affects no other type in the repo and has zero runtime cost (types are erased).
- Compatible with both existing and future callers:
  - `GeoJSONFeature[]` (the current shared-test input — typed `coordinates: number[] | number[][] | number[][][]`) is assignable to `coordinates: unknown`. ✓
  - `SafeFeature[]` (the vscode/mapPanel.ts input — `coordinates: unknown` exactly) matches. ✓
  - Any raw GeoJSON parsed from JSON matches. ✓
- No change to the `SafeFeature` or `GeoJSONFeature` type definitions — avoids scope creep into a broader type-reconciliation that would touch dozens of other call sites (FR-003 Option B).
- Narrowing from `unknown` inside `extractCoordinates` at each `case` is already the existing pattern — no new casts, no new `eslint-disable` required at the call site (spec SC-007).
- Aligns with Constitution Article XV ("narrow to a concrete type at the boundary immediately") — the boundary is `calculateBounds`, and narrowing happens in the next statement.

**Alternatives considered**:

- **Option B — Reconcile `SafeFeature` and `GeoJSONFeature` to share a structural base.** Rejected (for now): the BACKLOG entry flags this as "a code smell the prior audit flagged" but treats it as a sub-option, not a requirement. Unifying the two would touch every `SafeFeature` consumer in the monorepo (≈15 files) and is appropriate as its own tech-debt backlog item, not as a piggyback on this 161-LOC deletion.
- **Option C — Keep two overloads.** Rejected: doubles the public signature and the maintenance burden for zero gain; structural subtyping already gives us the overloading behaviour for free.
- **Option D — Make the parameter `ReadonlyArray<SafeFeature>` (the wider of the two named types).** Rejected: the existing shared-unit tests pass `GeoJSONFeature[]`, and while `GeoJSONFeature` is structurally compatible with `SafeFeature` in most respects, forcing shared/utils code to depend on `SafeFeature` as the canonical input type is a philosophical shift — `SafeFeature` is a boundary type, not a domain type. Keeping the signature structural preserves the "utils accepts anything geometry-shaped" intent.

**Concrete signature (post-refactor)**:

```typescript
type FeatureLikeForBounds = {
  readonly geometry?: {
    readonly type: string;
    readonly coordinates: unknown;
  } | null;
};

export function calculateBounds(
  features: ReadonlyArray<FeatureLikeForBounds>
): Bounds | null { /* ... */ }
```

The named alias `FeatureLikeForBounds` is *not* exported — it is a purely internal parameter-position type. Consumers continue to pass `GeoJSONFeature[]` or `SafeFeature[]` without import changes.

**Null-guard shape**:

```typescript
for (const feature of features) {
  if (!feature.geometry) { continue; }   // catches both null and undefined
  const coords = extractCoordinates(feature.geometry);
  // ...
}
```

Identical to the current vscode copy, modulo type-annotation mechanics. The `!feature.geometry` falsy check covers both `null` and `undefined` (spec Edge Cases bullet 3).

---

## Decision 2: Confirmed — only one consumer of the vscode-local `bounds.ts`

**Finding**: A repo-wide grep for imports matching the vscode-local path (`from ['\"].*apps/vscode.*utils/bounds|from ['\"]\.\./utils/bounds|from ['\"]\.\./\.\./utils/bounds|from ['\"]\.\./src/utils/bounds`) returned exactly one production hit and one test hit:

| File | Import | Disposition |
|------|--------|-------------|
| `apps/vscode/src/webview/mapPanel.ts:39` | `import { calculateBounds, mergeBounds } from '../utils/bounds';` | **Rewrite to `@debrief/utils`.** |
| `apps/vscode/tests/unit/bounds.test.ts:6-11` | `import { ... } from '../../src/utils/bounds';` | **Delete the test file entirely (byte-identical duplicate of `shared/utils/tests/bounds.test.ts`).** |

No other module imports `apps/vscode/src/utils/bounds.ts` — direct or transitive. Notably:

- The `Bounds` *type* re-export in the vscode file (`export type { Bounds };` on line 11) is **not consumed by any other file in `apps/vscode/`** — verified by the same grep. The re-export is dead weight, and deleting `apps/vscode/src/utils/bounds.ts` requires no follow-up type-import migrations in other files.

**Rationale**: Deletion is safe; no hidden downstream. Spec FR-007's migration concern is resolved by the grep evidence — there is nothing to migrate beyond the `mapPanel.ts` import and the test file.

**Alternatives considered**: None meaningful — grep is authoritative.

---

## Decision 3: Null-guard behaviour preserved exactly

**Finding**: The vscode copy's null-guard is `if (!feature.geometry) { continue; }`. This uses a falsy check, which skips features where `geometry` is:

- `null` (the shape given by `SafeFeature` when geometry is absent)
- `undefined` (if a feature object is constructed without the field)
- `0`, `""`, `false` (structurally impossible for a GeoJSON geometry, but the guard tolerates them)

The existing `mapPanel.ts` call site uses the same falsy idiom in an unrelated `flatMap` (line 1232: `if (!f.geometry) { return []; }`), confirming that "falsy geometry → skip" is the established convention in this code path.

**Decision**: Lift the falsy-check verbatim. Do *not* tighten to `feature.geometry == null` or `feature.geometry === null` — the falsy form is more defensive and matches `mapPanel.ts` idiom.

**Rationale**: Spec FR-008 requires bit-for-bit behavioural parity for inputs the shared copy currently accepts. For inputs *only* the vscode copy accepts (null/undefined geometry), the spec requires the vscode copy's exact behaviour. The falsy form is the single idiom that satisfies both.

**Alternatives considered**:

- **Strict `=== null`**: Would throw on `geometry: undefined` — a stricter guard, but it would also diverge from the existing `mapPanel.ts` falsy idiom. Rejected for consistency.
- **Early-return from the outer loop if geometry missing**: Semantically identical to `continue`. Rejected — `continue` preserves the existing vscode code shape exactly.

---

## Decision 4: The third `bounds.ts` in `shared/components/src/utils/bounds.ts` is NOT a duplicate

**Finding**: During the consumer-grep for Decision 2, a third file surfaced: `shared/components/src/utils/bounds.ts` (207 LOC). It exports a function also called `calculateBounds`, plus `expandBounds`, `isPointInBounds`, `bboxOverlapsViewport`, `viewportToBounds`, `filterBySpatialExtent`, and `extractAllCoordinates`. Inspection of its `calculateBounds`:

- Takes `DebriefFeatureCollection | DebriefFeature[]` (a domain-typed feature, not the generic `GeoJSONFeature` / `SafeFeature` shape).
- Has additional logic: a bbox-fast-path (uses the feature's own `bbox` if present) and an `isNaN` guard on coordinates.
- Is consumed by `MapView.tsx`, `LeafletToolbar.tsx`, and `useBrowserFilter.ts` for map-view and catalog-browser spatial filtering.

**Decision**: **Out of scope.** The `shared/components` bounds utilities are a genuinely distinct module:

1. Different input type (`DebriefFeature`, which is the React-component-facing typed feature, not the parse-boundary `SafeFeature`).
2. Different feature set (spatial-filter helpers that don't exist in `shared/utils/src/bounds.ts`).
3. Different call sites (map-view rendering and catalog browsing, not REP-import zoom-to-bounds).

Consolidating *this* third copy with the other two would be a much larger refactor — potentially worth a future backlog item, but explicitly not what BACKLOG #200 asks for. The spec's FR-001 is careful to name only `calculateBounds`, `mergeBounds`, `boundsToLeaflet`, and `isValidBounds` as the consolidation target — and of those, only `calculateBounds` and `mergeBounds` appear in the components copy, with different signatures.

**Rationale**: Preserving scope discipline. The spec is a deliberate "delete 161 LOC, no scope creep" item. Surfacing the third file here documents it for future work without pulling it in.

**Alternatives considered**:

- **Expand the spec to three-way consolidation**: Rejected — would require a renegotiation of the spec, a design for the different feature-typing, and would invalidate the "low complexity" grade in BACKLOG.md.
- **Flag it as a new BACKLOG item**: Deferred — left for a separate `/idea` cycle; not a blocker for this plan.

---

## Decision 5: Additive test strategy for null-geometry coverage

**Finding**: `shared/utils/tests/bounds.test.ts` currently has 10 test cases across 4 `describe` blocks. None cover null or undefined geometry — they exclusively use `GeoJSONFeature[]` with always-present `geometry`. Conversely, the vscode-side `bounds.test.ts` is byte-identical (and also lacks null-geometry cases, which is interesting — the guard is in the production code but not exercised by the test suite).

**Decision**: Add three additive test cases to `shared/utils/tests/bounds.test.ts` under the existing `describe('calculateBounds')`:

1. **`it('should skip features with geometry: null'):`** — feeds a mixed array `[{geometry: null, ...}, {geometry: LineString, ...}]` and expects the LineString bounds.
2. **`it('should skip features with geometry: undefined'):`** — feeds a feature with `geometry` field omitted; expects the same bounds computation over remaining valid features.
3. **`it('should return null when all features have null geometry'):`** — feeds `[{geometry: null}, {geometry: null}]`; expects `null` (the "no valid coordinates" sentinel).

**Rationale**:

- Satisfies spec FR-005 ("at least one case covering the null-geometry skip behaviour").
- Satisfies FR-009 (additive, not replacing).
- Satisfies Article VII (Test-Driven AI Collaboration) — these tests can be authored *first*, observed to fail red against the current shared implementation (which would throw), then made green by lifting the null-guard.
- Three cases pinned rather than one because the falsy-check semantics cover *both* null and undefined — testing them independently prevents a future "fix" that tightens the guard from silently regressing `undefined`-geometry support.

**Alternatives considered**:

- **Delete the vscode test and replace shared test content**: Rejected — FR-009 requires additive, not replacing, so existing shared-test coverage is preserved bit-for-bit.
- **Copy all 10 vscode test cases into the shared test file**: Rejected — the two files are byte-identical, so every vscode case is already present. Copying would create duplicate assertions.

---

## Cross-cutting findings

### CI gating

`task verify` invokes `task lint` → `task typecheck` → `task test`. The refactor affects:

- **Lint**: No new lint violations expected. The vscode copy had one `// eslint-disable-next-line no-restricted-syntax` inside `extractCoordinates`; the shared copy (unchanged) does not need this suppression because its `coordinates: unknown` narrowing pattern is already idiomatic. Net: **zero new suppressions** (SC-007).
- **Typecheck**: `pyright` unaffected (Python untouched). `tsc --noEmit` across all packages must pass — the widened parameter is a superset of the current type, so existing callers are still compatible.
- **Test**: `vitest` in `shared/utils/` gains 3 new cases (all green after the null-guard lift); `vitest` in `apps/vscode/` loses 1 file (the deleted duplicate).
- **E2E (Playwright)**: Unchanged — the `mapPanel.ts` modification is an import-path swap, not a behavioural change. Existing "open plot" E2E continues to pass.

### Risk register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `mapPanel.ts` fails to type-check after the import swap because `parseResult.features: GeoJSONFeature[]` (vscode alias = `SafeFeature`) is incompatible with the new shared signature. | Low | Medium | The widened parameter explicitly accepts `SafeFeature[]` — the whole point of Decision 1. |
| A hidden consumer of `apps/vscode/src/utils/bounds.ts` exists outside the grep patterns used. | Very low | Medium | Grep used multiple import-path variations (`../utils/bounds`, `../../utils/bounds`, absolute path fragments). The one-file result is authoritative. CI `tsc --noEmit` across the whole monorepo catches any missed import. |
| The shared copy's `extractCoordinates` helper differs subtly from the vscode copy (e.g., the `// eslint-disable-next-line no-restricted-syntax` annotation in the MultiPolygon branch). | Low | Low | The annotation is on a cast that the shared copy accomplishes structurally via `unknown`. No behavioural difference. No action needed. |
| Widening to `unknown` for `coordinates` loosens the type contract in a way some consumer relied upon. | Very low | Low | The only production consumer of the input type (`mapPanel.ts`) already has `coordinates: unknown` via `SafeFeature`. No tightening is being lost. |
| The vscode test file shares a name with the shared test file; a search-and-replace mistake could delete the wrong one. | Very low | High (lost coverage) | Delete by exact path. The commit diff will show "`apps/vscode/tests/unit/bounds.test.ts` deleted, `shared/utils/tests/bounds.test.ts` modified (3 additions)" — any other diff is a bug. |

No open `NEEDS CLARIFICATION`. Ready for Phase 1.
