# Spec 043: Load REP Files into New Plot

**Status**: specified
**Backlog Item**: 043 (Feature)
**Complexity**: Medium (Sonnet)
**Created**: 2026-01-30
**Input**: User description: "Load REP files into new plot via 'Add to new plot in store'"

## Problem

The current "Load into Debrief" command (#021) only supports adding REP data to an existing plot. Users must first create a plot manually, then load files into it. There is no way to create a new plot and populate it from REP files in a single action.

## Goal

Add an "Add to new plot in [store-name]" option to the existing "Load into Debrief" command. When selected, the system prompts for a plot title, creates a new STAC Item in the chosen store, parses the selected REP files, merges their data into the new plot's GeoJSON, and copies the original REP files into the Item's assets sub-folder.

## Prerequisites

- #021 (Load REP files into existing plot) is complete
- STAC store infrastructure exists with per-item folder structure (#040)
- `debrief-io` REP parser and `stacService` are operational

## User Scenarios & Testing

### User Story 1 - Create New Plot from REP File via Context Menu (Priority: P1)

An analyst has one or more `.rep` files and wants to start a new analysis plot. They right-click the file(s) in the VS Code file explorer and select "Load into Debrief...". Among the existing options, they now see "Add to new plot in [store-name]" for each configured STAC store. They pick a store, enter a plot title, and the system creates a new STAC Item containing the parsed track/annotation data and the original REP files as assets.

**Why this priority**: This is the core new capability — creating a plot from scratch using REP files. Without this, users must manually create an empty plot first.

**Independent Test**: Right-click a `.rep` file, select "Load into Debrief...", choose "Add to new plot in [store]", enter a title, verify a new STAC Item is created with correct GeoJSON and assets.

**Acceptance Scenarios**:

1. **Given** a `.rep` file in the VS Code file explorer and at least one configured STAC store, **When** user right-clicks and selects "Load into Debrief...", **Then** the picker shows "Add to new plot in [store-name]" for each configured store, in addition to existing plot options.

2. **Given** the user selects "Add to new plot in My Store", **When** prompted for a plot title and enters "Exercise Alpha", **Then** a new STAC Item titled "Exercise Alpha" is created in "My Store" with the REP data parsed into GeoJSON and the original `.rep` file copied to the assets sub-folder.

3. **Given** the user cancels the title prompt, **When** no title is entered, **Then** no STAC Item is created and no changes are made.

---

### User Story 2 - Multiple REP Files into Single New Plot (Priority: P2)

An analyst selects multiple `.rep` files (e.g., one per platform) and wants to combine them into a single new plot. They multi-select the files, right-click, choose "Load into Debrief...", select "Add to new plot in [store]", enter a title, and all files are parsed and merged into one new STAC Item.

**Why this priority**: Real-world exercises involve multiple platforms, each in a separate REP file. Combining them into one plot is a common workflow.

**Independent Test**: Multi-select two or more `.rep` files, load into new plot, verify all tracks appear in the GeoJSON and all original files are stored as assets.

**Acceptance Scenarios**:

1. **Given** three `.rep` files selected in the file explorer, **When** user creates a new plot from them, **Then** all three files are parsed and their features merged into a single GeoJSON FeatureCollection on the new STAC Item.

2. **Given** three `.rep` files selected, **When** the new plot is created, **Then** all three original `.rep` files appear as separate assets in the STAC Item's assets sub-folder.

---

### User Story 3 - Drag-and-Drop onto Empty Map (Priority: P3)

An analyst drags a `.rep` file onto an empty area of the editor (no map panel open). The system offers to create a new plot in one of the configured stores.

**Why this priority**: Provides an alternative entry point, but the context menu flow (P1) covers the primary use case. This is a convenience enhancement.

**Independent Test**: Drag a `.rep` file to the editor area with no map open, verify prompt appears to create a new plot.

**Acceptance Scenarios**:

1. **Given** no map panel is open, **When** user drags a `.rep` file onto the editor area, **Then** a picker appears offering "Add to new plot in [store-name]" for each configured store.

---

### Edge Cases

- What happens when no STAC stores are configured? → Show message: "No STAC stores configured. Add a store first."
- What happens when the user enters an empty title? → Reject with message: "Plot title cannot be empty."
- What happens when a plot with the same title already exists in the store? → Allow it — STAC Items are identified by generated ID, not title. Duplicate titles are permitted.
- What happens when one of multiple REP files fails to parse? → Fail the entire operation with a clear error. No partial plot creation (atomic operation).
- What happens when the store folder is read-only or missing? → Show error: "Cannot write to store [name]. Check folder permissions."

## Requirements

### Functional Requirements

- **FR-001**: System MUST show "Add to new plot in [store-name]" option for each configured STAC store in the "Load into Debrief..." picker
- **FR-002**: System MUST prompt user for a plot title after they select a store
- **FR-003**: System MUST create a new STAC Item with a generated unique ID and the user-provided title
- **FR-004**: System MUST parse all selected REP files using IoService and merge features into a single GeoJSON FeatureCollection
- **FR-005**: System MUST copy original REP files into the new STAC Item's assets sub-folder (CONSTITUTION Article III: source preservation)
- **FR-006**: System MUST register copied REP files as STAC assets on the new Item
- **FR-007**: System MUST set temporal metadata (`start_datetime`, `end_datetime`) on the new Item from the parsed data's time range
- **FR-008**: System MUST set spatial metadata (`bbox`) on the new Item from the parsed data's spatial extent
- **FR-009**: System MUST operate entirely offline without network connectivity
- **FR-010**: System MUST NOT modify the original REP files (read-only access)
- **FR-011**: System MUST perform the operation atomically — if any step fails, no partial STAC Item is left behind
- **FR-012**: System MUST open the newly created plot in a MapPanel after successful creation

### Key Entities

- **REP File**: Source data file containing track positions and/or annotation shapes in REP format
- **STAC Item**: The new plot container, created during this workflow. Holds GeoJSON data and asset references
- **STAC Asset**: Reference to each stored REP file, linked to the STAC Item for provenance
- **STAC Store**: A configured catalog location where the new Item is created
- **GeoJSON FeatureCollection**: Display data assembled from parsed REP file(s)

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Create a new plot from REP file(s) and store it in a STAC catalog
- **Key Decision(s)**:
  1. Which STAC store to create the plot in
  2. What to name the plot
- **Decision Inputs**: Store names from configuration; file names provide context for a sensible title

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | File explorer with `.rep` file(s) selected | Right-click, select "Load into Debrief..." | Picker dialog opens |
| 2 | Picker dialog | Select "Add to new plot in [store-name]" | Title input prompt appears |
| 3 | Title input prompt | Enter plot title, press Enter | Import begins with progress indicator |
| 4 | Import complete | View new map panel | New plot opens showing parsed track data |

### UI States

- **Empty State**: N/A — this flow always creates new content
- **Loading State**: Progress notification during parsing and STAC Item creation
- **Error State**: Error notification with message; no partial Item created
- **Success State**: New plot opens in MapPanel; info notification confirms creation

## Design

### Integration with Existing "Load into Debrief" Command

The existing command (#021) presents a QuickPick with options to load into existing plots. This feature extends that picker by prepending "Add to new plot in [store-name]" entries — one per configured store.

**Picker layout:**
```
Load into Debrief...
──────────────────────────────
$(add) Add to new plot in "My Store"
$(add) Add to new plot in "Project Store"
──────────────────────────────
$(file) Existing Plot Alpha (My Store)
$(file) Existing Plot Beta (Project Store)
```

The `$(add)` icon (VS Code codicon) visually distinguishes "new plot" options from existing plot targets.

### New Plot Creation Flow

When user selects "Add to new plot in [store]":

1. **Prompt for title**: `vscode.window.showInputBox({ prompt: 'Enter plot title', validateInput: ... })`
2. **Create STAC Item**: Call `stacService.createItem(storePath, { title, id: generateId() })`
3. **Parse REP files**: Call `ioService.parseRep(fileContent)` for each selected file
4. **Merge features**: Combine all parsed GeoJSON features into one FeatureCollection
5. **Write GeoJSON**: Save merged FeatureCollection as the Item's data payload
6. **Copy assets**: Copy each original `.rep` file to `{itemFolder}/assets/` and register as STAC asset
7. **Set metadata**: Compute and write `bbox`, `start_datetime`, `end_datetime` from merged data
8. **Open plot**: Open the new STAC Item in a MapPanel

### Atomicity

If any step after Item folder creation fails:
- Delete the partially created Item folder
- Show error notification
- No cleanup of original files (they were only read, never modified)

### stacService Extensions

The `stacService` needs a new method:

```typescript
createItem(storePath: string, options: {
  title: string;
  id?: string; // auto-generated if omitted
}): Promise<{ itemPath: string; itemId: string }>;
```

This creates the folder structure per #040 conventions:
```
{storePath}/{catalogId}/{itemId}/
  ├── item.json
  ├── data.geojson
  └── assets/
```

### IoService Usage

IoService is used as-is from #021 — it parses REP content and returns GeoJSON features. No changes needed to the parser. The VS Code extension orchestrates: parse first, then store (same separation of concerns as #021).

## Data Flow

```
User right-clicks .rep file(s) → "Load into Debrief..."
  → QuickPick shows "Add to new plot in [store]" options
    → User selects store
      → InputBox: enter plot title
        → stacService.createItem(store, { title })
          → ioService.parseRep(file1), ioService.parseRep(file2), ...
            → merge GeoJSON features
              → stacService.writeGeoJson(itemPath, featureCollection)
                → copy .rep files to assets/
                  → stacService.addAssets(itemPath, repFiles)
                    → stacService.updateMetadata(itemPath, { bbox, temporal })
                      → open MapPanel with new item
```

## Files to Modify

| File | Change |
|------|--------|
| `apps/vscode/src/commands/loadIntoDebrief.ts` (or equivalent) | Add "new plot" options to the QuickPick; implement new-plot creation flow |
| `apps/vscode/src/services/stacService.ts` | Add `createItem()` method for creating new STAC Items |
| `apps/vscode/package.json` | No changes expected — reuses existing command contribution |

## Files to Create

| File | Purpose |
|------|---------|
| None expected | Feature extends existing command and service; no new files anticipated |

## Testing Strategy

1. **Unit tests** for `stacService.createItem()` — verify folder structure, item.json content, metadata fields
2. **Unit tests** for QuickPick option generation — verify "new plot" entries appear for each configured store
3. **Unit tests** for atomicity — verify cleanup on failure (partial folder removed)
4. **Unit tests** for multi-file merge — verify GeoJSON features from multiple REP files are combined correctly
5. **Unit tests** for metadata computation — verify bbox and temporal range derived from merged data
6. **Manual verification** — right-click REP file, create new plot, verify it opens in MapPanel with correct data

## Acceptance Criteria

1. "Add to new plot in [store-name]" appears in the "Load into Debrief..." picker for each configured store
2. User is prompted for a plot title after selecting a store
3. A new STAC Item is created with the correct per-item folder structure (#040)
4. Single REP file is parsed and its data appears in the new plot's GeoJSON
5. Multiple REP files are parsed and merged into a single GeoJSON FeatureCollection
6. Original `.rep` files are copied to the Item's assets sub-folder and registered as STAC assets
7. Temporal and spatial metadata are set on the new Item from parsed data
8. The new plot opens in a MapPanel after creation
9. If any step fails, no partial STAC Item remains (atomic operation)
10. Feature works entirely offline

## Out of Scope

- Modifying the existing "add to existing plot" workflow
- Supporting non-REP file formats (future extension)
- Plot editing or renaming after creation
- Creating plots from the STAC Stores tree view (only via file context menu)
- Drag-and-drop onto existing map panels (handled by #021)
