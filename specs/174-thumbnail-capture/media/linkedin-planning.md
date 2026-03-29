Finding a specific plot in a catalog of forty exercises shouldn't require opening each one.

We're adding thumbnail capture to Future Debrief's STAC catalog browser. When an analyst saves a plot, the map view — basemap tiles, track styling, labels — gets captured as a PNG and stored as a standard STAC asset. A new gallery pane lets you arrow through filtered results visually, and raster thumbnails replace the old SVG bounding boxes in list views.

The interesting technical constraint: capture has to be non-blocking. If tile loading times out or canvas security intervenes, the save still completes normally. Thumbnails can always be backfilled later via a Playwright-based CLI tool that automates the web-shell.

This is part of the broader STAC Browser Discovery UI work — giving analysts spatial, temporal, and now visual indexing into their catalogs.

[Read more on the Future Debrief blog →](https://debrief.github.io/debrief-future/blog/)

#FutureDebrief #MaritimeAnalysis #STAC
