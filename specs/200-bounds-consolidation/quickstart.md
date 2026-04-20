# Quickstart: Verify the bounds-utility consolidation

**Feature**: 200-bounds-consolidation (v2)
**Date**: 2026-04-19
**Audience**: Reviewer or developer verifying that the consolidation landed correctly. ~7 minutes end-to-end.

This quickstart maps directly to the verification matrix in `contracts/bounds-utility.md`. Each step ends with the contract row (C1–C13) and spec criterion (SC-###, FR-###) it satisfies.

---

## Prerequisites

- Repo cloned, on the branch carrying this change.
- Toolchain installed (`pnpm`, `uv`, `task`) — see root `CLAUDE.md` "Before Pushing".

---

## Step 1 — Confirm there is exactly one canonical implementation

```sh
grep -rn "export function calculateBounds" --include="*.ts" shared/utils/ apps/
grep -rn "export function mergeBounds"     --include="*.ts" shared/utils/ apps/
```

**Expect**: Each command returns **exactly one** match, both inside `shared/utils/src/bounds.ts`.

The search is scoped to `shared/utils/` and `apps/` because `shared/components/src/utils/bounds.ts` is a separate, LinkML-typed `calculateBounds` (out of scope — see spec v2 "Out of Scope").

*(C1; SC-001; FR-001.)*

---

## Step 2 — Confirm the VS Code-local copy and its test are gone

```sh
find apps/vscode -name 'bounds.ts' -o -name 'bounds.test.ts'
```

**Expect**: No output (zero matching files).

*(C2; SC-002; FR-003; FR-004.)*

---

## Step 3 — Confirm `mapPanel.ts` imports from `@debrief/utils`

```sh
grep -n "calculateBounds\|mergeBounds\|boundsToLeaflet" apps/vscode/src/webview/mapPanel.ts
```

**Expect** an import line of the form:

```ts
import { calculateBounds, mergeBounds, boundsToLeaflet } from '@debrief/utils';
```

(The `boundsToLeaflet` import is new to the post-change file because `fitToSelection` now uses it to convert the utility's `Bounds` tuple into Leaflet's `LatLngBoundsLiteral`.) No reference to a local `'../utils/bounds'` path.

*(C3; FR-005.)*

---

## Step 4 — Confirm the narrowing gate is visible, single, and Article-XV.5-anchored

```sh
grep -n "coerceCoordinates\|Article XV" shared/utils/src/bounds.ts
```

**Expect**:

- One `function coerceCoordinates(raw: unknown): ... | null` definition.
- One call to `coerceCoordinates(...)` inside `calculateBounds`.
- A comment near the `coerceCoordinates` definition explicitly referencing Article XV.5 of the constitution.

Also verify the file contains no `any` type and no double-cast pattern:

```sh
grep -nE "\bany\b|as unknown as" shared/utils/src/bounds.ts
```

**Expect**: no output.

*(C7, C8; FR-007; SC-009.)*

---

## Step 5 — Run the bounds test suite

```sh
pnpm --filter @debrief/utils test --run bounds
```

**Expect**: All bounds tests pass, including:

- Existing canonical-path cases.
- **NEW** null-geometry regression (mixed-collection case and all-null case).
- **NEW** per-geometry-type assertions for every type the utility supports: Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon.
- **NEW** narrowing-gate shape-mismatch cases (`coordinates: "oops"`, `null`, `[]`, `[["x"]]` → `null` bounds, no throw).

To cross-check that the null-geometry test is a real regression test (not a no-op), the implementer's commit history should include a commit where the test was added against the widened-but-guard-less `calculateBounds` and failed (TDD per Article VII; research R2).

*(C5, C6, C7; FR-002, FR-008; SC-006, SC-007.)*

---

## Step 6 — Manual smoke test: VS Code map auto-zoom on plot open

> Gating user-facing check for the plot-open path. This is User Story 2.

1. Build/launch the VS Code extension preview as you normally would.
2. Open a plot file from the bundled samples (any plot with at least one track will do).
3. Confirm the map auto-zooms to fit the loaded features — no blank map, no thrown error in the developer console, viewport visibly framing the data.

If you have a sample plot containing at least one feature with a missing/null geometry, also open that one and confirm the map still auto-zooms cleanly to the rest of the features.

**Expect**: Behaviour is indistinguishable from the pre-change extension.

*(C13; SC-005; FR-012; US2.)*

---

## Step 7 — Manual smoke test: VS Code "zoom to selection" on mixed geometries

> Gating user-facing check for the selection-zoom path. This is User Story 4 (the silent-miss fix).

1. Open a plot that contains a mix of geometry types — at minimum one Polygon or MultiPolygon feature and one Point or LineString feature. (Any composite sample plot will do; the bundled `sample-tracks` plot includes annotations.)
2. **Regression path — Point+LineString selection**: select only a Point and/or LineString, invoke "zoom to selection". Confirm the map zooms to a viewport identical to what pre-change would have produced (tight around the selection).
3. **New path — Polygon selection**: select only a Polygon feature, invoke "zoom to selection". Confirm the map zooms to the Polygon's extent. **Pre-change, this would have produced no zoom or a wrong zoom.** Post-change, it zooms correctly.
4. **New path — MultiPolygon selection**: same as (3) with a MultiPolygon. Confirm the viewport contains every polygon in the multi.
5. **Empty selection**: deselect everything, invoke "zoom to selection". Confirm the viewport does not change.

**Expect**: Step 2's viewport is identical to pre-change behaviour (no regression); steps 3–4 zoom correctly where they did not before (the silent miss fixed); step 5 leaves the viewport untouched (fallback preserved).

*(C9, C10, C11; SC-008; FR-008, FR-009; US4.)*

---

## Step 8 — Run the full CI gate

```sh
task verify
```

**Expect**: Lint, typecheck, and tests all pass with no new warnings or errors. In particular:

- `pnpm -r typecheck` passes — proves no type error after the import flip, no `as`-cast was reintroduced, and the widened signature accepts the feature arrays at both call sites.
- `pnpm --filter @debrief/utils test` and the VS Code package's own tests both pass.

If `task` is not installed, run the four-step fallback in root `CLAUDE.md` "Before Pushing".

*(C4, C12; FR-006, FR-010, FR-011; SC-004.)*

---

## What to do if a step fails

| Failing step | Most likely cause | Where to look |
|--------------|-------------------|---------------|
| Step 1 | A second copy of `calculateBounds` / `mergeBounds` was reintroduced or never deleted. Or the grep happens to match inside `shared/components/` (it shouldn't — the step scopes to `shared/utils/` and `apps/`). | Verify the grep's scope; check `git status` for uncommitted deletions. |
| Step 2 | The deletions in FR-003 / FR-004 were not committed. | `git log --stat` to confirm the delete commits landed. |
| Step 3 | Import flip in `mapPanel.ts` was missed. | Edit `apps/vscode/src/webview/mapPanel.ts` to use `@debrief/utils`. |
| Step 4 | Narrowing gate is missing, inline-scattered, or uses `any`. | Verify `coerceCoordinates` is the single narrowing location; add the Article XV.5 comment if missing; replace any `any` / `as unknown as X` with a `typeof` + `Array.isArray` check. |
| Step 5 | The null-guard was not lifted into `shared/utils/src/bounds.ts`, or a per-geometry-type test failed. | Verify `if (!feature.geometry) continue;` appears in the canonical loop; check which test failed and inspect the corresponding `extractCoordinates` branch. |
| Step 6 | Plot-open auto-zoom regressed. | Inspect `mapPanel.ts`'s `parseResult.features` call site; confirm the import flip used `@debrief/utils` and the widened signature is assignment-compatible. |
| Step 7 | Selection-zoom behaviour regressed on Point/LineString, or still misses Polygon/MultiPolygon. | Inspect `fitToSelection`'s new body — it should be one call to `calculateBounds` plus `boundsToLeaflet`. No inline loop. |
| Step 8 (typecheck) | `mapPanel.ts` is passing `SafeFeature[]` or `DebriefFeature[]` into a parameter that still expects `GeoJSONFeature[]`. | Confirm the widened signature from research R1 was applied. |
