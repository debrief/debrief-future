# Implementation Plan: Plan PROV Logging Integration

**Branch**: `claude/add-plan-undo-1PFy3` | **Date**: 2026-02-08 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/069-plan-prov-logging/spec.md`

## Summary

Produce a transition plan document (`docs/architecture/prov-transition-plan.md`) that bridges the gap between the current codebase and the SRD provenance target defined in `docs/srd-prov-undo.md` and `docker/code-server/ux-log-panel.md`. The plan covers 7 areas: ToolResult contract expansion, Log Service design, undo/redo split, provenance schema migration, system record feature, phased implementation sequence, and session-state integration points.

This is a **documentation-only** feature. The deliverable is a single Markdown document with Mermaid diagrams. No code is implemented.

## Technical Context

**Language/Version**: Markdown (document authoring); references Python 3.11 and TypeScript 5.x codebases
**Primary Dependencies**: None (documentation only); references Pydantic v2, Zustand, LinkML, MCP SDK
**Storage**: N/A (Markdown files in repository)
**Testing**: Manual review against spec acceptance scenarios; section heading verification; dependency graph acyclicity check
**Target Platform**: N/A (developer reference document)
**Project Type**: Documentation
**Performance Goals**: N/A
**Constraints**: Must reference actual codebase paths (not hypothetical); must be self-contained enough for each phase to become a backlog item
**Scale/Scope**: Single Markdown document (~500-800 lines) covering 7 sections + dependency graph + breaking change inventory

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status | Notes |
|---------|------|--------|-------|
| I. Reliability | Plan must ensure offline-capable design | PASS | SRD design is fully offline; plan documents this |
| II. Schema Integrity | Any new schemas via LinkML single source of truth | PASS | Plan will specify LinkML as source for Log Entry schema |
| III. Data Sovereignty | Every transformation records lineage | PASS | This is the entire purpose of the plan |
| III. Immutable audit trail | Provenance records append-only | PASS | Plan specifies append-only entries with tune annotations |
| IV. Boundaries | Services never touch UI | PASS | Plan keeps Python stateless; Log Service is TypeScript |
| IV. Frontends never persist | Data writes through services | PASS | Plan routes persistence through stacService |
| VI. Testing | Tests required for service code | PASS | Plan will define test requirements for each phase |
| VIII. Documentation | Specs before code | PASS | This plan IS the spec-before-code for PROV implementation |
| IX. Dependencies | Minimal dependencies | PASS | No new external dependencies; Log Service uses stdlib + Zustand |
| XIV. Pre-Release Freedom | Breaking changes permitted | PASS | Plan leverages this for provenance schema replacement |

**Gate result**: ALL PASS. No violations. Proceeding to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/069-plan-prov-logging/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0: gap analysis findings
├── data-model.md        # Phase 1: entity inventory (current vs target)
├── quickstart.md        # Phase 1: how to read and use the transition plan
└── media/
    ├── planning-post.md     # Blog post draft
    └── linkedin-planning.md # LinkedIn summary
```

### Source Code (repository root)

```text
docs/architecture/
└── prov-transition-plan.md  # Main deliverable (created during /speckit.implement)
```

**Structure Decision**: This is a documentation-only feature. The single deliverable is a Markdown document in `docs/architecture/`. No source code directories are created or modified. The plan document itself will reference existing source paths in `services/calc/`, `services/session-state/`, `services/stac/`, `apps/vscode/`, and `shared/schemas/`.

## Media Components

None - backend/infrastructure feature (documentation only).

## Storybook E2E Testing

None - no interactive UI components.

## Complexity Tracking

No constitutional violations to justify.
