# Research: Thumbnail Capture and Gallery Preview

**Feature**: 174-thumbnail-capture
**Date**: 2026-03-29

## Decision 1: Map Capture Library

**Decision**: Use `modern-screenshot` (v4.6.8) instead of `leaflet-image` for in-app map capture.

**Rationale**:
- `leaflet-image` (v0.4.0) is unmaintained — last published 9 years ago (2015). It is already a dependency in `apps/vscode/package.json` but has never been properly integrated.
- `modern-screenshot` is actively maintained (last update 2 months ago), has 575K weekly downloads, and provides `domToPng()` which captures the entire map container DOM element including tile layers and overlays.
- Both approaches require `crossOrigin: 'anonymous'` on tile layers. OSM tiles support CORS headers, so this is viable.
- `modern-screenshot` offers context reuse (`createContext()`/`destroyContext()`) for better performance on repeated captures.

**Alternatives Considered**:
- `leaflet-image` (0.4.0): Unmaintained, Leaflet-specific. Would work but no bug fixes or support.
- `dom-to-image-more` (3.7.2): Actively maintained fork, moderate adoption. Less popular than modern-screenshot.
- `html-to-image` (1.11.13): Stable but less active. Good alternative if modern-screenshot has issues.
- `html2canvas`: Heavy dependency, known cross-origin tile issues. Not recommended.
- Playwright `page.screenshot()`: Perfect fidelity but only works in browser context (not VS Code webview). Used for the backfill script path only.

## Decision 2: Thumbnail Storage Location

**Decision**: Store thumbnails in the STAC item directory root as `./thumbnail.png` (large) and `./thumbnail-sm.png` (small).

**Rationale**:
- STAC spec defines a standard `"thumbnail"` role for assets. Storing in the item directory follows convention.
- Not in `./results/` (those are analysis outputs with provenance) or `./assets/` (those are source files). Thumbnails are display artifacts.
- The existing `store_artifact()` enforces `./results/` prefix. A new `store_thumbnail()` function avoids that constraint.

**Alternatives Considered**:
- Central thumbnails directory (e.g., `catalog/thumbnails/`): Breaks STAC item self-containment.
- Inside `./results/`: Semantically wrong — thumbnails aren't analysis results.
- Inside `./assets/`: Semantically wrong — thumbnails aren't source files.

## Decision 3: Image Downscaling Strategy

**Decision**: Use offscreen `<canvas>` in the webview/browser for downscaling (Save-time capture). Use `sharp` in Node.js for the Playwright backfill script.

**Rationale**:
- The webview already has canvas support. No additional dependency needed for in-app downscaling.
- The backfill script runs in Node.js where `sharp` is the standard choice for image processing. It's already commonly used in the ecosystem and handles PNG resize efficiently.
- Two different resize paths (canvas vs sharp) is acceptable because both produce standard PNGs. Minor pixel-level differences between resize algorithms don't matter for thumbnails.

**Alternatives Considered**:
- `sharp` everywhere: Would require a Node.js dependency in the webview, which is not available.
- Canvas everywhere: Would require a canvas polyfill in Node.js (e.g., `node-canvas`), which is heavier than `sharp`.

## Decision 4: Single-Click vs Double-Click in ExerciseListView

**Decision**: Change ExerciseListView single-click to highlight/preview, add double-click to open the plot.

**Rationale**:
- Currently, ExerciseListView uses single-click for `onItemSelect` which opens the plot. The Timeline and Map panels already use double-click for opening plots.
- The preview pane needs single-click to select an item for preview without opening it.
- This aligns all three views: single-click = highlight, double-click = open.
- The ExerciseListItemRow component currently has only `onClick`. Adding `onDoubleClick` and splitting the callbacks is a small change.

**Alternatives Considered**:
- Keep single-click to open, use hover for preview: Hover-based preview is less intentional and problematic on touch devices.
- Add a separate "preview" button per row: Adds UI clutter to a compact list.

## Decision 5: Preview Pane Integration in GoldenLayout

**Decision**: Add ThumbnailPreview as a fourth GoldenLayout panel in the StacBrowser, on the right side of the top row alongside the exercise list.

**Rationale**:
- The existing GoldenLayout has three panels: list (top, full width), timeline (bottom-left), map (bottom-right).
- Adding the preview as a fourth panel in a `row` with the list (top half) gives a natural split: list on left, preview on right.
- GoldenLayout handles resize, drag, and collapse natively. Users can hide the preview panel if they don't want it.
- The panel registration pattern is straightforward: define a constant, add to layout config, add a render case.

**Layout change**:
```
Before:                          After:
┌──────────────────────┐        ┌───────────┬────────────┐
│     Exercise List     │        │  Exercise  │  Thumbnail │
│                      │        │   List     │  Preview   │
├──────────┬───────────┤        ├─────┬──────┴────────────┤
│ Timeline │    Map    │        │Timeline│      Map        │
└──────────┴───────────┘        └────────┴────────────────┘
```

**Alternatives Considered**:
- Overlay/modal: Obscures the list, breaks the browse flow.
- Replace the map panel: Loses spatial context during browsing.
- Tab alongside the list: Hidden by default, less discoverable.

## Decision 6: Cross-Origin Tile Configuration

**Decision**: Add `crossOrigin: 'anonymous'` attribute to all TileLayer components across the codebase.

**Rationale**:
- Canvas-based capture (via `modern-screenshot` or native `toDataURL()`) requires that all images drawn to canvas are CORS-enabled. Without `crossOrigin: 'anonymous'`, the canvas becomes "tainted" and `toDataURL()` throws a SecurityError.
- OpenStreetMap tile servers support CORS headers, so setting this attribute is safe.
- This must be set on all TileLayer instances: MapView component, StacBrowser map, and web-shell.

**Risk**: If a custom tile provider doesn't support CORS, capture will fail gracefully (non-blocking save, warning logged).

## Decision 7: Backfill Script Architecture

**Decision**: Standalone TypeScript script using Playwright's library API (not test runner), with `sharp` for image resize.

**Rationale**:
- Using Playwright's library API (`chromium.launch()`) rather than the test runner (`@playwright/test`) gives direct control over the browser lifecycle. The script is a tool, not a test.
- The existing Playwright POM classes (`CatalogPage`, `AnalysisPage`) can be imported directly for navigation.
- `sharp` handles the PNG resize in Node.js without canvas emulation overhead.
- The script writes directly to the STAC item directories and updates `item.json`, bypassing the Python service. This is acceptable for a developer tool — the file format is simple JSON + PNG.

**Alternatives Considered**:
- Python-based backfill using Playwright for Python: Would keep all STAC operations in Python, but the web-shell is a TypeScript/React app and the POMs are in TypeScript.
- Calling the Python `store_thumbnail()` function from the TypeScript script: Adds IPC complexity for minimal benefit. Direct file writes are simpler for a dev tool.
