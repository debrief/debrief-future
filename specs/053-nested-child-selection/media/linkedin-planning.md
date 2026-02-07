When an analyst clicks a track in Debrief, the system selects the whole track. There's no way to say "I mean this specific position" -- the one where the vessel changed course at 14:32. Properties panels show track summaries. Tools operate on entire features. Position-level questions require eyeballing.

We're extending the selection model to hold path strings that target child elements at any depth: `track-hms-defender/positions/4`. A position within a segment within a track works too. The paths go into the existing `featureIds` array -- a single-segment path is identical to a flat feature ID, so nothing breaks. No schema change needed.

The core implementation is about 20 lines of pure TypeScript path utilities. No new dependencies. A shared level registry in the schema tells consumers whether each nesting level uses IDs or numeric indices. This unblocks position-level properties panels, position-specific tools, and temporal analysis.

[Read the full planning post](https://debrief.github.io/future/2026/02/07/planning-nested-child-selection.html)

#FutureDebrief #MaritimeAnalysis #OpenSource
