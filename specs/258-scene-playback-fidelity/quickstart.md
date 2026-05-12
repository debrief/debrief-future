# Quickstart — Verify Spec #258 Locally

**Feature**: 258 | **Phase**: 1 | **Date**: 2026-05-12

A reader who lands on this branch should be able to verify all four gaps in well under an hour. This walkthrough exercises each gap in isolation and then together.

## 0. Prerequisites

```sh
# from repo root
pnpm install
uv sync
# Regenerate schemas (picks up the new display_mode slot)
uv run linkml-convert ... # or: task schemas:regen   (whichever the project uses)
```

## 1. Schema gate

```sh
uv run pytest shared/schemas/tests/         # round-trip + golden fixture
pnpm --filter @debrief/schemas test         # generated TS round-trip
```

**Pass criterion**: a new fixture covering `SceneProperties.display_mode` (both present and absent) loads through both code-paths. Failure here blocks every other step — the rest depends on the regenerated types.

## 2. Unit tests (component library + VS Code service)

```sh
pnpm --filter @debrief/components test storyboard/__tests__/crud.test.ts
pnpm --filter @debrief/components test MapView/__tests__/SceneRectangleLayer.test.tsx
pnpm --filter @debrief/components test FeatureList/flattenFeatures.test.ts
pnpm --filter @debrief/components test FeatureList/FeatureList.test.tsx
pnpm --filter @debrief/vscode test services/__tests__/storyboardPlayback.test.ts
```

**Pass criteria**:
- `crud.test.ts`: `bboxToPolygon(bounds, 'bounds')` returns a polygon matching `map.getBounds()` corners (not a 100m placeholder); the resulting scene has `_polygon_source: 'bounds'`. All three call sites in `crud.ts` are exercised (`createScene`, `updateScene`, the third caller).
- `SceneRectangleLayer.test.tsx`: when `currentSceneId === scene.id`, the rendered polygon carries both `debrief-scene-rect--current` and `debrief-map-feature--selected` CSS classes. When `_polygon_source !== 'bounds'` (or absent), the polygon is recomputed at render; when `'bounds'`, the stored geometry is used as-is.
- `flattenFeatures.test.ts`: a fixture with `STORYBOARD` + 3 × `STORYBOARD_SCENE` produces exactly one row of `type: 'storyboard'` plus 3 child rows (when expanded), zero scene rows at depth 0. The storyboard row has `childCount: 3`. An empty storyboard produces a row with `childCount: 0` and `isExpandable: false`. An orphan scene (no matching parent) is emitted as top-level with a `console.warn`.
- `FeatureList.test.tsx`: clicking the chevron on a storyboard parent collapses/expands its children; `hasChildSelected` propagates to the parent when one child is active; the `(N)` badge is rendered after the storyboard name regardless of collapse state.
- `storyboardPlayback.test.ts` (NEW, VS Code): given a scene with `display_mode: 'trail'`, `executeTransition` calls `session.setDisplayMode('trail')` exactly once after `flyToViewport`. Given a scene without `display_mode`, no `setDisplayMode` call is made and no exception is raised. The setter is NOT called from any of the other six `pushSceneRectangles` invocation sites.

## 3. Web-shell workflow E2E

```sh
cd apps/web-shell
node run-playwright.mjs storyboard-playback-fidelity
node run-playwright.mjs storyboard-capture   # extended cases
cd ../..
```

**Pass criteria** (the human-visible promise of #258):

1. **Trail-mode round-trip**: open the sample plot, switch the time-controller to Trail, capture a scene. Switch to Full, capture a second scene. Click the first scene in `FeatureList`; the time-controller switches to Trail and the map flies to the first viewport.
2. **Polygon fidelity**: capture two scenes at clearly different zooms (continental vs neighbourhood). The two on-map rectangles have visibly different sizes; neither is a ~100 m square.
3. **Active-scene halo**: while a scene is current, its rectangle on the map carries the same drop-shadow + pulse animation already used for selected tracks. Clicking a different scene transfers the halo.
4. **FeatureList grouping**: the panel shows one collapsible "Storyboard" parent row with the scene children indented beneath. Collapsing the parent hides the children; if a child is active when collapsed, the parent inherits the active-state styling.

## 4. Visual / Storybook sanity

```sh
pnpm --filter @debrief/components storybook
```

Browse to:
- `Panels / StoryboardPanel / StoryboardPlayback` — should show the halo on the current scene.
- `FeatureList / Storyboard Grouping` (the new story added by this feature) — expand/collapse interactions.

## 5. Legacy data smoke test

Open `preview/workspace/samples/local-store/` (the bundled sample catalog). If any of its plots contain pre-#258 storyboards:

- They load without error (Article I.3 — no silent failure).
- Their scene rectangles render at the actual captured viewport size (rendered via the placeholder recomputation path) — not as 100 m squares.
- Clicking a legacy scene flies the map to the viewport but **does not** change the time-controller's mode (FR-003).

## 6. CI gate before push

```sh
task verify       # or the four-step fallback in CLAUDE.md
```

All three CI steps (lint, typecheck, test — including Playwright) must pass before any commit on this branch is pushed.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `SceneProperties` TS type lacks `display_mode` | Schema regeneration didn't run; rerun `task schemas:regen`. |
| New Playwright test times out clicking the storyboard parent chevron | The chevron may not be rendered when the parent has zero scenes (FR-013 disabled state); confirm the test's fixture has ≥1 scene. |
| Scene rectangle is still a tiny square after capture | (i) `captureScene.ts` is still calling the legacy `viewportToPolygon(viewport)` rather than the new `bboxToPolygon(map.getBounds(), 'bounds')`; (ii) `_polygon_source` is not being set to `'bounds'` at write time, so the renderer is recomputing from viewport instead of trusting the (correct) stored polygon. Inspect the scene's properties in the saved file. |
| Halo doesn't appear on the active scene | The class merge in `SceneRectangleLayer.tsx` is missing `debrief-map-feature--selected`. |
| Time controller doesn't restore Trail | (i) `StoryboardPanel.onSceneActivated` is not being wired by the host; or (ii) the host's callback handler is missing the `session.setDisplayMode(scene.properties.display_mode)` call. Confirm both VS Code (`storyboardPlayback.executeTransition`) and web-shell (`App.tsx` temporal handler block) subscribe to the new callback. |
| Updating an existing scene resets it to placeholder polygon | `updateScene` in `crud.ts` still calls the legacy helper. All three call sites (`createScene` line 538, `updateScene` line 643, the third caller around line 1020) must use `bboxToPolygon(bounds, source)`. TypeScript strict-mode should make this a compile error rather than runtime; check that `viewportToPolygon` was deleted, not deprecated. |
| Storyboard parent row missing the `(N)` badge | `FeatureRow.tsx` is checking `item.type === 'storyboard'` but `flattenFeatures.ts` isn't populating `childCount`. Both ends of the contract are needed. |
| Empty storyboard's chevron is still active | `flattenFeatures.ts` should set `isExpandable: children.length > 0` on the storyboard row (FR-013). |
