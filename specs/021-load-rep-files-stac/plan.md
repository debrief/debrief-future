# Implementation Plan: REP File Loading in VS Code Extension

**Branch**: `021-load-rep-files-stac` | **Date**: 2026-01-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/021-load-rep-files-stac/spec.md`

## Summary

Add REP file import capability to the VS Code extension via drag-and-drop onto the map panel (P1) and right-click context menu with catalog/item picker (P2). Uses existing debrief-io for parsing, debrief-stac for storage. All operations offline, with duplicate detection by filename.

## Technical Context

**Language/Version**: TypeScript 5.x (VS Code Extension API)
**Primary Dependencies**: @vscode/api ^1.85.0, existing debrief-io (Python), debrief-stac (Python)
**Storage**: STAC catalog via debrief-stac service (file-based, offline)
**Testing**: vitest (unit), VS Code Extension Test (integration)
**Target Platform**: VS Code ^1.85.0 (Windows, macOS, Linux)
**Project Type**: VS Code Extension (apps/vscode/)
**Performance Goals**: Import completes in <5s for files <1MB
**Constraints**: Offline-capable, no network dependencies, single-file import only
**Scale/Scope**: Single-file REP import, 2 UI flows (drag-drop, context menu)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Principle | Status | Notes |
|---------|-----------|--------|-------|
| I.1 | Offline by default | ✅ PASS | All operations local via debrief-stac file system |
| I.3 | No silent failures | ✅ PASS | Parse errors surface via VS Code notifications |
| I.4 | Reproducibility | ✅ PASS | Same REP file → same GeoJSON features |
| II.1 | Single source of truth | ✅ PASS | Uses debrief-io parser, no custom parsing |
| III.1 | Provenance always | ✅ PASS | REP stored as asset with provenance metadata |
| III.2 | Source preservation | ✅ PASS | Original REP file copied to assets/ |
| IV.1 | Services never touch UI | ✅ PASS | debrief-io/stac return data; extension handles UI |
| IV.2 | Frontends never persist | ✅ PASS | All writes through debrief-stac service |
| VI.2 | Services require unit tests | ✅ PASS | Extension service code tested with vitest |
| VIII.1 | Specs before code | ✅ PASS | Spec complete before this plan |

**Gate Result**: PASS - No violations

## Project Structure

### Documentation (this feature)

```text
specs/021-load-rep-files-stac/
├── plan.md              # This file
├── research.md          # Integration patterns research
├── data-model.md        # Message types for import flow
├── quickstart.md        # Developer setup guide
├── contracts/           # IPC message schemas
└── tasks.md             # Implementation tasks
```

### Source Code (repository root)

```text
apps/vscode/
├── src/
│   ├── extension.ts                    # Entry point (register commands)
│   ├── commands/
│   │   ├── importRep.ts                # NEW: Import command handler (orchestrates IoService → StacService)
│   │   └── index.ts                    # Command registration (update)
│   ├── services/
│   │   ├── ioService.ts                # NEW: Wrapper for debrief-io parse_rep (storage-agnostic)
│   │   └── stacService.ts              # Existing: add_asset, add_features calls
│   ├── providers/
│   │   └── stacTreeProvider.ts         # Update: refresh after import
│   ├── webview/
│   │   ├── mapPanel.ts                 # Update: handle drop events, orchestrate import
│   │   ├── messages.ts                 # Update: add import messages
│   │   └── web/
│   │       └── map.ts                  # Update: drop zone handling
│   └── views/
│       └── catalogItemPicker.ts        # NEW: QuickPick-based picker
├── tests/
│   ├── unit/
│   │   └── ioService.test.ts           # NEW: Parser wrapper tests
│   └── integration/
│       └── import.test.ts              # NEW: E2E import tests
└── package.json                        # Update: context menu contribution

services/stac/
└── src/debrief_stac/
    └── assets.py                       # Update: add duplicate check function
