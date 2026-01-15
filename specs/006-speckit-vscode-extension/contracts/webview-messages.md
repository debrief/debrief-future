# Contract: Extension ↔ Webview Message Protocol

**Feature**: 006-speckit-vscode-extension
**Date**: 2026-01-15
**Type**: Internal API (extension host ↔ webview)

---

## Overview

This contract defines the message protocol between the VS Code extension host and the map webview panel. All messages are sent via `postMessage()` and follow a typed discriminated union pattern.

---

## Message Base Types

```typescript
/** Base message interface */
interface Message {
  type: string;
}

/** Request message with correlation ID */
interface RequestMessage extends Message {
  requestId: string;
}

/** Response message with correlation ID */
interface ResponseMessage extends Message {
  requestId: string;
  success: boolean;
  error?: string;
}
```

---

## Extension → Webview Messages

### Plot Data Messages

#### `loadPlot`

Load a plot into the webview.

```typescript
interface LoadPlotMessage {
  type: 'loadPlot';
  plot: {
    id: string;
    title: string;
    tracks: Track[];
    locations: ReferenceLocation[];
    bbox: [number, number, number, number];
    timeExtent: [string, string];
  };
}
```

#### `updateTracks`

Update track data (after time filter change).

```typescript
interface UpdateTracksMessage {
  type: 'updateTracks';
  tracks: Track[];
}
```

### Selection Messages

#### `setSelection`

Set the current selection (from external source like Outline click).

```typescript
interface SetSelectionMessage {
  type: 'setSelection';
  selection: {
    trackIds: string[];
    locationIds: string[];
  };
}
```

#### `clearSelection`

Clear all selection.

```typescript
interface ClearSelectionMessage {
  type: 'clearSelection';
}
```

### Layer Messages

#### `addResultLayer`

Add a result layer from tool execution.

```typescript
interface AddResultLayerMessage {
  type: 'addResultLayer';
  layer: {
    id: string;
    name: string;
    features: GeoJSON.FeatureCollection;
    style: LayerStyle;
  };
}
```

#### `removeResultLayer`

Remove a result layer.

```typescript
interface RemoveResultLayerMessage {
  type: 'removeResultLayer';
  layerId: string;
}
```

#### `setLayerVisibility`

Toggle layer visibility.

```typescript
interface SetLayerVisibilityMessage {
  type: 'setLayerVisibility';
  layerId: string;
  visible: boolean;
}
```

### View Messages

#### `fitBounds`

Fit map to specified bounds.

```typescript
interface FitBoundsMessage {
  type: 'fitBounds';
  bounds: [[number, number], [number, number]]; // [[south, west], [north, east]]
}
```

#### `setTimeRange`

Update the time range filter.

```typescript
interface SetTimeRangeMessage {
  type: 'setTimeRange';
  timeRange: {
    start: string;
    end: string;
  };
}
```

### Style Messages

#### `setTrackColor`

Set custom color for a track.

```typescript
interface SetTrackColorMessage {
  type: 'setTrackColor';
  trackId: string;
  color: string; // hex #RRGGBB
}
```

---

## Webview → Extension Messages

### Selection Messages

#### `selectionChanged`

Notify extension of selection change.

```typescript
interface SelectionChangedMessage {
  type: 'selectionChanged';
  selection: {
    trackIds: string[];
    locationIds: string[];
    contextType: 'none' | 'single-track' | 'multi-track' | 'location' | 'mixed';
  };
}
```

### View State Messages

#### `viewStateChanged`

Notify extension of map view state change (for persistence).

```typescript
interface ViewStateChangedMessage {
  type: 'viewStateChanged';
  state: {
    center: [number, number];
    zoom: number;
    timeRange: { start: string; end: string };
  };
}
```

### Action Requests

#### `requestExportPng`

Request PNG export (extension handles file dialog).

```typescript
interface RequestExportPngRequest {
  type: 'requestExportPng';
  requestId: string;
}

interface RequestExportPngResponse {
  type: 'requestExportPngResponse';
  requestId: string;
  success: boolean;
  error?: string;
}
```

#### `requestTrackColorChange`

Request to change track color (extension shows color picker).

```typescript
interface RequestTrackColorChangeMessage {
  type: 'requestTrackColorChange';
  trackId: string;
  trackName: string;
}
```

### Data Requests

#### `requestTrackDetails`

Request full track details for tooltip.

```typescript
interface RequestTrackDetailsRequest {
  type: 'requestTrackDetails';
  requestId: string;
  trackId: string;
}

interface RequestTrackDetailsResponse {
  type: 'requestTrackDetailsResponse';
  requestId: string;
  success: boolean;
  details?: {
    name: string;
    platformType: string;
    pointCount: number;
    startTime: string;
    endTime: string;
    duration: string;
  };
  error?: string;
}
```

### Ready Signal

#### `webviewReady`

Signal that webview has initialized and is ready to receive data.

```typescript
interface WebviewReadyMessage {
  type: 'webviewReady';
}
```

---

## Message Type Union

```typescript
// Extension → Webview
type ExtensionToWebviewMessage =
  | LoadPlotMessage
  | UpdateTracksMessage
  | SetSelectionMessage
  | ClearSelectionMessage
  | AddResultLayerMessage
  | RemoveResultLayerMessage
  | SetLayerVisibilityMessage
  | FitBoundsMessage
  | SetTimeRangeMessage
  | SetTrackColorMessage
  | RequestExportPngResponse
  | RequestTrackDetailsResponse;

// Webview → Extension
type WebviewToExtensionMessage =
  | SelectionChangedMessage
  | ViewStateChangedMessage
  | RequestExportPngRequest
  | RequestTrackColorChangeMessage
  | RequestTrackDetailsRequest
  | WebviewReadyMessage;
```

---

## Implementation Notes

### Message Handling Pattern

**Extension host**:
```typescript
panel.webview.onDidReceiveMessage((message: WebviewToExtensionMessage) => {
  switch (message.type) {
    case 'selectionChanged':
      handleSelectionChanged(message);
      break;
    case 'requestExportPng':
      handleExportPng(message.requestId);
      break;
    // ...
  }
});
```

**Webview**:
```typescript
const vscode = acquireVsCodeApi();

window.addEventListener('message', (event) => {
  const message: ExtensionToWebviewMessage = event.data;
  switch (message.type) {
    case 'loadPlot':
      handleLoadPlot(message);
      break;
    case 'setSelection':
      handleSetSelection(message);
      break;
    // ...
  }
});
```

### State Persistence

The webview uses `vscode.getState()` and `vscode.setState()` to persist:
- Map center and zoom
- Time range filter
- Track colors (if modified)

Selection state is shared via messages and persisted in extension host.
