# Feature Specification: Drawing UX Guidance and STAC Persistence

**Feature Branch**: `096-drawing-ux-persistence`
**Created**: 2026-02-14
**Status**: Draft
**Epic**: E05 — Shape Drawing Tools
**Input**: User description: "[E05] Drawing UX guidance and STAC persistence — Context-sensitive instruction overlays during drawing modes, default shape styling with sequential color assignment, and persistence of user-drawn shapes to the STAC catalog with provenance metadata."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Drawing Mode Guidance Overlay (Priority: P1)

An analyst activates rectangle drawing mode from the shape palette. A subtle guidance overlay appears near the map edge or cursor area displaying "Click and drag to draw rectangle" along with "Press Esc to cancel". The analyst follows the instructions, draws the rectangle, and the guidance disappears when drawing mode deactivates. Later, the analyst selects polygon mode and sees updated guidance: "Click to add vertices, double-click to finish" with the same Esc cancellation hint. The guidance is unobtrusive — it does not obscure the map content or interfere with the drawing interaction.

**Why this priority**: Drawing guidance is the most immediately visible improvement to the drawing experience. Without it, analysts must already know the interaction gestures for each shape type. Guidance reduces the learning curve and prevents confusion, especially for multi-vertex modes (polygon, polyline) where the completion gesture (double-click) is not discoverable without instruction.

**Independent Test**: Can be fully tested by activating each of the four drawing modes and verifying that the correct, mode-specific guidance text is displayed, and that it disappears when drawing is cancelled or completed.

**Acceptance Scenarios**:

1. **Given** no drawing mode is active, **When** the analyst activates point drawing mode, **Then** guidance text "Click to place point" and "Press Esc to cancel" appears on the map.
2. **Given** no drawing mode is active, **When** the analyst activates rectangle drawing mode, **Then** guidance text "Click and drag to draw rectangle" and "Press Esc to cancel" appears on the map.
3. **Given** no drawing mode is active, **When** the analyst activates polygon drawing mode, **Then** guidance text "Click to add vertices, double-click to finish" and "Press Esc to cancel" appears on the map.
4. **Given** no drawing mode is active, **When** the analyst activates polyline drawing mode, **Then** guidance text "Click to add vertices, double-click to finish" and "Press Esc to cancel" appears on the map.
5. **Given** drawing guidance is displayed, **When** the analyst completes a shape or presses Escape, **Then** the guidance text disappears immediately.
6. **Given** drawing guidance is displayed, **When** the analyst is drawing on the map, **Then** the guidance overlay does not obscure or interfere with the drawing interaction.

---

### User Story 2 - Persist Drawn Shapes to STAC Catalog (Priority: P1)

An analyst draws a polygon on the map to mark an area of interest. The shape is automatically saved to the active STAC Item as a GeoJSON feature with provenance metadata recording that it was user-drawn, when it was created, and by whom. The analyst closes the plot and reopens it later. The drawn polygon appears exactly as it was, loaded from the STAC catalog alongside other features in the plot.

**Why this priority**: Without persistence, all drawn annotations are lost when the plot is closed. This is equally critical to guidance because it delivers the fundamental promise of drawing — that annotations are durable and part of the plot record. Without it, drawing is effectively a throwaway feature.

**Independent Test**: Can be fully tested by drawing a shape, closing the plot, reopening it, and verifying the drawn shape reappears with correct geometry, styling, and provenance metadata.

**Acceptance Scenarios**:

1. **Given** an analyst draws a shape on an active plot, **When** the shape is completed, **Then** the shape is persisted to the active STAC Item as a GeoJSON feature.
2. **Given** a drawn shape has been persisted, **When** the plot is closed and reopened, **Then** the drawn shape is loaded and rendered on the map with the same geometry and styling as when it was drawn.
3. **Given** a drawn shape has been persisted, **When** its metadata is inspected, **Then** it contains provenance information: source marked as "user-drawn", a creation timestamp, and an operator identifier.
4. **Given** multiple shapes are drawn on the same plot, **When** the plot is reopened, **Then** all drawn shapes are loaded in the correct order and with correct geometry.
5. **Given** an existing plot with previously imported data features, **When** a user-drawn shape is persisted, **Then** the existing features remain unchanged and the drawn shape is added alongside them.

