# Load REP files into new plot via "Add to new plot in [store]"

## Problem

The current "Load into Debrief" command (#021) only supports adding REP data to an existing plot. There is no way to create a new, empty plot and populate it from REP files in one action. Users must first create a plot manually, then load files into it.

## Proposed Solution

Add an "Add to new plot in [store-name]" option to the "Load into Debrief" command. For each configured STAC store, show a separate option (e.g., "Add to new plot in My Store", "Add to new plot in Project Store").

**Workflow:**
1. User selects one or more `.rep` files and chooses "Load into Debrief"
2. Among the options, they see "Add to new plot in [store-name]" for each configured store
3. User picks a store → prompted for a plot title
4. System creates a new STAC Item in the store's folder
5. All selected REP files are parsed; their data is merged into the new plot's GeoJSON
6. Original `.rep` files are copied into the Item's `assets` sub-folder (per CONSTITUTION Article III: source preservation)

## Success Criteria

- "Add to new plot in [store-name]" option appears for each configured STAC store
- User is prompted for a plot title after selecting the option
- A new STAC Item is created with correct folder structure
- Multiple REP files can be loaded into the same new plot in one operation
- Original `.rep` files are stored in the `assets` sub-folder
- Parsed track/annotation data appears in the plot's GeoJSON payload

## Constraints

- Must work offline (CONSTITUTION Article I)
- Must preserve source files as STAC assets (CONSTITUTION Article III)
- Builds on existing REP loading infrastructure from #021

## Out of Scope

- Modifying the existing "add to existing plot" workflow
- Supporting non-REP file formats (future extension)
- Plot editing or renaming after creation
