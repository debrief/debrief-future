# Feature Integration: Storyboarding Playback (#217)

How `StoryboardPlaybackService` composes with `#215 CRUD`, `MapPanel`, `TimeRangeViewProvider`, and the session-state store to deliver guided walk-throughs of recorded exercises.

## Mermaid sequence — Forward button → flyTo + scrubbable-range shrink

```mermaid
sequenceDiagram
    participant User
    participant Panel as StoryboardPanel (webview)
    participant Pv as storyboardPanelView.ts
    participant Cmd as storyboardCommands.ts
    participant Svc as StoryboardPlaybackService
    participant Crud as #215 storyboard module
    participant Map as MapPanel
    participant MV as MapView (webview) + SceneRectangleLayer
    participant Trv as TimeRangeViewProvider
    participant TC as TimeScrubber (webview)

    User->>Panel: Click "Next ▶" (or Right-arrow)
    Panel->>Pv: postMessage({type:'transportForward'})
    Pv->>Cmd: vscode.commands.executeCommand('debrief.storyboard.forward', documentUri)
    Cmd->>Svc: forward(documentUri)

    Svc->>Crud: listScenesOrdered(plot)
    Crud-->>Svc: Scene[]
    Svc->>Crud: detectMissingDataForScene(plot, nextScene)
    alt Missing data
        Crud-->>Svc: { kind: 'deleted', featureIds }
        Svc->>Panel: snapshot { hardBlock: {...} }
        Panel->>User: HardBlockModal
    else Clear
        Crud-->>Svc: null
        Svc->>Svc: transitionId = freshToken()
        Svc->>Svc: transport.transitionInFlight = true

        par Parallel map fly + scrubber narrow
            Svc->>Map: flyToViewport(scene.viewport, durationMs)
            Map->>MV: webview message {type:'flyTo', token, center, zoom, durationMs}
            MV->>MV: L.Map.flyTo({duration: durationMs/1000, easeLinearity:0.25})
        and
            Svc->>Trv: setScrubbableRange(sceneStart, sceneEnd)
            Trv->>TC: webview message {type:'updateTimeExtent', dataStart, dataEnd, start, end}
            TC->>TC: clamp handle to [start, end]; shrink track visually
        end

        Svc->>Panel: snapshot { currentSceneId, transport: {sceneNumber: N+1} }
        Panel->>MV: Panel props now indicate new current Scene → SceneRectangleLayer re-renders
        MV->>MV: Bolder stroke on active rectangle

        alt Any of three clear triggers fires
            MV-->>Map: moveend webview message
            Map-->>Svc: onFlyToComplete(token)
        else
            Map-->>Svc: onDidChangeVisibility(false)
        else
            Svc->>Svc: setTimeout(durationMs + 250ms)
        end
        Svc->>Svc: clearTransition(token) - idempotent
        Svc->>Panel: snapshot { transport: {transitionInFlight: false} }
    end
```

## Hop-by-hop narrative

### Hop 1 — Panel → extension host (webview → extension)

- **File**: `apps/vscode/src/views/storyboardPanelView.ts` (`StoryboardPanelViewProvider`)
- The webview posts `{type:'transportForward'}`. The view provider receives it in `webview.onDidReceiveMessage` and dispatches `vscode.commands.executeCommand('debrief.storyboard.forward', this.documentUri)`.
- Why this hop exists: webviews can't import the extension API directly. The command channel is the contract; keyboard shortcuts (Right-arrow with scoped `when` clause) reuse the same command.

### Hop 2 — Command → service

- **File**: `apps/vscode/src/commands/storyboardCommands.ts`
- The command handler looks up the active `StoryboardPlaybackService` for the document and calls `service.forward(documentUri)`. Services are per-document (one per open plot) so the service can cache the plot's Scene list between calls.

### Hop 3 — Service → #215 CRUD queries

- **Files**: `shared/components/src/storyboard/queries.ts`, `shared/components/src/storyboard/detectMissingDataForScene.ts`
- The service calls `listScenesOrdered(plot)` to resolve the next Scene and `detectMissingDataForScene(plot, nextScene, hiddenFeatureIds, dataTimeRange)` to check for hard-block conditions. **Every query is pure** — the service never mutates the plot.
- Why here: centralising these checks in #215 means #217, #218, and any future playback tool share the same blocker semantics. The service is the scheduler; the CRUD module owns the rules.

### Hop 4 — Service → MapPanel.flyToViewport

- **File**: `apps/vscode/src/webview/mapPanel.ts` (`MapPanel.flyToViewport`)
- The service allocates a fresh monotonic `transitionId` and posts `{type:'flyTo', token, center, zoom, durationMs}` via `webview.postMessage`. The token is the service's handle to the pending transition.
- The webview's `MapView` component's `MapController` child responds by calling `L.Map.flyTo({duration: durationMs/1000, easeLinearity: 0.25})`. On `moveend`, it posts `{type:'flyToComplete', token}` back — one of the three transition-clear triggers.

