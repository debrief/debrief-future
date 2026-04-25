# Tasks: VS Code Theme Responsiveness

**Input**: Design documents from `/specs/220-fix-theme-responsiveness/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/theme-source.md](./contracts/theme-source.md), [quickstart.md](./quickstart.md)

**Tests**: Required — every functional requirement is encoded in an executable test (Vitest unit tests for `ThemeProvider` / sources / adapters; Playwright E2E for the runtime-switch path; Storybook visual snapshots for the four variants). Article VI ("Untested code is broken code") and Article VII (test-driven AI collaboration) make this non-negotiable.

**Organization**: Tasks are grouped by user story (US1 → US3, P1 → P3) so each story ships as an independently testable increment. Phase 2 (foundation) is shared across all stories.

---

## Evidence Requirements

> **Purpose**: Capture artefacts that demonstrate every panel actually re-themes correctly under all four explicit variants and the system fallback. These artefacts are stitched into the eventual feature blog post (`media/shipped-post.md`) and the PR description.

**Evidence Directory**: `specs/220-fix-theme-responsiveness/evidence/`
**Media Directory**: `specs/220-fix-theme-responsiveness/media/`

### Planned Artefacts

| Artefact | Description | Captured When |
|---|---|---|
| `test-summary.md` | YAML front matter + body listing all Vitest, Playwright, and Storybook visual results. Includes: total tests, passed/failed/skipped, coverage %, key scenarios verified across the four explicit variants. | After all tests pass |
| `usage-example.md` | Concrete demo: starting from a running VS Code session in Default Dark+, switching to Default High Contrast Light, and showing the `data-theme` attribute updating live in DevTools across every Debrief panel. Step-by-step with annotated DevTools console output. | After US1 + US3 complete |
| `screenshots/logpanel-light.png` | LogPanel rendered in `light` variant via Storybook | During Polish |
| `screenshots/logpanel-dark.png` | LogPanel rendered in `dark` variant via Storybook | During Polish |
| `screenshots/logpanel-high-contrast-light.png` | LogPanel rendered in `high-contrast-light` variant | During Polish |
| `screenshots/logpanel-high-contrast-dark.png` | LogPanel rendered in `high-contrast-dark` variant | During Polish |
| `screenshots/all-panels-dark.png` | Side-by-side composite of every Debrief panel (LogPanel, ActivityPanel, MapView, ResultsPanel, TimeController, CatalogOverview, StoryboardPanel) in `dark` — proves visual consistency (US2) | After US2 complete |
| `screenshots/all-panels-high-contrast-dark.png` | Same composite in `high-contrast-dark` — proves accessibility variant fidelity | After US2 complete |
| `screenshots/interaction.gif` | < 5s GIF: VS Code window with multiple Debrief panels; user switches theme via command palette; every panel re-themes within 1s. Captured via the web-shell Playwright `theme-runtime-switch` test using `page.video()`. | After US1 E2E test passes |
| `webview-e2e-summary.md` | Web-shell Playwright report summary: pass count, theme transition timings, screenshot manifest. | After web-shell E2E run |

### Media Content

| Artefact | Description | Created When |
|---|---|---|
| `evidence/opening-context.md` | Cached opener — three prose sections (What We're Building, How It Fits, Key Decisions). **Already created by /speckit.plan** (commit 1bd9d75). | During /speckit.plan ✅ |
| `media/shipped-post.md` | Feature blog post stitching the cached opener + Polish-phase evidence (screenshots, interaction GIF, by-the-numbers, lessons learned). | During Polish phase |

### PR Creation

| Action | Description | Created When |
|---|---|---|
| Feature PR (debrief-future) | PR with all evidence linked, references spec/plan/research, includes "By the Numbers" table from `test-summary.md`. | Final task in Polish phase via /speckit.pr |
| Blog PR (debrief.github.io) | Cross-repo PR publishing `shipped-post.md` to the public site. | Triggered by /speckit.pr |

---

## Phase 1: Setup

**Goal**: Verify the workspace is ready and the design artefacts are checked in. No production code is touched in this phase.

- [ ] T001 Read [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/theme-source.md](./contracts/theme-source.md), and [quickstart.md](./quickstart.md). Confirm the four explicit variants (`light`, `dark`, `high-contrast-light`, `high-contrast-dark`) and `system` are the canonical model.
- [ ] T002 Run `task verify` (`uv run ruff check . && pnpm lint && uv run pyright && pnpm -r typecheck && uv run pytest && pnpm --filter '!@debrief/web-shell' test`) on `main` to capture the green-baseline state. Save the output to `specs/220-fix-theme-responsiveness/evidence/baseline-task-verify.txt` so any regressions introduced by this feature are detectable. `specs/220-fix-theme-responsiveness/evidence/baseline-task-verify.txt`

## Phase 2: Foundation (shared by all user stories)

**Goal**: Reshape the `ThemeProvider` pipeline so it can serve every user story. By the end of this phase, the type system, default tokens, source abstraction, and CSS variant blocks all reflect the new flat union; the provider knows how to subscribe to a `ThemeSource`. No webview or Storybook wiring yet — that comes in Phase 3+.

**Independent test**: After this phase, the existing Storybook story for `ThemeProvider` (or a new minimal one) demonstrates that calling `setTheme({ variant: 'high-contrast-dark' })` updates `document.documentElement[data-theme]` to `high-contrast-dark`. No webview changes required to verify this.

### Tests (write first, will fail until implementation lands)

- [ ] T010 [P][test] Write failing Vitest tests asserting the new flat union: `ThemeVariant` accepts `'light' | 'dark' | 'high-contrast-light' | 'high-contrast-dark' | 'system'` and rejects `'vscode'` (compile-time error captured via `expectTypeOf`); `defaultTheme` exposes one preset per explicit variant; `mergeThemeTokens` works with the four-variant input. `shared/components/src/ThemeProvider/__tests__/theme-context.test.ts`
- [ ] T011 [P][test] Write failing Vitest tests for `bodyClassToVariant`: maps each of the four `vscode-*` classes to the expected variant; returns `null` for any other class; never returns `'system'`. `shared/components/src/ThemeProvider/__tests__/vsCodeAdapter.test.ts`
- [ ] T012 [P][test] Write failing Vitest tests for `mediaQuerySource()`: synchronous `read()` returns one of four explicit variants; `subscribe()` fires when `prefers-color-scheme` or `prefers-contrast` changes; cleanup function detaches listeners; multiple concurrent subscribers all receive the same change. Use `vi.spyOn(window, 'matchMedia')` to drive the queries. `shared/components/src/ThemeProvider/__tests__/browserAdapter.test.ts`
- [ ] T013 [P][test] Write failing Vitest tests for `vsCodeBodyClassSource()`: `read()` reflects the current `document.body` class; `subscribe()` fires when the class mutates and when a `vscode-theme-changed` message arrives; cleanup disconnects observer + removes message listener; idempotent cleanup; de-duplicates back-to-back identical values. `shared/components/src/ThemeProvider/__tests__/vsCodeAdapter.source.test.ts`
- [ ] T014 [P][test] Write failing Vitest tests for `ThemeProvider` source subscription: provider re-renders descendants when the source emits a new variant; `data-theme` attribute on the container updates; `--debrief-*` CSS variables re-apply; cleanup removes the attribute on unmount; provider catches source errors and falls back to the initially resolved variant. `shared/components/src/ThemeProvider/__tests__/ThemeProvider.subscription.test.tsx`

### Implementation

- [ ] T015 Update `ThemeContext.ts` to define the new flat `ThemeVariant` union and add the `isHighContrast` flag to `ThemeContextValue`. Hard-delete `'vscode'` from the union. `shared/components/src/ThemeProvider/ThemeContext.ts`
- [ ] T016 [P] Update `defaultTheme.ts`: add presets for `high-contrast-light` and `high-contrast-dark` (sourced from VS Code's "Default High Contrast Light" and "Default High Contrast" palettes); remove the `'vscode'` preset; the `light` and `dark` presets stay as the entry palettes. `shared/components/src/ThemeProvider/defaultTheme.ts`
- [ ] T017 [P] Update `tokens.css` to expose four `[data-theme='...']` blocks (one per explicit variant); remove the `[data-theme='vscode']` block. Each block populates the same `--debrief-*` variable set as today. `shared/components/src/styles/tokens.css`
- [ ] T018 Create `ThemeSource.ts` exporting the `ResolvedVariant` and `ThemeSource` types defined in `contracts/theme-source.md` §1. Type-only file — no runtime code. `shared/components/src/ThemeProvider/ThemeSource.ts`
- [ ] T019 Refactor `vsCodeAdapter.ts`: extract the `BODY_CLASS_TO_VARIANT` table and `bodyClassToVariant()` boundary function (per `contracts/theme-source.md` §3); replace the existing luminance heuristic with the body-class read; export `vsCodeBodyClassSource(): ThemeSource` whose `subscribe()` wraps the existing `setupVSCodeThemeSync()` MutationObserver + message listener. Keep `setupVSCodeThemeSync` as a thin wrapper that constructs a source then calls `subscribe()` so any future caller can use either API. `shared/components/src/ThemeProvider/vsCodeAdapter.ts`
- [ ] T020 [P] Create `browserAdapter.ts` exporting `mediaQuerySource()` (uses `prefers-contrast: more` + `prefers-color-scheme: dark` per research R7) and `staticSource(variant: ResolvedVariant)`. Both return `ThemeSource` values. `shared/components/src/ThemeProvider/browserAdapter.ts`
- [ ] T021 Update `ThemeProvider.tsx` to consume a `ThemeSource`: accept an optional `source` prop, default to `vsCodeBodyClassSource()` when a `vscode-*` body class is present at mount and `mediaQuerySource()` otherwise; subscribe in a `useEffect`; re-apply `data-theme` and `--debrief-*` tokens on each `onChange`; expose the new `isHighContrast` derived flag in context. Catch errors from `source.subscribe()` and `console.warn` once per session. Remove the obsolete `prefers-color-scheme` listener (its job is now done by `mediaQuerySource`). `shared/components/src/ThemeProvider/ThemeProvider.tsx`
- [ ] T022 Update the `@debrief/components` barrel export to surface `ThemeSource`, `ResolvedVariant`, `vsCodeBodyClassSource`, `mediaQuerySource`, `staticSource`, `bodyClassToVariant`, and the new `isHighContrast` consumer hook. `shared/components/src/index.ts`
- [ ] T023 Run the Phase 2 test suite (`pnpm --filter @debrief/components test ThemeProvider browserAdapter vsCodeAdapter`) and confirm every test from T010–T014 now passes. Capture the output to `specs/220-fix-theme-responsiveness/evidence/phase2-vitest.txt`. `specs/220-fix-theme-responsiveness/evidence/phase2-vitest.txt`

## Phase 3: User Story 1 — Theme Changes Apply Immediately Across All Panels (P1)

**Goal**: Every Debrief webview panel reflects the active VS Code theme on initial load, and re-themes within 1 second when the user changes themes — including the two high-contrast variants. This is the primary symptom the user reported and the headline win for the feature.

**Independent test** (matches spec.md US1): With a real VS Code Extension Development Host, open the Activity, Layers, Log, Map, Results, Storyboard, Time Controller, and Catalog Overview panels. Switch VS Code's colour theme (Default Dark+ → Default Light+ → Default High Contrast → Default High Contrast Light → Default Dark+). Every visible panel updates within 1 second of each switch with no reload. Verified end-to-end by `theme-runtime-switch.spec.ts` (T036).

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip or omit Playwright E2E tasks because you think browsers can't be installed. The project uses `@sparticuz/chromium` which bundles a Linux Chromium binary via npm. Standard browser CDN downloads are blocked (403), but this bundled binary works fully. Run `node apps/web-shell/run-playwright.mjs` to extract and configure. Full details: `docs/project_notes/playwright-installation-research.md`.

### Tests (write first)

- [ ] T030 [test] Write failing Vitest tests for `_bootstrap.tsx`: renders children inside a `ThemeProvider` whose source is `vsCodeBodyClassSource`; reads the initial variant from `document.body` class at mount; passes the right container down (root document, not a custom one); cleans up on unmount. `apps/vscode/src/webview/web/__tests__/_bootstrap.test.tsx`
- [ ] T031 [test] Write failing Vitest tests for `themeRelay.ts` (extension host): `startThemeRelay` registers exactly one disposable on `context.subscriptions`; on `onDidChangeActiveColorTheme` event it calls `getActivePanels()` and posts `{ type: 'vscode-theme-changed', kind }` to each panel's webview; per-panel `postMessage` failures don't break sibling panels; `getActivePanels()` throwing is caught and logged at warn. Use `vi.mock('vscode', ...)` to stub the API. `apps/vscode/src/host/__tests__/themeRelay.test.ts`
- [ ] T032 [test] Write a failing web-shell Playwright test `theme-runtime-switch.spec.ts`: mounts every panel via the existing routes; mutates `document.body.className` from `vscode-dark` → `vscode-light` → `vscode-high-contrast` → `vscode-high-contrast-light`; for each transition asserts that every visible panel's root element has the expected `[data-theme]` attribute within 1000ms (per FR-002 / SC-001 / SC-008). Records `page.video()` and writes the GIF to `specs/220-fix-theme-responsiveness/evidence/screenshots/interaction.gif` per the pattern in `apps/web-shell/playwright/tests/properties-screenshots.spec.ts`. `apps/web-shell/playwright/tests/theme-runtime-switch.spec.ts`

### Implementation

- [ ] T033 Create the shared bootstrap wrapper: a default-export React component that wraps `children` in `<ThemeProvider source={vsCodeBodyClassSource()}>`. Adds `data-testid` so the Playwright test can locate the root. Re-exports the `useTheme()` hook for convenience. `apps/vscode/src/webview/web/_bootstrap.tsx`
- [ ] T034 [P] Wrap `logPanel.tsx`'s root render in `<Bootstrap>`. Remove any local theme-detection logic (none exists today, but verify). `apps/vscode/src/webview/web/logPanel.tsx`
- [ ] T035 [P] Wrap `activityPanel.tsx`'s root render in `<Bootstrap>`. `apps/vscode/src/webview/web/activityPanel.tsx`
- [ ] T036 [P] Wrap `mapView.tsx`'s root render in `<Bootstrap>`. `apps/vscode/src/webview/web/mapView.tsx`
- [ ] T037 [P] Wrap `resultsPanel.tsx`'s root render in `<Bootstrap>`. `apps/vscode/src/webview/web/resultsPanel.tsx`
- [ ] T038 [P] Wrap `timeController.tsx`'s root render in `<Bootstrap>`. `apps/vscode/src/webview/web/timeController.tsx`
- [ ] T039 [P] Wrap `catalogOverview.tsx`'s root render in `<Bootstrap>`. `apps/vscode/src/webview/web/catalogOverview.tsx`
- [ ] T040 Migrate `storyboardPanel.tsx` from its local `<ThemeProvider>` to `<Bootstrap>`. Delete the inline `themeConfig` state and the one-shot message-driven theme-init logic — `vsCodeBodyClassSource` now drives both the initial value and live updates. `apps/vscode/src/webview/web/storyboardPanel.tsx`
- [ ] T041 Create the extension-host theme relay per `contracts/theme-source.md` §2: `startThemeRelay(context, getActivePanels)` registers a `vscode.window.onDidChangeActiveColorTheme` listener that posts `{ type: 'vscode-theme-changed', kind: theme.kind }` to every active panel; pushes the disposable onto `context.subscriptions`; catches per-panel errors. `apps/vscode/src/host/themeRelay.ts`
- [ ] T042 Wire `startThemeRelay()` into extension activation. Identify the panel registry that already tracks open webviews (likely in `apps/vscode/src/extension.ts` or a panel manager module) and pass its accessor as `getActivePanels`. `apps/vscode/src/extension.ts`
- [ ] T043 Run the Phase 3 unit tests (`pnpm --filter @debrief/vscode test _bootstrap themeRelay`) and confirm T030 and T031 pass. Capture output to `specs/220-fix-theme-responsiveness/evidence/phase3-vitest.txt`. `specs/220-fix-theme-responsiveness/evidence/phase3-vitest.txt`
- [ ] T044 Run the web-shell Playwright suite (`cd apps/web-shell && node run-playwright.mjs theme-runtime-switch`) and confirm T032 passes. The test must produce `interaction.gif` and per-variant screenshots into `specs/220-fix-theme-responsiveness/evidence/screenshots/`. Capture the report summary to `specs/220-fix-theme-responsiveness/evidence/webview-e2e-summary.md`. `specs/220-fix-theme-responsiveness/evidence/webview-e2e-summary.md`

## Phase 4: User Story 2 — Consistent Visual Language Across All Theme Variants (P2)

**Goal**: Once Phase 2 + Phase 3 are in place, every panel pulls its colours from the same `--vscode-*` and `--debrief-*` tokens — but only if no component has hardcoded its own values. This phase audits the existing component CSS and removes any palette literals that bypass the theme pipeline.

**Independent test** (matches spec.md US2): With VS Code in Default Light+ and every Debrief panel open, take a side-by-side screenshot composite. The background, border, hover, and selection colours of each panel are visually identical. Repeat for Default Dark+ and each high-contrast variant. Verified by T053 below.

### Tests (write first)

- [ ] T050 [test] Add a Storybook visual snapshot test that renders LogPanel, FilterBar, FeatureList, MapView, TimeController, and StoryboardPanel side by side under each of the four explicit variants and writes one composite PNG per variant to the test output directory. Diff against a baseline; fail on per-pixel deltas above the standard threshold (2%). `shared/components/e2e/all-panels-consistency.spec.ts`
- [ ] T051 [test] Add a static check that scans `shared/components/src/**/*.css` for hardcoded colour literals (`#[0-9a-fA-F]{3,8}`, `rgb(`, `rgba(`, `hsl(`, named colours like `white`, `black`) that are NOT inside a `var(--..., FALLBACK)` call. Each finding is a violation; the file ends with the count and a JSON list. The test fails if any violation appears outside the documented allowlist (e.g., decorative `transparent` or `currentColor`). `shared/components/src/__tests__/no-hardcoded-colours.test.ts`

