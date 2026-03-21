---
layout: future-post
title: "Shipped: Fix STAC Tree E2E Test Reliability"
date: 2026-03-20
track: [credibility]
author: Ian
reading_time: 4
tags: [tracer-bullet, e2e-testing, vscode-extension, stac-tree, ci-reliability]
excerpt: "A case-sensitive CSS selector was silently skipping 15 E2E test suites every CI run. Fixed."
---

## What We Built

Fifteen E2E test files — around 50 tests covering map display, tool execution, selection sync, and layer management — were being skipped in every CI run. The shared `openPlotViaStacTree()` helper would time out after ~42 seconds, and any test that depended on an open plot had nothing to work with.

The root cause was a single case-sensitive CSS selector. The test looked for `.pane-header:has-text("STAC STORES")` — uppercase — but the extension's `package.json` registers the view as `"STAC Stores"` in title case. Playwright's `:has-text()` is case-sensitive, so the selector matched nothing. The code fell through to a `seedConfigAndReload()` fallback that spent 30 seconds restarting a window that was already in a valid state, then timed out anyway.

The fix rewrites the tree navigation helpers to use command-based focus, positive-signal waits, and a command-palette fallback path.

## The Changes

**Command-based focus.** Instead of clicking a pane header that may or may not render in the right case, the helper now opens the command palette and runs `Focus on STAC Stores`. This mirrors the `revealSidebar()` pattern used elsewhere in the test infrastructure — it tells VS Code explicitly to make the view visible rather than inferring it from DOM state.

**Case-insensitive pane matching.** Where a CSS selector is still needed, the locator now uses a regex filter:

```typescript
// Before
const stacHeader = this.page.locator('.pane-header:has-text("STAC STORES")');

// After
const stacHeader = page.locator('.pane-header').filter({
  has: page.locator('h3', { hasText: /stac stores/i }),
});
```

**Positive-signal waits.** The original implementation polled for the absence of "Loading stores" text — a negative signal that evaluates as true whenever the pane is hidden. The replacement waits for `.monaco-list-row` to appear:

```typescript
private async waitForTreePopulated(timeoutMs: number): Promise<boolean> {
  return this.page.locator('.monaco-list-row').first()
    .waitFor({ state: 'visible', timeout: timeoutMs })
    .then(() => true)
    .catch(() => false);
}
```

**Diagnostic capture on failure.** When the tree doesn't populate within 15 seconds, the helper now screenshots the current state and dumps visible tree rows before throwing. CI artifacts become actionable.

**Command-based fallback.** A new `openPlotViaCommand()` helper bypasses tree navigation entirely, opening a plot via the command palette's Quick Pick list. Most tests don't care how a plot was opened — this path works when the tree UI itself is under investigation.

The `seedConfigAndReload()` fallback is removed. If the config is pre-seeded (which CI does before any test runs), reloading the window is just burning time.

## By the Numbers

| | |
|---|---|
| Tests passing | 2161 |
| Tests failed | 0 |
| E2E test files re-enabled | 15 |
| CI timeout per run eliminated | ~42s |

## Lessons Learned

The failure was genuinely hard to diagnose because the selector didn't error — it matched nothing and silently continued to the next step. Negative-signal waits compound the problem: "Loading stores is not visible" is true from the moment the pane is hidden, so the wait returns immediately and the cascade moves on, confident everything is fine.

The general principle that emerged: when testing VS Code extension UI, prefer commanding over clicking. The command palette is part of the extension API surface and behaves consistently in openvscode-server. DOM selectors for VS Code's own chrome are fragile across versions and rendering modes.

## What's Next

With the E2E suite running cleanly, the next focus is extending it to cover newly landed features. The three-view sync work from #132 has no E2E coverage yet.

→ [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/143-fix-stac-tree/spec.md)
