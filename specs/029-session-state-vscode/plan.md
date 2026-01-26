# Implementation Plan: Session State VS Code Integration

**Branch**: `029-session-state-vscode` | **Date**: 2026-01-26 | **Spec**: [spec.md](./spec.md)

## Overview

This feature integrates the existing session-state service (024) into the VS Code extension, replacing component-local state with centralized Zustand-based state management. The implementation follows three phases: single document integration, multi-document support, and persistence with undo/redo.

## Technical Context

| Aspect | Value |
|--------|-------|
| **Primary Language** | TypeScript 5.x |
| **Key Dependencies** | `@debrief/session-state` (workspace), Zustand 5.x |
| **Target Files** | VS Code extension (`apps/vscode/`) |
| **Testing** | Vitest (unit), VS Code Test (integration) |
| **Performance Goals** | State propagation <100ms (SC-001), tab switching <50ms (SC-002) |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Extension Host                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    SessionManager                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │  │
│  │  │ doc:uri-a   │  │ doc:uri-b   │  │ doc:uri-c   │       │  │
│  │  │ SessionStore│  │ SessionStore│  │ SessionStore│       │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘       │  │
│  │                        │                                   │  │
│  │                   activeSession                            │  │
│  └────────────────────────┼──────────────────────────────────┘  │
│                           │                                      │
│  ┌────────────────────────┼──────────────────────────────────┐  │
│  │           Component Subscriptions                          │  │
│  │   TimeRangeView ─── temporal slice                         │  │
│  │   LayersTree ────── features slice                         │  │
│  │   MapPanel ──────── spatial + features + temporal.current  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                     MCP Server (embedded)                   │ │
│  │   Python tools read/write via session.* tools               │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Single Document Integration

**Goal:** Wire existing components to session-state for a single open document.

### Task 1.1: Add session-state dependency

**Files:**
- `apps/vscode/package.json`

**Changes:**
- Add `"@debrief/session-state": "workspace:*"` to dependencies
- Ensure esbuild config bundles the session-state library

**Testing:** Build succeeds without errors

---

### Task 1.2: Create SessionManager service

**Files to create:**
- `apps/vscode/src/services/sessionManager.ts`

**Implementation:**
```typescript
// SessionManager - singleton managing document sessions
export class SessionManager implements vscode.Disposable {
  private sessions: Map<string, SessionStoreApi> = new Map();
  private activeDocumentUri: string | null = null;
  private disposables: vscode.Disposable[] = [];
  private _onActiveSessionChange = new vscode.EventEmitter<SessionStoreApi | null>();
  readonly onActiveSessionChange = this._onActiveSessionChange.event;

  // Create session from document with derived defaults
  createSession(documentUri: string, data: PlotData): SessionStoreApi;

  // Get active session (follows VS Code active editor)
  getActiveSession(): SessionStoreApi | null;

  // Set active document (called on editor focus change)
  setActiveDocument(uri: string | null): void;

  // Dispose session when document closes
  disposeSession(documentUri: string): void;

  // Check if session exists
  hasSession(uri: string): boolean;
}
```

**Key behavior:**
- Creates Zustand store per document using `createSessionStore()` from session-state
- Initializes temporal.timeRange from GeoJSON feature timestamps
- Initializes spatial.viewport from feature collection bounds
- Emits `onActiveSessionChange` when switching documents

**Testing:**
- Unit test: Session creation initializes state from plot data
- Unit test: Active session switches when document changes
- Unit test: Session disposed when document closes

---

### Task 1.3: Integrate SessionManager into extension activation

**Files to modify:**
- `apps/vscode/src/extension.ts`

**Changes:**
1. Import and instantiate SessionManager
2. Pass sessionManager to command registration
3. Subscribe to VS Code `window.onDidChangeActiveTextEditor` to track active document
4. Dispose sessionManager on deactivation

**Pseudocode:**
```typescript
const sessionManager = new SessionManager();
context.subscriptions.push(sessionManager);

// Track active editor changes
context.subscriptions.push(
  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor?.document.uri.scheme === 'stac') {
      sessionManager.setActiveDocument(editor.document.uri.toString());
    }
  })
);
```

---

### Task 1.4: Wire TimeRangeViewProvider to temporal slice

**Files to modify:**
- `apps/vscode/src/views/timeRangeView.ts`

**Changes:**
1. Accept SessionManager in constructor
2. Subscribe to active session changes
3. When active session changes:
   - Unsubscribe from previous session
   - Subscribe to new session's temporal slice
   - Update webview with new time extent/position
