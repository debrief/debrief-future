# Time Controller UI/UX for VS Code Extension

## Problem

Analysts need to visualize track data evolving through time, not just as static positions. Without temporal playback, users can only see the current state of all tracks, missing critical patterns in movement, interactions, and timing.

## Proposed Solution

Build a **time controller** component for the VS Code extension's map view that provides:

### Controls
1. **Time position scrubber** — Drag to jump to any point in the loaded time range
2. **Play/Pause button** — Start/stop automatic time progression
3. **Time acceleration** — Adjust playback speed (1x, 2x, 4x, 8x, etc.)

### Behavior
- **Global scope** — Controller affects all loaded tracks simultaneously
- **Map synchronization** — Map displays track positions at the current time
- **Time display** — Shows current time position in human-readable format

### UI Location
- Lives in the VS Code activity pane (alongside other Debrief controls)
- Compact horizontal layout suitable for panel width

## Success Criteria

- [ ] User can scrub through time and see tracks update on map
- [ ] Play button animates tracks forward through time
- [ ] Acceleration controls allow faster-than-realtime playback
- [ ] Time position clearly displayed
- [ ] Works with all loaded tracks (no per-track controls needed)
- [ ] Works fully offline (CONSTITUTION requirement)

## Constraints

- Must work within VS Code webview constraints
- Part of shared-react-components library for reuse
- No network dependencies (offline-first)

## Out of Scope

- Per-track individual time controls
- Recording/export of playback as video
- Time filtering (showing/hiding tracks by time range)
