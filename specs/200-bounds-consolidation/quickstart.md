# Quickstart: Verify the bounds-utility consolidation

**Feature**: 200-bounds-consolidation
**Date**: 2026-04-19
**Audience**: Reviewer or developer verifying that the consolidation landed correctly. ~5 minutes end-to-end.

This quickstart maps directly to the verification matrix in `contracts/bounds-utility.md`. Each step ends with the success criterion (SC-### / FR-###) it satisfies.

---

## Prerequisites

- Repo cloned, on the branch carrying this change.
- Toolchain installed (`pnpm`, `uv`, `task`) — see root `CLAUDE.md` "Before Pushing".

---

## Step 1 — Confirm there is exactly one canonical implementation

```sh
grep -rn "export function calculateBounds" --include="*.ts" .
grep -rn "export function mergeBounds"     --include="*.ts" .
```

**Expect**: Each command returns **exactly one** match, both inside `shared/utils/src/bounds.ts`.
*(Verifies SC-001, FR-001, contract C1.)*

---

## Step 2 — Confirm the VS Code-local copy and its test are gone

```sh
find apps/vscode -name 'bounds.ts' -o -name 'bounds.test.ts'
```

**Expect**: No output (zero matching files).
*(Verifies SC-002, FR-003, FR-004, contract C2.)*

---

## Step 3 — Confirm `mapPanel.ts` imports from `@debrief/utils`

```sh
grep -n "calculateBounds\|mergeBounds" apps/vscode/src/webview/mapPanel.ts
```

**Expect**: An import line of the form

```ts
import { calculateBounds, mergeBounds } from '@debrief/utils';
```

— no reference to a local `'../utils/bounds'` path.
*(Verifies FR-005, contract C3.)*

---

## Step 4 — Run the regression test for null-geometry features

```sh
pnpm --filter @debrief/utils test --run bounds
```

**Expect**: All bounds tests pass, **including** the new "skips features with null/undefined geometry" case.

To cross-check that this is a real regression test (not a no-op), the implementer's commit history should include one commit where the test was added against the **un-modified** shared `calculateBounds` and the test failed (TDD per Article VII, research R2).
*(Verifies FR-002, SC-006, US2, contract C5.)*

---

## Step 5 — Run the full CI gate

```sh
task verify
```

**Expect**: Lint, typecheck, and tests all pass with no new warnings or errors. In particular:

- `pnpm -r typecheck` must pass — this proves there is no type error in `mapPanel.ts` after the import flip and that no `as`-cast was reintroduced. *(FR-006, contract C4.)*
- `pnpm --filter @debrief/utils test` and the VS Code package's own tests both pass. *(FR-007, FR-008, contract C6.)*

If `task` is not installed, run the four-step fallback in root `CLAUDE.md` "Before Pushing".

---

## Step 6 — Manual smoke test: VS Code map auto-zoom

> This is the gating user-facing check. Skip only if you have a strong type-and-test signal already.

1. Build/launch the VS Code extension preview as you normally would for this repo.
2. Open a plot file from the bundled samples (anything with at least one track will do).
3. Confirm the map auto-zooms to fit the loaded features — no blank map, no thrown error in the developer console, viewport visibly framing the data.

If you have a sample plot containing at least one feature with a missing/null geometry, also open that one and confirm the map still auto-zooms cleanly to the rest of the features.

**Expect**: Behaviour is indistinguishable from the pre-change extension.
*(Verifies SC-005, FR-009, US2, contract C7.)*

---

## What to do if a step fails

| Failing step | Most likely cause | Where to look |
|--------------|-------------------|---------------|
| Step 1 | A second copy of `calculateBounds` / `mergeBounds` was reintroduced or never deleted. | Run `grep` again with `--include="*.ts"` removed in case a `.tsx`/`.mts` copy exists. |
| Step 2 | The deletions in FR-003 / FR-004 were not committed. | `git status` and check the commit list. |
| Step 3 | Import flip in `mapPanel.ts` was missed. | Edit `apps/vscode/src/webview/mapPanel.ts` to use `@debrief/utils`. |
| Step 4 | The null-guard was not lifted into `shared/utils/src/bounds.ts`. | Verify `if (!feature.geometry) continue;` appears in the canonical loop. |
| Step 5 (typecheck) | `mapPanel.ts` is passing `SafeFeature[]` into a parameter that still expects `GeoJSONFeature[]`. | Confirm the signature widening from research R1 was applied. |
| Step 6 | A behaviour regression slipped through unit tests. | Compare `extractCoordinates` between current and pre-change implementation; nothing in that helper should have changed. |
