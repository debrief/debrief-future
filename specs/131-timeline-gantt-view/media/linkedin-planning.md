How do you find the exercises that matter in an archive of 100? Metadata filters get you partway. But the question analysts keep asking is temporal: "What overlapped with JOINT WARRIOR?" or "What happened in Q3 2024?"

We are building a Gantt-style timeline for Future Debrief's Stack Browser. Each exercise becomes a horizontal bar showing its temporal extent. Drag a time range, and the list and map views filter live -- no submit button, no round-trip. SVG-based, zero new dependencies, running entirely in the browser.

The interesting constraint: the timeline utilities already exist inside our CatalogOverview component. We are extracting them into a shared module so both components use the same parsing and positioning math. Reuse, not rewrite.

Planning post with full technical decisions and open questions: [link]

#FutureDebrief #MaritimeAnalysis #OpenSource
