# Feature Specification: Session State Management

**Feature Branch**: `024-document-session-state`
**Created**: 2026-01-23
**Status**: Draft
**Input**: Session state management for VS Code extension - managing temporal navigation, spatial viewport, feature data, and document lifecycle (dirty/save/undo)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - UI Components Receive State Updates (Priority: P1)

An analyst opens a plot in the VS Code extension. UI components (temporal slider, map view, properties window, outline) display consistent data that updates reactively as the analyst navigates through time or space.

**Why this priority**: This is the foundational capability that enables all other features. Without reactive state subscriptions, the UI cannot function coherently.

**Independent Test**: Can be fully tested by opening a plot and verifying that all UI components display synchronized data as the analyst changes the current time or viewport.

**Acceptance Scenarios**:

1. **Given** a plot is loaded with temporal data, **When** the analyst moves the time slider, **Then** the map view updates to show features at the selected time
2. **Given** a plot is displayed, **When** the analyst pans or zooms the map, **Then** the viewport state is updated and accessible to other components
3. **Given** features are displayed, **When** the analyst selects a feature on the map, **Then** the properties window shows the selected feature's attributes

---

### User Story 2 - Python Services Access State via MCP (Priority: P2)

An analyst uses Python-based analysis tools that need to query or modify session state. These tools access the current time, viewport, and selection through a well-defined interface, enabling scripted analysis workflows.

**Why this priority**: Python integration is essential for the "thick services, thin frontends" architecture, allowing analysis logic to be reused across different UI hosts.

**Independent Test**: Can be fully tested by calling session state tools from a Python script and verifying correct read/write behavior for all state slices.

**Acceptance Scenarios**:

1. **Given** a plot is open, **When** a Python tool queries the current time, **Then** it receives the time in a standardized format
2. **Given** a plot is open, **When** a Python tool sets the current time, **Then** the UI updates to reflect the new time
3. **Given** features are selected, **When** a Python tool queries the selection, **Then** it receives the list of selected feature IDs

---

### User Story 3 - Analyst Performs Undo/Redo (Priority: P3)

An analyst makes changes to the view state (time, viewport, selection) and wants to undo a recent change. They can revert to previous states and redo changes if needed.

**Why this priority**: Undo/redo is a core usability feature that reduces user frustration and supports exploratory analysis.

**Independent Test**: Can be fully tested by making a series of state changes (time, viewport, selection), performing undo operations, and verifying the state reverts correctly.

**Acceptance Scenarios**:

1. **Given** the analyst has changed the current time, **When** they invoke undo, **Then** the previous time is restored
2. **Given** the analyst has performed an undo, **When** they invoke redo, **Then** the undone change is reapplied
3. **Given** playback is running, **When** the analyst starts playback, **Then** the playback state is NOT recorded in undo history (ephemeral)

---

### User Story 4 - Analyst Saves and Loads Sessions (Priority: P4)

An analyst has configured a view (specific time, viewport, visible features) and wants to save this session. Later, they or a colleague can load the session and restore the exact same view configuration.

**Why this priority**: Session persistence enables analysts to share their work and resume analysis across sessions.

**Independent Test**: Can be fully tested by configuring a session, saving it, closing the editor, loading the saved session, and verifying all state is restored.

**Acceptance Scenarios**:

1. **Given** the analyst has configured a view, **When** they save the session, **Then** all persistent state is written to a file
2. **Given** a saved session file exists, **When** the analyst loads it, **Then** temporal, spatial, and feature state are restored
3. **Given** a session has been modified, **When** the analyst attempts to close without saving, **Then** they are warned about unsaved changes

---

### User Story 5 - Document Dirty Tracking (Priority: P5)

An analyst makes changes to the session state. The editor indicates when there are unsaved changes and clears this indicator when the session is saved.

**Why this priority**: Dirty tracking prevents data loss and provides clear feedback about session state.

**Independent Test**: Can be fully tested by making changes and verifying the dirty indicator appears, then saving and verifying it clears.

**Acceptance Scenarios**:

1. **Given** a freshly loaded session, **When** the analyst changes any persistent state, **Then** the document is marked as dirty
2. **Given** a dirty document, **When** the analyst saves, **Then** the dirty flag is cleared
3. **Given** ephemeral state changes (playback start/stop), **When** the state changes, **Then** the dirty flag remains unchanged

---

### User Story 6 - Developer Debugs State via Web Dashboard (Priority: P6)

A developer runs the session state server standalone (outside VS Code) and opens a separate debug dashboard HTML app in their browser. The dashboard connects to the server via HTTP and displays all state slices in real-time, allowing the developer to verify behavior and force state changes for testing.

**Why this priority**: Debug tooling accelerates development and enables testing without requiring the full VS Code environment. This is foundational for the "unit-testable core" approach. Keeping the dashboard separate from the server maintains the "thick services, thin frontends" architecture.

**Independent Test**: Can be fully tested by starting the standalone server, opening the dashboard HTML file in a browser, configuring the server URL, and verifying state displays update in real-time when modified via the MCP interface.

