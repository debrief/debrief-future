# LinkedIn Shipped Summary

---

Deleted 213 lines of code this week, and the tests got greener.

The Debrief feature pipeline used to split data into three arrays on the way out of the service — tracks, locations, everything else — then immediately reassemble them on the way in to every component. The split existed because the service was making classification decisions that belonged at the render boundary.

Now `stacService.loadPlotData()` returns a single `DebriefFeatureCollection`. Components classify features themselves using type guards at the point where the distinction matters. Three setter methods became one. Two transform functions that were mapping near-identical types — field by field, 10-15 lines each — are gone.

938 tests pass. Adding a new feature kind no longer touches the service, the view providers, or the message protocol.

The full post covers what surprised me about the test changes, why `AnnotationFeature` was the one addition in a week of deletions, and what this enables next.

[Read the full shipped post ->](https://debrief.github.io/2026/02/24/shipped-unifying-feature-pipeline)

#FutureDebrief #MaritimeAnalysis #OpenSource
