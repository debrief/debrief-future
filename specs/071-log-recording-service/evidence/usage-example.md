# Usage Example: Log Recording Service (#071)

**Date**: 2026-02-09

## Creating and Using the Log Service

The Log Service is created via dependency injection — no direct imports of stacService or store needed.

```typescript
import { createLogService } from '@debrief/session-state';

// Wire up dependencies (done once during app initialization)
const logService = createLogService({
  appendProvenance: stacService.appendProvenance.bind(stacService),
  loadGeoJson: stacService.loadGeoJsonForItem.bind(stacService),
  markDirty: () => store.getState().markDirty(),
});
```

## Recording a Tool Execution

After a tool runs successfully, pass the result through the Log Service:

```typescript
const result = await logService.recordToolResult(
  {
    success: true,
    toolId: 'calculate-range',
    durationMs: 342,
    sourceFeatureIds: ['track-alpha', 'track-bravo'],
    features: toolResult.features, // output features from Python
  },
  {
    toolVersion: '1.2.0',
    parameters: {
      units: { value: 'nautical_miles', default: true, tunable: true },
    },
  },
  storePath,
  itemPath
);

// result:
// {
//   activityId: "a1b2c3d4-...",
//   featuresUpdated: 2,
//   entries: [{ ... }]
// }
```

## The Generated Log Entry

Each entry follows the PROV vocabulary:

```json
{
  "activityId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "timestamp": "2026-02-09T14:23:45.123Z",
  "wasGeneratedBy": {
    "tool": "calculate-range",
    "toolVersion": "1.2.0",
    "parameters": {
      "units": {
        "value": "nautical_miles",
        "default": true,
        "tunable": true
      }
    }
  },
  "used": ["track-alpha", "track-bravo"],
  "generated": [],
  "executionDuration": "PT0.342S",
  "tune": null
}
```

## Assembling a Timeline

Read all provenance entries from all features, deduplicated and sorted:

```typescript
const timeline = await logService.getTimeline(storePath, itemPath);

// Returns LogEntry[] sorted ascending by timestamp.
// Entries shared across features (same activityId) appear once.
// Example: 3 tool executions across 5 features → 3 timeline entries.
```

## Integration with executeTool

The Log Service is wired into `executeTool.ts` transparently:

```typescript
// In createExecuteToolCommand() — analyst sees no change
const command = createExecuteToolCommand(calcService, stacService, store, logService);

// After tool execution succeeds and results are saved to STAC:
// 1. logService.recordToolResult() creates provenance entries
// 2. Input features get entries appended via stacService.appendProvenance()
// 3. markDirty() triggers the save indicator
// 4. Analyst workflow is unchanged — provenance recording is automatic
```

## Key Behaviours

- **Failed tools**: No Log entry created (FR-009)
- **ActivityId reuse**: If Python already set an activityId on output features, the TS Log Service reuses it
- **Append-only**: Provenance arrays are never modified, only appended to
- **Legacy support**: Single-object provenance values are normalised to arrays
- **Dirty tracking**: `markDirty()` called after successful writes
