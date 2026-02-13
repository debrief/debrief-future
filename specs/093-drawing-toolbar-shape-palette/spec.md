# Feature Specification: Drawing Toolbar with Shape Palette

**Feature Branch**: `093-drawing-toolbar-shape-palette`
**Created**: 2026-02-13
**Status**: Draft
**Input**: User description: "[E05] Add drawing toolbar with shape palette — add a '+' (add shape) button to the existing LeafletToolbar component; clicking '+' opens a dropdown/popover showing available shape types (Point, Rectangle, Polygon, Polyline) with icons; selecting a shape type activates Geoman drawing mode via map.pm.enableDraw(); add drawingMode state to session-state store (null | 'point' | 'rectangle' | 'polygon' | 'polyline'); pressing Esc or clicking '+' again cancels drawing mode; active drawing mode is visually indicated (highlighted button, cursor change); requires #092 (Geoman integration); part of Epic E05 Shape Drawing Tools"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Select and Activate a Shape Drawing Mode (Priority: P1)

An analyst viewing a plot on the map wants to draw a rectangle to define a patrol area. They click the '+' button on the map toolbar, which opens a small dropdown showing four shape options with recognizable icons: Point, Rectangle, Polygon, and Polyline. They click Rectangle. The dropdown closes, the '+' button changes appearance to indicate drawing is active, and the map cursor changes to a crosshair. The analyst draws a rectangle on the map by clicking and dragging.

**Why this priority**: This is the core interaction — entering drawing mode via the shape palette. Without this, no shapes can be drawn. It delivers the full happy-path value of the feature.

**Independent Test**: Can be fully tested by clicking the '+' button, selecting a shape from the dropdown, and verifying the map enters the corresponding drawing mode with visual feedback.

**Acceptance Scenarios**:

1. **Given** the map toolbar is visible, **When** the analyst clicks the '+' button, **Then** a dropdown appears showing four shape options (Point, Rectangle, Polygon, Polyline) each with a distinct icon.
2. **Given** the shape dropdown is open, **When** the analyst clicks "Rectangle", **Then** the dropdown closes, the '+' button shows an active/highlighted state, and the map enters rectangle drawing mode (crosshair cursor).
3. **Given** the shape dropdown is open, **When** the analyst clicks "Polygon", **Then** the dropdown closes, the '+' button shows an active state, and the map enters polygon drawing mode.
4. **Given** the shape dropdown is open, **When** the analyst clicks "Point", **Then** the dropdown closes, the '+' button shows an active state, and the map enters point/marker placement mode.
5. **Given** the shape dropdown is open, **When** the analyst clicks "Polyline", **Then** the dropdown closes, the '+' button shows an active state, and the map enters polyline drawing mode.

---

### User Story 2 - Cancel Drawing Mode (Priority: P1)

An analyst has activated polygon drawing mode but changes their mind. They press the Escape key. The drawing mode deactivates — the '+' button returns to its default appearance, the cursor reverts to normal, and any partially drawn shape is discarded. Alternatively, the analyst could click the '+' button again to cancel.

**Why this priority**: Equally critical to activation — users must be able to exit drawing mode without completing a shape. A mode with no escape is unusable.

**Independent Test**: Can be fully tested by entering any drawing mode, pressing Escape (or clicking '+'), and verifying drawing mode ends and the toolbar returns to its default state.

**Acceptance Scenarios**:

1. **Given** a drawing mode is active, **When** the analyst presses the Escape key, **Then** drawing mode is cancelled, the '+' button returns to its default state, the cursor reverts to normal, and any in-progress shape is discarded.
2. **Given** a drawing mode is active, **When** the analyst clicks the '+' button, **Then** drawing mode is cancelled and the dropdown does NOT open (single click cancels, does not toggle to palette).
3. **Given** a drawing mode is active, **When** a shape is successfully completed (e.g., user finishes drawing a rectangle), **Then** drawing mode automatically deactivates and the toolbar returns to its default state.

---

### User Story 3 - Drawing State Persists Across Component Updates (Priority: P2)

An analyst activates polygon drawing mode. While in drawing mode, the time slider updates or a feature is selected elsewhere in the application. The drawing mode remains active — the session state store preserves the active drawing mode across these component re-renders. If the analyst switches to a different plot document, drawing mode resets to inactive.

**Why this priority**: State management ensures the drawing mode survives incidental UI updates. Without this, the feature would feel fragile as drawing mode could randomly cancel. However, it is lower priority than the core UI interaction.

**Independent Test**: Can be tested by entering drawing mode, triggering an unrelated state change (e.g., time slider movement), and verifying drawing mode remains active.

**Acceptance Scenarios**:

