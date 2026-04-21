# Consolidation Metrics

## SC-002: Single canonical `calculateBounds` implementation

```
grep -rn "export function calculateBounds|export const calculateBounds" shared/ apps/ services/
(source .ts files only, excluding /dist/)
```

**Result:**

```
shared/utils/src/bounds.ts:172:export function calculateBounds(
shared/utils/tests/eslint-rules/__fixtures__/redeclaration-fn.ts:3:export function calculateBounds(): number[] {
shared/utils/tests/eslint-rules/__fixtures__/redeclaration-const.ts:2:export const calculateBounds = (): number[] => [0, 0, 0, 0];
```

✅ **1 real implementation** (the two fixture matches are intentional test cases for
the drift-prevention ESLint rule — they are in a `__fixtures__/` directory and
test that the lint rule detects re-declarations).

Before this feature: **2 real implementations** (one in `shared/utils/src/bounds.ts`,
one in `shared/components/src/utils/bounds.ts`).

---

## FR-015: Zero consumer imports of local `bounds` paths

```
grep -rn "from '.*/utils/bounds'" shared/ apps/ services/
(excluding shared/utils/ itself)
```

**Result:** zero matches ✅

Before this feature, the following files imported from a local `utils/bounds` path:
- `shared/components/src/MapView/MapView.tsx`
- `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.tsx`
- `shared/components/src/StacBrowser/useBrowserFilter.ts`
- `shared/components/src/index.ts` (barrel)

---

## SC-006: Zero external-consumer import churn

Files in `apps/vscode/`, `apps/web-shell/`, `apps/loader/` that imported bounds
symbols from `@debrief/components`:

```
grep -rn "calculateBounds|bboxOverlapsViewport|filterBySpatialExtent|viewportToBounds" \
  apps/vscode/src apps/web-shell/src apps/loader/src
```

None of these files import the four symbols directly from `@debrief/components`.
Those symbols were consumed via the `@debrief/components` barrel — which still
re-exports them from `@debrief/utils` — so zero external import statements changed.

✅ **0 external-consumer import changes** (SC-006 satisfied).

---

## SC-003: Zero net loss of assertions

| Test file | Before | After | Delta |
|-----------|--------|-------|-------|
| `shared/utils/tests/bounds.test.ts` | ~26 | 75 | +49 |
| `shared/utils/tests/bounds.types.test-d.ts` | 0 | 5 | +5 |
| `shared/components/src/utils/bounds.test.ts` | ~26 | 0 (deleted) | −26 |
| `shared/components/src/utils/__tests__/utils.test.ts` bounds block | ~11 | 0 (removed) | −11 |
| **Net** | **63** | **80** | **+17** |

✅ Zero net loss. Net gain of 17 assertions (8 fast-path + 5 type-level + 4 expanded coverage).
