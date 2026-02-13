# Implementation Plan: Logical Result ID Registry

**Branch**: `087-logical-result-id-registry` | **Date**: 2026-02-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/087-logical-result-id-registry/spec.md`

## Summary

Build an in-memory registry within `@debrief/session-state` that maps stable logical result IDs to their current versioned file paths and emits change events on update. The registry consumes `RecordResult` output from the Log Service (#071), hydrates from STAC asset metadata on plot load, and provides per-ID and global subscriptions for downstream features like auto-refresh (#089). No new external dependencies. No file I/O. Pure synchronous in-memory state with callback-based notifications.

## Technical Context

**Language/Version**: TypeScript 5.x (session-state package, VS Code extension, web-shell)
**Primary Dependencies**: `@debrief/session-state` (Zustand store, Log Service types — existing), no new external dependencies
**Storage**: N/A — pure in-memory, not persisted. Reconstructed from STAC assets on plot load.
**Testing**: Vitest (session-state package test suite)
**Target Platform**: Node.js (VS Code extension), Browser (web-shell)
**Project Type**: Library module within existing `@debrief/session-state` workspace member
**Performance Goals**: All operations synchronous and O(1) lookup / O(n) scan. No measurable latency impact.
**Constraints**: Offline-capable (Constitution I.1), no external dependencies (Constitution IX.1), no file I/O in registry module
**Scale/Scope**: Typical plot has 1-20 result IDs; registry stores <100 entries per session.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I.1 | Offline by default | PASS | Pure in-memory, no network |
| I.3 | No silent failures | PASS | Unknown result IDs return undefined (explicit) |
| II.1 | Single source of truth (LinkML) | N/A | Registry is runtime state, not a schema entity |
| III.1 | Provenance always | N/A | Registry maps existing provenance data, does not create new records |
| IV.1 | Services never touch UI | PASS | Registry returns data only, no UI side effects |
| IV.2 | Frontends never persist | PASS | Registry does not persist; consumers handle STAC writes |
| IV.3 | Services have zero MCP dependency | PASS | No MCP involvement |
| V.3 | No vendor lock-in | PASS | No external dependencies |
| VI.2 | Services require unit tests | PASS | Full unit test suite planned |
| VII.1 | Tests before implementation | PASS | Test-first approach in task breakdown |
| VIII.1 | Specs before code | PASS | This specification + plan |
| IX.1 | Minimal, vetted dependencies | PASS | Zero new dependencies |
| XIV.1 | Pre-release freedom | PASS | Breaking changes permitted |

**Post-design re-check**: All gates still pass. The design introduces no new dependencies, no persistence, and no UI coupling.

## Project Structure

### Documentation (this feature)

```text
specs/087-logical-result-id-registry/
├── plan.md              # This file
├── research.md          # Phase 0 output — design decisions
├── data-model.md        # Phase 1 output — entity definitions
├── quickstart.md        # Phase 1 output — integration guide
├── contracts/           # Phase 1 output — TypeScript API contract
│   └── result-id-registry.ts
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
services/session-state/src/
├── registry/
│   ├── resultIdRegistry.ts    # Registry implementation (factory + logic)
│   ├── types.ts               # ResultIdMapping, ResultIdChangeEvent, callbacks
│   └── index.ts               # Public exports
├── log/
│   ├── types.ts               # Existing — LogEntry, RecordResult, ArtifactVersion
│   └── logService.ts          # Existing — no changes needed
└── index.ts                   # Updated — re-export registry types and factory

services/session-state/tests/
└── registry/
    ├── resultIdRegistry.test.ts   # Unit tests for registry
    └── hydration.test.ts          # Unit tests for STAC asset hydration

apps/vscode/src/
├── commands/
│   ├── executeTool.ts         # Modified — add registerFromRecordResult call
│   └── openPlot.ts            # Modified — add hydrateFromAssets call
└── extension.ts               # Modified — create registry instance, wire lifecycle
```

**Structure Decision**: New `registry/` module within existing `services/session-state/src/` package, following the same pattern as `log/`, `store/`. Integration changes in `apps/vscode/` are minimal — 3-4 lines per file.

## Media Components

None — backend/infrastructure feature. The Result ID Registry has no visual components, Storybook stories, or UI impact.

## Storybook E2E Testing

None — no interactive UI components.

## Complexity Tracking

No constitution violations. No complexity justifications needed.
