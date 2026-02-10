# Implementation Plan: Move Shape Tool Spec

**Branch**: `claude/move-shape-RoMbS` | **Date**: 2026-02-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/056-move-shape/spec.md`

## Summary

Create a language-neutral tool specification for the move-shape tool following the #049 tool documentation model. The deliverables are a markdown spec file with 9 required sections and at least 2 golden I/O example pairs. No code implementation — specification and fixtures only.

## Technical Context

**Language/Version**: Markdown (specification), JSON (golden fixtures) — no code implementation
**Primary Dependencies**: None — references #049 tool documentation model template (`shared/tools/TEMPLATE.md`)
**Storage**: Filesystem only (`shared/tools/shape/manipulation/`)
**Testing**: Golden I/O fixture validation (`.input.json` → `.output.json` pairs)
**Target Platform**: N/A — language-neutral specification
**Project Type**: Documentation — single directory with spec + fixtures
**Performance Goals**: N/A — specification only
**Constraints**: Must follow #049 template with all 9 sections; great-circle math (not planar)
**Scale/Scope**: 1 tool spec file + 2-3 golden example pairs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Relevant? | Status | Notes |
|---------|-----------|--------|-------|
| I. Defence-Grade Reliability | Yes | PASS | Offline-only operation, no network dependencies |
| II. Schema Integrity | Yes | PASS | References LinkML annotation schemas as input types |
| III. Data Sovereignty | Yes | PASS | Provenance annotations record direction + distance |
| IV. Architectural Boundaries | N/A | PASS | No code, specification only |
| V. Extensibility | N/A | PASS | Tool spec is inherently extensible via versioning |
| VI. Testing | Yes | PASS | Golden I/O examples serve as executable test fixtures |
| VII. Test-Driven AI Collaboration | Yes | PASS | Acceptance criteria defined in spec; golden examples are fixtures |
| VIII. Documentation | Yes | PASS | This feature IS the documentation (spec before code) |
| IX. Dependencies | Yes | PASS | No dependencies — great-circle math uses standard library only |
| X. Security | N/A | PASS | No secrets, no network |
| XI. Internationalisation | Marginal | PASS | Provenance labels are in English; i18n deferred to implementation |

**Gate Result**: PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/056-move-shape/
├── spec.md              # Feature specification (done)
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
└── quickstart.md        # Phase 1 output
```

### Source Code (repository root)

```text
shared/tools/shape/manipulation/
├── move-shape.1.0.md                        # Tool specification (9 sections)
├── move-shape.basic-polygon.input.json      # Golden example: polygon translation
├── move-shape.basic-polygon.output.json     # Golden example: polygon ToolResponse
├── move-shape.vector.input.json             # Golden example: vector translation
└── move-shape.vector.output.json            # Golden example: vector ToolResponse
```

**Structure Decision**: Single flat directory under `shared/tools/shape/manipulation/` following the existing tool spec convention (e.g., `shared/tools/track/styling/`). The `shape` category is new; `manipulation` subcategory groups geometric transformation tools.

## Media Components

None — backend/infrastructure feature. This is a documentation-only spec with no visual components.

## Storybook E2E Testing

None — no interactive UI components. This feature produces markdown and JSON fixtures only.

## Complexity Tracking

No violations to justify — all constitution gates pass cleanly.
