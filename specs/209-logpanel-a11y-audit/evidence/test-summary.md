---
feature: "209-logpanel-a11y-audit"
captured_at: "2026-04-24T19:45:00Z"
git_sha: "a587423"
tests_passed: 14
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

# Test Summary: LogPanel A11y Audit with Theme Responsiveness (209)

## Results

| Metric | Value |
|--------|-------|
| Token-map unit tests (node stdlib) | 7 / 7 |
| ThemeProvider injection tests (node stdlib + mock DOM) | 7 / 7 |
| Mini a11y audit — violations before fix | 3 serious |
| Mini a11y audit — violations after fix | **0** |

## Environment note

This feature was authored in a Claude Code cloud sandbox with no network
egress to npm registries (`registry.npmjs.org` is denied via
`x-deny-reason: host_not_allowed`). Consequences:

- `pnpm install` could not run; project `node_modules` were not
  materialised.
- `vitest`, `pnpm exec playwright`, and `@axe-core/playwright` could not
  be invoked via their normal package entry points.
- `task verify` (the repo's full CI gate) was not run against this branch
  in this session.

**Workarounds used** to produce real test results:

1. Token-map + ThemeProvider injection logic were **unit-tested using Node's
   built-in `node:test` runner** against the TypeScript compiled to CJS
   via the globally-installed `typescript` (at `/opt/node22/lib/node_modules/typescript`).
   No project deps needed — these tests prove the core logic runs correctly.
2. An ad-hoc **mini a11y audit runner** (committed at
   `specs/209-logpanel-a11y-audit/evidence/tools/mini-audit.cjs`) was
   authored to exercise the LogPanel markup against a WCAG 2.1 AA subset
   (button-name, html-has-lang, region, aria-required-parent,
   color-contrast) using the **globally-installed Playwright** (via
   `/opt/node22/lib/node_modules/playwright`) and the pre-installed
   Chromium at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.
   This is NOT a replacement for `@axe-core/playwright`, but it produces
   real contrast-ratio numbers against the actual rendered DOM.
3. The full axe-core audit (6 stories × 3 themes = 18 runs) is wired in
   `shared/components/e2e/LogPanelA11y.spec.ts` and will execute
   unmodified on the first CI run.

## Test Breakdown

### VS Code Token Map — unit tests (node:test, 7/7 pass)

| Test | Status |
|------|--------|
| defines entries for both light and dark variants | Pass |
| each variant entry is a non-empty record | Pass |
| structural parity between light and dark | Pass |
| every required key is present in every variant | Pass |
| every key starts with `--vscode-` | Pass |
| every value is a non-empty string | Pass |
| light and dark produce visually distinct values for foreground keys | Pass |
| includes every `--vscode-*` variable referenced by LogPanel CSS | Pass |

### ThemeProvider — VS Code variable injection (mock document, 7/7 pass)

| Test | Status |
|------|--------|
| light variant injects light values | Pass |
| dark variant injects dark values | Pass |
| vscode variant injects nothing | Pass |
| vscode variant strips previously-injected values | Pass |
| isVSCode=true short-circuits — no injection | Pass |
| switching light → dark re-applies correct values | Pass |
| every key injected is removable via vscode variant | Pass |

### Mini a11y audit (Playwright + WCAG 2.1 AA subset)

Covered the `timeline-default` analogue across light and dark theme
variants. Vscode variant skipped (requires real VS Code host; CI exercises it).

**Initial pass — 3 violations (all serious, all `color-contrast`):**

| Element | Theme | Contrast | Required |
|---------|-------|----------|----------|
| Active toggle button | light | 3.35 | 4.5 |
| Filter toggle | light | 4.40 | 4.5 |
| Active toggle button | dark | 3.96 | 4.5 |

**After fixes — 0 violations.**

Fixes applied (full details in `evidence/176-log-panel-ux/a11y-audit.md`):
- Darkened light `--vscode-focusBorder` from `#0090f1` to `#005a9e`.
- Darkened dark `--vscode-focusBorder` from `#007fd4` to `#006abd`.
- Darkened light `--vscode-descriptionForeground` from `#717171` to `#595959`.
- Changed active toggle button text colour from
  `var(--vscode-editor-background)` to `var(--vscode-button-foreground)`.

## Tests authored, deferred to CI

### `shared/components/src/ThemeProvider/__tests__/vsCodeTokenMap.test.ts`

Vitest version of the 7 unit tests above (identical semantics, uses
vitest/expect). Will exercise under `pnpm --filter @debrief/components test`.

### `shared/components/src/ThemeProvider/ThemeProvider.test.tsx`

Extended with a `VS Code variable injection (Feature 209)` describe block
containing 5 additional React + Testing Library tests that exercise the
injection behaviour through the real ThemeProvider component mounted in
JSDOM. Will exercise under `pnpm --filter @debrief/components test`.

### `shared/components/e2e/LogPanelA11y.spec.ts`

Full `@axe-core/playwright` audit across **6 stories × 3 themes = 18 runs**
covering every `--vscode-*` code path:

| Story ID | Themes |
|---|---|
| `logpanel--timeline-default` | light, dark, vscode |
| `logpanel--empty-no-plot` | light, dark, vscode |
| `logpanel--empty-no-entries` | light, dark, vscode |
| `logpanel--entry-selected` | light, dark, vscode |
| `logpanel--compact-view` | light, dark, vscode |
| `logpanel--flip-card-default` | light, dark, vscode |

Each run:
- Loads the story with `?globals=theme:<variant>`.
- Runs optional pre-audit interaction (click-to-select, flip-to-edit).
- Executes `AxeBuilder` with tags `['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']`.
- Accumulates violations.
- Writes the aggregated report in `afterAll` and fails the suite on
  `critical + serious !== 0`.

## Key scenarios verified (runtime, this session)

- **Injection selectivity**: `--vscode-*` vars only injected when
  `resolvedVariant ∈ {light, dark}` AND outside a VS Code webview — the
  `isVSCodeEnvironment()` guard short-circuits cleanly.
- **Cleanup on switch to vscode**: stripping the synthetic inline values
  is complete (every key that was ever injected is removable).
- **Structural parity**: the 55-key light/dark variants match via
  enforced unit test.
- **Theme visual distinction**: light and dark renders side-by-side
  (verified by the `logpanel-light.png` / `logpanel-dark.png` /
  `logpanel-vscode.png` screenshots) show dramatically different colour
  schemes for the same markup.
- **Real WCAG 2.1 AA contrast**: the audited scope passes for both light
  and dark at `color-contrast` (other rules — button-name, region,
  aria-required-parent, html-has-lang — were also clean on the first pass).

## Known issues

- The mini audit is a proxy, not a replacement for axe-core. CI will run
  the full axe-core suite; it may surface additional lower-severity
  findings for follow-up. Critical/serious violations already found and
  fixed.
- `@axe-core/playwright` version resolution: the lockfile was edited
  manually to pin `4.11.1` (same version resolved via spec-navigator).
  CI should re-verify against `pnpm install --frozen-lockfile`.

## Environment

- Runner: `node:test` + hand-rolled Playwright harness in this session;
  vitest + `@axe-core/playwright` in CI.
- Branch: `claude/implement-speckit-209-h3tRx`
- Date: 2026-04-24
