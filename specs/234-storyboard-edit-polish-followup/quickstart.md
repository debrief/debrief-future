# Quickstart — Storyboard Edit Suite Polish Follow-up

**Feature**: 234-storyboard-edit-polish-followup
**Date**: 2026-04-26

This is the developer-facing walkthrough. Follow the sequence below to land each user story end-to-end. Every step has a verification command.

---

## Prerequisites

```sh
cd /Users/ian/git/debrief-future
pnpm install
uv sync
# FR-045: ffmpeg system-binary check (will be wired into `task verify` later in this feature)
ffmpeg -version  # any version is fine; #217 T520 used the system default
```

Verify the parent #230 work is on main:

```sh
ls shared/components/src/panels/StoryboardPanel/useStoryboardEditReducer.ts
ls apps/web-shell/src/StoryboardEditHarness.tsx
ls apps/web-shell/playwright/tests/storyboard-edit.spec.ts
```

All three MUST exist. If any are missing, #230 has not landed yet — stop and rebase.

---

## US1 — Interactive Storybook (P1)

### 1.1 Add `PortContext` (D3A)
New file: `shared/components/src/panels/StoryboardPanel/PortContext.tsx`. Defines the context, the default thrower, and the `usePanelPort()` hook per `contracts/harness-knobs.md` §3.

### 1.2 Wire `PortContext` into the production webview entry
File: `apps/vscode/src/webview/web/storyboardPanel.tsx`. Wrap the existing `<StoryboardPanel>` mount in `<PortContext.Provider value={vscodeApi}>` where `vscodeApi = acquireVsCodeApi()`. Now the panel resolves its outbound port via context — both production and test paths share the same wiring.

### 1.3 Create the shared mock-port helper
File: `shared/components/src/panels/StoryboardPanel/__testing__/storyOnlyMockPort.ts`. Implements `useStoryOnlyMockPort` per `contracts/harness-knobs.md` §2. The fixture-seed types compose `Pick<SceneRowViewModel, ...>` per `data-model.md` §2 — do NOT redeclare scene fields.

### 1.4 Refactor the harness to share the helper
The existing `apps/web-shell/src/StoryboardEditHarness.tsx` (334 LOC) is **already reducer-driven** — it calls `useStoryboardEditReducer()` at line 117 and dispatches actions from event handlers. The work here is to **extract** the fixture-seed + mock-extension layer (the bit that fakes the postMessage round-trip) into `useStoryOnlyMockPort` and have the harness import it. The reducer wiring itself does not change. After refactor, the existing `storyboard-edit.spec.ts` smoke suite MUST still pass — it is the regression gate.

```sh
cd apps/web-shell && node run-playwright.mjs storyboard-edit
```

### 1.5 Upgrade each of the four stories
File: `shared/components/src/panels/StoryboardPanel/StoryboardPanel.stories.tsx`

For `WithEditForm`, `WithUndoToast`, `WithStaleBadge`, `WithMissingDataRemediation` (lines 232 / 256 / 281 / 301), replace `args: { ... }` with a render function that calls `useStoryOnlyMockPort(seed, knobs)` and wraps `<StoryboardPanel>` in `<PortContext.Provider value={mockPort.port}>`. The `WithStaleBadge` story passes `{ induceRefreshFailure: 'sceneB' }` so its failure-path control is exercisable from Storybook.

### 1.6 Re-export the helper from the package barrel (2A)
File: `shared/components/src/panels/StoryboardPanel/index.ts`. Add `export * from './__testing__/storyOnlyMockPort';` so harness + stories can import via the barrel. Convention only — production safety is enforced by FR-044's ESLint rule, not by build tooling.

### 1.7 Verify
```sh
pnpm --filter @debrief/components storybook
# Open each story; click chevron, Delete, Refresh, keyboard-Tab to remediation. Each must respond.

pnpm --filter @debrief/components test PortContext
# T1A: provider supplies port → dispatch → message emitted; no provider → first postMessage throws.

pnpm --filter @debrief/components test
# Reducer + component unit tests stay green (88+ assertions from #230)
```

---

## US2 — Code-server chrome E2E (P1)

### 2.1 Create the spec
File: `tests/e2e/test-storyboard-edit.spec.ts` (repo root, alongside `test-storyboard-playback.spec.ts`).

Pattern: copy `tests/e2e/test-storyboard-playback.spec.ts`'s setup boilerplate. For each of the 11 commands, do:

