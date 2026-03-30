---
platform: linkedin
type: shipped
feature: 174-thumbnail-capture
date: 2026-03-30
---

Scrolling through a list of plot names is a slow way to find the analysis you're looking for. That's now fixed.

Future Debrief's STAC catalog browser has a new gallery preview pane. Save a plot and a PNG thumbnail is captured automatically — map tiles, track styling, labels and all — stored as a standard STAC asset alongside the GeoJSON. Analysts can arrow-key through filtered results visually rather than hunting by name.

A few things that made this interesting to build:

Capture is non-blocking. If tile loading times out or the canvas is restricted, the save completes normally and the thumbnail can be backfilled later via a Playwright CLI tool that automates the web-shell. The fallback chain bottoms out at SVG bounding boxes, so there's always something to display.

Thumbnails follow STAC conventions rather than inventing a new scheme — `thumbnail` role in the assets object, with a `proj:shape` field for dimensions. Any other STAC-aware tool can read them without knowing anything about Future Debrief.

The backfill path uses `modern-screenshot` for DOM capture, `sharp` for resizing, and Playwright for automation. 37 unit tests cover capture, storage, fallback behaviour, and the gallery component.

[Read more on the Future Debrief blog →](https://debrief.github.io/debrief-future/blog/)

#FutureDebrief #MaritimeAnalysis #STAC
