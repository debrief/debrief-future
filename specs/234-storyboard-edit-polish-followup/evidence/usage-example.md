# Usage Example — Feature 234 (partial)

This walks through the user-visible surfaces the partial implementation in this session adds. Phase 3 / 5 / 7 surfaces (interactive stories, a11y audit, GIF, scenario set) need follow-up commits.

## 1. Foundation — `composeSceneEditViewModels` is now a contracted public API

```sh
# Read the contract
cat shared/components/src/panels/StoryboardPanel/CONTRACTS.md

# Read the CHANGELOG entry
head -30 shared/components/CHANGELOG.md
```

The function's JSDoc now points at `CONTRACTS.md` so anyone reading the source finds the public-API contract before touching the function body.

## 2. Perf budget — guarded automatically

```sh
cd shared/components
pnpm exec vitest run src/panels/StoryboardPanel/__tests__/composeSceneEditViewModels.perf.test.ts
```

Output (clean run):

```
[perf-budget-234] composeSceneEditViewModels: median=0.017ms p95=0.029ms budget=50ms (local hard)
 ✓ src/panels/StoryboardPanel/__tests__/composeSceneEditViewModels.perf.test.ts  (1 test) 6ms
```

If a future change walks all 250 scenes instead of the 50 active ones, the test fails with the measured median + a pointer to `CONTRACTS.md`.

## 3. Dual failure-injection knobs — Playwright deterministic failure paths

```sh
cd apps/web-shell
pnpm exec vitest run src/__tests__/StoryboardEditHarness.querystring.test.ts
```

Output:

```
✓ apps/web-shell/src/__tests__/StoryboardEditHarness.querystring.test.ts  (12 tests) 8ms
```

A Playwright spec can now do:

```
?induceCopyFailure=sceneB&induceRefreshFailure=sceneC
```

to deterministically reach the deep-copy-rollback branch on `sceneB` AND the per-scene refresh-failure branch on `sceneC` in the same scenario.

Empty knob values (`?induceCopyFailure=`) are dropped with a `console.warn` so a malformed URL surfaces in the test log rather than silently disabling the failure path.

## 4. `task verify:ffmpeg`

```sh
task verify:ffmpeg
# → "task verify:ffmpeg: PASS — ffmpeg version 6.1.1-3ubuntu5 ..."

# Simulated missing:
PATH=/usr/bin task verify:ffmpeg
# → "task verify:ffmpeg: FAIL — ffmpeg not found on PATH."
# →  "  Install via: brew install ffmpeg ..."
```

`task verify` now depends on `verify:ffmpeg` so the entire pre-push gate fails fast when ffmpeg is missing locally — before Phase 7's GIF capture spec ever attempts to run.

## 5. ESLint `no-restricted-imports` for `__testing__/`

If any file under `apps/vscode/src/**` adds:

```ts
import { useStoryOnlyMockPort } from '@debrief/components/.../__testing__/storyOnlyMockPort';
```

`pnpm lint` fails with:

```
no-restricted-imports — Production code in apps/vscode/src/** must not import
from __testing__/. Those modules are story/harness-only (Feature 234 FR-044).
```

The rule fires on the import path string regardless of whether the target exists, so it activates as soon as the helper file is added in a follow-up commit.

## 6. Code-server E2E spec — ready to run

```sh
# List enumerable tests (skipped today; structural validity check)
pnpm exec playwright test --config=tests/e2e/playwright.config.ts \
  --list tests/e2e/test-storyboard-edit.spec.ts
# → 14 tests in 1 file

# When prerequisites (Issue #143 + Phase 3 wiring) land, remove the
# `test.describe.skip` and run via the cloud-testing path:
bash tests/e2e/scripts/cloud-e2e-setup.sh
```

The spec covers all 11 commands, all 3 native input boxes, the quick-pick, and the FR-015 evidence screenshot.

## 7. Helpers — ready for Phase 5 + Phase 7

```sh
cd apps/web-shell
pnpm exec vitest run playwright/helpers/__tests__/
# → 10 tests passed (a11yCategoriser × 8, videoToGif × 2)
```

Both helpers are pure (categoriser) or shell out via `child_process.execFile` (videoToGif — no shell injection). The Playwright a11y spec + the interaction-GIF spec can now consume them in follow-up commits without re-implementing the categorisation or ffmpeg-shellout logic.
