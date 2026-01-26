# Feature Specification: Session State VS Code Integration

**Feature Branch**: `029-session-state-vscode`
**Created**: 2026-01-26
**Status**: Draft
**Input**: Integrate session-state service into VS Code extension (multi-document support)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Single Document State Integration (Priority: P1)

An analyst opens a GeoJSON plot in VS Code. All UI components (TimeController, LayersTreeProvider, MapPanel) display synchronized data from a single session state store, with changes in one component immediately reflected in others.

**Why this priority**: This is the foundation for all other functionality. Without components sharing a common state store, there is no benefit from the session-state service.

**Independent Test**: Can be fully tested by opening a plot, changing time in TimeController, and verifying MapPanel displays tracks at the new time position.

**Acceptance Scenarios**:

1. **Given** a GeoJSON plot is opened, **When** the extension initializes, **Then** a session is automatically created with default state derived from the data (time range from feature timestamps, viewport fit to bounds).
2. **Given** a session exists, **When** the user changes time via TimeController, **Then** MapPanel updates to show track positions at the selected time within 100ms.
3. **Given** a session exists, **When** the user selects a feature on MapPanel, **Then** LayersTreeProvider shows the feature as selected.

---

### User Story 2 - Multi-Document Session Switching (Priority: P2)

An analyst has multiple plot documents open in VS Code tabs. When switching between tabs, the UI components instantly update to show the cached state for the active document, without reloading data.

**Why this priority**: Multi-document support is essential for comparing different plots or time periods. Without session caching, users would lose view state when switching tabs.

**Independent Test**: Can be fully tested by opening two plots, configuring different time positions in each, and switching between tabs to verify state is preserved.

**Acceptance Scenarios**:

1. **Given** two plots are open with different time positions, **When** the user switches from Tab A to Tab B, **Then** all UI components update to show Tab B's cached state.
2. **Given** a plot is open with a configured viewport, **When** the user opens a second plot then returns to the first, **Then** the first plot's viewport is exactly as left.
3. **Given** the user switches tabs rapidly, **When** switching back and forth, **Then** there is no perceptible delay (< 50ms) in state restoration.

---

### User Story 3 - Python Tool State Access (Priority: P3)

A Python analysis tool needs to read the current time position and selected features to perform a calculation. The tool accesses state via MCP, performs analysis, and updates the selection to highlight results.

**Why this priority**: Python integration is essential for the "thick services, thin frontends" architecture. Without MCP access, Python tools cannot participate in the interactive workflow.

**Independent Test**: Can be fully tested by opening a plot, running a Python tool that reads current time and selection, and verifying correct values are received.

**Acceptance Scenarios**:

1. **Given** a plot is open with time at 12:00, **When** a Python tool queries current time via MCP, **Then** it receives the time value in ISO 8601 format.
2. **Given** features are selected in the UI, **When** a Python tool queries selection via MCP, **Then** it receives the list of selected feature IDs.
3. **Given** a Python tool sets the selection via MCP, **When** the update is applied, **Then** UI components reflect the new selection within 100ms.

---

### User Story 4 - Undo/Redo View State (Priority: P4)

An analyst accidentally pans away from an area of interest. They invoke Undo to restore the previous viewport, then Redo to return to the new position if needed.

**Why this priority**: Undo/redo is a core usability feature that reduces frustration during exploratory analysis. The session-state service already provides this capability.

**Independent Test**: Can be fully tested by panning the map, invoking undo via command, and verifying the viewport reverts.

**Acceptance Scenarios**:

1. **Given** the user has panned the map, **When** they invoke Undo, **Then** the viewport reverts to the previous position.
2. **Given** the user has performed an undo, **When** they invoke Redo, **Then** the viewport returns to the position before undo.
3. **Given** playback is running, **When** time advances automatically, **Then** these time changes are NOT recorded in undo history.

---

### User Story 5 - Session Persistence (Priority: P5)

An analyst has configured a view (specific time, viewport, visible layers) and wants to save this session. Later, they can reload the plot and restore the exact same view configuration.

**Why this priority**: Session persistence enables analysts to resume work and share view configurations with colleagues.

