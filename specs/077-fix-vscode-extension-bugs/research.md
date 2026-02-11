# Research: Fix VS Code Extension Bugs

**Feature**: 077-fix-vscode-extension-bugs
**Date**: 2026-02-10

## Research Questions

### RQ-1: Why does the time slider not update the map?

**Finding: Type mismatch between Track.times (ISO strings) and temporal-utils (expects epoch ms)**

The message chain from TimeController to the map webview works correctly:
1. TimeController sends epoch ms via `postMessage('timeChange', time)`
2. `timeRangeView.ts` converts to `TimeInstant` and stores in session
3. `MapPanel` receives via `subscribeToTemporal()` and sends `setCurrentTime` to map webview
4. `mapView.tsx` sets `currentTime` state (epoch ms)
5. `MapView` passes `currentTime` to `TemporalTrackLayer`

**The break occurs at step 6:**
- `Track.times` is `string[]` (ISO 8601: `"2024-01-15T10:00:00Z"`) — see `apps/vscode/src/types/plot.ts:116`
- `trackToFeature()` in `mapView.tsx:52` copies `times` as-is into feature properties
- `extractTemporalData()` in `temporal-utils.ts:106` casts `times` to `number[]`
- `findNearestPointIndex()` compares ISO strings against epoch numbers — fails silently

**Evidence:**
- `Track` type: `times: string[]` (plot.ts:116)
- `trackToFeature()`: `times: track.times` (mapView.tsx:52) — no conversion
- `extractTemporalData()`: `times as number[] | undefined` (temporal-utils.ts:106) — expects numbers
- `findNearestPointIndex()`: `targetTime <= timestamps[0]!` (temporal-utils.ts:38) — compares string to number
- Test fixtures use `number[]`: `sampleTracks.ts` creates epoch ms arrays

**Decision**: Convert ISO strings to epoch ms in `trackToFeature()` when building DebriefFeature from Track.
**Rationale**: The conversion belongs at the boundary between the STAC/webview messaging layer (which uses ISO strings) and the shared rendering layer (which uses epoch ms). `trackToFeature()` is this boundary.
**Alternatives considered**:
- Convert in `extractTemporalData()` — rejected because it would make the shared component aware of VS Code-specific data formats
- Convert in `stacService.ts` (change Track.times to `number[]`) — rejected because it changes the data contract across all consumers; ISO strings are the correct format for STAC/GeoJSON

### RQ-2: Why is the location marker missing in Full mode?

**Finding: Same root cause as RQ-1**

The location marker rendering depends on `findNearestPointIndex()` returning a valid index. Since the function receives ISO strings instead of epoch numbers, `nearestIndex` is always `-1` or wrong, and `showMarker` evaluates to `false`.

From `useTemporalTrack.ts:65`:
```typescript
const showMarker = nearestIndex >= 0 && currentTime >= timeExtent[0];
```

When `timeExtent[0]` is an ISO string like `"2024-01-15T10:00:00Z"` and `currentTime` is `1705315200000`, the comparison `currentTime >= timeExtent[0]` may return `true` (string coercion), but `nearestIndex` will be wrong due to the failed binary search.

**Decision**: Fixing the times conversion in RQ-1 will also fix the location marker.

### RQ-3: Why doesn't Trail mode render tracks?

**Finding: Same root cause as RQ-1**

Trail mode calls `sliceTrackToTime()` which internally calls `findNearestPointIndex()`. With string timestamps:
- `targetTime < timestamps[0]!` — comparing number to string returns `false` unpredictably
- The binary search returns wrong indices
- `coordinates.slice(0, nearestIndex + 1)` may return empty or wrong data

**Decision**: Fixing the times conversion in RQ-1 will also fix trail mode.

### RQ-4: Why are tools not offered when features are selected?

**Finding: Two potential issues identified**

**Issue A: CalcService availability**
- `CalcService.listTools()` requires Python with `debrief_calc` installed
- If unavailable, the circuit breaker opens after 3 failures
- `ToolMatchAdapter` is created with empty tools array → nothing matches
- This explains "no tools offered" in any environment where Python calc isn't configured

**Evidence:** `calcService.ts:111-124` checks circuit breaker; `extension.ts` loads tools asynchronously

**Issue B: Selection callback not registered for reused panels**
- `openPlot.ts:181-207`: Selection callback registered only inside `if (!panel)` block
- When panel is reused (second plot opened), callback is NOT re-registered
- Webview selections won't propagate to ToolMatchAdapter for reused panels
- However, for FIRST load, the callback IS registered correctly

**Evidence:** `openPlot.ts:167-232` — callback registration at line 189 is inside `if (!panel)` at line 181

**Decision**: Fix both issues:
1. Ensure tools load gracefully (already handled by existing circuit breaker)
2. Move selection callback registration outside the `if (!panel)` block, or re-register on every plot open
**Rationale**: Issue B is a definite code bug regardless of whether it's the current root cause.
**Alternatives considered**:
- Only fix Issue A (check Python availability) — rejected because Issue B is a real bug that will cause problems
- Use session state subscription instead of callback — rejected because the direct callback path is needed for immediate updates

### RQ-5: Is the session manager properly connecting panels?

**Finding: Session manager wiring is correct but only for new panels**

From `openPlot.ts:186`: `panel.setSessionManager(sessionManager)` is inside the `if (!panel)` block, meaning the session manager is only wired for new panels.

However, `mapPanel.ts:573-583` shows that `setSessionManager()` subscribes to active session changes, and these subscriptions persist across plot loads since the panel isn't recreated.

The session manager's `setActiveDocument()` call at `openPlot.ts:164` correctly activates the session for the new plot, which triggers the existing subscription.

**Decision**: Session manager wiring is not the issue for time/temporal propagation. The issue is purely the times type mismatch.

## Summary of Root Causes

| Bug | Root Cause | Fix Location |
|-----|-----------|-------------|
| Time slider non-functional | `Track.times` is ISO strings, temporal-utils expects epoch ms | `mapView.tsx:trackToFeature()` |
| Missing location marker | Same as above (binary search fails → no marker position) | Same fix |
| Trail mode not rendering | Same as above (slicing with wrong timestamps → empty/wrong result) | Same fix |
| Tools not offered | (A) CalcService unavailable + (B) callback not registered for reused panels | `openPlot.ts:181-207` |
