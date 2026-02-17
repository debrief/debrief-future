Shipped the point-in-zone classifier for Debrief — 22 tests passing, zero external dependencies.

The tool classifies a grid of reference coordinates against concentric detection probability zones. Each point gets tested against the innermost zone first; first match wins. Purple for 75% likelihood, red for 50%, orange for 25%, grey for outside. The output is a flat `pointColors` array parallel to the coordinates — the renderer draws each point without any additional lookup.

The whole point-in-polygon algorithm is around 20 lines in both Python and TypeScript. No Shapely, no turf.js. Ray-casting from stdlib handles the geometry correctly for the convex-hull zone shapes this project produces, and it runs entirely offline.

One thing I didn't expect: hand-placing polygon vertices and assuming a point is "inside the middle zone" is not the same as the algorithm agreeing with you. I had to verify the golden test fixtures against actual ray-casting output rather than geometric intuition. Always run it first.

This is step 4 of 5 in the E03 buffer zone analysis chain. One tool left — the zone histogram — before the full reactive cascade can run end-to-end.

Full post: [link]

#maritimeanalysis #geospatial #defencetechnology
