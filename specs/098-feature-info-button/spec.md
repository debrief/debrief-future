# Feature Specification: Feature Info Button

**Feature Branch**: `098-feature-info-button`
**Created**: 2026-02-17
**Status**: Draft
**Input**: User description: "Let's enrich the web UI, so that testing tools/frameworks (such as Playwright) can verify that data has changed, without having to understand the map. So, let's add an 'i' info button to each feature, to the right of the current format button. When clicked, it will show a dialog with the geometry of that feature."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Feature Geometry via Info Button (Priority: P1)

A test engineer working with Playwright needs to verify that a feature's geometry has changed after an operation (e.g., dragging a track point, applying a calculation). Rather than trying to parse the map canvas, they click the "info" button on the feature row in the Layers panel. A dialog appears showing the feature's geometry in a structured, readable format. The test script can locate the dialog by its role/label and assert against the displayed coordinate values.

**Why this priority**: This is the core use case — the entire feature exists to expose geometry data outside of the map for testability.

**Independent Test**: Can be fully tested by loading a plot with known features, clicking the info button, and verifying the dialog content matches the expected geometry.

**Acceptance Scenarios**:

1. **Given** a plot is loaded with at least one track feature, **When** the user hovers over a feature row and clicks the info button, **Then** a dialog appears displaying the feature's geometry type and coordinates.
2. **Given** the info dialog is open for a track feature, **When** the user reads the dialog content, **Then** the geometry type (e.g., "LineString") and all coordinate pairs are displayed in a structured format.
3. **Given** the info dialog is open, **When** the user clicks outside the dialog or presses Escape, **Then** the dialog closes.

---

### User Story 2 - View Geometry for Different Feature Types (Priority: P2)

The system supports multiple feature types (tracks with LineString geometry, reference locations with Point geometry, zones with MultiPolygon geometry, multi-point features). The info button must display geometry appropriately for each type so that test scripts can verify any feature type.

**Why this priority**: Full feature-type coverage is essential for comprehensive test automation, but the pattern is established by P1.

**Independent Test**: Can be tested by loading a plot with each feature type and verifying the info dialog shows the correct geometry type and coordinate structure for each.

**Acceptance Scenarios**:

1. **Given** a plot with a Point feature (reference location), **When** the user clicks the info button for that feature, **Then** the dialog shows geometry type "Point" and a single coordinate pair (longitude, latitude).
2. **Given** a plot with a MultiPolygon feature (zone), **When** the user clicks the info button, **Then** the dialog shows geometry type "MultiPolygon" and the nested coordinate arrays.
3. **Given** a plot with a MultiPoint feature, **When** the user clicks the info button, **Then** the dialog shows geometry type "MultiPoint" and all point coordinates.

---

### User Story 3 - Automated Test Script Access to Geometry (Priority: P3)

A Playwright test script needs to programmatically open the info dialog for a specific feature, read the geometry values, and compare them against expected results. The dialog content must be accessible via standard selectors (roles, labels, data attributes) without relying on internal component structure.

**Why this priority**: This is the downstream automation use case that validates the feature achieves its stated goal.

**Independent Test**: Can be tested by writing a Playwright script that opens the info dialog, queries the geometry content, and asserts against known values.

**Acceptance Scenarios**:

1. **Given** a Playwright test targeting a loaded plot, **When** the script locates the info button by its accessible role and label, **Then** the button is found and clickable.
2. **Given** the info dialog is open, **When** the script queries for geometry content using accessible selectors, **Then** the geometry type and coordinate values are retrievable as text.
3. **Given** a feature's geometry has changed (e.g., after a drag operation), **When** the script re-opens the info dialog, **Then** the dialog reflects the updated geometry values.

---

### Edge Cases

