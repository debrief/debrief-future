What if the map itself were the query interface?

For Future Debrief's Discovery UI, we are adding live spatial filtering to the exercise map. Pan into the North Atlantic and the exercise list narrows to show only what happened there. Zoom out and they reappear. No query syntax, no filter panel — just navigate.

The spatial intersection is an AABB overlap test: four comparisons per item, sub-millisecond for 200 exercises, zero new dependencies. Viewport changes are debounced at 150ms and flow through the existing Zustand session-state store so the list and timeline stay in sync.

The interesting design tension: exercises without bounding boxes. They cannot appear on the map, but should they disappear from the list when a spatial filter is active? We are leaning toward keeping them visible with a marker, but genuinely want input on this.

Read the full planning post: [link]

#FutureDebrief #MaritimeAnalysis #OpenSource