### Implementation

- [ ] T052 Run the static colour-literal scan from T051. For each violation: replace the literal with the appropriate `--vscode-*` or `--debrief-*` token reference using a sensible fallback. Document any genuinely-unavoidable literal in the test's allowlist with a one-line justification. `shared/components/src/**/*.css`
- [ ] T053 Run T050 to baseline the four-variant composite snapshots. Commit the baseline images. The CI run on the PR re-runs T050 and asserts no regression. The composite PNGs are also copied to `specs/220-fix-theme-responsiveness/evidence/screenshots/all-panels-{variant}.png` as part of T053. `specs/220-fix-theme-responsiveness/evidence/screenshots/`

## Phase 5: User Story 3 — Storybook Theme Preview (P3)

**Goal**: Storybook's theme switcher actually drives the components — light/dark/high-contrast-light/high-contrast-dark each show distinct, correct palettes instead of falling through to a hardcoded dark fallback. This is also the substrate for the spec 209 a11y audit, so the audit can run trustworthily across all four variants.

**Independent test** (matches spec.md US3): Open Storybook → LogPanel/Default story. Cycle the theme toolbar through Light, Dark, High Contrast Light, High Contrast Dark. Each variant shows distinctly different colours; DevTools `[data-theme]` matches the toolbar; no story silently renders the dark fallback when Light is selected. Verified by T063 below.