4. When webview sends `timeChange`:
   - Update session state via `store.getState().setCurrentTime()`
5. When webview sends `playbackStateChange`:
   - Update session state via `store.getState().setPlaybackState()`

**Key pattern:**
```typescript
private subscribeToSession(store: SessionStoreApi): void {
  this.unsubscribeCurrent();

  this.currentUnsubscribe = subscribeToTemporal(store, (temporal) => {
    this._postMessage({
      type: 'updateTimeExtent',
      start: temporal.timeRange?.start.epoch,
      end: temporal.timeRange?.end.epoch,
    });
  });
}
```

**Testing:**
- Integration test: Time change in webview updates session state
- Integration test: Session state change updates webview

---

### Task 1.5: Wire LayersTreeProvider to features slice

**Files to modify:**
- `apps/vscode/src/providers/layersTreeProvider.ts`

**Changes:**
1. Accept SessionManager in constructor
2. Subscribe to active session changes
3. Subscribe to features slice (selection, hiddenFeatureIds)
4. Remove local `tracks`, `locations`, `resultLayers` state
5. Derive tree items from session state + loaded plot data
6. Toggle visibility updates session via `store.getState().toggleFeatureVisibility()`

**Key changes:**
- `setTracks()` and `setLocations()` become initialization methods that store references for display
- Visibility state comes from `session.hiddenFeatureIds`
- Selection state comes from `session.selection.featureIds`

**Testing:**
- Unit test: Tree items reflect session hiddenFeatureIds
- Unit test: Toggle visibility updates session state

---

### Task 1.6: Wire MapPanel to spatial/features/temporal slices

**Files to modify:**
- `apps/vscode/src/webview/mapPanel.ts`
- `apps/vscode/src/webview/messages.ts`

**Changes to MapPanel:**
1. Accept SessionManager in constructor/factory
2. Subscribe to active session changes
3. Subscribe to:
   - `spatial.viewport` - update map bounds
   - `features.selection` - update selection highlighting
   - `features.hiddenFeatureIds` - update layer visibility
   - `temporal.currentTime` - update track position display
4. When webview sends viewport change:
   - Debounce 100ms
   - Update session via `store.getState().setViewport()`
5. When webview sends selection change:
   - Update session via `store.getState().setSelection()`

**New messages to add:**
```typescript
// Extension → Webview
interface SetViewportMessage {
  type: 'setViewport';
  viewport: ViewportPolygon;
}

interface SetCurrentTimeMessage {
  type: 'setCurrentTime';
  time: number; // epoch ms
}

// Webview → Extension
interface ViewportChangeMessage {
  type: 'viewportChange';
  viewport: ViewportPolygon;
}
```

**Testing:**
- Integration test: Selection in MapPanel updates session
- Integration test: Session selection change updates MapPanel

---

### Task 1.7: Update openPlot command to create session

**Files to modify:**
- `apps/vscode/src/commands/openPlot.ts`

**Changes:**
1. After loading plot data, create session:
   ```typescript
   const session = sessionManager.createSession(documentUri, {
     timeExtent: plot.timeExtent,
     bbox: plot.bbox,
     features: featureCollection,
   });
   ```
2. Pass session to MapPanel, TimeRangeViewProvider, LayersTreeProvider

**Testing:**
- Integration test: Opening plot creates session with correct initial state

---

### Phase 1 Acceptance Test

**Test scenario:**
1. Open a GeoJSON plot
2. Verify session is created with time range from data
3. Change time in TimeController
4. Verify MapPanel shows tracks at new time position
5. Select feature on MapPanel
6. Verify LayersTreeProvider shows feature as selected

---

## Phase 2: Multi-Document Support

**Goal:** Add document-keyed caching and seamless tab switching.

### Task 2.1: Extend SessionManager with document cache

**Files to modify:**
- `apps/vscode/src/services/sessionManager.ts`

**Changes:**
- Sessions already cached in Map by document URI
- Add `getSession(uri: string)` method
- Add cleanup logic: dispose session when document closes
- Listen to `workspace.onDidCloseTextDocument`

**Testing:**
- Unit test: Opening same document returns cached session
- Unit test: Closing document disposes session

---

### Task 2.2: Track VS Code active editor changes

**Files to modify:**
- `apps/vscode/src/extension.ts`

**Changes:**
- Subscribe to `window.onDidChangeActiveTextEditor`
- Call `sessionManager.setActiveDocument()` on change
- Handle case where active editor is not a plot document (set null)

