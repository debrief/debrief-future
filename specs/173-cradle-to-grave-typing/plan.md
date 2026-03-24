# Implementation Plan: Cradle-to-Grave Typing

**Branch**: `173-cradle-to-grave-typing` | **Date**: 2026-03-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/173-cradle-to-grave-typing/spec.md`

## Summary

Enforce LinkML-generated types throughout the entire lifecycle of domain data — not just at service boundaries. Replace ~150 locations where `dict[str, Any]` (Python) and `Record<string, unknown>` / `as` casts (TypeScript) allow invalid property access to go undetected. Root cause: the `Feature = dict[str, Any]` type alias and tool functions that accept/return untyped dicts. The type guards and Pydantic models already exist; this work is about adoption, not creation.

## Technical Context

**Language/Version**: Python 3.11, TypeScript 5.x (existing monorepo — no new languages)
**Primary Dependencies**: debrief_schemas (Pydantic models), @debrief/schemas (TS types + unions.ts type guards), LinkML >= 1.7.0 (gen-typescript, gen-pydantic)
**Storage**: N/A — type signature changes only; no storage format changes
**Testing**: pytest (Python), vitest (TypeScript), Playwright E2E (must not regress); pyright strict, tsc strict
**Target Platform**: Cross-platform — existing monorepo
**Project Type**: Monorepo refactoring — modifies files across shared/, services/, apps/
**Performance Goals**: N/A — no runtime behaviour changes (Pydantic validation adds negligible overhead; already measured in feature 115)
**Constraints**: All existing CI checks must pass; no breaking changes to MCP wire format (JSON serialisation unchanged); gradual migration — tools can be migrated one at a time
**Scale/Scope**: ~150 locations across ~60 files; 14 Python tool functions, 10 TS tool functions, 10 featureProps.ts consumers, 30+ dict.get() access patterns, 9+ JSON.parse-as casts

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status | Notes |
|---|---|---|---|
| II. Schema Integrity | Single source of truth | **PASS** | This feature *enforces* single source of truth — eliminates hand-written duplicates, replaces `dict[str, Any]` with schema-derived types |
| IV. Architectural Boundaries | Services never touch UI | **PASS** | No boundary changes — only type annotations change |
| VI. Testing | Services require unit tests | **PASS** | Existing tests continue to pass; pyright/tsc catch new type errors at compile time |
| IX. Dependencies | Minimal, vetted dependencies | **PASS** | No new dependencies — uses existing debrief_schemas and @debrief/schemas |
| XIII. Contribution Standards | CI MUST pass | **PASS** | All changes validated through existing CI pipeline |
| XV. Strict Type Safety | Explicit types everywhere | **PASS** | This feature is a **direct implementation** of Article XV — eliminates `Any`, `unknown`, and untyped casts on domain data |

**Post-Phase 1 Re-check**: All gates remain PASS. The design uses existing type infrastructure (Pydantic models, TS type guards) without adding dependencies or changing architecture. This is the most constitution-aligned feature possible — it directly implements Articles II and XV.

## Project Structure

### Documentation (this feature)

```text
specs/173-cradle-to-grave-typing/
├── spec.md              # Feature specification (typing-fixes inventory)
├── plan.md              # This file
├── research.md          # Phase 0 output — 7 research questions resolved
├── data-model.md        # Phase 1 output — canonical type locations
├── quickstart.md        # Phase 1 output — verification commands
├── contracts/           # Phase 1 output — import path contracts
│   └── README.md        # Canonical imports and prohibited patterns
└── media/
    ├── planning-post.md
    └── linkedin-planning.md
```

### Source Code (repository root)

This feature modifies existing files across the monorepo. No new directories are created. Key modification targets:

```text
# Schema generation (Phase 0-1)
shared/schemas/src/linkml/debrief.yaml                    # Add session-state, tool-result imports
shared/schemas/src/generated/python/debrief_schemas/       # Regenerated (adds DebriefFeature union)
shared/schemas/src/generated/typescript/types.ts           # Regenerated (adds session-state types)
shared/schemas/src/generated/typescript/unions.ts          # May need new guards for session-state

# Python duplicate elimination (Phase 2)
services/calc/debrief_calc/models.py                       # Delete provenance/snapshot duplicates
services/session-state-py/src/debrief_session/types.py     # Replace with debrief_schemas imports

# Python tool retyping (Phase 3) — 14 files
services/io/src/debrief_io/types.py                        # Kill Feature = dict[str, Any]
services/calc/debrief_calc/tools/**/*.py                   # Retype all tool functions
services/calc/debrief_calc/result_builder.py               # Accept Pydantic models
services/calc/debrief_calc/executor.py                     # Fail-fast validation
services/calc/debrief_calc/provenance.py                   # Accept typed features
services/calc/debrief_calc/validation.py                   # Accept typed features

# TypeScript duplicate elimination (Phase 2) — 4 files
apps/vscode/src/types/plot.ts                              # Delete feature type duplicates
shared/utils/src/types.ts                                  # Delete PositionStyle duplicates
shared/components/src/LogPanel/types.ts                    # Delete provenance duplicates
apps/web-shell/src/services/toolService.ts                 # Delete LogEntry

# TypeScript tool retyping (Phase 3) — 10+ files
apps/vscode/src/tools/**/*.ts                              # Declare specific feature types
apps/vscode/src/utils/featureProps.ts                      # Eliminate escape hatch
apps/vscode/src/webview/mapPanel.ts                        # Eliminate as-unknown-as casts
apps/vscode/src/services/stacService.ts                    # Eliminate as-unknown-as casts
apps/vscode/src/services/calcService.ts                    # Add validation after JSON.parse

# TypeScript session-state migration (Phase 5)
services/session-state/src/types/*.ts                      # Replace with @debrief/schemas imports
```

**Structure Decision**: No new directories. All changes modify existing files to use existing generated types.

## Media Components

None - backend/infrastructure feature (type signature changes only, no visual components).

## Storybook E2E Testing

None - no interactive UI components.

## VS Code Webview E2E Testing

None - no extension workflow changes (only type annotations change; runtime behaviour is preserved).

## Complexity Tracking

No constitution violations to justify. This feature directly implements Articles II and XV.
