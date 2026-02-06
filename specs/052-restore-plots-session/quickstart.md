# Quickstart: Restore Previously-Open Plots on VS Code Startup

**Feature**: 052-restore-plots-session
**Date**: 2026-02-06

## Overview

This feature adds automatic session restoration to the VS Code extension. When a user closes VS Code and reopens it, the plots they had open are automatically restored.

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────┐
│                    extension.ts                      │
│                     activate()                       │
│                         │                            │
│              ┌──────────┴──────────┐                 │
│              ▼                     ▼                 │
│     OpenPlotsService       (existing services)       │
│     ┌──────────────┐      ┌──────────────────┐      │
│     │ getOpenPlots  │      │ stacService      │      │
│     │ addPlot       │      │ sessionManager   │      │
│     │ removePlot    │      │ recentPlots      │      │
│     │ restoreOpen   │      └──────────────────┘      │
│     │ Plots()       │                                │
│     └──────┬───────┘                                 │
│            │                                         │
│            ▼                                         │
│     workspaceState                                   │
│     key: "debrief.openPlots"                         │
└─────────────────────────────────────────────────────┘
```

## Key Files

| File | Role | Change Type |
|------|------|-------------|
| `apps/vscode/src/services/openPlotsService.ts` | New service: track & persist open plots | **NEW** |
| `apps/vscode/src/test/services/openPlotsService.test.ts` | Unit tests for the service | **NEW** |
| `apps/vscode/src/extension.ts` | Instantiate service, call `restoreOpenPlots()` on activation | MODIFY |
| `apps/vscode/src/commands/openPlot.ts` | Call `addPlot()` after successful plot open | MODIFY |
| `apps/vscode/src/webview/mapPanel.ts` | Call `removePlot()` on panel dispose | MODIFY |

## Implementation Steps

### Step 1: Create OpenPlotsService

Create `apps/vscode/src/services/openPlotsService.ts` following the contract in `contracts/open-plots-service.ts`. The service:
- Takes `ExtensionContext` in its constructor (same pattern as `RecentPlotsService`)
- Reads/writes `debrief.openPlots` key in `workspaceState`
- Handles corrupt state by falling back to empty

### Step 2: Wire into extension activation

In `extension.ts`:
1. Instantiate `OpenPlotsService` alongside existing services
2. After all services are initialized, call `openPlotsService.restoreOpenPlots()`
3. Pass `openPlotsService` to the `openPlot` command factory

### Step 3: Track plot opens

In `openPlot.ts` (`createOpenPlotCommand`):
- After a plot is successfully loaded and displayed, call `openPlotsService.addPlot(uri, title, storeId, itemPath)`
- This goes after the existing `recentPlotsService.addRecentPlot()` call

### Step 4: Track plot closes

In `mapPanel.ts`:
- When the panel is disposed (user closes it), call `openPlotsService.removePlot(uri)`
- The URI is available from the session manager's active session

### Step 5: Write tests

Test the `OpenPlotsService` in isolation:
- Mock `ExtensionContext.workspaceState` with a simple in-memory Map
- Test add, remove, clear, isOpen, getOpenPlots
- Test corrupt state handling
- Test duplicate URI handling

## Testing the Feature Manually

1. Open VS Code with the Debrief extension
2. Open a STAC plot via the tree view or command palette
3. Close VS Code completely
4. Reopen VS Code in the same workspace
5. Verify the plot is automatically restored

## Key Design Decisions

1. **Separate service** (not extending RecentPlotsService) — different lifecycle and semantics
2. **Real-time persistence** (not at-shutdown) — crash-safe
3. **Sequential restoration** — avoids race conditions with singleton MapPanel
4. **Silent skip on failure** — per spec, no error messages for missing plots
5. **stac:// URI as identifier** — already canonical across the codebase
