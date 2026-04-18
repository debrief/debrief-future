Every substantial code review produces a long tail of small follow-ups. The question isn't whether you find them — it's what you do with them next.

On Future Debrief we've just finished planning BACKLOG #199: a single bundled PR that picks up five small cleanups from a recent review. An ADR recording two deliberate type-only import cycles, a collapse of three drifted prop interfaces into one, deletion of an orphaned sub-package that was quietly confusing contributors, a minimal knip config so its report stops drowning in false positives, and a placeholder `plotName` fix plus two in-source TODOs promoted to tracked issues.

None of those is worth its own spec. All of them, left alone, slowly erode reviewer signal. The heavier follow-ups from the same review are getting their own tickets; this one is the small-bucket — a visible cadence of debt repayment that keeps the backlog honest without flooding it with micro-PRs.

The planning post walks through each item and why it earns its slot in the bundle.

→ [Read the planning post](#)

#FutureDebrief #MaritimeAnalysis #OpenSource
