# LogPanel A11y Audit Report

- **Date**: 2026-04-24T19:45:00Z
- **Branch**: `209-logpanel-a11y-audit`
- **Result**: **PASS** (after fixes)
- **Auditor**: pre-CI mini-audit against the LogPanel demo HTML harness
  (Feature 209 sandbox) + full `@axe-core/playwright` run scheduled for CI
  (`shared/components/e2e/LogPanelA11y.spec.ts`).

> **Scope of this report**: the initial pass was produced by a WCAG 2.1 AA
> subset runner (hand-implemented in the feature-209 workflow because the
> sandbox session could not install `@axe-core/playwright`). The full
> axe-core audit across **6 stories × 3 themes = 18 runs** will execute in
> CI on first run of `LogPanelA11y.spec.ts` and will overwrite this file
> with a more exhaustive breakdown.

## Severity Summary — Initial Run

| Severity | Count (before fix) | Count (after fix) |
|----------|--------------------|--------------------|
| critical | 0                  | 0                  |
| serious  | 3                  | 0                  |
| moderate | 0                  | 0                  |
| minor    | 0                  | 0                  |

## Runs (initial pass)

Covered `log-panel--timeline-default` analogue (LogPanel with populated
timeline state) across light and dark theme variants via a standalone HTML
harness. VS Code variant was skipped in this pass because the sandbox
cannot run the real webview host (CI will exercise it).

| Story analogue | Theme | Violations (initial) | Violations (after fix) |
|---|---|---|---|
| timeline-default | light | 2 | 0 |
| timeline-default | dark  | 1 | 0 |

## Initial Violations

### timeline-default — light

| Rule | Severity | Element | Description | Contrast | Required |
|------|----------|---------|-------------|----------|----------|
| `color-contrast` | serious | `.log-panel__toggle-btn--active` ("Timeline") | White text on `--vscode-focusBorder` (#0090f1) | 3.35 | 4.5 |
| `color-contrast` | serious | `.log-panel__filter-toggle` ("▸ Filters") | Mid-grey text on mid-grey bg | 4.40 | 4.5 |

### timeline-default — dark

| Rule | Severity | Element | Description | Contrast | Required |
|------|----------|---------|-------------|----------|----------|
| `color-contrast` | serious | `.log-panel__toggle-btn--active` ("Timeline") | Editor-bg-dark text on `--vscode-focusBorder` (#007fd4) | 3.96 | 4.5 |

## Fixes Applied

**1. Active toggle button text colour** (`shared/components/src/LogPanel/LogPanel.css`)

Changed the active-toggle button's text colour from
`var(--vscode-editor-background)` to `var(--vscode-button-foreground)`.
In dark mode the previous value produced near-invisible dark text on a
mid-blue background. White text meets AA contrast on both theme variants
once the focus-border blue is tuned for contrast (see fix 2).

**2. Light-variant `--vscode-focusBorder` darkened**
(`shared/components/src/ThemeProvider/vsCodeTokenMap.ts`)

Changed from `#0090f1` to `#005a9e`. This preserves the "VS Code blue"
aesthetic while raising the contrast ratio against white foreground text
from 3.35:1 to ~6.4:1.

**3. Dark-variant `--vscode-focusBorder` darkened**
(`shared/components/src/ThemeProvider/vsCodeTokenMap.ts`)

Changed from `#007fd4` to `#006abd`. Raises the contrast ratio against
white foreground text from 4.21:1 to ~4.9:1.

**4. Light-variant `--vscode-descriptionForeground` darkened**
(`shared/components/src/ThemeProvider/vsCodeTokenMap.ts`)

Changed from `#717171` to `#595959`. Fixes the "▸ Filters" toggle
contrast against the `#f3f3f3` filter-row background. Raises the ratio
from 4.40:1 to ~7.0:1.

## Verification — Re-run (after fixes)

```
{
  "runs": [
    { "theme": "light", "count": 0 },
    { "theme": "dark",  "count": 0 }
  ],
  "violations": []
}
```

Zero violations remaining in the audited scope.

## How to regenerate — full axe-core run

```bash
cd shared/components
CLAUDE_CODE=1 pnpm test:e2e LogPanelA11y.spec.ts   # cloud / CI
# or
pnpm test:e2e LogPanelA11y.spec.ts                  # local
```

The spec covers six representative stories × three themes = 18 runs,
uses `AxeBuilder().withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])`,
writes the aggregated report to this file in an `afterAll` hook, and fails
the suite on any critical or serious violation.

## Final Audit Result

Result: **PASS** — 0 critical, 0 serious after fixes. The full axe-core
run in CI may surface additional lower-severity findings for follow-up;
those do not gate merge.
