# Feature Specification: Add GoldenLayout Panel Management

**Feature Branch**: `096-add-goldenlayout-panels`
**Created**: 2026-02-14
**Status**: Draft
**Input**: User description: "Transform web-shell to have levels of UI closer to VS Code. Adopt GoldenLayout for resizable, dockable panels. STAC catalog remains as welcome view. Panels should just-work when new views are added."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Resizable Panel Layout (Priority: P1)

An analyst opens a plot from the STAC catalog and sees the familiar layout: a sidebar on the left with grouped controls (Navigation panel with STAC tree, Activity panel with Time Controller/Tools/Layers, and a Log panel) and the map on the right with the chart below it. The analyst can now grab the border between the sidebar and the map and drag it to resize, giving more room to whichever area they need. They can also resize the divider between the map and chart vertically.

**Why this priority**: This is the foundational capability — replacing the current fixed CSS layout with a managed panel system. All other panel features depend on this working correctly.

**Independent Test**: Can be fully tested by opening any plot and dragging panel borders; delivers immediate value through resizable workspace areas.

**Acceptance Scenarios**:

1. **Given** a user has opened a plot, **When** the analysis workspace loads, **Then** the layout displays five panels arranged to mirror the current layout (Navigation sidebar, Activity sidebar, Log sidebar on the left; Map and Chart on the right).
2. **Given** the analysis workspace is displayed, **When** the user drags a panel border, **Then** the adjacent panels resize smoothly and their content reflows accordingly.
3. **Given** any panel has been resized, **When** the map panel size changes, **Then** the map automatically adjusts its viewport to fill the new dimensions without requiring a manual refresh.

---

### User Story 2 - Drag, Dock, and Tab Panels (Priority: P2)

An analyst wants to rearrange their workspace to suit a specific task. They drag the Log panel from the sidebar and dock it as a tab below the map. They drag the Chart panel and dock it alongside the Map as a tabbed view so they can switch between map and chart without both consuming screen space. They can also split any panel area horizontally or vertically to create new docking zones.

**Why this priority**: This extends the basic resizing with full workspace customization, which is the core value proposition of adopting GoldenLayout and the primary differentiator from the current fixed layout.

**Independent Test**: Can be tested by dragging any panel header and docking it in different positions; delivers the "VS Code-like" flexibility.

**Acceptance Scenarios**:

1. **Given** the analysis workspace is displayed, **When** the user drags a panel by its header, **Then** visual drop indicators show valid docking positions (top, bottom, left, right, center/tab).
2. **Given** a user drags a panel to the centre of another panel, **When** they release, **Then** the panels merge into a tabbed group where tabs can be clicked to switch between views.
3. **Given** a user drags a panel to the edge of the workspace, **When** they release, **Then** a new split is created and the panel docks in the chosen position.
4. **Given** a panel is in a tabbed group, **When** the user drags a tab out of the group, **Then** the panel undocks and can be placed elsewhere.

---

### User Story 3 - Pop-out Panels (Priority: P3)

An analyst working with dual monitors wants to pop the map panel out into a separate browser window so they can view it full-screen on a second display while keeping the controls and chart on the primary display. They can also pop out the chart panel to compare it side-by-side with the map across monitors.

**Why this priority**: Pop-out support is a power-user feature that maximizes screen real estate for multi-monitor setups. It builds on top of the docking system and has lower priority than in-window rearrangement.

**Independent Test**: Can be tested by triggering pop-out on any panel and verifying the panel renders correctly in its own browser window while remaining synchronized with the main workspace.

**Acceptance Scenarios**:

1. **Given** a panel header is visible, **When** the user activates the pop-out action (button or context menu), **Then** the panel opens in a new browser window at a reasonable default size.
2. **Given** a panel has been popped out, **When** the user interacts with controls in the main window (e.g., changes time position), **Then** the popped-out panel reflects those changes in real time.
3. **Given** a popped-out panel window is closed, **When** the user returns to the main workspace, **Then** the panel reappears in its most recent docked position.

---

### User Story 4 - Layout Persistence (Priority: P4)

An analyst customizes their panel layout during a session — resizing, rearranging, and tabbing panels to suit their workflow. When they close the browser and return later, their customized layout is automatically restored. If they want to start fresh, they can reset to the default layout.

**Why this priority**: Persistence avoids the frustration of re-arranging panels every session, but it depends on the panel system (P1-P3) being stable first.

