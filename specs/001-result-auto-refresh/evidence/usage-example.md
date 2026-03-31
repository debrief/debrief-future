# Usage Example: Auto-Refresh Controller + Hook Integration

**Feature**: Result View Auto-Refresh (#089)

## 1. Extension Host — Create Controller

In the VS Code extension activation, create the controller and pass it into the webview context:

```typescript
// apps/vscode/src/extension.ts
import { createResultIdRegistry } from '@debrief/session-state';
import { createAutoRefreshController } from '@debrief/session-state';

export function activate(context: vscode.ExtensionContext) {
  const registry = createResultIdRegistry();

  const autoRefreshController = createAutoRefreshController({
    registry,
    debounceMs: 300, // default: 300ms trailing-edge debounce
  });

  // Dispose when extension deactivates
  context.subscriptions.push({
    dispose: () => autoRefreshController.dispose(),
  });

  // Pass controller to webview panels via PanelContext
  // (see ChartPanelWrapper integration below)
}
```

## 2. React Panel — Consume with useAutoRefresh Hook

```tsx
// shared/components/src/panels/ChartPanelWrapper.tsx
import { useRef, useCallback } from 'react';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import type { ChartRendererHandle } from '../ChartRenderer';

function ChartTab({
  tabId,
  resultId,
  controller,
}: {
  tabId: string;
  resultId: string;
  controller: AutoRefreshControllerLike;
}) {
  const chartRef = useRef<ChartRendererHandle>(null);

  // Called when the controller detects new data for this result ID
  const onRefresh = useCallback(
    (newPath: string, viewportState: ViewportState | null) => {
      // 1. Load new data from newPath
      // 2. Re-render chart
      // 3. Restore viewport if captured
      if (viewportState && chartRef.current) {
        chartRef.current.restoreViewport(viewportState.signals);
      }
    },
    []
  );

  const { state, toggle, hasPendingUpdate } = useAutoRefresh(
    controller,
    resultId,
    tabId,
    onRefresh
  );

  return (
    <div>
      {/* Tab header with auto-refresh controls */}
      <div className="tab-header">
        <button onClick={toggle} title={state.paused ? 'Resume' : 'Pause'}>
          {state.paused ? '⟳' : '⏸'}
        </button>
        {hasPendingUpdate && <span className="pending-badge" />}
      </div>

      {/* Chart with imperative handle for viewport capture/restore */}
      <ChartRenderer ref={chartRef} spec={chartSpec} />
    </div>
  );
}
```

## 3. Hook Lifecycle

```
Mount
  └─ useAutoRefresh registers viewId with controller
       └─ controller.register(viewId, resultId, onRefresh)
       └─ controller.onStateChange(viewId, setState)

Registry emits change event for resultId
  └─ controller debounces (300ms)
       └─ controller invokes onRefresh(event, viewportState)
            └─ component reloads data + restores viewport

User clicks pause toggle
  └─ hook.toggle() → controller.pause(viewId)
       └─ state.paused = true, status = 'paused'
       └─ subsequent events captured as pendingEvent

User clicks resume
  └─ hook.toggle() → controller.resume(viewId)
       └─ pending event flushed → onRefresh called
       └─ state.paused = false, status = 'active'

Unmount
  └─ useAutoRefresh cleanup
       └─ unsubscribe state listener
       └─ controller.unregister(viewId)
```

## 4. Multiple Views

```typescript
// Two views watching different result IDs — independent refresh
controller.register('view-A', 'result-1', onRefreshA);
controller.register('view-B', 'result-2', onRefreshB);

// Change to result-1 → only view-A refreshes
// Change to result-2 → only view-B refreshes

// Two views watching the same result ID — both refresh
controller.register('view-C', 'result-1', onRefreshC);
controller.register('view-D', 'result-1', onRefreshD);

// Change to result-1 → both view-C and view-D refresh independently
```

## 5. Visibility-Deferred Refresh

```typescript
// Tab goes to background
controller.setVisible('view-A', false);

// Change event arrives → marked stale, stored as pending
// No onRefresh called yet

// Tab returns to foreground
controller.setVisible('view-A', true);
// Stale + pending → immediate flush → onRefresh called
```