1. `await page.keyboard.press('Control+Shift+P');`
2. Type the command title. Press Enter.
3. If the command has a native prompt, fulfil it via `.monaco-inputbox input` or `.quick-input-widget input`.
4. Assert the matching Log Panel card appears via `[data-testid="log-panel-card"]` + `data-op` attribute.
5. For one mid-flow command (`Storyboard: Rename scene`), capture `vscode-native-chrome.png` to `specs/218-storyboarding-edit/evidence/screenshots/vscode-native-chrome.png`.

### 2.2 Verify
```sh
cd apps/web-shell && node run-playwright.mjs test-storyboard-edit
```

---

## US3 — A11y audit (P2)

### 3.1 Create the categoriser helper + unit test (T4A)
Files:
- `apps/web-shell/playwright/helpers/a11yCategoriser.ts` — pure function: serious + critical → fail, moderate → warn, minor → ignore.
- `apps/web-shell/playwright/helpers/__tests__/a11yCategoriser.test.ts` — 5-case unit test with an injectable writer.

### 3.2 Create the audit spec
File: `apps/web-shell/playwright/tests/storyboard-edit-a11y.spec.ts`. Three harness states + four story iframes × three themes = 21 axe runs (per FR-021 + research R4). The spec calls `categoriseAxeViolations` and writes both:
- `specs/234-storyboard-edit-polish-followup/evidence/a11y-report.md` (human-readable, per data-model.md §3a)
- `specs/234-storyboard-edit-polish-followup/evidence/a11y-results.json` (raw axe output, per data-model.md §3b — FR-023)

### 3.3 Verify
```sh
cd apps/web-shell && node run-playwright.mjs storyboard-edit-a11y
# Passes only if zero serious/critical violations. Moderate violations land in the report + JSON.
```

---

## US4 — Perf budget test (P2)

### 4.1 Promote `composeSceneEditViewModels` to public API (FR-046)
Files:
- `shared/components/src/panels/StoryboardPanel/CONTRACTS.md` — pinned signature + invariant + perf budget per `data-model.md` §5.
- `shared/components/CHANGELOG.md` — "Unreleased — Public API" entry.
- Update the JSDoc on `composeSceneEditViewModels` in `types.ts:325` so the contract is discoverable in source.

### 4.2 Create the perf spec (D1A)
File: `shared/components/src/panels/StoryboardPanel/__tests__/composeSceneEditViewModels.perf.test.ts`. Build a 5 × 50-Scene fixture, call `composeSceneEditViewModels(state)` against the active storyboard 100 times, take median, assert ≤ 50 ms hard / ≤ 60 ms in CI. The failure message MUST cite `CONTRACTS.md` (FR-046).

The target is the **pure exported composer**, NOT `storyboardPanelView.refresh()` — see research R5 for the rationale. The 5 × 50 fixture validates the FR-008 active-only invariant: a regression that walks all 250 scenes will cross the budget.

### 4.3 Verify the regression-loud guarantee
Temporarily edit `composeSceneEditViewModels` to walk every storyboard's scenes (not just the active one). Run the test — it MUST fail with the measured median in the failure message AND the path to `CONTRACTS.md`. Revert.

### 4.4 Verify
```sh
pnpm --filter @debrief/components test composeSceneEditViewModels.perf
```

---

## US5 — Playwright scenarios + interaction GIF (P3)

### 5.1 Extend the harness query-string parser (FR-043)
File: `apps/web-shell/src/storyboard-edit-harness-querystring.ts`. Add **both** knobs (`induceCopyFailure`, `induceRefreshFailure`) per `contracts/harness-knobs.md` §1. Empty values drop the field with a console warning.

### 5.2 Add the parser unit test (T3A)
File: `apps/web-shell/src/__tests__/storyboard-edit-harness-querystring.test.ts`. 5 cases: copy set, refresh set, both set, missing, invalid (empty value drops + warns).

### 5.3 Wire the knobs through the harness
File: `apps/web-shell/src/StoryboardEditHarness.tsx`. Pass the parsed knobs into `useStoryOnlyMockPort(seed, knobs)`.

