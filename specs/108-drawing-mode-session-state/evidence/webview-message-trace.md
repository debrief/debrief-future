# Webview Message Trace — `webviewReady` Handshake (#108)

**Feature**: 108-drawing-mode-session-state
**Captured**: 2026-05-12
**Source**: `apps/vscode/tests/unit/mapPanel.webviewReady.test.ts` — the
mock `Webview.postMessage` channel records every message the host posts to
the webview after a `webviewReady` event. This trace verifies contracts
C-1, C-2, and C-3 from `contracts/webview-messages.md`.

## Trace 1 — Polygon armed, palette index 2 (covers C-1 + C-2)

**Setup**: `activeSession.getState()` returns

```json
{
  "currentTime": null,
  "displayMode": "full",
  "drawingMode": "polygon",
  "drawingPaletteIndex": 2
}
```

**Webview sends**: `{ "type": "webviewReady" }`

**Host posts (in order)**:

```json
{ "type": "setDisplayMode", "displayMode": "full" }
{ "type": "setDrawingMode", "drawingMode": "polygon" }
{ "type": "setDrawingPaletteIndex", "paletteIndex": 2 }
```

**Observations**:

- `setCurrentTime` is skipped because `currentTime === null` (unchanged pre-existing behaviour).
- `setDrawingMode` is posted with the active value (`'polygon'`), satisfying C-1.
- `setDrawingPaletteIndex` is posted with the active value (`2`), satisfying C-2.

## Trace 2 — Un-armed defaults (Decision 3)

**Setup**: `activeSession.getState()` returns

```json
{
  "currentTime": null,
  "displayMode": "full",
  "drawingMode": null,
  "drawingPaletteIndex": 0
}
```

**Webview sends**: `{ "type": "webviewReady" }`

**Host posts**:

```json
{ "type": "setDisplayMode", "displayMode": "full" }
{ "type": "setDrawingMode", "drawingMode": null }
{ "type": "setDrawingPaletteIndex", "paletteIndex": 0 }
```

**Observations**:

- Both drawing messages are posted **unconditionally**, even though the values match the webview's `useState` defaults. This is research.md Decision 3 — the webview cannot distinguish "host has no opinion" from "host says null". Sending always keeps the implementation and the test in lock-step.

## Trace 3 — No active session (C-3)

**Setup**: `this.activeSession === undefined`.

**Webview sends**: `{ "type": "webviewReady" }`

**Host posts**: *(nothing in the drawing-state group; the existing `setDisplayMode` / `setCurrentTime` posts are also skipped because they live in the same `if (this.activeSession)` block)*.

**Observations**:

- C-3 — when there is no active session, the host posts no drawing-state messages.

## Trace 4 — `setDisplayMode` and `setCurrentTime` regression check

**Setup**: `activeSession.getState()` returns

```json
{
  "currentTime": 1234,
  "displayMode": "historical",
  "drawingMode": null,
  "drawingPaletteIndex": 0
}
```

**Webview sends**: `{ "type": "webviewReady" }`

**Host posts**:

```json
{ "type": "setCurrentTime", "time": 1234 }
{ "type": "setDisplayMode", "displayMode": "historical" }
{ "type": "setDrawingMode", "drawingMode": null }
{ "type": "setDrawingPaletteIndex", "paletteIndex": 0 }
```

**Observations**:

- Pre-existing `setCurrentTime` and `setDisplayMode` posts are unchanged in order or shape. The new drawing posts follow them. No regression.

## How to re-capture

```sh
pnpm --filter debrief-vscode test:unit tests/unit/mapPanel.webviewReady.test.ts
```

The test source mocks `panel.webview.postMessage` and records every call to a captured array. Each `it()` case in the test corresponds to one trace above. To dump the raw array, temporarily add `console.dir(posted, { depth: 4 });` inside the relevant test case and re-run the suite.
