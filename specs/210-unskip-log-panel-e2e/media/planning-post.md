---
layout: future-post
title: "Planning: Un-skip the Log Panel E2E Suite"
date: 2026-04-22
track: [momentum]
author: Ian
reading_time: 3
tags: [tracer-bullet, log-panel, testing, tech-debt, ci]
excerpt: "Three Playwright tests have been silently absent from CI since the blocker they cited closed. Time to fix the paperwork."
---

## What We're Building

Three Playwright tests live at `tests/e2e/test-log-panel.spec.ts`. They exercise the real integration path — code-server to LogPanel webview iframe to the VS Code message bus — when a tool runs and emits a `LogEntry`. A unit test cannot prove that path. A Storybook story cannot prove that path. These three tests are the only thing that can.

They have not run in CI for weeks. They are wrapped in `test.describe.fixme(...)` with a comment referencing blocker `#143` (STAC-tree iframe selector instability). `#143` shipped in March. The comment became stale the moment it did, but the reactivation paperwork never followed. So the suite is silently pending — visible to Playwright as "fixme", invisible to anyone scanning a CI summary looking for broken tests. This feature is the paperwork. A single-file edit: `fixme` → active, strip the stale three-line comment, run the tests enough times to know they are stable, capture the evidence.

## How It Fits

Constitution Article I.3 says "no silent failures". A `fixme` marker on a closed blocker is the textbook case — coverage gap hiding behind an annotation that was once truthful and is no longer. The sibling suites (`test-analysis-tool.spec.ts`, `test-capture-log-evidence.spec.ts`) use the same helpers, hit the same iframe, and already pass green on main. The production selectors the tests query (`[data-testid="log-panel"]`, `[data-testid="log-panel-empty-no-entries"]`, `.log-panel__entry`) all landed with #176 and are stable. Everything the tests need is in place. What's missing is a human looking at the file, deleting five words, and committing the result.

## Key Decisions

- **Single-file edit, no production code touched.** If a test fails on reactivation, that failure surfaces a real bug — and the fix belongs in a separate feature, not silently bundled here (NFR-001).
- **No silent re-skip.** If the tests fail, we open a fresh blocker and document the new failure mode. We do not point `fixme` back at `#143` — that issue is closed, and reanimating it would be the same category of error the feature exists to correct (FR-005).
- **Three consecutive green runs** are the stability bar for merge, matching the historical flakiness class that the original `#143` tracked (SC-003).
- **Scope stays tight.** `test-storyboard-capture.spec.ts` also has a `#143`-referenced skip, but it belongs to the Storyboarding epic and will be dealt with separately. One stale marker, one PR, one piece of evidence.
- **Loud failures over silent skips, always** — even when the silent skip was once the right call. The point of annotating a skip is to make it temporary; letting the annotation outlive the blocker defeats the purpose.

## What We'd Love Feedback On

- The "fixme → loud failure" failure-mode policy: if a reactivated test turns out to be genuinely intermittent — not broken, just flaky — FR-005 says open a new issue and keep the test active. An alternative stance is to allow a re-skip onto a freshly opened flakiness issue, so that one unstable test doesn't hold up a dozen unrelated PRs. Which is the right default when CI trust and merge velocity pull in opposite directions?
- Batching: is it worth bundling all `#143`-referenced skipped suites (this one plus `test-storyboard-capture.spec.ts`) into a single reactivation PR? It halves the review surface but mixes concerns across two epics and complicates evidence attribution.
- Stability threshold: three consecutive runs or ten? Three is the current bar for sibling suites and matches the evidence convention; ten would give more confidence against the specific flakiness class `#143` originally tracked, but costs CI time on every subsequent re-run.

→ [Spec](../spec.md)
→ [Research notes](../research.md)