**Independent Test**: Can be tested by arranging panels, refreshing the browser, and verifying the arrangement is preserved; then testing the reset-to-default action.

**Acceptance Scenarios**:

1. **Given** the user has customized the panel layout, **When** they close and reopen the browser, **Then** the layout is restored exactly as they left it.
2. **Given** a saved layout exists, **When** the user activates "Reset Layout" (via menu or button), **Then** the layout returns to the default five-panel arrangement.
3. **Given** the application has been updated with new panel definitions, **When** the user opens the application, **Then** a stale saved layout that references removed or changed panels is gracefully handled without errors, falling back to the default layout.

---

### User Story 5 - Welcome View Remains Standalone (Priority: P5)

When no plot is open, the user sees the existing CatalogOverview welcome view — a full-screen map showing plot bounding boxes with a timeline strip. This view operates outside of GoldenLayout. When the user selects a plot from the welcome view, the application transitions to the GoldenLayout-managed analysis workspace.

**Why this priority**: The welcome view already works well and does not need panel management. Keeping it separate avoids unnecessary complexity and preserves the clean landing experience.

**Independent Test**: Can be tested by loading the application with no plot open, verifying the welcome view appears, then opening a plot and verifying the transition to the panel-managed workspace.

**Acceptance Scenarios**:

1. **Given** no plot is loaded, **When** the application starts, **Then** the full-screen CatalogOverview welcome view is displayed without any GoldenLayout panel chrome.
2. **Given** the welcome view is displayed, **When** the user opens a plot, **Then** the view transitions to the GoldenLayout analysis workspace with the default panel arrangement.
3. **Given** the user is in the analysis workspace, **When** they close or navigate away from the current plot (returning to catalog), **Then** the welcome view is shown again without GoldenLayout chrome.

---

### Edge Cases

- What happens when the user closes all panels? A "reset layout" action should be available to restore the default arrangement; the workspace should never become permanently empty.
- What happens when the browser window is very narrow (e.g., mobile width)? Panels should have minimum size constraints to prevent content from becoming unusable; the layout should degrade gracefully.
- What happens when a panel's content component fails to load? The panel frame should still render with an error message inside it, rather than breaking the entire layout.
- What happens when localStorage is full or unavailable? Layout persistence should fail silently and the default layout should be used.
- What happens when a popped-out panel loses connection to the main window (e.g., main window navigates away)? The pop-out window should display a message indicating it is disconnected and offer to close.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST replace the current fixed CSS layout in the analysis workspace with a managed panel layout system that supports resizing, dragging, docking, tabbing, and splitting.
- **FR-002**: System MUST arrange the default analysis workspace into five panels: Navigation (STAC file tree), Activity (Time Controller, Tools, Layers), Log, Map, and Chart.
- **FR-003**: System MUST allow users to resize panels by dragging the borders between them, with smooth content reflow.
- **FR-004**: System MUST allow users to drag panels by their headers and dock them at new positions (top, bottom, left, right, or as a tab).
- **FR-005**: System MUST display visual drop indicators during drag operations to show valid docking positions.
- **FR-006**: System MUST support tabbed panel groups where multiple panels share the same area and users switch between them via tab headers.
- **FR-007**: System MUST support popping out individual panels into separate browser windows.
- **FR-008**: Popped-out panels MUST remain synchronized with the main workspace state (selection, time position, feature visibility).
- **FR-009**: System MUST persist the user's panel layout to browser local storage and restore it when the application is reopened.
- **FR-010**: System MUST provide a "Reset Layout" action that restores the default five-panel arrangement.
- **FR-011**: System MUST handle stale or invalid saved layouts gracefully (e.g., after application updates) by falling back to the default layout without errors.
- **FR-012**: The CatalogOverview welcome view MUST remain full-screen and operate independently of the panel management system.
- **FR-013**: System MUST transition cleanly between the welcome view (no panels) and the analysis workspace (panel-managed) when a plot is opened or closed.
- **FR-014**: Each panel MUST enforce a minimum size to prevent content from becoming unusable.
- **FR-015**: The map panel MUST automatically re-render to fill its new dimensions after any resize or layout change.
- **FR-016**: System MUST allow new panel types to be registered and added to the layout without modifying the panel management infrastructure (extensible panel registry).

### Key Entities

