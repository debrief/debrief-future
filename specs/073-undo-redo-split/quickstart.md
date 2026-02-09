# Quickstart: 073 — Split Undo/Redo

## What This Feature Does

Narrows the undo/redo system to only track UI display state. Data changes (tool execution, plot loading) are no longer undoable via Ctrl+Z — they are instead tracked by the Log Recording Service (#071).

## Files to Modify

| File | Change |
|------|--------|
| `services/session-state/src/store/index.ts` | Remove `featureCollectionUri` and `savePath` from `StateSnapshot` interface, `createSnapshot()`, and `applySnapshot()` |
| `services/session-state/src/types/index.ts` | Simplify exported `StateSnapshot` type to remove document/savePath pick |
| `services/session-state/src/store/middleware/dirty.ts` | Remove `featureCollectionUri` from `DIRTY_TRIGGER_FIELDS` |
| `services/session-state/tests/unit/undo.test.ts` | Add test asserting snapshot contains exactly 10 fields |

## Prerequisites

- Feature #071 (Log Recording Service) must be merged — it provides `markDirty()` for data-change dirty tracking
- Feature #070 (PROV Schema Foundation) must be merged (transitive dependency via #071)

## How to Verify

```bash
# Run the undo/redo test suite
cd services/session-state
pnpm test:unit -- undo

# Run all session-state tests (ensure no regressions)
pnpm test
```

## Key Decisions

1. **10 UI fields kept**: currentTime, timeRange, timeFilter, stepSize, playbackRate, displayMode, viewport, rotation, selection, hiddenFeatureIds
2. **2 fields removed**: `featureCollectionUri` (data reference → Log), `savePath` (metadata → not undoable)
3. **Dirty tracking migration**: `featureCollectionUri` removed from `DIRTY_TRIGGER_FIELDS`; Log Service `markDirty()` handles data-change dirty tracking
4. **No migration needed**: Undo history is in-memory only, cleared on session start
