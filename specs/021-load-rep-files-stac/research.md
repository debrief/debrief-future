# Research: REP File Loading in VS Code Extension

**Feature**: 021-load-rep-files-stac
**Date**: 2026-01-23
**Purpose**: Document research findings and design decisions

## Research Areas

### 1. VS Code Webview Drag-Drop Handling

**Question**: How to handle file drag-drop from VS Code Explorer onto a webview?

**Finding**: VS Code webviews support HTML5 drag-drop events. When a file is dragged from the Explorer, the `dataTransfer` contains file paths accessible via `text/uri-list` MIME type.

**Decision**: Use standard HTML5 `dragover` and `drop` event listeners in the map webview
**Rationale**: Native browser API, well-documented, works across all platforms
**Alternatives Considered**:
- VS Code Tree Drag-Drop Controller: Only works for tree-to-tree operations, not tree-to-webview
- Custom extension protocol: Unnecessary complexity

**Implementation Notes**:
```typescript
// In webview (map.ts)
mapContainer.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
});

mapContainer.addEventListener('drop', (e) => {
  e.preventDefault();
  const uriList = e.dataTransfer.getData('text/uri-list');
  // Parse file:// URIs and send to extension host
  vscode.postMessage({ type: 'repFileDrop', uris: parseUriList(uriList) });
});
```

### 2. Existing debrief-io Integration Pattern

**Question**: How does the VS Code extension currently communicate with Python services?

**Finding**: CalcService (`apps/vscode/src/services/calcService.ts`) uses MCP (Model Context Protocol) to communicate with debrief-calc. It includes:
- Circuit breaker pattern (3 failures → 30s backoff)
- Tool discovery by selection context
- Async execution with progress

**Decision**: Extend CalcService pattern to add IoService for debrief-io calls
**Rationale**: Consistent architecture, reuse circuit breaker and error handling
**Alternatives Considered**:
- Direct JSON-RPC to debrief-io CLI: Inconsistent with existing patterns
- Embed Python in extension: Heavy, platform-dependent

**Implementation Notes**:
- Create `IoService` mirroring CalcService structure
- Register `parse_file` MCP tool from debrief-io
- Use same progress notification pattern

### 3. debrief-stac Asset and Feature APIs

**Question**: How to add REP files as assets and merge GeoJSON features?

**Finding**: debrief-stac provides:
- `add_asset(catalog_path, plot_id, source_path, asset_key)` → copies file, creates asset entry
- `add_features(catalog_path, plot_id, features)` → appends to FeatureCollection, updates bbox
- Asset key pattern: `source-{filename_stem}`

**Decision**: Use existing APIs directly via StacService file operations
**Rationale**: No new service code needed; debrief-stac already handles provenance
**Alternatives Considered**:
- MCP wrapper for debrief-stac: Adds latency for local operations
- Direct file manipulation: Bypasses provenance tracking

**Implementation Notes**:
- StacService already has file-based operations
- Add `addAsset()` and `addFeatures()` methods that call debrief-stac via subprocess
- Duplicate check: `listAssets(plot_id).find(a => a.key === 'source-' + stem)`

### 4. Duplicate Detection Strategy

**Question**: How to detect and prevent duplicate REP file imports?

**Finding**: debrief-stac stores assets with key `source-{filename_stem}`. No built-in duplicate checking exists—same key silently overwrites.

**Decision**: Check for existing asset key before import; warn user if found
**Rationale**: Simple, filename-based detection matches user mental model
**Alternatives Considered**:
- Content hash comparison: More accurate but complex; overkill for single files
- Always overwrite: Risks data loss without user awareness
- Append suffix (file-1, file-2): Confusing, doesn't address true duplicates

**Implementation Notes**:
```typescript
async function checkDuplicate(catalogPath: string, plotId: string, filename: string): Promise<boolean> {
  const assetKey = `source-${path.parse(filename).name}`;
  const plot = await stacService.readPlot(catalogPath, plotId);
  return assetKey in plot.assets;
}
```

### 5. Context Menu Contribution

**Question**: How to add "Load into Debrief..." to .rep file context menu?

**Finding**: VS Code extensions contribute context menus via `package.json` under `contributes.menus`. File-specific menus use `explorer/context` with `when` clause filtering by resource extension.

**Decision**: Add contribution point with `resourceExtname == '.rep'` filter
**Rationale**: Standard VS Code pattern, declarative, no runtime overhead
**Alternatives Considered**:
- Generic "Open with..." handler: Less discoverable
- Always-visible menu item: Clutters menu for non-REP files

**Implementation Notes**:
```json
{
  "contributes": {
    "commands": [{
      "command": "debrief.importRep",
      "title": "Load into Debrief..."
    }],
    "menus": {
      "explorer/context": [{
        "command": "debrief.importRep",
        "when": "resourceExtname == '.rep'",
        "group": "debrief"
      }]
    }
  }
}
```

### 6. Catalog/Item Picker UI

**Question**: How to let users select target catalog and item for context menu flow?

**Finding**: VS Code QuickPick API supports multi-step selection with `createQuickPick()`. Existing extension uses similar patterns for plot selection in `openPlot.ts`.

**Decision**: Two-step QuickPick flow: catalog selection → item selection
**Rationale**: Mirrors existing loader mini-app pattern; keyboard-navigable
**Alternatives Considered**:
- Single flat list: Hard to navigate with many plots across catalogs
- Tree picker: VS Code doesn't have native tree picker; custom webview overkill
- Reuse existing QuickPick from openPlot: Different purpose (open vs import destination)

**Implementation Notes**:
- Step 1: Show catalogs with item count
- Step 2: Show items in selected catalog with title and date
- Support "Create New Plot" option in step 2

### 7. Map Auto-Zoom After Import

**Question**: How to adjust map bounds to show newly imported data?

**Finding**: MapPanel already has `fitBounds(bounds)` method that calls Leaflet's `fitBounds()`. After import, the new feature bbox is known from debrief-stac response.

**Decision**: Call `fitBounds()` with expanded bounds including new features
**Rationale**: Existing capability, consistent behavior
**Alternatives Considered**:
- No auto-zoom: User might not see imported data if it's off-screen
- Full reload: Heavy; unnecessary data refresh

**Implementation Notes**:
```typescript
// After successful import
const newBounds = calculateBounds(importedFeatures);
const currentBounds = mapPanel.getCurrentBounds();
const combinedBounds = mergeBounds(currentBounds, newBounds);
mapPanel.fitBounds(combinedBounds);
```

## Summary of Decisions

| Area | Decision | Key Rationale |
|------|----------|---------------|
| Drag-drop | HTML5 events in webview | Native, cross-platform |
| Python communication | Extend MCP pattern (IoService) | Consistent architecture |
| Storage | Use debrief-stac APIs via subprocess | Provenance tracking built-in |
| Duplicate detection | Filename-based asset key check | Simple, user-understandable |
| Context menu | package.json contribution | Standard VS Code pattern |
| Picker UI | Two-step QuickPick | Keyboard-navigable, familiar |
| Auto-zoom | Existing fitBounds() | Already implemented |

## Open Questions (None)

All research questions resolved. Ready for implementation.
