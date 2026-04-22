# Implementation Plan: LogPanel A11y Audit with Theme Responsiveness

**Branch**: `209-logpanel-a11y-audit` | **Date**: 2026-04-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/209-logpanel-a11y-audit/spec.md`

## Summary

Run a full `@axe-core/playwright` accessibility audit against representative LogPanel Storybook stories in `light`, `dark`, and `vscode` theme variants, producing a machine-readable report at `evidence/176-log-panel-ux/a11y-audit.md`. Before the audit can be meaningful, fix the root cause of theme non-responsiveness: LogPanel CSS uses `--vscode-*` custom properties, but Storybook's ThemeProvider only injects `--debrief-*` tokens — leaving `--vscode-*` unset and LogPanel permanently rendering with dark-mode fallback colours regardless of the active Storybook theme. The fix is to extend the Storybook ThemeProvider decorator to also inject a static map of `--vscode-*` values keyed to the selected theme variant.

## Technical Context

**Language/Version**: TypeScript 5.x (shared/components)
**Primary Dependencies**: `@axe-core/playwright ^4.8.5` (new devDep, same version as spec-navigator), `@playwright/test` (existing), Storybook 8.x (existing)
**Storage**: N/A — audit output written to `evidence/176-log-panel-ux/a11y-audit.md` (markdown file, committed to repo)
**Testing**: `@axe-core/playwright` (new automated audit), `@playwright/test` (existing Storybook E2E harness)
**Target Platform**: Storybook (browser, port 6006) — no VS Code extension changes needed
**Project Type**: Component library test addition (`shared/components`)
**Performance Goals**: Audit suite completes in under 5 minutes
**Constraints**: Must work in cloud sessions via `@sparticuz/chromium` (same pattern as all other shared/components E2E tests); no production bundle changes
**Scale/Scope**: 6 representative LogPanel stories × 3 theme variants = 18 audit runs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I — Reliability | Offline by default | ✅ PASS | All testing and audit runs entirely local/Storybook — no network calls |
| II — Schema Integrity | Schema tests mandatory | ✅ N/A | No schema changes in this feature |
| IV — Architectural Boundaries | Services never touch UI | ✅ PASS | Pure frontend/test change; no Python service changes |
| VI — Testing | Tests required, CI must pass | ✅ PASS | New E2E audit test added; existing CI gates unaffected |
| IX — Dependencies | Minimal, vetted, pinned | ✅ PASS | `@axe-core/playwright ^4.8.5` — MIT, zero prod footprint, already in monorepo (spec-navigator), pinned to matching version |
| XIII — Contribution | CI must pass | ✅ PASS | Audit test is additive; existing tests unaffected |
| XV — Strict Types | Explicit types, strict mode | ✅ PASS | All new TypeScript must type audit results and helper functions explicitly; no `any` |

**No violations. No Complexity Tracking entry required.**

## Project Structure

### Documentation (this feature)

```text
specs/209-logpanel-a11y-audit/
├── plan.md              # This file
├── research.md          # Phase 0 — all unknowns resolved
├── data-model.md        # N/A — no new data entities
├── quickstart.md        # Phase 1 — how to run the audit locally
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
shared/components/
├── src/
│   └── ThemeProvider/
│       ├── vsCodeTokenMap.ts     # NEW — static --vscode-* values per variant
│       ├── ThemeProvider.tsx     # MODIFY — inject vscode vars when not in VS Code
│       └── index.ts              # No change needed
├── .storybook/
│   └── preview.tsx               # No change needed (ThemeProvider handles injection)
└── e2e/
    └── LogPanelA11y.spec.ts      # NEW — axe audit across stories × themes

evidence/
└── 176-log-panel-ux/
    └── a11y-audit.md             # NEW — audit report (produced by running the spec)
```

**Structure Decision**: Single component library package (`shared/components`). No new packages, no backend changes, no VS Code extension changes.

## Design Details

### Theme Fix: VS Code Variable Injection

**File**: `shared/components/src/ThemeProvider/vsCodeTokenMap.ts`

A static record mapping `'light' | 'dark'` to the key `--vscode-*` variable values used by LogPanel and sub-components. Values sourced from VS Code's Default Light+ and Default Dark+ published themes.

```typescript
// Shape only — exact values in implementation
export type VSCodeThemeVariant = 'light' | 'dark';

