# Implementation Plan: Buffer Zone Generator

**Branch**: `080-buffer-zone-generator` | **Date**: 2026-02-12 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/080-buffer-zone-generator/spec.md`

## Summary

Implement a `buffer-zone-generator` calc tool that takes a single track feature and produces 3 concentric buffer polygons at 3 nm (75%), 6 nm (50%), and 12 nm (25%) using a swappable stub sensor model. The tool uses Vincenty destination formula (same as move-shape) to offset track vertices at 36 bearings, then computes convex hulls to form valid GeoJSON Polygon features. Result type is `addition/feature` with full provenance annotations.

## Technical Context

**Language/Version**: Python 3.11
**Primary Dependencies**: pydantic >=2.0.0 (existing), stdlib `math` module only
**Storage**: N/A (stateless tool — caller handles STAC persistence)
**Testing**: pytest, pytest-cov
**Target Platform**: Linux (offline-capable, cross-platform)
**Project Type**: Single service (within `debrief-calc` uv workspace member)
**Performance Goals**: <2s for tracks up to 1,000 positions
**Constraints**: Offline-capable, no external geo libraries, stdlib math only, 1 nm = 1.852 km
**Scale/Scope**: Single track input, 3 zone polygon outputs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I. Defence-Grade Reliability | Offline by default, no silent failures, reproducible | PASS | No network, deterministic output, explicit errors |
| II. Schema Integrity | Schema tests mandatory | PASS | ZONE kind needs adding to FeatureKindEnum (via #062) |
| III. Data Sovereignty | Provenance always | PASS | Each zone links to source track via `debrief:sourceFeatures` |
| IV. Architectural Boundaries | Services return data only | PASS | Pure function returning GeoJSON features |
| V. Extensibility | Fail-safe, schema-compliant | PASS | Sensor model is swappable via Protocol |
| VI. Testing | Unit tests required | PASS | Tests for tool, sensor model, edge cases |
| VII. Test-Driven AI | Tests before implementation | PASS | Golden examples and test fixtures defined first |
| VIII. Documentation | Specs before code | PASS | Tool spec (9-section format) written as part of implementation |
| IX. Dependencies | Minimal, vetted | PASS | stdlib math only, no new dependencies |
| X. Security | No secrets in code | PASS | No credentials, no network calls |
| XI. Internationalisation | Externalisable strings | N/A | Tool labels are domain terms, not user-facing UI strings |
| XII. Community Engagement | Public progress | PASS | Planning post created |
| XIII. Contribution Standards | Atomic commits, PR review | PASS | Feature branch with PR |
| XIV. Pre-Release Freedom | Breaking changes OK | PASS | New feature, no backwards-compat concern |

**Post-design re-check**: All gates still PASS. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/080-buffer-zone-generator/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 research decisions
├── data-model.md        # Entity definitions
├── quickstart.md        # Developer quickstart
├── contracts/
│   └── tool-contract.md # MCP tool contract
├── checklists/
│   └── requirements.md  # Quality checklist
├── media/
│   ├── planning-post.md # Blog post draft
│   └── linkedin-planning.md # LinkedIn summary
└── tasks.md             # Task breakdown (created by /speckit.tasks)
```

### Source Code (repository root)

```text
services/calc/debrief_calc/tools/sensor/
├── __init__.py
└── detection/
    ├── __init__.py
    ├── buffer_zone_generator.py    # @tool decorated handler + convex hull logic
    └── sensor_model.py             # SensorModel Protocol + StubSensorModel

services/calc/tests/tools/sensor/
├── __init__.py
└── detection/
    ├── __init__.py
    ├── test_buffer_zone_generator.py  # Unit + edge case tests
    └── test_sensor_model.py           # Sensor model interface tests

shared/tools/sensor/detection/
└── buffer-zone-generator.1.0.md    # 9-section tool specification
```

**Structure Decision**: Follows the established nested directory pattern from `tools/shape/manipulation/move_shape.py`. The `sensor/detection/` subdomain groups detection-related tools, anticipating future real sensor model implementations.

## Media Components

None - backend/infrastructure feature. The buffer-zone-generator is a pure Python calc tool with no visual components or Storybook stories.

## Storybook E2E Testing

None - no interactive UI components. This is a backend service tool.

## Complexity Tracking

No constitution violations. No complexity justifications needed.
