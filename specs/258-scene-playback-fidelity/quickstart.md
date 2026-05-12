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

## 2. Unit tests (component library)

```sh
pnpm --filter @debrief/components test storyboard/__tests__/crud.test.ts
pnpm --filter @debrief/components test MapView/__tests__/SceneRectangleLayer.test.tsx
pnpm --filter @debrief/components test FeatureList/flattenFeatures.test.ts
pnpm --filter @debrief/components test FeatureList/FeatureList.test.tsx
```

**Pass criteria**:
- `crud.test.ts`: `viewportToPolygon` (or its successor `bboxToPolygon`) returns a polygon matching `map.getBounds()`, not a 100 m placeholder.
- `SceneRectangleLayer.test.tsx`: when `currentSceneId === scene.id`, the rendered polygon carries both `debrief-scene-rect--current` and `debrief-map-feature--selected` CSS classes. Legacy-placeholder polygons are recomputed at render time.
- `flattenFeatures.test.ts`: a fixture with `STORYBOARD` + 3 × `STORYBOARD_SCENE` produces exactly one row of `type: 'storyboard'` plus 3 child rows (when expanded), zero scene rows at depth 0.
- `FeatureList.test.tsx`: clicking the chevron on a storyboard parent collapses/expands its children; `hasChildSelected` propagates to the parent when one child is active.

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
| Scene rectangle is still a tiny square after capture | `captureScene.ts` is still calling the legacy `viewportToPolygon(viewport)` rather than the new `bboxToPolygon(map.getBounds())`; check the diff. |
| Halo doesn't appear on the active scene | The class merge in `SceneRectangleLayer.tsx` is missing `debrief-map-feature--selected`. |
| Time controller doesn't restore Trail | `executeTransition` (or its web equivalent) is missing the `setDisplayMode(scene.properties.display_mode)` call after `flyToViewport`. |
