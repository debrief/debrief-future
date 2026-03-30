# Quickstart: Thumbnail Capture and Gallery Preview

**Feature**: 174-thumbnail-capture

## What This Feature Does

Adds persistent thumbnail images to STAC catalog plots. When an analyst saves a plot, the current map view (including basemap tiles and track overlays) is captured as a PNG screenshot and stored alongside the plot data. The catalog browser gets a gallery preview pane for quick visual scanning.

## Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `store_thumbnail()` | `services/stac/src/debrief_stac/thumbnails.py` | Write thumbnail PNGs and update STAC item metadata |
| `captureMap.ts` | `shared/components/src/MapView/captureMap.ts` | Capture Leaflet map as PNG data URL |
| `resizeImage.ts` | `shared/components/src/MapView/resizeImage.ts` | Downscale image via offscreen canvas |
| `ThumbnailPreview` | `shared/components/src/StacBrowser/ThumbnailPreview.tsx` | Gallery preview panel with prev/next navigation |
| `generate-thumbnails.ts` | `apps/web-shell/scripts/generate-thumbnails.ts` | Playwright backfill script for all existing plots |

## How to Test

### Unit Tests

```bash
# Python thumbnail storage
uv run pytest services/stac/tests/test_thumbnails.py

# TypeScript component tests
pnpm --filter @debrief/components test
```

### Backfill Script

```bash
# Generate thumbnails for all plots in the web-shell catalog
pnpm --filter @debrief/web-shell generate-thumbnails
```

### Manual Verification

1. Open a plot in VS Code or web-shell
2. Save the plot (Ctrl+S or Save command)
3. Check the STAC item directory for `thumbnail.png` (800x600) and `thumbnail-sm.png` (200x150)
4. Open the catalog browser — the saved plot should show a raster thumbnail
5. Click a plot in the list — the preview pane should show the large thumbnail
6. Use arrow keys or prev/next buttons to navigate through plots

## Dependencies Added

| Package | Where | Purpose |
|---------|-------|---------|
| `modern-screenshot` | `shared/components` | Capture Leaflet map DOM as PNG |
| `sharp` (devDependency) | `apps/web-shell` | Image resize in backfill script |

## Configuration Required

Tile layers must have `crossOrigin: 'anonymous'` for canvas-based capture to work. This is set on all `TileLayer` components.
