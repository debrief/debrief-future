Three E2E tests that have been silently skipped since March finally came back online. The plan was simple: remove the stale marker, confirm they pass, done. The reality surfaced two real bugs that the tests were designed to catch.

The feature shipped anyway — not because the tests now pass, but because they're *supposed* to fail when the code is broken. Instead of re-skipping silently onto the long-closed blocker, we opened a new issue (#509) and wired each test to reference it explicitly. Now CI signals a concrete, actionable failure path instead of a coverage gap.

It's a win for the test suite's purpose: regression protection. It's a lesson in "loud failures over silent skips, always."

Read the full write-up to see how the escape hatch policy held up when the happy path didn't:

→ [Shipped: Un-skip the Log Panel E2E Suite](https://debrief.github.io/shipped-unskip-log-panel-e2e/)

#FutureDebrief #Testing #TechDebt #Maritime
