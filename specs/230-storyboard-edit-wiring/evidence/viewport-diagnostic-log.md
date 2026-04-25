# Viewport-race diagnostic log

**Feature**: 230 | **FR**: 050 | **Date**: 2026-04-24

## Symptom

Before this fix, opening a plot and immediately pressing **Capture**
(without any pan or zoom) surfaced:

```
Capture failed — map has not reported a viewport yet. Pan or zoom the
map and try again.
```

## Root cause

Two separate bugs chained together:

1. `MapView` (shared component) called `onBoundsChange` only on Leaflet's
   `moveend` event. On initial render, `moveend` had never fired, so the
   callback stayed silent until the user interacted with the map.

2. The VS Code webview's `handleBoundsChange` emitted
   `{type: 'viewStateChanged', state: {center, zoom, timeRange}}` —
   **without a `bounds` field**. The extension-side handler
   (`mapPanel.handleViewportChanged`) required `viewport.bounds` to be
   truthy before writing to the session store; with `bounds` undefined,
   every emission was dropped and the session viewport stayed `null`.

`captureScene.ts:173-178` checks `state.viewport` up-front and rejects if
it's `null` or missing `zoom`. Both branches held until the user
interacted with the map — hence the race on first-capture.

## Fix

### In `shared/components/src/MapView/MapView.tsx`

Added a mount-time `useEffect` that emits bounds immediately and again
on `map.whenReady`. Defensive against mock `map` objects in tests (the
Leaflet React test harness doesn't expose `whenReady`) — both calls are
wrapped in try/catch and type-guarded.

### In `apps/vscode/src/webview/web/mapView.tsx`

Switched the outbound message from `viewStateChanged` (no bounds) to
`viewportChanged` with the full NW/NE/SE/SW polygon derived from
`bounds: [west, south, east, north]`. Also tracks the current zoom in a
ref so bounds reports carry the correct zoom rather than a hard-coded
`10`.

## Verification

- **Before** (reproduction): open `spec-alpha` in VS Code with the
  extension dev host, press Capture before pan/zoom → toast surfaces.
- **After**: same reproduction → capture succeeds cleanly; Log Panel
  records the scene creation; session store's `viewport` field is
  populated immediately on first bounds callback.
- **Regression guard**: all 332 `MapView` component tests pass, plus 545
  vscode unit tests. The mount-time emission is idempotent — the session
  store reducer is last-write-wins per field, so the double-emit (mount
  + whenReady + subsequent moveend) does not cause drift.

## Related

- Research: `research.md` R8 documents the decision.
- Spec: FR-050, SC-005.
- Files touched: `shared/components/src/MapView/MapView.tsx`,
  `apps/vscode/src/webview/web/mapView.tsx`.
