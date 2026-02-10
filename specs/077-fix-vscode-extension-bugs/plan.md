# Implementation Plan: Fix VS Code Extension Bugs

**Branch**: `077-fix-vscode-extension-bugs` | **Date**: 2026-02-10 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/077-fix-vscode-extension-bugs/spec.md`

## Summary

Fix four regressions in the VS Code extension: time slider, location marker, trail mode, and tool offering. Research identified two root causes:

1. **Bugs 1-3 (temporal)**: `Track.times` contains ISO 8601 strings but `temporal-utils.ts` expects epoch milliseconds. The `trackToFeature()` function in `mapView.tsx` passes strings through without conversion, causing silent failures in binary search and coordinate slicing.

2. **Bug 4 (tools)**: The selection callback in `openPlot.ts` is only registered for newly created panels. Additionally, CalcService availability affects whether tools can be listed at all.

Both fixes are small, targeted changes with no new dependencies or architectural changes.

## Technical Context

**Language/Version**: TypeScript 5.x (VS Code extension webview, shared components)
**Primary Dependencies**: React 18.x, react-leaflet 4.2, Leaflet 1.9.x, Zustand (session-state), VS Code Extension API ^1.85.0
**Storage**: N/A (no storage changes)
**Testing**: Vitest (shared components unit tests), existing VS Code extension integration tests
**Target Platform**: VS Code extension (Electron/Node.js)
**Project Type**: Multi-package monorepo (apps/vscode, shared/components, services/session-state)
**Performance Goals**: Time slider updates render within 100ms
**Constraints**: No new dependencies; offline-capable (Constitution Article I)
**Scale/Scope**: 4 bug fixes touching 2-3 files, ~20 lines of code changes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Principle | Status | Notes |
|---------|-----------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | No network dependencies added |
| I. Defence-Grade Reliability | No silent failures | PASS | Fixes silently failing timestamp comparison |
| II. Schema Integrity | Single source of truth | PASS | No schema changes |
| III. Data Sovereignty | Provenance always | N/A | No data transformations |
| IV. Architectural Boundaries | Services never touch UI | PASS | Fix is in webview layer (frontend) |
| IV. Architectural Boundaries | Frontends never persist | PASS | No persistence changes |
| VI. Testing | Services require unit tests | PASS | Will add unit test for times conversion |
| VII. Test-Driven AI | Tests before implementation | PASS | Acceptance scenarios defined in spec |
| VIII. Documentation | Specs before code | PASS | Spec and plan complete |
| IX. Dependencies | Minimal dependencies | PASS | No new dependencies |
| XIV. Pre-Release Freedom | Breaking changes permitted | N/A | No breaking changes |

**Gate result: PASS** — No violations.

**Post-design re-check: PASS** — Design adds no new complexity, patterns, or dependencies.

## Project Structure

### Documentation (this feature)

```text
specs/077-fix-vscode-extension-bugs/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Root cause analysis
├── data-model.md        # Data flow documentation
├── quickstart.md        # Quick verification guide
└── media/
    ├── planning-post.md
    └── linkedin-planning.md
```

### Source Code (files to modify)

```text
apps/vscode/
├── src/
│   ├── webview/
│   │   └── web/
│   │       └── mapView.tsx           # FIX: Convert Track.times in trackToFeature()
│   ├── commands/
│   │   └── openPlot.ts               # FIX: Re-register selection callback for reused panels
│   └── services/
│       └── calcService.ts            # (verify) Tool loading error handling
└── tests/
    └── unit/
        └── temporalConversion.test.ts # NEW: Test for times conversion

shared/components/
└── src/
    └── MapView/
        └── temporal-utils.ts          # (verify) Already correct; input was wrong
```

**Structure Decision**: Bug fix — modifying existing files in existing structure. One new test file.

## Design

### Fix 1: Convert Track.times in trackToFeature() (Bugs 1-3)

**File**: `apps/vscode/src/webview/web/mapView.tsx`
**Function**: `trackToFeature()` (lines 41-56)

**Current code:**
```typescript
times: track.times,  // ISO strings passed through
```

**Fix:**
```typescript
times: track.times.map(t => new Date(t).getTime()),  // Convert ISO → epoch ms
```

**Why here?** This is the boundary between the STAC data layer (ISO strings) and the shared rendering layer (epoch ms). The shared components (`temporal-utils.ts`) are correct — they expect numbers. The VS Code-specific `Track` type uses strings because that's what STAC/GeoJSON provides. The conversion belongs at the bridge.

### Fix 2: Re-register selection callback for reused panels (Bug 4)

**File**: `apps/vscode/src/commands/openPlot.ts`
**Function**: `openPlotCommand()` (lines 167-232)

**Current code:** Selection callback registered only inside `if (!panel)` block (line 189-207).

**Fix:** Move the selection callback registration to after the `if (!panel)` block so it runs for both new and reused panels. The `onSelectionChanged` method should support replacing the callback (or idempotently re-registering).

**Check**: Verify that `MapPanel.onSelectionChanged()` handles being called multiple times (replaces previous callback vs stacks). If it stacks, add a `clearSelectionCallback()` before re-registering.

### Fix 3: Defensive validation in temporal-utils (hardening)

**File**: `shared/components/src/MapView/temporal-utils.ts`
**Function**: `extractTemporalData()` (lines 97-122)

**Optional hardening:** Add a runtime check that `times[0]` is a number, not a string. If strings are detected, log a warning and return null. This prevents silent corruption if another consumer passes strings in the future.

## Media Components

None — bug fix feature with no new visual components. The fix restores existing visual behavior (markers, trail rendering) that was broken by a data type mismatch.

## Storybook E2E Testing

None — no new interactive UI components. Existing Storybook stories for TemporalTrackLayer and TrackHighlightMarker already cover the visual behavior; the fix restores correct data input to those components.

## Complexity Tracking

No violations to justify — this is a minimal bug fix with no new patterns or abstractions.
