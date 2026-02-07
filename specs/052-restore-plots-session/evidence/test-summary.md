# Test Summary: 052-restore-plots-session

**Date**: 2026-02-06
**Runner**: vitest v1.6.1
**Environment**: Node.js

## Results

| Suite | Tests | Passed | Failed |
|-------|-------|--------|--------|
| OpenPlotsService | 28 | 28 | 0 |

**Overall**: 28/28 tests passing (100%)

## Test Categories

### Foundation — CRUD Operations (T003)
- `getOpenPlots` — returns empty when no state, returns persisted plots (2 tests)
- `addPlot` — adds plot, sets timestamp, handles duplicate URIs, persists immediately (4 tests)
- `removePlot` — removes by URI, no-op when not found (2 tests)
- `isOpen` — returns true for open, false for non-open (2 tests)
- `clearAll` — removes all plots, persists empty state (2 tests)

### Foundation — restoreOpenPlots (T004)
- Returns empty when no plots persisted
- Executes openPlot command for each persisted plot
- Silently skips plots that fail to restore
- Persists cleaned list after restoration (failed entries removed)
- Handles corrupt state by falling back to empty list
- Handles state with missing plots array
- Returns empty when all plots fail to restore
(7 tests)

### US1: Single Plot Round-Trip (T012)
- Persists and restores a single plot via addPlot then restoreOpenPlots (1 test)

### US2: Multiple Plots Ordering (T018-T019)
- Returns 3 plots in correct open order (1 test)
- Restores plots sequentially in original order (1 test)

### US3: Graceful Missing Plots (T022-T025)
- Silently skips missing STAC items (1 test)
- Removes failed entries from persisted list (1 test)
- Falls back to empty list on corrupt workspaceState (1 test)
- Results in empty state when all plots are missing (1 test)

### US4: Explicit Plot Closure (T029-T030)
- Removes correct entry from persisted list (1 test)
- Yields empty list when all plots closed then restored (1 test)

## Full Output

```
 RUN  v1.6.1 /home/user/debrief-future/apps/vscode

 ✓ tests/unit/openPlotsService.test.ts (28 tests) 17ms
   ✓ OpenPlotsService > getOpenPlots > should return empty array when no state exists
   ✓ OpenPlotsService > getOpenPlots > should return plots from persisted state
   ✓ OpenPlotsService > addPlot > should add a plot to the list
   ✓ OpenPlotsService > addPlot > should set openedAt timestamp
   ✓ OpenPlotsService > addPlot > should handle duplicate URI by moving to end with updated timestamp
   ✓ OpenPlotsService > addPlot > should persist immediately via workspaceState
   ✓ OpenPlotsService > removePlot > should remove a plot by URI
   ✓ OpenPlotsService > removePlot > should be a no-op if URI not found
   ✓ OpenPlotsService > isOpen > should return true for an open plot
   ✓ OpenPlotsService > isOpen > should return false for a non-open plot
   ✓ OpenPlotsService > clearAll > should remove all plots
   ✓ OpenPlotsService > clearAll > should persist empty state
   ✓ OpenPlotsService > restoreOpenPlots > should return empty array when no plots persisted
   ✓ OpenPlotsService > restoreOpenPlots > should execute openPlot command for each persisted plot
   ✓ OpenPlotsService > restoreOpenPlots > should silently skip plots that fail to restore
   ✓ OpenPlotsService > restoreOpenPlots > should persist cleaned list after restoration
   ✓ OpenPlotsService > restoreOpenPlots > should handle corrupt state by falling back to empty list
   ✓ OpenPlotsService > restoreOpenPlots > should handle state with missing plots array
   ✓ OpenPlotsService > restoreOpenPlots > should return empty when all plots fail to restore
   ✓ OpenPlotsService > US1: single plot round-trip > should persist and restore single plot
   ✓ OpenPlotsService > US2: multiple plots ordering > should return 3 plots in correct open order
   ✓ OpenPlotsService > US2: multiple plots ordering > should restore plots sequentially in order
   ✓ OpenPlotsService > US3: graceful handling > should silently skip missing STAC items
   ✓ OpenPlotsService > US3: graceful handling > should remove failed entries from persisted list
   ✓ OpenPlotsService > US3: graceful handling > should fall back to empty on corrupt state
   ✓ OpenPlotsService > US3: graceful handling > should result in empty when all plots missing
   ✓ OpenPlotsService > US4: explicit plot closure > should remove correct entry
   ✓ OpenPlotsService > US4: explicit plot closure > should yield empty list when all closed

 Test Files  1 passed (1)
      Tests  28 passed (28)
   Duration  2.14s
```
