# Usage Example: 052-restore-plots-session

**Feature**: Restore Previously-Open Plots on VS Code Startup

## Scenario: Open Plot, Close VS Code, Reopen

### Step 1: Open a STAC plot

The user opens a plot from the STAC explorer tree view or command palette. The `openPlot` command:

1. Loads the plot from the STAC store
2. Creates a session and MapPanel
3. Calls `recentPlotsService.addRecentPlot()` (existing behaviour)
4. **NEW**: Calls `openPlotsService.addPlot(plotUri, title, storeId, itemPath)`

This immediately persists the plot reference to `workspaceState` under the key `debrief.openPlots`.

### Step 2: Persisted state

After opening `stac://local-store/exercise-alpha/track-data`, the workspaceState contains:

```json
{
  "version": 1,
  "plots": [
    {
      "uri": "stac://local-store/exercise-alpha/track-data",
      "title": "Track Data",
      "storeId": "local-store",
      "itemPath": "exercise-alpha/track-data",
      "openedAt": "2026-02-06T14:30:00.000Z"
    }
  ]
}
```

### Step 3: Close VS Code

The user closes VS Code. The persisted state remains in `workspaceState` (managed by VS Code, survives restart).

When the MapPanel is disposed (via the close button or VS Code shutdown), `openPlotsService.clearAll()` is called to clear the open plots list — ensuring that if the user explicitly closes the panel, plots are not restored.

**Note**: For crash safety, persistence happens at open-time (not at-shutdown), so if VS Code crashes before the dispose handler runs, plots are still available for restoration.

### Step 4: Reopen VS Code

On activation, `extension.ts` calls:

```typescript
void openPlotsService.restoreOpenPlots();
```

This reads the persisted plots array and executes `vscode.commands.executeCommand('debrief.openPlot', { uri })` for each entry sequentially.

### Step 5: Plot is restored

The plot reappears automatically in the MapPanel with no user interaction required.

## Error Handling

### Missing plot files

If a STAC item has been deleted between sessions:
- The `openPlot` command throws an error
- `restoreOpenPlots` catches it silently (no error dialog)
- The entry is removed from the persisted list
- Remaining plots continue to restore normally

### Corrupt workspace state

If the persisted JSON is malformed:
- `getOpenPlots()` returns an empty array
- No restoration is attempted
- The corrupt state is effectively replaced on next `addPlot()` call

## Architecture

```
extension.ts activate()
  ├── new OpenPlotsService(context)           // T013
  ├── registerCommands(..., openPlotsService)  // T016
  └── openPlotsService.restoreOpenPlots()      // T014

openPlot.ts createOpenPlotCommand()
  └── openPlotsService.addPlot(...)            // T015

commands/index.ts closePlot
  └── openPlotsService.clearAll()              // T031

openPlot.ts onDidDispose
  └── openPlotsService.clearAll()              // T031
```
