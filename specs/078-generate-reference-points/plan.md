# Implementation Plan: Generate Reference Points Tool

**Branch**: `078-generate-reference-points` | **Date**: 2026-02-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/078-generate-reference-points/spec.md`

## Summary

Implement the generate-reference-points tool — the first step of the E03 buffer zone analysis chain. The tool creates a grid or scatter pattern of GeoJSON Point features within a user-specified bounding box. Implementation spans Python (debrief-calc service) and TypeScript (VS Code extension + web-shell), both producing identical output for the same inputs. A cross-language deterministic PRNG (LCG) ensures scatter-pattern reproducibility across both languages.

## Technical Context

**Language/Version**: Python 3.11 (debrief-calc service), TypeScript 5.x (VS Code extension, web-shell)
**Primary Dependencies**: None beyond existing project dependencies — standard library `math` (Python), no new npm packages (TypeScript)
**Storage**: N/A — pure transformation tool; caller handles STAC persistence
**Testing**: pytest (Python unit tests), vitest (TypeScript unit tests)
**Target Platform**: Desktop (VS Code extension), browser (web-shell)
**Project Type**: Multi-workspace (existing uv + pnpm structure)
**Performance Goals**: N/A — generation of typical grids (< 10,000 points) is near-instantaneous
**Constraints**: Offline-capable (Art I.1), reproducible output (Art I.4), no external dependencies (Art IX.1)
**Scale/Scope**: Single tool with 2 patterns (grid, scatter); ~150 LOC Python, ~150 LOC TypeScript

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status |
|---------|------|--------|
| I.1 | Offline by default | PASS — pure geometry, no network |
| I.4 | Reproducibility | PASS — deterministic IDs + seeded PRNG |
| II.1 | Schema integrity | PASS — uses existing FeatureKind.POINT, LocationTypeEnum.REFERENCE |
| III.1 | Provenance always | PASS — executor auto-attaches PROV log entries |
| IV.1 | Services never touch UI | PASS — returns data only |
| IV.3 | Zero MCP dependency | PASS — pure Python library; MCP wrapper is thin |
| VI.2 | Services require unit tests | PASS — tests planned for both languages |
| VII.1 | Tests before implementation | PASS — golden examples written first |
| VIII.1 | Specs before code | PASS — spec already written |
| IX.1 | Minimal dependencies | PASS — stdlib only (math, random for LCG) |

**Post-design re-check**: All gates still pass. No new dependencies or patterns introduced.

## Project Structure

### Documentation (this feature)

```text
specs/078-generate-reference-points/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Technology decisions and rationale
├── data-model.md        # Entity definitions and validation rules
├── quickstart.md        # Usage examples for both languages
├── contracts/
│   └── tool-api.md      # MCP tool definition, Python & TypeScript API contracts
├── checklists/
│   └── requirements.md  # Specification quality checklist
├── media/
│   ├── planning-post.md # Blog post draft
│   └── linkedin-planning.md
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
# Tool specification + golden examples
shared/tools/reference/generation/
├── generate-reference-points.1.0.md              # Language-neutral tool spec
├── generate-reference-points.grid.input.json     # Golden example (grid)
├── generate-reference-points.grid.output.json
├── generate-reference-points.scatter.input.json  # Golden example (scatter)
└── generate-reference-points.scatter.output.json

# Python implementation (debrief-calc service)
services/calc/debrief_calc/tools/reference/
├── __init__.py
└── generation.py                                 # @tool decorated function

# Python tests
services/calc/tests/tools/reference/
├── __init__.py
└── test_generation.py                            # pytest unit tests

# TypeScript implementation (VS Code extension + web-shell)
apps/vscode/src/tools/reference/generation/
├── generateReferencePoints.ts                    # Tool definition + execute function
└── index.ts                                      # Barrel export

# TypeScript tests
apps/vscode/tests/unit/tools/reference/
└── generateReferencePoints.test.ts               # vitest unit tests
```

**Structure Decision**: Cross-workspace tool following existing patterns — Python in `services/calc/debrief_calc/tools/`, TypeScript in `apps/vscode/src/tools/`, golden examples in `shared/tools/`. Both implementations share the same `reference/generation` category path.

## Media Components

None — backend/infrastructure feature. The tool produces GeoJSON data (Point features) with no visual UI components. Points are rendered on the map by existing Leaflet layers.

## Storybook E2E Testing

None — no interactive UI components. The tool is a pure data generation function invoked via MCP or direct API call.

## Complexity Tracking

No violations — all constitution gates pass. No complexity justifications needed.
