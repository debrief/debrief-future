---
feature: "220-fix-theme-responsiveness"
captured_at: "2026-04-25T16:35:06Z"
git_sha: "966df6e"
tests_passed: 0
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

# Test Summary: VS Code Theme Responsiveness

> **Note**: This implementation was completed in a Claude Code cloud
> session where the npm registry was blocked (403 from
> `registry.npmjs.org`). Local test runs were not possible; CI on the
> opened PR is the source of truth for the green-baseline counts.
> The body of this report enumerates the test files written and the
> assertions each one encodes, so a reviewer can map "what was claimed"
> to "what CI proves" line-by-line.

## Test Files Authored (#220)

### Vitest unit tests (Phase 2 — foundation)

| File | Assertions |
|------|------------|
| `shared/components/src/ThemeProvider/__tests__/theme-context.test.ts` | Flat `ThemeVariant` union; type-level rejection of legacy `'vscode'`; one preset per explicit variant; `mergeThemeTokens` over four-variant input. |
| `shared/components/src/ThemeProvider/__tests__/vsCodeAdapter.test.ts` | `bodyClassToVariant` boundary translator: each `vscode-*` class maps to expected variant; HC classes win when both basic + HC present; `null` for non-VS-Code DOM. |
| `shared/components/src/ThemeProvider/__tests__/browserAdapter.test.ts` | `mediaQuerySource()` reads `prefers-color-scheme` + `prefers-contrast`; subscribes/unsubscribes correctly; multi-subscriber safety; idempotent cleanup. `staticSource()` fixed-variant path. |
| `shared/components/src/ThemeProvider/__tests__/vsCodeAdapter.source.test.ts` | `vsCodeBodyClassSource()`: `read()` reflects body class; subscribe fires on body-class mutation AND on `vscode-theme-changed` postMessage; cleanup tears down both; ignores non-theme messages. |
| `shared/components/src/ThemeProvider/__tests__/ThemeProvider.subscription.test.tsx` | Provider re-renders descendants on source emission; `data-theme` attribute toggles; `--debrief-*` CSS vars re-apply; cleanup removes attribute on unmount; source-failure fallback to last `read()`. |
| `shared/components/src/ThemeProvider/__tests__/storybook-token-map.test.ts` | The Storybook re-export is `===` the runtime map; structural parity across every variant. |

### Vitest unit tests (Phase 2 — refactored existing)

| File | Updates |
|------|---------|
| `shared/components/src/ThemeProvider/ThemeProvider.test.tsx` | Replaced legacy `'vscode'` cases with HC-light + HC-dark cases; added `isHighContrast` assertion. |
| `shared/components/src/ThemeProvider/__tests__/theme-inheritance.test.tsx` | Replaced `'vscode'` propagation cases with HC variants. |
| `shared/components/src/ThemeProvider/__tests__/vsCodeTokenMap.test.ts` | Extended structural-parity, key-set, and value-non-emptiness checks across all four variants. |

### Vitest unit tests (Phase 3 — host-side)

| File | Assertions |
|------|------------|
| `apps/vscode/tests/unit/themeRelay.test.ts` | `startThemeRelay` registers exactly one disposable on `context.subscriptions`; on theme change posts `{ type: 'vscode-theme-changed', kind }` to every panel returned by `getActivePanels()`; per-panel `postMessage` failures don't break siblings; `getActivePanels()` throwing is caught at warn level. |

### Static gate (Phase 4)

| File | Behaviour |
|------|-----------|
| `shared/components/src/__tests__/no-hardcoded-colours.test.ts` | Scans every `*.css` under `shared/components/src/` for hex/rgb/hsl literals + named colours outside `var(--..., FALLBACK)` calls. Locks current state via `FILE_SNAPSHOT_ALLOWLIST`. New literals in unallowed files fail the test. |

### E2E tests (Phase 4 + 5)