**Acceptance Scenarios**:

1. **Given** the server is running standalone, **When** a developer opens the dashboard HTML app and configures the server URL, **Then** they see the current state of all four slices
2. **Given** the dashboard is connected, **When** state changes via MCP tool call, **Then** the dashboard updates in real-time to reflect the change
3. **Given** the dashboard is connected, **When** the developer edits a state value and submits, **Then** the server state is updated via MCP and other clients are notified

---

### Edge Cases

- When loading a session file with an incompatible (future) schema version, the system MUST reject the load with a clear error message; older versions can be migrated forward per SC-007
- When loading a session that references a feature collection that no longer exists, the system MUST reject the load with an error message indicating the missing collection
- When undo is invoked with an empty history stack, the system MUST perform no action and return an indication that no undo was available
- When the time range is set to a zero-duration interval (start equals end), the system MUST accept this as a valid degenerate case representing a single point in time
- When the viewport polygon contains invalid coordinates (outside valid geographic bounds -180 to 180 longitude, -90 to 90 latitude), the system MUST reject the operation with a validation error

## Requirements *(mandatory)*

### Functional Requirements

**State Management Core**

- **FR-001**: System MUST provide centralized state management for a single open editor session
- **FR-002**: System MUST organize state into four logical slices: temporal, spatial, features, and document
- **FR-003**: UI components MUST be able to subscribe to specific state slices or subsets for reactive updates
- **FR-004**: System MUST support selective subscriptions to minimize unnecessary component updates
- **FR-004a**: System MUST automatically create a session with default state when a GeoJSON FeatureCollection is opened in the map editor

**Temporal State**

- **FR-005**: System MUST track the current playback/display time
- **FR-006**: System MUST track the full temporal extent (time range) of loaded data
- **FR-007**: System MUST support optional time filtering to constrain the visible time window
- **FR-008**: System MUST track the step size for discrete time navigation
- **FR-009**: System MUST support playback rate configuration (range: 0.1x to 100x)
- **FR-010**: System MUST track playback state (stopped, playing, paused) as ephemeral state
- **FR-011**: System MUST support display modes for track visualization (normal and snail trail)

**Spatial State**

- **FR-012**: System MUST track the visible map viewport as a geographic area
- **FR-013**: System MUST support rotated viewports for non-north-up orientations
- **FR-014**: System MUST provide operations to zoom the viewport to selected features
- **FR-015**: System MUST provide operations to fit the viewport to all loaded data

**Features State**

- **FR-016**: System MUST track a reference to the external feature collection
- **FR-017**: System MUST track which features are currently selected
- **FR-018**: System MUST track which features are hidden from display
- **FR-019**: Users MUST be able to toggle feature visibility

**Document State**

- **FR-020**: System MUST track whether unsaved changes exist (dirty flag)
- **FR-021**: System MUST maintain undo/redo history for persistent state changes
- **FR-022**: System MUST clear undo/redo history after successful save
- **FR-023**: Ephemeral state changes (playback control) MUST NOT be recorded in history

**Persistence**

- **FR-024**: System MUST save session state to a file in a defined format
- **FR-025**: System MUST load session state from a previously saved file
- **FR-026**: Saved files MUST include a schema version for future compatibility
- **FR-027**: System MUST reset ephemeral state (playback, dirty flag, history) on load

**Python Integration**

- **FR-028**: System MUST expose session state operations through a defined interface accessible from Python
- **FR-029**: Python tools MUST be able to read all state slices
- **FR-030**: Python tools MUST be able to modify state (triggering reactive UI updates)
- **FR-031**: State modifications from Python MUST be recorded in undo history

**Time Representation**

- **FR-032**: Time values MUST be stored internally as epoch milliseconds for efficient comparison
- **FR-033**: Time values MUST be serialized in ISO 8601 UTC format for interoperability

**Server Deployment**

- **FR-034**: Session state server MUST be runnable as a standalone process outside VS Code
- **FR-035**: Server MUST expose MCP interface via HTTP transport when running standalone
- **FR-036**: When embedded in VS Code, TypeScript UI components MUST access state directly (in-process) while Python accesses via HTTP
- **FR-037**: The same state management code MUST be used in both standalone and embedded modes
- **FR-037a**: Server MUST provide a Server-Sent Events (SSE) endpoint for real-time state change notifications

**Developer Tools**

- **FR-038**: Server MUST support CORS headers to allow access from standalone HTML applications
- **FR-039**: A separate debug dashboard application MUST be provided as a standalone HTML/JS app (not hosted by the server)
- **FR-040**: Dashboard MUST connect to the server via HTTP/MCP interface
- **FR-041**: Dashboard MUST display all four state slices with real-time updates via Server-Sent Events (SSE)
- **FR-042**: Dashboard MUST display features slice as a collapsible tree view showing feature IDs with name/type properties when available
- **FR-043**: Dashboard MUST display temporal, spatial, and document slices as editable fields
- **FR-044**: Dashboard MUST support inline editing - click to edit, submit on Enter or blur
- **FR-045**: State changes made via dashboard MUST use the same MCP tool interface as Python clients
- **FR-046**: Dashboard MUST accept server URL via URL parameter (`?server=`) with localStorage fallback
- **FR-047**: Dashboard MUST display editable server URL in header, persisted to localStorage
- **FR-048**: Dashboard MUST show connection status indicator (connected/disconnected)
- **FR-049**: Tool action buttons (undo, redo, save, load, playback) are deferred to a future phase

