# Implementation Plan: Load REP Files into STAC Catalog from VS Code

**Branch**: `021-load-rep-files-stac` | **Date**: 2026-01-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/021-load-rep-files-stac/spec.md`

## Summary

Enable users to import REP format track files into STAC-based plots directly from VS Code. Primary interaction is drag-drop onto the map panel; secondary is right-click context menu with catalog/item picker. Implementation leverages existing debrief-io (parsing) and debrief-stac (storage) services via JSON-RPC over stdio.

## Technical Context

**Language/Version**: TypeScript 5.x (VS Code Extension), Python 3.11+ (services)
**Primary Dependencies**: VS Code Extension API ^1.85.0, Leaflet ^1.9.4, jsonrpc-lite
**Storage**: STAC catalog (local filesystem via debrief-stac)
**Testing**: Vitest (TypeScript), pytest (Python)
**Target Platform**: VS Code desktop (Windows, macOS, Linux)
**Project Type**: VS Code extension with Python service integration
**Performance Goals**: < 2 seconds for typical REP file import (< 1000 points)
**Constraints**: Fully offline, no network dependencies
**Scale/Scope**: Single file import per operation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Principle | Status | Implementation |
|---------|-----------|--------|----------------|
| I.1 | Offline by default | ✅ Pass | All operations local filesystem |
| I.3 | No silent failures | ✅ Pass | Fail-fast with explicit errors |
| II.1 | Schema compliance | ✅ Pass | Uses LinkML-derived GeoJSON schema |
| III.1 | Provenance always | ✅ Pass | Source REP stored as asset |
| III.2 | Source preservation | ✅ Pass | Original file never modified |
| IV.1 | Services never touch UI | ✅ Pass | Python returns data only |
| IV.2 | Frontends never persist | ✅ Pass | Writes via debrief-stac |
| VI.2 | Services require tests | ✅ Pass | Unit tests for new code |

**Gate Status**: ✅ PASSED - No violations

## Project Structure

### Documentation (this feature)

```text
specs/021-load-rep-files-stac/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Technical research findings
├── data-model.md        # Data structures and types
├── quickstart.md        # Developer getting started guide
├── contracts/           # API contracts
│   ├── messages.ts      # WebView ↔ Extension message types
│   └── ipc-methods.md   # JSON-RPC method specifications
└── media/               # Planning announcement content
    ├── planning-post.md
    └── linkedin-planning.md
```

### Source Code (repository root)

```text
apps/vscode/
├── src/
│   ├── commands/
│   │   ├── loadRepFile.ts           # NEW: Drag-drop import orchestration
│   │   └── loadRepFileFromExplorer.ts # NEW: Context menu import with picker
│   ├── services/
│   │   ├── pythonService.ts         # NEW: JSON-RPC client for Python services
│   │   └── repImportService.ts      # NEW: REP import orchestration
│   └── webview/
│       ├── messages.ts              # MODIFY: Add REP import messages
│       └── web/
│           └── map.ts               # MODIFY: Add drop event handlers
├── package.json                     # MODIFY: Add context menu contribution
└── tests/
    ├── unit/
    │   ├── pythonService.test.ts    # NEW
    │   └── repImportService.test.ts # NEW
    └── integration/
        └── repImport.test.ts        # NEW

services/io/
└── (no changes needed - APIs exist)

services/stac/
└── (no changes needed - APIs exist)
```

**Structure Decision**: Extending existing VS Code extension with new commands and services. Python services already provide required APIs.

## Implementation Phases

### Phase 1: Service Communication (Foundation)

1. Create `pythonService.ts` - JSON-RPC client over stdio
2. Create service spawning infrastructure
3. Add circuit breaker and timeout handling
4. Unit tests for service communication

**Deliverable**: Extension can call Python services reliably

### Phase 2: Webview Drop Handler (P1 Feature Core)

1. Add drag event listeners to map webview
2. Create drop zone visual feedback (overlay)
3. Define message types for REP import workflow
4. Post drop events to extension host

**Deliverable**: Webview detects and reports REP file drops

### Phase 3: Import Command (P1 Feature Complete)

1. Create `loadRepFile.ts` command
2. Orchestrate: validate → parse → check duplicate → add asset → add features
3. Progress notification management
4. Error handling with user-friendly messages
5. Refresh map and zoom to imported bounds
6. Integration tests

**Deliverable**: Drag-drop import fully functional

### Phase 4: Context Menu (P2 Feature)

1. Register context menu contribution in package.json
2. Create catalog/item picker UI (QuickPick)
3. Create `loadRepFileFromExplorer.ts` command
4. Handle empty state (no stores registered)

**Deliverable**: Right-click import fully functional

## Media Components

*Identify Storybook stories to bundle for blog post demos.*

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| MapPanel (with drop zone) | `apps/vscode/src/webview/web/MapPanel.stories.tsx` | `map-drop-zone.js` | Demo drag-drop visual feedback |

**Inclusion Criteria Applied**:
- [x] New visual component (drop zone overlay)
- [x] Significant visual change (map accepts drops)
- [x] Interactive demo adds narrative value (shows workflow)

**Bundleability Verified**:
- [ ] Stories exist in Storybook (need to create)
- [x] Components render standalone (map webview is isolated)
- [x] Reasonable bundle size expected (< 500KB)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/vscode-map--drop-zone`

*Note: Story needs to be created as part of implementation.*

## Complexity Tracking

No constitution violations requiring justification.

## Acceptance Criteria Summary

| ID | Criterion | Test Method |
|----|-----------|-------------|
| AC-1 | Drag-drop .rep onto map imports and displays tracks | Integration test |
| AC-2 | REP file stored as asset with `roles: ["source"]` | Unit test |
| AC-3 | Map auto-zooms to show imported bounds | Integration test |
| AC-4 | Duplicate files (same name) rejected with warning | Unit test |
| AC-5 | Malformed files rejected with descriptive error | Unit test |
| AC-6 | Right-click context menu shows "Load into Debrief..." | Manual test |
| AC-7 | Catalog/item picker populates from registered stores | Integration test |
| AC-8 | All operations work offline | Manual test |
