# Implementation Plan: Task Build Management

**Branch**: `017-task-build` | **Date**: 2026-01-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/017-task-build/spec.md`

## Summary

Adopt Task (taskfile.dev) as the unified build orchestration tool for the debrief-future monorepo, replacing the existing Makefile. The implementation provides a single Taskfile.yml that orchestrates Python (uv) and TypeScript (pnpm) toolchains with dependency-aware caching for fast iteration.

## Technical Context

**Language/Version**: YAML (Taskfile.yml v3 syntax)
**Primary Dependencies**: Task v3.x (go-task/task), uv (Python), pnpm (Node.js)
**Storage**: N/A (configuration only)
**Testing**: Taskfile orchestrates existing test runners (pytest, vitest, vscode-test)
**Target Platform**: macOS, Linux, Windows (cross-platform)
**Project Type**: Infrastructure/configuration
**Performance Goals**: Cache hits < 5 seconds, warm test runs < 2 minutes
**Constraints**: Offline-capable, no cloud dependencies, single binary prerequisite
**Scale/Scope**: Single Taskfile.yml for entire monorepo (6 Python packages, 3 TS packages)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I.1 | Offline by default | ✅ PASS | Task is a local binary, no network required |
| I.2 | No cloud dependencies in core | ✅ PASS | No cloud services used |
| I.4 | Reproducibility | ✅ PASS | Cached builds produce identical outputs |
| VI.4 | CI must pass | ✅ PASS | CI will use same task commands as local |
| IX.1 | Minimal dependencies | ✅ PASS | Single binary, no runtime deps |
| IX.2 | Pinned versions | ✅ PASS | Task version can be pinned in CI workflow |
| IX.3 | No vendor lock-in | ✅ PASS | Task is OSS, Taskfile.yml is portable YAML |

**Gate Status**: ✅ PASSED - No violations detected

## Project Structure

### Documentation (this feature)

```text
specs/017-task-build/
├── plan.md              # This file
├── research.md          # Phase 0: Task best practices
├── data-model.md        # Phase 1: Taskfile structure
├── quickstart.md        # Phase 1: Developer onboarding
└── checklists/
    └── requirements.md  # Spec validation checklist
```

### Source Code (repository root)

```text
# Configuration files (new)
Taskfile.yml             # Main task definitions (replaces Makefile)

# Files to be removed
Makefile                 # Replaced by Taskfile.yml

# CI updates
.github/workflows/*.yml  # Update to use task commands
```

**Structure Decision**: Single Taskfile.yml at repository root. No sub-Taskfiles needed as all commands are orchestrated from root level using existing tooling (uv, pnpm).

## Media Components

None - backend/infrastructure feature

*This feature introduces build tooling configuration, not visual components. No Storybook stories apply.*

## Complexity Tracking

*No Constitution violations to justify.*
