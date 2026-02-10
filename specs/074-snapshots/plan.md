# Implementation Plan: Snapshots with Doubly-Linked Chain

**Branch**: `074-snapshots` | **Date**: 2026-02-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/074-snapshots/spec.md`

## Summary

Implement clean-state snapshot checkpoints for analytical plots, linked via a doubly-linked chain through system records. Snapshots strip Log entries from spatial features, store clean GeoJSON as STAC assets, and maintain bidirectional navigation links. The Log Service gains `createSnapshot()`, `loadSnapshotHistory()`, and cross-snapshot timeline assembly. The Log Panel gains "Show earlier history" boundary indicators and on-demand lazy loading of previous snapshot entries.

## Technical Context

**Language/Version**: TypeScript 5.x (Log Service in session-state package, VS Code extension stacService)
**Primary Dependencies**: Existing Log Service (#071), stacService, session-state Zustand store, Node.js `fs/promises`, `crypto.randomUUID()`
**Storage**: Local filesystem — GeoJSON files within STAC Item directories (read/write via stacService)
**Testing**: Vitest (session-state unit tests), manual integration tests via VS Code extension
**Target Platform**: VS Code extension (Node.js runtime), web-shell (browser)
**Project Type**: Monorepo workspace — session-state package + VS Code extension stacService
**Performance Goals**: Snapshot creation < 500ms for plots with 100 features; lazy loading indicator renders without reading snapshot files
**Constraints**: Offline-capable (no network), atomic snapshot creation (no partial state on failure), existing #071 tests must pass without modification
**Scale/Scope**: Chains up to ~50 snapshots per plot (analyst sessions); GeoJSON files up to ~50MB for large exercises

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status | Notes |
|---------|------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | All operations local filesystem; no network calls |
| I. Defence-Grade Reliability | No silent failures | PASS | Atomic snapshot creation: fail explicitly, no partial state |
| II. Schema Integrity | Single source of truth | PASS | System record schema defined in LinkML (`system-record.yaml`); TypeScript types derived |
| II. Schema Integrity | Schema tests mandatory | PASS | Golden fixtures exist for system record; snapshot fixtures will be added |
| III. Data Sovereignty | Provenance always | PASS | Snapshot creation recorded as file-level provenance entry on system record |
| III. Data Sovereignty | Source preservation | PASS | Snapshots are additive assets; original source files never modified |
| III. Data Sovereignty | Audit trail immutable | PASS | Snapshot chain is append-only; snapshots cannot be deleted or modified |
| IV. Architectural Boundaries | Services never touch UI | PASS | Log Service returns data; Log Panel (separate feature) handles display |
| IV. Architectural Boundaries | Frontends never persist | PASS | All writes via stacService; no direct frontend file I/O |
| VI. Testing | Services require unit tests | PASS | Unit tests for snapshot creation, chain maintenance, cross-snapshot timeline |
| IX. Dependencies | Minimal, vetted dependencies | PASS | No new dependencies; uses existing stacService and session-state |
| XIV. Pre-Release Freedom | Breaking changes permitted | PASS | Pre-v4.0.0; snapshot chain format can evolve |

**Gate result**: ALL PASS — no violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/074-snapshots/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 research findings
├── data-model.md        # Entity model and state transitions
├── quickstart.md        # Implementation guide
├── contracts/           # API contracts
│   ├── snapshot-service.ts    # Snapshot operations interface
│   └── snapshot-types.ts      # Shared type definitions
├── media/               # Blog/LinkedIn content
│   ├── planning-post.md
│   └── linkedin-planning.md
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
services/session-state/src/log/
├── logService.ts           # MODIFY: implement createSnapshot(), loadSnapshotHistory()
├── snapshotService.ts      # NEW: snapshot creation and chain management logic
├── timeline.ts             # MODIFY: extend for cross-snapshot timeline assembly
├── types.ts                # MODIFY: add snapshot-related types (SnapshotLinks, etc.)
└── __tests__/
    ├── snapshotService.test.ts   # NEW: unit tests for snapshot operations
    └── timeline.test.ts          # MODIFY: add cross-snapshot dedup tests

apps/vscode/src/services/
├── stacService.ts          # MODIFY: add writeSnapshotAsset(), loadSnapshotGeoJson()

shared/schemas/
├── src/linkml/system-record.yaml   # EXISTS: snapshotLinks already defined
└── fixtures/system-record/valid/
    ├── populated-system-record.json  # EXISTS: has snapshotLinks example
    └── snapshot-chain.json           # NEW: multi-snapshot chain fixture
```

**Structure Decision**: This feature extends the existing session-state Log Service module (`services/session-state/src/log/`) with snapshot-specific logic in a new `snapshotService.ts` file, following the established pattern of small focused modules with dependency injection. The stacService gains two methods for snapshot I/O.

## Media Components

None — backend/infrastructure feature. The snapshot system is a data service layer; UI elements (Log Panel integration) are part of #072.

## Storybook E2E Testing

None — no interactive UI components. This feature provides data APIs consumed by the Log Panel (#072).

## Complexity Tracking

No violations — no complexity justification needed.
