# Quickstart: Result View Auto-Refresh

**Feature**: 089 (001-result-auto-refresh) | **Date**: 2026-02-17

## What This Feature Does

When an analyst has a result chart open and re-runs the tool that produced it, the chart automatically updates with the new data — without needing to close and re-open the view. Zoom and pan state are preserved across refreshes.

## Architecture Overview

```
ResultIdRegistry (#087)
  │
  │  ResultIdChangeEvent
  ▼
AutoRefreshController (new — services/session-state/src/refresh/)
  │
  │  debounce (300ms), per-view stale/pause tracking
  │
  ├──► ChartPanelWrapper (shared/components — via useAutoRefresh hook)
  │      │
  │      │  captureViewport() → reload data → transformDataset() → restoreViewport()
  │      ▼
  │    ChartRenderer (#085) — extended with viewport capture/restore
  │
  └──► Custom Editor Tab (future #088 — same hook, same flow)
```

## Key Files

| Location | Purpose |
|----------|---------|
| `services/session-state/src/refresh/controller.ts` | AutoRefreshController — core coordination logic |
| `services/session-state/src/refresh/types.ts` | Type definitions for auto-refresh state |
| `shared/components/src/hooks/useAutoRefresh.ts` | React hook for consuming auto-refresh in views |
| `shared/components/src/ChartRenderer/ChartRenderer.tsx` | Extended with `ChartRendererHandle` for viewport ops |
| `shared/components/src/panels/ChartPanelWrapper.tsx` | Updated to use `useAutoRefresh` hook |
| `apps/vscode/src/extension.ts` | Wiring: creates controller, passes to views |

## Development Workflow

### 1. Run the session-state service tests

```bash
cd services/session-state
pnpm test
```

### 2. Run the shared components tests

```bash
cd shared/components
pnpm test
```

### 3. Storybook (visual testing)

```bash
cd shared/components
pnpm storybook
```

Navigate to **ChartRenderer** stories to test auto-refresh behaviour.

### 4. VS Code Extension (integration testing)

```bash
cd apps/vscode
npm run compile && code --extensionDevelopmentPath=.
```

1. Open a plot with result artifacts
2. Run a tool that produces results
3. Verify the chart auto-refreshes
4. Zoom into the chart, re-run the tool, verify viewport is preserved

## Integration Points

### Consuming the Controller (Service Layer)

```typescript
import { createAutoRefreshController } from '@debrief/session-state/refresh';
import { createResultIdRegistry } from '@debrief/session-state/registry';

const registry = createResultIdRegistry();
const controller = createAutoRefreshController({ registry, debounceMs: 300 });

// Register a view
const unregister = controller.register('view-1', 'histogram-zone-counts', (event, viewport) => {
  // Load new data from event.newPath
  // Transform with transformDataset()
  // Re-render chart, restore viewport
});

// Cleanup
unregister();
controller.dispose();
```

### Consuming in React (Component Layer)

```typescript
import { useAutoRefresh } from '@debrief/components/hooks/useAutoRefresh';

function ResultView({ resultId, viewId }) {
  const { state, pause, resume, toggle, hasPendingUpdate } = useAutoRefresh(
    resultId,
    viewId,
    (newPath, viewportState) => {
      // Re-fetch data, transform, re-render with viewport restoration
    }
  );

  return (
    <div>
      <button onClick={toggle}>
        {state.paused ? 'Resume' : 'Pause'} Auto-Refresh
      </button>
      {hasPendingUpdate && <span>Update available</span>}
      <ChartRenderer ref={chartRef} spec={spec} />
    </div>
  );
}
```

## Dependencies

- **#085 Chart Renderer** — Existing. Needs viewport API extension.
- **#086/#095 Results Bottom Panel** — Existing. Needs `useAutoRefresh` integration.
- **#087 Result ID Registry** — Existing. Used as-is.
- **#088 Custom Editor Provider** — Not yet implemented. Editor tab auto-refresh deferred.
