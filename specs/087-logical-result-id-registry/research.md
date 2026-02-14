# Research: Logical Result ID Registry

**Feature**: 087-logical-result-id-registry
**Date**: 2026-02-13

## R-001: Where should the registry live?

**Decision**: The Result ID Registry is a new module within `@debrief/session-state`, alongside the existing Log Service.

**Rationale**: The registry is tightly coupled to session-state concerns — it consumes Log entries, operates per-session, and is cleared on plot close. The existing Log Service (`services/session-state/src/log/`) already provides the data the registry needs (`generatedResultId`, `generated` fields on `LogEntry`). Placing the registry in the same package keeps the dependency graph clean and follows the established pattern where session-scoped services live in `@debrief/session-state`.

**Alternatives considered**:
- **VS Code extension service** (like `stacService.ts`): Rejected because the registry is not VS Code-specific — it should work in the web-shell too.
- **Standalone package**: Rejected because the registry has a single dependency (Log entry data) and no consumers outside session-state-aware code. A standalone package adds packaging overhead without benefit.

## R-002: How does the registry learn about new result IDs?

**Decision**: The registry observes `RecordResult` objects returned by `logService.recordToolResult()`. The calling code (executeTool command handler) passes the `RecordResult` to the registry after each successful recording.

**Rationale**: The Log Service already extracts `generatedResultId` from `ExpandedToolResultFields.createdAssets[0].resultId` and stores it on the `LogEntry`. The `RecordResult` contains the entries array — the registry can inspect each entry's `generatedResultId` and `generated` fields. This approach avoids modifying the Log Service itself and follows the existing pattern where the executeTool command handler orchestrates service calls.

**Alternatives considered**:
- **Modify LogService to accept a callback**: Rejected because it introduces coupling between Log Service and the registry. The LogService should remain focused on provenance recording.
- **Subscribe to Zustand store provenance changes**: Rejected because provenance is written to GeoJSON files on disk (not to the Zustand store). There is no store field to subscribe to.
- **File system watcher on STAC assets**: Rejected because it's slow, platform-dependent, and the registry already has access to the information it needs from the RecordResult.

## R-003: How does the registry handle STAC hydration on plot load?

**Decision**: The registry provides a `hydrateFromAssets()` method that accepts the STAC Item's asset map (from `stacService.loadItem()`). This method scans for assets with `debrief:resultId` metadata, groups by result ID, selects the highest `debrief:version`, and populates the registry. The executeTool command handler calls this during plot loading, after `stacService.loadPlot()` completes.

**Rationale**: The STAC Item's `assets` record is already loaded by `stacService.loadItem()` and includes `debrief:resultId` and `debrief:version` fields on result assets (SRD section 4.7). Passing the asset map directly avoids the registry needing to know about file I/O or the STAC service.

**Alternatives considered**:
- **Registry reads STAC Item from disk**: Rejected because the registry should not have file I/O dependencies (keeps it testable and environment-agnostic).
- **Pass full StacItem object**: Acceptable but unnecessary — only the `assets` record is needed, and passing just the assets keeps the interface minimal.

## R-004: What subscription pattern should be used?

**Decision**: Simple callback-based subscriptions with two modes: per-ID and global. Each subscription returns an unsubscribe function (consistent with Zustand's `subscribe()` pattern and the existing `subscribeToSlice()` helpers in session-state).

**Rationale**: The existing subscription patterns in session-state use `subscribeToSlice()` which returns `() => void` unsubscribe functions. The ConfigService also uses a callback + unsubscribe pattern. This is the dominant pattern in the codebase and is well understood. EventEmitter would work but adds unnecessary API surface.

**Alternatives considered**:
- **VS Code EventEmitter**: Rejected because it's VS Code-specific; the registry must work in the web-shell too.
- **RxJS Observable**: Rejected because the project doesn't use RxJS and Constitution IX mandates minimal dependencies.
- **Zustand store slice**: Rejected because the registry's state (a Map of result IDs to paths) is not part of the session state that needs undo/redo tracking or dirty flagging.

## R-005: How does the replay engine interact with the registry?

**Decision**: The replay engine (Feature 076) already produces `ArtifactVersion[]` in its `ReplayResult`. After a tune/replay operation, the orchestrating code passes these artifact versions to the registry to update mappings. This mirrors how `RecordResult` is used for normal tool executions.

**Rationale**: `ArtifactVersion` already contains `resultId`, `version`, `path`, and `previousPath` — exactly the data the registry needs. The replay engine is already wired into the executeTool flow, so adding a registry update call is straightforward.

**Alternatives considered**:
- **Registry subscribes to replay engine events**: Rejected because the replay engine doesn't emit events — it returns results synchronously from `execute()`.

## R-006: Factory pattern and dependency injection

**Decision**: Use `createResultIdRegistry(deps)` factory function, consistent with `createLogService(deps)`, `createSnapshotService(deps)`, `createBranchService(deps)`. The deps interface is minimal — no external dependencies needed for the core registry (it's a pure in-memory map with callbacks).

**Rationale**: All session-state services use the factory + deps injection pattern. This keeps services testable without mocks and decoupled from concrete implementations.

## R-007: Thread safety and ordering guarantees

**Decision**: Updates are processed synchronously within the JavaScript event loop. Since Node.js / browser JS is single-threaded, sequential processing is guaranteed without explicit locking. The `registerResult()` and `updateResult()` methods are synchronous.

**Rationale**: All existing session-state services operate synchronously for state mutations (even though some operations like `appendProvenance` are async, the state updates themselves are sync). The registry follows the same pattern.

**Alternatives considered**:
- **Async queue**: Rejected because JavaScript's event loop already guarantees sequential execution of synchronous code. An async queue adds unnecessary complexity.
