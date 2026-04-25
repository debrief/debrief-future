# Implementation Plan: VS Code Theme Responsiveness

**Branch**: `220-fix-theme-responsiveness` | **Date**: 2026-04-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/220-fix-theme-responsiveness/spec.md`

## Summary

Make every Debrief webview panel correctly reflect VS Code's active colour theme — light, dark, high-contrast-light, high-contrast-dark — and update within one second when the user switches themes. The fix has two halves:

1. **Webview wiring**: every entry under `apps/vscode/src/webview/web/` mounts its React tree under a `ThemeProvider` whose initial variant comes from VS Code's body class and which subscribes (via the existing but currently uncalled `setupVSCodeThemeSync` adapter) to runtime theme changes.
2. **Variant model**: replace the muddled `'light' | 'dark' | 'vscode' | 'system'` union with a flat first-class enumeration `'light' | 'dark' | 'high-contrast-light' | 'high-contrast-dark' | 'system'`, mirroring VS Code's body-class taxonomy. The `'vscode'` value is retired; "use VS Code tokens" becomes the default rendering inside a webview, expressed by the four explicit values.

A third strand makes Storybook honest: a single shared decorator injects `--vscode-*` CSS variables for the selected variant so the toolbar selector actually drives component colours instead of falling through to hardcoded fallbacks.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), React 18.x. No Python service changes.
**Primary Dependencies**: React (existing), `@debrief/components` `ThemeProvider` (existing — extending), VS Code Webview API (browser-native CSS variables + `window.postMessage`), browser-native `MutationObserver`, Storybook 8.x decorators (existing — extending). **No new runtime dependencies.**
**Storage**: N/A — theme state is in-memory only.
**Testing**: Vitest (unit + React Testing Library) for `ThemeProvider`, the new theme-source adapter, and the webview wrappers. Playwright via `apps/web-shell` for an end-to-end "switch VS Code theme → all panels update" assertion (covered in Web-Shell E2E Testing below). Storybook stories are the source of truth for visual variant snapshots.
**Target Platform**: VS Code 1.85+, Chromium baseline (matches existing `apps/web-shell` Playwright stack). All consumed APIs (`MutationObserver`, `matchMedia('(prefers-contrast: more)')`, CSS custom properties, `window.postMessage`) are baseline-supported.
**Project Type**: Single monorepo; this feature touches `shared/components/src/ThemeProvider/`, `shared/components/.storybook/`, all seven entries under `apps/vscode/src/webview/web/`, and a small slice of CSS tokens under `shared/components/src/styles/`.
**Performance Goals**: Theme switch propagates to every open webview within 1 second (FR-002, SC-001). No intermediate visual artefact persists longer than 200ms (SC-006). One-time mount cost: a single `useEffect` per webview registering one `MutationObserver` plus one `message` listener — negligible.
**Constraints**: No per-component theme wiring (FR-007); contrast must meet WCAG 2.1 AA in all four explicit variants (FR-006, SC-005); the legacy `'vscode'` variant is retired without a deprecation shim (Article XIV pre-release freedom permits this).
**Scale/Scope**: 7 webview entries to wrap, ~20 components consuming `--debrief-*` / `--vscode-*` tokens, 4 explicit + 1 system variant. Storybook decorator covers all stories in `shared/components/src/**/*.stories.tsx`.

## Constitution Check

Evaluating against `.specify/memory/constitution.md` v1.2.0.

| Article | Verdict | Notes |
|---|---|---|
| I. Defence-Grade Reliability — offline by default, no silent failures | **Pass** | Pure UI / browser-local. No network. Theme resolution failures fall back to a defined default variant rather than rendering blank. |
| II. Schema Integrity | **N/A** | `ThemeVariant` is a UI-side TypeScript union, not part of any LinkML data schema. |
| III. Data Sovereignty | **N/A** | No persisted data, no telemetry, no provenance to record. |
| IV. Architectural Boundaries — services never touch UI | **Pass** | Theme handling lives entirely in the React layer. No Python service touched. |
| V. Extensibility — fail-safe loading | **Pass** | A misbehaving theme adapter would degrade to the default variant; webviews still render. |
| VI. Testing — schema/unit/integration | **Pass** | Plan includes Vitest unit tests for the adapter and a web-shell Playwright test for the runtime-switch path (see Storybook E2E + Web-Shell E2E sections). |
| VII. Test-Driven AI Collaboration | **Pass** | Acceptance scenarios in spec.md and SC-007/008/009 are directly testable; tasks will encode them as executable assertions before implementation. |
| VIII. Documentation | **Pass** | `docs/storybook-vscode-theming.md` updated as part of the feature; ADR added recording the variant-shape decision (cross-referenced from `decisions.md`). |
| IX. Dependencies — minimal, vetted, pinned | **Pass** | Zero new runtime dependencies. All adapter APIs are browser-native or already present (`@debrief/components`, Storybook). |
| X. Security | **Pass** | No secrets, no new network surface. |
| XI. Internationalisation | **N/A** | Theme switching is locale-agnostic. |
| XII. Community Engagement | **Pass** | Storybook stories will visibly demo the four variants — feeds the public preview workflow. |
| XIII. Contribution Standards | **Pass** | Standard atomic-commits + PR review path. CI gates already enforced. |
| XIV. Pre-Release Freedom | **Pass** | Permits retiring the `'vscode'` variant without a deprecation shim. |
| XV. Strict Type Safety — no `any` | **Pass** | Flat union is fully typed; no `any` introduced. The extension-host message channel is narrowed at the boundary via a typed `vscode-theme-changed` payload (see contracts/). |

**Gate result**: All articles pass; no Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/220-fix-theme-responsiveness/
├── plan.md              # This file
├── research.md          # Phase 0 output (open questions resolved below)
├── data-model.md        # Phase 1 output (Theme entity / variant union / context shape)
├── quickstart.md        # Phase 1 output (how to verify the fix end-to-end)
├── contracts/
│   └── theme-source.md  # Adapter API + extension-host message contract
└── tasks.md             # Phase 2 output — created by /speckit.tasks
```

