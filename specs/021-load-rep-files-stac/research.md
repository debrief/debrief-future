# Research: Load REP Files into STAC Catalog from VS Code

**Feature**: 021-load-rep-files-stac
**Date**: 2026-01-24
**Status**: Complete

## Executive Summary

This feature enables users to import REP files into STAC-based plots from within the VS Code extension. The research reveals that low-level APIs (REP parsing, STAC operations, config management) are fully implemented and production-ready. The primary implementation work focuses on VS Code extension integration: webview drop handlers, service communication, and command orchestration.

## Technical Decisions

### Decision 1: IPC Protocol for Service Communication

**Decision**: Use JSON-RPC 2.0 over stdio for TypeScript ↔ Python service communication

**Rationale**:
- Already documented in `/specs/004-loader-mini-app/contracts/ipc-messages.md`
- Standard protocol with existing libraries (jsonrpc-lite for TS, built-in json for Python)
- Stdio provides reliable, synchronous communication without network complexity
- Matches CONSTITUTION requirement for offline operation

**Alternatives Considered**:
- HTTP REST: Requires running HTTP server, adds network stack complexity
- Direct FFI: Complex to maintain, platform-specific bindings needed
- Child process with custom protocol: No standard tooling, harder to debug

### Decision 2: Webview Drop Implementation

**Decision**: Register native drag-drop events in webview, use VS Code DataTransfer API

**Rationale**:
- VS Code webviews support standard DOM drag events
- The webview already has message passing to extension host (`postMessage`)
- Can validate file extension (`.rep`) client-side before processing

**Alternatives Considered**:
- Extension-only handling: Cannot intercept drops on webview area
- VS Code TreeDataProvider DnD: Only works for tree views, not custom webviews

### Decision 3: Duplicate Detection Strategy

**Decision**: Check for duplicate files by comparing dropped filename against existing asset titles in STAC item

**Rationale**:
- Simple and fast (no content hashing needed)
- Matches user expectation: "I already imported this file"
- Existing `list_assets()` API returns asset metadata including titles

**Alternatives Considered**:
- Content hash comparison: Slower, may have false negatives if file modified
- Path-based comparison: Fails if same file copied to different location

### Decision 4: Error Handling Strategy

**Decision**: Fail-fast with atomic operations - reject entire file on any parse error

**Rationale**:
- CONSTITUTION requires "No silent failures" (Article I.3)
- Partial imports would create confusing analysis state
- Clear error messages help users fix malformed files

**Alternatives Considered**:
- Partial import with warnings: Violates "fail explicitly" principle
- Auto-correction of common errors: Violates "reproducibility" principle

### Decision 5: Service Spawning Pattern

**Decision**: Spawn Python service subprocess on demand, reuse across multiple operations

**Rationale**:
- Avoids startup latency on each operation
- CalcService shows existing pattern (circuit breaker, timeout)
- Process lifecycle managed by VS Code extension deactivation

**Alternatives Considered**:
- New subprocess per operation: High latency, resource waste
- Long-running daemon: Adds complexity, harder to update services

## Existing APIs (Ready to Use)

### debrief-io Service

| Function | Location | Description |
|----------|----------|-------------|
| `parse_rep(path)` | `services/io/src/debrief_io/parser.py:76` | Parse REP file, return GeoJSON features |
| `REPHandler.parse()` | `services/io/src/debrief_io/handlers/rep.py:208` | Core parsing implementation |

**Output Format**: `ParseResult` with `features` (GeoJSON), `warnings`, `source_file`, `parse_time_ms`

### debrief-stac Service

| Function | Location | Description |
|----------|----------|-------------|
| `add_features(catalog_path, plot_id, features)` | `services/stac/src/debrief_stac/features.py:23` | Merge GeoJSON features into plot |
| `add_asset(catalog_path, plot_id, source_path, asset_key, media_type)` | `services/stac/src/debrief_stac/assets.py:21` | Store source file as STAC asset |
| `read_plot(catalog_path, plot_id)` | `services/stac/src/debrief_stac/plot.py:99` | Read STAC item with assets |

**Key Behavior**: `add_features()` automatically updates bbox and geometry to encompass new features.

