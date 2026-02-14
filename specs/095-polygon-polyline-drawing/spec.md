# Feature Specification: [E05] Implement Polygon and Polyline Drawing

**Feature Branch**: `095-polygon-polyline-drawing`
**Created**: 2026-02-14
**Status**: Draft
**Epic**: E05 — Shape Drawing Tools
**Input**: User description: "[E05] Implement polygon and polyline drawing — Multi-vertex click interaction for drawing arbitrary polygons (FeatureKind=POLY with PolyAnnotationProperties) and polylines (FeatureKind=LINE with LineProperties) on the map via Geoman's Polygon and Line modes."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Draw a Polygon on the Map (Priority: P1)

An analyst working on a maritime tactical plot needs to define an arbitrary area — for example, an operational zone, an exclusion area, or a region of tactical significance. The analyst activates polygon drawing mode from the shape palette (provided by feature 093), then clicks on the map to place vertices one at a time. Each click adds a new vertex, with visual feedback showing the edges connecting the vertices as they are placed. When the analyst is satisfied with the shape, they double-click (or click the first vertex) to close the polygon. A polygon feature appears immediately with default styling, and the new feature is automatically selected so the analyst can inspect or label it.

**Why this priority**: Polygon drawing is the primary multi-vertex shape capability. It enables analysts to mark complex, arbitrary-shaped regions that cannot be represented by simple rectangles. This is the most common spatial annotation need after points and rectangles.

**Independent Test**: Can be fully tested by activating polygon mode, clicking 3+ points on the map, double-clicking to complete, and verifying a correctly-shaped polygon feature appears with valid schema-compliant properties and is selected.

**Acceptance Scenarios**:

1. **Given** the analyst has an active plot open and selects "Polygon" from the shape palette, **When** the analyst clicks on three or more locations on the map, **Then** edges are drawn between each successive vertex in real time, showing the shape being constructed.
2. **Given** the analyst has placed 3+ vertices in polygon mode, **When** the analyst double-clicks (or clicks the first vertex), **Then** a new polygon feature is created as a closed ring connecting all placed vertices, with default polygon styling and a unique identifier.
3. **Given** a polygon has just been drawn, **When** the feature is created, **Then** it is automatically selected in the session state so the analyst can immediately inspect or modify its properties.
4. **Given** the analyst completes a polygon, **When** drawing mode deactivates, **Then** the map returns to its normal interaction state and the toolbar reverts to its default appearance.

---

### User Story 2 - Draw a Polyline on the Map (Priority: P1)

An analyst needs to draw a multi-segment line on the map — for example, a planned route, a patrol path, a boundary line, or a coastline approximation. The analyst activates polyline drawing mode from the shape palette, then clicks on the map to place waypoints sequentially. Each click adds a new vertex, with visual feedback showing the line segments as they are placed. When the analyst is satisfied with the route, they double-click to finish the polyline. A line feature appears immediately with default line styling, and the new feature is automatically selected.

**Why this priority**: Polyline drawing is equally critical to polygon drawing as it enables a distinct category of spatial annotation (routes and paths vs. areas). Together, polygon and polyline complete the set of multi-vertex drawing tools.

**Independent Test**: Can be fully tested by activating polyline mode, clicking 2+ points on the map, double-clicking to complete, and verifying a correctly-shaped line feature appears with valid schema-compliant properties and is selected.

**Acceptance Scenarios**:

1. **Given** the analyst has an active plot open and selects "Polyline" from the shape palette, **When** the analyst clicks on two or more locations on the map, **Then** line segments are drawn between each successive vertex in real time.
2. **Given** the analyst has placed 2+ vertices in polyline mode, **When** the analyst double-clicks to finish, **Then** a new line feature is created with a multi-point line geometry connecting all placed vertices, with default line styling and a unique identifier.
3. **Given** a polyline has just been drawn, **When** the feature is created, **Then** it is automatically selected in the session state.
4. **Given** the analyst completes a polyline, **When** drawing mode deactivates, **Then** the map returns to its normal interaction state and the toolbar reverts to its default appearance.

---

### User Story 3 - Schema-Compliant Feature Output (Priority: P2)

All drawn polygon and polyline features must conform to the project's GeoJSON schema so they can be persisted to STAC, shared with other tools, and processed by downstream analysis services. This story ensures that every feature created by polygon and polyline drawing has valid, schema-compliant properties including the correct feature kind, styling defaults, vertex metadata, and a unique identifier.

**Why this priority**: Schema compliance is essential for interoperability with the rest of the system. Without it, drawn features would be isolated from the analysis and storage pipeline. This is ranked P2 because it underpins the value of both polygon and polyline creation but is a structural concern rather than a user-visible interaction.