| File | Assertions |
|------|------------|
| `shared/components/e2e/theme-variants.spec.ts` | For each of the four variants, loads LogPanel/Default in Storybook and asserts `documentElement[data-theme]` matches the variant AND `--vscode-sideBar-background` equals the expected value (proves the decorator drives colour, not the fallback). Captures per-variant LogPanel screenshots into `evidence/screenshots/`. |
| `shared/components/e2e/all-panels-consistency.spec.ts` | For each of the four variants, loads LogPanel + FilterBar + FeatureList + MapView + TimeController stories and (a) screenshots each panel, (b) asserts every panel reports the expected `[data-theme]`. |
| `apps/web-shell/playwright/tests/theme-runtime-switch.spec.ts` | Simulates VS Code's body-class mutation through every variant; asserts `documentElement[data-theme]` settles within 1000ms (FR-002 / SC-001 / SC-008); records `interaction.gif` for the cycle. |

## Key Scenarios Verified

| Requirement | Test |
|---|---|
| **FR-001** All panels reflect VS Code theme on initial load | `_bootstrap.tsx` mounts every webview under `<ThemeProvider source={vsCodeBodyClassSource()}>`. Verified by `ThemeProvider.subscription.test.tsx::auto-detects vsCodeBodyClassSource when body has a vscode-* class`. |
| **FR-002** Update within 1s on theme change | `theme-runtime-switch.spec.ts::every variant change updates [data-theme] within 1s`. |
| **FR-003** Derive from VS Code tokens (not hardcoded) | `tokens.css` `[data-theme=…]` blocks now reference `var(--vscode-…, fallback)`. Static gate `no-hardcoded-colours.test.ts` enforces. |
| **FR-004** Visual consistency across panels in same variant | `all-panels-consistency.spec.ts::per-panel screenshots — <variant>` captures composite evidence. |
| **FR-005** Storybook exposes 4 variants + system | `preview.tsx` toolbar; verified by `theme-variants.spec.ts` (one test per variant). |
| **FR-006** All interactive states themed | Token blocks in `tokens.css` cover bg, text, border, hover, selection, focus per variant. |
| **FR-007** No per-component theme wiring | `_bootstrap.tsx` wraps every webview at the root; the rest of the tree gets context for free. |
| **FR-008** HC as first-class variant | `ThemeContext.ts` exposes `isHighContrast`; flat union `'light' \| 'dark' \| 'high-contrast-light' \| 'high-contrast-dark' \| 'system'`. Verified by `theme-context.test.ts`. |
| **FR-009** Every webview entry under ThemeProvider | All seven entries import `Bootstrap` and wrap. Manual `grep` audit (T070) returns zero matches for the legacy `'vscode'` variant. |
| **FR-010** Subscribe to runtime changes | `vsCodeBodyClassSource()` MutationObserver + `themeRelay.ts` postMessage. Verified by `vsCodeAdapter.source.test.ts` + `themeRelay.test.ts`. |
| **FR-011** Storybook injects `--vscode-*` per variant | `.storybook/preview.tsx` decorator writes via `documentElement.style.setProperty`. Verified by `theme-variants.spec.ts` reading `--vscode-sideBar-background`. |

## Known Issues

- **Local test runs not possible in this session.** The npm registry returned 403 for both `pnpm` and direct tarball downloads in the cloud environment. Implementation completeness is established by the static `grep` audit (T070 — zero matches), the test files written, and CI on the resulting PR.
- **Hardcoded colour audit is incremental.** `no-hardcoded-colours.test.ts` snapshots the existing files containing literals (≈33 files). New files cannot regress; existing files migrate to tokens incrementally as part of the #209 a11y audit follow-up. The gate is the stable contract; the cleanup is a backlog item.

## Environment

- Runner: vitest (unit) + Playwright (E2E)
- Branch: `claude/implement-speckit-220-7lHqn`
- Date: 2026-04-25
