## What We're Building

Right now, finding a specific plot in the STAC catalog browser means opening each one individually. If you have forty plots across a week-long exercise, that's a lot of clicking and waiting. We're adding thumbnail capture so every plot gets a persistent PNG snapshot — basemap tiles, track styling, labels, the works — stored as a STAC asset alongside the data.

Three pieces make this useful:

**Save-time capture.** When an analyst saves a plot, the Leaflet map view is captured as a PNG in two sizes: 800x600 for preview and 200x150 for list views. The capture is non-blocking — if it fails for any reason, the save still completes. Thumbnails are stored as standard STAC assets with a `"thumbnail"` role inside the item directory.

**Gallery preview pane.** A new panel in the catalog browser shows a large thumbnail of the selected plot. Arrow keys move through filtered results. Single-click highlights and previews; double-click opens the full plot. This aligns the interaction model across all our views.

**Raster thumbnails in list view.** The small PNGs replace the existing SVG spatial thumbnails in the exercise list. SVG bounding boxes are useful for structure, but a raster thumbnail with actual basemap context tells you far more at a glance.

We're also building a Playwright-based backfill script — a CLI tool that automates the web-shell to generate thumbnails for every existing plot in a catalog. No manual re-saving required.

## How It Fits

This is part of Epic E08 (STAC Browser Discovery UI), which is about making the catalog browser a place analysts actually want to start their work. The overview panel (#042) gave us spatial and temporal indexing. Thumbnails add visual indexing — the third dimension of discovery.

Thumbnails are stored as standard STAC assets, so they're portable. Any STAC-compatible tool can display them. Nothing about this is proprietary to our catalog browser.

## Key Decisions

**`modern-screenshot` over `leaflet-image`** — `leaflet-image` is unmaintained and struggles with tile layers. `modern-screenshot` handles the full DOM including canvas-rendered tiles, and it's actively maintained.

**Canvas downscaling in the webview, `sharp` for backfill** — for save-time capture, we downscale in the browser using canvas. For the batch backfill script running in Node.js, we use `sharp` for consistent, high-quality resizing. Two different contexts, two appropriate tools.

**GoldenLayout panel for preview** — the catalog browser already uses GoldenLayout for its panel arrangement. The thumbnail preview slots in as another panel that analysts can position, resize, or hide according to preference.

**Non-blocking capture** — thumbnail generation must never prevent a save from completing. If the capture fails (tile loading timeout, canvas security restrictions), the plot saves normally and the thumbnail can be generated later via backfill.
