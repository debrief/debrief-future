# Implementation Plan: Point-in-Zone Classifier

**Branch**: `claude/speckit-start-081-3Btda` | **Date**: 2026-02-17 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/081-point-in-zone-classifier/spec.md`

## Summary

Implement a point-in-zone classifier tool that classifies reference points (MultiPoint feature from #078) by testing each coordinate against concentric detection zone polygons (MultiPolygon feature from #080). Uses a ray-casting point-in-polygon algorithm with innermost-first zone priority. Updates per-point metadata with zone name and color, and adds a `pointColors` array for per-point rendering. Implemented in Python (debrief-calc) and TypeScript (web-shell + VS Code), registered in all three tool registries.

## Technical Context

**Language/Version**: Python 3.11 (service), TypeScript 5.x (frontends)
**Primary Dependencies**: stdlib only (math, copy, uuid); no external geometry libraries
**Storage**: N/A — stateless tool, caller handles STAC persistence via PROV system
**Testing**: pytest (Python), vitest/jest (TypeScript), golden example validation
**Target Platform**: Cross-platform (Linux, macOS, Windows) — runs offline
**Project Type**: Multi-workspace (services/calc + apps/web-shell + apps/vscode)
**Performance Goals**: Classify 10,000 points against 3 zones in < 1 second
**Constraints**: Offline-capable (Constitution I), no external dependencies (Constitution IX), stdlib only
**Scale/Scope**: Typical usage: 25-625 reference points, 3 zones. Max tested: 10,000 points.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | No network calls. Pure geometry. |
| I. Defence-Grade Reliability | No silent failures | PASS | Explicit errors for invalid input. |
| I. Defence-Grade Reliability | Reproducibility | PASS | Deterministic: same inputs → same output. |
| II. Schema Integrity | Schema compliance | PASS | Uses existing FeatureKindEnum, PointMetadataEntry. Extends metadata with zone/color (non-breaking). |
| III. Data Sovereignty | Provenance always | PASS | ToolResponse includes debrief:sourceFeatures, debrief:resultType, debrief:label. |
| IV. Architectural Boundaries | Services never touch UI | PASS | Returns data only (classified feature). Renderer interprets pointColors. |
| IV. Architectural Boundaries | Services have zero MCP dependency | PASS | Pure Python logic. @tool wrapper is thin MCP layer. |
| VI. Testing | Services require unit tests | PASS | Golden examples + unit tests for both languages. |
| VII. Test-Driven AI | Tests before implementation | PASS | Golden I/O examples already created. Tests define done. |
| VIII. Documentation | Specs before code | PASS | Tool spec and feature spec complete. |
| IX. Dependencies | Minimal dependencies | PASS | stdlib only. No shapely, no turf.js. |
| XIV. Pre-Release Freedom | Breaking changes permitted | N/A | Additive change only (new tool + metadata fields). |

**Gate Result**: ALL PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/081-point-in-zone-classifier/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Algorithm and technology decisions
├── data-model.md        # Entity definitions and relationships
├── quickstart.md        # Usage examples for Python and TypeScript
├── contracts/
│   └── tool-contract.yaml  # MCP tool interface contract
└── media/
    ├── planning-post.md    # Blog post draft
    └── linkedin-planning.md # LinkedIn summary
```

### Source Code (repository root)

```text
services/calc/debrief_calc/tools/
├── __init__.py                              # Add: from debrief_calc.tools.reference import classification
└── reference/
    ├── __init__.py                          # Add: from . import classification
    └── classification.py                    # NEW: point_in_zone_classifier()

services/calc/tests/tools/reference/
└── test_classification.py                   # NEW: pytest tests + golden example validation

apps/web-shell/src/tools/reference/classification/
├── pointInZoneClassifier.ts                 # NEW: toolDefinition + execute
├── pointInZoneClassifier.test.ts            # NEW: unit tests
└── index.ts                                 # NEW: barrel export

apps/web-shell/src/services/
└── toolService.ts                           # MODIFY: register pointInZoneClassifier

apps/vscode/src/tools/reference/classification/
├── pointInZoneClassifier.ts                 # NEW: toolDefinition + execute
└── index.ts                                 # NEW: barrel export

shared/tools/reference/classification/
├── point-in-zone-classifier.1.0.md          # Tool spec (already created)
├── point-in-zone-classifier.basic.input.json
├── point-in-zone-classifier.basic.output.json
├── point-in-zone-classifier.all-outside.input.json
└── point-in-zone-classifier.all-outside.output.json
```

**Structure Decision**: Follows existing tool organisation pattern. Python tool in `services/calc/debrief_calc/tools/reference/classification.py`, mirroring `reference/generation.py`. TypeScript in both `apps/web-shell` and `apps/vscode` under `tools/reference/classification/`. Three-way registration (Python @tool, TypeScript web-shell Map, VS Code barrel).

## Media Components

None — backend/infrastructure feature. The point-in-zone classifier is a pure data transformation tool with no visual UI components. Its visual effect (recolored points on the map) is rendered by the existing map component using the `pointColors` array — no new Storybook stories needed.

## Storybook E2E Testing

None — no interactive UI components. The tool's output is consumed by the existing map renderer which already has its own visual tests.

## Complexity Tracking

No violations to justify — all constitution checks pass.
