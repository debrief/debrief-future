---
layout: future-post
title: "Shipped: VS Code E2E Webview Reliability (#142)"
date: 2026-03-18
track: [credibility]
author: Ian
reading_time: 4
tags: [tracer-bullet, e2e-testing, vscode-extension, webview, openvscode-server]
excerpt: "Found and fixed the root cause behind 15 self-skipping E2E test files: a visibility gate in openvscode-server's webview resolution."
---

## What We Built

The Debrief VS Code extension had 18 E2E test files. Fifteen of them self-skipped because the extension's webview content never appeared. The tests were correct to skip — `resolveWebviewView()` genuinely wasn't being called in openvscode-server's headless environment. Without that callback firing, the extension never generates its React/Leaflet HTML, no webview iframe appears in the sidebar, and there's nothing for Playwright to interact with.

We found the root cause in openvscode-server's minified `workbench.js`. The webview view pane's resolution method gates on `isBodyVisible()`, which checks both a visibility flag and an expanded state. In headless environments, `setVisible(true)` is never called on the sidebar view container — no user interaction triggers it — so the visibility flag stays `false`, and the entire webview creation path is skipped.

The fix is a targeted patch to `workbench.js` that separates webview creation from visibility. The patched code always calls the webview creation function (`pc()`), which has its own idempotency guard, while keeping the claim/release resource logic gated on visibility as before. This means `resolveWebviewView()` fires during extension activation regardless of whether the sidebar is visually shown.

## Key Results

| | |
|---|---|
| Validation tests passing | 2 |
| Test files unskipped | 5 |
| Test files converted to fixme (with backlog refs) | 3 |
| Patches in webview lifecycle chain | 4 (3 prior + this one) |

The two new validation tests confirm the core fix: the Debrief sidebar composite renders after clicking the activity bar icon, and the webview survives a toggle cycle (switch to Explorer and back). Both pass in headless CI under Playwright with Chromium.

Five previously self-skipping test files — `test-load-display`, `test-catalog-browse`, `test-selection-sync`, `test-time-controller`, and `test-error-feedback` — are now unskipped and running. Three more files (`test-analysis-tool`, `test-drawing`, `test-webview-probe`) are converted from `skip` to `fixme` with specific backlog references. They need upstream features (calc tools, Geoman drawing) or have been superseded by the real extension content that Patch 3 now provides.

## Technical Approach

The planning post outlined five approaches in order of invasiveness. We ended up with the third option: a direct patch to the visibility gate.

The first approach — forcing a sidebar reveal via `vscode.commands.executeCommand` — didn't work because the command triggers the same visibility-gated code path. The second — upgrading openvscode-server — was deferred because v1.109.5 is the version our entire E2E infrastructure is built against, and an upgrade carries its own risk surface.

Patch 3 itself is six characters of change in a 50,000-line minified file:

```javascript
// Before: only create webview if sidebar is visible
oc(){this.isBodyVisible()?(this.pc(),this.c.value?.claim(this,$e(this.element),void 0)):this.c.value?.release(this)}

// After: always create webview, gate only the resource claim
oc(){this.pc();if(this.isBodyVisible()){this.c.value?.claim(this,$e(this.element),void 0)}else{this.c.value?.release(this)}}
```

The patch is version-pinned to openvscode-server v1.109.5. The `patch-webview.sh` script uses exact string matching against the minified code and exits with a non-zero status if the pattern isn't found — so if someone upgrades the server, CI fails immediately rather than silently losing coverage.

## What's Next

The five unskipped test files now run, but some of them depend on the STAC tree loading within a timeout window. That's a pre-existing test stability issue unrelated to the webview fix — it's next on the list.

The three `fixme` files are parked until their upstream features land: `debrief-calc` for analysis tool tests, Geoman integration for drawing tests.

-> [See the root cause analysis](../evidence/root-cause-analysis.md)
-> [See the test summary](../evidence/test-summary.md)
