# Contract Delta: Webview Messages

**Feature**: 108-drawing-mode-session-state
**Phase**: 1 (Design & Contracts)
**Date**: 2026-05-12

This feature does not introduce new extension-to-webview message types and does not change any existing message shape. The contract delta below documents the **timing** change: two existing messages must be posted at a new moment in the lifecycle.

## Existing Message Types (no change)

All message shapes below are defined in `apps/vscode/src/webview/messages.ts` and are already in production use. They are listed here for clarity; **no source change is required to `messages.ts`**.

### `setDrawingMode` (host → webview)

```ts
type SetDrawingModeMessage = {
  type: 'setDrawingMode';
  drawingMode: 'point' | 'rectangle' | 'polygon' | 'polyline' | null;
};
```

- Defined at `apps/vscode/src/webview/messages.ts:151-153`.
- Consumed by `mapView.tsx:169-171` which sets the local `useState<DrawingMode>` mirror.

### `setDrawingPaletteIndex` (host → webview)

```ts
type SetDrawingPaletteIndexMessage = {
  type: 'setDrawingPaletteIndex';
  paletteIndex: number;
};
```

- Defined at `apps/vscode/src/webview/messages.ts:156-159`.
- Consumed by `mapView.tsx:172-174` which sets the local `useState<number>` mirror.

### `drawingModeChanged` (webview → host)

```ts
type DrawingModeChangedMessage = {
  type: 'drawingModeChanged';
  drawingMode: 'point' | 'rectangle' | 'polygon' | 'polyline' | null;
};
```

- Defined at `apps/vscode/src/webview/messages.ts:305-308`.
- Consumed by `mapPanel.ts:1066-1069` which calls `setDrawingMode` on the session state.

### `webviewReady` (webview → host)

```ts
type WebviewReadyMessage = { type: 'webviewReady' };
```

- Defined in `messages.ts`.
- Currently handled at `mapPanel.ts:979-1001` to flush pending messages and seed `setCurrentTime` + `setDisplayMode` into the new webview.

## Behavioural Contract Change (the actual delta)

**Before this feature** — `mapPanel.handleWebviewMessage('webviewReady', …)` posts the following to the freshly-mounted webview:

1. All pending messages from `this.pendingMessages`.
2. `setCurrentTime` (when `state.currentTime !== null`).
3. `setDisplayMode`.

**After this feature** — the same handler additionally posts:

4. `setDrawingMode` with the current `state.drawingMode`. (Always posted, including when the value is `null` — see research.md Decision 3.)
5. `setDrawingPaletteIndex` with the current `state.drawingPaletteIndex`.

### Pseudocode of the change

```ts
// Inside MapPanel.handleWebviewMessage, the 'webviewReady' branch:
case 'webviewReady':
  this.isWebviewReady = true;
  for (const pending of this.pendingMessages) {
    void this.panel.webview.postMessage(pending);
  }
  this.pendingMessages = [];
  if (this.activeSession) {
    const state = this.activeSession.getState();

    if (state.currentTime !== null) {
      this.postMessage({ type: 'setCurrentTime', time: state.currentTime });
    }
    this.postMessage({ type: 'setDisplayMode', displayMode: state.displayMode });

    // NEW — feature 108
    this.postMessage({ type: 'setDrawingMode', drawingMode: state.drawingMode });
    this.postMessage({
      type: 'setDrawingPaletteIndex',
      paletteIndex: state.drawingPaletteIndex,
    });
  }
  break;
```

## Conformance Checks (testable)

1. **C-1**: When a webview emits `webviewReady` and the active session has `drawingMode === 'polygon'`, the host MUST post `{ type: 'setDrawingMode', drawingMode: 'polygon' }` exactly once before any subsequent message. *Verified by the new Vitest test.*
2. **C-2**: When a webview emits `webviewReady` and the active session has `drawingPaletteIndex === N`, the host MUST post `{ type: 'setDrawingPaletteIndex', paletteIndex: N }` exactly once. *Verified by the new Vitest test.*
3. **C-3**: When there is no active session (`this.activeSession` is undefined), the host MUST NOT post drawing-state messages. *Verified by the new Vitest test.*
4. **C-4**: The webview, on receiving `setDrawingMode`, MUST update its local mirror such that the next render of the drawing toolbar reflects the new value. *Already verified by existing message-handler coverage; no new test required, but the integration test in step 5 of `quickstart.md` re-confirms it.*

## Out-of-scope contract concerns

- No change to subscription-driven push (`mapPanel.ts:841-866` — still fires on every store change).
- No change to webview → host write path (`drawingModeChanged` — still flows back to `setDrawingMode` on the store).
- No change to message types or their schemas in `messages.ts`.
- No change to the web-shell's in-process store reads (web-shell does not use this messaging path).
