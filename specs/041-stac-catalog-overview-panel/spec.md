# Spec 041: Add STAC Catalog Overview Panel with Map and Timeline

**Status**: specified
**Backlog Item**: 041 (Feature)
**Complexity**: High (Opus)

## Problem

Users have no way to get a spatial or temporal overview of what's stored in a STAC catalog. To understand what data exists, they must open individual items one at a time from the STAC Stores tree view. There is no summary view showing all items in a collection on a map or timeline.

## Goal

Double-clicking a STAC catalog node in the VS Code explorer (STAC Stores tree view) opens a read-only editor panel displaying:

1. A **map** showing the spatial bounds/footprint of every item in that catalog
2. A **timeline** showing the temporal range of every item
3. A **resizable split** between map and timeline via a horizontal drag bar
4. **Item navigation** — double-clicking an item on the map or timeline opens that asset in the existing plot view

## Prerequisites

STAC `item.json` files must contain temporal and spatial metadata:

- `properties.start_datetime` and `properties.end_datetime` — written when assets are saved to the STAC store
- `bbox` — bounding box `[west, south, east, north]` at the item level

If items are missing these fields, they are rendered on the timeline/map with a "no data" indicator and remain clickable for navigation.

## Design

### Panel Type: Custom Editor

Use `vscode.CustomReadonlyEditorProvider` to register a virtual document editor for STAC catalogs. This allows the panel to appear in the editor area (not the sidebar) and supports the "double-click to open" UX.

Register a custom editor for a virtual URI scheme (e.g., `debrief-catalog:`):

```typescript
export class CatalogOverviewProvider implements vscode.CustomReadonlyEditorProvider {
  public static readonly viewType = 'debrief.catalogOverview';

  resolveCustomEditor(
    document: vscode.CustomDocument,
    webviewPanel: vscode.WebviewPanel,
  ): void {
    // Set up webview HTML, message handling
  }
}
```

**Alternative considered**: `WebviewPanel` (like MapPanel). Rejected because CustomEditor integrates better with VS Code's editor lifecycle — tabs, split views, and the "reopen closed editor" flow all work automatically.

**Alternative considered**: `WebviewViewProvider` (like TimeRangeView). Rejected because the overview is document-scoped content, not a global sidebar panel.

### Opening the Panel

When the user double-clicks a catalog node in the STAC Stores tree view (`stacTreeProvider.ts`), the extension:

1. Constructs a virtual URI: `debrief-catalog://<store-path>/<catalog-id>`
2. Calls `vscode.commands.executeCommand('vscode.openWith', uri, 'debrief.catalogOverview')`
3. The custom editor provider resolves the document and populates the webview

### Webview Layout

The webview contains two regions in a vertical split:

```
┌──────────────────────────────┐
│                              │
│         MAP (Leaflet)        │
│    Bounding boxes / points   │
│                              │
├══════════ drag bar ══════════┤
│                              │
│        TIMELINE (SVG)        │
│    Horizontal time bars      │
│                              │
└──────────────────────────────┘
```

**Map region** (top): Leaflet map showing a rectangle or polygon for each item's `bbox`. Items without `bbox` are omitted from the map. The map auto-fits to the combined extent of all items.

**Timeline region** (bottom): SVG-based horizontal bar chart. Each item is a row with a bar spanning `start_datetime` to `end_datetime`. Items without temporal metadata show a point marker at `datetime` if available, or are listed with a "no time data" label.

**Drag bar**: A `<div>` between the regions that supports pointer drag to resize. Persists the split ratio to `vscode.Memento` (workspace state).

### Message Protocol

New message types for the overview panel, separate from the existing map panel messages:

```typescript
// Extension → Webview
interface CatalogOverviewLoadMessage {
  type: 'loadCatalogOverview';
  catalog: {
    id: string;
    title: string;
    storePath: string;
    items: CatalogOverviewItem[];
  };
}

interface CatalogOverviewItem {
  id: string;
  title: string;
  itemPath: string; // relative path to item.json
  bbox: [number, number, number, number] | null;
  startDatetime: string | null; // ISO 8601
  endDatetime: string | null;
  datetime: string | null; // fallback single datetime
}

// Webview → Extension
interface OverviewItemSelectedMessage {
  type: 'overviewItemSelected';
  itemPath: string;
}

interface OverviewWebviewReadyMessage {
  type: 'overviewWebviewReady';
}
```

