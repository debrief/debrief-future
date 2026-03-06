# Implementation Plan: Enlarge Shape Tool Spec

**Branch**: `claude/speckit-start-057-SEg6u` | **Date**: 2026-02-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/057-enlarge-shape/spec.md`

## Summary

Create a language-neutral tool specification for a shape scaling (enlarge/shrink) tool, following the #049 tool documentation model. The deliverable is a Markdown specification file (`enlarge-shape.1.0.md`) with all 9 required sections and at least 3 golden I/O example pairs (`.input.json` / `.output.json`). No Python or TypeScript code is produced — this is a specification-only feature.

The tool scales annotation shapes (CIRCLE, RECTANGLE, LINE, TEXT, VECTOR) relative to an origin point by a multiplicative factor. The specification will live in `shared/tools/shape/manipulation/` alongside the existing `move-shape.1.0.md`.

## Technical Context

**Language/Version**: Markdown + JSON (specification documents, no executable code)
**Primary Dependencies**: #049 tool documentation model (TEMPLATE.md), #056 move-shape (sibling spec for reference patterns)
**Storage**: Filesystem only — Markdown spec + JSON golden example files in `shared/tools/shape/manipulation/`
**Testing**: Golden I/O validation (JSON comparison with floating-point tolerance)
**Target Platform**: N/A — specification documents consumed by future Python/TypeScript implementations
**Project Type**: Single (specification files only)
**Performance Goals**: N/A — spec only
**Constraints**: Offline-capable (Constitution Art. I), scaling in geographic coordinates (lat/lon), provenance required (Art. III)
**Scale/Scope**: 1 tool spec file (~300 lines), 3+ golden I/O example pairs (6+ JSON files)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|------------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | Spec requires offline operation, no network dependencies |
| I.4 Reproducibility | Same inputs → same results | PASS | Deterministic scaling algorithm (linear interpolation) |
| II. Schema Integrity | LinkML master schemas | PASS | Spec references existing `annotations.yaml` schema classes |
| III. Data Sovereignty | Provenance always | PASS | FR-008, FR-017 require provenance in every output |
| IV. Architectural Boundaries | Services never touch UI | PASS | Tool spec is a pure data transformation, no UI |
| VI. Testing | Services require unit tests | PASS | Golden I/O examples serve as test fixtures for future implementation |
| VII. Test-Driven AI | Tests before implementation | PASS | Golden examples define expected behavior before any code exists |
| VIII. Documentation | Specs before code | PASS | This IS the spec — code implementation is a separate future task |
| IX. Dependencies | Minimal, vetted | PASS | No external dependencies — standard library math only |
| XIII. Contribution Standards | Atomic commits | PASS | Single feature, single spec file + golden examples |

**Gate result: PASS** — No violations. All constitutional articles satisfied.

## Project Structure

### Documentation (this feature)

```text
specs/057-enlarge-shape/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file
├── research.md          # Phase 0: scaling algorithm research
├── data-model.md        # Phase 1: entity model for tool I/O
├── quickstart.md        # Phase 1: how to write and validate the spec
├── checklists/
│   └── requirements.md  # Spec quality checklist (completed)
└── media/
    ├── planning-post.md
    └── linkedin-planning.md
```

### Source Code (repository root)

```text
shared/tools/shape/manipulation/
├── move-shape.1.0.md                          # Existing sibling spec (reference)
├── move-shape.basic-polygon.input.json        # Existing golden example
├── move-shape.basic-polygon.output.json
├── move-shape.vector.input.json
├── move-shape.vector.output.json
├── enlarge-shape.1.0.md                       # NEW: Tool specification
├── enlarge-shape.basic-polygon.input.json     # NEW: Scale polygon 3x from centroid
├── enlarge-shape.basic-polygon.output.json
├── enlarge-shape.custom-origin.input.json     # NEW: Scale from explicit origin
├── enlarge-shape.custom-origin.output.json
├── enlarge-shape.noop.input.json              # NEW: Scale factor 1.0
└── enlarge-shape.noop.output.json
```

**Structure Decision**: Spec-only feature. All deliverables are Markdown and JSON files placed in the existing `shared/tools/shape/manipulation/` directory, following the exact conventions established by `move-shape.1.0.md`.

## Media Components

None — specification/infrastructure feature with no visual components.

## Storybook E2E Testing

None — no interactive UI components.

## Complexity Tracking

No violations to justify — all constitutional gates pass.
