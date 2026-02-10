# Usage Example: 077 Fix VS Code Extension Bugs

**Date**: 2026-02-10

## What Changed

### Fix 1: ISO String to Epoch Conversion (Bugs 1-3)

**File**: `apps/vscode/src/webview/web/mapView.tsx`

**Before** (broken):
```typescript
function trackToFeature(track: Track, customColor?: string): DebriefFeature {
  return {
    type: 'Feature',
    id: track.id,
    geometry: track.geometry,
    properties: {
      kind: 'TRACK',
      platform_name: track.name,
      platform_type: track.platformType,
      start_time: track.startTime,
      end_time: track.endTime,
      times: track.times,  // ← ISO strings like "2024-01-15T10:00:00Z"
      style: { color: customColor ?? track.color },
    },
  };
}
```

**After** (fixed):
```typescript
      times: track.times.map(t => new Date(t).getTime()),  // ← epoch ms like 1705312800000
```

**Why this broke**: `Track.times` is `string[]` (ISO 8601 from STAC/GeoJSON). The shared `temporal-utils.ts` expects `number[]` (epoch ms) for binary search. JavaScript silently coerces strings in numeric comparisons with unpredictable results.

### Fix 2: Selection Callback Registration (Bug 4)

**File**: `apps/vscode/src/commands/openPlot.ts`

**Before** (broken):
```typescript
if (!panel) {
  panel = MapPanel.createOrShow(context.extensionUri, plot.title);
  setMapPanel(panel);
  panel.setSessionManager(sessionManager);
  panel.onSelectionChanged((selection) => { ... });  // ← Only for new panels!
  panel.getPanel().onDidDispose(() => { ... });
}
// When panel exists, onSelectionChanged is never registered
```

**After** (fixed):
```typescript
if (!panel) {
  panel = MapPanel.createOrShow(context.extensionUri, plot.title);
  setMapPanel(panel);
  panel.setSessionManager(sessionManager);
  panel.getPanel().onDidDispose(() => { ... });
}
// Selection callback runs for BOTH new and reused panels
panel.onSelectionChanged((selection) => { ... });
```

### Fix 3: Defensive Type Check (Hardening)

**File**: `shared/components/src/MapView/temporal-utils.ts`

```typescript
// NEW: Added after existing array checks in extractTemporalData()
if (typeof times[0] !== 'number') {
  console.warn('[temporal-utils] extractTemporalData: times array contains non-numeric values — expected epoch ms');
  return null;
}
```

## Verification Steps

1. **Time Slider**: Load Exercise Alpha → drag slider → tracks update in real time
2. **Location Marker**: Set Full mode, time at 1100 → red markers on tracks
3. **Trail Mode**: Switch to Trail → only past track segments visible
4. **Tool Offering**: Select a track → analysis tools appear in activity panel
