What does an analyst actually need to see in a list of 100 exercises to pick the right one without opening any of them?

For Future Debrief's STAC Browser, we are building an exercise list where each row includes a spatial thumbnail -- a miniature SVG of the exercise's track patterns, rendered client-side from GeoJSON geometry. No pre-generated images, no server dependency. The thumbnails adapt to whichever VS Code theme is active, so tracks stay legible in light and dark modes.

The list also surfaces recently opened exercises at the top (about 70% of sessions start by reopening prior work), supports three-axis sorting, and uses virtualised scrolling to stay responsive at 100+ items. Data comes from the STAC extension properties defined in #125, filtered by the CQL2 engine from #126.

Read the full planning post: [BLOG_LINK]

#FutureDebrief #MaritimeAnalysis #OpenSource
