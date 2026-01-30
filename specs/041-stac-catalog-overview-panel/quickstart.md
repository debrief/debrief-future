# Quickstart: 041 STAC Catalog Overview Panel

## Implementation Order

### Step 1: Extend StacItemSummary

**Files**: `apps/vscode/src/types/stac.ts`, `apps/vscode/src/services/stacService.ts`

Add `bbox`, `startDatetime`, `endDatetime` fields to `StacItemSummary`. In `stacService.ts`, extract these from `item.json` during `listItems()`.

**Test**: Unit test that `listItems()` returns correct bbox and temporal fields from a fixture item.json.

### Step 2: Create the webview entry point

**Files**: `apps/vscode/src/webview/web/catalogOverview.ts`, `catalogOverview.css`

Vanilla JS + Leaflet + SVG:
- Initialize a Leaflet map in the top region
- Draw an SVG timeline in the bottom region
- Add drag bar between them (pointer events → flex-basis adjustment)
- Listen for `loadCatalogOverview` messages
- On item double-click, post `overviewItemSelected` message

**Build**: Add esbuild entry to `compile:webview` in `package.json`:
```
esbuild src/webview/web/catalogOverview.ts --bundle --outfile=dist/webview/catalogOverview.js --format=iife
```

### Step 3: Create the panel class

**File**: `apps/vscode/src/panels/catalogOverviewPanel.ts`

Follow `mapPanel.ts` pattern:
- Static `createOrShow()` method
- `getHtmlForWebview()` returning HTML with Leaflet CSS + bundled JS
- Message handling for `overviewItemSelected` → trigger existing plot open logic
- Post `loadCatalogOverview` when webview reports ready

### Step 4: Register command and wire up tree view

**Files**: `apps/vscode/src/extension.ts`, `apps/vscode/src/providers/stacTreeProvider.ts`, `apps/vscode/package.json`

- Register `debrief.openCatalogOverview` command in `extension.ts`
- Add command to catalog tree items in `stacTreeProvider.ts`
- Add command contribution to `package.json`

### Step 5: Manual verification

- Open a STAC store with multiple items
- Double-click a catalog node → overview panel opens
- Verify map shows bounding boxes, timeline shows time bars
- Double-click an item → opens in plot view
- Resize the drag bar → ratio persists on reopen
- Test with items missing bbox/temporal metadata

## Key Patterns to Follow

| Pattern | Reference File | Line |
|---------|---------------|------|
| WebviewPanel lifecycle | `apps/vscode/src/webview/mapPanel.ts` | Class definition |
| HTML generation with CSP | `apps/vscode/src/webview/mapPanel.ts` | `getHtmlForWebview()` |
| Leaflet CSS from node_modules | `apps/vscode/src/webview/mapPanel.ts` | Line ~1101 |
| esbuild IIFE bundling | `apps/vscode/package.json` | `compile:webview` script |
| Tree item commands | `apps/vscode/src/providers/stacTreeProvider.ts` | `getTreeItem()` |
| stacService data loading | `apps/vscode/src/services/stacService.ts` | `listItems()` |
