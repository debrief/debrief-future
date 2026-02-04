# Research: Refactor VS Code Map to Thin Wrapper

**Feature**: 048-refactor-vscode-map-wrapper
**Date**: 2026-02-04

## Summary

This research investigates how to refactor the VS Code map webview from a thick vanilla TypeScript/Leaflet implementation to a thin wrapper around the shared `@debrief/components/MapView` React component.

## Existing Pattern Analysis

### TimeController: The Reference Implementation

The `apps/vscode/src/webview/web/timeController.tsx` demonstrates the desired thin wrapper pattern:

| Aspect | Implementation |
|--------|----------------|
| Lines of code | ~170 lines |
| Framework | React (createRoot from react-dom/client) |
| Shared component | `import { TimeController } from '@debrief/components'` |
| VS Code API | `acquireVsCodeApi()` for state/messages |
| Responsibilities | State persistence, message bridging, UI mounting |

**Key Pattern Elements**:
1. Import shared component from `@debrief/components`
2. Use React `useState` for local state from extension messages
3. Use `useEffect` for message listeners and state restoration
4. Define handler functions that call `vscode.postMessage()`
5. Render shared component with props derived from state + handlers

### Current Map Implementation

The current `apps/vscode/src/webview/web/map.ts` is a thick implementation:

| File | Lines | Purpose |
|------|-------|---------|
| map.ts | 744 | Main entry, VS Code integration, message handling |
| trackRenderer.ts | 488 | Track rendering with vanilla Leaflet |
| locationRenderer.ts | ~200 | Location marker rendering |
| selectionManager.ts | ~150 | Selection state management |
| resultRenderer.ts | ~200 | Calculation result rendering |
| timeFilter.ts | ~100 | Time-based filtering |
| temporalUtils.ts | ~80 | Temporal track utilities |
| **Total** | ~2000 | |

This duplicates functionality already available in `@debrief/components/MapView` (291 lines).

## Decisions

### Decision 1: React Entry Point Pattern

**Decision**: Create a new `mapView.tsx` following the TimeController pattern.

**Rationale**:
- Proven pattern already working in the codebase
- React is already bundled for VS Code webview (TimeController uses it)
- Shared component is React-based

**Alternatives Considered**:
- Keep vanilla TypeScript and create a React adapter → Rejected: adds complexity, two mental models
- Use Web Components to wrap React → Rejected: unnecessary abstraction layer

### Decision 2: Gradual Migration

**Decision**: Create the new wrapper alongside existing code, then switch over.

**Rationale**:
- Allows testing in isolation before cutover
- Can compare behavior side-by-side
- Reduces risk of breaking changes

**Alternatives Considered**:
- In-place refactor → Rejected: high risk, hard to test incrementally

### Decision 3: Feature Parity Gaps

**Decision**: Identify and address gaps in the shared MapView component before completing the wrapper.

**Analysis of Required Features**:

| Feature | MapView Status | Action Needed |
|---------|----------------|---------------|
| Track rendering | ✅ Supported | None |
| Location markers | ✅ Supported (as features) | None |
| Selection | ✅ Supported | None |
| Temporal rendering | ✅ Supported (currentTime prop) | None |
| Auto-fit bounds | ✅ Supported | None |
| Drag-and-drop | ❌ VS Code-specific | Keep in wrapper |
| State persistence | ❌ VS Code-specific | Keep in wrapper |
| Keyboard shortcuts (undo/redo) | ❌ VS Code-specific | Keep in wrapper |
| Toolbar actions | ⚠️ Via callbacks | Add callbacks to MapView |
| Result layers | ⚠️ Needs verification | Verify rendering |
| Track colors | ⚠️ Via feature properties | May need styling props |

### Decision 4: Message Protocol Preservation

**Decision**: Preserve the existing extension-to-webview message protocol.

**Rationale**:
- Minimizes changes to VS Code extension backend
- Existing messages map cleanly to component props

**Message → Prop Mapping**:
```
loadPlot          → features, timeExtent
updateTracks      → features (update)
setSelection      → selectedIds
clearSelection    → selectedIds (empty)
addResultLayer    → features (append)
setTimeRange      → currentTime (range-aware)
setCurrentTime    → currentTime
setDisplayMode    → displayMode
fitBounds         → callback prop
setViewport       → initialCenter, initialZoom
```

### Decision 5: Rendering Approach for Result Layers

**Decision**: Treat result layers as additional features in the GeoJSON data.

**Rationale**:
- MapView already renders arbitrary GeoJSON
- Calculation results are GeoJSON features
- No special handling needed—just merge into features array

## Technical Implementation

### Proposed Wrapper Structure

```typescript
// apps/vscode/src/webview/web/mapView.tsx (~200 lines target)

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { MapView } from '@debrief/components';

// VS Code API
const vscode = acquireVsCodeApi();

function MapViewApp() {
  // State from extension messages
  const [features, setFeatures] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [currentTime, setCurrentTime] = useState(undefined);
  const [displayMode, setDisplayMode] = useState('full');

  // VS Code state persistence
  const [initialCenter, setInitialCenter] = useState(undefined);
  const [initialZoom, setInitialZoom] = useState(undefined);

  // Message handler
  useEffect(() => {
    const handler = (event) => {
      // Transform messages to state updates
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Callback handlers → postMessage
  const handleSelect = useCallback((id) => {
    vscode.postMessage({ type: 'selectionChanged', ... });
  }, []);

  return (
    <MapView
      features={features}
      selectedIds={selectedIds}
      currentTime={currentTime}
      displayMode={displayMode}
      onSelect={handleSelect}
      // ... other callbacks
    />
  );
}
```

### Files to Create

1. `apps/vscode/src/webview/web/mapView.tsx` - New thin wrapper
2. `apps/vscode/src/webview/web/mapView.html` - HTML entry point

### Files to Deprecate (After Cutover)

1. `apps/vscode/src/webview/web/map.ts`
2. `apps/vscode/src/webview/web/trackRenderer.ts`
3. `apps/vscode/src/webview/web/locationRenderer.ts`
4. `apps/vscode/src/webview/web/selectionManager.ts`
5. `apps/vscode/src/webview/web/resultRenderer.ts`
6. `apps/vscode/src/webview/web/timeFilter.ts`

### Required MapView Enhancements

Before the wrapper can achieve full parity:

1. **Toolbar callbacks**: Add `onZoomIn`, `onZoomOut`, `onFitBounds` callback props
2. **Export support**: Add `onRequestExport` callback or ref-based method
3. **Result layer styling**: Ensure calculation result features render with correct styles

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Feature parity gaps | Medium | High | Verify all features before cutover |
| Performance regression | Low | Medium | Profile render times, use memoization |
| Style differences | Medium | Low | Compare screenshots, adjust CSS |
| Message protocol mismatch | Low | High | Comprehensive E2E testing |

## Testing Strategy

1. **Unit tests**: Already exist for MapView in shared/components
2. **Integration tests**: Add tests for wrapper message handling
3. **Visual regression**: Compare screenshots before/after
4. **Manual checklist**: Verify each VS Code feature works

## References

- TimeController wrapper: `apps/vscode/src/webview/web/timeController.tsx`
- Shared MapView: `shared/components/src/MapView/MapView.tsx`
- MapView tests: `shared/components/src/MapView/MapView.test.tsx`
- MapView stories: `shared/components/src/MapView/MapView.stories.tsx`
