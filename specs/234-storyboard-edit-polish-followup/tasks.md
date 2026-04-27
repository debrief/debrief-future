# Tasks: Storyboard Edit Suite — Polish Follow-up (stories, code-server E2E, a11y, perf, scenario completion)

**Branch**: `234-storyboard-edit-polish-followup`
**Plan**: [plan.md](./plan.md)
**Spec**: [spec.md](./spec.md)
**Research**: [research.md](./research.md)
**Data model**: [data-model.md](./data-model.md)
**Contracts**: [contracts/harness-knobs.md](./contracts/harness-knobs.md)
**Quickstart**: [quickstart.md](./quickstart.md)

> **Architecture pivot 2026-04-27 (ADR-027):** Phase 2's `PortContext` (T008/T009/T010) and Phase 3's production-webview wrap (T020) are **dropped**. The shared behavioural layer is delivered by `useStoryOnlyMockHandlers` — a callback-adapter helper that returns `{state, dispatch, handlers}`; the harness + each upgraded story spread `{...handlers}` onto `<StoryboardPanel>`. `<StoryboardPanel>` stays purely presentational. Tasks T011/T012/T021/T023-T026 are revised to reflect this. See `research.md` R10b + `contracts/harness-knobs.md` §2.

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip Playwright E2E tasks because you think browsers can't be installed. The project uses `@sparticuz/chromium` which bundles a Linux Chromium binary via npm. Run `node apps/web-shell/run-playwright.mjs` to extract and configure. Full details: `docs/project_notes/playwright-installation-research.md`.

> **ffmpeg required** — FR-045 wires `task verify:ffmpeg` into `task verify`; install via Homebrew (`brew install ffmpeg`), apt, or scoop. Prior art: #217 T520, #189 T048.

---

## Evidence Requirements

