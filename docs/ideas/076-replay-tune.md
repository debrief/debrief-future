# [E02] Implement replay and parameter tuning (SRD P6)

## Epic
Part of **E02: PROV Logging Implementation** — Phase 6

## Problem
When an analyst realises a tool parameter was suboptimal, they must re-run the entire analysis chain manually. The SRD envisions a replay system where modifying a parameter on a past entry automatically re-runs all subsequent entries.

## Proposed Solution
1. Implement `tuneEntry(activityId, parameter, newValue)` in Log Service — triggers replay
2. Implement `revertTo(activityId)` — permanent truncation of entries after the selected point
3. Implement `revertThis(activityId)` — soft-delete one entry, replay the rest
4. Build replay engine: sequential re-invocation of tools via MCP
5. Add cross-snapshot replay (load snapshot, replay through boundaries)
6. Add typed parameter UI affordances in Log Panel (inline editing)
7. Add version matching: halt replay on tool version mismatch with clear error

## Success Criteria
- Tuning a parameter triggers immediate replay of all subsequent entries
- "Revert to here" permanently discards entries after the selected point
- "Revert this" soft-deletes one entry and replays the rest; halts if dependency fails
- Cross-snapshot replay loads the appropriate snapshot and replays through boundaries
- Tool version mismatch halts replay with a clear error

## Dependencies
- #071 (Log Recording service)
- #074 (Snapshots — for cross-snapshot replay)

## Complexity
High

## Reference
- [Transition Plan: Phase 6](docs/architecture/prov-transition-plan.md#phase-6-replaytune-srd-p6)
- [SRD Sections 4.1-4.2, Annex A.6-A.7](docs/srd-prov-undo.md)
