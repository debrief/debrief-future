# Quickstart: Logical Result ID Registry

**Feature**: 087-logical-result-id-registry
**Date**: 2026-02-13

## What This Feature Does

The Result ID Registry is an in-memory lookup service that maps stable logical result IDs (like `bt_plot_001`) to their current versioned file paths (like `./results/bt_plot_001_v2.png`). It emits change events when mappings update, enabling downstream features like auto-refresh (#089) to react to result updates without polling.

## Where It Lives

```
services/session-state/src/
├── log/
│   ├── logService.ts          # Existing — produces RecordResult
│   ├── types.ts               # Existing — LogEntry, RecordResult, ArtifactVersion
│   └── ...
└── registry/
    ├── resultIdRegistry.ts    # NEW — registry implementation
    ├── types.ts               # NEW — ResultIdMapping, ResultIdChangeEvent
    └── index.ts               # NEW — public exports
```

Exported from `@debrief/session-state` alongside the Log Service.

## Integration Points

### 1. After tool execution (executeTool command handler)

```typescript
// Existing flow:
const recordResult = await logService.recordToolResult(
  toolResult, expandedFields, storePath, itemPath
);

// NEW: Update the registry from the recorded entries
resultIdRegistry.registerFromRecordResult(recordResult);
```

### 2. After replay/tune (executeTool command handler)

```typescript
// Existing flow:
const replayResult = await logService.tuneEntry(
  storePath, itemPath, activityId, parameter, newValue
);

// NEW: Update the registry from artifact versions produced during replay
resultIdRegistry.registerFromReplayResult(replayResult.artifactsCreated);
```

### 3. On plot load (openPlot command handler)

```typescript
// Existing flow:
const item = await stacService.loadItem(itemPath);

// NEW: Hydrate registry from STAC asset metadata
resultIdRegistry.hydrateFromAssets(item.assets);
```

### 4. On plot close

```typescript
// NEW: Clear registry when plot is closed/replaced
resultIdRegistry.clear();
```

### 5. Consumer subscription (future #089 auto-refresh)

```typescript
// Subscribe to a specific result ID
const unsubscribe = resultIdRegistry.subscribe('bt_plot_001', (event) => {
  console.log(`Result updated: ${event.previousPath} → ${event.newPath}`);
  // Refresh the view with the new file
});

// Later, when the view closes:
unsubscribe();
```

## Key Design Decisions

1. **Pure in-memory** — No file I/O, no persistence. Reconstructed from STAC assets on plot load.
2. **No LogService modification** — The registry observes RecordResult output, not internal Log state.
3. **Synchronous operations** — All registry methods are sync (no async). The JavaScript event loop guarantees ordering.
4. **No change events during hydration** — `hydrateFromAssets()` is bulk initialization, not incremental update.
5. **Factory with no deps** — `createResultIdRegistry()` takes no parameters (unlike LogService which needs file I/O deps).

## Testing Strategy

### Unit tests (registry module)

- Register a result from a LogEntry with `generatedResultId` → verify mapping exists
- Register from a LogEntry without `generatedResultId` → verify no mapping created
- Update a mapping (same result ID, new path) → verify change event emitted
- Subscribe to specific ID → verify only that ID triggers callback
- Subscribe to all → verify any ID triggers callback
- Unsubscribe → verify no further callbacks
- Hydrate from STAC assets with multiple versions → verify highest version selected
- Clear → verify all mappings and subscriptions removed

### Integration tests (with Log Service)

- Execute tool → record result → verify registry mapping
- Execute same tool twice → verify registry updated with new path
- Load plot with existing STAC assets → verify registry hydrated
- Close plot → verify registry cleared
