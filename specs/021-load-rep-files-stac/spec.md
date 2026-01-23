# Feature Specification: REP File Loading in VS Code Extension

**Feature Branch**: `021-load-rep-files-stac`
**Created**: 2026-01-23
**Status**: Draft
**Input**: User description: "Add REP file loading to VS Code extension - Users need to import REP format track data into their STAC-based plots from within the VS Code extension."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Drag-and-Drop REP Import (Priority: P1)

An analyst working in VS Code has a map panel open displaying track data from a STAC item. They receive a new REP file containing additional track data. They drag the `.rep` file from the VS Code file explorer directly onto the map panel. The system parses the REP file, stores it as an asset on the current STAC item, merges the track data into the GeoJSON, and automatically adjusts the map view to include the newly imported data.

**Why this priority**: This is the primary workflow - analysts frequently need to add data to an existing plot while viewing it. Drag-and-drop provides the fastest path from file to visualization with minimal interruption.

**Independent Test**: Can be fully tested by opening a STAC item in the map view, dragging a sample REP file onto the map, and verifying the tracks appear and the map bounds include them.

**Acceptance Scenarios**:

1. **Given** a map panel displaying a STAC item's GeoJSON, **When** user drags a valid `.rep` file onto the map, **Then** the file is parsed, stored as an asset, merged into the GeoJSON, and the map view adjusts to show all data including the new tracks.

2. **Given** a map panel displaying a STAC item, **When** user drags a `.rep` file that was previously imported (same filename), **Then** the system displays a warning message and does not create a duplicate asset.

3. **Given** a map panel displaying a STAC item, **When** user drags a malformed `.rep` file onto the map, **Then** the system displays a clear error message explaining the parsing failure and does not modify the STAC item.

4. **Given** VS Code running without network connectivity, **When** user drags a `.rep` file onto the map, **Then** the import completes successfully (offline operation).

---

### User Story 2 - Context Menu Import with Target Selection (Priority: P2)

An analyst has a REP file they want to import but the map panel is not currently open, or they want to import into a different STAC item than the one currently displayed. They right-click the `.rep` file in the VS Code file explorer and select "Load into Debrief..." from the context menu. A picker interface appears allowing them to select the target STAC catalog and item. After selection, the import proceeds as with drag-and-drop.

**Why this priority**: Provides flexibility when the target context is not obvious from the current view. Essential for workflows where analysts manage multiple plots or work primarily from the file explorer.

**Independent Test**: Can be fully tested by right-clicking a REP file, selecting the menu option, choosing a catalog/item from the picker, and verifying the data imports correctly.

**Acceptance Scenarios**:

1. **Given** a `.rep` file in the VS Code file explorer, **When** user right-clicks and selects "Load into Debrief...", **Then** a picker dialog appears showing available STAC catalogs and their items.

2. **Given** the picker dialog is open, **When** user selects a catalog and item and confirms, **Then** the REP file is parsed, stored as an asset on the selected item, and merged into that item's GeoJSON.

3. **Given** the picker dialog is open showing multiple catalogs, **When** user cancels the dialog, **Then** no import occurs and no changes are made.

---

### User Story 3 - Error Recovery and Feedback (Priority: P3)

When import operations encounter problems, the analyst receives clear feedback about what went wrong and what they can do about it. Error messages are specific enough to diagnose issues without exposing technical implementation details.

**Why this priority**: Good error handling improves user confidence and reduces support burden. While not the core feature, it's essential for production readiness.

**Independent Test**: Can be tested by attempting imports with various malformed files and verifying error messages are helpful and accurate.

**Acceptance Scenarios**:

1. **Given** a file with `.rep` extension but invalid content, **When** import is attempted, **Then** the error message indicates the file format is invalid and suggests checking the file contents.

2. **Given** a STAC item that cannot be modified (permissions or corruption), **When** import is attempted, **Then** the error message indicates the target item cannot be updated and no partial changes are made.

---

### Edge Cases

