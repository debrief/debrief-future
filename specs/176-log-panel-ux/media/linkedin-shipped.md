---
platform: linkedin
type: shipped
feature: 176-log-panel-ux
date: 2026-04-19
---

Two changes to the Future Debrief Log Panel that analysts will feel immediately.

First, every parameter is now visible. The panel used to hide parameters that were left at their defaults — which made the audit trail ambiguous, because "not shown" could mean either "defaulted" or "missing from the record". Every parameter now renders as a chip, up to five with a `+N more` overflow indicator, and the ones that departed from default carry a small red-dot marker. Default and non-default are both present; the difference is visible; nothing is hidden.

Second, timestamps are now UTC. `HH:MM:SS UTC` regardless of the viewer's machine, so a log compared across Portsmouth, Halifax, and Canberra means the same clock. Durations ≥1s render with a single decimal so a column of runtimes scans cleanly.

Also in this PR: a proper ARIA tablist with arrow-key navigation on the 4-tab view-mode bar, placeholder text for parameterless entries and manual snapshot checkpoints, and a boolean polarity flip (`isDefault` → `isNonDefault`) that makes every call site read in plain English. 70 LogPanel tests, 1,600 total component tests, 0 failing.

Full walkthrough on the blog.

#FutureDebrief #MaritimeAnalysis #Accessibility
