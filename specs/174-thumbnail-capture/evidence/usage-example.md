# Usage Example: Thumbnail Capture and Gallery Preview

## Save Flow — Automatic Thumbnail Capture

When an analyst saves a plot session, thumbnails are automatically captured:

1. **Analyst opens a plot** in the VS Code extension
2. **Makes changes** (adds tracks, modifies styling, adjusts viewport)
3. **Saves the session** (Ctrl+S or command palette)
4. **Behind the scenes**: The extension sends a `requestThumbnailCapture` message to the webview
5. **Webview captures** the Leaflet map as an 800x600 PNG using `modern-screenshot`
6. **Webview downscales** to 200x150 using offscreen canvas
7. **Both PNGs sent back** as base64 to the extension host
8. **Extension writes** `thumbnail.png` and `thumbnail-sm.png` to the STAC item directory
9. **item.json updated** with thumbnail asset entries (roles: ["thumbnail"])

If capture fails (e.g., tiles not loaded), the save succeeds anyway — a warning is logged.

### STAC Item After Save

```json
{
  "assets": {
    "data": { "href": "./exercise-alpha.geojson" },
    "thumbnail": {
      "href": "./thumbnail.png",
      "type": "image/png",
      "title": "Plot thumbnail",
      "roles": ["thumbnail"]
    },
    "thumbnail-sm": {
      "href": "./thumbnail-sm.png",
      "type": "image/png",
      "title": "Plot thumbnail (small)",
      "roles": ["thumbnail"]
    }
  }
}
```

## Gallery Preview — Catalog Browsing

The catalog browser now includes a gallery preview pane:

1. **Open catalog** — The StacBrowser shows the exercise list, map, timeline, and a new Preview panel
2. **Single-click** a plot item — The row highlights and the Preview panel shows the large thumbnail
3. **Arrow keys** (← →) — Navigate through the filtered plot list
4. **Double-click** — Opens the plot in the analysis view
5. **No thumbnail?** — Fallback shows "No preview available" SVG placeholder

### List View Thumbnails

The exercise list also shows small raster thumbnails:
- Items with `thumbnailSmHref` display the PNG inline
- Items without fall back to the existing SVG spatial thumbnail
- Broken images (missing file) gracefully fall back to SVG

## Batch Backfill — Generating Thumbnails for Existing Plots

For plots created before this feature:

```bash
# Start the web-shell dev server
pnpm --filter @debrief/web-shell dev

# In another terminal, run the backfill script
pnpm --filter @debrief/web-shell generate-thumbnails
```

The script:
1. Reads `catalog.json` to find all plots
2. Opens each plot in a headless Playwright browser
3. Fits the map to visible features
4. Waits for basemap tiles to load
5. Captures a screenshot and resizes with `sharp`
6. Writes `thumbnail.png` + `thumbnail-sm.png` + updates `item.json`
7. Continues on failure (logs warning, moves to next plot)

## Python API

For programmatic thumbnail storage:

```python
from debrief_stac.thumbnails import store_thumbnail

item = store_thumbnail(
    catalog_path="/path/to/catalog",
    plot_id="exercise-alpha",
    large_png=large_bytes,  # 800x600 PNG
    small_png=small_bytes,  # 200x150 PNG
)
# Returns updated STAC item dict
```
