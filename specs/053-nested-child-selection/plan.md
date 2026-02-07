# Implementation Plan: Nested Child Selection

**Branch**: `053-nested-child-selection` | **Date**: 2026-02-07 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/053-nested-child-selection/spec.md`

## Summary

Extend the existing flat selection model so that `featureIds` can contain **path strings** identifying child elements at arbitrary nesting depth (e.g., `track-001/positions/4` or `track-001/segments/leg-alpha/positions/3`). The approach uses RFC 6901 escaping conventions, a shared level registry, leaf-only semantics, and full backward compatibility — a single-segment path is identical to a flat feature ID.

## Technical Context

**Language/Version**: TypeScript 5.x (session-state package, VS Code extension, shared components), Python 3.11 (LinkML schemas, Pydantic models)
**Primary Dependencies**: Zustand (state management), React 18.x (shared components), Leaflet 1.9.x (map rendering), LinkML (schema source), VS Code Extension API ^1.85.0
**Storage**: In-memory Zustand store (session state); no persistent storage changes
**Testing**: vitest (TypeScript unit + integration), pytest (Python schema adherence)
**Target Platform**: VS Code extension (desktop), Electron (Loader app)
**Project Type**: Monorepo with multiple packages (services/session-state, shared/components, shared/schemas, apps/vscode)
**Performance Goals**: Selection state update < 16ms (single frame budget); no degradation at 4+ nesting levels
**Constraints**: Offline-capable (Constitution I.1), backward compatible with flat selection model, no new external dependencies
**Scale/Scope**: Tracks with hundreds of positions, selections spanning multiple tracks simultaneously

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | Selection is purely local in-memory state |
| I.3 | No silent failures | PASS | Path validation (FR-009) ensures malformed paths are caught |
| II. Schema Integrity | Single source of truth | PASS | LevelDefinition added to LinkML schema; types generated |
| II.2 | Schema tests mandatory | PASS | Golden fixtures + round-trip tests specified |
| III. Data Sovereignty | Provenance always | N/A | Selection is ephemeral UI state, not persisted data |
| IV. Architectural Boundaries | Services never touch UI | PASS | Path utilities are in session-state (service layer); UI rendering is in shared/components |
| IV.3 | Services have zero MCP dependency | PASS | Path logic is pure TypeScript; MCP wrapper unchanged |
| V. Extensibility | Fail-safe loading | PASS | Unresolvable paths retained, not crashing |
| VI. Testing | Services require unit tests | PASS | Path utilities + store actions fully unit tested |
| VI.3 | Integration tests for workflows | PASS | Map click → path selection → tool matching tested |
| VII. Test-Driven AI | Tests before implementation | PASS | Golden fixtures and acceptance scenarios defined in spec |
| VIII. Documentation | Specs before code | PASS | This plan + spec exist before implementation |
| IX. Dependencies | Minimal dependencies | PASS | No new external dependencies; path utilities use stdlib only |
| X. Security | No secrets in code | N/A | No credentials involved |
| XI. Internationalisation | I18N from the start | N/A | Selection paths are internal identifiers, not user-facing strings |
| XIV. Pre-Release Freedom | Breaking changes permitted | NOTED | Extending `featureIds` semantics is non-breaking, but XIV applies if needed |

**Gate result**: PASS — no violations.

**Post-Phase 1 re-check**: PASS — design artifacts confirm all gates remain satisfied. No new dependencies introduced; schema extended via LinkML (II.1); all consumers updated incrementally.

## Project Structure

### Documentation (this feature)

```text
specs/053-nested-child-selection/
├── plan.md              # This file
├── research.md          # Phase 0: research decisions
├── data-model.md        # Phase 1: entity definitions
├── quickstart.md        # Phase 1: developer quickstart
├── contracts/           # Phase 1: API contracts
│   ├── selection-path.ts     # Path utility API
│   ├── store-actions.ts      # Store action changes
│   ├── message-protocol.ts   # Webview message changes
│   └── golden-fixtures.json  # Test fixtures
└── tasks.md             # Phase 2: implementation tasks (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
services/session-state/
├── src/
│   ├── types/
│   │   └── features.ts          # FeatureSelection (semantics widened)
│   ├── utils/
│   │   └── selectionPath.ts     # NEW: path parse/validate/build utilities
│   ├── store/
│   │   └── slices/
│   │       └── features.ts      # Store actions (semantics widened)
│   └── server/
│       └── tools/
│           └── setSelection.ts  # MCP tool (paths pass through)
└── tests/
    └── utils/
        ├── selectionPath.test.ts        # Unit tests
        └── selectionPath.golden.test.ts # Golden fixture tests

shared/schemas/
└── src/
    └── linkml/
        └── session-state.yaml   # LevelDefinition, AddressingMode added

shared/components/
└── src/
    ├── MapView/
    │   └── MapView.tsx          # Selection highlighting for child paths
    └── hooks/
        └── useSelection.ts      # Support path-based selection

apps/vscode/
└── src/
    ├── webview/
    │   ├── messages.ts          # Message protocol updated
    │   └── web/
    │       └── mapView.tsx      # Child-element click detection
    └── services/
        └── toolMatchAdapter.ts  # Root extraction for tool matching
```

**Structure Decision**: This feature touches four existing packages in the monorepo. No new packages are created. The core addition is `selectionPath.ts` utilities in the session-state service; all other changes are incremental updates to existing files.

## Media Components

None — this feature modifies internal selection state management and existing map highlighting. No new visual components are introduced. Selection highlighting changes are visual but modify existing components rather than creating new ones; a Storybook story update may be warranted but does not constitute a standalone demo component.

## Storybook E2E Testing

None — no new interactive UI components. Existing MapView and FeatureList stories may need minor updates to demonstrate path-based selection, but these are updates to existing stories, not new E2E test targets.

## Complexity Tracking

No constitution violations to justify.