export const VS_CODE_TOKEN_MAP: Record<VSCodeThemeVariant, Record<string, string>> = {
  light: {
    '--vscode-foreground': '#616161',
    '--vscode-sideBar-background': '#f3f3f3',
    '--vscode-editor-background': '#ffffff',
    // ... all vars used by LogPanel.css
  },
  dark: {
    '--vscode-foreground': '#cccccc',
    '--vscode-sideBar-background': '#252526',
    '--vscode-editor-background': '#1e1e1e',
    // ... all vars used by LogPanel.css
  },
};
```

**File**: `shared/components/src/ThemeProvider/ThemeProvider.tsx` (modification)

In the `useEffect` that applies theme tokens, add a branch: if `resolvedVariant` is `'light'` or `'dark'`, and we are NOT in a VS Code webview (`!isVSCodeEnvironment()`), iterate the matching `VS_CODE_TOKEN_MAP` entry and set each property on `document.documentElement`. When `resolvedVariant` is `'vscode'`, skip injection (VS Code will supply the real variables).

This keeps the fix invisible to production webview consumers and only active in Storybook/web-shell contexts.

### Audit Test: `LogPanelA11y.spec.ts`

Follows the pattern of `shared/components/e2e/ActivityPanel.spec.ts` and `spec-navigator/e2e/a11y.spec.ts`.

**Stories audited** (6 representative stories):

| Story export | Storybook ID | Rationale |
|---|---|---|
| `TimelineDefault` | `logpanel--timeline-default` | Primary populated state |
| `EmptyNoPlot` | `logpanel--empty-no-plot` | Empty state — no plot loaded |
| `EmptyNoEntries` | `logpanel--empty-no-entries` | Empty state — plot loaded, no log entries |
| `EntrySelected` | `logpanel--entry-selected` | ARIA selected-state coverage |
| `CompactView` | `logpanel--compact-view` | Compact layout variant |
| `FlipCardDefault` | `logpanel--flip-card-flip-card-edit-icon` | Flip card interaction state |

**Test structure** (per story per theme):
```typescript
const result = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
  .analyze();
// Collect violations — do NOT fail immediately; accumulate for report
```

The test accumulates all violations across all 18 runs, writes the structured report to `evidence/176-log-panel-ux/a11y-audit.md`, then asserts zero critical/serious violations.

### Audit Report Format (`a11y-audit.md`)

```markdown
# LogPanel A11y Audit Report
**Date**: {ISO date}  **Branch**: 209-logpanel-a11y-audit  **Result**: PASS / FAIL

## Stories Audited
| Story | Themes | Violations Found | Status |
|-------|--------|-----------------|--------|

## Violations
### {story} — {theme}
| Rule | Severity | Element | Description | Fix Applied |
|------|----------|---------|-------------|-------------|

## Fixes Applied
...

## Final Audit Result
{summary}
```

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| LogPanel (theme demo) | `src/LogPanel/LogPanel.stories.tsx` | `logpanel-theme.js` | Demonstrates live light/dark/vscode theme switching |

**Inclusion Criteria Applied**:
- [ ] New visual component
- [x] Significant visual change (theme responsiveness fix makes LogPanel visually correct for the first time in light/vscode themes)
- [x] Interactive demo adds narrative value (theme switcher shows the before/after)

**Bundleability Verified**:
- [x] Stories exist in Storybook
- [x] Components render standalone (no app context required — LogPanel stories use mock data)
- [x] Reasonable bundle size expected (< 500KB)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/logpanel--timeline-default`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `TimelineDefault` | Rendering, axe audit | light, dark, vscode | Load, audit scan |
| `EmptyNoPlot` | Rendering, axe audit | light, dark, vscode | Load, audit scan |
| `EmptyNoEntries` | Rendering, axe audit | light, dark, vscode | Load, audit scan |
| `EntrySelected` | Rendering, axe audit, ARIA | light, dark, vscode | Load, card click, audit scan |
| `CompactView` | Rendering, axe audit | light, dark, vscode | Load, audit scan |
| `FlipCardDefault` | Rendering, axe audit, flip | light, dark, vscode | Load, flip card, audit scan |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants (verified by screenshot + no hardcoded-colour regression)
- [x] Interactive elements respond to user input (EntrySelected, FlipCardDefault)
- [x] Accessibility attributes present (aria-selected, aria-label — already tested in LogPanel.spec.ts; axe validates further)
- [x] Screenshots captured for evidence (one per story per theme = 18 screenshots)

**Test File Location**: `shared/components/e2e/LogPanelA11y.spec.ts`

**Theme Variant URLs**:
```
/iframe.html?id=logpanel--timeline-default&globals=theme:light
/iframe.html?id=logpanel--timeline-default&globals=theme:dark
/iframe.html?id=logpanel--timeline-default&globals=theme:vscode
```

## Web-Shell E2E Testing

None — no extension workflow changes. The LogPanel theme fix is entirely within `shared/components`; no VS Code webview host changes are needed.

## Quickstart (how to run the audit)

See [quickstart.md](quickstart.md).
