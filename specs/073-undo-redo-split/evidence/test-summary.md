# Test Summary: 073 — Split Undo/Redo

**Date**: 2026-02-09
**Runner**: vitest ^1.0.0
**Package**: @debrief/session-state

## Results

| Suite | Tests | Passed | Failed | Skipped |
|-------|-------|--------|--------|---------|
| undo.test.ts | 17 | 17 | 0 | 0 |
| dirty.test.ts | 17 | 17 | 0 | 0 |
| persistence.test.ts | 16 | 16 | 0 | 0 |
| slices/*.test.ts | 103 | 103 | 0 | 0 |
| Other unit tests | 160 | 160 | 0 | 0 |
| **Total** | **313** | **313** | **0** | **0** |

## Key Test Scenarios Verified

### New Tests (073-undo-redo-split)

1. **Snapshot field boundary** — Undo does not revert `featureCollectionUri` or `savePath`
2. **UI-state field tracking** — Only 10 UI fields are tracked in undo snapshots
3. **featureCollectionUri exclusion** — Changing only `featureCollectionUri` does NOT create undo history
4. **savePath exclusion** — `savePath` is not restored during undo

### Existing Regression Tests (all pass unchanged)

- Basic undo/redo (single change, multiple changes)
- canUndo/canRedo state tracking
- clearHistory
- 50-step history limit
- Ephemeral field exclusion (playbackState)
- Cross-slice undo (playbackRate + rotation + selection)

## Test Command

```bash
pnpm --filter @debrief/session-state test:unit
```

## Output

```
Test Files  17 passed (17)
     Tests  313 passed (313)
  Duration  5.77s
```