**Dashboard Testing & Screenshots**

- **FR-050**: Debug dashboard MUST be tested via Playwright e2e tests that drive the UI programmatically
- **FR-051**: Playwright tests MUST capture screenshots demonstrating dashboard behavior across different state configurations
- **FR-052**: Screenshots MUST demonstrate selection-sensitive tool behavior (showing how available tools change based on current selection)

### Key Entities

- **SessionState**: Composite entity containing all session state slices; the root of the persistence model
- **TemporalSlice**: Time-related state including current time, time range, filter, step size, playback rate, and display mode
- **SpatialSlice**: Geographic view state including viewport polygon, rotation, and derived center
- **FeaturesSlice**: Feature-related state including collection reference, selection, and visibility settings
- **DocumentSlice**: Editor state including dirty flag, save path, and undo/redo history
- **TimeInstant**: A point in time with both epoch (milliseconds) and ISO 8601 representations
- **TimeRange**: A temporal interval with start and end TimeInstants
- **TimeFilter**: Constraints on the visible time window (filtering criteria)
- **TimeStep**: Step size for discrete time navigation with unit and value
- **ViewportPolygon**: Geographic area as a 4-corner polygon supporting rotated views
- **FeatureSelection**: Set of selected feature identifiers with selection metadata

## Assumptions

- A single editor instance manages one session at a time (multi-editor support is a future consideration)
- Feature collection data is stored externally; session state only tracks references and view state
- All time values are in UTC
- Viewport change debouncing during rapid pan/zoom interactions is an implementation detail
- There is no enforced limit on the number of features that can be selected (reasonable performance expected)
- Time step auto-calculation from data density is handled at the application layer, not the state management layer
- State management core is unit-testable through programmatic tests without requiring UI or Python infrastructure; integration tests for UI reactivity and Python access will be added when those systems are available
- Concurrent state modifications from UI and Python follow last-write-wins semantics; no priority is given to either source

## Clarifications

### Session 2026-01-23

- Q: How can state management be verified without full UI/Python infrastructure? → A: Unit-testable core - State management logic verifiable through programmatic tests without UI; integration tests added later
- Q: How should opening a GeoJSON FeatureCollection relate to session state? → A: Auto-initialize - Opening a GeoJSON FeatureCollection in the map editor automatically creates a session with default state
- Q: How should the system handle loading a session referencing a missing feature collection? → A: Fail load - Reject session load entirely with error message
- Q: How should concurrent modifications from Python and UI be handled? → A: Last-write-wins - Whichever modification arrives last takes effect
- Q: How should incompatible (future) schema versions be handled? → A: Reject with error - Refuse to load with clear error message
- Q: How can developers test state management without VS Code? → A: Standalone server with HTTP/MCP interface plus web-based debug dashboard for monitoring and manipulating state
- Q: Should the debug dashboard be hosted by the server or separate? → A: Separate HTML app - keeps server minimal (pure API), allows independent evolution, aligns with "thick services, thin frontends"
- Q: How should dashboard configure server URL? → A: URL parameter (?server=) with editable header field, persisted to localStorage
- Q: How should dashboard receive real-time updates? → A: Server-Sent Events (SSE) from server
- Q: How should dashboard handle editing? → A: Inline editing - click to edit, submit on Enter/blur
- Q: What should features tree show? → A: Feature IDs with name/type properties when available
- Q: Which tool action buttons should dashboard have? → A: Deferred to future phase - focus on state display and editing first

### Session 2026-01-24

- Q: How should the debug dashboard be tested and documented visually? → A: Playwright e2e tests drive the dashboard UI, capture screenshots demonstrating selection-sensitive tool behavior

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: UI components reflect state changes within 100ms of the change being applied
- **SC-002**: Session state can be saved and loaded with 100% fidelity for all persistent fields
- **SC-003**: Undo/redo operations restore state exactly to previous values
- **SC-004**: Python tools can read and write all documented state fields without errors
- **SC-005**: System supports at least 50 undo steps before oldest entries are discarded
- **SC-006**: State changes trigger updates only to subscribed components (no unnecessary re-renders)
- **SC-007**: Session files from older schema versions can be migrated to the current version
- **SC-008**: Debug dashboard displays state changes within 200ms of modification
- **SC-009**: Standalone server can be started and accept MCP tool calls without any VS Code dependencies
- **SC-010**: Playwright e2e tests produce a visual artifact set (screenshots) demonstrating dashboard functionality and selection-sensitive tool availability