```typescript
vscode.window.onDidChangeActiveTextEditor((editor) => {
  if (editor?.document.uri.scheme === 'stac') {
    sessionManager.setActiveDocument(editor.document.uri.toString());
  } else if (mapPanel && !editor) {
    // No editor active, but map panel may still be visible
    // Keep current session
  } else {
    sessionManager.setActiveDocument(null);
  }
});
```

---

### Task 2.3: Components subscribe to onActiveSessionChange

**Files to modify:**
- `apps/vscode/src/views/timeRangeView.ts`
- `apps/vscode/src/providers/layersTreeProvider.ts`
- `apps/vscode/src/webview/mapPanel.ts`

**Pattern for each component:**
```typescript
constructor(sessionManager: SessionManager) {
  sessionManager.onActiveSessionChange((session) => {
    this.switchToSession(session);
  });
}

private switchToSession(session: SessionStoreApi | null): void {
  // 1. Unsubscribe from previous session
  this.currentSubscription?.dispose();

  // 2. If null, show empty/disabled state
  if (!session) {
    this.showEmptyState();
    return;
  }

  // 3. Subscribe to new session slices
  this.subscribeToSession(session);

  // 4. Immediately sync UI with current state
  this.syncFromState(session.getState());
}
```

**Testing:**
- Integration test: Switching tabs restores previous session state
- Integration test: State changes are preserved across tab switches

---

### Task 2.4: Handle MapPanel lifecycle with multiple documents

**Files to modify:**
- `apps/vscode/src/webview/mapPanel.ts`

**Challenge:** MapPanel is a singleton webview panel, but must display different documents.

**Solution:**
- MapPanel receives `loadPlot` when active document changes
- Session state for spatial/features/temporal is restored from cache
- Webview maintains its own render state but synchronizes with session

**Implementation:**
```typescript
public switchToDocument(uri: string, plotData: PlotData): void {
  const session = this.sessionManager.getSession(uri);

  // Send new plot data to webview
  this.postMessage({ type: 'loadPlot', plot: plotData });

  // Subscribe to this session's state
  this.subscribeToSession(session);

  // Apply cached viewport/selection immediately
  const state = session.getState();
  if (state.viewport) {
    this.postMessage({ type: 'setViewport', viewport: state.viewport });
  }
  if (state.selection.featureIds.length > 0) {
    this.postMessage({ type: 'setSelection', selection: state.selection });
  }
}
```

---

### Phase 2 Acceptance Test

**Test scenario:**
1. Open Plot A, set time to 12:00, select track "Alpha"
2. Open Plot B, set time to 14:00, select track "Bravo"
3. Switch to Plot A tab
4. Verify time shows 12:00 and "Alpha" is selected
5. Switch to Plot B tab
6. Verify time shows 14:00 and "Bravo" is selected
7. Verify switching is instantaneous (<50ms)

---

## Phase 3: Persistence & Polish

**Goal:** Add save/load, undo/redo commands, and dirty tracking.

### Task 3.1: Register VS Code undo/redo commands

**Files to create:**
- `apps/vscode/src/commands/undoRedo.ts`

**Files to modify:**
- `apps/vscode/package.json` (add commands)
- `apps/vscode/src/commands/index.ts`

**Commands:**
- `debrief.undo` - Undo last session state change
- `debrief.redo` - Redo last undone change

**Implementation:**
```typescript
export function createUndoCommand(sessionManager: SessionManager) {
  return () => {
    const session = sessionManager.getActiveSession();
    if (session?.getState().canUndo()) {
      session.getState().undo();
    }
  };
}

export function createRedoCommand(sessionManager: SessionManager) {
  return () => {
    const session = sessionManager.getActiveSession();
    if (session?.getState().canRedo()) {
      session.getState().redo();
    }
  };
}
```

**Keybindings:**
```json
{
  "command": "debrief.undo",
  "key": "ctrl+z",
  "mac": "cmd+z",
  "when": "debrief.plotOpen && !editorFocus"
},
{
  "command": "debrief.redo",
  "key": "ctrl+shift+z",
  "mac": "cmd+shift+z",
  "when": "debrief.plotOpen && !editorFocus"
}
```

**Testing:**
- Unit test: Undo reverts viewport change
- Unit test: Redo restores viewport
- Unit test: Playback changes not recorded in undo history

---

### Task 3.2: Implement session save command

**Files to create:**
- `apps/vscode/src/commands/saveSession.ts`

**Files to modify:**
- `apps/vscode/package.json`
- `apps/vscode/src/commands/index.ts`

**Command:** `debrief.saveSession`

