# Message Protocol: Results Panel

**Feature**: 095-results-bottom-panel
**Date**: 2026-02-14

## Overview

The results panel uses VS Code's `postMessage` API for communication between the extension host and the webview. All messages are discriminated unions keyed on `type`. This follows the established pattern from `mapPanel.ts` and `activityPanelView.ts`.

## Extension → Webview Messages

### `results:addTab`

Sent when a new result tab is created. Adds the tab to the tab bar and makes it active.

```typescript
interface AddTabMessage {
  type: 'results:addTab';
  tab: {
    id: string;           // plotItemPath::resultFilePath
    title: string;        // Display title
    plotTitle: string;     // Plot name for disambiguation
    artifactType: 'dataset' | 'image' | 'other';
  };
  content: TabContentPayload;
  showPlotPrefix: boolean;  // True when tabs from multiple plots are open
}
```

### `results:updateContent`

Sent when a tab's underlying file changes (live update). The tab ID identifies which tab to re-render.

```typescript
interface UpdateContentMessage {
  type: 'results:updateContent';
  tabId: string;
  content: TabContentPayload;
}
```

### `results:activateTab`

Sent when the extension host needs to switch the active tab (e.g., de-duplication — opening an already-open result).

```typescript
interface ActivateTabMessage {
  type: 'results:activateTab';
  tabId: string;
}
```

### `results:removeTab`

Sent when the extension host removes a tab (e.g., plot closed, all tabs for that plot removed).

```typescript
interface RemoveTabMessage {
  type: 'results:removeTab';
  tabId: string;
  newActiveTabId: string | null;  // Tab to activate after removal, or null if empty
}
```

### `results:updatePlotPrefixes`

Sent when the set of open plots changes, toggling whether tab titles include the plot name prefix.

```typescript
interface UpdatePlotPrefixesMessage {
  type: 'results:updatePlotPrefixes';
  showPlotPrefix: boolean;
}
```

### TabContentPayload (union type)

```typescript
type TabContentPayload =
  | { artifactType: 'dataset'; spec: object | null; error?: string }
  | { artifactType: 'image'; dataUri: string }
  | { artifactType: 'other'; filename: string; mimeType: string; sizeBytes: number };
```

## Webview → Extension Messages

### `results:closeTab`

Sent when the analyst clicks a tab's close button.

```typescript
interface CloseTabMessage {
  type: 'results:closeTab';
  tabId: string;
}
```

### `results:selectTab`

Sent when the analyst clicks on a tab to switch to it.

```typescript
interface SelectTabMessage {
  type: 'results:selectTab';
  tabId: string;
}
```

### `results:openExternal`

Sent when the analyst clicks "Open in VS Code" on a fallback viewer tab.

```typescript
interface OpenExternalMessage {
  type: 'results:openExternal';
  tabId: string;
}
```

### `results:webviewReady`

Sent once when the webview React component has mounted and is ready to receive messages.

```typescript
interface WebviewReadyMessage {
  type: 'results:webviewReady';
}
```

## Message Flow Diagrams

### Auto-Open on Tool Completion

```
executeTool command
  → stacService.addResultAsset()
  → resultsPanelView.openResult(plotPath, filePath)
    → read file from disk
    → determine artifact type
    → create ResultTab + FileSystemWatcher
    → postMessage({ type: 'results:addTab', ... })
    → webview renders new tab
```

### Tab Close

```
Analyst clicks close button
  → webview sends { type: 'results:closeTab', tabId }
  → extension host removes tab from TabState
  → extension host disposes FileSystemWatcher for tab
  → extension host determines new active tab
  → extension host sends { type: 'results:removeTab', tabId, newActiveTabId }
  → webview removes tab from bar, activates new tab
```

### Live Update

```
Tool re-run overwrites result file
  → FileSystemWatcher fires onDidChange
  → 200ms debounce
  → extension host reads updated file
  → extension host re-parses content (re-run transformer for datasets)
  → postMessage({ type: 'results:updateContent', tabId, content })
  → webview re-renders active tab content
```

### De-duplication

```
Analyst opens same result from STAC browser
  → resultsPanelView.openResult(plotPath, filePath)
  → tab ID = plotPath::filePath
  → TabState.tabs.has(tabId) → true
  → postMessage({ type: 'results:activateTab', tabId })
  → webview switches to existing tab
```

## Error Handling

| Scenario | Extension Host Action | Webview Display |
|----------|----------------------|-----------------|
| File not found | Send `addTab` with `{ artifactType: 'other', filename, mimeType: 'unknown', sizeBytes: 0 }` | FallbackViewer with error note |
| JSON parse failure | Send `addTab` with `{ artifactType: 'dataset', spec: null, error: 'Invalid JSON' }` | ChartRenderer error state |
| Transformer error | Send `addTab` with `{ artifactType: 'dataset', spec: null, error: transformerError.message }` | ChartRenderer error state |
| File watcher error | Log to output channel; tab retains last good content | No visible change |
| Mid-write read | Retry after 200ms debounce; if still fails, show transient error | Brief loading indicator |
