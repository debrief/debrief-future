Rethinking how plots live in storage. Right now we keep everything flat — all the JSON files and data together in one directory. We're about to move to per-item folders, so each plot gets its own home with space for the original source files alongside the derived data.

Why? Because part of being useful is being traceable. When you hand a plot to someone else, they should be able to see where it came from. The Constitution calls this provenance. The new structure makes it obvious where to put source files, reference data, and analysis artifacts. It's internal infrastructure work, but it's what makes sharing real.

We're doing this the simple way: a Python migration function that detects old-style stores and reorganizes them without breaking anything. Optional upgrade path for anyone with existing data. No new dependencies, no complexity.

Details in the full planning post.

→ [Read more](https://debrief-future.github.io/posts/040-stac-store-organization/)

#FutureDebrief #MaritimeAnalysis #SourceControl
