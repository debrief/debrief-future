# Before/After: StateSnapshot (073-undo-redo-split)

## Before (12 fields)

```typescript
interface StateSnapshot {
  currentTime: SessionStore['currentTime'];       // ✓ UI
  timeRange: SessionStore['timeRange'];           // ✓ UI
  timeFilter: SessionStore['timeFilter'];         // ✓ UI
  stepSize: SessionStore['stepSize'];             // ✓ UI
  playbackRate: SessionStore['playbackRate'];     // ✓ UI
  displayMode: SessionStore['displayMode'];       // ✓ UI
  viewport: SessionStore['viewport'];             // ✓ UI
  rotation: SessionStore['rotation'];             // ✓ UI
  featureCollectionUri: SessionStore['featureCollectionUri']; // ✗ DATA
  selection: SessionStore['selection'];           // ✓ UI
  hiddenFeatureIds: SessionStore['hiddenFeatureIds'];       // ✓ UI
  savePath: SessionStore['savePath'];             // ✗ METADATA
}
```

## After (10 fields)

```typescript
interface StateSnapshot {
  currentTime: SessionStore['currentTime'];
  timeRange: SessionStore['timeRange'];
  timeFilter: SessionStore['timeFilter'];
  stepSize: SessionStore['stepSize'];
  playbackRate: SessionStore['playbackRate'];
  displayMode: SessionStore['displayMode'];
  viewport: SessionStore['viewport'];
  rotation: SessionStore['rotation'];
  selection: SessionStore['selection'];
  hiddenFeatureIds: SessionStore['hiddenFeatureIds'];
}
```

## Changes Summary

| Aspect | Before | After |
|--------|--------|-------|
| StateSnapshot fields | 12 | 10 |
| DIRTY_TRIGGER_FIELDS | 11 | 10 |
| Exported type | `Omit<SessionState, 'document'> & { document: Pick<DocumentSlice, 'savePath'> }` | `Omit<SessionState, 'document'>` |
| featureCollectionUri dirty tracking | DIRTY_TRIGGER_FIELDS | Log Service markDirty() |
| History gating | `isEphemeralField()` exclusion | `UNDO_TRACKED_FIELDS` inclusion |
| Files modified | — | 4 |
| Lines changed | — | ~30 |
| New tests | — | 4 (in 3 describe blocks) |
| Existing test changes | — | 0 (all 310 pass unchanged) |
