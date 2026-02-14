# Feature Specification: Implement Point and Rectangle Drawing

**Feature Branch**: `094-point-rectangle-drawing`
**Created**: 2026-02-13
**Status**: Draft
**Input**: User description: "Implement point and rectangle drawing functionality for the shape drawing tools epic. This allows analysts to place point markers and draw rectangles directly on the map to annotate areas of interest."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Place a Point Marker on the Map (Priority: P1)

An analyst working on a maritime tactical plot needs to mark a specific location of interest on the map — for example, a reported sighting, a waypoint, or a reference coordinate. The analyst activates point drawing mode from the shape palette (provided by feature 093), then clicks on the desired map location. A point marker appears immediately at that position with default styling, and the new feature is automatically selected so the analyst can inspect or label it right away.

**Why this priority**: Point placement is the simplest and most fundamental annotation capability. It delivers immediate value as a standalone feature — analysts can mark locations without needing any other drawing tool.

**Independent Test**: Can be fully tested by activating point mode, clicking on the map, and verifying a correctly-shaped, properly-styled point feature appears and is selected. Delivers the core value of location annotation.

**Acceptance Scenarios**:

1. **Given** the analyst has an active plot open and selects "Point" from the shape palette, **When** the analyst clicks on a location on the map, **Then** a new point feature is created at the clicked coordinates with default point styling and a unique identifier.
2. **Given** a point has just been drawn, **When** the feature is created, **Then** it is automatically selected in the session state so the analyst can immediately inspect or modify its properties.
3. **Given** the analyst is in point drawing mode, **When** the point is successfully placed, **Then** drawing mode is deactivated and the map returns to its normal interaction state.
4. **Given** the analyst has placed a point, **When** the map re-renders, **Then** the point is visible with default styling consistent with existing rendered features.

---

### User Story 2 - Draw a Rectangle on the Map (Priority: P2)

An analyst needs to delineate an area of interest — for example, a patrol zone, a search area, or a geographic region of operational significance. The analyst activates rectangle drawing mode from the shape palette, then clicks and drags on the map to define the rectangle bounds. The rectangle appears immediately with default polygon styling, and the new feature is automatically selected.

**Why this priority**: Rectangle drawing is the next most common annotation after point markers. It provides area-based annotation capability, which is essential for representing zones, boundaries, and regions. It builds directly on the same infrastructure as point drawing but introduces drag-based interaction.

**Independent Test**: Can be fully tested by activating rectangle mode, clicking and dragging on the map, and verifying a correctly-shaped rectangle polygon feature appears with proper styling and is selected.

**Acceptance Scenarios**:

1. **Given** the analyst has an active plot open and selects "Rectangle" from the shape palette, **When** the analyst clicks and drags on the map, **Then** a new rectangle feature is created as a closed polygon matching the dragged bounds, with default polygon styling and a unique identifier.
2. **Given** a rectangle has just been drawn, **When** the feature is created, **Then** it is automatically selected in the session state.
3. **Given** the analyst is in rectangle drawing mode, **When** the rectangle is successfully drawn, **Then** drawing mode is deactivated and the map returns to its normal interaction state.
4. **Given** the analyst draws a rectangle, **When** inspecting the resulting feature, **Then** it has a geometry type of Polygon with coordinates forming a closed rectangular ring.

---

### User Story 3 - Schema-Compliant Feature Output (Priority: P2)

All drawn features must conform to the project's GeoJSON schema so they can be persisted, shared, and processed by downstream tools (analysis calculations, STAC storage, export). This story ensures that every feature created by drawing has valid, schema-compliant properties including the correct feature kind, styling defaults, and a unique identifier.

**Why this priority**: Schema compliance is essential for interoperability with the rest of the system. Without it, drawn features would be isolated from the analysis pipeline. This is ranked equal to rectangle drawing because it underpins the value of both point and rectangle creation.

**Independent Test**: Can be tested by drawing a feature and validating its GeoJSON output against the schema definition — checking that all required properties are present, correctly typed, and populated with valid defaults.

**Acceptance Scenarios**:

1. **Given** a point feature has been drawn, **When** its GeoJSON representation is inspected, **Then** it has `type: "Feature"`, a `Point` geometry, a unique `id`, and properties with `kind` set to "POINT" and default point styling values.
2. **Given** a rectangle feature has been drawn, **When** its GeoJSON representation is inspected, **Then** it has `type: "Feature"`, a `Polygon` geometry with a closed ring, a unique `id`, and properties with `kind` set to "RECTANGLE" and default polygon styling values.
3. **Given** multiple features are drawn in succession, **When** their identifiers are compared, **Then** each has a globally unique identifier with no duplicates.

---

### User Story 4 - Visual Feedback During Drawing (Priority: P3)

While drawing, the analyst should receive visual feedback that confirms the system is in drawing mode and shows the shape being constructed. For point mode, the cursor indicates placement readiness. For rectangle mode, a preview rectangle follows the drag gesture. This feedback ensures the analyst feels confident about what will be created before releasing the mouse.

**Why this priority**: Visual feedback is important for usability but is largely provided by the underlying drawing library. This story captures the expectation that the drawing experience feels responsive and predictable, but is lower priority because the core value (feature creation) works without custom feedback enhancements.

**Independent Test**: Can be tested by entering each drawing mode and observing that the cursor changes and that drag-preview shapes appear during rectangle creation.

**Acceptance Scenarios**:

1. **Given** the analyst activates point drawing mode, **When** they move the cursor over the map, **Then** the cursor visually indicates that a click will place a point.
2. **Given** the analyst activates rectangle drawing mode, **When** they click and begin dragging, **Then** a preview rectangle is shown that follows the drag gesture in real time.
3. **Given** the analyst is in any drawing mode, **When** they press Escape or click the shape palette toggle, **Then** drawing mode is cancelled and any in-progress preview is removed.

---

### Edge Cases

- What happens when the analyst clicks on an existing feature while in point drawing mode? The new point should be placed at the clicked location regardless of underlying features — drawing mode takes precedence over feature selection.
- What happens when the analyst draws a rectangle with zero area (click without drag)? The system should either discard the degenerate shape or produce a minimal valid rectangle, rather than creating an invalid geometry.
- What happens when the analyst switches drawing mode while already in a drawing mode (e.g., switches from point to rectangle)? The current mode should be deactivated cleanly before the new mode activates.
- What happens when there is no active plot (no feature collection loaded)? The drawing tools should be disabled or the system should create a default collection to receive the new feature.
- What happens when the analyst rapidly double-clicks in point mode? The system should create exactly one point per deliberate click and not produce duplicate features from a double-click.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST create a new point feature when the analyst clicks on the map while point drawing mode is active.
- **FR-002**: The created point feature MUST have a GeoJSON geometry of type `Point` with coordinates matching the clicked map location.
- **FR-003**: System MUST create a new rectangle feature when the analyst clicks and drags on the map while rectangle drawing mode is active.
- **FR-004**: The created rectangle feature MUST have a GeoJSON geometry of type `Polygon` with coordinates forming a closed rectangular ring matching the dragged bounds.
- **FR-005**: Every drawn feature MUST have a globally unique identifier generated at creation time.
- **FR-006**: Point features MUST have properties with `kind` set to "POINT" and default point styling values applied.
- **FR-007**: Rectangle features MUST have properties with `kind` set to "RECTANGLE" and default polygon styling values applied.
- **FR-008**: All drawn features MUST conform to the project's GeoJSON schema, including all required property fields.
- **FR-009**: Drawn features MUST be added to the active feature collection in the session state immediately upon creation.
- **FR-010**: The most recently drawn feature MUST be automatically selected in the session state after creation.
- **FR-011**: Drawing mode MUST deactivate after a feature is successfully created, returning the map to its normal interaction state.
- **FR-012**: Drawn features MUST render on the map using existing renderers with no additional rendering logic required.
- **FR-013**: The system MUST discard or prevent creation of degenerate geometries (e.g., zero-area rectangles from a click without drag).
- **FR-014**: Drawing mode MUST take precedence over feature selection — clicking on an existing feature while drawing places a new shape rather than selecting the existing one.

### Key Entities

