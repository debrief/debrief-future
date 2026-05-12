# Usage Example: Drawing Mode Survives VS Code Webview Rebuilds

**Feature**: 108-drawing-mode-session-state
**Captured**: 2026-05-12
**Git SHA**: `5210c38`

## Why this demo exists

Before this change, a maritime analyst working in the VS Code Extension Development Host could arm the polygon drawing tool, lose focus or trigger a webview rebuild (e.g. by running "Developer: Reload Webviews"), and find the drawing toolbar silently reverted to "un-armed". The host-side `session-state` slice still held `drawingMode='polygon'`, but the webview booted with its `useState<DrawingMode>` default of `null` and never reconciled.

After this change, the host pushes the current `drawingMode` and `drawingPaletteIndex` to the webview as part of the existing `webviewReady` handshake — the same path that already seeds `setCurrentTime` and `setDisplayMode`. The toolbar is armed before the user sees the new webview frame.

## Reproduce in VS Code

1. `pnpm --filter @debrief/vscode dev` to launch the Extension Development Host.
2. Open a sample plot under `preview/workspace/samples/` and switch to the map panel.
3. Click the `+` button on the map toolbar and pick **Polygon** from the shape palette. The toolbar shows the polygon entry highlighted and the map cursor changes.
4. Run "Developer: Reload Webviews" from the VS Code command palette (or hide and re-show the panel).
5. **Expected (after #108)**: the toolbar still shows polygon armed; the map cursor still reflects polygon-drawing affordance; the user resumes vertex placement with no extra clicks.
6. Pick palette entry **2** and repeat step 4. The palette selector still highlights entry 2 after the reload.

## The one-snippet fix

```ts
// apps/vscode/src/webview/mapPanel.ts — handleWebviewMessage('webviewReady', ...)
if (this.activeSession) {
  const state = this.activeSession.getState();
  if (state.currentTime !== null) {
    this.postMessage({ type: 'setCurrentTime', time: state.currentTime });
  }
  this.postMessage({ type: 'setDisplayMode', displayMode: state.displayMode });

  // NEW for #108 — seed drawing state into the freshly-mounted webview.
  // The subscription path (mapPanel.ts:841-866) only fires on changes,
  // so without these two posts the webview boots with its useState
  // defaults of null / 0 even when the host still has polygon armed.
  this.postMessage({ type: 'setDrawingMode', drawingMode: state.drawingMode });
  this.postMessage({
    type: 'setDrawingPaletteIndex',
    paletteIndex: state.drawingPaletteIndex,
  });
}
```

## Reproduce SC-005 in the web-shell

The web-shell already reads `drawingMode` from the store. To prove it's a single source of truth, anyone with the store handle can observe and mutate drawing state without going through the map component.

1. `pnpm --filter @debrief/web-shell dev` and open a plot.
2. Arm the polygon tool via the drawing toolbar.
3. Open browser devtools → console and run:

   ```js
   window.__sessionStore.getState().drawingMode
   ```

   Result: `'polygon'` (matches the toolbar UI).

4. Programmatically arm a different tool from the same console:

   ```js
   window.__sessionStore.getState().setDrawingMode('rectangle')
   ```

   Result: the toolbar UI updates to highlight rectangle, because `App.tsx` reads `drawingMode` reactively from the same slice. A non-map consumer (the console, a future MCP tool, a contrib extension) can drive the drawing UI without any new API surface.

## What stayed the same

- No new public API on `@debrief/session-state` — `setDrawingMode` and `incrementDrawingPaletteIndex` already existed (FR-010).
- No new message types in `apps/vscode/src/webview/messages.ts` — `setDrawingMode` and `setDrawingPaletteIndex` already existed for the change-subscription path (research.md Decision 2).
- The webview's `useState<DrawingMode>` mirror in `mapView.tsx` is retained intentionally — VS Code webviews are isolated iframes and cannot import the host-side store directly. The mirror is now explicitly documented as host-driven (Decision 4).

## Related test artefacts

- `apps/vscode/tests/unit/mapPanel.webviewReady.test.ts` — proves the contract from C-1/C-2/C-3.
- `services/session-state/tests/unit/slices/spatial.drawing-observability.test.ts` — proves SC-005 with no map component involved.
- `apps/web-shell/playwright/tests/drawing-mode-survives-reload.spec.ts` — proves the web-shell still reads/writes via the slice and the toolbar reacts to programmatic writes.
- `specs/108-drawing-mode-session-state/evidence/screenshots/webshell-drawing-mode-store-handle.png` — the web-shell at the moment a non-map consumer reads the armed polygon.
- `specs/108-drawing-mode-session-state/evidence/webview-message-trace.md` — the captured `postMessage` trace from a real `webviewReady` handshake.
