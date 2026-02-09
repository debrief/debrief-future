# Research: Log Recording Service (#071)

**Date**: 2026-02-09
**Feature**: 071-log-recording-service (Epic E02, Phase 1)

## 1. Where Do Features Live?

### Decision: GeoJSON features live on disk, managed by stacService

**Context**: The Zustand session-state store contains only metadata (selection, viewport, time, dirty flag). Features are stored in GeoJSON files on disk within STAC Item directories. `stacService.addFeatures()` appends new features and writes synchronously via `fs.writeFileSync`. The MapPanel (webview) loads features from these files for rendering.

**Implication**: The Log Service cannot "write entries to features in the Zustand store" as the SRD describes. Instead, it must write entries to features in the GeoJSON files via stacService. The Zustand integration is limited to calling `markDirty()`.

**Rationale**: This preserves the existing architecture where stacService is the sole persistence layer (Art. IV: frontends never persist). The Log Service acts as an orchestration layer that delegates persistence to stacService.

**Alternatives Considered**:
- *Loading features into Zustand store*: Rejected. Would duplicate state and break the existing architecture. Features can be large; keeping them in a reactive store has performance implications.
- *Direct file I/O from Log Service*: Rejected. Would bypass stacService and duplicate persistence logic.

## 2. How Does the Log Service Modify Existing Features?

### Decision: Add `appendProvenance()` method to stacService

**Context**: When a tool runs on existing features (e.g., calculate range between Track A and Track B), the Python executor creates provenance on the *output* features only. The *input* features (Track A, Track B) also need Log entries recording their role in the operation. Currently, no mechanism exists to modify existing features' properties in the GeoJSON file.

**Design**: Add a `appendProvenance(storePath, itemPath, featureProvenance)` method to stacService that:
1. Reads the GeoJSON file
2. For each target feature (by ID), appends the Log entry to `properties.provenance[]`
3. Writes the updated GeoJSON back to disk
4. Clears the item cache

**Rationale**: Keeps all file I/O in stacService. The Log Service constructs the entries; stacService handles persistence. This follows the existing pattern where `addFeatures()` and `addResultAsset()` handle different write operations.

**Alternatives Considered**:
- *Save-on-dirty only (no immediate write)*: The transition plan suggested deferring to Ctrl+S. But since stacService.addFeatures() already writes immediately, the provenance append should be consistent. Immediate write ensures provenance is not lost if the editor crashes.
- *Batch writes*: Deferred to future optimisation. For Phase 1, individual writes per tool execution are sufficient.

## 3. Python vs TypeScript Log Entry Creation

### Decision: Python creates provenance on output features; TypeScript creates entries for input features

**Context**: The Python executor (`provenance.py:attach_log_entry()`) already creates PROV-aligned Log entries and attaches them to output features. These entries have `activityId`, `timestamp`, `wasGeneratedBy`, etc. The features arrive through MCP with provenance embedded.

**Design**:
- **Output features** (new features from tool result): Python executor already attaches provenance. The TypeScript Log Service reads the `activityId` from the first output feature's provenance to ensure consistency.
- **Input features** (existing features used by the tool): The TypeScript Log Service creates matching Log entries (same `activityId`) and appends them via stacService.

**Rationale**: Avoids duplicate provenance on output features. Python has full context about what the tool did (parameters, generated outputs). TypeScript has context about which features were inputs (from MCP annotations `debrief:sourceFeatures`).

**Alternatives Considered**:
- *TypeScript creates all entries (override Python provenance)*: Rejected. Python has richer context (resolved parameters, execution details). Would require removing Python provenance first.
- *Python creates entries for input features too*: Rejected. Python executor doesn't have access to the GeoJSON files on disk. It only receives feature data passed to the tool.

## 4. Log Service Module Location

### Decision: New module within `services/session-state/src/log/`

**Context**: The spec says the Log Service resides "within or alongside the session-state package." The session-state package already provides store access, subscriptions, dirty tracking, and persistence utilities.

**Design**: Create a `log/` directory within session-state's `src/`:
```
services/session-state/src/
├── log/
│   ├── index.ts          # Public API: LogService interface, factory
│   ├── logService.ts     # Implementation
│   ├── entryBuilder.ts   # Log entry construction from ToolResult
│   ├── timeline.ts       # getTimeline() assembly logic
│   └── types.ts          # LogEntry, ExpandedToolResult TypeScript types
├── store/
├── types/
└── ...
```

