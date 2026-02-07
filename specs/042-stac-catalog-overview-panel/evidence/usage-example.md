# Usage Example: STAC Catalog Overview Panel

## Opening a Catalog Overview

1. **Add a STAC Store** — Click "Add Store" in the STAC Stores tree view and select a directory containing a STAC catalog.

2. **Double-click a catalog** — In the STAC Stores tree view, double-click any catalog node. This opens the Catalog Overview panel in the editor area.

3. **View the map** — The top region displays a Leaflet map with rectangle overlays for each item's bounding box. Items without `bbox` metadata are omitted from the map.

4. **View the timeline** — The bottom region shows an SVG timeline with horizontal bars for each item's temporal range. Items with only a single `datetime` show a point marker. Items without temporal metadata display "no time data".

5. **Resize the split** — Drag the horizontal bar between the map and timeline to adjust the split ratio. The ratio persists across sessions via VS Code workspace state.

6. **Navigate to an item** — Double-click any bounding box on the map or any bar on the timeline to open that item in the existing plot view (MapPanel).

## Component Architecture

```
CatalogOverview (shared/components/)
├── Map region (react-leaflet)
│   ├── TileLayer (OpenStreetMap)
│   ├── Rectangle per item bbox
│   ├── Tooltip on hover
│   └── FitBounds auto-zoom
├── Drag bar (pointer events)
└── Timeline region (SVG)
    ├── Label column (item titles)
    ├── Bar chart (temporal ranges)
    ├── Point markers (single datetimes)
    ├── "no time data" labels
    └── Time axis (min/max dates)
```

## VS Code Integration

- **Command**: `debrief.openCatalogOverview` registered in `package.json`
- **Tree view**: Catalog nodes have `item.command` for double-click
- **Context menu**: "Open Catalog Overview" available on catalog nodes
- **Panel**: `CatalogOverviewPanel` in `src/panels/` manages webview lifecycle
- **Webview entry**: `catalogOverview.tsx` bridges React component to VS Code messages
- **Build**: esbuild entry added to `compile:webview` script

## Data Flow

```
Tree View → double-click catalog
  → debrief.openCatalogOverview command
    → stacService.listItems() (with bbox + temporal metadata)
      → CatalogOverviewPanel.loadCatalog()
        → postMessage(loadCatalogOverview) → webview
          → <CatalogOverview items={...} />
            → User double-clicks item
              → postMessage(overviewItemSelected) → extension
                → debrief.openPlot → MapPanel
```
