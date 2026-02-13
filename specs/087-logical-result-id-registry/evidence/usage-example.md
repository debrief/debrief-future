# Usage Example: Result ID Registry

**Feature**: 087-logical-result-id-registry

## Creating the Registry

```typescript
import { createResultIdRegistry } from '@debrief/session-state';

const registry = createResultIdRegistry();
```

## Hydrating from STAC Assets (Plot Load)

When a plot is opened, the registry is populated from existing STAC item assets:

```typescript
// STAC item assets with debrief:resultId metadata
const assets = {
  'bt_plot_001_v1': {
    href: './results/bt_plot_001_v1.png',
    type: 'image/png',
    roles: ['result'],
    'debrief:resultId': 'bt_plot_001',
    'debrief:version': 1,
  },
  'bt_plot_001_v2': {
    href: './results/bt_plot_001_v2.png',
    type: 'image/png',
    roles: ['result'],
    'debrief:resultId': 'bt_plot_001',
    'debrief:version': 2,
  },
  'range_plot_001_v1': {
    href: './results/range_plot_001_v1.json',
    type: 'application/json',
    roles: ['result'],
    'debrief:resultId': 'range_plot_001',
    'debrief:version': 1,
  },
};

registry.hydrateFromAssets(assets);

// Registry now contains 2 mappings (highest version per result ID)
console.log(registry.size); // 2

const btPlot = registry.resolve('bt_plot_001');
// { resultId: 'bt_plot_001', currentPath: './results/bt_plot_001_v2.png', version: 2, mimeType: 'image/png' }

const rangePlot = registry.resolve('range_plot_001');
// { resultId: 'range_plot_001', currentPath: './results/range_plot_001_v1.json', version: 1, mimeType: 'application/json' }
```

## Registering from Tool Execution (Live Update)

After a tool runs, the registry is updated from the log service's RecordResult:

```typescript
// After logService.recordToolResult() returns:
const recordResult = await logService.recordToolResult(storePath, itemPath, toolResult);

// Update registry from recorded entries
registry.registerFromRecordResult(recordResult);

// The mapping is now updated with the new version
const updated = registry.resolve('bt_plot_001');
// { resultId: 'bt_plot_001', currentPath: './results/bt_plot_001_v3.png', version: null, mimeType: null }
```

## Subscribing to Changes

Views can subscribe to specific result IDs or all changes:

```typescript
// Subscribe to a specific result ID
const unsubscribe = registry.subscribe('bt_plot_001', (event) => {
  console.log(`Result updated: ${event.resultId}`);
  console.log(`  Old path: ${event.previousPath}`);
  console.log(`  New path: ${event.newPath}`);
  // Auto-refresh the view with the new artifact
});

// Subscribe to ALL changes (e.g., for an activity panel)
const unsubAll = registry.subscribeAll((event) => {
  console.log(`Any result changed: ${event.resultId} → ${event.newPath}`);
});

// When done, unsubscribe
unsubscribe();
unsubAll();
```

## Registering from Replay (Tune/Revert)

After a replay operation, the registry is updated from artifact versions:

```typescript
const replayResult = await logService.tuneEntry(storePath, itemPath, activityId, param, newValue);

// Update registry from replay artifacts
registry.registerFromReplayResult(replayResult.artifactsCreated);
```

## Lifecycle (Plot Close)

When the plot is closed, the registry is cleared:

```typescript
registry.clear();
// All mappings removed, all subscriptions cancelled
console.log(registry.size); // 0
```

## VS Code Extension Integration Points

1. **`extension.ts`**: Creates `createResultIdRegistry()` instance, passes to commands and log panel
2. **`openPlot.ts`**: Calls `registry.clear()` then `registry.hydrateFromAssets()` on plot load
3. **`executeTool.ts`**: Calls `registry.registerFromRecordResult()` after tool execution
4. **`logPanelView.ts`**: Calls `registry.registerFromReplayResult()` after tune/revert/restore
