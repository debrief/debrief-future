# Usage Example: Session State Integration

**Feature**: 029-session-state-vscode
**Date**: 2026-01-26

## Overview

This document demonstrates how session state flows between components in the Debrief VS Code extension.

## State Flow

```
┌─────────────┐     ┌────────────────┐     ┌───────────────────┐
│  openPlot   │────▶│ SessionManager │◀────│ TimeRangeView     │
│  command    │     │                │     │                   │
└─────────────┘     │  createSession │     │ subscribeToTemp   │
                    │  setActive     │     │ setCurrentTime    │
                    └────────────────┘     └───────────────────┘
                           │
                           ▼
                    ┌────────────────┐
                    │ Zustand Store  │
                    │ (session-state)│
                    │                │
                    │ - temporal     │
                    │ - spatial      │
                    │ - features     │
                    │ - document     │
                    └────────────────┘
```

## Code Examples

### 1. Creating a Session (openPlot command)

```typescript
// In commands/openPlot.ts

// After loading plot data
const plotUri = buildStacUri(storeId, itemPath);
sessionManager.createSession(plotUri, {
  plot,
  tracks: plotData.tracks,
  locations: plotData.locations,
  featureCollectionUri: plotUri,
});

// Set as active document
sessionManager.setActiveDocument(plotUri);
```

### 2. Subscribing to Session Changes (TimeRangeViewProvider)

```typescript
// In views/timeRangeView.ts

constructor(extensionUri: vscode.Uri, sessionManager?: SessionManager) {
  this._extensionUri = extensionUri;

  if (sessionManager) {
    // Subscribe to active session changes
    sessionManager.onActiveSessionChange(
      (session) => this._handleActiveSessionChange(session)
    );
  }
}

private _handleActiveSessionChange(session: SessionStoreApi | null): void {
  if (session) {
    // Subscribe to temporal state
    this._temporalUnsubscribe = subscribeToTemporal(
      session,
      (temporal) => this._handleTemporalChange(temporal)
    );

    // Initialize from session state
    const state = session.getState();
    if (state.timeRange) {
      this.updateTimeExtent(
        state.timeRange.start.epoch,
        state.timeRange.end.epoch
      );
    }
  }
}
```

### 3. Updating Session State (time change from webview)

```typescript
// In views/timeRangeView.ts - message handler

case 'timeChange':
  // Update session state
  if (this._activeSession) {
    this._activeSession.getState().setCurrentTime(
      createTimeInstant(message.time)
    );
  }
  break;
```

## User Workflow

1. **User opens a plot**
   - `debrief.openPlot` command executes
   - Plot data loaded from STAC store
   - SessionManager creates new session with:
     - Time range from plot extent
     - Feature collection URI
     - Current time set to start of range
   - Session set as active

2. **User changes time in TimeController**
   - TimeController webview sends `timeChange` message
   - TimeRangeViewProvider receives message
   - Updates session state: `setCurrentTime()`
   - Other subscribed components receive update

3. **State synchronization**
   - Any component subscribed to temporal slice sees the change
   - Map updates track positions (when wired)
   - Layers panel updates time-filtered visibility (when wired)

## Key Types

```typescript
// SessionManager creates sessions with this data
interface PlotSessionData {
  plot: Plot;
  tracks: Track[];
  locations: ReferenceLocation[];
  featureCollectionUri: string;
}

// Session store provides typed state access
type SessionStore = TemporalSlice &
  SpatialSlice &
  FeaturesSlice &
  DocumentSlice &
  Actions;
```

## Benefits

1. **Single Source of Truth**: All components share the same state
2. **Reactive Updates**: Changes propagate automatically via subscriptions
3. **Multi-Document Support**: Each document has its own session
4. **Undo/Redo Ready**: Zustand + Zundo provides history out of the box
5. **MCP Access**: Python tools can read/write state via session-state server