---

### User Story 3 - Default Shape Styling with Visual Distinction (Priority: P2)

An analyst draws three shapes in succession on the map — a rectangle, a polygon, and a polyline. Each shape receives a sensible default color from a drawing palette, and consecutive shapes are visually distinct so the analyst can tell them apart at a glance. The first shape might be blue, the second orange, the third green. If the analyst draws more shapes than there are colors in the palette, the colors cycle back to the beginning.

**Why this priority**: Default styling ensures drawn shapes are immediately visible and distinguishable without requiring manual colour configuration. This is important for usability but is secondary to guidance and persistence because shapes already receive basic default styling from features 094/095 — this story enhances that with sequential colour variation.

**Independent Test**: Can be tested by drawing 3+ shapes in succession and verifying each receives a different default colour from the palette, and that the colours cycle after the palette is exhausted.

**Acceptance Scenarios**:

1. **Given** a shape is drawn on the map, **When** no custom styling has been applied, **Then** the shape receives default colour and weight values from the drawing palette.
2. **Given** two shapes are drawn in succession, **When** both shapes are on the map, **Then** they have visually distinct default colours (not the same colour).
3. **Given** the number of consecutively drawn shapes exceeds the number of colours in the palette, **When** the next shape is drawn, **Then** the colour assignment cycles back to the beginning of the palette.
4. **Given** the drawing palette defines a set of default colours, **When** a shape is drawn, **Then** the assigned colour is recorded in the feature's styling properties so it persists across sessions.

---

### User Story 4 - Cursor Changes During Drawing (Priority: P2)

An analyst activates any drawing mode. The map cursor immediately changes from the default pointer to a crosshair, providing a clear visual signal that the map is in drawing mode. When drawing mode ends (by shape completion, Escape, or toolbar cancel), the cursor reverts to the default pointer.

**Why this priority**: Cursor feedback is a standard UX convention for drawing tools and reinforces the mode state. It is important but secondary to the textual guidance because it provides less information (it signals "you're in drawing mode" but not "how to draw").

**Independent Test**: Can be tested by activating each drawing mode and verifying the cursor changes to crosshair, then completing or cancelling and verifying it reverts.

**Acceptance Scenarios**:

1. **Given** no drawing mode is active, **When** the analyst activates any drawing mode (point, rectangle, polygon, polyline), **Then** the map cursor changes to a crosshair.
2. **Given** drawing mode is active with crosshair cursor, **When** the analyst completes a shape, **Then** the cursor reverts to the default pointer.
3. **Given** drawing mode is active with crosshair cursor, **When** the analyst presses Escape or clicks the '+' button to cancel, **Then** the cursor reverts to the default pointer.

---

### User Story 5 - No Regressions in Existing STAC Operations (Priority: P2)

The persistence of user-drawn shapes uses the existing STAC write path. After this feature is implemented, all existing STAC operations — reading plots, writing plots, loading imported data features — continue to work correctly. The addition of user-drawn features to STAC Items does not corrupt or interfere with pre-existing data.

**Why this priority**: Regression-free integration with the existing STAC storage is critical for system integrity. This story captures the constraint that persistence must build on — not break — the existing storage pipeline.

**Independent Test**: Can be tested by running the existing STAC read/write test suite and verifying all tests pass after persistence is added. Additionally, opening a plot with only imported data (no drawn shapes) should work identically to before.

**Acceptance Scenarios**:

1. **Given** a STAC Item contains only imported data features, **When** the plot is opened after this feature is implemented, **Then** all features load correctly with no changes to behavior.
2. **Given** a STAC Item contains both imported data and user-drawn features, **When** the plot is opened, **Then** both categories of features load and render correctly.
3. **Given** existing STAC catalog operations (create, read, update), **When** user-drawn features are persisted, **Then** no existing operations are affected or degraded.

---

### Edge Cases

