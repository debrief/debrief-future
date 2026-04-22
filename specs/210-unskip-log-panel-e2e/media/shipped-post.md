---
layout: future-post
title: "Shipped: Un-skip the Log Panel E2E Suite — And Surfaced Two Real Bugs"
date: 2026-04-22
track: [credibility, momentum]
author: Ian
reading_time: 4
tags: [log-panel, testing, tech-debt, ci, e2e]
excerpt: "Three skipped tests came back online. They didn't pass. The escape hatch worked."
---

The planning post for this feature was straightforward: `test-log-panel.spec.ts` had been wrapped in `test.describe.fixme(...)` with a comment pointing to blocker `#143` (STAC-tree iframe instability). That issue shipped in March. The comment became stale the moment it did. Just strip the stale marker, run the three tests, confirm they still pass, mark the spec done.

The shipped reality is different.

When the three tests ran against a real code-server preview for the first time in weeks, they didn't just fail — they failed *deterministically* in two entirely distinct ways, neither of which was the original `#143` blocker:

**Failure mode 1** (test 1, empty state): The webview iframe housing the LogPanel component is not discoverable within 15 seconds after opening a plot. The helper tries `findWebviewFrameByContent('[data-testid="log-panel"]')`, the search times out, and the test hangs.

**Failure mode 2** (tests 2 + 3, tool runs): The map webview opens successfully, but Leaflet's interactive features never render. The test looks for `.leaflet-interactive` elements, finds nothing, times out.

Two separate paths, two separate GUIs, zero production-code changes needed to investigate. The spec anticipated exactly this moment. From FR-005:

> If any of the three tests cannot be made to pass within this feature, the implementer MUST NOT land the change by re-applying `fixme` — instead they MUST open a new blocker issue, document the specific failure mode, and reference the **new** issue (not `#143`).

That's the escape hatch. No silent re-skip. No invisible coverage gap dressed up as a temporary marker. Open a new issue, wire each test to its own `test.fixme(...)` with the specific failure mode inline, and hand off the evidence.

## What We Actually Shipped

The three tests are still pending — but now they're pointing at something real and actionable:

- **Suite-level `test.describe.fixme`/`skip`** → removed.
- **Stale `#143` comment block** → removed.
- **Stale reference to closed issue** → gone.
- **Three per-test `test.fixme(...)` markers** → present, each pointing at [#509](https://github.com/debrief/debrief-future/issues/509) with the specific failure mode.

`SC-001` (the hygiene requirement) is satisfied: grep for `#143` or suite-level `describe.fixme` returns zero matches. `SC-002` and `SC-003` (green runs) are deferred to the PR that closes #509.

## Screenshots

None — this was an infrastructure and test-hygiene feature. The evidence lives in transcripts, not images.

- `evidence/test-summary.md` — the shipped state documented as an FR-005 / R7(b) hand-off: suite reactivated, failures isolated, new blocker filed.
- `evidence/playwright-run.txt` — both the initial live run (showing the two failure modes) and the re-run after `test.fixme` was applied (showing 3 pending tests).
- `evidence/usage-example.md` — how a reviewer or future implementer of #509 can reproduce the pending state and verify the hygiene.

## Lessons Learned

**1. Research verification matters.** The planning research claimed that sibling suites using the same helpers (`test-analysis-tool.spec.ts`, `test-capture-log-evidence.spec.ts`) were "green on main". They were green — but they were *also* `describe.skip`ped against `#143`. The reactivation readiness verdict was partially rationalised from grepping for helper usage rather than actually re-running the siblings. Next time: verify "green sibling" claims by *actually running* the sibling, not by pattern-matching.

**2. Loud failure, actionable blocker.** The escape-hatch policy worked exactly as designed. A failing test is a regression signal, not a coverage gap. Two deterministic failure modes, one new blocker, a clear hand-off path. Zero temptation to patch production code in order to green-light the PR.

**3. Environment baselines are cheap.** We also ran `test-stac-stores.spec.ts` (3/3 green) in the exact same preview at the exact same moment. That single run confirmed that openvscode-server, the bundled VSIX, the Chromium runner, and the upstream `openPlotViaStacTree` helper all work fine — which localised #509 to the LogPanel-webview-iframe and Leaflet-render paths, and eliminated a whole class of "is the environment broken?" red herrings.

**4. Minor hygiene nits can be real bugs.** Research R5 flagged the log-panel focus-command string (`'Debrief Log: Focus on Debrief Log View'` vs. the expected `'Debrief Log: Focus on Log View'`) as a "minor nit — empirically works via fallback selector". It doesn't work. That string mismatch is probably the reason test 1 times out on iframe discovery. Be sceptical of "minor nits" in research — they're sometimes the bug.

## What's Next

[#509](https://github.com/debrief/debrief-future/issues/509) is the live work item. The two failure modes are documented; the reproduction command is in the issue. When #509 ships, the three `test.fixme` lines delete in one commit and SC-002 / SC-003 validate.

The same pattern — R7(b) hand-off with per-test `test.fixme` and a new blocker — will apply to the other `#143`-referenced skipped suites elsewhere in `tests/e2e/` (`test-storyboard-capture.spec.ts` and ~10 others). Each one gets a fresh blocker for its real failure mode, then a one-line delete when that blocker ships.

→ [See the spec](../spec.md)
→ [See the diff](../evidence/diff.patch)
→ [Reproduce it yourself](../evidence/usage-example.md)