**Evidence Directory**: `specs/234-storyboard-edit-polish-followup/evidence/`
**Media Directory**: `specs/234-storyboard-edit-polish-followup/media/`
**Cross-feature Screenshot Target**: `specs/218-storyboarding-edit/evidence/screenshots/` (per FR-015 / FR-042 — this feature closes the parent #218 evidence-table; vscode-native-chrome.png + interaction.gif land there)

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/opening-context.md` | Cached blog opener (Hook + What We're Building / How It Fits / Key Decisions) | Captured during /speckit.plan ✓ |
| `evidence/test-summary.md` | Test results with YAML front matter (`feature`, `captured_at`, `git_sha`, `tests_passed/failed/skipped`, `coverage_pct`); MUST use `.specify/templates/evidence/test-summary-template.md` | After full suite passes (Phase 8) |
| `evidence/usage-example.md` | Concrete demo of the polish loop (open story, click chevron, dispatch reducer action, see panel state change) | After Phase 3 + Phase 7 green |
| `evidence/a11y-report.md` | `@axe-core/playwright` audit results: surfaces audited, axe version, violation counts by severity, accepted-risk entries (FR-022, FR-023) | After Phase 5 |
| `evidence/a11y-results.json` | Raw axe-core results JSON per surface × theme variant (FR-023; data-model.md §3b) | After Phase 5 |
| `evidence/webview-e2e-summary.md` | Web-shell + code-server E2E pass/fail summary + screenshot index | After Phases 4 + 7 |
| `evidence/perf-budget-234.md` | Median wall-clock across 100 iterations of `composeSceneEditViewModels()`; budget assertion result; references `CONTRACTS.md` per FR-046 | After Phase 6 |
| `specs/218-storyboarding-edit/evidence/screenshots/vscode-native-chrome.png` | One mid-flow screenshot of native input-box or quick-pick (FR-015) | During Phase 4 |
| `specs/218-storyboarding-edit/evidence/screenshots/interaction.gif` | < 5 s, < 2 MB recording of rename → describe → delete + undo → refresh-stale (FR-042; 1.8 MB soft / 2 MB hard) | During Phase 7 |
| `specs/218-storyboarding-edit/evidence/screenshots/*.png` | Refresh of #218 evidence-table screenshots via the new web-shell scenarios (closes the parent table) | During Phase 7 |

### Public-API + Toolchain Artifacts (review-driven, FR-044/045/046)

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `shared/components/src/panels/StoryboardPanel/CONTRACTS.md` | Pinned signature + perf invariant for `composeSceneEditViewModels` (FR-046) | Phase 2 |
| `shared/components/CHANGELOG.md` (entry) | "Unreleased — Public API" entry promoting `composeSceneEditViewModels` (FR-046) | Phase 2 |
| `apps/vscode/eslint.config.*` (rule) | `no-restricted-imports` forbidding production imports of `__testing__/*` (FR-044) | Phase 2 |
| `Taskfile.yml` (target) | `verify:ffmpeg` target wired into `task verify` (FR-045) | Phase 2 |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `evidence/opening-context.md` | Cached opener — four prose sections (Hook + 3 verbatim) | During /speckit.plan ✓ |
| `media/shipped-post.md` | Feature blog post (opener copied verbatim + Screenshots + By-the-Numbers + Lessons Learned + What's Next) | Phase 8 via Content Specialist |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in `debrief-future` against `main` with evidence links + test summary | Final task via `/speckit.pr` |
| Blog PR | Cross-repo PR in `debrief.github.io` publishing `shipped-post.md` | Triggered by `/speckit.pr` |

---

## Phase 1: Setup

**Goal**: Confirm baseline green before any changes; create the feature evidence + media directories.

- [ ] T001 Confirm baseline green by running `task verify` on main + the feature branch. Capture output to `specs/234-storyboard-edit-polish-followup/evidence/baseline-verify.txt`
- [x] T002 [P] Create the feature evidence directory if missing `specs/234-storyboard-edit-polish-followup/evidence/`
- [x] T003 [P] Create the feature media directory `specs/234-storyboard-edit-polish-followup/media/`
- [x] T004 [P] Confirm ffmpeg is available locally (`ffmpeg -version`) — this is the baseline check FR-045 will automate; document the version + remediation path in `specs/234-storyboard-edit-polish-followup/evidence/baseline-verify.txt`

## Phase 2: Foundation

**Goal**: Land the shared building blocks every user story depends on — the shared callback-adapter helper, the extended query-string parser, the public-API contract for `composeSceneEditViewModels`, the ESLint rule, and the Taskfile ffmpeg check. Nothing in Phase 3+ runs cleanly until this is green. (Per ADR-027 the `PortContext` no longer features.)

**Independent test criteria**: After this phase:
- `pnpm --filter @debrief/components test storyOnlyMockHandlers` passes (T1A unit test, post-ADR-027).
- `pnpm --filter @debrief/web-shell test storyboard-edit-harness-querystring` passes (T3A unit test).
- `pnpm lint` fails when a temporary import of `**/__testing__/**` is added under `apps/vscode/src/**` (FR-044 enforcement).
- `task verify:ffmpeg` exits 0 with ffmpeg present, exits non-zero with a remediation message when ffmpeg is missing (FR-045).
- `shared/components/src/panels/StoryboardPanel/CONTRACTS.md` exists with the pinned signature + perf invariant (FR-046).

### Public-API contract for `composeSceneEditViewModels` (FR-046)

- [x] T005 Create the public-API contract document `shared/components/src/panels/StoryboardPanel/CONTRACTS.md` with the pinned signature, the FR-008 active-only invariant, the FR-030 perf budget (50 ms hard / 60 ms soft), and re-baselining conditions per data-model.md §5
- [x] T006 Add an "Unreleased — Public API" entry to `shared/components/CHANGELOG.md` promoting `composeSceneEditViewModels` from "exported helper" to "public API with perf invariant"; cite FR-046
- [x] T007 Update the JSDoc on `composeSceneEditViewModels` in `shared/components/src/panels/StoryboardPanel/types.ts` (line 325) to point at `CONTRACTS.md`

### ~~`PortContext` (D3A)~~ — **REMOVED 2026-04-27 (ADR-027)**

> Removed. The shared behavioural layer is delivered by the callback-adapter helper below; no React context is introduced. Original tasks T008/T009/T010 (`PortContext.tsx`, `PortContext.test.tsx`, panel rewires) are dropped.

### Shared story-only mock-handlers helper (FR-003)

- [x] T008 [test] Unit-test the shared callback-adapter helper per T1A: (a) seed → `state` matches fixture; (b) `handlers.onSceneTitleRenameCommit('s1','new')` → state shows new title; (c) `handlers.onSceneDeleteRequested('s1')` → row removed AND `pendingUndoToast` populated; (d) `knobs.induceCopyFailure==='s1'` → `onSceneCopyToOtherClicked('s1')` dispatches the failure-branch action; (e) `knobs.induceRefreshFailure==='s2'` → `onSceneRefreshThumbnailClicked('s2')` retains the stale flag. `shared/components/src/panels/StoryboardPanel/__testing__/__tests__/storyOnlyMockHandlers.test.ts` *(post-ADR-027 — replaces the deleted T009 PortContext test)*
- [ ] T009 *(reserved — was the PortContext unit test; replaced by T008 above. Kept as a placeholder so downstream task IDs stay stable.)*
- [ ] T010 *(reserved — was `StoryboardPanel.tsx` rewires to `usePanelPort()`; not needed in the callback-adapter architecture. The panel's existing callback-prop surface is the test seam.)*
- [x] T011 Create the `__testing__/` directory and add the shared callback-adapter helper exporting `useStoryOnlyMockHandlers`, `MockPortKnobs`, `SceneEditFixtureSeed`, `SceneFixtureSeed`, `MockHandlers` per contracts/harness-knobs.md §2 + data-model.md §1, §2 (uses `Pick<SceneRowViewModel, ...>` for the seed and `Pick<StoryboardPanelProps, ...>` for the handlers — D2A) `shared/components/src/panels/StoryboardPanel/__testing__/storyOnlyMockHandlers.ts`
- [x] T012 Re-export the helper from the panel barrel so harness + stories import via the package surface (2A convention) `shared/components/src/panels/StoryboardPanel/index.ts`

### Extended query-string parser (FR-043, dual-knob)

- [x] T013 Extend the harness query-string parser to accept BOTH `induceCopyFailure` AND `induceRefreshFailure` knobs per contracts/harness-knobs.md §1; empty values drop the field with a console warning `apps/web-shell/src/storyboard-edit-harness-querystring.ts`
- [x] T014 [test] Unit-test the parser with 5 cases per T3A: copy set, refresh set, both set, missing, invalid (empty) `apps/web-shell/src/__tests__/storyboard-edit-harness-querystring.test.ts`

### ESLint test-only boundary (FR-044)

- [x] T015 Add a `no-restricted-imports` rule under the `apps/vscode/` ESLint config forbidding any path matching `**/__testing__/**` or `@debrief/components/**/__testing__/*`; verify the rule fires by adding a temporary forbidden import then reverting `apps/vscode/eslint.config.mjs` (or `.eslintrc.cjs` per current config style)
- [x] T016 Confirm `pnpm lint` from repo root exercises the new rule (no new script needed — existing `pnpm lint` should already cover `apps/vscode`)

### Taskfile ffmpeg check (FR-045)

- [x] T017 Add the `verify:ffmpeg` target (or inline check) that runs `ffmpeg -version >/dev/null 2>&1` and exits non-zero with a clear remediation message ("ffmpeg required for GIF capture (#234 FR-045) — install via Homebrew/apt/scoop") when missing; wire it as a dependency of `verify` `Taskfile.yml`

### Parallel-execution example for Phase 2 (revised post-ADR-027)

T005, T006, T011, T013, T015, T017 touch independent files and may run in parallel; T007/T012/T016 depend on their respective siblings. T008 (helper unit test) depends on T011 (helper exists). T014 (parser unit test) depends on T013. T009/T010/T020 are removed (PortContext path).

## Phase 3: US1 — Interactive Storybook (P1)

**Goal**: Upgrade the four edit-suite Storybook stories from static `args`-based props to fully interactive ones backed by `useStoryboardEditReducer` via the shared mock-port helper. The stories become the post's headline asset — reviewers can play with them.

**Independent test criteria**: `pnpm --filter @debrief/components storybook` opens; each of the four stories responds to the documented interactions (chevron → edit form, Delete → Undo cycle, Refresh badge, keyboard-Tab to remediation). The smoke E2E suite (`storyboard-edit.spec.ts`) continues to pass after the harness has been refactored to use the shared helper.

### ~~Production webview wiring (D3A)~~ — **REMOVED 2026-04-27 (ADR-027)**

- [ ] T020 *(removed — the production webview entry `apps/vscode/src/webview/web/storyboardPanel.tsx` is unchanged. `<StoryboardPanel>` stays purely presentational and continues to use callback props. No `<PortContext.Provider>` wrap.)*

### Refactor the harness to import the shared mock-handlers helper (FR-003)

- [x] T021 Replace the harness's inline reducer + handler wiring with `useStoryOnlyMockHandlers` from the shared helper. Spread the returned `handlers` onto the panel: `<StoryboardPanel ...stateProps {...handlers} />`. Thread the parsed query-string knobs (`induceCopyFailure`, `induceRefreshFailure`) through to the helper. **No `PortContext.Provider` wrap (post-ADR-027).** The harness's existing `useStoryboardEditReducer()` call at line 117 is removed — `useStoryOnlyMockHandlers` owns the reducer wiring now. Depends on T011 + T012. `apps/web-shell/src/StoryboardEditHarness.tsx`
- [x] T022 Run the existing storyboard-edit smoke E2E to prove the refactor preserves behaviour: `cd apps/web-shell && node run-playwright.mjs storyboard-edit` — record output to `specs/234-storyboard-edit-polish-followup/evidence/harness-refactor-smoke.txt`

### Upgrade the four stories (FR-001, FR-002)

- [x] T023 Upgrade `WithEditForm` (line 232): replace `args` with a render function that calls `useStoryOnlyMockHandlers(seed)` and spreads `{...handlers}` onto `<StoryboardPanel>`; demonstrates form open/submit/cancel. **No `PortContext.Provider` wrap.** `shared/components/src/panels/StoryboardPanel/StoryboardPanel.stories.tsx`
- [x] T024 Upgrade `WithUndoToast` (line 256): same pattern; demonstrates delete + Undo cycle `shared/components/src/panels/StoryboardPanel/StoryboardPanel.stories.tsx`
- [x] T025 Upgrade `WithStaleBadge` (line 281): pass `{ induceRefreshFailure: '<sceneId>' }` knob via story args so the failure toggle is exercisable from Storybook controls. The story render reads it from args and passes it to `useStoryOnlyMockHandlers(seed, knobs)`. `shared/components/src/panels/StoryboardPanel/StoryboardPanel.stories.tsx`
- [x] T026 Upgrade `WithMissingDataRemediation` (line 301): same pattern; demonstrates keyboard-Tab focus + Enter dispatch `shared/components/src/panels/StoryboardPanel/StoryboardPanel.stories.tsx`

### Verification

- [x] T027 Run `pnpm --filter @debrief/components test` — reducer + component unit tests stay green (88+ assertions from #230 must still pass)
- [ ] T028 Manual Storybook walkthrough: open each upgraded story; click chevron / Delete + Undo / Refresh / keyboard-Tab; confirm UI responds via the real reducer. Record results in `specs/234-storyboard-edit-polish-followup/evidence/storybook-walkthrough.md`

### Parallel-execution example for Phase 3

T023, T024, T025, T026 all edit the same `StoryboardPanel.stories.tsx` file → must run sequentially. T021 (harness refactor) is independent. T022 + T027 + T028 depend on the upgrades being complete. (T020 was removed — no production-webview wrap step in the callback-adapter architecture.)

## Phase 4: US2 — Code-server chrome E2E (P1)

**Goal**: Prove all 11 new Storyboard edit commands are reachable from the VS Code command palette and that the native VS Code chrome surfaces (input box, quick pick, notification toasts) work correctly. Spec is intentionally narrow: it does NOT duplicate web-shell click flows (FR-014).

**Independent test criteria**: `cd apps/web-shell && node run-playwright.mjs test-storyboard-edit` invokes all 11 commands via palette; for the 3 prompt-bearing commands (rename / duplicate-timestamp / storyboard rename) the native input-box is fulfilled; for copy-to-other the quick-pick is fulfilled; for completions the native toast is observed; one `vscode-native-chrome.png` screenshot is captured mid-flow.

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — see header note. ffmpeg is not required for this phase (no GIF capture).

### Spec scaffolding

- [x] T030 Create the code-server E2E spec with the global setup boilerplate copied from `tests/e2e/test-storyboard-playback.spec.ts` (selector helpers `.monaco-inputbox input`, `.quick-input-widget input`, notification-surface) `tests/e2e/test-storyboard-edit.spec.ts`

### Per-command coverage (FR-010)

- [x] T031 Cover `Storyboard: Rename scene` — palette → native input-box → assert `[data-testid="log-panel-card"][data-op="renameScene"]` appears `tests/e2e/test-storyboard-edit.spec.ts`
- [x] T032 Cover `Storyboard: Describe scene` — palette → native input-box → assert log-panel card `tests/e2e/test-storyboard-edit.spec.ts`
- [x] T033 Cover `Storyboard: Delete scene` — palette → assert deletion + Undo toast surface (no native prompt) `tests/e2e/test-storyboard-edit.spec.ts`
- [x] T034 Cover `Storyboard: Undo delete` — palette → assert restoration `tests/e2e/test-storyboard-edit.spec.ts`
- [x] T035 Cover `Storyboard: Update scene to current` — palette → assert log-panel card `tests/e2e/test-storyboard-edit.spec.ts`
- [x] T036 Cover `Storyboard: Duplicate scene` — palette → if collision detected, native modal surfaces with Replace/Offset/Cancel options (FR-011) → choose Offset → assert new row at offset timestamp `tests/e2e/test-storyboard-edit.spec.ts`
- [x] T037 Cover `Storyboard: Copy scene to other storyboard` — palette → native quick-pick (FR-012) → select destination → assert success toast (FR-013) `tests/e2e/test-storyboard-edit.spec.ts`
- [x] T038 Cover `Storyboard: Refresh scene thumbnail` — palette → assert log-panel card `tests/e2e/test-storyboard-edit.spec.ts`
- [x] T039 Cover `Storyboard: Refresh all stale` — palette → assert log-panel card with summary `tests/e2e/test-storyboard-edit.spec.ts`
- [x] T040 Cover `Storyboard: Rename storyboard` — palette → native input-box → assert log-panel card `tests/e2e/test-storyboard-edit.spec.ts`
- [x] T041 Cover `Storyboard: Describe storyboard` — palette → native input-box → assert log-panel card `tests/e2e/test-storyboard-edit.spec.ts`

### Native-chrome screenshot (FR-015)

- [x] T042 During the rename-scene flow (T031), capture one mid-flow screenshot showing the native `.monaco-inputbox` visible, save to `specs/218-storyboarding-edit/evidence/screenshots/vscode-native-chrome.png`

### Verification

- [ ] T043 Run the full code-server spec: `cd apps/web-shell && node run-playwright.mjs test-storyboard-edit` — all 11 commands pass; vscode-native-chrome.png lands at the target path

### Parallel-execution example for Phase 4

T031–T041 all edit the same `test-storyboard-edit.spec.ts` file → must run sequentially. T042 is captured inside T031's flow. T043 runs last.

## Phase 5: US3 — A11y audit (P2)

**Goal**: Run `@axe-core/playwright` against the three highest-risk harness states + the four upgraded Storybook stories × three theme variants (= 21 audit calls). No serious or critical violations permitted; moderate violations either fixed or logged as accepted-risk in `evidence/a11y-report.md`. Raw axe JSON also persisted for re-analysis.

**Independent test criteria**: `cd apps/web-shell && node run-playwright.mjs storyboard-edit-a11y` passes with zero serious/critical violations across all 21 audits; `evidence/a11y-report.md` enumerates all surfaces + violation counts; `evidence/a11y-results.json` contains raw axe results per surface.

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — see header note.

### Pure categoriser helper (T4A — pull pass/fail/warn logic out of the spec)

- [x] T050 Create the pure categoriser helper `categoriseAxeViolations(results)` returning `{ fail, warn, ignore }` per research R12 `apps/web-shell/playwright/helpers/a11yCategoriser.ts`
- [x] T051 [test] Unit-test the categoriser per T4A: serious → fail, critical → fail, moderate → warn + report-row written via injectable writer, minor → ignore, mixed input partitioned correctly `apps/web-shell/playwright/helpers/__tests__/a11yCategoriser.test.ts`

### A11y spec (FR-020, FR-021, FR-023)

- [x] T052 Create the a11y spec with shared setup (axe version read from `@axe-core/playwright/package.json` once at suite start) `apps/web-shell/playwright/tests/storyboard-edit-a11y.spec.ts`
- [x] T053 Audit harness state #1: overflow menu open — call `categoriseAxeViolations`; collect serious/critical/moderate counts `apps/web-shell/playwright/tests/storyboard-edit-a11y.spec.ts`
- [x] T054 Audit harness state #2: edit form open + stale badge visible — same pattern `apps/web-shell/playwright/tests/storyboard-edit-a11y.spec.ts`
- [x] T055 Audit harness state #3: missing-data remediation visible — same pattern `apps/web-shell/playwright/tests/storyboard-edit-a11y.spec.ts`
- [x] T056 Audit each of the 4 story iframes × 3 theme variants (light/dark/vscode) using the iframe URL pattern `/iframe.html?id=components-storyboardpanel--with-edit-form&globals=theme:vscode` per research R4 `apps/web-shell/playwright/tests/storyboard-edit-a11y.spec.ts`

### Evidence outputs (FR-023)

- [x] T057 Write `evidence/a11y-report.md` per data-model.md §3a — markdown table of (surface, theme, axe version, severity counts, status) + Accepted Risks section enumerating any moderate violations `specs/234-storyboard-edit-polish-followup/evidence/a11y-report.md`
- [x] T058 Write `evidence/a11y-results.json` per data-model.md §3b — consolidated raw axe results JSON (capturedAt + axeVersion + gitSha + per-surface results) `specs/234-storyboard-edit-polish-followup/evidence/a11y-results.json`

### Verification

- [x] T059 Run the full a11y suite: `cd apps/web-shell && node run-playwright.mjs storyboard-edit-a11y` — passes with zero serious/critical; total runtime measured (P3A: revisit if > 60 s); both report files written

### Parallel-execution example for Phase 5

T050 + T052 are independent files and may run in parallel. T051 depends on T050. T053–T056 all edit the same spec file → sequential. T057 + T058 depend on the spec being complete.

## Phase 6: US4 — Perf budget test (P2)

**Goal**: Pin a 50 ms median budget (60 ms CI soft cap) on `composeSceneEditViewModels()` against a 50-Scene active storyboard, with a 5 × 50 fixture in memory to validate the FR-008 active-only invariant. Target the **pure exported composer** rather than the webview-coupled `storyboardPanelView.refresh()` (per research R5 + D1A). Failure message cites `CONTRACTS.md` (FR-046).

**Independent test criteria**: `pnpm --filter @debrief/components test composeSceneEditViewModels.perf` passes (median ≤ 50 ms hard / 60 ms CI). When a deliberate regression is introduced (composer walks all 250 scenes instead of just the active 50), the test fails loudly with the measured median + a pointer to `CONTRACTS.md` (FR-032).

### Perf test (FR-030, FR-031, FR-032)

- [x] T060 Create the perf test mirroring the `storyboardEditService.perf.test.ts` methodology (median over 100 iterations, JIT warm-up untimed, vitest); target is `composeSceneEditViewModels` per data-model.md §5 + research R5; failure message cites `CONTRACTS.md` per FR-046 `shared/components/src/panels/StoryboardPanel/__tests__/composeSceneEditViewModels.perf.test.ts`
- [x] T061 Build the 5 × 50 Scene synthetic fixture inline in the test file (or in a sibling fixtures helper) — 250 scenes total, only the active storyboard's 50 are exercised per call `shared/components/src/panels/StoryboardPanel/__tests__/composeSceneEditViewModels.perf.test.ts`

### Regression-loud verification (FR-032)

- [ ] T062 Verify the regression-loud guarantee by temporarily editing `composeSceneEditViewModels` to walk all storyboards (not just active); run the perf test → must fail with the measured median + `CONTRACTS.md` reference; revert the temporary edit. Record the failure transcript in `specs/234-storyboard-edit-polish-followup/evidence/perf-budget-234.md`

### Evidence

- [x] T063 Write `specs/234-storyboard-edit-polish-followup/evidence/perf-budget-234.md` — measured median + p95 from a clean run, the synthetic regression failure transcript from T062, references to FR-008 + FR-030 + FR-046

### Verification

- [ ] T064 Run `pnpm --filter @debrief/components test composeSceneEditViewModels.perf` — passes at the 50/60 ms budget; assertion message visible

### Parallel-execution example for Phase 6

T060 + T061 are linked (same file) → sequential. T062 + T063 depend on the test being green. T064 last.

## Phase 7: US5 — Playwright scenarios + interaction GIF (P3)

**Goal**: Extend the web-shell Playwright suite with the seven still-uncovered scenarios + the < 5 s / < 2 MB interaction GIF showing the polish loop. Use the dual-knob harness to deterministically reach the failure paths (`?induceCopyFailure`, `?induceRefreshFailure`).

**Independent test criteria**: `cd apps/web-shell && node run-playwright.mjs storyboard-edit` runs all scenarios green (smoke + 7 new); `cd apps/web-shell && node run-playwright.mjs storyboard-edit-interaction-gif` produces `specs/218-storyboarding-edit/evidence/screenshots/interaction.gif` at < 5 s + < 2 MB (helper warns at 1.8 MB per P2A); every successful edit op asserts a matching Log Panel card via `[data-testid="log-panel-card"]` with `data-op` (FR-041).

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — see header note. ffmpeg required (FR-045 already wired in Phase 2 T017).

### videoToGif helper (T2A)

- [x] T070 Create the GIF conversion helper `convertWebmToGif(input, output, opts?)` shelling out to ffmpeg via `child_process.execFile` with palettegen + paletteuse + 10 fps + max-width 960 px; return measured size + duration; warn at 1.8 MB (P2A) `apps/web-shell/playwright/helpers/videoToGif.ts`
- [x] T071 Check in the 50 KB sample webm fixture for the helper's unit test (1 second of solid colour) `apps/web-shell/playwright/fixtures/sample.webm`
- [x] T072 [test] Unit-test the helper per T2A: output GIF exists, fps ≤ 12, size > 0, duration matches input ± 0.1 s; skip when ffmpeg missing locally `apps/web-shell/playwright/helpers/__tests__/videoToGif.test.ts`

### Wire the dual-knob into the harness mock-handlers (FR-043 — depends on T013/T014/T021)

- [x] T073 Pass parsed knobs from `parseStoryboardEditHarnessQueryString()` into `useStoryOnlyMockHandlers(seed, knobs)` so both `induceCopyFailure` and `induceRefreshFailure` reach the failure-branch handlers (post-ADR-027) `apps/web-shell/src/StoryboardEditHarness.tsx`

### Seven new web-shell scenarios (FR-040, FR-041)

- [x] T074 Scene rename (inline): open chevron → edit title → submit → assert row text + `[data-testid="log-panel-card"][data-op="renameScene"]` `apps/web-shell/playwright/tests/storyboard-edit.spec.ts`
- [x] T075 Duplicate-at-colliding-timestamp prompt: invoke Duplicate on colliding row → modal surfaces with Replace/Offset/Cancel → choose Offset → assert new row at offset timestamp + log-panel card `apps/web-shell/playwright/tests/storyboard-edit.spec.ts`
- [x] T076 Copy-to-other (success): overflow → Copy to other → pick destination → assert success toast + log-panel card `apps/web-shell/playwright/tests/storyboard-edit.spec.ts`
- [x] T077 Copy-to-other (deep-copy failure via `?induceCopyFailure=<sceneId>`): trigger copy → assert error toast + rollback (no row added at destination) + log-panel card `apps/web-shell/playwright/tests/storyboard-edit.spec.ts`
- [x] T078 Update-to-current: overflow → Update to current → assert thumbnail + visible_feature_ids refreshed in log-panel card `apps/web-shell/playwright/tests/storyboard-edit.spec.ts`
- [x] T079 Storyboard rename + describe: edit title → blur → assert update; edit description → assert update + log-panel cards `apps/web-shell/playwright/tests/storyboard-edit.spec.ts`
- [x] T080 Bulk refresh partial failure (via `?induceRefreshFailure=<sceneId>`): inject mixed-stale fixture → click Refresh All → assert badges cleared on success rows + retained on failure row + warning toast + log-panel card `apps/web-shell/playwright/tests/storyboard-edit.spec.ts`

### Interaction GIF spec (FR-042)

- [x] T081 Create the dedicated GIF capture spec with `recordVideo` configured; scenario performs rename → describe → delete + undo → refresh-stale; converts via `videoToGif.ts`; asserts file size < 2 MB and duration < 5 s; outputs to `specs/218-storyboarding-edit/evidence/screenshots/interaction.gif` `apps/web-shell/playwright/tests/storyboard-edit-interaction-gif.spec.ts`

### Refresh #218 evidence-table screenshots

- [x] T082 Inside the new scenarios (T074, T075, T079, T080), capture screenshots that refresh the #218 evidence-table entries: `storyboard-edit-form-open.png`, `storyboard-undo-toast.png`, `storyboard-stale-badge.png`, `storyboard-overflow-menu-open.png` — write into `specs/218-storyboarding-edit/evidence/screenshots/`

### Verification

- [x] T083 Run the full web-shell suite: `cd apps/web-shell && node run-playwright.mjs storyboard-edit` — all scenarios green
- [x] T084 Run the GIF capture spec: `cd apps/web-shell && node run-playwright.mjs storyboard-edit-interaction-gif` — `interaction.gif` exists at target path within budget
- [x] T085 Confirm the GIF + screenshots: `ls -la specs/218-storyboarding-edit/evidence/screenshots/`

### Parallel-execution example for Phase 7

T070 + T071 + T073 touch independent files and may run in parallel. T072 depends on T070 + T071. T074–T080 all edit the same `storyboard-edit.spec.ts` → sequential. T081 + T082 depend on knobs being wired (T073). T083–T085 last.

## Phase 8: Polish & Cross-Cutting Concerns

**Goal**: Capture all evidence artefacts; write the feature blog post; run the final CI gate; create the PR (which also publishes the blog post).

### Final CI gate

- [ ] T090 Run the full pre-push gate from CLAUDE.md "Before Pushing": `task verify` — must include `verify:ffmpeg` (FR-045), `pnpm lint` (FR-044 ESLint rule active), `pyright`, all unit tests (incl. storyOnlyMockHandlers, querystring parser, a11y categoriser, videoToGif, perf), web-shell Playwright (incl. a11y + GIF), code-server Playwright. All green; record output to `specs/234-storyboard-edit-polish-followup/evidence/final-verify.txt`

### Evidence Collection

- [x] T091 Capture test results using `.specify/templates/evidence/test-summary-template.md` with YAML front matter (`feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`); body enumerates: total tests, passed, failed, coverage %, key scenarios verified across US1–US5 + FR-044/045/046 `specs/234-storyboard-edit-polish-followup/evidence/test-summary.md`
- [x] T092 [P] Create usage demonstration showing the polish loop end-to-end: open a story, click chevron, type new title, submit, observe row update + log-panel card; include code-server palette example for one command + web-shell scenario for one new flow `specs/234-storyboard-edit-polish-followup/evidence/usage-example.md`
- [x] T093 [P] Write the web-shell + code-server E2E summary: pass/fail per spec file + screenshot index `specs/234-storyboard-edit-polish-followup/evidence/webview-e2e-summary.md`
- [x] T094 [P] Confirm all evidence files exist per the table at the top of this file: opening-context.md (✓ already), test-summary.md, usage-example.md, a11y-report.md, a11y-results.json, webview-e2e-summary.md, perf-budget-234.md, plus the cross-feature screenshots/interaction.gif under `specs/218-storyboarding-edit/evidence/screenshots/`

### Media Content

- [ ] T095 Spawn the Content Specialist agent (`.claude/agents/media/content.md`) via Task tool to create the Feature Post — title prefixed `Building `; first three sections (`What We're Building`, `How It Fits`, `Key Decisions`) copied **verbatim** from `evidence/opening-context.md`; remaining sections (`Screenshots`, `Try It Yourself` with the four story Storybook links from plan.md Media Components, `By the Numbers` with metrics from `evidence/test-summary.md`, `Lessons Learned`, `What's Next`) written from evidence; track `[credibility]`; Hook is the before/after table from `evidence/opening-context.md` `specs/234-storyboard-edit-polish-followup/media/shipped-post.md`

### PR Creation

- [ ] T096 Create PR and publish blog: run `/speckit.pr` — creates the `debrief-future` PR + cross-repo `debrief.github.io` blog PR; returns both URLs

**Task T096 must run last. It depends on every other task in this file being complete (CI gate green + all evidence captured + shipped-post.md written).**

### Parallel-execution example for Phase 8

T091, T092, T093, T094 are independent and may run in parallel. T095 depends on T091 + T093 (needs metrics + e2e summary). T096 depends on T090 + T091..T095.

## Dependencies

**Story completion order** (each story is independently testable once Phase 2 is green):

```
Phase 1 (Setup)
   │
   ▼
Phase 2 (Foundation: shared mock-handlers helper, parser, contracts, ESLint, Taskfile)
   │
   ├──────────► Phase 3 (US1 — Interactive Storybook) ────► gated by T021 (harness refactor) + T011/T012 (helper + barrel). T020 removed post-ADR-027.
   │
   ├──────────► Phase 4 (US2 — Code-server chrome E2E) ──► independent of US1; gated only by Phase 1 baseline
   │
   ├──────────► Phase 5 (US3 — A11y audit) ──────────────► gated by Phase 3 (the 4 stories must be interactive before axe runs against them)
   │
   ├──────────► Phase 6 (US4 — Perf budget) ─────────────► gated by Phase 2 T005–T007 (CONTRACTS.md + JSDoc)
   │
   └──────────► Phase 7 (US5 — Playwright + GIF) ────────► gated by Phase 2 T013/T014 (dual-knob parser) + T017 (ffmpeg check) + Phase 3 T021 (harness refactor)
                  │
                  ▼
               Phase 8 (Polish: evidence + media + PR) — final CI gate gates everything
```

**Hard prerequisites**:
- T011 + T012 (shared mock-handlers helper + barrel re-export) MUST land before T021 (harness refactor) and T023-T026 (story upgrades). The helper is the single behavioural source FR-003 requires.
- T013 + T014 (dual-knob parser) MUST land before T077 + T080 (the failure-injection scenarios).
- T070 + T071 + T072 (videoToGif helper + fixture + unit test) MUST land before T081 (interaction GIF spec depends on the helper).
- T015 + T017 (ESLint + Taskfile) MUST land before T090 (final CI gate exercises both).
- T005 (CONTRACTS.md) MUST land before T060 (perf test cites it in failure message).
- T091 + T093 (test-summary + e2e-summary) MUST land before T095 (Content Specialist needs the metrics).
- T090 (final verify) + T091–T095 (all evidence + media) MUST land before T096 (`/speckit.pr`).

**Soft / convention-only**:
- Phase 3 + Phase 4 + Phase 5 + Phase 6 + Phase 7 can be developed in parallel by different contributors once Phase 2 is green, but their evidence must all be present before Phase 8 final verify.

## Implementation Strategy

This is a **closure feature** — each user story closes a deferred item from #230 and can land independently. The strategy is to deliver in incremental, atomic commits so that any single story's regression can be reverted without blocking the others.

**Recommended commit cadence** (one PR, multiple commits):

1. **Phase 2 foundation commit** — lands the shared building blocks (mock-handlers helper, dual-knob parser, CONTRACTS.md + CHANGELOG entry, ESLint rule, Taskfile target). Self-contained; verifiable via the unit tests added in the same commit. Bumps `pnpm lint` + `task verify` surface area. (PortContext removed per ADR-027.)
2. **US1 commit (Phase 3)** — harness refactor (replace inline reducer + handlers with `useStoryOnlyMockHandlers`) + 4 story upgrades + smoke regression. Headline ergonomics win. Visible in Storybook on first hover. **Production webview entry untouched.**
3. **US2 commit (Phase 4)** — code-server chrome E2E spec + native-chrome screenshot. Slowest single test addition (~150 LOC); landed alone so triage is easy if a flake surfaces.
4. **US3 commit (Phase 5)** — a11y categoriser + audit spec + report + raw JSON. Includes any moderate-violation accepted-risk entries.
5. **US4 commit (Phase 6)** — perf test + regression-loud verification + perf-budget evidence. Smallest commit but the highest insurance value.
6. **US5 commit (Phase 7)** — videoToGif helper (with fixture + unit test) + 7 web-shell scenarios + interaction GIF spec + #218 evidence-table screenshot refresh. Largest commit; benefits from being last so it incorporates any harness fixes from earlier phases.
7. **Polish commit (Phase 8)** — evidence files + shipped-post.md + final `task verify` output. Followed by `/speckit.pr`.

**Risk-management notes**:
- Phase 2's shared mock-handlers helper is the load-bearing piece; if its handler-to-dispatch mapping is wrong, every downstream story sees confusing reducer state. Land it first, exercise its unit test (T008), then build on top. (Plan v1's PortContext default-thrower risk is moot — there is no PortContext.)
- The ffmpeg `task verify:ffmpeg` (T017) is also Phase 2 — running it before Phase 7 starts means the GIF helper never fails locally for a missing-binary reason that would otherwise look like a Playwright bug.
- Phase 5's a11y audit is sequenced **after** Phase 3 because the 4 upgraded stories are part of the audit surface (FR-021). Running it earlier would only audit the 3 harness states.
- Phase 6's perf test references `CONTRACTS.md`, written in Phase 2 (T005). Sequencing matters for the failure-message integrity (FR-032 + FR-046).
- Phase 7's GIF + #218 screenshot refresh land last so the screenshots reflect any UI tweaks made earlier in the phase progression.

**Skipping rules**: do NOT skip any user story to ship faster. SC-005 + SC-008 require complete coverage; the parent #218 evidence-table closure depends on US2 + US5 evidence; the previously-deferred FR-044/045/046 items are closing audit-trail gaps the review surfaced. Cutting any of them re-opens technical debt this PR exists to retire.
