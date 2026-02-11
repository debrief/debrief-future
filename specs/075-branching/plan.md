# Implementation Plan: Branching from History Point

**Branch**: `075-branching` | **Date**: 2026-02-10 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/075-branching/spec.md`

## Summary

Implement branching from any point in a plot's Log history (SRD P5, Phase 5 of E02 PROV Logging). The analyst selects a Log entry in the Log Panel and chooses "Branch from here." The system creates a new independent plot as a STAC Item, containing the state at the branch point with a trimmed Log. Both source and branch maintain two-way links via their system records. For branch points before the current snapshot boundary, state is reconstructed by loading the appropriate snapshot. The branch service extends the existing Log Service / Snapshot Service pattern with dependency injection.

## Technical Context

**Language/Version**: TypeScript 5.x (Log Service in session-state package, VS Code extension stacService)
**Primary Dependencies**: Existing Log Service (#071), Snapshot Service (#074), stacService, session-state Zustand store, Node.js `fs/promises`, `crypto.randomUUID()`
**Storage**: Local filesystem — GeoJSON files within STAC Item directories (read/write via stacService)
**Testing**: Vitest (session-state unit tests), manual integration tests via VS Code extension
**Target Platform**: VS Code extension (Node.js runtime), web-shell (browser)
**Project Type**: Monorepo workspace — session-state package + VS Code extension stacService
**Performance Goals**: Branch creation < 30 seconds for plots with < 50 Log entries; immediate for current-segment branches (no replay needed)
**Constraints**: Offline-capable (no network), independent plots after branching (no shared state), existing #071 and #074 tests must pass without modification
**Scale/Scope**: Up to ~10 branches per source plot; GeoJSON files up to ~50MB for large exercises

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status | Notes |
|---------|------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | All operations local filesystem; no network calls |
| I. Defence-Grade Reliability | No silent failures | PASS | Branch creation fails explicitly if state reconstruction fails or disk write fails |
| I. Defence-Grade Reliability | Reproducibility | PASS | Same branch point + same plot state = identical branch (deterministic) |
| II. Schema Integrity | Single source of truth | PASS | BranchRecord and FileProvEntry types already defined in LinkML system-record schema |
| II. Schema Integrity | Schema tests mandatory | PASS | Golden fixtures for branch records will extend existing system-record fixtures |
| III. Data Sovereignty | Provenance always | PASS | Branch creation recorded as file-level provenance entry on both system records |
| III. Data Sovereignty | Source preservation | PASS | Source plot is never modified beyond adding branch metadata to system record |
| III. Data Sovereignty | Audit trail immutable | PASS | Branch records are append-only; existing Log entries are not modified |
| IV. Architectural Boundaries | Services never touch UI | PASS | Branch Service returns data; Log Panel handles "Branch from here" UI |
| IV. Architectural Boundaries | Frontends never persist | PASS | All writes via stacService; no direct frontend file I/O |
| VI. Testing | Services require unit tests | PASS | Unit tests for branch creation, link maintenance, state reconstruction |
| IX. Dependencies | Minimal, vetted dependencies | PASS | No new dependencies; uses existing stacService, snapshotService, Log Service |
| XIV. Pre-Release Freedom | Breaking changes permitted | PASS | Pre-v4.0.0; branch record format can evolve |

**Gate result**: ALL PASS — no violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/075-branching/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 research findings
├── data-model.md        # Entity model and state transitions
├── quickstart.md        # Implementation guide
├── contracts/           # API contracts
│   ├── branch-service.ts     # Branch operations interface
│   └── branch-types.ts       # Shared type definitions
├── media/               # Blog/LinkedIn content
│   ├── planning-post.md
│   └── linkedin-planning.md
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
services/session-state/src/log/
├── logService.ts           # MODIFY: implement branchFrom() (replaces stub from #071)
├── branchService.ts        # NEW: branch creation and link management logic
├── snapshotService.ts      # EXISTS (#074): snapshot chain navigation, state reconstruction
├── timeline.ts             # EXISTS (#071): timeline assembly (no changes expected)
├── types.ts                # MODIFY: add branch-specific types (BranchOrigin)
└── __tests__/
    ├── branchService.test.ts    # NEW: unit tests for branch operations
    └── logService.test.ts       # MODIFY: add branchFrom() integration test

apps/vscode/src/services/
├── stacService.ts          # MODIFY: add createBranchItem(), duplicate STAC Item logic

shared/schemas/
├── src/linkml/system-record.yaml   # EXISTS: BranchRecord already defined
└── fixtures/system-record/valid/
    ├── populated-system-record.json  # EXISTS: has branches example
    └── branched-system-record.json   # NEW: system record with branch records and origin
```

**Structure Decision**: This feature adds a `branchService.ts` module to the existing session-state Log Service directory, following the same pattern as `snapshotService.ts` from #074. The stacService gains one method for creating a new STAC Item for the branch plot.

## Media Components

None — backend/infrastructure feature. The branching system is a data service layer; UI elements (Log Panel "Branch from here" action) are part of the Log Panel feature.

## Storybook E2E Testing

None — no interactive UI components. This feature provides data APIs consumed by the Log Panel.

## Complexity Tracking

No violations — no complexity justification needed.
