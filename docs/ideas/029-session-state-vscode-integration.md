# Session State VS Code Integration

**Backlog Item**: 029
**Related**: 024-document-session-state (service implementation)

## Problem

The `session-state` service (024) is fully implemented but not yet integrated into the VS Code extension. Currently:

- TimeController manages its own state in webview
- LayersTreeProvider receives data directly from openPlot command
- MapPanel maintains its own viewport/selection state
- No undo/redo, dirty tracking, or persistence for view state

## Proposed Architecture

### Multi-Document Session Manager

```typescript
interface SessionManager {
  // Cached sessions keyed by document URI
  sessions: Map<string, SessionStore>;

  // Currently active session (follows active editor)
  activeDocumentUri: string | null;

  // Lifecycle
  createSession(documentUri: string, featureCollection: FeatureCollection): SessionStore;
  getSession(documentUri: string): SessionStore | undefined;
  closeSession(documentUri: string): void;

  // Active document tracking
  setActiveDocument(documentUri: string): void;
  onActiveSessionChange(callback: (session: SessionStore | null) => void): Disposable;
}
```

### Session Creation on Document Open

When a GeoJSON FeatureCollection is opened:

1. Create session with default state derived from data:
   - `temporal.timeRange` from feature timestamps
   - `temporal.currentTime` at start of range
   - `spatial.viewport` fit to feature bounds
   - `features.collection` reference to document URI
   - `features.selection` empty
   - `features.hidden` empty

2. Register session in SessionManager cache

### Component Subscriptions

```
SessionManager.onActiveSessionChange()
        │
        ├── TimeRangeViewProvider
        │   └── subscribes to: temporal (currentTime, timeRange, playbackState, displayMode)
        │
        ├── LayersTreeProvider
        │   └── subscribes to: features (selection, hidden)
        │
        ├── MapPanel
        │   ├── subscribes to: spatial (viewport, rotation)
        │   ├── subscribes to: features (selection, hidden)
        │   └── subscribes to: temporal (currentTime) ← for position highlighting
        │
        └── PropertiesPanel (future)
            └── subscribes to: features.selection
```

### State Flow

```
User Action (UI)          Python Tool (MCP)
      │                        │
      ▼                        ▼
  SessionStore ◄──────────────────────────►  HTTP/MCP Server
      │                                            │
      ├── Zustand state update                     │
      ├── Dirty flag set                           │
      ├── Undo history recorded                    │
      │                                            │
      ▼                                            ▼
  Subscribers notified                      SSE broadcast
      │                                            │
      ▼                                            ▼
  UI components update                    Dashboard updates
```

### Quick Document Switching

When user switches between open editors:

1. SessionManager detects active editor change
2. Retrieves cached session for that document URI
3. Notifies all subscribers of new active session
4. Components refresh with cached state (instant - no reload)

### Persistence

- Session state saved alongside document (e.g., `plot.geojson` → `plot.debrief-session`)
- Auto-save on significant state changes (debounced)
- Prompt on close if dirty

## Implementation Phases

### Phase 1: Single Document Integration
- Wire TimeController to read from session-state temporal slice
- Wire LayersTreeProvider to read from session-state features slice
- Wire MapPanel to read from session-state spatial slice
- Create session when plot opens

### Phase 2: Multi-Document Support
- Add SessionManager with document-keyed cache
- Track active editor changes
- Components subscribe to active session changes

### Phase 3: Persistence
- Save/load session state with documents
- Dirty tracking and save prompts
- Undo/redo integration

## Benefits

1. **Consistent state** - All components share single source of truth
2. **Undo/redo** - Free from session-state service
3. **Python integration** - Tools can read/modify state via MCP
4. **Quick switching** - Cached sessions for instant document changes
5. **Persistence** - Save view configurations with documents
6. **Testability** - State management separate from UI