**Implementation:**
```typescript
export function createSaveSessionCommand(sessionManager: SessionManager) {
  return async () => {
    const session = sessionManager.getActiveSession();
    if (!session) return;

    const state = session.getState();
    const plotUri = state.featureCollectionUri;

    // Derive session file path: plot.geojson → plot.debrief-session
    const sessionPath = plotUri?.replace(/\.geojson$/, '.debrief-session');

    if (!sessionPath) {
      // Show save dialog
      const uri = await vscode.window.showSaveDialog({
        filters: { 'Debrief Session': ['debrief-session'] },
      });
      if (!uri) return;
      sessionPath = uri.fsPath;
    }

    const result = await saveSession(session, sessionPath);

    if (result.success) {
      vscode.window.showInformationMessage(`Session saved to ${sessionPath}`);
    } else {
      vscode.window.showErrorMessage(`Save failed: ${result.error}`);
    }
  };
}
```

**Testing:**
- Integration test: Save creates .debrief-session file
- Integration test: Save marks session as clean

---

### Task 3.3: Implement session load on plot open

**Files to modify:**
- `apps/vscode/src/commands/openPlot.ts`

**Changes:**
1. After determining plot path, check for `.debrief-session` file
2. If session file exists:
   - Load and validate it
   - If valid, apply state to session
   - If incompatible version, warn user and use defaults
3. If no session file, use defaults from plot data

```typescript
const sessionPath = plotPath.replace(/\.geojson$/, '.debrief-session');
const sessionExists = await fileExists(sessionPath);

if (sessionExists) {
  const loadResult = await loadSession(session, sessionPath);
  if (loadResult.success) {
    // Session state already applied
  } else if (loadResult.error?.includes('newer than supported')) {
    vscode.window.showWarningMessage(
      `Session file uses a newer format. Using default view settings.`
    );
  }
}
```

**Testing:**
- Integration test: Opening plot with session file restores state
- Integration test: Opening plot without session file uses defaults
- Integration test: Incompatible version shows warning

---

### Task 3.4: Add dirty tracking and close prompt

**Files to modify:**
- `apps/vscode/src/services/sessionManager.ts`
- `apps/vscode/src/extension.ts`

**Changes:**

1. **Track dirty state in status bar:**
```typescript
// In extension.ts
const dirtyStatusBarItem = vscode.window.createStatusBarItem(
  vscode.StatusBarAlignment.Left
);

sessionManager.onActiveSessionChange((session) => {
  if (session) {
    subscribeToDirty(session, (dirty) => {
      dirtyStatusBarItem.text = dirty ? '$(circle-filled) Session Modified' : '';
      dirtyStatusBarItem.show();
    });
  }
});
```

2. **Prompt on close:**
```typescript
// In SessionManager
private async handleDocumentClose(uri: string): Promise<boolean> {
  const session = this.sessions.get(uri);
  if (!session) return true;

  const dirty = session.getState().dirty;
  if (!dirty) {
    this.disposeSession(uri);
    return true;
  }

  const choice = await vscode.window.showWarningMessage(
    'Session has unsaved changes. Save before closing?',
    'Save', 'Don\'t Save', 'Cancel'
  );

  if (choice === 'Save') {
    await saveSession(session);
    this.disposeSession(uri);
    return true;
  } else if (choice === 'Don\'t Save') {
    this.disposeSession(uri);
    return true;
  }
  return false; // Cancel
}
```

**Testing:**
- Unit test: Dirty flag set after state change
- Unit test: Close prompts when dirty
- Unit test: Save clears dirty flag

---

### Task 3.5: Wire MCP server for Python tool access (FR-016 to FR-019)

**Files to modify:**
- `apps/vscode/src/extension.ts`
- `apps/vscode/src/services/sessionManager.ts`

**Decision:** Embed MCP server in extension process (per spec assumption).

**Implementation:**
```typescript
// In SessionManager
private mcpServer: ReturnType<typeof startServer> | null = null;

startMCPServer(): void {
  const activeSession = this.getActiveSession();
  if (!activeSession) return;

  // Start server on localhost:3001
  this.mcpServer = startServer(activeSession, { port: 3001 });
}

// When active session changes, update MCP server's store reference
setActiveDocument(uri: string): void {
  // ... existing logic ...

  // Update MCP server to point to new active session
  if (this.mcpServer && this.activeSession) {
    // MCP tools will now operate on the new session
  }
}
```

**Testing:**
- Integration test: Python tool can read current time via MCP
- Integration test: Python tool can set selection via MCP
- Integration test: MCP state change triggers UI update

---

### Phase 3 Acceptance Test

