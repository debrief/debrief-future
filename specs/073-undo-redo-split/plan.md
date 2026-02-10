# Implementation Plan: Split Undo/Redo — UI-Only Undo, Data Changes via Log

**Branch**: `073-undo-redo-split` | **Date**: 2026-02-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/073-undo-redo-split/spec.md`

## Summary

Narrow the `StateSnapshot` interface from 12 fields to 10 by removing `featureCollectionUri` (data-change field) and `savePath` (metadata field). This ensures Ctrl+Z/Y only reverses UI display state (viewport, time, visibility, selection) while data changes are tracked by the Log Recording Service (#071). Also remove `featureCollectionUri` from `DIRTY_TRIGGER_FIELDS` since data-change dirty tracking is now handled by the Log Service's `markDirty()` callback.

## Technical Context

**Language/Version**: TypeScript 5.x (session-state package)
**Primary Dependencies**: Zustand ^5.0.0 (state management, existing)
**Storage**: In-memory only (undo stacks not persisted)
**Testing**: vitest ^1.0.0
**Target Platform**: VS Code extension webview (session-state is a shared package)
**Project Type**: Single package within pnpm monorepo
**Performance Goals**: Undo/redo operations < 16ms (60fps UI responsiveness)
**Constraints**: In-memory only, 50-step history limit, offline-capable
**Scale/Scope**: Single-user session state; 4 files modified, ~30 lines changed

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status | Notes |
|---------|------|--------|-------|
| I. Defence-Grade Reliability | Offline by default, no silent failures | PASS | No network access needed; undo still fails explicitly (empty stack = no-op) |
| II. Schema Integrity | Schema tests mandatory | N/A | No LinkML schema changes — StateSnapshot is a TypeScript-only interface |
| III. Data Sovereignty | Provenance always | PASS | Improves provenance — data changes move to Log (proper audit trail) instead of volatile undo stack |
| IV. Architectural Boundaries | Services never touch UI | PASS | Change is within session-state service; no UI code modified |
| VI. Testing | Services require unit tests | PASS | Existing 12 tests updated + 1 new snapshot field-count test |
| VII. Test-Driven AI | Tests before implementation | PASS | Existing test suite provides regression safety; new test defines expected snapshot shape |
| VIII. Documentation | Specs before code | PASS | Spec written and approved |
| IX. Dependencies | Minimal, vetted dependencies | PASS | No new dependencies added |
| XIV. Pre-Release Freedom | Breaking changes permitted | PASS | StateSnapshot narrowing is a breaking change to the type, acceptable pre-v4.0.0 |

**Pre-design gate**: PASS (all articles satisfied or N/A)

## Project Structure

### Documentation (this feature)

```text
specs/073-undo-redo-split/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (empty — no API contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
services/session-state/
├── src/
│   ├── store/
│   │   ├── index.ts                    # StateSnapshot interface, createSnapshot(), applySnapshot()
│   │   └── middleware/
│   │       └── dirty.ts                # DIRTY_TRIGGER_FIELDS
│   └── types/
│       └── index.ts                    # Exported StateSnapshot type alias
└── tests/
    └── unit/
        └── undo.test.ts                # Undo/redo test suite
```

**Structure Decision**: Existing single-package structure within the `services/session-state` workspace member. No new files created — only modifications to 4 existing files.

## Media Components

None — backend/infrastructure feature. No visual components, no Storybook stories.

## Storybook E2E Testing

None — no interactive UI components.

## Complexity Tracking

No constitution violations to justify. All gates pass cleanly.
