# Usage example: Storyboard edit polish loop

**Feature**: 230 | **Captured**: 2026-04-24

This walkthrough demonstrates the polish loop an analyst can now drive from inside the Storyboard panel — no command palette, no modal dialogs.

## Setup

- Open a plot with at least two Scenes in the active Storyboard.
- Verify the panel renders the Scene list with each row showing a chevron on the left and an overflow (⋯) trigger on the right.

## 1. Edit a Scene's description via the chevron (US1 / FR-001)

1. Click the chevron (▶) on the first Scene row.
2. The chevron flips to ▼, `aria-expanded` goes to `true`, and the `<SceneEditForm>` opens inline beneath the row.
3. Edit the description textarea. Click **Save**.
4. Observable: the form closes, the row re-renders with the updated description, and a Log Panel card records the edit.

Reducer trace:

```text
Initial: { editFormOpenFor: null }
User clicks chevron on sceneA:
  dispatch({ type: 'expand-row-toggle', sceneId: 'sceneA' })
Result:  { editFormOpenFor: 'sceneA' }

Form submit (Save):
  vscode.postMessage({ type: 'scene-description-edit-submitted',
                       sceneId: 'sceneA',
                       description: 'Fleet departs port bearing 045°.' })
Extension → Webview:
  scenes-message with the updated sceneEditViewModels
Webview local dispatch:
  dispatch({ type: 'scene-edit-form-close' })
Result:  { editFormOpenFor: null, sceneEditViewModelsFromExtension: <updated> }
```

## 2. Delete a Scene and undo (US2 / FR-005)

1. Right-click any Scene row (or press `Shift+F10` with the row focused).
2. Overflow menu appears with six items: **Edit description**, **Update to current**, **Duplicate**, **Copy to other storyboard**, **Delete**, **Refresh thumbnail**.
3. Pick **Delete**. The row soft-removes from the list and an Undo toast appears at the bottom of the panel.
4. Click **Undo** in the toast within the session. The Scene restores to its original position and a Log Panel card records the undo.

Reducer trace:

```text
User right-clicks sceneB:
  dispatch({ type: 'overflow-menu-open',
             sceneId: 'sceneB',
             anchorRect: DOMRect })
User clicks Delete:
  vscode.postMessage({ type: 'scene-delete-requested', sceneId: 'sceneB' })
  dispatch({ type: 'overflow-menu-close' })

Service completes soft-delete → emits inbound messages:
  scene-undo-toast-shown {toast: {sceneId:'sceneB',…}}
  scenes-message (sceneB omitted)

User clicks Undo:
  vscode.postMessage({ type: 'scene-undo-delete-clicked', sceneId: 'sceneB' })
Service restores → emits inbound:
  scenes-message (sceneB restored)
  scene-undo-toast-shown {toast: null}
```

## 3. Refresh all stale Scenes from the Storyboard header (US3 / FR-012)

1. Open a plot where source features have diverged since Scenes were captured.
2. Affected rows render a red `<StaleBadge>` with a tooltip listing unresolved feature IDs (`track-alpha`, `track-bravo`).
3. Click **Refresh all stale (N)** in the Storyboard header.
4. Each stale Scene's thumbnail regenerates; each produces its own Log Panel card; the badges clear on success.

Reducer trace:

```text
Extension → Webview:
  scene-stale-flags-updated { flags: [
    { sceneId: 'sceneA', stale: true, unresolvedFeatureIds: ['f1','f2'] },
    { sceneId: 'sceneC', stale: true, unresolvedFeatureIds: ['f3'] },
  ]}
Panel state: staleFlags = Map({sceneA: {…, stale:true}, sceneC: {…, stale:true}})

User clicks Refresh all stale (2):
  vscode.postMessage({ type: 'storyboard-refresh-all-stale-clicked',
                       storyboardId: 'sb-primary' })
Service refreshes each → emits:
  scene-stale-flags-updated { flags: [] }
Panel state: staleFlags = Map() — badges clear.
```

## 4. Drive the same flows from the web-shell harness (US4)

- Navigate to `http://localhost:5173/?storyboard-edit-harness=1` in a browser.
- The panel renders against the in-memory mock extension port with three fixture Scenes.
- Optional initial-state knobs:
  - `?stale=sceneA,sceneC` — start those Scenes stale.
  - `?pendingDelete=sceneB` — start that Scene pending-delete.
  - `?missingData=sceneC:track-alpha,track-bravo` — attach a missing-data descriptor.
- Every polish-loop flow above can be driven in the harness without VS Code.

## 5. Fresh-plot-open + immediate Capture no longer errors (US5 / FR-050)

Before this feature: opening a plot and immediately pressing Capture (before any pan/zoom) surfaced `Capture failed — map has not reported a viewport yet`.

After the fix:
- `MapView` emits an initial bounds report on mount + `map.whenReady`.
- The webview forwards `viewportChanged` with the full NW/NE/SE/SW polygon.
- `mapPanel.handleViewportChanged` sees `viewport.bounds` and updates the session-store viewport — capture succeeds cleanly.

## Log Panel card verification

Every successful edit op in the end-to-end test run asserts that a `[data-testid="log-panel-card"]` is emitted with the matching `data-op` attribute. FR-035 holds across the suite.
