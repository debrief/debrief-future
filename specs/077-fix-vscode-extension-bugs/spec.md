# Feature Specification: Fix VS Code Extension Bugs

**Feature Branch**: `077-fix-vscode-extension-bugs`
**Created**: 2026-02-10
**Status**: Draft
**Input**: GitHub Issue [#208](https://github.com/debrief/debrief-future/issues/208) — Four regressions in VS Code extension: time slider, location marker, trail mode, and tool offering

## Problem Statement

After recent feature work (052-tool-api-integration, 053-nested-child-selection, 071-log-recording-service, 074-snapshots), the VS Code extension has four functional regressions when loading the Exercise Alpha sample file:

1. **Time slider non-functional** — The TimeController displays the correct 0930-1400 time range, but dragging the slider produces no visual changes on the map
2. **Missing location marker** — In Full display mode, no red circle marker appears at the current time position on tracks
3. **Trail mode not rendering** — Switching to Trail mode produces an empty map (no track segments shown)
4. **Tools not offered** — Selecting features does not show any context-sensitive analysis tools

All four tracks and reference points load and render correctly as static features, and the TimeController displays the correct time range. The bugs are specifically in the reactive/temporal/selection subsystems.

## Architecture Context

The VS Code extension uses a multi-webview architecture with session state coordination:

```
TimeController Webview ──postMessage──> Extension Host (timeRangeView.ts)
                                              │
                                              ▼
                                     Session Store (Zustand)
                                              │
                                     subscribeToTemporal()
                                              │
                                              ▼
                                     MapPanel (mapPanel.ts)
                                              │
                                     postMessage('setCurrentTime')
                                              │
                                              ▼
                                     Map Webview (mapView.tsx)
                                              │
                                     React state → MapView component
                                              │
                                              ▼
                                     TemporalTrackLayer / TrackHighlightMarker
```

A break at any point in this chain would prevent time changes from reaching the map. Similarly, selection changes flow through session state to the ToolMatchAdapter for tool offering.

### Key Recent Changes (potential regression sources)

| Commit | Feature | Change | Potential Impact |
|--------|---------|--------|------------------|
| `b34cbb4` | 052 | Renamed FeatureKind to UI_TRACK/UI_LOCATION | Tool matching kind resolution |
| `6415ea8` | 052 | Standardized feature kinds to uppercase | Tool requirements matching |
| `3094cf4` | 052 | Used uppercase TRACK kind in resolveFeatures | Feature kind consistency |
| `9b2f239` | 053 | Nested child selection with path utilities | Selection ID format changes |
| `745ce15` | 071 | Log Recording Service implementation | Session store shape changes |
| `f603d32` | 074 | Snapshot service implementation | StacService changes |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Time Slider Updates Map (Priority: P1)

When the user drags the time slider, the map should update to reflect the current time position. This is the core temporal interaction — without it, the time controller is useless.

**Why this priority**: The time slider is the primary temporal navigation tool. All other temporal features (marker, trail mode) depend on time changes propagating to the map.

**Independent Test**: Load Exercise Alpha, drag the time slider — track rendering should update in real time.

**Acceptance Scenarios**:

1. **Given** Exercise Alpha is loaded with two tracks visible and TimeController showing 0930-1400, **When** the user drags the time slider from 0930 to 1200, **Then** the TemporalTrackLayer re-renders to reflect the new time position (verified by console log or visual change)
2. **Given** the time slider is at 1200, **When** the user drags it to 1000, **Then** the map updates to the new time position without delay or flicker
3. **Given** the time slider is at the start (0930), **When** the user clicks Play, **Then** the map continuously updates as time advances

---

### User Story 2 - Location Marker in Full Mode (Priority: P1)

In Full display mode, a red circle marker should appear on each track at the position corresponding to the current time. This gives the user a visual indicator of "where is the platform now?"

**Why this priority**: The location marker is the primary visual feedback for the current time position on tracks. Without it, the user cannot see the effect of time changes.

**Independent Test**: Load Exercise Alpha in Full mode, set time to midpoint — red markers should appear on both tracks at the interpolated positions.

**Acceptance Scenarios**:

1. **Given** Exercise Alpha loaded in Full mode with currentTime at 1100, **When** the map renders, **Then** a red circle marker (radius 8, fillColor #ff6b6b) appears on each track at the coordinate nearest to 1100
2. **Given** the location marker is visible at 1100, **When** the user drags the slider to 1200, **Then** the marker moves along the track to the 1200 position
3. **Given** currentTime is before the track's start time, **When** the map renders, **Then** no marker is shown for that track (marker only appears when currentTime >= track start)

---

### User Story 3 - Trail Mode Rendering (Priority: P2)

When the user switches to Trail mode, only the portion of each track from the start up to the current time should be visible. This is the "snail trail" mode that lets users see where platforms have been.

**Why this priority**: Trail mode is a key analytical feature but depends on time changes working correctly (US1).

**Independent Test**: Load Exercise Alpha, switch to Trail mode, drag slider — track should grow/shrink as time changes.

**Acceptance Scenarios**:

1. **Given** Exercise Alpha loaded with currentTime at 1200, **When** the user switches to Trail mode, **Then** only the track segment from 0930 to 1200 is visible (later segments hidden)
2. **Given** Trail mode is active with currentTime at 1100, **When** the user drags the slider to 1300, **Then** the visible track segment extends to include 1100-1300
3. **Given** Trail mode is active with currentTime before a track's start, **When** the map renders, **Then** that track is not visible (empty coordinates)
4. **Given** Trail mode is active, **When** the user switches back to Full mode, **Then** the entire track is visible again with the location marker

---

### User Story 4 - Context-Sensitive Tool Offering (Priority: P2)

When the user selects features on the map, the available analysis tools should update based on the selection. For example, selecting two tracks should offer range/bearing tools.

**Why this priority**: Tool offering is a core analytical workflow but is independent of the temporal bugs.

**Independent Test**: Load Exercise Alpha, click a track — available tools should appear in the activity panel.

**Acceptance Scenarios**:

1. **Given** Exercise Alpha loaded with debrief-calc available, **When** the user selects a single track, **Then** single-track tools (e.g., track stats, set color) appear in the tool offering panel
2. **Given** no features are selected, **When** the user selects two tracks, **Then** multi-track tools (e.g., range/bearing) appear
3. **Given** tools are shown for a two-track selection, **When** the user deselects one track, **Then** the tool list updates to show single-track tools only
4. **Given** debrief-calc is not available (circuit breaker open), **When** the user selects features, **Then** no tools are shown but no errors are thrown

---

### Edge Cases

- What happens when the time slider is dragged rapidly? (Debouncing/throttling should prevent excessive renders)
- What happens when a track has no temporal data (no `times` array)? (Should render as a static feature, not temporal)
- What happens when the session store is not yet initialized when the map webview loads? (Should handle gracefully, update when session becomes available)
- What happens when the Python calc service is unavailable? (Tool offering should degrade gracefully, not crash)
- What if feature IDs contain path separators from nested child selection (053)? (`getRoot()` should extract the root ID before kind lookup)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Time slider changes in the TimeController webview MUST propagate to the map webview and cause TemporalTrackLayer to re-render within 100ms
- **FR-002**: In Full display mode, a TrackHighlightMarker MUST appear at the nearest coordinate to the current time on each temporal track
- **FR-003**: In Trail display mode, each track MUST render only the segment from track start to the current time position
- **FR-004**: The ToolMatchAdapter MUST resolve feature kind correctly for all selected features and update the active tool list
- **FR-005**: The `subscribeToTemporal` callback in MapPanel MUST forward `currentTime` and `displayMode` changes to the map webview via postMessage
- **FR-006**: The `subscribeToSelection` callback in MapPanel MUST forward selection changes to the ToolMatchAdapter and update the tool offering panel
- **FR-007**: The `extractTemporalData` function MUST correctly extract `times` arrays from track features created by `trackToFeature()` in mapView.tsx
- **FR-008**: The `getFeatureKind` lookup in MapPanel MUST return the correct kind string for tracks ('TRACK'), locations ('POINT'), shapes ('SHAPE'), and results ('RESULT')
- **FR-009**: Feature paths containing nested child segments (from feature 053) MUST be resolved to root IDs before kind lookup via `getRoot()`

### Key Entities

- **Session Store (Zustand)**: Holds temporal state (`currentTime`, `displayMode`, `timeRange`) and selection state (`featureIds`). Source of truth for all reactive UI updates.
- **TemporalTrackLayer**: React component that renders a single track with time-aware rendering. Uses `useTemporalTrack` hook for binary search and coordinate slicing.
- **TrackHighlightMarker**: Red circle marker rendered at the current time position on a track in Full mode.
- **ToolMatchAdapter**: Bridges session selection (feature IDs) to ToolMatchService (kind counts). Uses `getFeatureKind` to resolve IDs to kinds.
- **MapPanel**: VS Code extension controller that bridges session state changes to the map webview via postMessage.

## Investigation Strategy

Each bug should be diagnosed by tracing the message flow and identifying where the chain breaks.

### Bug 1 & 2 & 3: Time Slider / Marker / Trail Mode

These three bugs share a common message chain. Investigate in order:

1. **TimeController → Extension Host**: Add console.log in `timeRangeView.ts` `timeChange` handler (line 222-235). Verify `message.time` arrives.
2. **Extension Host → Session Store**: Verify `state.setCurrentTime()` is called with a valid `TimeInstant`. Check that `createTimeInstant()` produces correct epoch/iso values.
3. **Session Store → MapPanel**: Verify `subscribeToTemporal` callback fires in MapPanel (line 638-651). Check that `temporal.currentTime` is not null.
4. **MapPanel → Map Webview**: Verify `postMessage({ type: 'setCurrentTime', time: ... })` is sent. Check webview `message` event handler in mapView.tsx (line 141-142).
5. **Map Webview → TemporalTrackLayer**: Verify `currentTime` state is set and passed to `MapView` component. Verify `extractTemporalData()` returns non-null for track features (check that `times` array exists and matches coordinates length).
6. **TemporalTrackLayer → GeoJSON**: Verify `renderKey` changes when `nearestIndex` changes, causing react-leaflet's `GeoJSON` component to remount with updated data.

### Bug 4: Tool Offering

1. **Selection → Session Store**: Verify `selectionChanged` message from map webview reaches mapPanel.ts and updates session state.
2. **Session Store → ToolMatchAdapter**: Verify `subscribeToSelection` callback fires and calls `adapter.updateSelection()`.
3. **ToolMatchAdapter → Kind Resolution**: Verify `getFeatureKind()` returns 'TRACK' for track IDs (not undefined). Check if feature 053's path-based IDs need `getRoot()` resolution.
4. **ToolMatchService → Active Tools**: Verify `getActiveTools()` returns non-empty array. Check that tool requirements use uppercase kind names matching `getFeatureKind()` output.
5. **CalcService → Tool List**: Verify `listTools()` successfully fetches tools from debrief-calc. Check if circuit breaker is open due to prior failures.

## File Inventory

### Message Flow Files (Time/Display)

| File | Role | Key Lines |
|------|------|-----------|
| `apps/vscode/src/webview/web/timeController.tsx` | TimeController webview entry | 108-138 (callbacks) |
| `apps/vscode/src/views/timeRangeView.ts` | Extension host time handling | 222-263 (message handlers) |
| `services/session-state/src/store/slices/temporal.ts` | Session store temporal slice | 37-94 (actions) |
| `apps/vscode/src/webview/mapPanel.ts` | Map panel controller | 638-651 (temporal subscription) |
| `apps/vscode/src/webview/web/mapView.tsx` | Map webview entry | 141-145 (message handlers) |
| `shared/components/src/MapView/MapView.tsx` | Shared map component | 214-228 (temporal/static split), 338-347 (TemporalTrackLayer render) |

### Temporal Rendering Files

| File | Role | Key Lines |
|------|------|-----------|
| `shared/components/src/MapView/TemporalTrackLayer.tsx` | Temporal track renderer | 29-107 (full component) |
| `shared/components/src/MapView/useTemporalTrack.ts` | Temporal render state hook | 38-74 (render state computation) |
| `shared/components/src/MapView/temporal-utils.ts` | Binary search and slicing | 30-64 (findNearestPointIndex), 75-89 (sliceTrackToTime), 97-122 (extractTemporalData) |
| `shared/components/src/MapView/TrackHighlightMarker.tsx` | Current position marker | Full file |
| `shared/components/src/MapView/PositionSymbolsLayer.tsx` | Position symbols per track | 68-86 (display mode filtering) |

### Tool Offering Files

| File | Role | Key Lines |
|------|------|-----------|
| `apps/vscode/src/services/toolMatchAdapter.ts` | Selection-to-tool bridge | 72-75 (updateSelection), 173-185 (featureIdsToSelection) |
| `apps/vscode/src/webview/mapPanel.ts` | Feature kind lookup | 535-561 (getFeatureKind) |
| `apps/vscode/src/services/calcService.ts` | MCP tool fetching | 180-211 (listTools), 473-508 (fetchMCPToolDefinitions) |
| `shared/components/src/ToolMatch/ToolMatchService.ts` | Tool matching algorithm | 87-112 (isToolActive) |
| `apps/vscode/src/services/mcpToolAdapter.ts` | MCP-to-Tool adapter | Full file |

## Technology

- TypeScript 5.x (VS Code extension and webview)
- React 18.x (map webview, shared components)
- Leaflet 1.9.x via react-leaflet (map rendering)
- Zustand (session-state store)
- VS Code Extension API ^1.85.0
- No new dependencies required

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Dragging the time slider in the TimeController causes the TemporalTrackLayer to update the rendered track within 100ms, verified by observing marker movement
- **SC-002**: In Full mode with currentTime set, a red TrackHighlightMarker is visible on each temporal track at the correct interpolated position
- **SC-003**: In Trail mode, each track renders only the segment from start to currentTime, and the segment grows/shrinks as the slider moves
- **SC-004**: Selecting one or more features causes the tool offering panel to display matching analysis tools (when debrief-calc is available)
- **SC-005**: All four fixes pass on the Exercise Alpha sample file as described in GitHub Issue #208
- **SC-006**: Existing tests in `apps/vscode/tests/` and `shared/components/tests/` continue to pass
- **SC-007**: No new runtime errors in the VS Code Developer Console when exercising all four scenarios