- **Point Feature**: A GeoJSON Feature with `Point` geometry representing a single location on the map. Has properties including `kind` ("POINT"), default point styling (color, size, symbol), and a unique identifier.
- **Rectangle Feature**: A GeoJSON Feature with `Polygon` geometry (closed rectangular ring) representing an area on the map. Has properties including `kind` ("RECTANGLE"), default polygon styling (fill color, stroke color, opacity), and a unique identifier.
- **Feature Collection**: The active set of features in the current plot, managed by the session state store. Newly drawn features are appended to this collection.
- **Drawing Mode**: An ephemeral UI state indicating which shape type is being drawn (point, rectangle, or none). Managed by the session state store and not persisted across sessions.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Annotate the map with a point marker or rectangle area of interest.
- **Key Decision(s)**:
  1. Which shape type to draw (point or rectangle) — selected via the shape palette (feature 093).
  2. Where on the map to place the annotation — determined by the analyst's click or drag gesture.
- **Decision Inputs**: The map view showing existing features, the active plot context, and the shape palette indicating available shape types. The analyst uses spatial awareness of the plot to decide where to annotate.

### Screen Progression

| Step | Screen/State           | User Action                       | Result                                                       |
|------|------------------------|-----------------------------------|--------------------------------------------------------------|
| 1    | Map with toolbar       | Click '+' to open shape palette   | Shape palette dropdown appears (feature 093)                 |
| 2    | Shape palette open     | Select "Point" or "Rectangle"     | Drawing mode activates; cursor changes to indicate mode      |
| 3a   | Point mode active      | Click on map location             | Point feature created at location; mode deactivates          |
| 3b   | Rectangle mode active  | Click and drag on map             | Rectangle feature created matching drag bounds; mode deactivates |
| 4    | Feature created        | (Automatic)                       | New feature appears on map with default styling; feature is auto-selected |
| 5    | Normal map interaction | Inspect, label, or continue work  | Analyst can interact with the new or existing features       |

### UI States

- **Empty State**: No active drawing mode. The map is in its normal interaction state. The shape palette is available but no shape is selected.
- **Loading State**: Not applicable — feature creation is instantaneous from the user's perspective.
- **Error State**: If a degenerate shape is drawn (e.g., zero-area rectangle), the shape is silently discarded and drawing mode deactivates without creating a feature. No error dialog is shown.
- **Success State**: The newly drawn feature appears on the map with default styling. The feature is highlighted as selected. Drawing mode is deactivated and the map returns to normal interaction.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An analyst can place a point marker on the map in under 3 seconds (from activating point mode to seeing the point appear).
- **SC-002**: An analyst can draw a rectangle on the map in under 5 seconds (from activating rectangle mode to seeing the rectangle appear).
- **SC-003**: 100% of drawn features pass schema validation — every feature has the required kind, styling properties, unique identifier, and valid geometry.
- **SC-004**: Drawn features are visually indistinguishable in rendering quality from features loaded from data files — they use the same rendering pipeline and default styles.
- **SC-005**: The newly drawn feature is selected immediately upon creation, with no additional user interaction required.
- **SC-006**: Both drawing modes (point and rectangle) are demonstrable in Storybook stories that showcase the complete draw-to-render flow.
- **SC-007**: Drawing does not interfere with existing map interactions — when drawing mode is inactive, all existing click, drag, pan, and zoom behaviors work unchanged.

## Assumptions

- Feature 091 (FeatureKindEnum) has been implemented, providing POINT and RECTANGLE kind values in the schema.
- Feature 092 (Geoman integration) has been implemented, making the drawing library available and initialized on the map component.
- Feature 093 (Drawing toolbar and shape palette) has been implemented, providing the UI for activating point and rectangle drawing modes and managing the `drawingMode` state.
- Default styling values for points and polygons are defined in the project's styling configuration and are accessible at feature creation time.
- The session state store supports adding features to the active collection and setting the selected feature.
- The existing map renderers can display point and polygon features without modification — no new rendering logic is needed for drawn features.
- A single click-to-place interaction is used for points (not click-and-confirm or double-click).

## Dependencies

- **#091** — FeatureKindEnum: Provides POINT and RECTANGLE values in the schema.
- **#092** — Geoman Integration: Provides the drawing library initialized on the map.
- **#093** — Drawing Toolbar & Shape Palette: Provides the UI to activate drawing modes and manage drawing state.
