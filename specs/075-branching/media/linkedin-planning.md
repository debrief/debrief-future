Fifteen steps into a maritime analysis, you realise you want to try a different approach -- but only from step eight onward. What do you do?

We're building branching for Debrief's provenance system. An analyst selects any entry in their analysis log, clicks "branch from here," and gets a new independent plot whose state matches that exact moment in history. Both plots stay linked so you can navigate between them and compare results.

The interesting design constraint: for branches within the current session, we don't need to replay any tools. The feature geometry already reflects all operations -- we just deep-copy and trim the provenance arrays. Pre-snapshot branches work at snapshot boundaries for now; arbitrary mid-snapshot branching waits for the replay engine in Phase 6.

This is Phase 5 of 7 in the PROV logging implementation, building directly on the snapshot checkpoint infrastructure.

[Read the full planning post](https://debrief.github.io/future/planning-branching-from-history/)

#FutureDebrief #MaritimeAnalysis #Provenance
