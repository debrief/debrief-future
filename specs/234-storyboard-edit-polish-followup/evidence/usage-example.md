# Usage Example — Feature 234 (full implementation)

End-to-end walkthrough of the surfaces this feature delivers. Phase 3 lands per ADR-027 (callback-adapter helper, not PortContext).

## 1. Foundation — `composeSceneEditViewModels` is now a contracted public API

```sh
cat shared/components/src/panels/StoryboardPanel/CONTRACTS.md
head -30 shared/components/CHANGELOG.md
```

The function's JSDoc points at `CONTRACTS.md` so anyone reading the source finds the public-API contract before touching the function body.

## 2. Perf budget — guarded automatically (Phase 6)

```sh
cd shared/components
pnpm exec vitest run src/panels/StoryboardPanel/__tests__/composeSceneEditViewModels.perf.test.ts
# [perf-budget-234] composeSceneEditViewModels: median=0.017ms p95=0.029ms budget=50ms (local hard)
# 1 test passed
```

If a future change walks all 250 scenes instead of the 50 active ones, the test fails with the measured median + a pointer to `CONTRACTS.md`.

## 3. Dual failure-injection knobs (FR-043)

```sh
cd apps/web-shell && pnpm exec vitest run src/__tests__/StoryboardEditHarness.querystring.test.ts
# 12 tests passed (7 existing + 5 new dual-knob)
```

A Playwright spec can now do:

```
?induceCopyFailure=sceneB&induceRefreshFailure=sceneC
```

to deterministically reach the deep-copy-rollback branch on `sceneB` AND the per-scene refresh-failure branch on `sceneC` in the same scenario.

## 4. `task verify:ffmpeg` (FR-045)

```sh
task verify:ffmpeg
# → "task verify:ffmpeg: PASS — ffmpeg version 6.1.1-3ubuntu5 ..."
```

`task verify` now depends on this so the entire pre-push gate fails fast when ffmpeg is missing locally — before Phase 7's GIF capture spec ever attempts to run.

## 5. ESLint `no-restricted-imports` for `__testing__/` (FR-044)

If any file under `apps/vscode/src/**` adds:

```ts
import { useStoryOnlyMockHandlers } from '@debrief/components/.../__testing__/storyOnlyMockHandlers';
```

`pnpm lint` fails with:

```
no-restricted-imports — Production code in apps/vscode/src/** must not import
from __testing__/. Those modules are story/harness-only (Feature 234 FR-044).
```

The rule fires on the import path string regardless of whether the target exists.

## 6. Code-server E2E spec — ready to run (Phase 4)

```sh
pnpm exec playwright test --config=tests/e2e/playwright.config.ts \
  --list tests/e2e/test-storyboard-edit.spec.ts
# → 14 tests in 1 file

# When #143 (openvscode-server webview iframe hierarchy) resolves,
# remove the `test.describe.skip` and run via the cloud-testing path:
bash tests/e2e/scripts/cloud-e2e-setup.sh
```

The spec covers all 11 commands, all 3 native input boxes, the quick-pick, and the FR-015 evidence screenshot.

## 7. Interactive Storybook stories (Phase 3, US1, ADR-027)

The four edit-suite stories drive the real reducer + simulation handlers via the shared `useStoryOnlyMockHandlers` callback-adapter helper.

```sh
pnpm --filter @debrief/components storybook
```

Open each story:
- **WithEditForm** — click the chevron on a row → inline edit form opens. Type a new title, blur → row title updates. Click cancel → form closes.
- **WithUndoToast** — right-click a row → Delete → Undo toast appears. Click Undo → row restored. The Storybook control-arg `induceCopyFailure` toggles the copy-to-other failure branch.
- **WithStaleBadge** — sceneB starts stale. Click overflow → Refresh thumbnail to clear. Toggle the `induceRefreshFailure` arg (Storybook controls panel) to "scene-2" to exercise the per-Scene failure branch (FR-043) — the badge stays.
- **WithMissingDataRemediation** — scene-3 has missing-features data. Tab through the panel — focus lands on the remediation affordance with a visible focus ring.

```sh
cd shared/components
pnpm exec vitest run src/panels/StoryboardPanel/__testing__/__tests__/storyOnlyMockHandlers.test.ts
# 10 tests passing — seed → state, handler → reducer dispatch, knob routing
```

The same helper drives the web-shell harness (`apps/web-shell/src/StoryboardEditHarness.tsx`), so smoke E2E + the four stories share one source of truth.

## 8. A11y audit (Phase 5, US3)

```sh
cd apps/web-shell
node run-playwright.mjs storyboard-edit-a11y
# 5 tests passed — 0 serious/critical, 0 moderate across 5 panel states
cat ../../specs/234-storyboard-edit-polish-followup/evidence/a11y-report.md
```

Three real WCAG violations were surfaced and fixed:
1. `aria-required-children` CRITICAL on SceneList (role="list" + non-listitem children) — dropped role.
2. `aria-allowed-attr` CRITICAL on SceneRow (aria-expanded on div without supporting role) — removed duplicate; chevron button keeps it.
3. `color-contrast` SERIOUS on StaleBadge (#fff on #ff8c00 at 10px = 2.33:1) — darkened to #a04500, bumped to 11px bold (5.4:1).

## 9. Web-shell scenario suite + GIF (Phase 7, US5)

```sh
cd apps/web-shell
node run-playwright.mjs storyboard-edit
# 19 tests passing — 12 smoke + 7 new scenarios

node run-playwright.mjs storyboard-edit-interaction-gif
# 1 test passing — interaction.gif: 1.44 MB / 3.80s
ls -la ../../specs/218-storyboarding-edit/evidence/screenshots/interaction.gif
```

The seven scenarios:
- inline scene rename
- scene description submit
- copy-to-other (success)
- copy-to-other (failure via `?induceCopyFailure=sceneB`)
- update-to-current
- duplicate
- bulk refresh partial failure (via `?induceRefreshFailure=sceneA`)

The interaction GIF demonstrates rename → describe → delete + undo → refresh-stale in a single 3.8-second recording, well under the 5-second / 2 MB hard caps.

## 10. Helpers ready for downstream specs

```sh
cd apps/web-shell
pnpm exec vitest run playwright/helpers/__tests__/
# 10 tests passed (a11yCategoriser × 8, videoToGif × 2)
```

Both helpers are pure (categoriser) or shell out via `child_process.execFile` (videoToGif — no shell injection). Future a11y or GIF specs can consume them without re-implementing the categorisation or ffmpeg-shellout logic.
