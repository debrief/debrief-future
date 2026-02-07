# Implementation Plan: Restore Previously-Open Plots on VS Code Startup

**Branch**: `052-restore-plots-session` | **Date**: 2026-02-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/052-restore-plots-session/spec.md`

## Summary

Automatically persist which STAC plots are open in the VS Code extension and restore them on startup. The extension already tracks recently opened plots via `RecentPlotsService` using `workspaceState`; this feature adds a parallel `OpenPlotsService` that tracks the *currently-open* set and replays the `openPlot` command on activation. Persistence happens in real-time (on every open/close) for crash safety. Missing plots are silently skipped.

## Technical Context

**Language/Version**: TypeScript 5.x (VS Code extension)
**Primary Dependencies**: VS Code Extension API ^1.85.0, existing `stacService`, `sessionManager`, `recentPlotsService`, `MapPanel`
**Storage**: VS Code `workspaceState` (workspace-scoped key-value store, persisted by VS Code)
**Testing**: VS Code extension test runner + vitest for unit tests
**Target Platform**: VS Code extension (cross-platform desktop: Windows, macOS, Linux)
**Project Type**: Single component within monorepo (`apps/vscode/`)
**Performance Goals**: Restore up to 5 plots within 3 seconds of activation; persist state writes complete in <50ms
**Constraints**: Offline-only (no network access), crash-safe (real-time persistence, not at-shutdown), workspace-scoped (no cross-workspace state)
**Scale/Scope**: Typical 1-10 open plots; edge case up to 50+

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | Uses only local `workspaceState`, zero network access |
| I. Defence-Grade Reliability | No silent failures | PASS | Restoration is intentionally silent for missing files (spec requirement), but persisted state always reflects truth |
| II. Schema Integrity | Schema tests mandatory | N/A | No schema changes — this is VS Code extension UI state, not STAC data model |
| III. Data Sovereignty | Data stays local | PASS | `workspaceState` is local to the user's machine |
| III. Data Sovereignty | No telemetry | PASS | No external calls |
| IV. Architectural Boundaries | Services never touch UI | PASS | This is frontend-only state management; STAC service is read-only during restoration |
| IV. Architectural Boundaries | Frontends never persist (data) | PASS | Persisting *UI session state* (which plots are open) is frontend's responsibility, not a data write |
| VI. Testing | Unit tests required | PASS | Unit tests for OpenPlotsService, integration test for restore flow |
| VIII. Documentation | Specs before code | PASS | Spec written, plan in progress |
| IX. Dependencies | Minimal dependencies | PASS | Zero new dependencies — uses VS Code built-in API only |
| X. Security | No secrets in code | PASS | Only stores plot URIs and titles |
| XI. Internationalisation | I18N from the start | N/A | No user-facing strings — restoration is silent and automatic |
| XIV. Pre-Release Freedom | Breaking changes permitted | PASS | Pre-release, no backwards compatibility needed |

**Gate result: PASS** — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/052-restore-plots-session/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0: research findings
├── data-model.md        # Phase 1: data model
├── quickstart.md        # Phase 1: developer guide
├── contracts/           # Phase 1: service interfaces
│   └── open-plots-service.ts
├── checklists/
│   └── requirements.md  # Spec quality checklist
├── media/
│   ├── planning-post.md
│   └── linkedin-planning.md
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/vscode/src/
├── services/
│   ├── openPlotsService.ts      # NEW: track & persist open plots
│   └── recentPlotsService.ts    # EXISTING: recent plots (unchanged)
├── commands/
│   └── openPlot.ts              # MODIFY: notify OpenPlotsService on open
├── webview/
│   └── mapPanel.ts              # MODIFY: notify OpenPlotsService on close
└── extension.ts                 # MODIFY: instantiate service, trigger restore on activation

apps/vscode/src/test/
└── services/
    └── openPlotsService.test.ts # NEW: unit tests
```

**Structure Decision**: New `OpenPlotsService` follows the existing `RecentPlotsService` pattern — a lightweight service class taking `ExtensionContext` in its constructor and using `workspaceState` for persistence. Changes to `extension.ts`, `openPlot.ts`, and `mapPanel.ts` are minimal wiring (add/remove calls).

## Media Components

None — backend/infrastructure feature. No new visual components, no Storybook stories. The feature is entirely about automatic state persistence and restoration with no UI surface.

## Storybook E2E Testing

None — no interactive UI components. The feature operates silently during VS Code activation.

## Complexity Tracking

No constitution violations to justify.
