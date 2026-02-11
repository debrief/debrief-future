# Quickstart: Replay and Parameter Tuning

**Feature**: 076-replay-tune | **Date**: 2026-02-11

## Prerequisites

- Feature #071 (Log Recording Service) — complete
- Feature #074 (Snapshots) — complete
- Feature #072 (Log Panel) — at least basic timeline display

## Development Setup

```bash
# From repo root
cd services/session-state
pnpm install
pnpm test   # Verify existing tests pass

cd ../../shared/components
pnpm install
pnpm storybook  # Preview existing LogPanel stories
```

## Implementation Order

### Phase A: Replay Engine (session-state)

1. **Add new types** to `services/session-state/src/log/types.ts`:
   - `ReplayPlan`, `ReplayEntry`, `TuneTarget`, `ReplayResult`
   - `ReplayProgress`, `ReplayHaltReason`, `ArtifactVersion`
   - Add `deleted?: boolean` to `LogEntry`
   - Export from `index.ts`

2. **Create `replayEngine.ts`** in `services/session-state/src/log/`:
   - `createReplayEngine(deps: ReplayEngineDeps): ReplayEngine`
   - `buildPlan()` — analyse timeline, create ordered entry list
   - `execute()` — sequential tool re-invocation with version checks

3. **Write tests first** in `services/session-state/tests/log/`:
   - `replayEngine.test.ts` — plan building, version checking, cancellation
   - Use mock `ToolExecutor` that returns predetermined results

### Phase B: Log Service Methods (session-state)

4. **Implement `tuneEntry()`** in `logService.ts`:
   - Validate parameter, build plan, execute replay
   - Append `TuneAnnotation` to target entry

5. **Implement `revertTo()`** in `logService.ts`:
   - Find the entry in timeline
   - Remove all entries after it from feature provenance arrays
   - Requires confirmation from caller (UI handles the prompt)

6. **Implement `revertThis()`** in `logService.ts`:
   - Set `deleted: true` on target entry
   - Build replay plan excluding deleted entry
   - Execute replay; halt on dependency failures

7. **Implement `restoreEntry()`** in `logService.ts`:
   - Remove `deleted` flag
   - Build replay plan including restored entry
   - Execute replay

8. **Extend `assembleTimeline()`** in `timeline.ts`:
   - Add `includeDeleted` option
   - Filter out `deleted: true` entries by default

### Phase C: Parameter Editor Component (shared-components)

9. **Create `ParameterEditor.tsx`** in `shared/components/src/LogPanel/`:
   - Type-specific rendering: numeric input, duration picker, enum dropdown, boolean toggle, text input
   - Inline validation against type constraints
   - `onCommit` / `onCancel` callbacks

10. **Create `ReplayProgress.tsx`** in `shared/components/src/LogPanel/`:
    - Progress bar with current/total count
    - Current tool name display
    - Cancel button

11. **Create Storybook stories**:
    - `ParameterEditor.stories.tsx` — each parameter type, validation states
    - Update `LogPanel.stories.tsx` — add tuning and revert scenarios

### Phase D: VS Code Integration

12. **Extend `logPanelView.ts`**:
    - Handle `tune:request`, `revert-to:request`, `revert-this:request`, `restore:request`, `replay:cancel` messages
    - Wire to LogService methods
    - Forward `replay:progress` and `replay:result` to webview

13. **Wire Replay Engine dependencies**:
    - Inject `calcService.executeTool` as `ToolExecutor`
    - Inject `stacService.loadSnapshotGeoJson` as `SnapshotLoader`
    - Inject `calcService.listTools` version resolution as `ToolVersionResolver`

14. **Update LogPanel webview** (`logPanel.tsx`):
    - Render ParameterEditor when a tunable parameter is clicked
    - Show confirmation dialog for "Revert to here"
    - Show ReplayProgress during replay
    - Display ReplayResult (success, halt reason)

15. **Update LogActionBar** to wire buttons:
    - Tune → open parameter editor for selected entry
    - Revert to here → confirmation dialog → `revert-to:request`
    - Revert this → `revert-this:request`

### Phase E: Cross-Snapshot Replay

16. **Extend Replay Engine** for cross-snapshot cases:
    - Load snapshot GeoJSON as initial state
    - Replay entries from snapshot through current segment
    - Handle snapshot boundary traversal

17. **Add integration tests** for cross-snapshot replay:
    - Create snapshot, record more operations, tune entry from pre-snapshot
    - Verify state is correctly reconstructed

## Quick Verification

After each phase, verify:

```bash
# Phase A: Replay Engine tests pass
cd services/session-state && pnpm test -- --grep "replayEngine"

# Phase B: Log Service tests pass
cd services/session-state && pnpm test -- --grep "tuneEntry|revertTo|revertThis"

# Phase C: Storybook renders correctly
cd shared/components && pnpm storybook
# Navigate to LogPanel > ParameterEditor stories

# Phase D: Manual VS Code test
# 1. Open a plot, run a few tools
# 2. Open Log Panel
# 3. Click a parameter value → editor appears
# 4. Change value → replay runs → plot updates

# Phase E: Cross-snapshot test
# 1. Run tools, create snapshot, run more tools
# 2. Load earlier history
# 3. Tune a parameter from before the snapshot
# 4. Verify replay crosses snapshot boundary
```

## Key Files to Read First

| File | Why |
|------|-----|
| `services/session-state/src/log/types.ts` | Existing types you'll extend |
| `services/session-state/src/log/logService.ts` | Stubs you'll implement |
| `services/session-state/src/log/timeline.ts` | Timeline assembly to extend |
| `services/session-state/src/log/snapshotService.ts` | Snapshot loading for cross-snapshot replay |
| `shared/components/src/LogPanel/LogEntry.tsx` | Component to add editing affordances |
| `shared/components/src/LogPanel/LogActionBar.tsx` | Action buttons to wire |
| `apps/vscode/src/views/logPanelView.ts` | VS Code integration point |
| `apps/vscode/src/services/calcService.ts` | Tool execution you'll call during replay |
