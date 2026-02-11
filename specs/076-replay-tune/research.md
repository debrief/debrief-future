# Research: Replay and Parameter Tuning

**Feature**: 076-replay-tune | **Date**: 2026-02-11

## Decision 1: Replay Engine Architecture

**Decision**: The Replay Engine is a pure function module in `session-state/src/log/` that accepts a replay plan (list of entries to re-execute) and a tool executor callback. It does not import `calcService` directly — the VS Code extension provides the executor via dependency injection.

**Rationale**: The session-state package has no VS Code dependencies and cannot import `calcService` (which depends on `vscode` module). The Replay Engine must remain testable in isolation. A callback-based approach allows unit tests to use mock executors while production code injects the real `calcService.executeTool()`.

**Alternatives Considered**:
- Direct `calcService` import in session-state: Rejected — violates the package boundary (session-state is framework-agnostic).
- Event-based replay (emit events, extension subscribes): Rejected — adds indirection without benefit; a callback is simpler and synchronous-enough for sequential replay.

## Decision 2: Replay Scope — In-Memory vs File-Based

**Decision**: Replay operates on the in-memory session state (Zustand store features), not on files. The Replay Engine takes a pre-replay snapshot of the current store state for rollback. After successful replay, `markDirty()` triggers the standard save-on-demand workflow.

**Rationale**: The existing tool execution path already works in-memory — `calcService.executeTool()` returns new features that are applied to the store. Replay simply repeats this pattern. File writes happen only via the standard dirty→save flow. This keeps replay consistent with normal tool execution.

**Alternatives Considered**:
- File-based replay (rewrite GeoJSON between each step): Rejected — prohibitively slow for multi-step replay, inconsistent with existing architecture.
- Hybrid (in-memory with periodic file checkpoints): Rejected — over-engineered for typical 10-20 operation chains.

## Decision 3: Tune Annotation Storage

**Decision**: The `tune` field on a LogEntry stores a single `TuneAnnotation` (the most recent tune). When a parameter is tuned multiple times, the `tune` field is overwritten with the latest annotation. The previous value in `tune.previousValue` always refers to the originally recorded value, not intermediate tunes.