### Source Code (repository root)

```text
shared/components/src/ThemeProvider/
├── ThemeProvider.tsx          # Subscribes to a Theme Source; re-applies on change
├── ThemeContext.ts            # Variant union → flat 5-value enum
├── defaultTheme.ts            # Drop 'vscode' default; light/dark stay
├── vsCodeAdapter.ts           # setupVSCodeThemeSync — wired in (currently orphaned)
├── browserAdapter.ts          # NEW — system + prefers-contrast detection (Storybook & web-shell)
└── ThemeProvider.test.tsx     # Vitest: subscription, cleanup, fallback

shared/components/src/styles/
└── tokens.css                 # 4 explicit [data-theme=...] blocks instead of 3

shared/components/.storybook/
├── preview.tsx                # Theme decorator: now injects --vscode-* per variant
└── vscode-token-map.ts        # NEW — single source of --vscode-* values per variant
                               # (sourced from spec 209 research.md)

apps/vscode/src/webview/web/
├── _bootstrap.tsx             # NEW — shared <ThemeProvider> wrapper (avoid duplication)
├── activityPanel.tsx          # Use _bootstrap
├── catalogOverview.tsx        # Use _bootstrap
├── logPanel.tsx               # Use _bootstrap
├── mapView.tsx                # Use _bootstrap
├── resultsPanel.tsx           # Use _bootstrap
├── storyboardPanel.tsx        # Use _bootstrap (replaces local ThemeProvider)
└── timeController.tsx         # Use _bootstrap

apps/vscode/src/host/
└── themeRelay.ts              # NEW — extension host posts vscode-theme-changed
                               # via onDidChangeActiveColorTheme (FR-010)

docs/
└── storybook-vscode-theming.md  # Updated — documents new variant model
docs/project_notes/
└── decisions.md               # Append ADR for variant shape decision
```

**Structure Decision**: Single project, three real change surfaces — the `ThemeProvider` pipeline in `shared/components/`, the seven webview entries in `apps/vscode/src/webview/web/` (consolidated via a new `_bootstrap.tsx`), and the Storybook decorator in `shared/components/.storybook/`. A small extension-host file (`apps/vscode/src/host/themeRelay.ts`) is added so VS Code's `onDidChangeActiveColorTheme` event reaches the webviews via `postMessage` (FR-010 second clause).

## Media Components

This feature is a cross-cutting change across **every** existing webview component, but it does not introduce a new visual component. The narrative value of a blog post comes from the *transition* — showing existing components updating live as the theme switches — rather than from any single bundled story.

