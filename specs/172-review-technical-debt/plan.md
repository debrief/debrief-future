# Implementation Plan: Review Technical Debt

**Branch**: `172-review-technical-debt` | **Date**: 2026-03-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/172-review-technical-debt/spec.md`

## Summary

Address technical debt identified in the March 2026 review: align dependency versions across npm and Python packages, consolidate 25+ duplicated type definitions to canonical locations, fix Python workspace membership drift, add missing ESLint configurations, configure coverage thresholds, and break cross-layer architectural violations where service code imports from UI packages. No new features — this is a codebase hygiene pass that reduces confusion, prevents subtle bugs, and enforces architectural boundaries.

## Technical Context

**Language/Version**: Python 3.11, TypeScript 5.x (existing monorepo — no new languages)
**Primary Dependencies**: pnpm (npm workspace), uv (Python workspace), ESLint 8.x, ruff, pyright, pytest
**Storage**: N/A — configuration and type changes only
**Testing**: pytest (Python), vitest (TypeScript), Playwright E2E (existing — must not regress)
**Target Platform**: Cross-platform (Linux, macOS, Windows) — existing monorepo
**Project Type**: Monorepo refactoring — modifies files across shared/, services/, apps/
**Performance Goals**: N/A — no runtime behaviour changes
**Constraints**: All existing CI checks must continue to pass; no breaking changes to public APIs
**Scale/Scope**: ~50-80 files modified across the monorepo; 7 dependency version alignments, 19+ type definition removals, 4 new ESLint configs, 2 coverage thresholds, 3 Python workspace fixes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status | Notes |
|---|---|---|---|
| II. Schema Integrity | Single source of truth | **PASS** | Consolidating types to canonical locations *supports* this principle |
| IV. Architectural Boundaries | Services never touch UI | **PASS** | Breaking cross-layer imports directly *enforces* this principle |
| VI. Testing | Services require unit tests | **PASS** | Adding coverage thresholds *strengthens* testing |
| IX. Dependencies | Minimal, vetted dependencies | **PASS** | Aligning versions, not adding new dependencies |
| XIII. Contribution Standards | CI MUST pass | **PASS** | All changes validated through existing CI pipeline |
| XV. Strict Type Safety | Explicit types everywhere | **PASS** | Consolidating types reduces `unknown` and improves type safety |

**Post-Phase 1 Re-check**: All gates remain PASS. The design consolidates types to canonical shared packages and fixes import paths — fully aligned with constitutional principles. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/172-review-technical-debt/
├── plan.md              # This file
├── research.md          # Phase 0 output — 9 research questions resolved
├── data-model.md        # Phase 1 output — canonical type locations
├── quickstart.md        # Phase 1 output — verification commands
├── contracts/           # Phase 1 output — import path contracts
│   └── README.md        # Canonical import paths and prohibited patterns
├── checklists/
│   └── requirements.md  # Specification quality checklist
└── media/
    ├── planning-post.md
    └── linkedin-planning.md
```

### Source Code (repository root)

This feature modifies existing files across the monorepo. No new directories are created. Key modification targets:

```text
# Configuration files (dependency alignment, workspace fixes)
pyproject.toml                          # Add workspace members, align pydantic/ruff
ruff.toml                              # Add debrief_cli to known-first-party
apps/loader/package.json               # Align @storybook, eslint versions
apps/vscode/package.json               # Align @typescript-eslint, eslint versions
shared/schemas/pyproject.toml          # Align ruff version
services/stac/pyproject.toml           # Align pydantic, ruff versions
services/*/pyproject.toml              # Align pydantic versions

# ESLint configs (new files)
shared/config-ts/.eslintrc.cjs         # New
shared/utils/.eslintrc.cjs             # New
apps/web-shell/.eslintrc.cjs           # New
services/session-state/.eslintrc.cjs   # New

# Coverage thresholds
services/config/pyproject.toml         # Add [tool.coverage.report] fail_under
services/calc/pyproject.toml           # Add [tool.coverage.report] fail_under

# Type consolidation (many files)
shared/utils/src/types.ts              # Add MCPToolDefinition + related types
shared/utils/src/index.ts              # Re-export new types
services/session-state/src/types/temporal.ts  # Add converter utilities
apps/vscode/src/tools/**/*.ts          # Remove local GeoJSONFeature, import SafeFeature
apps/web-shell/src/tools/**/*.ts       # Remove local GeoJSONFeature, import SafeFeature
apps/vscode/src/services/*.ts          # Change imports from @debrief/components to @debrief/utils
apps/web-shell/src/services/toolService.ts  # Change relative vscode import to @debrief/utils

# Documentation
docs/technical-debt-assessment-guide.md  # Add sections 11-15, mark resolved items
docs/project_notes/decisions.md          # Document tsconfig module rationale
```

**Structure Decision**: No new project structure — this feature refactors across the existing monorepo layout. All changes are to existing packages and configuration files.

## Media Components

None — backend/infrastructure feature. No visual components are created or modified.

## Storybook E2E Testing

None — no interactive UI components.

## VS Code Webview E2E Testing

None — no extension workflow changes. Existing E2E tests must pass after refactoring (verified by `task verify`).

## Complexity Tracking

No constitution violations to justify. All changes directly support constitutional principles.
