# Quickstart: Verifying the Drawing-Mode Fix

**Feature**: 108-drawing-mode-session-state
**Phase**: 1 (Design & Contracts)
**Date**: 2026-05-12

This quickstart shows a human or an AI reviewer how to confirm the feature works, end-to-end, in under five minutes. Run from the repo root.

## Prerequisites

- Working development environment per `CLAUDE.md` (uv, pnpm, Task).
- Branch `108-drawing-mode-session-state` checked out (or your work branch off it).

## 1. Manual verification — VS Code (US1 + US2)

1. Open the repo in VS Code with the Future Debrief extension loaded:

   ```sh
   pnpm --filter @debrief/vscode dev
   ```

   When VS Code launches the Extension Development Host, open one of the sample plots under `preview/workspace/samples/`.

2. In the map panel, click the drawing toolbar's **polygon** tool. The toolbar should reflect "polygon armed" and the map cursor should change.

3. Force a webview rebuild. Any of these is sufficient:

   - Run "Developer: Reload Webviews" from the VS Code command palette.
   - Hide and re-show the map panel (close it and re-open from the activity bar).
   - Toggle the editor layout to force a remount.

4. **Expected**: After the rebuild, the polygon tool is **still** highlighted as armed and the cursor still reflects polygon-drawing affordance. (Before this feature, the toolbar would have reverted to un-armed.)

5. Pick palette entry `2` from the palette selector. Force another webview rebuild. **Expected**: palette entry `2` is still highlighted after the rebuild.

6. Click the polygon tool a second time (or the cancel affordance). **Expected**: drawing mode returns to un-armed across both the toolbar UI and (verifiably, via the host log) the session-state slice.

## 2. Manual verification — Web-shell (regression check for US3 store observability)

1. Start the web-shell:

   ```sh
   pnpm --filter @debrief/web-shell dev
   ```

2. Open a plot, arm the polygon tool from the drawing toolbar.

3. Open the browser devtools console and (assuming the test-mode store handle is wired up) run:

   ```js
   window.__debriefStore.getState().drawingMode
   ```

   **Expected**: `'polygon'`. This proves SC-005 — a non-map consumer (the devtools console) can observe the drawing-mode value because it lives in the store, not in component-local state.

4. Click the polygon tool again to disarm. Re-run the same console command. **Expected**: `null`.

## 3. Automated verification — Vitest (VS Code regression)

Run the targeted unit test added for this feature:

```sh
pnpm --filter @debrief/vscode test mapPanel
```

**Expected** — the test `MapPanel webviewReady flushes drawing state` passes. The test:

- Constructs a `MapPanel` against a mocked `Webview` and a session whose state is `{ drawingMode: 'polygon', drawingPaletteIndex: 2, … }`.
- Sends `{ type: 'webviewReady' }` to the panel's message handler.
- Asserts that `panel.webview.postMessage` was called with `{ type: 'setDrawingMode', drawingMode: 'polygon' }` and `{ type: 'setDrawingPaletteIndex', paletteIndex: 2 }`.

## 4. Automated verification — Playwright (web-shell regression)

Run the web-shell E2E test added for this feature:

```sh
cd apps/web-shell && node run-playwright.mjs drawing-mode-survives-reload
```

**Expected** — `drawing-mode-survives-reload.spec.ts` passes. The test:

- Opens a sample plot.
- Arms the polygon tool via the drawing toolbar.
- Asserts the store handle reports `drawingMode === 'polygon'`.
- Forces a `<MapView>` subtree remount (without a full page reload — so session-state is preserved).
- Asserts the toolbar still shows polygon armed and the store still reports `'polygon'`.
- Captures before/after screenshots into `specs/108-drawing-mode-session-state/evidence/screenshots/`.

## 5. CI gate — full verify before pushing

```sh
task verify
```

**Expected** — lint, typecheck, and all unit tests pass. Playwright (Step 4) is the additional command, also run by CI's E2E job.

## Troubleshooting

- **VS Code rebuild does not restore the toolbar** — confirm the `webviewReady` branch in `apps/vscode/src/webview/mapPanel.ts` posts both `setDrawingMode` and `setDrawingPaletteIndex`. If those lines are absent, the implementation step has not landed yet.
- **Vitest passes but VS Code manual test fails** — likely a host/webview message-shape mismatch. Re-check that the messages posted match `apps/vscode/src/webview/messages.ts:151-159` exactly.
- **Web-shell devtools store query returns `undefined`** — the test-mode store handle may be guarded by `import.meta.env.MODE === 'test'`. In dev mode use a slightly different access path (see `apps/web-shell/playwright/pages/AnalysisPage.ts` `getDrawingMode()` for the canonical handle name).