### debrief-config Service

| Function | Location | Description |
|----------|----------|-------------|
| `list_stores()` | `services/config/src/debrief_config/core.py:77` | Get all registered STAC stores |
| `get_store(path)` | `services/config/src/debrief_config/core.py:87` | Get specific store registration |

### VS Code Extension Infrastructure

| Component | Location | Description |
|-----------|----------|-------------|
| `MapPanel` | `apps/vscode/src/webview/mapPanel.ts` | Webview panel management |
| `StacService` | `apps/vscode/src/services/stacService.ts` | STAC catalog operations |
| `ConfigService` | `apps/vscode/src/services/configService.ts` | Configuration management |

## Implementation Gaps

### High Priority (P1: Drag-Drop)

1. **Webview Drop Handler** - `apps/vscode/src/webview/web/map.ts`
   - Add `dragover`, `dragenter`, `dragleave`, `drop` event listeners
   - Validate file extension is `.rep`
   - Show visual feedback during drag
   - Post message to extension with file path

2. **Drop Message Types** - `apps/vscode/src/webview/messages.ts`
   - `RepFileDropMessage`: webview → extension
   - `RepImportProgressMessage`: extension → webview
   - `RepImportResultMessage`: extension → webview

3. **Service Spawner** - `apps/vscode/src/services/pythonService.ts` (new)
   - Spawn Python subprocess with JSON-RPC stdio
   - Method: `call(method, params) → Promise<result>`
   - Circuit breaker for reliability

4. **Import Command** - `apps/vscode/src/commands/loadRepFile.ts` (new)
   - Orchestrate: parse → check duplicate → add asset → add features → refresh map
   - Show progress notification
   - Handle errors with user-friendly messages

### Medium Priority (P2: Context Menu)

5. **Context Menu Registration** - `apps/vscode/package.json`
   - Add `contributes.menus.explorer/context` for `.rep` files
   - Register `debrief.loadRepFileFromExplorer` command

6. **Catalog Picker** - `apps/vscode/src/commands/loadRepFileFromExplorer.ts` (new)
   - Two-step QuickPick: select catalog → select plot
   - Handle empty state (no registered stores)

## CONSTITUTION Compliance

| Principle | Assessment | Implementation |
|-----------|------------|----------------|
| I.1 Offline by default | ✅ Compliant | All operations use local filesystem |
| I.3 No silent failures | ✅ Compliant | Fail-fast with error notifications |
| II.1 Schema integrity | ✅ Compliant | Uses existing LinkML-derived schemas |
| III.1 Provenance always | ✅ Compliant | Asset stores source file with metadata |
| III.2 Source preservation | ✅ Compliant | Original REP file stored as asset |
| IV.1 Services never touch UI | ✅ Compliant | Python services return data only |
| IV.2 Frontends never persist | ✅ Compliant | Writes go through debrief-stac |

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Python service spawn fails | Low | High | Circuit breaker, clear error message |
| Large REP file causes timeout | Medium | Medium | Progress feedback, configurable timeout |
| Concurrent imports corrupt data | Low | High | Sequential processing per webview |
| File deleted during import | Low | Medium | Check existence before operations |

## Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| VS Code Extension API | ^1.85.0 | Extension host, webview, commands |
| Leaflet | ^1.9.4 | Map rendering in webview |
| jsonrpc-lite | ^2.2.0 | JSON-RPC 2.0 client (needs adding) |
| debrief-io | workspace | REP parsing |
| debrief-stac | workspace | STAC operations |
| debrief-config | workspace | Store registration |

## Open Questions (Resolved)

1. **Q: How to handle REP files with special comments (`;CIRCLE:`, `;NARRATIVE:`)?**
   - **A**: Currently skipped in REP handler (line 231). Feature spec mentions handling shapes but marks as P1. Create follow-up item if needed.

2. **Q: Should webview show drop zone overlay during drag?**
   - **A**: Yes, per UI design in spec. Show "Drop REP file to import" overlay.

3. **Q: What MIME type for REP asset?**
   - **A**: Use `application/x-debrief-rep` as specified in asset storage convention.