- What happens when the analyst draws a shape but there is no active STAC Item (no plot loaded)? Drawing should be disabled or the shape should not be persisted — the system should follow the same pattern established by features 094/095 for handling the "no active plot" scenario.
- What happens when the STAC write operation fails (e.g., disk full, permissions error)? The shape should remain visible on the map in the current session, and the analyst should receive a non-blocking notification that persistence failed. The shape should be retried on the next save opportunity.
- What happens when a drawn shape is deleted by the analyst? The deletion should be persisted to the STAC catalog — the feature should be removed from the STAC Item on the next save.
- What happens when the analyst switches drawing modes while guidance is displayed? The guidance text should update immediately to reflect the new drawing mode.
- What happens when the map panel is very narrow? The guidance overlay should reposition itself to remain visible within the available viewport space.
- What happens when two analysts working on the same plot draw shapes simultaneously? This is out of scope — the system assumes single-user access to a plot at any given time, consistent with the offline-first architecture.
- What happens when the drawing palette colours are exhausted? Colours cycle back to the beginning of the palette, so the (N+1)th shape receives the same colour as the 1st shape.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display context-sensitive drawing guidance text when any drawing mode is active, showing the mode-specific instruction alongside "Press Esc to cancel".
- **FR-002**: Guidance text MUST be mode-specific: "Click to place point" for point mode, "Click and drag to draw rectangle" for rectangle mode, "Click to add vertices, double-click to finish" for polygon mode, and "Click to add vertices, double-click to finish" for polyline mode.
- **FR-003**: Guidance overlay MUST be positioned unobtrusively on the map (near the edge or cursor area) without obscuring the drawing interaction.
- **FR-004**: Guidance text MUST disappear immediately when drawing mode is deactivated (by shape completion, Escape, or toolbar cancel).
- **FR-005**: Guidance text MUST update immediately when the analyst switches between drawing modes.
- **FR-006**: The map cursor MUST change to a crosshair when any drawing mode is active, and revert to the default pointer when drawing mode ends.
- **FR-007**: Newly drawn shapes MUST receive default colours and weights from a drawing palette.
- **FR-008**: Consecutive shapes MUST receive visually distinct default colours by cycling through the drawing palette sequentially.
- **FR-009**: The colour palette MUST cycle back to the first colour after all colours have been used.
- **FR-010**: The assigned colour MUST be recorded in the feature's styling properties so it persists with the feature.
- **FR-011**: When a shape is drawn on an active plot, it MUST be persisted to the active STAC Item as a GeoJSON feature.
- **FR-012**: Persisted drawn features MUST include provenance metadata: source ("user-drawn"), creation timestamp, and operator identifier.
- **FR-013**: When a plot is reopened, all previously drawn shapes MUST be loaded from the STAC catalog and rendered on the map with their original geometry and styling.
- **FR-014**: Persisting drawn shapes MUST NOT corrupt or modify existing features in the STAC Item.
- **FR-015**: If a drawn shape is deleted, the deletion MUST be persisted to the STAC catalog.
- **FR-016**: If the STAC write operation fails, the drawn shape MUST remain visible in the current session and the analyst MUST receive a non-blocking notification of the failure.
- **FR-017**: Drawing guidance and persistence MUST work for all four shape types: point, rectangle, polygon, and polyline.

### Key Entities

- **Drawing Guidance**: A contextual overlay displayed on the map during drawing mode. Contains mode-specific instruction text and a cancellation hint. Ephemeral — exists only while drawing mode is active.
- **Drawing Palette**: An ordered set of default colours used for styling newly drawn shapes. Colours are assigned sequentially and cycle when exhausted.
- **Provenance Metadata**: Information recorded with each user-drawn feature: the source type ("user-drawn"), a creation timestamp, and the operator who drew the shape.
- **User-Drawn Feature**: A GeoJSON feature created through map drawing interaction, as opposed to features imported from data files. Distinguished by its provenance metadata.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Draw shapes on the map with clear guidance, and ensure those shapes are saved permanently as part of the plot record.
- **Key Decision(s)**:
  1. Which shape type to draw (guided by the shape palette from feature 093)
  2. Where and how to draw the shape (guided by the context-sensitive instruction text)
