# Research: LogPanel A11y Audit with Theme Responsiveness (209)

## Finding 1: Root Cause of Theme Non-Responsiveness

**Decision**: Fix theme responsiveness by having ThemeProvider inject `--vscode-*` CSS variables when running outside a real VS Code webview (i.e., in Storybook or web-shell).

**Rationale**: LogPanel's CSS uses `var(--vscode-*)` properties exclusively — correct for VS Code webviews where VS Code automatically injects these variables. But in Storybook, these variables are never set, so the CSS falls back to hardcoded dark-mode hex values regardless of the selected theme. ThemeProvider currently only sets `--debrief-*` variables and a `data-theme` attribute; LogPanel ignores both.

The minimal, contained fix is to extend ThemeProvider (or its Storybook decorator) to also populate the `--vscode-*` variables from a static map keyed by theme variant (light / dark / vscode). This does not change how LogPanel CSS is authored, requires no per-story configuration, and is transparent to the VS Code webview context where the real VS Code variables already exist.

**Alternatives considered**:
- *Migrate LogPanel CSS to `--debrief-*` tokens*: Would make LogPanel consistent with other components but requires rewriting all LogPanel CSS and all sub-component CSS files (LogPanel.css, ParameterEditor.css, CardFlip.css, EditFace.css). High churn, out of scope for a QA-focused item.
- *Add `[data-theme="light"]` overrides to LogPanel.css*: Fragile — duplicates token values in two places and drifts from the VS Code variable system LogPanel was designed around.
- *Inject via MutationObserver watching `data-theme`*: Over-engineered; a straightforward effect in ThemeProvider is sufficient.

## Finding 2: `@axe-core/playwright` Dependency

**Decision**: Add `@axe-core/playwright` as a `devDependency` in `shared/components/package.json`, pinned to the same `^4.8.5` version already used by `apps/spec-navigator`.

**Rationale**: The package is already in the monorepo (spec-navigator). Pinning to the same major version avoids divergent behaviour. It is MIT-licensed, zero runtime footprint (devDependency only), and the established pattern in this codebase for automated WCAG scanning (per spec-navigator's `a11y.spec.ts`).

**Constitution Article IX compliance**: Justified — auditing accessibility is a testing-only concern; the dependency ships no production code.

## Finding 3: Storybook `addon-a11y` vs. Playwright axe-core

**Decision**: Use `@axe-core/playwright` for the automated audit (not the Storybook addon).

**Rationale**: `@storybook/addon-a11y` is already configured in `.storybook/main.ts` but provides only a manual Storybook UI panel — not automatable or CI-reportable. `@axe-core/playwright` runs inside the existing Playwright harness (`shared/components/playwright.config.ts`), produces machine-readable results, and follows the pattern already established in `apps/spec-navigator/e2e/a11y.spec.ts` and `capture-axe.spec.ts`.

## Finding 4: Story Scope for the Audit

**Decision**: Run the axe audit on a representative subset of the 19 LogPanel stories, not all 19.

**Rationale**: 19 stories × 3 themes = 57 test runs. Many stories share the same DOM structure (e.g., `TimelineDefault`, `EntrySelected`, `CompactView` all render the same LogPanel container). Running all 19 is redundant. The representative set covers:
- Default populated state (`TimelineDefault`)
- Empty/no-data states (`EmptyNoPlot`, `EmptyNoEntries`)
- Selected-entry state (`EntrySelected`)
- Compact view (`CompactView`)
- Card-flip interactions (`FlipCardDefault`)

This gives 6 stories × 3 themes = 18 audit runs — enough to surface structural issues without a 57-run test suite.

**Note**: The audit report must list which stories were included and which were excluded, with justification.

## Finding 5: Storybook URL Pattern

**Decision**: Use the existing URL pattern from other E2E tests in `shared/components/e2e/`.

**Rationale**: All existing tests (ActivityPanel, FilterBar, ChartRenderer, LogPanel.spec.ts) use:
```
/iframe.html?id={story-id}&globals=theme:{light|dark|vscode}
```
The `globals=theme:X` parameter is picked up by the Storybook `withThemeProvider` decorator. The pattern is proven and consistent.

**LogPanel story IDs** follow the format `logpanel--{story-export-name-kebab}`, e.g.:
- `logpanel--timeline-default`
- `logpanel--empty-no-plot`
- `logpanel--entry-selected`

## Finding 6: VS Code Variable Mapping for Storybook Injection

**Decision**: Create a static map of `--vscode-*` values for `light` and `dark` theme variants, matching VS Code's built-in Default Light+ and Default Dark+ palettes.

**Rationale**: LogPanel uses these VS Code variables (sourced from LogPanel.css):
- `--vscode-foreground`, `--vscode-editor-background`, `--vscode-sideBar-background`
- `--vscode-panel-border`, `--vscode-button-secondaryBackground`, `--vscode-focusBorder`
- `--vscode-editorError-foreground`, `--vscode-badge-background`, `--vscode-input-background`
- `--vscode-list-activeSelectionBackground`, `--vscode-list-hoverBackground`
- `--vscode-font-family`, `--vscode-font-size`

Using VS Code's published default theme colours as fallback values keeps Storybook visually close to the real VS Code experience without requiring a full theme engine.

## Finding 7: E2E Runner for shared/components

**Decision**: Use the existing `shared/components/playwright.config.ts` (Storybook-backed, port 6006) and follow the same `CLAUDE_CODE=1` + `@sparticuz/chromium` pattern used by other E2E tests in this package.

**Rationale**: There is no `run-playwright.mjs` in `shared/components` — the existing tests are run with `pnpm --filter @debrief/components test` (which invokes the playwright config directly). In cloud/CI, the config auto-detects `CLAUDE_CODE=1` or `CI` and uses `@sparticuz/chromium`. The new audit test file follows this same path.