1. **Given** drawing mode is active, **When** an unrelated state change occurs (time slider, feature selection), **Then** drawing mode remains active and the toolbar still shows the active state.
2. **Given** drawing mode is active in one plot, **When** the analyst switches to a different plot document, **Then** drawing mode resets to inactive (null).
3. **Given** the application stores drawing mode state, **When** the session is persisted or serialized, **Then** drawing mode is NOT included in persistent state (it is ephemeral/transient).

---

### User Story 4 - Storybook Demonstration (Priority: P3)

A developer opens Storybook and navigates to a "DrawingToolbar" story. The story shows the map toolbar with the '+' button. Clicking '+' opens the shape dropdown. Selecting a shape activates drawing mode on the map. The story logs drawing mode changes via Storybook actions. A second story shows the toolbar in its active/highlighted state for visual verification.

**Why this priority**: The Storybook story validates the component in isolation and serves as living documentation for downstream E05 consumers (#094, #095). Lower priority because it verifies rather than delivers core functionality.

**Independent Test**: Can be tested by running Storybook, interacting with the '+' button and shape dropdown, and verifying the actions panel logs the correct drawing mode transitions.

**Acceptance Scenarios**:

1. **Given** Storybook is running, **When** the developer navigates to the DrawingToolbar story, **Then** the map renders with a toolbar containing the '+' button alongside existing zoom/fit buttons.
2. **Given** the DrawingToolbar story is active, **When** the developer clicks '+' and selects a shape, **Then** the Storybook actions panel logs the drawing mode change (e.g., `drawingMode: 'polygon'`).
3. **Given** the DrawingToolbar story is active, **When** the developer presses Escape while drawing, **Then** the Storybook actions panel logs the drawing mode reset (e.g., `drawingMode: null`).

---

### Edge Cases

- What happens when the user clicks '+' while already in drawing mode? Drawing mode is cancelled; the dropdown does NOT open. A second click on '+' (after cancellation) opens the dropdown normally.
- What happens when the user clicks outside the dropdown without selecting a shape? The dropdown dismisses and no drawing mode is activated. The toolbar remains in its default state.
- What happens when the user rapidly clicks different shape options? Each click replaces the previous selection — only one drawing mode can be active at a time. The system disables the current mode before enabling the new one.
- What happens when Geoman is not available (e.g., failed to initialize)? The '+' button is not rendered. The toolbar degrades gracefully to zoom/fit buttons only.
- What happens when the map is very small (narrow panel)? The dropdown positions itself to stay within the visible viewport, adjusting direction if necessary to avoid overflow.
- What happens when the user is in drawing mode and the toolbar is removed (e.g., `showToolbar` set to false)? Drawing mode is cancelled during cleanup — the session state is reset to null.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The map toolbar MUST display a '+' (add shape) button after the existing zoom and fit-to-window buttons.
- **FR-002**: Clicking the '+' button MUST open a dropdown/popover displaying four shape options: Point, Rectangle, Polygon, and Polyline.
- **FR-003**: Each shape option in the dropdown MUST display a distinct, recognizable icon alongside a text label.
- **FR-004**: Selecting a shape from the dropdown MUST activate the corresponding drawing mode on the map and close the dropdown.
- **FR-005**: The '+' button MUST show a visually distinct active state (highlighted appearance) while any drawing mode is active.
- **FR-006**: Pressing the Escape key while in drawing mode MUST cancel drawing, reset the toolbar to its default state, and discard any in-progress shape.
- **FR-007**: Clicking the '+' button while drawing mode is active MUST cancel drawing mode without opening the dropdown.
- **FR-008**: When a shape is successfully completed (drawn on the map), drawing mode MUST automatically deactivate and the toolbar MUST return to its default state.
- **FR-009**: The application MUST track the active drawing mode in session state with one of five values: null (no drawing), 'point', 'rectangle', 'polygon', or 'polyline'.
- **FR-010**: Drawing mode state MUST be ephemeral — it MUST NOT be included in persistent/saved session state.
- **FR-011**: Only one drawing mode can be active at a time across the entire application.
- **FR-012**: The '+' button MUST NOT be rendered when the underlying drawing library is unavailable.
- **FR-013**: Clicking outside the dropdown (on the map or elsewhere) MUST dismiss the dropdown without activating any drawing mode.
- **FR-014**: The dropdown MUST position itself to remain within the visible viewport, adjusting direction if it would otherwise overflow.
- **FR-015**: The existing proof-of-concept single-shape drawing button MUST be removed and replaced by this feature.
- **FR-016**: The toolbar MUST clean up drawing mode (cancel any active drawing, reset state to null) when the toolbar is removed from the map.

### Key Entities

- **Drawing Mode**: The currently active shape drawing state. One of: null (inactive), 'point', 'rectangle', 'polygon', or 'polyline'. Tracked in session state as an ephemeral (non-persistent) value.
- **Shape Palette**: A dropdown/popover UI element attached to the '+' button, listing the four available shape types with icons and labels. Dismissed on selection, outside click, or Escape.
- **'+' Button**: The toolbar button that opens the shape palette when no drawing is active, and cancels drawing when a mode is active. Displays an active/highlighted visual state during drawing.

## User Interface Flow *(optional - include for UI features)*

### Decision Analysis

- **Primary Goal**: Select a shape type to draw on the map, or cancel an active drawing operation.
- **Key Decision(s)**:
  1. Which shape type to draw (Point, Rectangle, Polygon, or Polyline)
  2. Whether to cancel or complete an in-progress drawing
- **Decision Inputs**: The shape icons and labels in the dropdown help the analyst choose the correct geometry type for their intended annotation. The highlighted '+' button indicates whether a drawing operation is currently in progress.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Map visible with toolbar ('+' in default state) | Analyst clicks '+' button | Shape dropdown opens showing 4 options |
| 2 | Dropdown open with Point, Rectangle, Polygon, Polyline | Analyst clicks a shape option | Dropdown closes, '+' highlights, map enters drawing mode |
| 3 | Drawing mode active (crosshair cursor, '+' highlighted) | Analyst draws shape on map | Shape appears on map; drawing mode deactivates |
| 4 | Drawing mode active | Analyst presses Escape | Drawing cancelled, '+' returns to default, cursor normal |
| 5 | Drawing mode active | Analyst clicks '+' button | Drawing cancelled (same as Escape), no dropdown opens |

### UI States

- **Default State**: '+' button displayed in standard toolbar style. No dropdown visible. Map interaction is normal (pan, zoom, select).
- **Dropdown Open State**: '+' button pressed/focused, dropdown visible below or beside the button showing four shape options with icons. Map interaction paused for the dropdown area.
- **Drawing Active State**: '+' button highlighted/active. Dropdown is closed. Map cursor is crosshair. Analyst is drawing a shape. Clicking '+' or pressing Escape cancels.
- **Geoman Unavailable State**: '+' button is not rendered. Toolbar shows only zoom and fit buttons. No degraded or error message — the button simply does not appear.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The shape palette dropdown opens within a single click from the toolbar and displays all four shape types with distinguishable icons.
- **SC-002**: Selecting any of the four shape types successfully activates the corresponding drawing mode on the map, verified by cursor change and ability to draw.
- **SC-003**: Drawing mode can be cancelled via Escape key or '+' button click from any active drawing state, with the toolbar reverting to its default appearance.
- **SC-004**: The session state store accurately reflects the current drawing mode at all times — null when inactive, and the correct shape type string when active.
- **SC-005**: Drawing mode automatically deactivates upon shape completion, so the analyst does not need to manually exit drawing mode after finishing a shape.
- **SC-006**: The proof-of-concept single-shape drawing button from the prior integration is fully removed and replaced by the shape palette.
- **SC-007**: A Storybook story demonstrates the complete interaction: opening the dropdown, selecting shapes, active state indication, and cancellation.
- **SC-008**: All existing map interactions (pan, zoom, select, time slider) continue to work correctly when no drawing mode is active.

## Assumptions

- The Geoman drawing library (#092) is already integrated into the map component and initialized during map mount. This feature builds on that foundation.
- Geoman's `map.pm.enableDraw()` and `map.pm.disableDraw()` APIs are available and support the four shape types: Marker (for Point), Rectangle, Polygon, and Polyline.
- The shape type names in the session state ('point', 'rectangle', 'polygon', 'polyline') map to Geoman's internal shape type identifiers, which may differ (e.g., 'Marker' for 'point').
- The '+' button icon is a plus symbol, consistent with "add" semantics used in other creative/authoring tools.
- Drawing mode is per-plot — switching plot documents resets drawing mode. Multiple plots open simultaneously each have independent drawing state.
- The dropdown uses the same visual language (colors, fonts, spacing) as existing toolbar elements and respects the active theme.
- Completed shapes are handled by downstream features (#094, #095) — this feature is only responsible for entering/exiting drawing mode and tracking state. The `pm:create` event signals shape completion but persistence and rendering of created shapes is out of scope.
- The Escape key listener for cancellation does not conflict with other keyboard shortcuts in the application. If other Escape handlers exist, drawing mode cancellation takes priority when drawing is active.

## Technology

- TypeScript 5.x (VS Code extension webview, shared components)
- React 18.x, react-leaflet 4.2, Leaflet 1.9.x (existing stack)
- @geoman-io/leaflet-geoman-free ^2.19.2 (installed by #092)
- Zustand ^5.0.0 (session-state store, existing)
- Storybook 8.x (story development and verification)
- VS Code Extension API ^1.85.0 (webview host)