**Independent Test**: Can be tested by drawing each shape type and validating its GeoJSON output against the schema definition — checking that all required properties are present, correctly typed, and populated with valid defaults.

**Acceptance Scenarios**:

1. **Given** a polygon feature has been drawn with 4 vertices, **When** its GeoJSON representation is inspected, **Then** it has `type: "Feature"`, a `Polygon` geometry with a closed ring of 5 coordinate pairs (4 vertices + closure), a unique `id`, and properties with `kind` set to "POLY", a `vertex_count` matching the number of unique vertices, and default polygon styling values.
2. **Given** a polyline feature has been drawn with 3 vertices, **When** its GeoJSON representation is inspected, **Then** it has `type: "Feature"`, a `LineString` geometry with 3 coordinate pairs, a unique `id`, and properties with `kind` set to "LINE" and default line styling values.
3. **Given** multiple polygon and polyline features are drawn in succession, **When** their identifiers are compared, **Then** each has a globally unique identifier with no duplicates.
4. **Given** a drawn polygon or polyline feature, **When** validated against the project's Pydantic schema model, **Then** validation passes without errors.

---

### User Story 4 - Visual Feedback During Multi-Vertex Drawing (Priority: P3)

While drawing polygons or polylines, the analyst should see the shape being constructed in real time. As each vertex is placed, edges appear connecting the vertices. For polygons, a ghost edge follows the cursor from the last vertex to the current cursor position, showing where the next edge would go. For polylines, a similar ghost segment extends from the last vertex. This feedback ensures the analyst can see the shape taking form and make corrections before committing.

**Why this priority**: Visual feedback during multi-vertex operations is more important than in single-click operations (point, rectangle) because the analyst is building a complex shape incrementally. However, the underlying drawing library largely provides this feedback, making this story lower priority because it captures expectations rather than requiring significant custom work.

**Independent Test**: Can be tested by entering polygon or polyline drawing mode, placing vertices, and observing that connecting edges and ghost segments appear in real time.

**Acceptance Scenarios**:

1. **Given** the analyst is in polygon drawing mode and has placed 2 vertices, **When** they move the cursor, **Then** a ghost edge is shown from the last placed vertex to the cursor position, and a second ghost edge shows from the cursor back to the first vertex (previewing the closed shape).
2. **Given** the analyst is in polyline drawing mode and has placed 1 vertex, **When** they move the cursor, **Then** a ghost segment is shown from the last placed vertex to the cursor position.
3. **Given** the analyst is in either multi-vertex drawing mode, **When** they press Escape, **Then** drawing mode is cancelled, all in-progress vertices and ghost edges are discarded, and no feature is created.

---

### User Story 5 - Storybook Demonstration (Priority: P3)

A developer opens Storybook and navigates to drawing stories. Stories demonstrate both polygon and polyline drawing modes, showing the complete flow from mode activation through vertex placement to shape completion. The stories log drawing events via Storybook actions.

**Why this priority**: Storybook stories serve as living documentation and visual verification for the drawing interactions. Lower priority because they verify rather than deliver core functionality.

**Independent Test**: Can be tested by running Storybook, interacting with the drawing tools, and verifying that completed shapes appear with correct styling and that actions are logged.

**Acceptance Scenarios**:

1. **Given** Storybook is running, **When** the developer navigates to the polygon drawing story, **Then** they can activate polygon mode, place vertices, and complete a polygon that appears on the map.
2. **Given** Storybook is running, **When** the developer navigates to the polyline drawing story, **Then** they can activate polyline mode, place vertices, and complete a polyline that appears on the map.

---

### Edge Cases

