# Implementation Plan: REP Sensor Import

**Branch**: `117-rep-sensor-import` | **Date**: 2026-04-10 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/117-rep-sensor-import/spec.md`

## Summary

Parse `;SENSOR:` (v1), `;SENSOR2:` (v2), `;SENSOR3:` (v3), and `;SENSORARC` lines from REP files and embed parsed sensor contacts into the parent TrackFeature's `properties.sensors[]` array using the SensorData/SensorContact schema. This replaces the existing annotation-based approach (which produces standalone GeoJSON features) with the DSF handler's `pending_sensor_data` pattern, where sensor contacts are grouped by track and sensor name, then merged into companion track features by the import pipeline. SENSORARC lines produce standalone DynamicTrackCoverage annotation features.

## Technical Context

**Language/Version**: Python 3.11
**Primary Dependencies**: Pydantic v2 (models), debrief_schemas (generated types), debrief_io (existing handler framework)
**Storage**: GeoJSON via STAC (existing pipeline -- no changes)
**Testing**: pytest, pytest-cov
**Target Platform**: Linux (CI), macOS/Windows (dev)
**Project Type**: Python service module (within uv workspace)
**Performance Goals**: REP files up to 10,000 lines parsed in under 1 second (spec SC-008)
**Constraints**: Offline-capable (no network), schema-conformant output
**Scale/Scope**: ~400 lines of new parsing code, ~200 lines of REP handler modifications, ~300 lines of test code

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|------------|--------|-------|
| I. Defence-Grade Reliability | Offline by default, no silent failures | PASS | Pure parsing logic, no network. Invalid lines produce warnings, never silent drops. |
| II. Schema Integrity | Schema tests mandatory | PASS | Output dicts conform to SensorContact/SensorData schema. Boolean presence flags included for forward compatibility with #116. |
| III. Data Sovereignty | Provenance always | PASS | Line numbers recorded in provenance. Source file path carried through ParseResult. |
| IV. Architectural Boundaries | Services never touch UI | PASS | Pure data transformation -- returns dicts, no display logic. |
| VI. Testing | Services require unit tests | PASS | Unit tests for each parser function + integration tests for full REP parse. |
| VII. Test-Driven AI Collaboration | Tests before implementation | PASS | Acceptance scenarios from spec define test cases. |
| VIII. Documentation | Specs before code | PASS | This plan + spec.md + research.md exist before implementation. |
| IX. Dependencies | Minimal, vetted dependencies | PASS | No new dependencies. Reuses existing parse_timestamp, parse_dms_coordinate, get_color. |
| XV. Strict Type Safety | Explicit types, no Any | PASS | ParsedSensorContact is a typed dataclass. Output dicts use typed fields. |

**Post-design re-check**: All gates still pass. No new dependencies introduced. No schema violations.

## Project Structure

### Documentation (this feature)

```text
specs/117-rep-sensor-import/
├── plan.md              # This file
├── research.md          # Phase 0 research findings
├── data-model.md        # Entity definitions and relationships
├── quickstart.md        # Usage examples and test commands
├── contracts/
│   └── sensor-parser-api.md  # Public API contract
├── checklists/
│   └── requirements.md  # Requirements checklist
└── media/
    ├── planning-post.md      # Blog planning post
    └── linkedin-planning.md  # LinkedIn summary
```

### Source Code (repository root)

```text
services/io/src/debrief_io/
├── handlers/
│   ├── rep.py                    # MODIFIED: intercept sensor lines, produce pending_sensor_data
│   ├── sensor_parser.py          # NEW: shared sensor line parsing functions
│   └── annotations/
│       ├── parser.py             # MODIFIED: remove SENSOR/SENSOR2 from prefixes
│       └── builders.py           # UNCHANGED (build_sensor/build_sensor2 retained for compatibility)
├── models.py                     # UNCHANGED (pending_sensor_data already exists)
├── symbology.py                  # UNCHANGED (reuse get_color, parse_color_code)
└── import_catalog.py             # UNCHANGED (pending_sensor_data merge already works)

services/io/tests/
├── test_sensor_parser.py         # NEW: unit tests for sensor_parser module
├── test_rep_handler.py           # MODIFIED: add sensor integration tests
└── fixtures/valid/
    ├── sensor_all_formats.rep    # NEW: test fixture with all 4 sensor formats
    └── sensor_edge_cases.rep     # NEW: test fixture for edge cases
```

**Structure Decision**: This feature adds one new module (`sensor_parser.py`) to the existing `services/io` package. The REP handler is modified in-place. No new packages or project structures are needed.

## Media Components

None - backend/infrastructure feature. No visual components, Storybook stories, or UI changes.

## Storybook E2E Testing

None - no interactive UI components.

## VS Code Webview E2E Testing

None - no extension workflow changes. The sensor data flows through the existing import pipeline, which the VS Code extension already consumes.

## Complexity Tracking

No constitution violations to justify. All articles pass cleanly.

## Design Decisions Summary

1. **New module `sensor_parser.py`** rather than inlining in `rep.py` -- keeps REP handler focused on track positions, sensor parsing is ~400 lines of separate concern (RQ-7).

2. **Adopt DSF handler's `pending_sensor_data` pattern** -- the import pipeline already supports merging sensor data into companion tracks, so no pipeline changes needed (RQ-1).

3. **Dict-based output** (not Pydantic models) -- matches the DSF handler's established pattern and allows forward-compatible fields before #116 schema lands (RQ-2).

4. **Remove SENSOR/SENSOR2 from annotation prefixes** -- REP handler intercepts sensor lines before they reach the annotation parser, eliminating standalone sensor features (RQ-8).

5. **Yards to metres conversion at parse time** -- schema uses metres; converting early ensures consistency with DSF-imported data (RQ-4).

6. **SENSORARC as standalone annotation** -- coverage zones are fundamentally different from bearing contacts; they follow the existing dynamic shape annotation pattern (RQ-6).

7. **Orphaned sensor data retained with warning** -- sensor data for tracks not in the file stays in `pending_sensor_data` for import pipeline to merge from companion files (RQ-9).