| Component | Story Source | Bundle Name | Purpose |
|---|---|---|---|
| LogPanel (theme transition demo) | `shared/components/src/LogPanel/LogPanel.stories.tsx` | `logpanel-themed.js` | Demonstrates a representative panel cycling through all four explicit variants live, validating that the Storybook decorator + ThemeProvider runtime-subscription work end-to-end. |

**Inclusion Criteria Applied**:
- [ ] New visual component
- [x] Significant visual change (every component re-themes correctly across four variants)
- [x] Interactive demo adds narrative value (live theme cycling is the whole point)

**Bundleability Verified**:
- [x] Stories exist in Storybook (LogPanel stories already shipped under spec 176)
- [x] Components render standalone (LogPanel uses no extension-host APIs in stories)
- [x] Reasonable bundle size expected (< 500KB; LogPanel + ThemeProvider only)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/components-logpanel--default`

## Storybook E2E Testing

The Storybook decorator is the only realistic source of truth for the four explicit variants — driving VS Code itself through every theme is fragile. We verify each component's variant rendering at the Storybook layer.

| Story | Test Coverage | Theme Variants | Interactions |
|---|---|---|---|
| `LogPanel.stories.tsx` (Default + WithEntries) | Rendering, axe-core a11y (also feeds spec 209) | light, dark, high-contrast-light, high-contrast-dark | none — pure render |
| `FilterBar.stories.tsx` | Rendering | light, dark, high-contrast-light, high-contrast-dark | none |
| `FeatureList.stories.tsx` | Rendering | light, dark, high-contrast-light, high-contrast-dark | none |
| `MapView.stories.tsx` | Rendering | light, dark, high-contrast-light, high-contrast-dark | none |

**Testing Strategy**:
- [x] Component renders correctly in all four explicit theme variants
- [x] No story renders with a hardcoded fallback colour when the toolbar selects a non-fallback variant (verified by visual snapshot diffing against the previous fallback-only state)
- [x] Accessibility attributes present (delegates to spec 209 axe scan)
- [x] Screenshots captured for evidence in `specs/220-fix-theme-responsiveness/evidence/screenshots/`

**Test File Location**: `shared/components/e2e/theme-variants.spec.ts` (new — covers all four stories above in one file using a parameterised loop over variants).

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=components-logpanel--default&globals=theme:light
/iframe.html?id=components-logpanel--default&globals=theme:dark
/iframe.html?id=components-logpanel--default&globals=theme:high-contrast-light
/iframe.html?id=components-logpanel--default&globals=theme:high-contrast-dark
```

## Web-Shell E2E Testing

The runtime-subscription path (FR-002, FR-010, SC-008) cannot be observed at the Storybook layer — Storybook drives the variant via React state, not via VS Code's body class. We need an end-to-end test that simulates a body-class mutation and asserts the component re-themes within 1 second.

| Workflow | Panels/Components Involved | Key Selectors | Interactions |
|---|---|---|---|
| Simulate VS Code theme change → all open panels re-theme within 1s | All seven webview entries (loaded as routes in `apps/web-shell/`) | `[data-theme]`, `[data-testid="log-panel"]`, `[data-testid="map-view"]`, `[data-testid="filter-bar"]` | mutate `<body>`'s class from `vscode-dark` → `vscode-light` → `vscode-high-contrast` and assert each panel's `[data-theme]` attribute updates and a representative pixel re-paints within 1s |

**Testing Strategy**:
- [x] Workflow runs end-to-end in the web-shell (`AnalysisPage` extended to expose a `setVSCodeBodyClass(variant)` helper)
- [x] Page object reuse — extend the existing `AnalysisPage` rather than duplicating
- [x] Screenshot per variant written into `specs/220-fix-theme-responsiveness/evidence/screenshots/` from the spec test (follows `properties-screenshots.spec.ts` pattern)

**Test File Location**: `apps/web-shell/playwright/tests/theme-runtime-switch.spec.ts`

**Run Commands**:
- Cloud: `cd apps/web-shell && node run-playwright.mjs theme-runtime-switch`
- Local: `pnpm --filter @debrief/web-shell test theme-runtime-switch`

**Optional — chrome-level VS Code Webview tests**: Not required. The web-shell harness can synthesise the body-class mutation that VS Code itself produces; it is the more reliable substrate.

## Complexity Tracking

No Constitution violations — table intentionally empty.
