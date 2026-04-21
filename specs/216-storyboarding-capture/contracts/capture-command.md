# Contract: Capture Command

**Feature**: 216-storyboarding-capture
**Status**: Language-neutral contract. Drives `apps/vscode/src/commands/captureScene.ts` + its unit tests.

## 1. VS Code contribution

### `commands` contribution (`apps/vscode/package.json`)

```jsonc
{
  "command": "debrief.captureScene",
  "title": "Capture Scene to Storyboard",
  "category": "Debrief",
  "icon": "$(device-camera)"
}
```

### `keybindings` contribution

```jsonc
{
  "command": "debrief.captureScene",
  "key": "ctrl+alt+c",
  "mac": "cmd+alt+c",
  "when": "debrief.mapFocused && debrief.plotOpen"
}
```

The compound `when`-clause guarantees SC-006 (scoped shortcut): the
keybinding does not fire unless the Map Viewer has focus **and** a
plot is open. Both context keys are already managed by
`mapPanel.ts` (focus) and `extension.ts` (plot open).

### `menus` contribution — panel toolbar button

```jsonc
"menus": {
  "view/title": [
    {
      "command": "debrief.captureScene",
      "when": "view == debrief.storyboardPanel && debrief.mapFocused && debrief.plotOpen",
      "group": "navigation"
    }
  ]
}
```

## 2. Command handler signature

```ts
// apps/vscode/src/commands/captureScene.ts

export async function captureScene(
  context: CaptureCommandContext,
): Promise<CaptureResult>;

interface CaptureCommandContext {
  readonly mapPanel: MapPanel;
  readonly sessionStore: SessionStoreApi;
  readonly sessionManager: SessionManager;
  readonly stacItemPath: string;
  readonly trigger:
    | { source: "keybinding" }
    | { source: "panelButton" }
    | { source: "programmatic" };
}
```

