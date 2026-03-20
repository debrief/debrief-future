---
layout: future-post
title: "Planning: Fix STAC Tree E2E Test Reliability"
date: 2026-03-20
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, e2e-testing, vscode-extension, stac-tree, ci-reliability]
excerpt: "15 E2E test suites skip every CI run because the STAC tree never populates. We found the likely root causes."
---

## What We're Building

Every CI run, 15 of our E2E test suites skip. The shared `openPlotViaStacTree()` helper — the one that navigates the STAC tree in the Explorer sidebar to open a plot — cascades through seven wait steps over 42 seconds, then gives up. The tree view is empty. The tests that depend on an open plot have nothing to test against.

This has been the state for a while. The tests themselves are fine. The extension activates, the config is loaded, the STAC catalog exists on disk. But the tree view never renders its nodes, because nobody asked it to.

The root cause investigation turned up two likely culprits. First, a case-sensitivity mismatch: the test selector looks for `"STAC STORES"` in uppercase, but the extension's `package.json` registers the view as `"STAC Stores"` in title case. Playwright's `:has-text()` is case-sensitive, so the selector silently fails to match. Second, VS Code tree views are lazy — `getChildren()` only fires when the view is visible and expanded. In openvscode-server's headless environment, the Explorer sidebar may not auto-open the STAC pane, so the tree never populates even though everything upstream is ready.

The fix is a three-phase approach: add diagnostic instrumentation so we can see exactly where the sequence stalls in CI, harden the pane focus and selector logic, then provide a command-based fallback for tests that don't specifically need tree navigation.

## How It Fits

This is the direct follow-on from #142 (VS Code E2E Webview Reliability). That sprint fixed the webview content lifecycle — getting `resolveWebviewView()` to fire and real React/Leaflet content to render inside Playwright. But the tests still can't run because they can't get a plot open in the first place. The webview renders correctly once triggered; the problem is in the step before: navigating the STAC tree to trigger it.

Fixing this unblocks roughly 50 individual tests across 15 files. That's the majority of our VS Code extension E2E coverage — map display, tool execution, selection sync, layer management. All waiting behind this one helper method.

## Key Decisions

- **Diagnose first**: Before changing anything, we're adding screenshot capture and tree state logging at each stage of `openPlotViaStacTree()`. The failure only reproduces in CI (openvscode-server in headless mode), so we need artifacts that tell us exactly what the sidebar looks like when the selector fails. No guessing.

- **Fix selectors and focus logic**: Replace the case-sensitive CSS selector with a case-insensitive match. Replace fragile pane header clicking with the VS Code command API — `workbench.view.extension.debrief-explorer` or the extension's own focus command. This targets the most likely failure mode without changing the overall test approach.

- **Tighten timeouts, add retries**: The current method has generous per-step timeouts that add up to 42 seconds of waiting for something that will never happen. The plan is shorter individual timeouts (3-5 seconds each) with one full retry of the sequence. Total budget stays at 30 seconds, but failures surface faster.

- **Command-based fallback (Phase 3)**: Add `openPlotViaCommand()` as an alternative path that opens plots by invoking a VS Code command directly, bypassing tree navigation entirely. Most tests don't care how the plot was opened — they care that it's open. One dedicated test will still exercise the tree path for coverage.

- **Don't reload the window**: The current fallback re-seeds the config and reloads the entire window, burning 30 seconds to restart the same sequence that just failed. If the config is already valid (and it is — CI pre-seeds it), the fallback should focus on making the tree visible, not starting over.

## What We'd Love Feedback On

The case-sensitivity finding is suggestive but unconfirmed. It's possible that openvscode-server renders pane headers in all-caps via CSS `text-transform: uppercase`, which would make the selector work despite the mismatch in the source text. The diagnostic screenshots will settle this, but if anyone has noticed how openvscode-server v1.109.5 renders tree view pane headers, that would shortcut the investigation.

More broadly: if you've dealt with VS Code tree view testing in Playwright — getting lazy tree views to populate in a headless environment — we'd like to know what patterns worked. The "use a command to focus the view" approach seems right, but the specific commands that reliably trigger `getChildren()` in openvscode-server may differ from desktop VS Code.

-> [Join the discussion on GitHub](https://github.com/debrief/debrief-future/discussions)