### Tests (write first)

- [ ] T060 [test] Write failing Vitest contract tests for `vscode-token-map.ts`: every variant key has the *same* set of `--vscode-...` keys (exact-keys helper type + runtime assertion); no value is empty/`null`/`undefined`; values are CSS colour or font tokens; the keys cover at minimum the variables enumerated in `research.md` §R3. `shared/components/.storybook/__tests__/vscode-token-map.test.ts`
- [ ] T061 [test] Write a failing Storybook + Playwright test asserting that for each of the four explicit variants, the iframe at `/iframe.html?id=components-logpanel--default&globals=theme:{variant}` renders LogPanel with the variant's expected `--vscode-sideBar-background` (read via `getComputedStyle`). The test loops over `[light, dark, high-contrast-light, high-contrast-dark]`. `shared/components/e2e/theme-variants.spec.ts`

### Implementation

- [ ] T062 Create the `--vscode-*` token map per `contracts/theme-source.md` §4. One entry per variant; values mirror VS Code's "Default Light+", "Default Dark+", "Default High Contrast Light", "Default High Contrast" themes. Source values from VS Code's `extensions/theme-defaults/themes/*.json` (read once, transcribed; do not import at runtime). `shared/components/.storybook/vscode-token-map.ts`
- [ ] T063 Update `preview.tsx` (Storybook decorator): expand the theme toolbar from `[Light, Dark, VS Code]` to `[Light, Dark, High Contrast Light, High Contrast Dark, System]`; on every render, write `VSCODE_TOKEN_MAP[variant]` entries to `documentElement.style.setProperty`; pass the variant down via the existing `withThemeProvider` decorator (which already wraps stories in `<ThemeProvider>` — now the variant value is one of the four explicit values). `shared/components/.storybook/preview.tsx`
- [ ] T064 Audit and update Storybook stories that explicitly pass `theme={ variant: 'vscode' }`. For each, replace with `theme={{ variant: 'dark' }}` (the closest equivalent of the legacy default) or remove the override entirely if the new toolbar default is sufficient. Use `grep -rn "variant: *['\"]vscode['\"]" shared/components/src` to enumerate. `shared/components/src/**/*.stories.tsx`
- [ ] T065 Run `pnpm --filter @debrief/components storybook:build` and confirm zero errors. The build artefacts are not committed; this just gates that the decorator changes compile. Capture build log to `specs/220-fix-theme-responsiveness/evidence/storybook-build.txt`. `specs/220-fix-theme-responsiveness/evidence/storybook-build.txt`
- [ ] T066 Run T060 + T061 (`pnpm --filter @debrief/components test vscode-token-map` and `pnpm --filter @debrief/components test theme-variants`) and confirm both pass. Capture output to `specs/220-fix-theme-responsiveness/evidence/phase5-vitest.txt`. `specs/220-fix-theme-responsiveness/evidence/phase5-vitest.txt`

