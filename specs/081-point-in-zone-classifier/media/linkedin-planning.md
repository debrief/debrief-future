Step 4 of 5: classifying 600 reference points by detection zone using ray-casting geometry and zero external dependencies.

The point-in-zone classifier is the pivot step in the E03 buffer zone analysis chain for Debrief. It takes a grid of reference points and a set of concentric detection probability zones, tests each point against the polygons innermost-first, and writes zone membership and a colour back onto each point. Purple for 75% detection likelihood, red for 50%, orange for 25%, grey for outside everything.

Two decisions worth sharing. First: no Shapely, no turf.js. The ray-casting even-odd algorithm is around 20 lines in both Python and TypeScript, runs offline, and handles concave polygons correctly. The extra dependency isn't worth it. Second: colours come from the zone feature itself, not a hardcoded map. If zones get regenerated with different styling, the classifier picks it up automatically — no configuration drift.

This tool sits in the middle of a reactive PROV cascade. When a track moves, zones update, points reclassify, and the histogram at the end of the chain reflects new detection probability distribution. All deterministic, all offline.

Planning post with the full decision log: [link]

#maritimeanalysis #geospatial #defencetechnology