- What happens when the user drops a non-REP file onto the map? (Ignored with optional feedback)
- What happens when the REP file contains no tracks (only shapes)? (Shapes are still imported and displayed)
- What happens when the STAC item's GeoJSON is empty before import? (REP data becomes the initial content)
- How does the system handle very large REP files? (Progress indication for files over a reasonable threshold)
- What happens if the user drags multiple files? (Only single file supported; first file processed or clear "one file at a time" message)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept REP files via drag-and-drop onto the map panel when a STAC item is being displayed
- **FR-002**: System MUST accept REP files via right-click context menu on `.rep` files in the VS Code file explorer
- **FR-003**: System MUST parse REP file content using the existing parsing service (debrief-io)
- **FR-004**: System MUST store the imported REP file as an asset on the target STAC item
- **FR-005**: System MUST merge parsed track and shape data into the target STAC item's GeoJSON
- **FR-006**: System MUST automatically adjust the map view to include newly imported data bounds
- **FR-007**: System MUST detect and warn about duplicate imports (same original filename on the same STAC item)
- **FR-008**: System MUST reject malformed REP files with a user-friendly error message
- **FR-009**: System MUST provide a picker interface for selecting target STAC catalog and item (context menu flow)
- **FR-010**: System MUST operate entirely offline without requiring network connectivity
- **FR-011**: System MUST NOT support batch import of multiple files in a single operation
- **FR-012**: System MUST NOT modify the original REP file (read-only access)

### Key Entities

- **REP File**: Source data file containing track positions and/or annotation shapes in REP format
- **STAC Item**: Target container for the plot, holds GeoJSON data and assets
- **STAC Asset**: Reference to the stored REP file, linked to the STAC item for provenance
- **GeoJSON FeatureCollection**: Display data merged from one or more REP file imports
- **STAC Catalog**: Collection of STAC items; user selects catalog then item in the picker flow

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Import REP track data into an existing STAC-based plot for visualization
- **Key Decision(s)**:
  1. Which STAC item to import into (implicit via current map view, or explicit via picker)
  2. Whether to proceed when duplicate is detected
- **Decision Inputs**: Current map context shows which item is displayed; picker shows catalog/item names and descriptions

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Map panel with STAC item | Drag `.rep` file onto map | Import begins, progress indicator appears |
| 2 | Import in progress | Wait | Parsing and storage occur |
| 3 | Import complete | View updated map | Map zooms/pans to show all data including new tracks |

*Alternative flow (context menu):*

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | File explorer with `.rep` file | Right-click, select "Load into Debrief..." | Picker dialog opens |
| 2 | Picker dialog | Select catalog, then item | Item is highlighted for selection |
| 3 | Picker dialog with selection | Click "Import" button | Import begins |
| 4 | Import complete | View confirmation | Dialog closes, success notification shown |

### UI States

- **Empty State**: N/A - feature operates on existing STAC items
- **Loading State**: Brief progress indicator during parsing and storage (spinner or progress bar for larger files)
- **Error State**: Modal or notification banner with error message, "OK" to dismiss; no partial changes made
- **Success State**: Map view updates to show imported data; optional brief success notification

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can import a REP file via drag-and-drop in under 5 seconds (for typical files under 1MB)
- **SC-002**: Users can import a REP file via context menu in under 10 seconds including picker selection
- **SC-003**: 100% of import operations either succeed completely or fail cleanly with no partial state
- **SC-004**: Duplicate file detection prevents 100% of same-filename reimports with clear user warning
- **SC-005**: All import operations complete successfully without network connectivity
- **SC-006**: Error messages enable users to understand and resolve issues without technical support in 90% of cases

## Assumptions

- The VS Code extension already has a map panel component that displays GeoJSON from STAC items
- The debrief-io service provides a parsing function that accepts REP file content and returns structured data
- The debrief-stac service provides functions to add assets and update GeoJSON on STAC items
- The loader mini-app has reusable picker components for catalog/item selection
- REP files are local files accessible via VS Code's file system APIs
- A STAC item must already exist before data can be imported into it (no item creation in this feature)

## Out of Scope

- Batch import of multiple files in a single operation
- Import from URLs or remote file sources
- Format conversion (only REP format supported)
- Undo/rollback of import operations
- Creation of new STAC items (user must have an existing item as target)
- Export or round-trip of imported data back to REP format
