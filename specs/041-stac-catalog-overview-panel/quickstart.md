# Quickstart: 041 STAC Catalog Overview Panel

## Implementation Order

### Step 1: Extend StacItemSummary

**Files**: `apps/vscode/src/types/stac.ts`, `apps/vscode/src/services/stacService.ts`

Add `bbox`, `startDatetime`, `endDatetime` fields to `StacItemSummary`. In `stacService.ts`, extract these from `item.json` during `listItems()`.

**Test**: Unit test that `listItems()` returns correct bbox and temporal fields from a fixture item.json.

### Step 2: Create the shared React component

**Files**: `shared/components/src/CatalogOverview/`

Build `<CatalogOverview />` as a React component:
- Props: `items: CatalogOverviewItem[]`, `onItemSelect: (itemPath: string) => void`
- React-Leaflet map in the top region with `<Rectangle>` for each item bbox
- SVG timeline in the bottom region with horizontal bars
- Drag bar between them (pointer events → flex adjustment)
- CSS custom properties for theming

**Test**: Storybook stories with fixture data — default view, empty catalog, missing metadata, single item, many items.

### Step 3: Create the VS Code webview entry point

**File**: `apps/vscode/src/webview/web/catalogOverview.tsx`

Thin React entry point that:
- Renders `<CatalogOverview />` into `#root`
- Listens for `loadCatalogOverview` messages → passes data as props
- On `onItemSelect` callback → posts `overviewItemSelected` message

**Build**: Add esbuild entry to `compile:webview` in `package.json`:
```
esbuild src/webview/web/catalogOverview.tsx --bundle --outfile=dist/webview/catalogOverview.js --format=iife --loader:.tsx=tsx --loader:.css=text
```

### Step 4: Create the panel class

**File**: `apps/vscode/src/panels/catalogOverviewPanel.ts`

Follow `mapPanel.ts` pattern:
- Static `createOrShow()` method
- `getHtmlForWebview()` returning HTML with Leaflet CSS + bundled JS
- Message handling for `overviewItemSelected` → trigger existing plot open logic
- Post `loadCatalogOverview` when webview reports ready

### Step 5: Register command and wire up tree view

**Files**: `apps/vscode/src/extension.ts`, `apps/vscode/src/providers/stacTreeProvider.ts`, `apps/vscode/package.json`

- Register `debrief.openCatalogOverview` command in `extension.ts`
- Add command to catalog tree items in `stacTreeProvider.ts`
- Add command contribution to `package.json`

### Step 6: Storybook verification + manual VS Code testing

- Run Storybook, verify all stories render correctly
- Open a STAC store with multiple items in VS Code
- Double-click a catalog node → overview panel opens
- Verify map shows bounding boxes, timeline shows time bars
- Double-click an item → opens in plot view
- Resize the drag bar → ratio persists on reopen
- Test with items missing bbox/temporal metadata

## Key Patterns to Follow

| Pattern | Reference File |
|---------|---------------|
| Shared React component | `shared/components/src/TimeController/TimeController.tsx` |
| Storybook stories | `shared/components/src/TimeController/TimeController.stories.tsx` |
| WebviewPanel lifecycle | `apps/vscode/src/webview/mapPanel.ts` |
| React webview entry point | `apps/vscode/src/webview/web/timeController.tsx` |
| HTML generation with CSP | `apps/vscode/src/webview/mapPanel.ts` → `getHtmlForWebview()` |
| esbuild TSX bundling | `apps/vscode/package.json` → `compile:webview` script |
| Tree item commands | `apps/vscode/src/providers/stacTreeProvider.ts` → `getTreeItem()` |
| stacService data loading | `apps/vscode/src/services/stacService.ts` → `listItems()` |