**Test scenario:**
1. Open plot, make viewport changes
2. Invoke undo command - verify viewport reverts
3. Invoke redo command - verify viewport restored
4. Save session - verify .debrief-session file created
5. Close plot (don't save new changes)
6. Verify close prompt appears
7. Reopen plot - verify saved state restored

---

## Dependencies Between Tasks

```
Phase 1:
  1.1 (dependency) ─────┐
  1.2 (SessionManager) ─┼─> 1.3 (activation) ─┐
                        │                      │
  1.4 (TimeRange) ──────┴──────────────────────┼─> 1.7 (openPlot)
  1.5 (Layers) ────────────────────────────────┤
  1.6 (MapPanel) ──────────────────────────────┘

Phase 2 (depends on Phase 1 complete):
  2.1 (cache) ──> 2.2 (editor tracking) ──> 2.3 (subscriptions) ──> 2.4 (MapPanel lifecycle)

Phase 3 (depends on Phase 2 complete):
  3.1 (undo/redo) ─────────────┐
  3.2 (save) ──────────────────┤
  3.3 (load) ──────────────────┼──> 3.4 (dirty/prompt)
  3.5 (MCP) ───────────────────┘
```

---

## Testing Strategy

### Unit Tests (Vitest)

| Test File | Coverage |
|-----------|----------|
| `tests/unit/sessionManager.test.ts` | Session creation, caching, disposal |
| `tests/unit/sessionIntegration.test.ts` | Component subscription patterns |

### Integration Tests (VS Code Test)

| Test File | Coverage |
|-----------|----------|
| `tests/integration/sessionState.test.ts` | End-to-end state synchronization |
| `tests/integration/multiDocument.test.ts` | Tab switching, state preservation |
| `tests/integration/persistence.test.ts` | Save/load, dirty tracking |

### Performance Tests

| Metric | Target | Test Method |
|--------|--------|-------------|
| State propagation | <100ms | Timestamp delta in subscription callback |
| Tab switching | <50ms | Measure `setActiveDocument()` to UI update |
| Session load | <200ms | Measure `loadSession()` duration |

---

## Risk Areas and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Webview message latency | Medium | State appears out of sync | Optimistic UI updates, debounce outgoing |
| Memory leak from subscriptions | High | Extension slowdown | Strict unsubscribe discipline, disposables |
| Race condition on tab switch | Medium | Wrong session displayed | Queue session switches, lock during transition |
| MCP server port conflict | Low | Python tools fail | Make port configurable, detect conflicts |
| Session file corruption | Low | Lost view state | Validate schema on load, keep backup |

### Fallback Behavior (FR-edge case)

If session-state service fails to initialize:
- Log warning to output channel
- Fall back to component-local state (current behavior)
- Disable undo/redo and persistence commands
- Allow core functionality to continue

---

## File Summary

### Files to Create

| Path | Purpose |
|------|---------|
| `apps/vscode/src/services/sessionManager.ts` | Session lifecycle management |
| `apps/vscode/src/commands/undoRedo.ts` | Undo/redo command handlers |
| `apps/vscode/src/commands/saveSession.ts` | Save/load command handlers |
| `apps/vscode/tests/unit/sessionManager.test.ts` | SessionManager unit tests |
| `apps/vscode/tests/integration/sessionState.test.ts` | Integration tests |

### Files to Modify

| Path | Changes |
|------|---------|
| `apps/vscode/package.json` | Add dependency, commands, keybindings |
| `apps/vscode/src/extension.ts` | Initialize SessionManager, wire events |
| `apps/vscode/src/views/timeRangeView.ts` | Subscribe to temporal slice |
| `apps/vscode/src/providers/layersTreeProvider.ts` | Subscribe to features slice |
| `apps/vscode/src/webview/mapPanel.ts` | Subscribe to all relevant slices |
| `apps/vscode/src/webview/messages.ts` | Add viewport/time messages |
| `apps/vscode/src/commands/openPlot.ts` | Create session, load saved state |
| `apps/vscode/src/commands/index.ts` | Register new commands |

---

## Critical Files for Implementation

| File | Importance |
|------|------------|
| `apps/vscode/src/services/sessionManager.ts` | **New**: Core orchestration of all document sessions |
| `services/session-state/src/index.ts` | Entry point for session-state library exports |
| `apps/vscode/src/webview/mapPanel.ts` | Most complex: bidirectional sync of viewport, selection, time |
| `apps/vscode/src/extension.ts` | Activation wiring: instantiates SessionManager, connects events |
| `services/session-state/src/store/subscriptions.ts` | Subscription helpers that components will use |