- What happens when the analyst double-clicks before placing enough vertices for a polygon (fewer than 3)? The operation should be cancelled — no feature is created because a polygon requires at least 3 unique vertices to form a valid closed ring.
- What happens when the analyst double-clicks after placing only 1 vertex in polyline mode? The operation should be cancelled — no feature is created because a polyline requires at least 2 vertices to form a valid line segment.
- What happens when the analyst places vertices that create a self-intersecting polygon? The polygon is accepted — self-intersection is valid at the schema level. Topological validation is not in scope.
- What happens when the analyst places multiple vertices at the same location? Duplicate consecutive vertices are accepted — the resulting geometry is valid GeoJSON even if visually degenerate.
- What happens when the analyst switches drawing mode while mid-vertex-placement (e.g., has placed 2 polygon vertices, then switches to polyline)? The in-progress shape is discarded, and the new mode activates cleanly.
- What happens when the analyst rapidly double-clicks during polygon creation? The system should interpret this as a completion gesture and create the polygon with the vertices placed before the double-click, without placing an extra vertex at the double-click location.
- What happens when no active plot or feature collection is loaded? Drawing tools should be disabled or the system should handle the drawn feature according to the same pattern established by point and rectangle drawing (#094).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST create a new polygon feature when the analyst completes a multi-vertex polygon drawing (by double-clicking or clicking the first vertex to close the shape).
- **FR-002**: The created polygon feature MUST have a GeoJSON geometry of type `Polygon` with a closed coordinate ring matching the vertices placed by the analyst.
- **FR-003**: Polygon features MUST have properties with `kind` set to "POLY", a `vertex_count` reflecting the number of unique vertices (excluding ring closure), and default polygon styling values applied.
- **FR-004**: System MUST create a new polyline feature when the analyst completes a multi-vertex polyline drawing (by double-clicking to finish).
- **FR-005**: The created polyline feature MUST have a GeoJSON geometry of type `LineString` with coordinates matching the vertices placed by the analyst.
- **FR-006**: Polyline features MUST have properties with `kind` set to "LINE" and default line styling values applied.
- **FR-007**: Every drawn feature MUST have a globally unique identifier generated at creation time.
- **FR-008**: All drawn polygon and polyline features MUST conform to the project's GeoJSON schema, including all required property fields for their respective kinds.
- **FR-009**: Drawn features MUST be added to the active feature collection in the session state immediately upon creation.
- **FR-010**: The most recently drawn feature MUST be automatically selected in the session state after creation.
- **FR-011**: Drawing mode MUST deactivate after a feature is successfully created, returning the map to its normal interaction state.
- **FR-012**: Drawn polygon and polyline features MUST render on the map using existing renderers with no additional rendering logic required.
- **FR-013**: The system MUST discard polygon drawing attempts with fewer than 3 vertices (insufficient to form a valid polygon).
- **FR-014**: The system MUST discard polyline drawing attempts with fewer than 2 vertices (insufficient to form a valid line segment).
- **FR-015**: Visual feedback MUST be provided during vertex placement, showing connecting edges and ghost segments following the cursor.
- **FR-016**: Drawing mode MUST take precedence over feature selection — clicking on an existing feature while drawing adds a vertex rather than selecting the existing feature.

### Key Entities

- **Polygon Feature (POLY)**: A GeoJSON Feature with `Polygon` geometry representing an arbitrary closed area on the map. Has properties including `kind` ("POLY"), `vertex_count` (number of unique vertices), default polygon styling (fill color, stroke color, opacity), and a unique identifier.
- **Polyline Feature (LINE)**: A GeoJSON Feature with `LineString` geometry representing a multi-segment line on the map. Has properties including `kind` ("LINE"), default line styling (stroke color, weight, dash pattern), and a unique identifier.
- **Feature Collection**: The active set of features in the current plot, managed by the session state store. Newly drawn features are appended to this collection.
- **Drawing Mode**: An ephemeral UI state indicating which shape type is being drawn. For this feature, the relevant modes are 'polygon' and 'polyline'. Managed by the session state store and not persisted across sessions.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Draw an arbitrary polygon area or polyline path on the map to annotate regions or routes of tactical significance.
- **Key Decision(s)**:
  1. Which shape type to draw (polygon or polyline) — selected via the shape palette (feature 093).
  2. Where on the map to place each vertex — determined by successive clicks.
  3. When to complete the shape — determined by double-clicking (both modes) or clicking the first vertex (polygon only).
- **Decision Inputs**: The map view showing existing features and terrain, the active plot context, and real-time visual feedback (edges and ghost segments) during vertex placement. The analyst uses spatial awareness of the plot to decide where to place each vertex.

### Screen Progression

| Step | Screen/State                | User Action                              | Result                                                                 |
|------|-----------------------------|------------------------------------------|------------------------------------------------------------------------|
| 1    | Map with toolbar            | Click '+' to open shape palette          | Shape palette dropdown appears (feature 093)                           |
| 2    | Shape palette open          | Select "Polygon" or "Polyline"           | Drawing mode activates; cursor changes to crosshair                    |
| 3    | Drawing mode active         | Click on map to place first vertex       | First vertex marker appears                                            |
| 4    | Vertex placement in progress| Click on map to place additional vertices| Edges connect vertices; ghost segment follows cursor                   |
| 5a   | Polygon: 3+ vertices placed | Double-click or click first vertex       | Polygon closes and feature is created; mode deactivates                |
| 5b   | Polyline: 2+ vertices placed| Double-click to finish                   | Polyline feature is created; mode deactivates                          |
| 6    | Feature created             | (Automatic)                              | Feature appears on map with default styling; feature is auto-selected  |
| 7    | Normal map interaction      | Inspect, label, or continue work         | Analyst can interact with the new or existing features                 |

### UI States

- **Empty State**: No active drawing mode. The map is in its normal interaction state. The shape palette is available but no shape is selected.
- **Vertex Placement State**: Drawing mode is active. Vertices are being placed by successive clicks. Edges are drawn between placed vertices. A ghost segment follows the cursor from the last vertex. The '+' button is highlighted.
- **Error State**: If insufficient vertices are placed before completion (e.g., double-click after 1 vertex in polygon mode), the in-progress shape is silently discarded and drawing mode deactivates. No error dialog is shown.
- **Success State**: The newly drawn feature appears on the map with default styling. The feature is highlighted as selected. Drawing mode is deactivated and the map returns to normal interaction.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An analyst can draw a polygon with 4+ vertices on the map in under 10 seconds (from activating polygon mode to seeing the completed polygon appear).
- **SC-002**: An analyst can draw a polyline with 3+ vertices on the map in under 8 seconds (from activating polyline mode to seeing the completed polyline appear).
- **SC-003**: 100% of drawn polygon features pass schema validation — every feature has `kind` "POLY", valid Polygon geometry with a closed ring, `vertex_count` matching the placed vertices, required styling properties, and a unique identifier.
- **SC-004**: 100% of drawn polyline features pass schema validation — every feature has `kind` "LINE", valid LineString geometry, required styling properties, and a unique identifier.
- **SC-005**: Drawn polygon and polyline features are visually indistinguishable in rendering quality from features loaded from data files — they use the same rendering pipeline and default styles.
- **SC-006**: The newly drawn feature is selected immediately upon creation, with no additional user interaction required.
- **SC-007**: Both drawing modes (polygon and polyline) are demonstrable in Storybook stories that showcase the complete draw-to-render flow.
- **SC-008**: Drawing does not interfere with existing map interactions — when drawing mode is inactive, all existing click, drag, pan, and zoom behaviors work unchanged.
- **SC-009**: Vertices placed during polygon and polyline drawing are accurately positioned at the map coordinates corresponding to the analyst's clicks.

## Assumptions

- Feature 091-E05 (POLY FeatureKind) has been implemented, providing POLY as a valid FeatureKind value and the PolyAnnotationProperties class in the schema.
- Feature 091 (FeatureKindEnum) includes LINE as a valid kind that supports multi-vertex LineString geometries for polylines, as confirmed by the 091-poly-featurekind spec. No separate POLYLINE kind is needed.
- Feature 092 (Geoman integration) has been implemented, making the drawing library available and initialized on the map component with Polygon and Line drawing modes.
- Feature 093 (Drawing toolbar and shape palette) has been implemented, providing the UI for activating polygon and polyline drawing modes and managing the `drawingMode` state.
- Feature 094 (Point and rectangle drawing) has established the `createDrawnFeature()` and `isValidDrawnGeometry()` functions and the pattern for converting drawing library output to schema-compliant features. This feature extends that pattern.
- Default styling values for polygons and lines are consistent with existing styling used by imported features (e.g., from REP files).
- The underlying drawing library provides multi-vertex interaction (click-to-place vertices, double-click to finish) and real-time visual feedback (ghost segments, edge previews) without requiring custom rendering logic.
- The session state store supports adding features to the active collection and setting the selected feature, following the same pattern as point and rectangle drawing.

## Dependencies

- **#091-E05** — POLY FeatureKind: Provides POLY value in FeatureKindEnum and PolyAnnotationProperties class.
- **#091** — FeatureKindEnum: Provides LINE kind for polylines (confirmed to support multi-vertex LineStrings).
- **#092** — Geoman Integration: Provides the drawing library initialized on the map with Polygon and Line drawing modes.
- **#093** — Drawing Toolbar & Shape Palette: Provides the UI to activate polygon and polyline drawing modes and manage drawing state.
- **#094** — Point & Rectangle Drawing: Establishes the `createDrawnFeature()`, `isValidDrawnGeometry()`, and default styling patterns that this feature extends.

## Out of Scope

- STAC persistence of drawn features (covered by feature #096 — Drawing UX guidance and persistence).
- Vertex editing after shape completion (future enhancement — requires Geoman edit mode).
- Topological validation of polygon geometry (self-intersection, winding order).
- Snap-to-existing-feature during vertex placement (future enhancement).
- Drawing guidance text/tooltips during vertex placement (covered by feature #096).
