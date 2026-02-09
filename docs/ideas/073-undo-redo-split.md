# [E02] Split undo/redo: UI-only undo, data changes via Log (SRD P3)

## Epic
Part of **E02: PROV Logging Implementation** — Phase 3

## Problem
The current undo middleware tracks both UI state (viewport, time, visibility) and data-change state (`featureCollectionUri`) in the same 50-step history. The SRD requires separating UI undo/redo from data-change history, which is now handled by the Log.

## Proposed Solution
1. Remove `featureCollectionUri` from `StateSnapshot` in `services/session-state/src/store/index.ts`
2. Remove `savePath` from `StateSnapshot` (metadata, not undoable)
3. Update snapshot creation/restoration logic
4. Update undo/redo tests to verify narrower snapshot
5. Document the boundary: UI undo = Ctrl+Z, data changes = Log Panel

## Success Criteria
- Undo/redo only affects UI state (viewport, time, visibility, selection)
- Tool execution results are not undoable via Ctrl+Z (they go through the Log)
- All existing undo tests pass with updated snapshot

## Dependencies
- #071 (Log Recording service — must be recording data changes before removing them from undo)

## Complexity
Low

## Reference
- [Transition Plan: Phase 3](docs/architecture/prov-transition-plan.md#phase-3-undoredo-split-srd-p3)
- [SRD Section 5](docs/srd-prov-undo.md)
