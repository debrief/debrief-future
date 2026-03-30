Every plot in Future Debrief has been a single-user artifact until now. This week we're changing that — adding review feedback so analysts and reviewers can leave notes on any STAC plot, mark them resolved, reopen them, and track the full review lifecycle.

The interesting constraint: it has to work offline-first. No auth server, no notifications, no WebSockets. Just shared filesystem access with optimistic locking to prevent conflicts. Users discover pending reviews through visual badges and filter controls in the catalog browser.

This is the first collaborative workflow feature in the platform, and it touches everything from LinkML schemas to React components. Planning post covers the key decisions and open questions.

[Read the full planning post](https://debrief.github.io/blog/planning-review-feedback)

#FutureDebrief #MaritimeAnalysis #OpenSource
