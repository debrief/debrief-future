# Consolidate bounds utilities into @debrief/utils

## Problem
`apps/vscode/src/utils/bounds.ts` is a 95%-identical copy of `shared/utils/src/bounds.ts` — ~116 lines of `calculateBounds` / `mergeBounds` shared between them, with three incidental differences:
1. A defensive `if (!feature.geometry) continue;` null-guard that only exists in the vscode copy
2. Different input type annotations (vscode imports a local `GeoJSONFeature` aliased from `SafeFeature`; utils uses its own looser `GeoJSONFeature`)
3. One extra `// eslint-disable-next-line no-restricted-syntax` on the vscode side

The drift is real: bug-fixing the null-guard in one side didn't propagate. There is exactly one in-tree consumer of the vscode copy (`apps/vscode/src/webview/mapPanel.ts`) plus a byte-identical duplicate test (`apps/vscode/tests/unit/bounds.test.ts` vs `shared/utils/tests/bounds.test.ts`, differing only in the import path).

## Proposed Solution
1. Lift the null-guard into `shared/utils/src/bounds.ts` — strictly safer behaviour; no call site regresses.
2. Reconcile the input-type mismatch between `SafeFeature` and `GeoJSONFeature` at the utils boundary. Two sub-options to resolve during implementation:
   - Widen `calculateBounds`'s parameter to the structural minimum (`{ geometry?: { type: string; coordinates: ... } }`), which lets `SafeFeature[]` flow through without casts.
   - Or, reconcile `SafeFeature` and `GeoJSONFeature` inside `@debrief/utils` so they share a structural base (this is a code smell the prior audit flagged: same underlying entity, two types).
3. Delete `apps/vscode/src/utils/bounds.ts` and `apps/vscode/tests/unit/bounds.test.ts`.
4. Switch `apps/vscode/src/webview/mapPanel.ts` to import `calculateBounds` / `mergeBounds` from `@debrief/utils`.

## Success Criteria
- Only one implementation of `calculateBounds` / `mergeBounds` exists in the monorepo
- `apps/vscode` has no local `bounds.ts` or duplicate bounds test
- `mapPanel.ts` passes its existing feature array through without type errors
- `shared/utils/tests/bounds.test.ts` still passes; existing vscode-side coverage is subsumed by it
- No behaviour regression in map viewport calculation (smoke test: open a plot in vscode, confirm zoom-to-bounds works)

## Dependencies
None. Independent of all other cleanup items.

## Parallelisation
Fully parallel with #199, #201, #202, #206, E11, E12. The LinkML-layer items (#203 / #204 / #205) only touch `shared/schemas/`, so no conflict.

## Complexity
Low
