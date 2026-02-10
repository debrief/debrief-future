# Research: Split Undo/Redo — UI-Only Undo, Data Changes via Log

**Feature**: 073-undo-redo-split
**Date**: 2026-02-09

## Research Questions

### R1: Which fields belong in UI undo vs Log-managed data changes?

**Decision**: Keep 10 UI-state fields; remove 2 non-UI fields (`featureCollectionUri`, `savePath`).

**Rationale**: The SRD (Section 5) and PROV transition plan (Phase 3) define a clear boundary:
- **UI state** (undoable via Ctrl+Z): viewport, rotation, temporal settings, selection, visibility
- **Data changes** (tracked by Log Service): feature collection loading, tool execution, property edits
- **Metadata** (neither undo nor Log): save path

The 10 retained fields are all display-only — they control how data is shown, not what data is loaded or modified.

**Alternatives considered**:
1. *Keep featureCollectionUri in undo* — Rejected because loading a different plot is a data operation (per SRD), not a display operation. The Log Service should track which data is loaded.
2. *Remove selection from undo* — Rejected because selection is a UI display state (which features are highlighted), not a data change.

---

### R2: Two StateSnapshot definitions — how do they relate?

**Decision**: Both definitions must be updated. The local flat interface in `store/index.ts` is the authoritative implementation; the exported type alias in `types/index.ts` is a public API type.

**Rationale**: Codebase analysis found two definitions:
- **Local** (`store/index.ts:26-39`): Flat interface with 12 explicit fields. Used by `createSnapshot()`, `applySnapshot()`, and `snapshotsEqual()`.
- **Exported** (`types/index.ts:77-79`): Computed type `Omit<SessionState, 'document'> & { document: Pick<DocumentSlice, 'savePath'> }`. Used by consumers of the package.

The exported type specifically includes `savePath` via the `document` pick. After removal, the exported type simplifies to `Omit<SessionState, 'document'>` (no document fields remain in snapshot).

**Alternatives considered**: Keeping the exported type as-is and only changing the local one — rejected because the public API should accurately reflect what the snapshot contains.

---

### R3: What happens to dirty tracking after featureCollectionUri is removed?

**Decision**: Remove `featureCollectionUri` from `DIRTY_TRIGGER_FIELDS`. The Log Service's `markDirty()` callback already handles dirty tracking for data changes.

**Rationale**: Currently, `DIRTY_TRIGGER_FIELDS` contains 11 fields including `featureCollectionUri`. When `featureCollectionUri` changes, it triggers dirty state. After this change:
- **UI-state dirty tracking**: Still handled by the remaining 10 fields in `DIRTY_TRIGGER_FIELDS` (which matches the 10 snapshot fields).
- **Data-change dirty tracking**: Handled by `logService.recordToolResult()` → `deps.markDirty()` (already implemented in #071).

The dirty flag will still be set when data changes occur — just via a different code path (Log Service callback vs field-level tracking).

**Alternatives considered**: Keeping `featureCollectionUri` in `DIRTY_TRIGGER_FIELDS` even after removing from snapshot — rejected because it creates an inconsistency (tracked for dirty but not for undo).

---

### R4: Are there any consumers that depend on featureCollectionUri or savePath being in the snapshot?

**Decision**: No external consumers depend on these fields being in the snapshot.

**Rationale**:
- The undo history is in-memory only (cleared on session close, never persisted or serialized).
- `createSnapshot()` and `applySnapshot()` are internal functions, not exported.
- The exported `StateSnapshot` type is used for typing only — no external code reads `snapshot.featureCollectionUri` or `snapshot.savePath`.
- The `snapshotsEqual()` comparison uses JSON.stringify, which will automatically exclude removed fields.

---

### R5: Test impact assessment

**Decision**: Existing tests need minimal updates — only the snapshot field list changes. No test logic changes required.

**Rationale**: The 12 existing undo tests in `undo.test.ts` test:
- Basic undo/redo (using `playbackRate`, `rotation`, `selection`)
- canUndo/canRedo state
- clearHistory
- 50-step limit
- Ephemeral field exclusion
- Cross-slice undo

None of these tests use `featureCollectionUri` or `savePath` in their assertions. A new test should be added to assert the snapshot field set contains exactly 10 fields.

---

## Summary

| Question | Decision | Confidence |
|----------|----------|------------|
| UI vs data field boundary | 10 UI fields kept, 2 removed | High (SRD + transition plan specify this) |
| Two StateSnapshot definitions | Update both (flat + exported) | High (codebase analysis) |
| Dirty tracking migration | Remove from DIRTY_TRIGGER_FIELDS, rely on Log markDirty | High (Log Service already implements this) |
| External snapshot consumers | None — safe to narrow | High (in-memory only, internal functions) |
| Test impact | Minimal — add field-count assertion, no logic changes | High (test analysis) |