- **Panel**: A discrete, self-contained view within the workspace (e.g., Map, Chart, Navigation). Has a type identifier, title, minimum dimensions, and content component.
- **Panel Layout**: The spatial arrangement of all panels including their positions, sizes, tab groupings, and split hierarchy. Can be serialized for persistence and deserialized for restoration.
- **Panel Group**: A collection of panels sharing the same spatial area, displayed as a tabbed stack with clickable tab headers.
- **Panel Registry**: A catalog of available panel types that maps type identifiers to their display names, default positions, and content components. New panels are added by registering entries here.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Arrange workspace panels to optimize screen space for the current analytical task.
- **Key Decision(s)**:
  1. Which panels to keep visible and where to position them.
  2. Whether to pop out panels for multi-monitor use.
  3. Whether to reset a custom layout back to defaults.
- **Decision Inputs**: Panel headers showing panel names; drop-zone indicators during drag; visual feedback on valid dock targets; the current workspace arrangement providing spatial context.

### Screen Progression

| Step | Screen/State          | User Action                        | Result                                                       |
|------|-----------------------|------------------------------------|--------------------------------------------------------------|
| 1    | Welcome view          | User opens a plot from STAC catalog | Transitions to analysis workspace with default panel layout  |
| 2    | Default panel layout  | User drags a panel border          | Adjacent panels resize; content reflows                      |
| 3    | Resized layout        | User drags a panel header          | Drop indicators appear; panel detaches and follows cursor    |
| 4    | Panel being dragged   | User drops panel on a dock target  | Panel docks at new position (split or tab)                   |
| 5    | Custom layout         | User clicks pop-out button on panel | Panel opens in a new browser window                          |
| 6    | Multi-window layout   | User closes the browser            | Layout is saved to local storage                             |
| 7    | Returning user        | User reopens the application       | Saved layout is restored; panels appear as previously arranged |
| 8    | Any layout state      | User activates "Reset Layout"      | Default five-panel arrangement is restored                   |

### UI States

- **Empty State**: When the analysis workspace loads with no prior saved layout, the default five-panel arrangement is displayed: Navigation and Activity panels in a left sidebar column, Log panel below them, Map panel occupying the main area, Chart panel below the Map.
- **Loading State**: During plot loading, panels render their individual loading indicators (e.g., map shows a loading spinner, layers panel shows placeholder). The panel chrome (headers, borders) renders immediately.
- **Error State**: If a panel's content fails to load, the panel frame remains intact with an error message inside it. The rest of the layout continues to function normally. If a saved layout cannot be restored, the system falls back to the default layout with a brief notification.
- **Success State**: All panels render their content, borders are draggable, headers are draggable for docking, and the workspace is fully interactive.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can resize any panel border and see content reflow within 100 milliseconds, with no visible jank or layout thrashing.
- **SC-002**: Users can rearrange panels via drag-and-dock in under 3 seconds per operation (drag, see indicators, drop, layout settles).
- **SC-003**: 100% of existing features (map interaction, time control, tool execution, layer management, drawing, selection, chart rendering) continue to work correctly within the new panel layout.
- **SC-004**: A user's custom layout is faithfully restored after closing and reopening the browser, with no panel position or size drift.
- **SC-005**: Adding a new panel type to the system requires only registering it in the panel registry — no changes to the layout management infrastructure.
- **SC-006**: The welcome-to-analysis transition and analysis-to-welcome transition each complete within 1 second with no visual glitches.

## Assumptions

- GoldenLayout (https://github.com/golden-layout/golden-layout) will be used as the panel management library. It provides all required capabilities (resize, drag, dock, tab, pop-out, serialization).
- The web-shell analysis workspace is rendered in a standard browser context where pop-out windows and localStorage are available. In restricted contexts (e.g., noVNC demo), pop-out may be unavailable; the system should degrade gracefully.
- Existing shared React components (MapView, TimeController, ToolsPanel, FeatureList, LogPanel, etc.) will be wrapped as GoldenLayout panel content without requiring internal changes to those components.
- The STAC File Tree, which is currently a VS Code tree provider in the extension host, will need a web-compatible equivalent for the web-shell Navigation panel. The existing CatalogOverview component's file tree functionality can be leveraged.
- State synchronization between panels will continue to use the existing Zustand session-state store. Pop-out windows will need access to the same store instance or a synchronized replica.
