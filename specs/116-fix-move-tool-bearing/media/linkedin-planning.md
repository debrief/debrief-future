When you replay a "move shape" operation with a different bearing, should the shape orbit its original position or its current one? We got that wrong.

Our replay engine lets analysts tune parameters after execution — change a bearing, adjust a distance, watch the map update. But for tools that modify coordinates, each replay compounded on top of the previous result instead of going back to the starting point. Change the bearing three times and the shape drifts further from where it should be.

The fix is straightforward in concept: store the feature's pre-operation geometry in the provenance log entry at execution time. When replaying, restore from that snapshot before applying new parameters. The interesting part was where to capture it. We put it in the Python executor — one location that covers every coordinate-mutating tool automatically, current and future. Individual tools don't need to know about it.

This also closes a gap between our TypeScript implementation (which already had this working) and the canonical LinkML schema (which didn't know the field existed). Schema-first means the schema has to come first, even when the code got there earlier.

[Read more](https://debrief.github.io/future/planning-prov-input-snapshot/)

#FutureDebrief #MaritimeAnalysis #OpenSource
