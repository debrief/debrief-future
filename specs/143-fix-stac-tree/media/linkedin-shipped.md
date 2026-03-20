---
layout: future-post
title: "Shipped: Fix STAC Tree E2E Test Reliability"
date: 2026-03-20
track: [credibility]
author: Ian
reading_time: 1
tags: [143-fix-stac-tree, e2e, ci, reliability]
excerpt: "A single case-sensitive CSS selector had silently skipped 15 E2E test files in every CI run. That's fixed."
---

A single case-sensitive CSS selector — `"STAC STORES"` instead of `"STAC Stores"` — had been silently timing out the `openPlotViaStacTree()` test helper in every CI run. 15 E2E test files and 50+ tests were permanently skipped as a result. Not failing. Skipped.

The fix replaced the fragile CSS lookup with a command palette invocation (`Focus on STAC Stores`), switched from polling for a loading spinner to disappear (which passed trivially when the pane wasn't visible at all) to waiting for the first `.monaco-list-row` to appear, and added diagnostic screenshot capture on failure so CI runs produce something actionable instead of a timeout.

2,161 tests now pass. Zero `.skip` annotations remain in the E2E suite.

That last number matters more than the first. Skipped tests are invisible debt — they don't show up as failures, they don't block merges, and they quietly cover less and less of the system over time.

#FutureDebrief #MaritimeAnalysis #OpenSource