- What happens when a feature has an empty coordinate array (e.g., a newly created feature with no points yet)? The dialog should display the geometry type and indicate "No coordinates" or show an empty list.
- What happens when the user clicks the info button for a child row (individual position within a track)? The dialog should show the geometry of that specific child element (single coordinate pair for a position).
- What happens when the info dialog is already open and the user clicks the info button on a different feature? The current dialog should close and a new one should open for the newly selected feature.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each feature row in the Layers panel MUST display an info button to the right of the existing format button.
- **FR-002**: The info button MUST follow the same visibility behavior as the format button — hidden by default, visible on row hover or when the row is selected.
- **FR-003**: Clicking the info button MUST open a dialog displaying the feature's geometry.
- **FR-004**: The geometry dialog MUST display the geometry type (e.g., "Point", "LineString", "MultiPolygon", "MultiPoint").
- **FR-005**: The geometry dialog MUST display the coordinate values in a human-readable, structured format.
- **FR-006**: The geometry dialog MUST be dismissible by clicking outside it, pressing Escape, or clicking a close control.
- **FR-007**: The info button and geometry dialog MUST be accessible to automated testing tools via standard accessible roles and labels (e.g., button role with descriptive label, dialog role for the popup).
- **FR-008**: The info button MUST also be available on child rows (individual positions, points, polygons within a parent feature), showing the geometry of that specific child element.
- **FR-009**: The info button MUST use a recognisable information icon (e.g., circled "i") that is visually consistent with existing row action icons.
- **FR-010**: Only one info dialog may be open at a time — opening a new one closes any previously open dialog.

### Key Entities

- **Feature Geometry**: The spatial data associated with a feature, consisting of a geometry type (Point, LineString, MultiPoint, MultiPolygon) and an array of coordinates. This is the primary data displayed in the info dialog.
- **Info Dialog**: A popup element anchored near the info button that presents the feature's geometry in a structured, readable format. Accessible via standard dialog semantics.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Inspect a feature's geometry data without relying on the map visualisation.
- **Key Decision(s)**:
  1. Which feature's geometry to inspect (selected by clicking the info button on the desired row).
- **Decision Inputs**: The feature name and type badge visible in the row help the user identify which feature to inspect.

### Screen Progression

| Step | Screen/State          | User Action                          | Result                                                      |
|------|-----------------------|--------------------------------------|-------------------------------------------------------------|
| 1    | Layers panel visible  | Hover over a feature row             | Format and info buttons become visible on the row           |
| 2    | Buttons visible       | Click the info ("i") button          | Geometry dialog appears anchored near the button            |
| 3    | Dialog open           | Read geometry type and coordinates   | User/test script obtains the geometry data                  |
| 4    | Dialog open           | Click outside, press Escape, or close | Dialog closes                                              |

### UI States

- **Empty State**: If a feature has no coordinates (empty geometry), the dialog displays the geometry type with a message such as "No coordinates".
- **Loading State**: Not applicable — geometry data is already loaded in memory with the feature.
- **Error State**: Not applicable — the geometry is always available as part of the loaded feature data.
- **Success State**: The dialog displays the geometry type as a heading/label and the coordinates in a structured, readable layout below it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view any feature's geometry data within 2 clicks (hover to reveal button, click to open dialog).
- **SC-002**: An automated test script can locate the info button, open the dialog, and read the geometry content using only accessible roles and labels — no reliance on internal markup or CSS class selectors.
- **SC-003**: The info dialog correctly displays geometry for all supported feature types (Point, LineString, MultiPoint, MultiPolygon).
- **SC-004**: After a feature's geometry is modified (e.g., via a drag or calculation), re-opening the info dialog reflects the updated coordinates.

## Assumptions

- The info button reuses the same hover-visibility pattern as the existing format button (hidden by default, visible on hover/selection).
- Geometry data is always available in-memory once a feature is loaded; no asynchronous fetch is needed.
- The dialog is positioned near the info button, following the same anchor-positioning pattern used by the format menu.
- Coordinate display precision follows the existing conventions used elsewhere in the UI (e.g., sublabels for point features).
- The dialog content is plain text / structured markup (not a map preview), optimised for readability and automated scraping.
