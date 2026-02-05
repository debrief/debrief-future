# Feature Specification: Refactor VS Code Map to Thin Wrapper

**Feature Branch**: `048-refactor-vscode-map-wrapper`
**Created**: 2026-02-04
**Status**: Draft
**Input**: User description: "The vs-code `apps/vscode/src/webview/map.ts` component should just be a very _Thin_ wrapper around the map in shared/components/src/MapView - just handling the integration of the component with vs-code and the other services. It's challenging to test vs-code based components - unless they are related to integration with vs-code, components and capabilities should be in shared components or shared services."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Test Map Features Without VS Code Environment (Priority: P1)

As a developer, I want to test map rendering, selection, and temporal features using standard testing tools without needing to spin up a VS Code extension host, so that I can verify map behavior quickly and reliably.

**Why this priority**: Testing is currently difficult because map functionality is embedded in VS Code-specific code. Moving functionality to shared components enables standard unit and integration testing, improving development velocity and code quality.

**Independent Test**: Can be verified by running `npm test` in the shared components package and seeing comprehensive map tests pass—no VS Code environment required.

**Acceptance Scenarios**:

1. **Given** the shared MapView component, **When** a developer runs tests with standard tooling, **Then** all map functionality (rendering, selection, bounds, temporal display) can be tested without VS Code.

2. **Given** a map rendering issue is reported, **When** a developer reproduces it in Storybook, **Then** they can debug and fix it without setting up VS Code extension debugging.

3. **Given** the shared MapView component, **When** it receives GeoJSON features, **Then** it renders tracks, locations, and other features identically to how they appear in VS Code.

---

### User Story 2 - VS Code Extension Renders Map via Shared Component (Priority: P1)

As a VS Code extension user, I want the map panel to display maritime plots exactly as before, so that the refactoring does not change my user experience.

**Why this priority**: The refactoring must be invisible to end users—same rendering, same interactions, same performance.

**Independent Test**: Can be verified by opening the map panel in VS Code, loading a REP file, and confirming all existing features work identically.

**Acceptance Scenarios**:

1. **Given** a user opens the Debrief map panel in VS Code, **When** the extension loads plot data, **Then** the map displays tracks, locations, and features using the shared MapView component.

2. **Given** a user selects a track on the map, **When** they click on it, **Then** the selection is communicated to VS Code and reflected in both the map and the extension state.

3. **Given** temporal data is present, **When** the user adjusts the time controller, **Then** the map updates to show the correct temporal position using the shared component's temporal rendering.

---

### User Story 3 - VS Code Wrapper Handles Only Integration Concerns (Priority: P2)

As a maintainer, I want the VS Code map wrapper to handle only VS Code-specific integration (message passing, state persistence, drag-and-drop from explorer), so that I can modify map behavior in one place and have it work across all platforms.

**Why this priority**: Code duplication between VS Code and shared components leads to maintenance burden and feature drift. A thin wrapper ensures single source of truth for map behavior.

**Independent Test**: Can be verified by code review—the wrapper should contain only VS Code API calls, message handlers, and event bridges, with no map rendering logic.

**Acceptance Scenarios**:

1. **Given** the VS Code map wrapper code, **When** a developer reviews it, **Then** it contains no direct Leaflet rendering calls—only message passing and event bridging to the shared component.

2. **Given** an extension message arrives (e.g., `loadPlot`), **When** the wrapper processes it, **Then** it transforms the message to props and passes them to the shared MapView.

3. **Given** a user drags a REP file onto the map, **When** the drop event fires, **Then** the wrapper sends a message to the extension (VS Code integration), not the shared component.

---

### User Story 4 - Storybook Shows Map Component Variants (Priority: P3)

As a designer or developer, I want to preview the map component in Storybook with various states (empty, loaded, selected, temporal), so that I can design and develop map features visually.

**Why this priority**: Storybook provides a component catalog for visual development and documentation. Once map functionality is in shared components, it becomes Storybook-accessible.

**Independent Test**: Can be verified by running Storybook and navigating to MapView stories showing different states.

**Acceptance Scenarios**:

1. **Given** the shared components Storybook, **When** a developer opens it, **Then** MapView stories demonstrate empty, loaded, selected, and temporal states.

2. **Given** a MapView story with temporal data, **When** a developer interacts with the time controls, **Then** the track rendering updates in real-time within Storybook.

---

### Edge Cases

- What happens when the shared component is unavailable or fails to load? The VS Code wrapper should display an error state rather than a blank panel.
- How does state persistence work across webview lifecycle? The wrapper must restore map center/zoom from VS Code state and pass it to the shared component on reload.
- What happens if the shared component's API changes? TypeScript type checking should catch incompatibilities at build time.
- How are VS Code theme variables applied to the shared component? CSS variables from VS Code must be bridged to the shared component's theming system.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The shared MapView component MUST render all feature types currently supported (tracks, reference locations, polygons, calculation results).
- **FR-002**: The shared MapView component MUST support feature selection with callbacks for selection changes.
- **FR-003**: The shared MapView component MUST support temporal rendering (snail-trail and full-track modes) when provided with current time.
- **FR-004**: The VS Code wrapper MUST transform extension messages into MapView props.
- **FR-005**: The VS Code wrapper MUST forward user interactions (selection, bounds changes) back to the extension via postMessage.
- **FR-006**: The VS Code wrapper MUST handle VS Code-specific features: state persistence, drag-and-drop from explorer, keyboard shortcuts for undo/redo.
- **FR-007**: The VS Code wrapper MUST apply VS Code theme variables to the shared component.
- **FR-008**: The shared MapView component MUST be fully testable with standard testing frameworks.
- **FR-009**: The shared MapView component MUST support the same toolbar actions (zoom in/out, fit bounds, export) through callbacks.
- **FR-010**: The refactored system MUST maintain identical visual output and user experience to the current implementation.

### Key Entities

- **MapView**: The shared React component providing map rendering, feature display, and interaction handling.
- **VS Code Wrapper**: The thin integration layer handling message passing, state persistence, and VS Code-specific events.
- **Extension Message**: Communication protocol between VS Code extension backend and webview wrapper.
- **Feature**: GeoJSON data representing tracks, locations, polygons, or calculation results.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 80% of map functionality (rendering, selection, temporal) is covered by tests in the shared components package, executable without VS Code.
- **SC-002**: The VS Code wrapper code is reduced to less than 200 lines, containing only integration logic.
- **SC-003**: All existing VS Code map panel functionality works identically after refactoring—verified by manual testing checklist.
- **SC-004**: MapView component has Storybook stories demonstrating at least 4 distinct states (empty, loaded, selected, temporal).
- **SC-005**: Build times remain within 10% of current duration.

## Assumptions

- The shared MapView component already exists at `shared/components/src/MapView` and provides core rendering functionality.
- The current VS Code webview uses vanilla TypeScript with Leaflet, while the shared component uses React with react-leaflet. The wrapper will need to bridge these approaches.
- VS Code webview supports React rendering, or the wrapper will use a React rendering entrypoint.
- The existing message protocol between VS Code extension and webview will be preserved.
- Performance characteristics will remain acceptable since the underlying Leaflet library is the same.

## Dependencies

- Shared MapView component must expose all necessary props for feature rendering, selection, and temporal control.
- VS Code webview bundling must include React and the shared component.
- Any features missing from the shared MapView component must be added before the wrapper can be completed.

## Out of Scope

- Rewriting the VS Code extension backend—only the webview map rendering is being refactored.
- Changing the message protocol between extension and webview.
- Adding new map features—this is purely a refactoring effort.
- Performance optimization beyond maintaining current levels.
