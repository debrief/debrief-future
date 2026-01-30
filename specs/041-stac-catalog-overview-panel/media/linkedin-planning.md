# LinkedIn Summary — Planning: STAC Catalog Overview Panel

Large maritime analysis exercises can generate hundreds of plots across different locations and time windows. Finding the one you need becomes a navigation problem.

We're adding a catalog overview panel to Future Debrief's VS Code extension. It shows every item in a STAC catalog on a single view: bounding boxes on a map, temporal extents on a timeline. Double-click any item to open the full plot view.

The implementation stays lightweight — extension host reads just the item.json metadata (bbox, datetime, title), not the full GeoJSON payloads. Rendering uses vanilla JS, Leaflet for maps, and hand-rolled SVG for the timeline. No new dependencies, no framework bloat.

This builds on the plot view webview we've already shipped, extending the same interaction patterns to multi-item navigation.

Open questions: should temporal extents overlap or auto-stack? Should single-click highlight across both map and timeline? Feedback welcome.

Read the full planning post: [link]

#FutureDebrief #MaritimeAnalysis #OpenSource