## Phase 6: Polish & Cross-Cutting Concerns

**Goal**: Tie up cross-cutting cleanups, capture every required evidence artefact, write the feature blog post, and create the PR. Nothing functional is added in this phase — just the audit trail and the publication.

### Cross-cutting cleanups

- [ ] T070 Hard-delete every remaining `'vscode'` theme-variant reference. Run `grep -RIn "variant: *['\"]vscode['\"]\\|as +ThemeVariant *= *['\"]vscode['\"]\\|'vscode' *as +ThemeVariant\\|\\[data-theme=['\"]vscode['\"]\\]" shared/components/src apps/vscode/src --include='*.ts' --include='*.tsx' --include='*.css'`; expected: zero matches. Quickstart §V5 Step 1 reproduces this check. `shared/components/src/**`, `apps/vscode/src/**`
- [ ] T071 Run `pnpm -r typecheck` and confirm zero errors (Article XV gate). Capture output to `specs/220-fix-theme-responsiveness/evidence/typecheck.txt`. `specs/220-fix-theme-responsiveness/evidence/typecheck.txt`
- [ ] T072 Run `pnpm lint && uv run ruff check .` and confirm zero errors. Capture output to `specs/220-fix-theme-responsiveness/evidence/lint.txt`. `specs/220-fix-theme-responsiveness/evidence/lint.txt`
- [ ] T073 [P] Update `docs/storybook-vscode-theming.md` to document the four explicit variants, the toolbar entries, the shared `vscode-token-map.ts`, and the body-class boundary. Replace any reference to the legacy `'vscode'` variant. `docs/storybook-vscode-theming.md`
- [ ] T074 [P] Append an ADR entry to `docs/project_notes/decisions.md` titled "Theme Variant Model — Flat Union with First-Class High Contrast" recording: the decision (flat union mirroring VS Code's body classes), the alternatives (separate contrast axis, CSS-only hook), and the rationale (single value drives single `data-theme`; matches `ColorThemeKind` 1:1). Reference spec 220 and link to `specs/220-fix-theme-responsiveness/spec.md` Clarifications session. `docs/project_notes/decisions.md`
- [ ] T075 [P] Log feature 220 in `docs/project_notes/issues.md` with the spec link, PR link (filled in by T084), and a one-line summary. `docs/project_notes/issues.md`

### Evidence Collection

- [ ] T076 Capture test results using template (.specify/templates/evidence/test-summary-template.md) in `specs/220-fix-theme-responsiveness/evidence/test-summary.md`. YAML front matter must include `feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`. Body lists: total Vitest tests run (Phase 2 + Phase 3 + Phase 4 + Phase 5), Playwright pass count, the four explicit variants verified, and any skipped tests with rationale. `specs/220-fix-theme-responsiveness/evidence/test-summary.md`
- [ ] T077 Create usage demonstration in `specs/220-fix-theme-responsiveness/evidence/usage-example.md`. Walks through the quickstart §V2 scenario step by step with annotated DevTools console snippets showing `[data-theme]` updating live. Cross-references the four-variant screenshots and `interaction.gif`. `specs/220-fix-theme-responsiveness/evidence/usage-example.md`
- [ ] T078 [P] Capture per-variant LogPanel screenshots from Storybook to `specs/220-fix-theme-responsiveness/evidence/screenshots/logpanel-{light,dark,high-contrast-light,high-contrast-dark}.png` using the Storybook E2E test from T061's iframe-rendering loop. The variant URLs are listed in `quickstart.md`. `specs/220-fix-theme-responsiveness/evidence/screenshots/`
- [ ] T079 [P] Confirm the four-panel composite screenshots produced by T053 are present at `specs/220-fix-theme-responsiveness/evidence/screenshots/all-panels-{variant}.png` and re-render any missing variant. `specs/220-fix-theme-responsiveness/evidence/screenshots/`
- [ ] T080 Verify `interaction.gif` (produced by T044) is < 5s and < 2MB; if oversized, regenerate with `ffmpeg` palette optimisation. `specs/220-fix-theme-responsiveness/evidence/screenshots/interaction.gif`

### Media Content

- [ ] T081 Create feature blog post at `specs/220-fix-theme-responsiveness/media/shipped-post.md`. Spawn the Content Specialist (`.claude/agents/media/content.md`) via the Task tool; provide the cached opener (`evidence/opening-context.md`), the test-summary metrics, and the four-variant screenshots. The first three sections (`## What We're Building`, `## How It Fits`, `## Key Decisions`) are copied verbatim from the cached opener. The remaining sections (`## Screenshots`, `## By the Numbers`, `## Lessons Learned`, `## What's Next`) are written from evidence. Front matter: `layout: future-post`, `title: "Building VS Code Theme Responsiveness"`, `track: [credibility]`, `author: Ian`, `reading_time` calculated, `excerpt` ≤ 150 chars. `specs/220-fix-theme-responsiveness/media/shipped-post.md`

### Final gates

- [ ] T082 Run the full CI verification path: `task verify` (or the four-step fallback in CLAUDE.md). All steps must pass green before continuing. Capture the final report to `specs/220-fix-theme-responsiveness/evidence/final-task-verify.txt`. `specs/220-fix-theme-responsiveness/evidence/final-task-verify.txt`
- [ ] T083 Re-run quickstart §V5 (the type-safety gate) and confirm zero `'vscode'` variant references and zero typecheck/lint errors. Append the results to `specs/220-fix-theme-responsiveness/evidence/typecheck.txt`. `specs/220-fix-theme-responsiveness/evidence/typecheck.txt`

### PR Creation

- [ ] T084 Create PR and publish blog: run /speckit.pr

**Task T084 must run last. It depends on every preceding task being complete.** /speckit.pr opens the feature PR in `debrief-future` (with evidence linked, "By the Numbers" table from `test-summary.md`, and the four-variant composite screenshots embedded), and the cross-repo blog PR in `debrief.github.io` publishing `shipped-post.md`. Returns both URLs for review.

## Dependencies

### Phase ordering

```
Phase 1 (Setup)
   │
   ▼
Phase 2 (Foundation — type system, sources, ThemeProvider rewire)
   │
   ├─────────────────────────────┬────────────────────────────────┐
   ▼                             ▼                                ▼
Phase 3 (US1 — runtime switch)   Phase 5 (US3 — Storybook)        Phase 4 (US2 — consistency)
   │                             │                                │
   └─────────────────────────────┴────────────────────────────────┘
                                 │
                                 ▼
                          Phase 6 (Polish, evidence, PR)
```

### Story independence after Phase 2

Once Phase 2 is complete, each user story can ship as an independent increment:

- **US1 alone** (Phase 3 only): every webview wraps in `<Bootstrap>` and subscribes to body-class changes. Real VS Code users see the live-switch fix immediately. Storybook still falls through to dark fallback (US3 not done). Visual consistency may have a few hardcoded-colour bleed-throughs (US2 not done).
- **US3 alone** (Phase 5 only, with Phase 2): Storybook variants render correctly. VS Code panels still don't respond to runtime theme changes (US1 not done).
- **US2 alone** (Phase 4 only, with Phase 2): all-panel composites are visually consistent in the variants the toolbar can drive. VS Code users still see the original bug (US1) and Storybook still has fallback bleed-through (US3). Of limited shipping value alone but valuable as a quality gate.

The recommended order is **US1 → US3 → US2 → Polish**, because US1 is the headline win, US3 unblocks the spec 209 audit, and US2 is best done with both the runtime and Storybook paths working so the consistency check is meaningful.

### Critical task chain

- T015 (`ThemeContext.ts`) blocks T016, T017, T018, T020, T021 (every other foundation task).
- T021 (`ThemeProvider.tsx` rewire) blocks T033 (`_bootstrap.tsx`) which blocks T034–T040 (the seven webview wrappings).
- T041 (`themeRelay.ts`) is independent of the bootstrap chain but T042 (extension activation) requires both T041 and the panel registry being importable.
- T032 + T033–T040 must all be in place for T044 (Playwright E2E) to pass.
- T062 + T063 (token map + decorator) gate T065 (Storybook build) and T066 (variant Vitest tests).
- T053 produces the four-panel composite screenshots referenced by T079.
- T044 produces `interaction.gif` referenced by T080.
- T076 (test-summary) requires T023, T043, T044, T053, T066 all passing.
- T081 (blog post) requires T076, T077, T078, T079, T080.
- T084 (final PR) requires every preceding task.

### Parallel execution opportunities

Inside each phase, tasks marked `[P]` are independent and can be issued concurrently:

- **Phase 2**: T010, T011, T012, T013, T014 (all `[P][test]`) can be authored in parallel; T016, T017, T020 `[P]` can be implemented in parallel; T015 → T018 → T019 → T021 → T022 are a strict serial chain.
- **Phase 3**: T034–T040 (the seven webview wrappings) are all `[P]` once T033 is in place.
- **Phase 4**: T050 and T051 `[test]` tasks are sequential because T052 depends on the T051 scan output.
- **Phase 5**: T060 + T061 can be authored in parallel; T062 → T063 → T064 → T065 is serial.
- **Phase 6**: T073, T074, T075 `[P]` (different files); T078, T079 `[P]`; the final gates (T082, T083, T084) are strictly serial.

## Implementation Strategy

### MVP scope (US1 only) — incremental shipping path

The smallest valuable increment is `Phase 1 + Phase 2 + Phase 3`. This lands the headline fix: every Debrief panel reflects the active VS Code theme on load and updates within 1 second on switch. If schedule pressure forces a cut, Phase 4 and Phase 5 can ship in a follow-up PR without rework — the underlying type system and source abstraction are already correct.

### Phase 5 sequencing rationale

We deliberately put Phase 5 (Storybook) before Phase 4 (consistency audit) because the consistency check (T053) wants to be run inside Storybook with the four-variant decorator already in place. Running the consistency audit against fallback-only Storybook would either give false negatives (composite screenshots all look "consistent" because they're all the dark fallback) or force the audit to be redone after Phase 5.

### Risk mitigation

- **Risk: VS Code's body-class signal stops working in a future release.** Mitigation: the redundant `vscode-theme-changed` message channel (T041, T042) gives us a second signal. We can remove the body-class listener if VS Code formalises the message API; we keep both for now.
- **Risk: hardcoded colour scan (T051) finds dozens of violations.** Mitigation: the allowlist mechanism in T051 lets us defer non-blocking ones to a follow-up if the scope blows out. The audit must still be performed; only the cleanup can slip.
- **Risk: high-contrast palettes don't visually distinguish enough from regular dark/light.** Mitigation: the `isHighContrast` flag (Phase 2) is consumed by components that have contrast-sensitive styling — borders, focus rings — so even if the palette change is subtle, the structural cues are explicit.

### Definition of done

The feature is done when:

1. Every task in tasks.md is checked off.
2. `task verify` (T082) is green.
3. The four-variant screenshots and `interaction.gif` exist under `evidence/screenshots/`.
4. `evidence/test-summary.md` records ≥ 1 passing assertion for each of FR-001 through FR-011 and SC-001 through SC-009.
5. `media/shipped-post.md` is reviewed and ready for /speckit.pr to publish.
6. Both the feature PR and the blog PR are open with green CI.

