# Implementation Plan: Load REP Files into New Plot

**Branch**: `043-load-rep-new-plot` | **Date**: 2026-01-30 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/043-load-rep-new-plot/spec.md`

## Summary

Add "Add to new plot in [store-name]" options to the existing "Load into Debrief..." QuickPick. When selected, prompt for a title, create a new STAC Item, parse selected REP files into GeoJSON, store originals as assets, and open the result in MapPanel. Requires a new `stacService.createItem()` method and extending the existing import command.

## Technical Context

**Language/Version**: TypeScript 5.x (VS Code extension)
**Primary Dependencies**: VS Code extension API, existing `stacService`, existing `ioService`, Node.js `fs/promises`, `crypto.randomUUID()`
**Storage**: Local filesystem STAC catalogs (read-write)
**Testing**: VS Code extension test framework (Mocha), unit tests
**Target Platform**: VS Code extension (desktop)
**Project Type**: Single (VS Code extension monorepo)
**Performance Goals**: Item creation < 1s, REP parsing < 5s for typical files
**Constraints**: Offline-only, atomic operations, no network dependencies
**Scale/Scope**: 2 files modified, 1 new method, ~150 lines of new code

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|------------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | All local filesystem operations |
| I. Defence-Grade Reliability | No silent failures | PASS | Atomic operation — full success or full rollback with error message |
| II. Schema Integrity | Schema compliance | PASS | Creates standard STAC 1.0.0 Item JSON |
| III. Data Sovereignty | Provenance always | PASS | Original .rep files preserved as assets with `roles: ["source"]` |
| III. Data Sovereignty | Source preservation | PASS | .rep files copied, never modified |
| III. Data Sovereignty | Data stays local | PASS | No network calls |
| IV. Architectural Boundaries | Services never touch UI | PASS | stacService returns data; VS Code command handles QuickPick, InputBox, MapPanel |
| VI. Testing | Services require unit tests | PASS | Unit tests for createItem(), picker, atomicity, merge |
| IX. Dependencies | Minimal dependencies | PASS | No new dependencies — uses Node.js built-ins and existing services |

**Post-design re-check**: All gates still pass. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/043-load-rep-new-plot/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── stac-service-create-item.ts
│   └── import-rep-new-plot-flow.ts
└── media/
    ├── planning-post.md
    └── linkedin-planning.md
```

### Source Code (repository root)

```text
apps/vscode/src/
├── commands/
│   └── importRep.ts          # MODIFY: add "new plot" picker options + creation flow
├── services/
│   └── stacService.ts        # MODIFY: add createItem() method
└── test/
    ├── stacService.test.ts   # ADD: createItem() tests
    └── importRep.test.ts     # ADD: picker + flow tests
```

**Structure Decision**: No new files needed in production code. Feature extends two existing files. Tests added in existing test directory.

## Media Components

None - this feature modifies command logic and service methods with no new visual components. The QuickPick and InputBox are native VS Code UI elements, not custom webview components.

## Complexity Tracking

No constitution violations to justify. All gates pass cleanly.