**Rationale**: Collocating with session-state avoids creating a new package. The Log Service needs Zustand store access (`markDirty()`) which session-state already provides. Exports are added to the package's public API.

**Alternatives Considered**:
- *New sibling package (`@debrief/log-service`)*: Rejected for Phase 1. Would require new package scaffolding, build configuration, and cross-package imports. Can be extracted later if needed.
- *In the VS Code extension*: Rejected. The Log Service should be reusable across frontends (VS Code, web-shell).

## 5. Timeline Assembly Strategy

### Decision: Read-time assembly from GeoJSON files via stacService

**Context**: The `getTimeline()` function must collect Log entries from all features, deduplicate on `activityId`, and sort by timestamp. Features are in GeoJSON files on disk.

**Design**:
1. `getTimeline()` receives the store path and item path (or a loaded FeatureCollection)
2. Iterates all features, collecting `properties.provenance[]` arrays
3. Deduplicates on `activityId` using a Map (first seen wins)
4. Sorts by `timestamp` ascending
5. Returns the assembled timeline

**Performance**: For a plot with 20 features and 100 operations, this scans ~20 provenance arrays. Acceptable for Phase 1. Future optimisation: cache the timeline and invalidate on provenance writes.

**Rationale**: Runtime assembly avoids maintaining a separate index that could go stale. Consistent with SRD Annex A.9 which explicitly states "the timeline is a runtime view, not a persisted structure."

## 6. Expanded ToolResult Parsing

### Decision: Extend MCP annotations with new fields; graceful fallback

**Context**: Phase 0 (#070) expands the Python ToolResult with `toolVersion`, `modifiedFeatures`, `createdFeatures`, `createdAssets`, `parameters`. These need to reach the TypeScript side through MCP.

**Design**:
- Python's `result_builder.py` will include new annotations: `debrief:toolVersion`, `debrief:modifiedFeatures`, `debrief:createdFeatures`, `debrief:createdAssets`, `debrief:parameters`
- TypeScript's `calcService.ts` parses these when present
- The Log Service handles both expanded and legacy formats gracefully
- `ToolExecutionResult` type gains optional fields matching the expanded contract

**Rationale**: MCP annotations are the established mechanism for passing metadata from Python to TypeScript. Adding new annotations is backward-compatible (old consumers ignore unknown annotations).

**Alternatives Considered**:
- *Embed new fields in feature properties*: Some already are (provenance). But `modifiedFeatures` and `createdAssets` are result-level, not feature-level.
- *Separate metadata channel*: Rejected. MCP annotations are the right layer for this.

## 7. Dirty Tracking Integration

### Decision: Explicit `markDirty()` after stacService writes

**Context**: The existing dirty tracking in session-state monitors 11 Zustand fields for changes. Log entries are written to GeoJSON files by stacService, not to Zustand fields. The dirty mechanism won't detect file writes.

**Design**: After the Log Service calls `stacService.appendProvenance()`, it calls `store.getState().markDirty()` on the active session. This is the simplest integration: the Log Service knows when it wrote data, so it tells the store.

**Note**: For output features, `stacService.addFeatures()` is called by `executeTool.ts`, which already triggers dirty via `featureCollectionUri` changes. The Log Service only needs to call `markDirty()` for provenance updates to input features.

**Rationale**: Direct and explicit. No middleware changes needed. Consistent with the transition plan's recommendation.

## 8. Testing Strategy

### Decision: Vitest unit tests with mocked stacService and store

**Context**: The session-state package uses Vitest. Store creation via `createSessionStore()` provides isolated instances per test.

**Design**:
- **Unit tests** for `entryBuilder.ts`: Construct Log entries from various ToolResult shapes (expanded, legacy, artifact-producing). Verify schema compliance.
- **Unit tests** for `timeline.ts`: Assembly from mock FeatureCollections. Verify deduplication and sorting.
- **Unit tests** for `logService.ts`: Mock stacService and store. Verify orchestration (entry creation + stacService call + markDirty).
- **Integration test**: Real stacService with temp directory. Full flow: tool result -> Log entry -> file write -> timeline assembly.

**Rationale**: Follows existing patterns (Vitest, factory functions, `beforeEach` isolation). Integration test with real files ensures the stacService interaction works end-to-end.
