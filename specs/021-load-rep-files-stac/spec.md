# Feature Specification: Load REP Files into STAC Catalog from VS Code

**Feature Branch**: `021-load-rep-files-stac`
**Created**: 2026-01-23
**Status**: Draft
**Input**: User description: "Add REP file loading to VS Code extension with drag-drop onto map and right-click context menu options"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Drag-and-Drop REP File onto Map (Priority: P1)

A maritime analyst has a plot open in the VS Code Debrief extension and wants to add track data from a REP file on their local filesystem. They drag the `.rep` file from the VS Code file explorer directly onto the map panel. The REP data is parsed, stored as an asset on the STAC item, merged into the GeoJSON, and the map automatically zooms to show the newly imported data.

**Why this priority**: This is the primary interaction pattern for the tracer bullet workflow. The drag-drop gesture is intuitive and requires no additional UI dialogs when the target context (map's STAC item) is already known.

**Independent Test**: Can be tested by opening a plot, dragging a valid REP file onto the map, and verifying the track appears and the map zooms to show it.

**Acceptance Scenarios**:

1. **Given** a plot is displayed on the map (from a STAC item), **When** the user drags a `.rep` file from VS Code Explorer onto the map panel, **Then** the REP data is imported and displayed on the map
2. **Given** a REP file is dropped on the map, **When** the import completes successfully, **Then** the map auto-zooms/pans to show the bounds of the newly imported data
3. **Given** a REP file is dropped on the map, **When** the file is parsed, **Then** the original REP file is stored as an asset on the STAC item with `roles: ["source"]`
4. **Given** a REP file contains both track and shape data, **When** imported, **Then** both tracks (LineStrings) and shapes (annotations like CIRCLE, RECTANGLE) are added to the GeoJSON

---

### User Story 2 - Duplicate File Detection (Priority: P1)

An analyst accidentally drops the same REP file onto the map twice. The system detects the duplicate based on the original filename and shows a warning instead of creating duplicate data.

**Why this priority**: Critical for data integrity. Without duplicate detection, users could unknowingly corrupt their analysis with redundant data.

**Independent Test**: Can be tested by dropping the same REP file twice and verifying a warning appears on the second attempt.

**Acceptance Scenarios**:

1. **Given** a REP file named `exercise_alpha.rep` has already been imported to the STAC item, **When** the user drops another file named `exercise_alpha.rep` onto the map, **Then** a warning notification appears: "File 'exercise_alpha.rep' has already been imported. Skipping."
2. **Given** a duplicate file is detected, **When** the warning is shown, **Then** no changes are made to the GeoJSON or STAC item assets
3. **Given** two different files with different names exist, **When** both are dropped sequentially, **Then** both are imported successfully (no false positive duplicate detection)

---

### User Story 3 - Malformed REP File Handling (Priority: P1)

An analyst drops a REP file that contains syntax errors or invalid data. The system rejects the entire file with a clear error message explaining what went wrong.

**Why this priority**: Essential for user trust and debugging. Silent failures or partial imports would lead to confusing analysis results.

**Independent Test**: Can be tested by dropping a malformed REP file and verifying an error message appears with the file not imported.

**Acceptance Scenarios**:

1. **Given** a REP file has invalid syntax, **When** dropped onto the map, **Then** an error notification appears with a descriptive message (e.g., "Failed to parse 'bad_data.rep': Invalid position format at line 47")
2. **Given** a parsing error occurs, **When** the error is shown, **Then** no changes are made to the GeoJSON or STAC item assets
3. **Given** a file is not a valid REP file (wrong format entirely), **When** dropped, **Then** an error states: "File 'notes.txt' is not a valid REP file"

---

### User Story 4 - Right-Click Context Menu Import (Priority: P2)

An analyst wants to import a REP file but doesn't have a map open, or wants to import into a different plot than the one currently displayed. They right-click on a `.rep` file in VS Code's file explorer and select "Load into Debrief...". A picker appears allowing them to select the target STAC catalog and item.

**Why this priority**: Secondary workflow for when drag-drop context isn't available. Provides flexibility but requires additional UI interaction.

**Independent Test**: Can be tested by right-clicking a REP file, selecting the menu option, choosing a target, and verifying the import succeeds.

**Acceptance Scenarios**:

1. **Given** a `.rep` file is visible in VS Code's file explorer, **When** the user right-clicks on it, **Then** a context menu option "Load into Debrief..." is available
2. **Given** the user clicks "Load into Debrief...", **When** the picker opens, **Then** it shows a list of available STAC catalogs from registered stores
3. **Given** a catalog is selected, **When** the user drills down, **Then** they see a list of STAC items (plots) in that catalog
4. **Given** a target STAC item is selected, **When** the user confirms, **Then** the REP file is imported into that item (same behavior as drag-drop)
5. **Given** no STAC stores are registered, **When** the picker opens, **Then** it shows guidance to register a STAC store first

---

### User Story 5 - Import Progress Feedback (Priority: P2)

An analyst imports a large REP file with thousands of track points. The system shows progress feedback during the import operation.

**Why this priority**: Important for user confidence during potentially slow operations, but secondary to core import functionality.

**Independent Test**: Can be tested by importing a large REP file and observing progress indication.

**Acceptance Scenarios**:

1. **Given** a REP file is being imported, **When** the operation is in progress, **Then** a progress indicator appears (VS Code notification or status bar)
2. **Given** the import is running, **When** the user looks at the progress, **Then** they see the filename being imported
3. **Given** the import completes successfully, **When** the progress indicator updates, **Then** it shows a success message that auto-dismisses after 3 seconds

---

### Edge Cases

- What happens when the map panel loses focus during drag-drop?
  - *Behavior*: The drop target should remain valid as long as the drop lands on the map webview
- What happens when the user drops a non-REP file (e.g., `.csv`) onto the map?
  - *Behavior*: Show error: "Only .rep files can be imported. Received: data.csv"
- What happens when the STAC item becomes unavailable mid-import (e.g., catalog deleted)?
  - *Behavior*: Rollback any partial changes and show error: "Import failed: Target STAC item is no longer available"
- What happens when the REP file is deleted while the catalog picker is open?
  - *Behavior*: Show error when import is attempted: "Import failed: File no longer exists"
- What happens when disk space is insufficient to store the asset?
  - *Behavior*: Show error from debrief-stac service: "Import failed: Insufficient disk space"

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Extension MUST accept drag-and-drop of `.rep` files from VS Code file explorer onto the map webview panel
- **FR-002**: Extension MUST use the displayed map's STAC item as the target for drag-drop imports
- **FR-003**: Extension MUST call debrief-io service to parse REP file content into GeoJSON features
- **FR-004**: Extension MUST call debrief-stac service to store the REP file as an asset on the STAC item
- **FR-005**: Extension MUST merge parsed GeoJSON features into the existing STAC item's GeoJSON
- **FR-006**: Extension MUST auto-zoom/pan the map to show the bounds of newly imported data
- **FR-007**: Extension MUST detect duplicate imports by comparing the dropped filename against existing asset filenames
- **FR-008**: Extension MUST reject duplicate files with a warning notification (no data modification)
- **FR-009**: Extension MUST reject malformed REP files with an error notification (no data modification)
- **FR-010**: Extension MUST display the parsing error message from debrief-io in the rejection notification
- **FR-011**: Extension MUST register a context menu item "Load into Debrief..." on `.rep` files in the file explorer
- **FR-012**: Extension MUST show a quick-pick catalog/item selector when context menu import is triggered
- **FR-013**: Extension MUST populate the picker with catalogs from registered STAC stores (via debrief-config)
- **FR-014**: Extension MUST show progress indication during import operations
- **FR-015**: Extension MUST work entirely offline (no network requests required)
- **FR-016**: Extension MUST handle both track data (LineStrings) and shape annotations (CIRCLE, RECTANGLE, etc.) from REP files

### Non-Functional Requirements

- **NFR-001**: Import of a typical REP file (< 1000 points) SHOULD complete in under 2 seconds
- **NFR-002**: The map SHOULD remain responsive during import (no UI freezing)
- **NFR-003**: Asset storage SHOULD use the original filename with a unique suffix if collision occurs

### Key Entities

- **REP File**: A Debrief replay file containing track positions, shapes, and annotations in a text-based format
- **STAC Item**: A SpatioTemporal Asset Catalog item representing a plot, containing GeoJSON data and asset references
- **Asset**: A file associated with a STAC item (e.g., the original REP file), stored alongside the item
- **GeoJSON Feature**: A geographic feature (track as LineString, shape as Polygon, point as Point) with properties
- **Catalog Picker**: A VS Code quick-pick UI showing registered STAC catalogs and their items for selection

## User Interface Design

### Drag-and-Drop Interaction

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  VS Code Window                                                             │
├────────┬────────────────────┬───────────────────────────────────────────────┤
│        │  Explorer          │              Map Panel                        │
│Activity│ ┌────────────────┐ │  ┌─────────────────────────────────────────┐  │
│  Bar   │ │ 📁 Project     │ │  │                                         │  │
│        │ │  📄 track.rep  │─┼──│──►  Drop Zone (entire map)              │  │
│        │ │  📄 notes.txt  │ │  │     ┌─────────────────────────┐         │  │
│        │ └────────────────┘ │  │     │ Drop REP file to import │         │  │
│        │                    │  │     └─────────────────────────┘         │  │
│        │                    │  │                                         │  │
│        │                    │  │     HMS Defender ═══════════►          │  │
│        │                    │  │                                         │  │
│        │                    │  └─────────────────────────────────────────┘  │
└────────┴────────────────────┴───────────────────────────────────────────────┘
```

**Visual Feedback During Drag**:
- When dragging over the map, show a semi-transparent overlay with "Drop REP file to import"
- Overlay appears only when a `.rep` file is being dragged (not for other file types)
- Invalid files show overlay with "Only .rep files can be imported"

### Context Menu

```
┌─────────────────────────────────────────┐
│  📄 exercise_data.rep                   │
├─────────────────────────────────────────┤
│  Open                                   │
│  Open to the Side                       │
│  Open With...                        ▶  │
│  ─────────────────────────────────────  │
│  Load into Debrief...              ⚓   │  ← Debrief action
│  ─────────────────────────────────────  │
│  Cut                            Ctrl+X  │
│  Copy                           Ctrl+C  │
│  ...                                    │
└─────────────────────────────────────────┘
```

### Catalog/Item Picker (for Context Menu)

```
┌─────────────────────────────────────────────────────────────────┐
│  Select STAC Catalog                                    [×]     │
├─────────────────────────────────────────────────────────────────┤
│  🔍 Search catalogs...                                          │
│                                                                 │
│  📁 Local Analysis                                              │
│     📂 /home/user/.local/share/debrief/catalogs/local           │
│                                                                 │
│  📁 Exercise Archive                                            │
│     📂 /data/exercises/stac-catalog                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

                              ↓ (after selecting catalog)

┌─────────────────────────────────────────────────────────────────┐
│  Select Plot in "Local Analysis"                        [×]     │
├─────────────────────────────────────────────────────────────────┤
│  🔍 Search plots...                                             │
│                                                                 │
│  📊 Exercise Alpha                      Modified: 2 hours ago   │
│  📊 Training Run 2024-01                Modified: yesterday     │
│  📊 Fleet Review                        Modified: 3 days ago    │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  [+ Create New Plot]                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Notifications

**Success**:
```
┌─────────────────────────────────────────────────────────────────┐
│  ✓ Imported 'exercise_data.rep'                        [Dismiss]│
│    Added 2 tracks, 3 annotations                                │
└─────────────────────────────────────────────────────────────────┘
```

**Duplicate Warning**:
```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠ File already imported                               [Dismiss]│
│    'exercise_data.rep' exists in this plot. Skipping.           │
└─────────────────────────────────────────────────────────────────┘
```

**Error**:
```
┌─────────────────────────────────────────────────────────────────┐
│  ✗ Failed to import 'bad_data.rep'                     [Dismiss]│
│    Invalid position format at line 47: expected "YYMMDD HHMMSS" │
└─────────────────────────────────────────────────────────────────┘
```

**Progress**:
```
┌─────────────────────────────────────────────────────────────────┐
│  ⟳ Importing 'large_exercise.rep'...                            │
│    Parsing track data...                                        │
└─────────────────────────────────────────────────────────────────┘
```

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: User can drag-drop a valid `.rep` file onto the map and see the imported tracks within 2 seconds
- **SC-002**: Imported REP file is stored as an asset on the STAC item with `roles: ["source"]`
- **SC-003**: Map auto-zooms to show imported data bounds after successful import
- **SC-004**: Duplicate files (same filename) are detected and rejected with warning
- **SC-005**: Malformed files are rejected with descriptive error messages
- **SC-006**: Right-click context menu allows import to any registered STAC item
- **SC-007**: All operations work entirely offline (no network required)
- **SC-008**: End-to-end workflow is demonstrable: drag REP → parse → store → display → zoom

## Assumptions

- The debrief-io service provides a `parse_rep` function that returns GeoJSON features
- The debrief-stac service provides `add_asset` and `update_geojson` functions
- REP files follow the standard Debrief replay format (positions, shapes, annotations)
- The VS Code webview (map panel) can receive drag-drop events via the webview API
- STAC item GeoJSON uses FeatureCollection format for track/shape data
- The debrief-config service provides access to registered STAC store paths

## Dependencies

- **debrief-io** (002): REP file parsing to GeoJSON features
- **debrief-stac** (001): STAC catalog operations (add asset, update GeoJSON)
- **debrief-config** (003): Access to registered STAC store paths
- **VS Code Extension** (006): The Debrief extension where this feature is implemented
- **Shared schemas** (000): GeoJSON and STAC data structures

## Out of Scope

- Batch import of multiple REP files in one operation
- Import from URLs or remote file systems
- Format conversion (e.g., CSV to REP before import)
- Undo/rollback of imports after they complete
- Importing file formats other than REP
- Creating new STAC items during import (must import to existing item)
- Editing or modifying imported data after import

## Technical Notes

### Service Integration Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│  VS Code    │     │  debrief-io │     │  debrief-stac   │     │  Map Panel   │
│  Extension  │     │  (Python)   │     │  (Python)       │     │  (Webview)   │
└──────┬──────┘     └──────┬──────┘     └────────┬────────┘     └──────┬───────┘
       │                   │                     │                     │
       │  1. Drop event    │                     │                     │
       │◄──────────────────┼─────────────────────┼─────────────────────┤
       │                   │                     │                     │
       │  2. Read file     │                     │                     │
       │  (VS Code API)    │                     │                     │
       │                   │                     │                     │
       │  3. parse_rep()   │                     │                     │
       │──────────────────►│                     │                     │
       │                   │                     │                     │
       │  4. GeoJSON       │                     │                     │
       │◄──────────────────│                     │                     │
       │                   │                     │                     │
       │  5. Check duplicates                    │                     │
       │  (get_item_assets)│                     │                     │
       │────────────────────────────────────────►│                     │
       │                   │                     │                     │
       │  6. add_asset()   │                     │                     │
       │────────────────────────────────────────►│                     │
       │                   │                     │                     │
       │  7. update_geojson()                    │                     │
       │────────────────────────────────────────►│                     │
       │                   │                     │                     │
       │  8. Refresh map + zoom                  │                     │
       │──────────────────────────────────────────────────────────────►│
       │                   │                     │                     │
```

### Webview Drop Handler

The map webview needs to:
1. Register for `drop` events on the webview document
2. Use VS Code's `dataTransfer` API to get dropped file URIs
3. Post message to extension host with file path and current STAC item context
4. Extension host orchestrates the import through debrief-io and debrief-stac

### Asset Storage Convention

REP files stored as assets should follow this convention:
```json
{
  "href": "./assets/exercise_data.rep",
  "type": "application/x-debrief-rep",
  "roles": ["source"],
  "title": "exercise_data.rep",
  "debrief:imported_at": "2026-01-23T10:30:00Z"
}
```
