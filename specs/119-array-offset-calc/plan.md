# Implementation Plan: Array Offset Calculations

**Branch**: `119-array-offset-calc` | **Date**: 2026-04-10 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/119-array-offset-calc/spec.md`

## Summary

Implement three array centre calculation modes (PLAIN, WORM, MEASURED) that determine where bearing lines originate for towed-array sensors. PLAIN backtracks along the vessel's heading, WORM traces backward along the vessel's actual track path, and MEASURED interpolates from real measured positions. The calculations are implemented as pure functions in both TypeScript (for browser rendering) and Python (for server-side calc tools), integrated into the existing `prepareSensorContacts()` pipeline.

## Technical Context

**Language/Version**: Python 3.11, TypeScript 5.x  
**Primary Dependencies**: `@debrief/schemas` (TypeScript types), `debrief_schemas` (Pydantic models), existing `sensor-utils.ts` and `temporal-utils.ts` (rendering pipeline)  
**Storage**: N/A (calculation-only, reads from existing GeoJSON/STAC data)  
**Testing**: vitest (TypeScript), pytest (Python), cross-language golden fixtures  
**Target Platform**: Browser (TypeScript via esbuild), Linux server (Python)  
**Project Type**: Cross-cutting (shared components + calc service)  
**Performance Goals**: 1000 contacts recalculated within 1 second  
**Constraints**: Offline-capable (no network calls), geodesic accuracy within 1 metre for offsets up to 1000m  
**Scale/Scope**: Typically 10-500 contacts per sensor, offsets 100-1000m, track fixes at 1-60 second intervals

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I.1 Offline by default | All calculation runs locally, no network | PASS | Pure math functions, no external calls |
| I.4 Reproducibility | Same inputs → same outputs | PASS | Deterministic geodesic math; cross-language golden tests ensure parity |
| II.1 Single source of truth | Schema types from LinkML | PASS | Consumes existing `SensorData`, `SensorContact` from generated schemas |
| III.1 Provenance | Transformations record lineage | N/A | Calculation produces ephemeral render data, not persisted outputs |
| III.2 Source preservation | Original data not modified | PASS | Read-only computation; origin computed on the fly, not written to data |
| IV.1 Services never touch UI | Python returns data only | PASS | Python calculates coordinates; TypeScript renders them |
| IV.3 Zero MCP dependency | Domain logic in pure Python | PASS | Array offset functions are pure Python; MCP wraps existing tools |
| VI.2 Services require tests | Unit tests for calc | PASS | Both Python and TypeScript test suites planned |
| VII.1 Tests before implementation | Tests defined in tasks | PASS | Golden fixtures and expected outputs defined before implementation |
| VIII.1 Specs before code | Specification written | PASS | spec.md, research.md, this plan |
| IX.1 Minimal dependencies | No new external deps | PASS | Uses stdlib math only (haversine formula) |
| XV.1 Explicit types | All functions typed | PASS | TypeScript strict mode; Python type annotations + pyright |
| XV.2 No Any/any | Concrete types throughout | PASS | Input/output types well-defined: coordinates, numbers, enums |

No constitution violations. No complexity tracking needed.

## Project Structure

### Documentation (this feature)

```text
specs/119-array-offset-calc/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 research output
├── data-model.md        # Phase 1 data model
├── quickstart.md        # Phase 1 quickstart guide
├── contracts/           # Phase 1 API contracts
│   └── array-offset.md  # Function signatures and I/O contracts
└── tasks.md             # Phase 2 task breakdown (created by /speckit.tasks)
```

### Source Code (repository root)

```text
shared/components/src/MapView/
├── array-offset.ts                    # NEW: Array centre calculation functions
├── array-offset.test.ts               # NEW: Unit tests for array offset calculations
├── sensor-utils.ts                    # MODIFIED: prepareSensorContacts() calls computeArrayCentre()
└── sensor-utils.test.ts               # MODIFIED: Add tests for offset-aware origin computation

services/calc/debrief_calc/tools/sensor/
├── array_offset.py                    # NEW: Python array offset calculations (parity with TS)
└── __init__.py                        # MODIFIED: Export array offset functions

services/calc/tests/tools/sensor/
├── test_array_offset.py               # NEW: Python unit tests
└── test_array_offset_parity.py        # NEW: Cross-language golden test validation

shared/schemas/src/fixtures/valid/
├── track-feature-sensors-measured-01.json  # EXISTS: MEASURED mode fixture
└── track-feature-array-offset-01.json      # NEW: Multi-mode test fixture with expected outputs
```

**Structure Decision**: This is a cross-cutting feature touching both `shared/components` (TypeScript rendering) and `services/calc` (Python calculation tools). No new top-level directories are needed. The array offset module is co-located with existing sensor utilities in both languages.

## Media Components

None - backend/infrastructure feature. Array offset calculations are pure computation with no visual components of their own. The visual effect (bearing line origins shifting) is rendered by the existing `SensorBearingLayer` from #118.

## Storybook E2E Testing

None - no interactive UI components. The array offset calculations modify data passed to existing rendering components but do not introduce new visual components.

## VS Code Webview E2E Testing

None - no extension workflow changes. The calculation runs transparently within the existing sensor rendering pipeline.

## Complexity Tracking

No constitution violations to justify.