### Item Navigation

When the user double-clicks an item rectangle on the map or a bar on the timeline:

1. Webview posts `overviewItemSelected` with the `itemPath`
2. Extension host receives the message and calls the existing "open plot" logic (same as double-clicking in the STAC tree view)
3. The plot opens in a new MapPanel tab alongside the overview

### Data Loading

The `StacService` already has `listItems()` which returns `StacItemSummary[]`. Extend this to also read `bbox`, `start_datetime`, `end_datetime`, and `datetime` from each `item.json`:

```typescript
interface StacItemSummary {
  // existing fields
  id: string;
  title: string;
  datetime: string;
  itemPath: string;
  // new fields
  bbox?: [number, number, number, number];
  startDatetime?: string;
  endDatetime?: string;
}
```

This avoids loading full GeoJSON assets — only the lightweight `item.json` metadata is read.

### Styling

- Use VS Code theme variables (`--vscode-editor-background`, `--vscode-foreground`, etc.) for all colors
- Map tile layer: use a neutral/dark tile set that works with both light and dark themes, or use a simple vector outline map
- Timeline bars: use `--vscode-charts-*` color variables for item bars
- Hover state on items: highlight border, show tooltip with item title and time range
- Selected item: distinct border color using `--vscode-focusBorder`

## Data Flow

```
STAC Stores Tree View
  └─ double-click catalog node
       → command: openCatalogOverview(catalogId, storePath)
           → construct debrief-catalog:// URI
           → vscode.openWith(uri, 'debrief.catalogOverview')
               → CatalogOverviewProvider.resolveCustomEditor()
                   → stacService.listItems(store, catalog)
                   → post loadCatalogOverview message to webview
                       → webview renders map + timeline

Webview (user double-clicks item)
  └─ post overviewItemSelected { itemPath }
       → extension host receives
           → open item in MapPanel (existing flow)
```

## Files to Create

| File | Purpose |
|------|---------|
| `apps/vscode/src/editors/catalogOverviewProvider.ts` | CustomReadonlyEditorProvider implementation |
| `apps/vscode/src/editors/catalogOverviewMessages.ts` | Message types for the overview panel |
| `apps/vscode/src/webview/web/catalogOverview.ts` | Webview entry point (Leaflet map + SVG timeline) |
| `apps/vscode/src/webview/web/catalogOverview.css` | Styles for the overview panel |

## Files to Modify

| File | Change |
|------|--------|
| `apps/vscode/src/extension.ts` | Register `CatalogOverviewProvider`, register open command |
| `apps/vscode/src/services/stacService.ts` | Extend `listItems()` / `StacItemSummary` with bbox and temporal fields |
| `apps/vscode/src/providers/stacTreeProvider.ts` | Add double-click command to catalog nodes |
| `apps/vscode/src/types/stac.ts` | Add `bbox`, `startDatetime`, `endDatetime` to `StacItemSummary` |
| `apps/vscode/package.json` | Register `customEditors` contribution point |

## Acceptance Criteria

1. Double-clicking a STAC catalog in the tree view opens the overview panel in the editor area
2. Map displays bounding box rectangles for all items that have `bbox` metadata
3. Map auto-fits to show all item extents
4. Timeline displays horizontal bars for all items with temporal metadata
5. Drag bar between map and timeline resizes both regions; ratio persists across sessions
6. Double-clicking an item on the map or timeline opens it in the existing plot view
7. Panel works offline (local STAC catalog only, no network tile fetching required)
8. Panel is read-only — no create/edit/delete operations
9. Styling adapts to VS Code light and dark themes
10. Items missing bbox or temporal metadata are handled gracefully (omitted from the relevant view, not errors)

## Testing Strategy

1. **Unit tests** for `StacItemSummary` metadata extraction — verify bbox, start/end datetime parsing from item.json
2. **Unit tests** for the overview provider — verify correct URI construction and message posting
3. **Manual verification** — load a STAC store with multiple items, verify map shows extents, timeline shows ranges, navigation works
4. **Edge cases** — empty catalog, single item, items without bbox, items without temporal metadata

## Out of Scope

- Editing or deleting items from the overview panel
- Remote/cloud STAC catalog support
- Filtering or search within the overview
- Synchronizing the overview panel viewport with the plot MapPanel
- React-based implementation (vanilla JS + Leaflet + SVG, consistent with existing map webview)
