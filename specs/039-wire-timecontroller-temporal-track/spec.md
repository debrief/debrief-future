# Spec 039: Wire TimeController to TemporalTrackLayer in VS Code Extension

**Status**: specified
**Backlog Item**: 039 (Bug)
**Complexity**: Medium (Sonnet)

## Problem

The TimeController sidebar UI and the TemporalTrackLayer rendering logic both exist as working shared components, but they are not connected in the VS Code extension. When the user moves the playhead in the TimeController, the map continues to render full static polylines via `TrackRenderer` — ignoring the current time and display mode entirely.

The message pipeline is partially wired:

1. TimeController fires `onTimeChange` → postMessage to extension host
2. `TimeRangeViewProvider` receives → updates `SessionStore`
3. `SessionStore` publishes temporal state change
4. `MapPanel` subscribes → sends `setCurrentTime` message to map webview
5. **`map.ts` receives `setCurrentTime` but has a TODO stub that does nothing** (`map.ts:677-682`)

Similarly, `displayMode` changes from the TimeController are not forwarded to the map webview at all.

## Goal

When the user interacts with the TimeController (scrubs time, plays/pauses, changes display mode), the map webview must update track rendering in real-time:

- **Full mode**: Render entire track polyline with a highlight marker at the current time position
- **Trail mode**: Render only the track segment from start up to the current time (snail-trail)

## Approach

The VS Code map webview uses vanilla JS with Leaflet (not React). The shared `TemporalTrackLayer` is a React component and cannot be used directly. Instead, port the **algorithms** from `temporal-utils.ts` (`findNearestPointIndex`, `sliceTrackToTime`) into the vanilla JS `TrackRenderer`, keeping the same binary-search logic.

### Why not convert to React?

The map webview is a mature vanilla JS/Leaflet implementation with selection management, result layers, location rendering, and undo/redo support. Converting to React would be a large, high-risk refactor outside the scope of this bug fix.

## Design

### New Message: `setDisplayMode`

Add a new `ExtensionToWebviewMessage` variant:

```typescript
export interface SetDisplayModeMessage {
  type: 'setDisplayMode';
  displayMode: 'full' | 'trail';
}
```

### TrackRenderer Changes

Extend `TrackRenderer` to support temporal rendering:

1. **New state**: `currentTime: number | null`, `displayMode: 'full' | 'trail'`
2. **New method**: `setCurrentTime(time: number): void` — updates current time and re-renders affected tracks
3. **New method**: `setDisplayMode(mode: 'full' | 'trail'): void` — updates display mode and re-renders
4. **New private method**: `renderTemporalTrack(track, time, mode)` — replaces the static polyline with a time-filtered one plus optional highlight marker
5. **Highlight markers**: In `full` mode, add a `L.circleMarker` at the interpolated position for the current time
6. **Trail rendering**: In `trail` mode, slice the polyline coordinates from start to the nearest point at current time

### Temporal Algorithms (ported from temporal-utils.ts)

Port these pure functions into a new file `apps/vscode/src/webview/web/temporalUtils.ts`:

- `findNearestPointIndex(timestamps: number[], targetTime: number): number` — binary search
- `sliceTrackToTime(coordinates, timestamps, targetTime)` — returns coordinate subset

The Track type already has `times: string[]` (ISO 8601 strings). Convert to epoch ms once on load and cache the numeric array per track.

### map.ts Changes

1. **`handleSetCurrentTime`**: Call `trackRenderer.setCurrentTime(message.time)`
2. **New `handleSetDisplayMode`**: Call `trackRenderer.setDisplayMode(message.displayMode)`
3. **Add `setDisplayMode` case** to the message handler switch

### MapPanel Changes

Forward `displayMode` changes from SessionStore to the map webview, similar to how `setCurrentTime` is already forwarded.

### TimeRangeViewProvider Changes

Ensure `displayModeChange` events from the TimeController webview are persisted to SessionStore and forwarded via the existing subscription mechanism.

## Data Flow (After Fix)

```
TimeController UI (sidebar)
  ├─ onTimeChange(time) → postMessage
  │    → TimeRangeViewProvider → SessionStore.setCurrentTime(time)
  │        → MapPanel subscribes → postMessage { type: 'setCurrentTime', time }
  │            → map.ts → trackRenderer.setCurrentTime(time)
  │                → re-render tracks with temporal filtering
  │
  └─ onDisplayModeChange(mode) → postMessage
       → TimeRangeViewProvider → SessionStore.setDisplayMode(mode)
           → MapPanel subscribes → postMessage { type: 'setDisplayMode', mode }
               → map.ts → trackRenderer.setDisplayMode(mode)
                   → re-render tracks in full/trail mode
```

## Files to Modify

| File | Change |
|------|--------|
| `apps/vscode/src/webview/web/temporalUtils.ts` | **New** — ported binary search and slice algorithms |
| `apps/vscode/src/webview/web/trackRenderer.ts` | Add temporal state, `setCurrentTime()`, `setDisplayMode()`, highlight markers |
| `apps/vscode/src/webview/web/map.ts` | Implement `handleSetCurrentTime`, add `handleSetDisplayMode` |
| `apps/vscode/src/webview/messages.ts` | Add `SetDisplayModeMessage` to `ExtensionToWebviewMessage` union |
| `apps/vscode/src/webview/mapPanel.ts` | Forward `displayMode` changes to map webview |
| `apps/vscode/src/views/timeRangeView.ts` | Ensure displayMode is persisted to SessionStore |

## Acceptance Criteria

1. Moving the TimeController playhead updates track rendering on the map in real-time
2. In **full** mode: entire track is visible with a highlight marker at the current time position
3. In **trail** mode: only the track segment from start to current time is rendered
4. Toggling display mode in TimeController updates the map immediately
5. Performance: binary search ensures O(log n) point lookup; re-rendering is efficient for tracks with thousands of points
6. No regressions: tracks still render correctly when no temporal state is active (currentTime is null)
7. Track selection, visibility, color, and tooltip behavior continue to work

## Testing Strategy

1. **Unit tests** for `temporalUtils.ts` — binary search edge cases, slicing behavior
2. **Manual verification** — load a REP file, confirm TimeController scrubbing updates the map
3. **Storybook** — existing TemporalTrackLayer stories serve as reference for expected behavior

## Out of Scope

- Converting the map webview to React
- Interpolating between track points (snap to nearest existing point)
- Time range filtering (existing `TimeFilter` class — separate concern)
- Keyboard shortcut forwarding from map to TimeController