**Rationale**: The existing `TuneAnnotation` type (from #071) stores a single annotation per entry. The SRD specifies that replay uses the "most recently tuned parameter value" when re-executing an entry that was itself a tune. Storing the full tune history would require changing the schema; a single annotation with the original→current delta is sufficient for the MVP.

**Alternatives Considered**:
- Array of TuneAnnotations (full tune history): Considered but deferred — would require schema change (#070), adds complexity without clear analyst benefit in Phase 6. Could be added in a future phase.
- Separate tune log (parallel to provenance): Rejected — would fragment the provenance model.

## Decision 4: Soft-Delete Mechanism

**Decision**: Soft-deleted entries receive a `deleted: true` flag on the LogEntry record in `properties.provenance`. The `assembleTimeline()` function skips entries with `deleted: true` by default, but includes them with a `{ includeDeleted: true }` option for the Log Panel to render them visually.

**Rationale**: Adding a `deleted` flag is the minimal change — it does not require a new data structure and integrates naturally with the existing per-feature provenance model. The Log Panel can distinguish deleted entries for visual rendering.

**Alternatives Considered**:
- Physical removal from provenance arrays: Rejected — conflicts with "recoverable" requirement (FR-008). Once removed, entries cannot be restored.
- Separate deleted-entries index: Rejected — would require maintaining a parallel data structure that must stay in sync with provenance arrays.

## Decision 5: Cross-Snapshot Replay Strategy

**Decision**: Cross-snapshot replay uses the existing Snapshot Service to load the appropriate snapshot GeoJSON, then replays from that point forward through all subsequent segments. The Replay Engine receives a `SnapshotLoader` callback (injected from VS Code extension via stacService) to load snapshot files on demand.

**Rationale**: The Snapshot Service (#074) already provides `loadSnapshotEntries()` and navigation through the snapshot chain. The Replay Engine extends this by loading the snapshot's full GeoJSON (for feature state) rather than just entries. This leverages existing infrastructure without duplication.

**Alternatives Considered**:
- Reverse-compute state (undo operations backward to target point): Rejected — not all operations are reversible; some tools create features that can't be "uncreated" in a meaningful way.
- Pre-cache state at snapshot boundaries: Rejected — storage overhead for potentially large GeoJSON files; snapshot files already serve this purpose.

## Decision 6: Version Mismatch Detection

**Decision**: The Replay Engine compares the `toolVersion` from the Log entry's `wasGeneratedBy` against the version reported by the currently installed tool (obtained via `calcService.listTools()`). If they differ, replay halts immediately before executing that entry.

**Rationale**: Tool versions are recorded in Log entries (from #071's expanded ToolResult contract). The existing `calcService.listTools()` returns tool definitions including version info. Comparing at replay time is a simple string comparison.

**Alternatives Considered**:
- Semantic version comparison (allow patch-level differences): Rejected for MVP — overly permissive when reproducibility is critical (Constitution I.4). Can be added as a user-configurable tolerance later.
- Skip version check with user override: Considered for future — not in Phase 6 scope per spec.

## Decision 7: Parameter Validation

**Decision**: Parameter validation uses the `ParameterValue` type constraints already stored in Log entries. For Phase 6, validation is limited to type checking (value matches declared type: Float, Integer, Duration, Enum, Boolean, String). Rich constraints (min/max, allowed values, regex) are read from tool definitions when available.

**Rationale**: Log entries already store typed parameters via the `ParameterValue` interface (`value`, `default`, `tunable`). Tool definitions from `calcService.listTools()` may include JSON Schema-style constraints in their `inputSchema`. The ParameterEditor component uses these to render appropriate controls and validate input.

**Alternatives Considered**:
- Store full JSON Schema per parameter in each Log entry: Rejected — bloats provenance data unnecessarily; tool definitions are available at runtime.
- No validation (trust analyst input): Rejected — FR-011 requires validation before replay begins.

## Decision 8: Cancellation and Rollback

**Decision**: Before starting replay, the engine captures a full copy of the current feature state from the Zustand store. If the analyst cancels or replay fails, the engine restores this snapshot. The `AbortController` pattern is used for cancellation signaling.

**Rationale**: TypeScript's `AbortController` is a standard pattern for cancellable async operations. A full state snapshot (deep clone of features) ensures clean rollback regardless of where replay stops. The snapshot is in-memory only and discarded after successful completion.

**Alternatives Considered**:
- Incremental undo (undo each replayed step in reverse): Rejected — the undo system has been narrowed to UI-only changes (#073), so it cannot track feature mutations.
- Save to temp file before replay: Rejected — adds I/O latency; in-memory clone is faster and sufficient for typical feature collection sizes.

## Decision 9: Artifact Versioning

**Decision**: When replay re-executes an artifact-producing tool, the new artifact file is named with an incremented version suffix (e.g., `_v2.png`). The STAC item's `assets` map is updated to include the new version. The previous version is preserved. The `generatedResultId` (stable result ID) remains the same across versions.

**Rationale**: This follows the SRD's artifact versioning scheme (Section 4.7). The `generatedResultId` acts as the logical identifier; version numbers distinguish physical files. Open views keyed by `generatedResultId` can auto-refresh to show the latest version.

**Alternatives Considered**:
- Overwrite in-place: Rejected — violates Constitution III.2 (source preservation) and FR-013.
- Separate result directories per version: Rejected — over-engineered for the typical case of 1-3 versions.

## Decision 10: Replay Engine Callback Contract

**Decision**: The tool executor callback has this signature:
```typescript
type ToolExecutor = (
  toolId: string,
  featureIds: string[],
  params: Record<string, unknown>
) => Promise<ToolExecutionResult>;
```

This matches the existing `calcService.executeTool()` parameter shape (minus the `ToolExecutionRequest` wrapper). The Replay Engine constructs the request from Log entry data.

**Rationale**: Direct alignment with the existing tool execution interface avoids adapter code. The Log entry's `wasGeneratedBy.tool` maps to `toolId`, `used` maps to `featureIds`, and `wasGeneratedBy.parameters` values map to `params`.

**Alternatives Considered**:
- Pass raw MCP messages: Rejected — the Replay Engine should work at the tool abstraction level, not the wire protocol level.
- Introduce a ReplayableToolExecution interface: Rejected — unnecessary wrapper; the existing executeTool signature is sufficient.
