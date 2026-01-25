# Usage Example: REP File Import

## Drag-and-Drop Import

### Step 1: Open a Plot

Open a plot from your STAC store by double-clicking in the Explorer panel or using `Ctrl+Shift+O`.

### Step 2: Drag REP File

Drag a `.rep` file from the VS Code Explorer (or system file manager) onto the map panel.

The drop zone activates with a visual indicator when you drag over the map.

### Step 3: Watch Progress

Progress notification shows each stage:
1. "Checking for duplicates..."
2. "Parsing REP file..."
3. "Storing asset..."
4. "Storing features..."

### Step 4: View Results

- Tracks appear on the map
- Map automatically zooms to fit imported data
- Success message: "Imported N feature(s) from filename.rep"

## Context Menu Import

### Step 1: Right-Click REP File

In the VS Code Explorer, right-click any `.rep` file.

### Step 2: Select "Load into Debrief..."

Click the context menu option to open the target picker.

### Step 3: Choose Target Plot

QuickPick shows available plots with:
- Plot title
- Date
- Store/catalog path

### Step 4: Watch Import

Same progress flow as drag-and-drop, plus tree view refresh on completion.

## Error Scenarios

### Duplicate Import

```
Warning: File "boat1.rep" has already been imported to this plot.
[Cancel]
```

### Invalid Format

```
Error: Invalid REP format in "malformed.rep" at line 42 (field: course).
Check file format and try again.
```

### No Features Found

```
Warning: No features found in empty.rep
```

### Multi-File Drop

```
Error: Only single file import is supported. Please drop one file at a time.
```

## Architecture Flow

```
User Action → Webview → MapPanel → IoService → StacService
     │                     │            │           │
     │                     │            │           └─ addAsset()
     │                     │            │           └─ addFeatures()
     │                     │            └─ parseRep() → GeoJSON
     │                     └─ orchestration
     └─ drag/drop or context menu
```

The extension acts as orchestrator:
1. IoService parses REP → returns GeoJSON (storage-agnostic)
2. StacService stores asset and features
3. Map updates with new data and zooms to fit
