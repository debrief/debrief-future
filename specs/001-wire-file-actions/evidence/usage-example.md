# Usage Example: Wire Up File Actions

**Feature**: 001-wire-file-actions
**Date**: 2026-02-05

## Overview

The Associated Files dropdown in the Activity Panel now supports four file actions: Open, Open With, Reveal in Explorer, and Delete.

## User Flow

### 1. Opening a File

```
User Action: Click "Open" on associated file "track_001.rep"
Result: File opens in VS Code editor tab
```

If the file is already open in another tab, focus moves to that tab instead of opening a duplicate.

### 2. Revealing in Explorer

```
User Action: Click "Reveal in Explorer" on file "analysis.geojson"
Result: System file explorer opens with file highlighted
```

Note: In VS Code Web, this shows: "This operation requires the desktop version of VS Code."

### 3. Deleting a File

```
User Action: Click "Delete" on file "old_results.json"
Dialog: "Delete 'old_results.json'? This cannot be undone." [Delete] [Cancel]
User clicks: Delete
Result: File removed from filesystem, confirmation shown
```

If user clicks Cancel, no action is taken.

### 4. Open With Application Picker

```
User Action: Click "Open With..." on file "data.csv"
Result: VS Code application picker dialog appears
User selects: Excel
Result: File opens in selected application
```

## Message Flow

```
AssociatedFilesDropdown
    └── onFileAction(file, 'open')
        └── LayersToolbar
            └── onFileAction(file, 'open')
                └── ActivityPanel
                    └── onFileAction(file, 'open')
                        └── vscode.postMessage({ type: 'file:action', payload: { file, action: 'open' } })
                            └── activityPanelView.ts
                                └── _handleFileAction(file, 'open')
                                    └── _openFile(uri)
                                        └── vscode.workspace.openTextDocument(uri)
                                        └── vscode.window.showTextDocument(doc)
```

## Error Handling

| Error Scenario | User Message |
|----------------|--------------|
| File not found | "File not found: {name}. It may have been moved or deleted." |
| Permission denied | "Cannot access file: {name}. Check file permissions." |
| Unknown error | "Failed to {action} file: {name}. {details}" |

## Web Client Behavior

When running in VS Code Web (vscode.dev):
- **Open**: Works normally
- **Open With**: Works normally
- **Reveal**: Shows informational message
- **Delete**: Shows informational message

The informational message: "This operation requires the desktop version of VS Code."
