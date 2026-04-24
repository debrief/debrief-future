# Usage Example: Storyboard Panel + Playback (#217)

A walk-through of the end-to-end user experience the slice lands.

## Prerequisites

- A plot with at least one captured Storyboard (created via #216's `Ctrl/Cmd+Alt+C`).
- Two Storyboards ideally, for the multi-Storyboard switch step (e.g., "North approach" + "South approach").
- One Scene per Storyboard that references features — leave one Scene to be broken deliberately for the hard-block step.

## Walk-through

### 1. Open a plot with a captured Storyboard

1. VS Code → Explorer → open a STAC item (e.g., `exercise-alpha/item.json`).
2. Double-click to launch the Map Viewer. The `MapPanel` webview loads the plot's `FeatureCollection`, and the session-state store populates `viewport`, `currentTime`, `hiddenFeatureIds`, and the Storyboard list.

### 2. Open the Storyboard panel

Command Palette (`Ctrl+Shift+P`) → `Debrief: Show Storyboard Panel`. The panel mounts in the Debrief activity bar. The active Storyboard is resolved via `getMostRecentlyModifiedStoryboard(plot)` (design-fix B / R7 — ties broken by `storyboard.properties.id` ascending).

```
┌─ Storyboard ────────────────────────────┐
│ [▾ North approach (3)        ] [⋯ menu] │
│ ─────────────────────────────────────── │
│ [◀ Prev]    Scene 1 of 3    [Next ▶]   │
│ ─────────────────────────────────────── │
│ ░░░ 00:00Z   Approach — visual contact  │
│ ░░░ 00:15Z   Turn to intercept course   │
│ ░░░ 00:30Z   Closest point of approach  │
└─────────────────────────────────────────┘
```

### 3. Forward through Scenes

Two entry points — both map to the same command:

- Click the **Next ▶** button in `TransportRow`.
- Focus the panel and press **Right-arrow** (scoped: `when: "focusedView == 'debrief.storyboardPanel'"`).

Both route through `vscode.commands.executeCommand('debrief.storyboard.forward')` → `StoryboardPlaybackService.forward(documentUri)`.

**Per Scene transition the service:**
1. Computes the next Scene from `listScenesOrdered(plot)` (#215 query).
2. Calls `detectMissingDataForScene` — if it returns a blocker, pops the `HardBlockModal` (step 6).
3. Allocates a fresh `transitionId`, sets `transport.transitionInFlight = true`.
4. Calls `MapPanel.flyToViewport(scene.viewport, durationMs)` — Leaflet `L.Map.flyTo({center, zoom, duration: durationMs/1000, easeLinearity: 0.25})`.
5. Calls `TimeRangeViewProvider.setScrubbableRange(sceneStart, sceneEnd)` — narrows the scrubber's `start`/`end` to the Scene window while preserving `dataStart`/`dataEnd` (R2 finding — see `docs/project_notes/bugs.md`).
6. Emits a webview snapshot with the new `currentSceneId`, which re-ranks `SceneRectangleLayer` (bolder stroke on the active rectangle).
7. Awaits **any one of three** transition-clear triggers — Leaflet `moveend`, `WebviewView.onDidChangeVisibility(false)`, or a `durationMs + 250ms` safety timer (research.md R8 / data-model.md L92). Idempotent by token — later triggers are no-ops.

### 4. Scrub within a Scene segment

Inside the time-slider, click-and-drag the scrubber. Because `setScrubbableRange` narrowed `start`/`end`, the handle is clamped to the current Scene's time window (FR-PLAY-012). The UX compromise documented in T004/R2: the scrubber track itself visually shrinks rather than rendering a "full range with a narrowed handle" affordance.

### 5. Switch Storyboards via the header dropdown

Click the Storyboard name in the panel header. The dropdown lists every Storyboard via `StoryboardOptionViewModel` (id, name, sceneCount, lastModifiedIso). Select "South approach".

Per switch:
1. `onActiveStoryboardChange(storyboardId)` fires; command `debrief.storyboard.setActive` is dispatched.
2. `PlaybackService.setActiveStoryboard` mutates the service's cached active ID and emits a snapshot — Scenes list re-sorted, transport state reset (`sceneNumber = 1 of N`).
3. `MapPanel.setSceneRectangles(newScenes, newActiveId, newCurrentSceneId)` posts a fresh `setSceneRectangles` webview message. The rectangles for the previous Storyboard are removed; the new Storyboard's rectangles are rendered via `SceneRectangleLayer`.

### 6. Hit a hard-block on a Scene with a deleted feature

Delete one feature that a Scene references (via #215's `removeFeature` or the Layers panel). Open that Scene — either by clicking the Scene row or by pressing Forward/Backward past it.

`detectMissingDataForScene` returns `{ kind: 'deleted', featureIds: [...] }`. The service does **not** transition; instead the webview renders the `HardBlockModal`:

```
┌─ Cannot open Scene ─────────────────────┐
│ Some features this Scene references     │
│ are no longer in the plot:              │
│ • SS Valiant                            │
│ • HMS Example                           │
│                                         │
│   [ Jump Past ]     [ Cancel ]          │
└─────────────────────────────────────────┘
```

Two other blocker kinds surface the same modal with different wording:
- `hidden` — features exist but are in `hiddenFeatureIds` (spec.md US1.AS-4)
- `timestamp-out-of-range` — Scene's `properties.timestamp` is outside the plot's time extent

### 7. Click Jump Past

`Jump Past` dispatches `debrief.storyboard.jumpPast` → `PlaybackService.jumpPast(documentUri, sceneId)`. The service:
1. Advances to Scene N+1 (or N-1 depending on direction) using `listScenesOrdered`.
2. If the next Scene is **also** blocked, the modal re-displays with the new blocker (chain walking — never attempts more than N Scenes to avoid infinite loops).
3. If the last Scene is blocked, the modal closes and the panel signals disabled transport (spec.md US1.AS-6).

## Sequence of events — Forward button click

```
User
 │  clicks Next ▶ (or presses Right-arrow while panel focused)
 ▼
StoryboardPanel.tsx (webview React)
 │  postMessage({type: 'transportForward'})
 ▼
storyboardPanelView.ts (extension host)
 │  vscode.commands.executeCommand('debrief.storyboard.forward', documentUri)
 ▼
storyboardCommands.ts
 │  StoryboardPlaybackService.forward(documentUri)
 ▼
StoryboardPlaybackService.forward()
 │  1. detectMissingDataForScene → (clear | HardBlock)
 │  2. allocate transitionId
 │  3. MapPanel.flyToViewport(next.viewport, durationMs)
 │  4. TimeRangeViewProvider.setScrubbableRange(start, end)
 │  5. emit snapshot
 │  6. wait for any-of-three clear triggers → transitionId = null
 ▼
Webview re-renders
 │  TransportRow shows new "Scene 2 of 3"
 │  SceneRectangleLayer highlights new current Scene
 ▼
Done
```

## Command IDs (reference)

| Command | Keybinding | `when` clause |
|---------|------------|---------------|
| `debrief.storyboard.forward` | Right-arrow | `focusedView == 'debrief.storyboardPanel'` |
| `debrief.storyboard.backward` | Left-arrow | `focusedView == 'debrief.storyboardPanel'` |
| `debrief.storyboard.setActive` | — | — |
| `debrief.storyboard.create` | — | — |
| `debrief.storyboard.rename` | — | — |
| `debrief.storyboard.delete` | — | — |
| `debrief.storyboard.jumpPast` | — | — |
| `debrief.storyboardPanel.show` | — | — |

(Screenshot and GIF placeholders live in `screenshots/`; capture is deferred per Blocker #143 — see `screenshots/README.md`.)