- **Decision Inputs**: The guidance overlay tells the analyst exactly how to interact for each shape type. The crosshair cursor signals that the map is in drawing mode. Existing features on the map provide spatial context for where to place new annotations.

### Screen Progression

| Step | Screen/State                              | User Action                        | Result                                                                      |
|------|-------------------------------------------|------------------------------------|-----------------------------------------------------------------------------|
| 1    | Map with toolbar (default state)          | Click '+' to open shape palette    | Shape palette dropdown appears (feature 093)                                |
| 2    | Shape palette open                        | Select a shape type                | Drawing mode activates; cursor changes to crosshair; guidance text appears  |
| 3    | Drawing mode active with guidance visible | Draw shape following guidance text | Shape is created with default palette colour; guidance disappears           |
| 4    | Shape created on map                      | (Automatic)                        | Shape is persisted to STAC with provenance; feature is auto-selected        |
| 5    | Normal map interaction                    | Reopen plot later                  | Previously drawn shapes are loaded from STAC and displayed on the map       |

### UI States

- **Default State**: No drawing mode active. No guidance overlay visible. Map cursor is the default pointer. All previously drawn shapes are loaded from STAC and visible on the map.
- **Drawing Active State**: Guidance overlay is visible with mode-specific instruction text. Cursor is a crosshair. The '+' button on the toolbar is highlighted. The analyst is drawing a shape.
- **Persistence Failure State**: A drawn shape is visible on the map but could not be saved to the STAC catalog. A non-blocking notification informs the analyst that saving failed. The shape remains available in the session for retry.
- **Success State**: The drawn shape appears on the map with a colour from the drawing palette. It is auto-selected. Provenance metadata is recorded. The shape is persisted to STAC and will be available when the plot is reopened.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Guidance text is visible within 1 second of activating any of the four drawing modes, and correctly matches the active mode.
- **SC-002**: 100% of drawn shapes are persisted to the STAC catalog with provenance metadata (source, timestamp, operator) and survive a close-reopen cycle.
- **SC-003**: Consecutive shapes drawn on the same plot receive visually distinct default colours from the drawing palette (no two adjacent shapes share the same colour).
- **SC-004**: The cursor changes to crosshair within 1 second of entering drawing mode and reverts to default within 1 second of exiting.
- **SC-005**: All existing STAC read/write operations continue to pass their test suite after drawn shape persistence is added.
- **SC-006**: The guidance overlay does not obscure more than 10% of the visible map area, ensuring usability on typical display sizes.
- **SC-007**: An analyst who has never used the drawing tools can successfully draw a polygon on their first attempt using only the guidance text for instruction.

## Assumptions

- Features 094 (point/rectangle drawing) and 095 (polygon/polyline drawing) have been implemented, providing the four drawing modes and the drawing event handling pipeline.
- Feature 093 (drawing toolbar and shape palette) has been implemented, providing the UI for activating drawing modes and managing the `drawingMode` session state.
- The STAC write path (stacService) is available and supports adding features to an existing STAC Item. The persistence mechanism follows the existing pattern for saving plot data.
- The session state store includes a `drawingMode` field that this feature can observe to determine when to show/hide guidance.
- An "operator" identifier is available in the application context (e.g., from user configuration or session identity) for recording in provenance metadata. If no operator is configured, a reasonable default (e.g., "unknown") is used.
- The offline-first architecture means persistence targets the local filesystem STAC catalog, not a remote server.
- Cursor changes may be partially handled by the underlying drawing library (Geoman); this feature ensures the crosshair behaviour is consistent across all four modes.
- The drawing palette contains at least 6 distinct colours to provide meaningful visual distinction for typical drawing sessions.

## Dependencies

- **#093** — Drawing Toolbar & Shape Palette: Provides the UI to activate drawing modes and the `drawingMode` session state.
- **#094** — Point & Rectangle Drawing: Provides point and rectangle drawing functionality and the `createDrawnFeature()` pattern.
- **#095** — Polygon & Polyline Drawing: Provides polygon and polyline drawing functionality, completing the set of four shape types.
