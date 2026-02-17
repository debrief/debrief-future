# Implementation Plan: Track-Position to Track Range/Bearing Tool Spec

**Branch**: `claude/speckit-start-055-D5c9W` | **Date**: 2026-02-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/055-track-position-range-bearing/spec.md`

## Summary

Create a language-neutral tool specification for a position-level range/bearing measurement tool following the #049 tool documentation model. The tool measures the range (nautical miles) and bearing (degrees) from a selected track position to the closest-in-time position on a second track, using snap-to-nearest temporal matching and Haversine/great-circle math. Deliverables: markdown spec, two golden I/O fixture pairs.

## Technical Context

**Language/Version**: N/A — this is a language-neutral specification (pseudocode only). Implementations will be Python 3.11 and TypeScript 5.x.
**Primary Dependencies**: #049 tool documentation template (`shared/tools/TEMPLATE.md`), #053 nested child selection model, existing math in `range_bearing.py`
**Storage**: N/A — pure computation tool, no persistence (caller handles display/storage)
**Testing**: Golden I/O JSON fixtures for cross-language validation
**Target Platform**: Spec document consumed by implementers (Python debrief-calc, TypeScript VS Code extension, web-shell)
**Project Type**: Tool specification — markdown + JSON fixtures in `shared/tools/track/measurement/`
**Performance Goals**: N/A — single-shot measurement, sub-millisecond computation
**Constraints**: Must follow #049 template; Haversine/great-circle math; snap-to-nearest (no interpolation); offline-only; standard library math only
**Scale/Scope**: 1 tool spec + 2 golden example pairs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Relevant? | Status | Notes |
|---------|-----------|--------|-------|
| I. Defence-Grade Reliability | Yes | PASS | Offline-only, standard library math, no network, reproducible results |
| II. Schema Integrity | Yes | PASS | References FeatureCollection schema; uses established ToolResponse format |
| III. Data Sovereignty | Yes | PASS | Provenance annotations record source features; no data modification |
| IV. Architectural Boundaries | Yes | PASS | Tool returns data only (measurement artifact); no UI concerns |
| V. Extensibility | Yes | PASS | Follows standard tool registration pattern via `@tool` decorator |
| VI. Testing | Yes | PASS | Golden I/O fixtures define expected behaviour; cross-language validation |
| VII. Test-Driven AI Collaboration | Yes | PASS | Golden examples define "done"; spec written before implementation |
| VIII. Documentation | Yes | PASS | Spec is the primary deliverable — documentation-first approach |
| IX. Dependencies | Yes | PASS | Standard library `math` only — no external dependencies |
| X. Security | N/A | PASS | No secrets, no network, no file I/O |
| XI. Internationalisation | Marginal | PASS | Provenance labels in English; i18n deferred |

**Gate Result**: PASS — no violations.

**Post-Phase 1 Re-check**: PASS — design artifacts confirm no new violations. Data model uses established ToolResponse patterns. No new dependencies introduced.

## Project Structure

### Documentation (this feature)

```text
specs/055-track-position-range-bearing/
├── spec.md              # Feature specification (done)
├── plan.md              # This file
├── research.md          # Phase 0 output (done)
├── data-model.md        # Phase 1 output (done)
├── quickstart.md        # Phase 1 output (done)
├── checklists/
│   └── requirements.md  # Spec quality checklist (done)
└── tasks.md             # Task breakdown (/speckit.tasks — not created by /speckit.plan)
```

### Tool Specification

```text
shared/tools/track/measurement/
├── position-range-bearing.1.0.md                        # Tool specification (9 sections)
├── position-range-bearing.basic.input.json              # Golden example: temporal match + measurement
├── position-range-bearing.basic.output.json             # Golden example: ToolResponse with range/bearing
├── position-range-bearing.single-position.input.json    # Golden example: single-position second track
└── position-range-bearing.single-position.output.json   # Golden example: forced match result
```

**Structure Decision**: Placed alongside existing measurement tools in `shared/tools/track/measurement/`. The tool name `position-range-bearing` distinguishes it from the whole-track `range-calc` and `bearing-calc` tools while clearly indicating it operates at position granularity.

## Media Components

None — this is a tool specification (documentation), not a visual component. No Storybook stories.

## Storybook E2E Testing

None — no interactive UI components. The tool will appear in the VS Code tools sidebar and web-shell Run dropdown via ToolMatchService when implemented, but those are existing UI components.

## Complexity Tracking

No violations to justify — all constitution gates pass cleanly.