**Independent Test**: Can be fully tested by configuring a session, saving, closing the editor, reopening, and verifying all state is restored.

**Acceptance Scenarios**:

1. **Given** a session has been modified, **When** the user saves, **Then** session state is written to a `.debrief-session` file alongside the plot.
2. **Given** a plot with a saved session file exists, **When** the user opens the plot, **Then** the saved view configuration is restored.
3. **Given** a session has unsaved changes, **When** the user attempts to close, **Then** they are prompted to save.

---

### Edge Cases

- When opening a plot that has no timestamps, the system MUST create a session with time range set to null and TimeController in disabled state.
- When the session-state server fails to start, the extension MUST fall back to component-local state and log a warning.
- When two VS Code windows have the same document open, each window MUST have its own independent session (no cross-window state sharing).
- When a plot file is modified externally while open, the session MUST remain valid but feature collection reference should be marked stale.
- When loading a session file with schema version newer than supported, the system MUST reject with a clear error and suggest upgrading the extension.

## Requirements *(mandatory)*

### Functional Requirements

**SessionManager Lifecycle**

- **FR-001**: Extension MUST create a SessionManager singleton on activation.
- **FR-002**: SessionManager MUST create a session automatically when a GeoJSON FeatureCollection is opened in the map editor.
- **FR-003**: Session MUST be initialized with default state derived from the data: temporal.timeRange from feature timestamps, spatial.viewport fit to feature bounds.
- **FR-004**: SessionManager MUST track which document is currently active (follows VS Code's active editor).
- **FR-005**: SessionManager MUST cache sessions by document URI for instant switching.
- **FR-006**: SessionManager MUST dispose of a session when its document is closed.

**Component Subscriptions**

- **FR-007**: TimeController MUST subscribe to the temporal slice of the active session.
- **FR-008**: LayersTreeProvider MUST subscribe to the features slice (selection, hidden) of the active session.
- **FR-009**: MapPanel MUST subscribe to spatial (viewport, rotation), features (selection, hidden), and temporal (currentTime) slices.
- **FR-010**: Components MUST receive the new active session when the user switches editors.
- **FR-011**: Components MUST unsubscribe from the previous session before subscribing to a new one.

**State Updates**

- **FR-012**: When TimeController changes time, it MUST update the session temporal slice.
- **FR-013**: When MapPanel viewport changes, it MUST update the session spatial slice (debounced).
- **FR-014**: When LayersTreeProvider toggles visibility, it MUST update the session features.hidden set.
- **FR-015**: When a feature is selected anywhere, all subscribing components MUST reflect the selection.

**Python/MCP Integration**

- **FR-016**: Session state server MUST expose MCP tools for reading all state slices.
- **FR-017**: Session state server MUST expose MCP tools for modifying state.
- **FR-018**: State modifications from Python MUST trigger reactive updates in UI components.
- **FR-019**: State modifications from Python MUST be recorded in undo history.

**Undo/Redo**

- **FR-020**: Extension MUST register VS Code commands for session undo/redo.
- **FR-021**: Undo/redo commands MUST operate on the active session.
- **FR-022**: Ephemeral state changes (playback start/stop) MUST NOT be recorded in undo history.

**Persistence**

- **FR-023**: Session state MUST be saveable to a `.debrief-session` file alongside the plot document.
- **FR-024**: Session state MUST be loadable when a plot with an existing session file is opened.
- **FR-025**: Dirty tracking MUST be provided to indicate unsaved session changes.
- **FR-026**: User MUST be prompted on close if session has unsaved changes.

### Key Entities

- **SessionManager**: Singleton managing all document sessions; tracks active document, provides session lifecycle.
- **SessionStore**: Zustand store instance for a single document; contains temporal, spatial, features, document slices.
- **DocumentSession**: Pairing of a document URI with its SessionStore instance.
- **ActiveSessionContext**: React context providing the current active session to component tree.
- **SessionSubscription**: Typed subscription to specific state slice(s) with cleanup disposable.

## Assumptions

- The session-state service (024) is fully implemented and provides Zustand-based state management.
- VS Code extension webviews can import and use the session-state TypeScript library directly.
- Only one VS Code window at a time has a given document "active" (no cross-window synchronization needed).
- Session files are small enough (< 100KB) that synchronous file I/O is acceptable.
- The MCP server runs embedded in the extension process; no separate process management needed.

## Clarifications

### Session 2026-01-26

- Q: How should components access the active session? -> A: React context (ActiveSessionContext) wraps component tree, provides current session.
- Q: What happens when no document is active? -> A: Active session is null; components show empty/disabled state.
- Q: Should session files be JSON or binary? -> A: JSON for human readability and debugging.
- Q: How to handle viewport updates during rapid pan/zoom? -> A: Debounce with 100ms delay before updating session state.
- Q: Should sessions persist across VS Code restarts? -> A: Yes, via .debrief-session files saved alongside plot documents.

## User Interface Flow

### UI Location

No new UI elements are added. This feature wires existing components (TimeController, LayersTreeProvider, MapPanel) to the session-state service.

### State Flow Diagram

```
Document Open                Document Switch              Python Tool Call
     |                            |                            |
     v                            v                            v
SessionManager             SessionManager               MCP Server
     |                            |                            |
     +--> createSession()         +--> setActiveDocument()     +--> setState()
     |                            |                            |
     v                            v                            v
SessionStore               Notify Subscribers           SessionStore
(Zustand)                        |                      (Zustand)
     |                            v                            |
     v                      Components re-render               v
Components subscribe              with new session        Subscribers notified
     |                                                         |
     v                                                         v
UI renders initial state                                 UI updates reactively
```

### Component Subscription Matrix

| Component           | Temporal | Spatial | Features | Document |
|---------------------|----------|---------|----------|----------|
| TimeController      | Yes      | No      | No       | No       |
| LayersTreeProvider  | No       | No      | Yes      | No       |
| MapPanel            | Yes*     | Yes     | Yes      | No       |
| PropertiesPanel     | No       | No      | Yes**    | No       |
| StatusBar           | No       | No      | No       | Yes      |

*MapPanel subscribes to temporal.currentTime for track position highlighting.
**PropertiesPanel subscribes to features.selection to show selected feature properties.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: State changes propagate to all subscribed components within 100ms.
- **SC-002**: Document switching restores cached state within 50ms (no network/file I/O).
- **SC-003**: Session save/load preserves 100% of persistent state fields.
- **SC-004**: Python tools can read and write all state slices via MCP without errors.
- **SC-005**: Undo/redo operations restore state exactly to previous values.
- **SC-006**: Memory usage for cached sessions is under 1MB per document.
- **SC-007**: Extension activation time increases by no more than 200ms due to SessionManager initialization.

## Dependencies

- **024-document-session-state**: Provides the core Zustand-based state management, MCP server, and persistence logic.
- **025-time-controller**: TimeController component that will consume temporal state.
- **021-load-rep-files-stac**: Provides GeoJSON loading infrastructure that triggers session creation.

## Implementation Phases

### Phase 1: Single Document Integration

Wire existing components to session-state for a single open document:

1. Create SessionManager singleton in extension activation
2. Hook document open to create session with derived defaults
3. Wire TimeController to read/write temporal slice
4. Wire LayersTreeProvider to read/write features slice
5. Wire MapPanel to read spatial/features/temporal slices

### Phase 2: Multi-Document Support

Add document-keyed caching and active document tracking:

1. Extend SessionManager with document URI -> session cache
2. Track VS Code active editor changes
3. Notify components when active session changes
4. Components subscribe to onActiveSessionChange callback

### Phase 3: Persistence & Polish

Add save/load and undo/redo integration:

1. Save session state to .debrief-session on explicit save
2. Load session state when opening plot with existing session file
3. Register VS Code undo/redo commands
4. Add dirty tracking and close prompts

## Out of Scope

- Cross-window session synchronization (each VS Code window independent)
- Real-time collaboration (multiple users editing same session)
- Session versioning or branching (only one session state per document)
- Automatic session backup/recovery beyond VS Code's built-in mechanisms
