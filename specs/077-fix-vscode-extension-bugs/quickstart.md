# Quickstart: Verifying Bug Fixes

**Feature**: 077-fix-vscode-extension-bugs

## Prerequisites

- VS Code with the Debrief extension installed (development mode)
- Exercise Alpha sample file available
- Python environment with `debrief_calc` installed (for tool offering test)

## Verification Steps

### Bug 1: Time Slider

1. Open Exercise Alpha in the Debrief extension
2. Observe the TimeController showing 0930-1400 range
3. Drag the time slider from 0930 to 1200
4. **Expected**: Tracks update visually — marker position changes on map
5. **Before fix**: No visual change when dragging slider

### Bug 2: Location Marker (Full Mode)

1. With Exercise Alpha loaded, ensure display mode is "Full"
2. Set the time slider to approximately 1100
3. **Expected**: Red circle markers appear on each track at the 1100 position
4. **Before fix**: No markers visible

### Bug 3: Trail Mode

1. With Exercise Alpha loaded, switch display mode to "Trail"
2. Set the time slider to approximately 1200
3. **Expected**: Only the track segment from 0930 to 1200 is visible
4. Drag the slider forward to 1300
5. **Expected**: Track segment extends to include 1200-1300
6. **Before fix**: Empty map in Trail mode

### Bug 4: Tool Offering

1. With Exercise Alpha loaded and `debrief_calc` available
2. Click on a single track on the map
3. **Expected**: Single-track tools appear in the activity panel (e.g., track stats)
4. Select two tracks
5. **Expected**: Multi-track tools appear (e.g., range/bearing)
6. **Before fix**: No tools offered for any selection

## Running Tests

```bash
# Shared components tests (temporal-utils)
cd shared/components && npx vitest run --reporter=verbose

# VS Code extension tests
cd apps/vscode && npx vitest run --reporter=verbose
```

## Key Files Changed

| File | Change |
|------|--------|
| `apps/vscode/src/webview/web/mapView.tsx` | Convert `Track.times` from ISO strings to epoch ms in `trackToFeature()` |
| `apps/vscode/src/commands/openPlot.ts` | Re-register selection callback for reused panels |
