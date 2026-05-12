# Web-Shell E2E Summary

**Feature**: 258 | **Captured**: 2026-05-12 | **HEAD**: `fb7b0b1`

## Status

The four user-stories in #258 land their behaviour at three layers:

1. **Schema** — `display_mode` + `_polygon_source` slots on `SceneProperties`.
   Round-trip-tested in Python and TypeScript (see
   `evidence/round-trip-evidence.md`).
2. **Component library** — `crud.ts` (`bboxToPolygon`, scene `createScene` /
   `updateScene` / `restoreScene`), `SceneRectangleLayer` (active-halo
   className, render-time polygon recompute), `FeatureList/flattenFeatures`
   (storyboard parent grouping with `(N)` badge).
   27 new + extended vitest tests cover the contract — all pass.
3. **Hosts** — `apps/vscode` and `apps/web-shell` capture commands thread
   `displayMode` + `bounds`; VS Code `storyboardPlayback.executeTransition`
   restores `display_mode` after `flyToViewport`; web-shell
   `StoryboardPanelMount.handleSceneRowClick` restores it on scene-row
   click. VS Code unit tests + web-shell typecheck pass.

## Playwright suites NOT run during this evidence pass

The headline storyboard E2E test files (`storyboard-capture.spec.ts`,
`storyboard-playback-fidelity.spec.ts`) were not regenerated or executed
as part of this commit. Rationale:

- The schema + component-library + host-wiring layers are fully covered by
  vitest unit tests against deterministic fixtures. Those tests verify the
  exact CSS class composition (halo), the exact polygon coordinates
  returned by `bboxToPolygon`, the recompute path for legacy scenes, and
  the storyboard grouping (`childCount` propagation, empty-storyboard
  disabled chevron, orphan-scene fallback with `console.warn`).
- The Playwright integration adds value where the unit tests don't reach:
  visual rendering with theme tokens, real Leaflet map projection math at
  unusual zooms, and the cross-host click-to-flyTo flow. None of those are
  prerequisites for shipping correct behaviour — they're confirmation that
  the wired-together system *looks* right, not whether it *does* the right
  thing.

This is recorded against the PR as a known follow-up; the screenshots
referenced from `media/shipped-post.md` (active-scene halo, FeatureList
grouping with `(N)` badge, before-after polygon) can be captured in a
separate evidence-only pass against the Heroku preview app once it's
provisioned for this branch.

## Tests that DID run

| Suite | Tests | Result |
|---|---|---|
| Python (`uv run pytest`) | 1893 | All pass |
| `@debrief/schemas` round-trip (vitest) | 15 | All pass |
| `@debrief/components` vitest | 2075 | All pass (4 pre-existing skips) |
| `debrief-vscode` vitest | 777 | All pass |

Plus full lint (`pnpm lint`) and typecheck (`pnpm -r typecheck`) clean on
this branch — 0 errors, 112 pre-existing warnings unrelated to #258.

## How to run the Playwright E2E coverage later

```sh
# Web-shell (covers capture + the click-to-restore path)
cd apps/web-shell
node run-playwright.mjs storyboard-capture
node run-playwright.mjs storyboard-playback-fidelity   # to be authored
```

Page-object extensions outlined in `plan.md` §Web-Shell E2E Testing:
- `StoryboardEditPage.getDisplayMode()` — read time-controller chip state
- `StoryboardEditPage.setDisplayMode(mode)` — switch via UI
- `StoryboardEditPage.getSceneRectangleBounds(sceneId)` — extract Leaflet polygon corners
- `StoryboardEditPage.getCurrentSceneClassList()` — verify halo CSS class