### 5.4 Add the GIF helper + its unit test (T2A)
Files:
- `apps/web-shell/playwright/helpers/videoToGif.ts` — `convertWebmToGif(input, output, opts?)` shells out to ffmpeg via `child_process.execFile` (palettegen + paletteuse, 10 fps, max-width 960 px). Return value carries measured size + duration. Warn at 1.8 MB; never relax the 2 MB hard cap (P2A).
- `apps/web-shell/playwright/fixtures/sample.webm` — 50 KB checked-in fixture (1 s solid colour).
- `apps/web-shell/playwright/helpers/__tests__/videoToGif.test.ts` — vitest unit test against the fixture (output exists, fps ≤ 12, size > 0, duration ± 0.1 s). Skip when ffmpeg is missing locally.

### 5.5 Extend the web-shell spec
File: `apps/web-shell/playwright/tests/storyboard-edit.spec.ts`. Add the seven new scenarios per plan.md's Web-Shell E2E Testing table. Each scenario MUST end with a Log Panel card assertion (FR-041).

### 5.6 Add the GIF capture spec
File: `apps/web-shell/playwright/tests/storyboard-edit-interaction-gif.spec.ts`. Configure `recordVideo`. The scenario performs rename → describe → delete + undo → refresh-stale. Convert via `videoToGif.ts`. Assert size < 2 MB (helper warns at 1.8 MB) and duration < 5 s. Output: `specs/218-storyboarding-edit/evidence/screenshots/interaction.gif`.

### 5.7 Verify
```sh
cd apps/web-shell && node run-playwright.mjs storyboard-edit
cd apps/web-shell && node run-playwright.mjs storyboard-edit-interaction-gif
ls -la specs/218-storyboarding-edit/evidence/screenshots/interaction.gif
```

---

## Cross-cutting (review-driven additions, formerly deferred)

### CC1 — ESLint `no-restricted-imports` rule (FR-044)
File: `apps/vscode/.eslintrc.*` (or `apps/vscode/eslint.config.*`). Add a rule forbidding `apps/vscode/src/**` from importing any path matching `**/__testing__/**` (or `@debrief/components/**/__testing__/*`). Wire into the existing `pnpm lint` command.

Verify:
```sh
# Add a temporary import in apps/vscode/src/views/storyboardPanelView.ts:
#   import { useStoryOnlyMockPort } from '@debrief/components/.../__testing__/storyOnlyMockPort';
pnpm lint
# MUST fail with the no-restricted-imports rule citing the __testing__ path. Then revert.
```

### CC2 — Taskfile `verify:ffmpeg` target (FR-045)
File: `Taskfile.yml`. Add a `verify:ffmpeg` target (or inline check inside `verify`) that runs `ffmpeg -version >/dev/null 2>&1 || (echo "ffmpeg required for GIF capture (#234 FR-045) — install via Homebrew/apt/scoop"; exit 1)`. Wire it as a dependency of `verify`.

Verify:
```sh
# With ffmpeg present:
task verify:ffmpeg  # passes silently
# Simulate missing (rename binary on PATH):
PATH=/usr/bin task verify:ffmpeg  # fails with the remediation message
```

### CC3 — `composeSceneEditViewModels` public API contract (FR-046)
Already covered in 4.1 — `CONTRACTS.md` + CHANGELOG entry + JSDoc.

---

## Final pre-PR check

Run the full CI gate:

```sh
task verify
# Includes verify:ffmpeg (CC2), pnpm lint (FR-044), pyright, all unit tests, all Playwright suites.
# Or, when `task` is not available, the four-step sequence in CLAUDE.md "Before Pushing".
```

All steps MUST be green. No skipped tests; no warnings tolerated.

---

## Evidence checklist (verify before /speckit.pr)

- [ ] `evidence/opening-context.md` (already written by /speckit.plan)
- [ ] `evidence/a11y-report.md` (US3)
- [ ] `evidence/a11y-results.json` (US3)
- [ ] `specs/218-storyboarding-edit/evidence/screenshots/vscode-native-chrome.png` (US2)
- [ ] `specs/218-storyboarding-edit/evidence/screenshots/interaction.gif` (US5)
- [ ] All other #218 evidence-table screenshots refreshed via the new web-shell scenarios (US5)
- [ ] Perf-budget result appended to `specs/218-storyboarding-edit/evidence/perf-budget-report.md` (US4)
- [ ] `shared/components/src/panels/StoryboardPanel/CONTRACTS.md` exists (FR-046)
- [ ] `shared/components/CHANGELOG.md` has the public-API entry (FR-046)
- [ ] `evidence/test-summary.md` (generated at /speckit.pr time per the test-summary template)
