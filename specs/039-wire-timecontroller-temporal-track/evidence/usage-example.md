# Usage Example: 039 — Wire TimeController to TemporalTrackLayer

## Workflow

1. **Load a REP file** in VS Code with the Debrief extension
2. **Open the Time Range panel** in the sidebar (the TimeController UI)
3. **Scrub the time slider** — the map updates in real-time:
   - In **Full mode**: All tracks remain visible; a highlight marker (circle) appears at each track's position for the current time
   - In **Trail mode**: Each track renders as a "snail trail" from its start point up to the current time position
4. **Toggle display mode** via the TimeController UI — the map immediately switches rendering mode
5. **Play/pause playback** — tracks animate automatically at the selected speed

## Data Flow

```
User scrubs TimeController slider
  → timeController.tsx sends postMessage { type: 'timeChange', time }
  → TimeRangeViewProvider receives → calls SessionStore.setCurrentTime()
  → subscribeToTemporal fires in MapPanel
  → MapPanel sends { type: 'setCurrentTime', time } to map webview
  → map.ts handleSetCurrentTime → trackRenderer.setCurrentTime(time)
  → TrackRenderer.applyTemporalState():
      For each track:
        Binary search timestamps for nearest point (O(log n))
        Full mode: restore full polyline + move highlight marker
        Trail mode: slice coordinates and update polyline via setLatLngs()
```

## Key Implementation Details

- **Timestamp caching**: ISO strings parsed to epoch ms once on track load (not per frame)
- **Binary search**: O(log n) point lookup per track per frame via `findNearestPointIndex`
- **Efficient rendering**: `polyline.setLatLngs()` updates coordinates without recreating DOM elements
- **Highlight markers**: `L.circleMarker` per track in full mode, reused and repositioned
- **DisplayMode mapping**: Session state `'normal'/'snailTrail'` ↔ webview `'full'/'trail'`
