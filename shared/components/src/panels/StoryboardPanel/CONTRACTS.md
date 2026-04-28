# StoryboardPanel — Public API Contracts

**Package:** `@debrief/components`
**Status:** Pre-v4.0.0; pinned but unfrozen.

This document is the canonical contract for the StoryboardPanel surfaces that have either a perf invariant or a behaviour contract a downstream consumer or test is allowed to depend on. Changes to anything documented here MUST be paired with an entry in `shared/components/CHANGELOG.md` + a perf re-baseline where noted.

Origin: feature `234-storyboard-edit-polish-followup`, FR-046. The function below was previously an "exported helper"; this document promotes it to a stable surface so the perf-budget regression guard (FR-030) can cite a contract rather than just a function name.

---

## `composeSceneEditViewModels`

### Location

`shared/components/src/panels/StoryboardPanel/useStoryboardEditReducer.ts` — exported.

### Signature (pinned)

```ts
export function composeSceneEditViewModels(
  state: StoryboardEditReducerState,
): Readonly<Record<string /* sceneId */, SceneEditViewModel>>;
```

### Behaviour

Compose the per-Scene `SceneEditViewModel` dictionary the panel renders, layering the inbound baseline (`sceneEditViewModelsFromExtension`) with the live overlays (`staleFlags`, `editFormOpenFor`). Rows without a baseline entry synthesise a minimal fallback view-model so the chevron/overflow affordances still work.

### Invariants

1. **Active-storyboard-only iteration (FR-008, carried forward from #230).**
   The function MUST iterate ONLY the active storyboard's scenes — i.e., `state.sceneRows`, which the reducer keeps scoped to the active storyboard. Inactive storyboards' scenes are never touched even when present elsewhere in caller-side state. Complexity: O(active-storyboard Scenes).

2. **Pure.**
   No side effects. No `Date.now()`, no `Math.random()`, no module-scope mutation. Same input → same output.

3. **Reference stability for absent overlays.**
   A row whose baseline entry is unchanged AND whose overlay state is unchanged SHOULD return the same logical view-model (field-by-field equal). The implementation does not currently memoise object identity; consumers who care about identity equality should memoise at the call site.

### Perf budget (FR-030)

| Surface | Hard budget | CI soft budget | Methodology |
|---------|-------------|----------------|-------------|
| 50-Scene active storyboard, 5 × 50-Scene fixture in memory, 100 iterations | **median ≤ 50 ms** | median ≤ 60 ms (20 % CI tolerance) | Vitest, single untimed JIT warm-up, then median over 100 timed runs. Fixture sized to validate Invariant 1: a regression that walked all 250 scenes would exceed both budgets. |

Test file: `shared/components/src/panels/StoryboardPanel/__tests__/composeSceneEditViewModels.perf.test.ts`.

The perf test's failure message MUST cite this CONTRACTS.md so a future regressor finds the contract before reading the function body (FR-046).

### Re-baselining conditions

The perf budget is permitted to be re-baselined when, and only when, ONE of the following is true:

1. A new field is added to `SceneEditViewModel` that requires non-trivial composition (e.g., a derived array). The new median MUST still be ≤ 50 ms; if not, the addition is a perf regression and must be reworked.
2. The reducer state shape changes such that the composer must consult an additional inbound source (e.g., a new ReadonlyMap overlay). Same constraint as (1).
3. The fixture scale changes (e.g., #218 increases the spec-scale active-storyboard size beyond 50 Scenes). The budget MUST then be expressed as a per-Scene cost and re-derived; the absolute milliseconds may move proportionally.

A re-baseline MUST be paired with:

- An entry under "Unreleased — Public API" in `shared/components/CHANGELOG.md` describing the change + the new budget.
- An update to this document.
- A passing CI run on the new budget.

### Stability

`composeSceneEditViewModels` is a public API of `@debrief/components` per `shared/components/CHANGELOG.md`. Adding a new `SceneEditViewModel` field requires a perf-budget re-baseline (above). Removing the function or changing its signature is a breaking change, even pre-v4.0.0, because the perf test + downstream consumers are pinned against the surface this document describes.

---

## Cross-references

- Spec FR-008, FR-030, FR-031, FR-032, FR-046 in `specs/234-storyboard-edit-polish-followup/spec.md`.
- Research R5, R13 in `specs/234-storyboard-edit-polish-followup/research.md`.
- Data-model entry (5) in `specs/234-storyboard-edit-polish-followup/data-model.md`.
- Parent invariant FR-008 from `specs/230-storyboard-edit-wiring/spec.md`.
