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
│   │   ├── importRep.ts                # NEW: Import command handler
│   │   └── index.ts                    # Command registration (update)
│   ├── services/
│   │   ├── importService.ts            # NEW: Import orchestration
│   │   └── stacService.ts              # Existing: add_asset, add_features calls
│   ├── providers/
│   │   └── stacTreeProvider.ts         # Update: refresh after import
│   ├── webview/
│   │   ├── mapPanel.ts                 # Update: handle drop events
│   │   ├── messages.ts                 # Update: add import messages
│   │   └── web/
│   │       └── map.ts                  # Update: drop zone handling
│   └── views/
│       └── catalogItemPicker.ts        # NEW: QuickPick-based picker
├── tests/
│   ├── unit/
│   │   └── importService.test.ts       # NEW: Import logic tests
│   └── integration/
│       └── import.test.ts              # NEW: E2E import tests
└── package.json                        # Update: context menu contribution

services/stac/
└── src/debrief_stac/
    └── assets.py                       # Update: add duplicate check function
```

**Structure Decision**: Extension of existing VS Code extension structure. New files for import functionality; updates to existing mapPanel and stacService.

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
│         ▼                   ▼                      ▼            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    ImportService                          │  │
│  │  - orchestrates parse → store → refresh                   │  │
│  │  - handles errors → user notifications                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│         │                                          │            │
│         ▼                                          ▼            │
│  ┌──────────────┐                          ┌──────────────┐    │
│  │  CalcService │                          │  StacService │    │
│  │  (MCP→io)    │                          │ (file ops)   │    │
│  └──────┬───────┘                          └──────┬───────┘    │
└─────────┼────────────────────────────────────────┼─────────────┘
          │                                        │
          ▼                                        ▼
   ┌──────────────┐                        ┌──────────────┐
   │  debrief-io  │                        │ debrief-stac │
   │  (Python)    │                        │  (Python)    │
   │  parse_rep() │                        │ add_asset()  │
   └──────────────┘                        │ add_features │
                                           └──────────────┘
```

## Key Design Decisions

### 1. Drag-Drop Implementation
- **Decision**: Use VS Code webview's native HTML5 drag-drop API
- **Rationale**: MapPanel is already a webview; HTML5 drop is well-supported
- **Alternative rejected**: VS Code Tree Drag-Drop API (only works tree-to-tree)

### 2. Python Service Communication
- **Decision**: Extend CalcService MCP pattern for debrief-io calls
- **Rationale**: Consistent with existing architecture; circuit breaker already implemented
- **Alternative rejected**: Direct subprocess spawn (inconsistent, no error handling)

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
1. Add ImportService with parse → store → refresh orchestration
2. Extend CalcService to call debrief-io parse_rep via MCP
3. Extend StacService with add_asset and duplicate check
4. Wire drop event from webview to ImportService
5. Add progress notification during import

### Phase 2: Context Menu Flow (P2)
1. Add package.json contribution for .rep file context menu
2. Implement CatalogItemPicker using QuickPick API
3. Wire importRep command to picker → ImportService
4. Add refresh trigger to StacTreeProvider after import

### Phase 3: Polish & Error Handling (P3)
1. Implement comprehensive error messages for all failure modes
2. Add unit tests for ImportService
3. Add integration tests for full import flow
4. Documentation updates
