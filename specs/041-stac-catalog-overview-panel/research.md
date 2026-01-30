# Research: 041 STAC Catalog Overview Panel

## R1: CustomReadonlyEditorProvider vs WebviewPanel

**Decision**: Use `WebviewPanel` (like MapPanel), not `CustomReadonlyEditorProvider`.

**Rationale**: The spec proposed CustomReadonlyEditorProvider, but research shows this requires a real `CustomDocument` backed by a file URI. STAC catalogs are directories, not files — there's no single file to associate as the document. The existing MapPanel pattern (`vscode.window.createWebviewPanel()`) is proven in this codebase, supports `retainContextWhenHidden`, and integrates with the editor area without needing a file-backed document.

**Alternatives considered**:
- `CustomReadonlyEditorProvider` — requires file URI as document; catalog.json could be used but feels forced. Would require registering a `customEditors` contribution for `*.json` files with a filename pattern, which risks conflicts.
- `WebviewViewProvider` (sidebar) — too constrained for a map+timeline overview that needs full editor area space.

## R2: Webview Framework (Vanilla JS vs React)

**Decision**: Vanilla JS + Leaflet + SVG, matching the existing map webview pattern.

**Rationale**: The map webview (`map.ts`) is vanilla JS with Leaflet. Using the same approach ensures consistency, avoids adding React to another webview bundle, and keeps bundle size small. The timeline is a simple horizontal bar chart — SVG is sufficient without a framework.

**Alternatives considered**:
- React (like TimeController) — adds ~40KB to bundle, unnecessary for this UI
- D3.js for timeline — overkill for simple horizontal bars; adds dependency

## R3: Opening the Overview Panel

**Decision**: Add a command `debrief.openCatalogOverview` triggered from the STAC tree view context menu and double-click.

**Rationale**: The STAC tree provider (`stacTreeProvider.ts`) already supports commands on tree items. Adding a new command that creates a `WebviewPanel` follows the same pattern as `debrief.openPlot`. The panel title will be the catalog name.

**Implementation**: Register a `TreeItem` command for catalog nodes that calls `debrief.openCatalogOverview` with the store path and catalog ID as arguments.

## R4: Leaflet Tile Layer for Offline Use

**Decision**: Use the existing OpenStreetMap tile layer (same as map webview), with a fallback note.

**Rationale**: Constitution Article I requires offline capability for *core* functionality. The overview panel is a convenience/browsing feature, not core analysis. The existing map webview already uses online OSM tiles. Adding offline tile support is out of scope — the bounding box rectangles will render even without tiles (on a blank/grey background).

**Alternatives considered**:
- Bundled offline tiles — too large (hundreds of MB)
- No base map — functional but disorienting; bbox rectangles need geographic context

## R5: STAC Item Metadata Extraction

**Decision**: Extend `StacItemSummary` interface with `bbox`, `startDatetime`, `endDatetime` fields parsed from `item.json`.

**Rationale**: STAC 1.0.0 items already have `bbox` at the top level and `properties.datetime`, `properties.start_datetime`, `properties.end_datetime`. The `listItems()` method in `stacService.ts` already reads item.json files — extending it to extract these additional fields is minimal work.

## R6: SVG Timeline Implementation

**Decision**: Hand-coded SVG with vanilla JS. Each item gets a horizontal bar positioned by datetime.

**Rationale**: The timeline is a simple visualization: N items as horizontal bars on a time axis. No interactions beyond hover (tooltip) and double-click (navigate). SVG gives pixel-perfect control without additional dependencies.

**Layout**:
- X axis: time (auto-scaled to min/max across all items)
- Y axis: one row per item (sorted by start time)
- Bar width: proportional to duration
- Point items (single datetime): rendered as a circle marker
- Scrollable if items exceed viewport height

## R7: Drag Bar for Resizable Split

**Decision**: CSS flexbox with a `<div>` drag handle that adjusts `flex-basis` via pointer events.

**Rationale**: Standard pattern for resizable splits in webviews. No library needed — ~30 lines of JS for pointer down/move/up. Persist ratio to `localStorage` in the webview (simpler than round-tripping to extension host's Memento).

## R8: esbuild Bundle Configuration

**Decision**: Add a new esbuild entry point for `catalogOverview.ts`, producing `dist/webview/catalogOverview.js` in IIFE format.

**Rationale**: Follows the existing pattern: `map.ts` → `map.js`, `timeController.tsx` → `timeController.js`. Add one more esbuild invocation to the `compile:webview` script.
