# Implementation Plan: Replay and Parameter Tuning

**Branch**: `076-replay-tune` | **Date**: 2026-02-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/076-replay-tune/spec.md`

## Summary

Add replay and parameter tuning capabilities to the Log Service and Log Panel. Analysts can edit parameters on past tool executions and the system automatically replays all subsequent operations with the new values. Complemented by "Revert to here" (permanent truncation) and "Revert this" (soft-delete with replay) operations. Cross-snapshot replay reconstructs state from the snapshot chain when tuning entries from earlier segments.

The implementation extends the existing Log Service stubs (`tuneEntry`, `revertTo`, `revertThis`) in the `session-state` package, adds a Replay Engine that re-invokes tools via the existing `calcService` MCP infrastructure, and extends the shared Log Panel components with inline parameter editing and revert affordances.

## Technical Context

**Language/Version**: TypeScript 5.x (session-state package, VS Code extension, shared components)
**Primary Dependencies**: Zustand ^5.0.0 (session-state store), React 18.x (shared components), VS Code Extension API ^1.85.0, existing `@debrief/session-state` (Log Service, Snapshot Service), existing `calcService` (MCP tool invocation), existing `stacService` (file I/O)
**Storage**: Local filesystem — GeoJSON files within STAC Item directories (read/write via stacService)
**Testing**: vitest (session-state unit tests), @playwright/test (Storybook E2E), manual VS Code integration
**Target Platform**: VS Code extension (desktop), Node.js runtime
**Project Type**: Multi-package workspace (session-state + shared-components + vscode extension)
**Performance Goals**: Replay of 10 operations within current segment < 5 seconds; cross-snapshot replay with progress indication
**Constraints**: Offline-capable (all tool invocations are local MCP), no network dependencies; replay must be cancellable with full state rollback
**Scale/Scope**: Typical analysis chains of 5-20 operations per segment; cross-snapshot chains of 3-5 segments

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I.1 Offline by default | All replay is local MCP invocation | PASS | No network access required |
| I.3 No silent failures | Replay halts on version mismatch, dependency failure, or tool error | PASS | FR-003, FR-007 require explicit halt+report |
| I.4 Reproducibility | Same inputs + tool version = identical results | PASS | Version matching enforced (FR-003) |
| II.1 Schema single source | Log entries conform to existing LinkML schema from #070 | PASS | No schema changes; uses existing TuneAnnotation type |
| III.1 Provenance always | Tune annotations preserve original + new values | PASS | FR-012 requires full audit history |
| III.2 Source preservation | Original artifacts preserved; new versions created alongside | PASS | FR-013 prevents overwriting |
| III.3 Audit trail immutable | Tune annotations append to existing entries; prior history intact | PASS | Append-only semantics preserved |
| IV.1 Services never touch UI | Replay Engine in session-state returns data only; UI in shared components | PASS | Clear boundary maintained |
| IV.2 Frontends never persist | All writes go through stacService | PASS | No direct file I/O from components |
| VI.2 Services require tests | Unit tests for Replay Engine, tune, revert logic | PASS | Planned in test strategy |
| VIII.1 Specs before code | This plan + spec.md exist before implementation | PASS | |
| IX.1 Minimal dependencies | No new external dependencies | PASS | Uses existing calcService, stacService |
| XI.1 I18N from start | User-facing strings externalisable | PASS | Follow existing strings.ts pattern in LogPanel |

**Result**: All gates pass. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/076-replay-tune/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── replay-engine.ts # Replay Engine interface contract
├── media/               # Phase 2 output
│   ├── planning-post.md
│   └── linkedin-planning.md
└── tasks.md             # Created by /speckit.tasks (NOT by /speckit.plan)
```

### Source Code (repository root)

```text
services/session-state/
├── src/
│   └── log/
│       ├── logService.ts          # Implement tuneEntry, revertTo, revertThis stubs
│       ├── replayEngine.ts        # NEW: Sequential tool re-invocation engine
│       ├── types.ts               # Extend with ReplayProgress, ReplayResult, SoftDeletedEntry
│       ├── timeline.ts            # Extend to handle soft-deleted entries
│       ├── snapshotService.ts     # Existing: used for cross-snapshot state loading
│       └── index.ts               # Export new Replay Engine types
└── tests/
    └── log/
        ├── replayEngine.test.ts   # NEW: Replay Engine unit tests
        ├── tuneEntry.test.ts      # NEW: Parameter tuning tests
        ├── revertTo.test.ts       # NEW: Revert-to-here tests
        └── revertThis.test.ts     # NEW: Soft-delete + replay tests

shared/components/
├── src/
│   └── LogPanel/
│       ├── ParameterEditor.tsx    # NEW: Type-specific inline parameter editing
│       ├── ReplayProgress.tsx     # NEW: Progress indicator during replay
│       ├── LogEntry.tsx           # MODIFY: Add tune/revert action affordances
│       ├── LogActionBar.tsx       # MODIFY: Wire Tune/Revert buttons to handlers
│       ├── types.ts               # MODIFY: Add onTune, onRevert callbacks
│       └── strings.ts             # MODIFY: Add replay/tune/revert strings
└── src/
    └── LogPanel/
        └── ParameterEditor.stories.tsx  # NEW: Storybook stories for editor

apps/vscode/
├── src/
│   ├── views/
│   │   └── logPanelView.ts        # MODIFY: Handle tune/revert messages, wire to Log Service
│   └── services/
│       └── calcService.ts         # EXISTING: Used by Replay Engine for tool re-invocation
└── src/
    └── webview/
        └── web/
            └── logPanel.tsx       # MODIFY: Forward tune/revert events to extension
```

**Structure Decision**: This feature spans three existing packages following the established architectural pattern: domain logic in `session-state`, UI components in `shared/components`, and VS Code integration in `apps/vscode`. No new packages are introduced.

## Media Components

*Storybook stories for the parameter editing and replay progress UI.*

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| ParameterEditor | `shared/components/src/LogPanel/ParameterEditor.stories.tsx` | `parameter-editor.js` | Type-specific inline parameter editing (numeric, duration, enum, boolean, string) |
| LogPanel (tuning) | `shared/components/src/LogPanel/LogPanel.stories.tsx` | `log-panel-tune.js` | End-to-end tune workflow: select entry, edit param, see replay progress |

**Inclusion Criteria Applied**:
- [x] New visual component (ParameterEditor)
- [x] Significant visual change (LogEntry with tune/revert affordances)
- [x] Interactive demo adds narrative value (parameter editing workflow)

**Bundleability Verified**:
- [x] Stories exist in Storybook (LogPanel stories already exist; new ones will be added)
- [x] Components render standalone (no app context required — shared components are framework-agnostic)
- [x] Reasonable bundle size expected (< 500KB)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/logpanel-parametereditorfloat--default`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `ParameterEditor.stories.tsx` | Rendering, type validation, value editing | light, dark, vscode | click to edit, enter value, validate, submit |
| `LogPanel.stories.tsx` (tune stories) | Tune workflow, revert confirmation | light, dark, vscode | select entry, click tune, edit param, confirm |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input
- [x] Accessibility attributes present (data-testid, aria-*)
- [x] Screenshots captured for evidence

**Test File Location**: `shared/components/e2e/ParameterEditor.spec.ts`

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=logpanel-parametereditor--float-input&globals=theme:light
/iframe.html?id=logpanel-parametereditor--float-input&globals=theme:dark
/iframe.html?id=logpanel-parametereditor--float-input&globals=theme:vscode
```

## Complexity Tracking

> No constitution violations to justify. All gates pass.
