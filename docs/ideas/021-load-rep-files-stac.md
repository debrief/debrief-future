# Add REP file loading to VS Code extension

## Problem

Users need to import REP format track data into their STAC-based plots from within the VS Code extension. Currently there's no way to add new data sources to an open plot without leaving VS Code.

## Proposed Solution

Add two interaction patterns for loading REP files into the local STAC catalog:

### 1. Drag-and-Drop onto Map (Priority 1)
- User drags a `.rep` file from VS Code file explorer onto the map panel
- The map is displaying a GeoJSON from a known STAC item, so catalog/item context is implicit
- REP file is stored as an asset on that STAC item
- REP data (tracks and/or shapes) is parsed and merged into the GeoJSON
- Map auto-zooms/pans to show the newly imported data

### 2. Right-Click Context Menu (Priority 2)
- User right-clicks a `.rep` file in VS Code file explorer
- Context menu shows "Load into Debrief..."
- User selects target STAC catalog and item via picker UI (reuse components from `apps/loader`)
- Same import behavior as drag-drop once target is selected

## Success Criteria
- [ ] Drag-drop of .rep file onto map imports data and zooms to show it
- [ ] REP file is stored as an asset on the STAC item
- [ ] Duplicate files (same original filename) are detected and skipped with warning
- [ ] Malformed REP files are rejected with clear error message
- [ ] Right-click context menu provides catalog/item selection
- [ ] Works entirely offline (no network required)

## Constraints
- Must work offline (CONSTITUTION requirement)
- Must use existing debrief-io service for REP parsing
- Must use existing debrief-stac service for catalog operations
- Drag-drop requires active map with STAC item context

## Out of Scope
- Batch import of multiple files (single file at a time)
- Import from URLs or remote sources
- Format conversion (REP only for this feature)
- Undo/rollback of imports
