# Usage Example: Storyboard Capture (Feature 216)

This walkthrough demonstrates the three main flows the capture slice delivers:
**first capture**, **subsequent capture**, and **duplicate-timestamp
resolution**. The flow is driven from the VS Code Map Viewer with a single
keystroke.

## Prerequisites

- The Debrief VS Code extension is installed and activated.
- A plot is open in the Map Viewer (`debrief.plotOpen === true`).
- The time slider is positioned inside the plot's time range.
- At least one feature toggle has been set (to exercise the visible-feature
  set in the Scene).

## 1. First capture on a plot with no Storyboards

```
1. Frame the map to the moment of interest (pan / zoom / rotate).
2. Move the time slider to the target instant.
3. Toggle the set of feature layers you want to freeze.
4. Press Ctrl+Alt+C  (Cmd+Alt+C on macOS).
5. A VS Code quick-pick appears:

     ┌────────────────────────────────────────────┐
     │ Name for the new Storyboard                │
     │ ┌────────────────────────────────────────┐ │
     │ │ Exercise Alpha                         │ │
     │ └────────────────────────────────────────┘ │
     │ (confirm with Enter, cancel with Escape)   │
     └────────────────────────────────────────────┘

6. Type a unique name and press Enter.
7. Behind the scenes:
   - The map's viewport centre + zoom are read from the session store.
   - The time slider's currentTime (epoch-ms) is converted to an ISO-8601
     instant.
   - The visible feature-id set is computed from the current layer toggles.
   - A per-Scene 800×600 PNG and 200×150 thumbnail are written via
     `MapPanel.requestThumbnailCapture` + `sceneThumbnailService`.
   - `createStoryboard` + `createScene` run inside the #215 CRUD module,
     appending a `HistoryEntry` with op="create" to each new Feature's
     provenance slot.
   - The plot is marked dirty via `sessionStore.getState().markDirty()`.
   - The minimal Storyboard panel auto-focuses and lists the new Scene:

     ┌────────────────────────────────────────┐
     │ Exercise Alpha            1 scene      │
     │ ──────────────────────────────────────  │
     │ ┌──────────┐  201435Z APR 26           │
     │ │ thumbnail│  201435Z APR 26           │
     │ │  200×150 │  2026-04-20T14:35:00.000Z │
     │ └──────────┘                           │
     └────────────────────────────────────────┘
```

## 2. Subsequent capture (appends to the active Storyboard)

```
1. Move the time slider to a new instant (different from any existing Scene
   in the active Storyboard).
2. Re-frame the map if you like.
3. Press Ctrl+Alt+C.
4. No quick-pick appears — the handler resolves the active Storyboard via
   #215's getActiveStoryboardDefault(plot), writes the per-Scene thumbnails,
   and calls createScene directly.
5. The Storyboard panel now shows two Scene rows in timestamp-ascending
   order.
```

## 3. Duplicate-timestamp resolution

```
1. Move the time slider back to an existing Scene's timestamp.
2. Press Ctrl+Alt+C.
3. A modal VS Code information prompt appears:

     ┌─────────────────────────────────────────────────────────┐
     │ A scene already exists at 201435Z APR 26.               │
     │                                                         │
     │   [ Replace ]    [ Offset (+1 s) ]                      │
     │   (dismiss with Esc to Cancel)                          │
     └─────────────────────────────────────────────────────────┘

4. Three branches:
   - Replace   → #215 deleteScene removes the conflict, then createScene
                 inserts the new Scene with the same timestamp.
   - Offset    → timestamp is bumped by +1 second and createScene retries.
                 If the bumped timestamp also collides, the modal shows
                 again (up to a 5-retry safety cap).
   - Cancel    → no write occurs; the plot dirty flag is unchanged.
```

## 4. Error paths

- **Thumbnail pipeline failure.** Toast: *"Capture failed — could not produce
  thumbnail. Scene not saved."* No Scene is persisted and the plot dirty
  flag is unchanged (Atomicity, SC-002).
- **Time slider outside the plot's time range.** Toast: *"Capture failed —
  time slider is outside this plot's time range."* `requestThumbnailCapture`
  is never invoked (SC-004).
- **Shortcut pressed outside the Map Viewer.** The keybinding's
  `when: "debrief.mapFocused && debrief.plotOpen"` clause ensures the
  command never fires (SC-006); no toast appears.

## 5. Save / close / reopen round-trip (SC-005)

```
1. After one or more captures, press Ctrl+S. The plot is saved with the
   new Storyboard + Scene Features embedded in the FeatureCollection.
2. Close the plot (`debrief.closePlot` or close the tab).
3. Reopen via the STAC tree.
4. The Storyboard panel auto-rehydrates the Scene list — every Scene's
   viewport / timestamp / visible_feature_ids / feature_set_hash /
   thumbnail_asset_ref / provenance is byte-identical to its pre-save
   state (guarantee delegated to #215).
```

## 6. Code entry points

| Layer | File |
|---|---|
| Keybinding + command contribution | `apps/vscode/package.json` (`contributes.keybindings`, `contributes.commands`) |
| Command handler (orchestration) | `apps/vscode/src/commands/captureScene.ts` |
| Per-Scene PNG writer (atomic) | `apps/vscode/src/services/sceneThumbnailService.ts` |
| MapPanel setFeatures / getCurrentFeatures | `apps/vscode/src/webview/mapPanel.ts` |
| Minimal panel React component | `shared/components/src/panels/StoryboardPanel/` |
| Webview view provider | `apps/vscode/src/views/storyboardPanelView.ts` |
| Webview entry point | `apps/vscode/src/webview/web/storyboardPanel.tsx` |
| Activation wiring | `apps/vscode/src/extension.ts` (search for `debrief.captureScene`) |