```

**Structure Decision**: VS Code extension acts as orchestrator. IoService handles parsing (storage-agnostic), StacService handles storage. No dedicated ImportService - command handlers coordinate the workflow directly.

## Media Components

*Identify Storybook stories to bundle for blog post demos.*

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| N/A | - | - | No new visual components; uses VS Code native UI |

**Inclusion Criteria Applied**:
- [ ] New visual component
- [ ] Significant visual change
- [ ] Interactive demo adds narrative value

None - VS Code extension feature using native QuickPick and webview drop handling. No Storybook stories applicable.

## Complexity Tracking

No violations to justify.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     VS Code Extension Host                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │ Context Menu │    │  Map Panel   │    │ Catalog Picker   │  │
│  │  (Explorer)  │    │  (Webview)   │    │  (QuickPick)     │  │
│  └──────┬───────┘    └──────┬───────┘    └────────┬─────────┘  │
│         │                   │                      │            │
│         │  importRep cmd    │  drop event          │ selection  │
│         │                   │                      │            │
│         └───────────────────┴──────────────────────┘            │
│                             │                                    │
│                             ▼                                    │
│         ┌───────────────────────────────────────────┐           │
│         │        Extension Orchestration            │           │
│         │  (command handlers / mapPanel methods)    │           │
│         │  1. Call IoService.parseRep()             │           │
│         │  2. Call StacService.addAsset()           │           │
│         │  3. Call StacService.addFeatures()        │           │
│         │  4. Refresh UI, handle errors             │           │
│         └───────────────────────────────────────────┘           │
│                    │                       │                     │
│                    ▼                       ▼                     │
│           ┌──────────────┐         ┌──────────────┐             │
│           │  IoService   │         │  StacService │             │
│           │  (parse only)│         │  (storage)   │             │
│           └──────┬───────┘         └──────┬───────┘             │
└──────────────────┼─────────────────────────┼────────────────────┘
                   │                         │
                   ▼                         ▼
            ┌──────────────┐          ┌──────────────┐
            │  debrief-io  │          │ debrief-stac │
            │  (Python)    │          │  (Python)    │
            │  parse_rep() │          │ add_asset()  │
            └──────────────┘          │ add_features │
                                      └──────────────┘
```

**Key architectural decision**: IoService is storage-agnostic. It only parses REP files and returns GeoJSON features. The VS Code extension acts as orchestrator, coordinating IoService (parsing) and StacService (storage) separately. This enables future storage backends (e.g., local files) without changing IoService.

## Key Design Decisions

### 1. Drag-Drop Implementation
- **Decision**: Use VS Code webview's native HTML5 drag-drop API
- **Rationale**: MapPanel is already a webview; HTML5 drop is well-supported
- **Alternative rejected**: VS Code Tree Drag-Drop API (only works tree-to-tree)

### 2. Service Separation (Storage-Agnostic IoService)
- **Decision**: IoService handles parsing only, returns GeoJSON features. Extension orchestrates IoService → StacService separately.
- **Rationale**: Enables future storage backends (local files, other catalogs) without modifying IoService. Clean separation of concerns.
- **Alternative rejected**: Combined ImportService that knows about both parsing and STAC (tighter coupling, less flexible)

### 3. Duplicate Detection
- **Decision**: Check asset keys by source filename stem before import
- **Rationale**: Simple, user-understandable; aligns with debrief-stac asset key pattern
- **Alternative rejected**: Content hash (more complex, overkill for single-file)

### 4. Picker UI
- **Decision**: Use VS Code QuickPick API (two-step: catalog → item)
- **Rationale**: Native feel, keyboard navigable, consistent with existing extension UX
- **Alternative rejected**: Custom webview picker (unnecessary complexity)

### 5. Error Handling
- **Decision**: Surface errors via vscode.window.showErrorMessage with actionable text
- **Rationale**: Consistent with VS Code patterns; user can copy error for support
- **Alternative rejected**: Modal dialog (too intrusive for transient errors)

## Implementation Phases

### Phase 1: Core Infrastructure (P1 Drag-Drop)
1. Create IoService wrapper for debrief-io parse_rep (storage-agnostic, returns GeoJSON)
2. Extend StacService with add_asset and duplicate check
3. Add orchestration logic in mapPanel (IoService → StacService)
4. Wire drop event from webview to mapPanel orchestration
5. Add progress notification during import

### Phase 2: Context Menu Flow (P2)
1. Add package.json contribution for .rep file context menu
2. Implement CatalogItemPicker using QuickPick API
3. Create importRep command handler with orchestration (IoService → StacService)
4. Add refresh trigger to StacTreeProvider after import

### Phase 3: Polish & Error Handling (P3)
1. Implement comprehensive error messages for all failure modes
2. Add unit tests for IoService (parsing wrapper)
3. Add integration tests for full import flow
4. Documentation updates