`CaptureResult` is fully defined in
[data-model.md §3](../data-model.md#3-capturesceneinput-internal-command-handler-input).

## 3. Happy-path control flow

Numbered steps; each maps to at least one unit test.

1. **Single-flight guard**: if `captureInFlight === true`, return
   `{ status: "cancelled", reason: "capture-in-flight" }` without
   toasting. Status-bar hint fires.
2. **Set in-flight**: `captureInFlight = true`. Post
   `{ type: "captureInFlight", inFlight: true }` to the Storyboard
   panel webview if it's visible.
3. **Read snapshot**:
   ```ts
   const state       = sessionStore.getState();
   const viewport    = state.spatial.viewport;
   const currentTime = state.temporal.currentTime;
   const timeRange   = state.temporal.timeRange;
   const hiddenIds   = new Set(state.features.hiddenFeatureIds);
   const plot        = mapPanel.currentPlot;          // FeatureCollection
   ```
4. **Validate snapshot** (rejects early, before any thumbnail call):
   - `viewport === null`          → `rejected: "viewport-unavailable"`
   - `currentTime === null`       → `rejected: "currenttime-unavailable"`
   - `currentTime < timeRange.start || currentTime > timeRange.end`
                                  → `rejected: "currenttime-out-of-range"` (SC-004)
   - `plot === null`              → `rejected: "no-plot-open"` (should be unreachable due to `when`-clause)
5. **Derive Scene inputs**:
   ```ts
   const timestampIso   = new Date(currentTime).toISOString();
   const center         = calculateViewportCenter(viewport);
   const zoom           = inferZoomFromPolygon(viewport);
   const visibleIds     = plot.features
     .filter((f) => f.properties?.id && !hiddenIds.has(f.properties.id))
     .map((f) => f.properties.id);
   ```
6. **Resolve active Storyboard** (or trigger first-capture prompt):
   ```ts
   let activeStoryboardId: string;
   const existing = getActiveStoryboardDefault(plot);
   if (existing !== null) {
     activeStoryboardId = existing.properties.id;
   } else {
     const name = await promptForStoryboardName(plot);  // showInputBox
     if (name === undefined) {
       return { status: "cancelled", reason: "user-dismissed-name-prompt" };
     }
     const { plot: plot1, storyboard } = await createStoryboard(plot, {
       name, actor: sessionManager.actor,
     });
     mapPanel.swapPlot(plot1);
     activeStoryboardId = storyboard.properties.id;
   }
   ```
   After `createStoryboard` returns, MapPanel holds the new plot; the
   rest of the flow uses `mapPanel.currentPlot`.
7. **Capture thumbnail**:
   ```ts
   const thumbnails = await mapPanel.requestThumbnailCapture(5000);
   if (thumbnails.largePngBase64 === null || thumbnails.smallPngBase64 === null) {
     return { status: "rejected", reason: "thumbnail-failed" };
   }
   ```
8. **Write per-Scene PNGs + update item.json.assets**: delegated to
   `sceneThumbnailService.writeSceneThumbnail(...)` (see
   [scene-thumbnail-service.md](scene-thumbnail-service.md)). Returns
   the asset key `scene-thumbnail-{sceneId}`. Because the asset key
   embeds the `sceneId` we need to generate the ULID *before* the
   write — done by passing an `idOverride` UUID to `createScene`.
   Decision: let #215 generate the ULID, then write the PNG with
   that ULID's asset key — order is:
   1. `createScene` with a placeholder `thumbnail_asset_ref: ""` is
      **not** acceptable (spec requires non-empty reference).
   2. Therefore, the handler pre-generates the ULID via `ulid()`
      (already a dep via #215), passes it as `idOverride`, and uses
      the same ULID for the asset key.
9. **Call #215 CRUD**:
   ```ts
   try {
     const sceneId = ulid();
     const assetKey = await sceneThumbnailService.writeSceneThumbnail(
       context.stacItemPath, sceneId, thumbnails.largePngBase64, thumbnails.smallPngBase64,
     );
     const { plot: nextPlot, scene } = await createScene(
       mapPanel.currentPlot,
       {
         storyboardId: activeStoryboardId,
         viewport: { center, zoom, bearing: 0 },
         timestamp: timestampIso,
         visibleFeatureIds: visibleIds,
         thumbnailAssetRef: assetKey,
         actor: sessionManager.actor,
         idOverride: sceneId,
       },
     );
     mapPanel.swapPlot(nextPlot);
     sessionManager.markDirty(plot.id);
     await commands.executeCommand("debrief.storyboardPanel.focus");
     return { status: "captured", scene };
   } catch (err) {
     if (err instanceof DuplicateTimestampError) {
       return handleDuplicateTimestamp(err, /* …state… */);
     }
     return { status: "rejected", reason: "unexpected", error: err };
   }
   ```
10. **Reset in-flight**: in `finally`, `captureInFlight = false`;
    post `{ type: "captureInFlight", inFlight: false }` to panel.

## 4. Duplicate-timestamp subflow (`handleDuplicateTimestamp`)

Entered only when step 9 throws `DuplicateTimestampError`.
Parameters: the error, the collected Scene inputs, and a recursion
counter.

```ts
async function handleDuplicateTimestamp(
  err: DuplicateTimestampError,
  inputs: CreateSceneInput,
  retries: number = 0,
): Promise<CaptureResult> {
  if (retries >= 5) {
    void window.showErrorMessage(
      "Too many consecutive offset retries — pick a different moment in time.",
    );
    return { status: "rejected", reason: "duplicate-offset-limit-exceeded" };
  }
  const choice = await window.showInformationMessage(
    `A scene already exists at ${formatDtg(inputs.timestamp)}.`,
    { modal: true },
    "Replace",
    "Offset (+1 s)",
  );
  switch (choice) {
    case "Replace":
      return performReplace(err.conflictingSceneId, inputs);
    case "Offset (+1 s)":
      const offsetIso = new Date(
        new Date(inputs.timestamp).getTime() + 1000,
      ).toISOString();
      return retryCreateScene({ ...inputs, timestamp: offsetIso }, retries + 1);
    case undefined:
      return { status: "cancelled", reason: "user-dismissed-duplicate-prompt" };
  }
}
```

`performReplace` calls `deleteScene` with the conflicting sceneId
then `createScene` with the original inputs.
`retryCreateScene` is the `createScene` + catch block factored out
so it can recurse through this subflow without duplicating step 9.

## 5. Error-to-UI mapping

| `CaptureResult` variant | User-visible effect |
|---|---|
| `captured` | Panel focused + success toast "Scene captured — {DTG}" |
| `cancelled: user-dismissed-name-prompt` | Silent return |
| `cancelled: user-dismissed-duplicate-prompt` | Silent return |
| `cancelled: capture-in-flight` | Status-bar message "Capture in progress…" (auto-clears after 2 s) |
| `rejected: map-not-focused` | Unreachable (guarded by `when`-clause); treat as a programming error (log to output channel) |
| `rejected: no-plot-open` | Unreachable; same as above |
| `rejected: viewport-unavailable` | Error toast "Capture failed — map has not reported a viewport yet. Pan or zoom the map and try again." |
| `rejected: currenttime-unavailable` | Error toast "Capture failed — the time slider is not set." |
| `rejected: currenttime-out-of-range` | Error toast "Capture failed — time slider is outside this plot's time range." |
| `rejected: thumbnail-failed` | Error toast "Capture failed — could not produce thumbnail. Scene not saved." |
| `rejected: duplicate-offset-limit-exceeded` | Error toast (see subflow) |
| `rejected: unexpected` | Error toast "Capture failed — unexpected error. See Debrief output channel for details." + write `error.stack` to the Debrief output channel |

## 6. Test matrix (happy + every reject / cancel branch)

Implemented in `apps/vscode/src/commands/__tests__/captureScene.test.ts`
with mocked `MapPanel`, `SessionStoreApi`, `SessionManager`,
`sceneThumbnailService`, and `@debrief/components/storyboard`.

| Test | Covers |
|---|---|
| `first capture prompts for Storyboard name` | FR-CAP-003, step 6 first-capture branch |
| `dismissed name prompt aborts without dirty or thumbnail call` | Edge case "Quick-pick dismissed"; asserts `requestThumbnailCapture` not called |
| `subsequent capture appends to active Storyboard without prompting` | FR-CAP-005, step 6 happy branch |
| `active Storyboard resolves to most recently modified via #215` | FR-CAP-005 |
| `scene title defaults to DTG of timestamp` | FR-CAP-011 (via `formatDtg` called with the scene's `timestamp`) |
| `out-of-range timestamp rejected before thumbnail invocation` | SC-004 — assert `requestThumbnailCapture` not called |
| `viewport null rejects before thumbnail invocation` | Step 4 |
| `thumbnail failure produces no Scene and no dirty flag change` | SC-002 |
| `duplicate timestamp shows modal prompt` | FR-CAP-010 |
| `duplicate — Replace overwrites existing scene` | FR-CAP-010 Replace branch |
| `duplicate — Offset retries at +1s` | FR-CAP-010 Offset branch |
| `duplicate — Offset retried 5× shows dead-end toast` | Safety cap |
| `duplicate — Cancel abandons without write` | FR-CAP-010 Cancel branch |
| `duplicate Storyboard name blocks prompt confirm button` | FR-CAP-004 (via `validateInput` returning a string) |
| `second shortcut press while in-flight is silently ignored` | Single-flight edge case |
| `markDirty called exactly once on happy path, never on failure paths` | SC-002 structural guarantee |
| `commands.executeCommand('debrief.storyboardPanel.focus') fires on success` | FR-CAP-013 |
| `success posts captureInFlight:false on panel` | UI State consistency |

## 7. Non-goals

- No undo/redo for Replace. #218 owns soft-delete + undo.
- No multi-Storyboard selection UI in this command. The panel may
  one day allow the user to choose which Storyboard to append to —
  #217's concern, not this spec's.
- No telemetry. The `trigger.source` field is captured for future
  observability; #216 does not send it anywhere.