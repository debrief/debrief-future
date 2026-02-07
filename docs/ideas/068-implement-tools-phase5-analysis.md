# Implement Phase 5 tools: track/analysis (8 tools)

## Problem

8 track/analysis tool specs exist with golden I/O but no implementations. These are the highest-complexity tools — TMA generation, track synthesis from sensor cuts, zig detection, and time-variable plotting. They represent Debrief's core analytical capability.

## Proposed Solution

Implement 8 tools in `services/calc/`:

**Medium complexity (1):** show-time-variable-plot

**High complexity (7):** generate-tma-from-infill, generate-tma-from-ownship, generate-tma-segment-from-cuts, generate-track-from-active-cuts, generate-tuas-solution, xy-plot-generator, zig-detector

## Success Criteria

- All 8 tools pass golden I/O fixtures
- TMA generation tools produce valid TMA_SEGMENT features
- Plot generation tools produce correct artifact responses
- Zig detector correctly identifies course change events

## Constraints

- Requires #062 (TMA_SEGMENT, TRACK_SEGMENT, TUAS_SOLUTION FeatureKindEnum values)
- Requires Phase 1 (measurement tools) and Phase 4 (sensor tools) as building blocks
- TMA tools may need numpy for matrix operations and least-squares fitting
- This is the highest-risk phase — most complex algorithms with most dependencies
