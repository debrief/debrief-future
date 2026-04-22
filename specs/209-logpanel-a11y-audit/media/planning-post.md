---
layout: future-post
title: "Planning: LogPanel Accessibility Audit with Theme Responsiveness"
date: 2026-04-22
track: [momentum]
author: Ian
reading_time: 3
tags: [logpanel, accessibility, storybook, theme]
excerpt: "Before we can audit the LogPanel for WCAG violations, we need to fix why switching the Storybook theme to 'light' has no visible effect."
---

## What We're Building

Feature 176 added roving-tabindex keyboard navigation and `aria-selected` to LogPanel cards. The tests pass. But we never ran an automated WCAG scan to confirm the accessibility attributes hold up under real scrutiny — let alone across all three visual themes.

Feature 209 closes that loop with a full `@axe-core/playwright` audit against the LogPanel in light, dark, and VS Code theme variants.

There's a prerequisite fix to make first. The LogPanel's CSS uses VS Code's native `--vscode-*` custom properties (`--vscode-foreground`, `--vscode-sideBar-background`, and so on). Storybook's ThemeProvider only injects `--debrief-*` tokens. The result: switching the Storybook global theme selector from "dark" to "light" or "VS Code" has no visible effect on the LogPanel — the component always falls back to dark-mode colours because the variables it reads are never set in Storybook. Any audit run without fixing this would test the same dark-mode rendering three times over and call it "multi-theme coverage".

The fix is targeted: extend the ThemeProvider to inject a static map of `--vscode-*` values for each theme variant when running outside a real VS Code webview. In production, the webview host supplies the real variables. In Storybook, the ThemeProvider fills the gap.

## How It Fits

The audit output (`evidence/176-log-panel-ux/a11y-audit.md`) is a committed artifact — it becomes the permanent record that the accessibility work from #176 was independently verified. The theme responsiveness fix belongs in `shared/components/ThemeProvider`, not in any story or decorator. Once it lands, every Storybook consumer gets correctly themed `--vscode-*` variables without any per-story wiring.

The audit itself uses `@axe-core/playwright`, which is already in the monorepo via the spec-navigator feature. No new dependencies to evaluate.

## Key Decisions

- Inject a static `--vscode-*` token map from the ThemeProvider, keyed to `'light' | 'dark'` — minimal, contained, invisible to production webview consumers
- Use `@axe-core/playwright` rather than the Storybook a11y addon — the addon is interactive-only; axe-playwright produces machine-readable results that can gate CI
- Audit 6 representative stories (out of 19) × 3 themes = 18 runs — covers empty states, populated states, selected-card ARIA, the compact view, and the flip-card — without redundant repetition of structurally similar stories
- Accumulate all violations before asserting — the test produces a complete picture first, then fails if any critical or serious violations remain, rather than halting at the first problem
- Report committed to `evidence/176-log-panel-ux/a11y-audit.md` alongside the #176 test summary — keeps the evidence for one feature together

## What We'd Love Feedback On

Two open questions before we write code:

**Story selection**: We've picked six stories that cover distinct structural states. Are there states worth adding — for example, a card in an error/unknown-tool state, or the By Feature grouped view — that would surface violations the six chosen stories wouldn't catch?

**Report format**: The plan is a single markdown file listing violations by story + theme, with a separate "Fixes Applied" section and a final pass/fail line. Is that useful to you as a record, or would a different structure (one file per theme, or a summary table up front) read better?

→ [Join the discussion](https://github.com/debrief/debrief-future/discussions)
