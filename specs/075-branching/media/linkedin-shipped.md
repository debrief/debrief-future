Maritime analysts can now branch from any point in their plot's analytical history. Select an entry fifteen steps back, click "branch from here," and get an independent plot whose state matches that exact moment. Both plots stay linked so you can navigate between them and compare alternative approaches.

The interesting design decision was avoiding tool replay. For branches within the current session, the feature geometry already reflects all operations — we just deep-copy and trim the provenance arrays. Pre-snapshot branches work at snapshot boundaries for now; arbitrary mid-snapshot branching waits for the replay engine in Phase 6.

BranchService with dependency injection, write-then-link atomicity for safety, and two-way navigation between source and branches through the system record. 33 tests, zero regressions.

Phase 5 of the PROV Logging Implementation epic.

[Read the full post](https://debrief.github.io/future/shipped-branching-from-history/)

#FutureDebrief #MaritimeAnalysis #Provenance