### Hop 5 — Service → TimeRangeViewProvider.setScrubbableRange

- **File**: `apps/vscode/src/views/timeRangeView.ts`
- The service calls `trv.setScrubbableRange(sceneStart, sceneEnd)`. The provider posts `{type:'updateTimeExtent', dataStart, dataEnd, start, end}` to the Time Controller webview.
- **R2 finding (see `docs/project_notes/bugs.md`)**: the scrubber accepts `start`/`end` as a *clamp* and visually shrinks its track to the narrowed range. `dataStart`/`dataEnd` are preserved but not currently used as a "track outline" affordance. The scrub-lock requirement (FR-PLAY-012) is met by the clamp behaviour.

### Hop 6 — Scene rectangles (map overlay)

- **File**: `shared/components/src/MapView/SceneRectangleLayer.tsx`
- `MapPanel.setSceneRectangles(scenes, activeStoryboardId, currentSceneId)` posts a `setSceneRectangles` webview message. The layer renders one `<Polygon>` per Scene from `scene.geometry.coordinates` (Fix D — geometry is canonical; never recompute from `viewport.corners`).
- Opacity varies with overlap rank; current Scene has bolder stroke. Click stops propagation and fires `onSceneRectangleClick(sceneId)`.

### Hop 7 — Transition-clear triggers (the three-trigger invariant)

- **File**: `apps/vscode/src/services/storyboardPlaybackService.ts`
- **Any one of three** events calls `clearTransition(token)`:
  1. Leaflet `moveend` → `MapPanel.onFlyToComplete` event
  2. `WebviewView.onDidChangeVisibility(false)` — the panel was hidden mid-animation
  3. A `setTimeout(durationMs + 250ms)` safety timer
- `clearTransition` is **idempotent by token** — subsequent triggers with the same token are no-ops. This keeps the user from ever seeing a stuck `transitionInFlight=true` state (research.md R8).

## Composition map (who owns what)

| Concern | Owner | Why |
|---------|-------|-----|
| Scene ordering, blocker detection, Storyboard CRUD | `#215` storyboard module | Shared across #216, #217, #218; pure + schema-validated |
| Playback scheduling, three-trigger invariant, viewport transition token | `StoryboardPlaybackService` | Per-document; holds all mutable transition state |
| Map animation + rectangles | `MapPanel` / `MapView` / `SceneRectangleLayer` | Webview-local; accepts schema snapshots |
| Scrub-window lock | `TimeRangeViewProvider` | Already owns the scrubber webview; adding `setScrubbableRange` stays in-pattern |
| Panel UI (header + transport + list) | `shared/components` `StoryboardPanel` | Already existed at #216; extended via optional+defaulted props (design-fix 3) so every #216 test still compiles |
| Command dispatch + keybindings | `apps/vscode` command contributions | Standard VS Code extension plumbing |

## Source files (line refs)

- `apps/vscode/src/services/storyboardPlaybackService.ts` — service entry points (`forward`, `backward`, `setActiveStoryboard`, `jumpPast`)
- `apps/vscode/src/commands/storyboardCommands.ts` — command handlers routing to the service
- `apps/vscode/src/views/storyboardPanelView.ts` — webview ↔ command bridge; resolves `documentUri`
- `apps/vscode/src/webview/mapPanel.ts` — `flyToViewport`, `setSceneRectangles`, `onFlyToComplete`, `onSceneRectangleClick`, `onFeaturesChanged`
- `apps/vscode/src/views/timeRangeView.ts:125-131` — `updateTimeExtent` message shape (pre-existing; #217 reused)
- `apps/vscode/src/services/plotFromFeatures.ts` — `DebriefFeature[]` → `StoryboardPlot` boundary helper
- `shared/components/src/MapView/MapView.tsx` — `flyToTarget` prop + `onFlyToComplete` callback
- `shared/components/src/MapView/SceneRectangleLayer.tsx` — per-Scene `<Polygon>` rendering
- `shared/components/src/panels/StoryboardPanel/types.ts` — extended `StoryboardPanelProps` with optional+defaulted fields (design-fix 3)
- `shared/components/src/panels/StoryboardPanel/StoryboardHeader.tsx` — dropdown + overflow menu
- `shared/components/src/panels/StoryboardPanel/TransportRow.tsx` — Prev/Next + Scene count
- `shared/components/src/panels/StoryboardPanel/HardBlockModal.tsx` — deleted/hidden/out-of-range variants
- `shared/components/src/storyboard/queries.ts` — `getMostRecentlyModifiedStoryboard` (design-fix B / R7)
