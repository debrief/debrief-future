# Implement Phase 1 tools: track/measurement (19 tools)

## Problem

19 track/measurement tool specs exist with golden I/O fixtures but no Python implementations. These are the foundational calculation tools (range, bearing, course, speed, depth, time, doppler) that analysts use daily and that other tools depend on.

## Proposed Solution

Implement all 19 track/measurement tools in `services/calc/` as Python functions with MCP tool wrappers:

**Low complexity (12 tools):** range-calc, bearing-calc, course-calc, speed-calc, depth-calc, time-calc, doppler-calc, calculate-track-length, swt-range-calc, course-delta-average-calc, speed-delta-average-calc, delta-rate-calc

**Medium complexity (5 tools):** rel-bearing-calc, bearing-rate-calc, atb-calc, course-rate-calc, speed-rate-calc

**High complexity (2 tools):** course-delta-rate-rate-calc, speed-rate-rate-calc

Each implementation must:
- Accept GeoJSON FeatureCollection input per the spec's Inputs section
- Return ToolResponse envelope per the spec's Outputs section
- Pass all golden I/O fixtures within 1e-9 epsilon tolerance
- Follow the pseudocode algorithm in the spec

## Success Criteria

- All 19 tools pass their golden I/O fixtures
- MCP tool discovery exposes all 19 tools
- Tools work offline (no network dependencies)

## Constraints

- Requires #049 (tool documentation model) to be complete
- No schema extensions needed — measurement tools use existing TRACK kind
- Must follow existing debrief-calc service patterns

## Out of Scope

- VS Code UI integration (handled by #038)
- Tools from other categories (separate phases)
