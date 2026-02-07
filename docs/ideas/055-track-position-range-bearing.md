# Track-Position to Track Range/Bearing Tool Spec

## Problem

When an analyst selects a single position on a track, there is no tool to measure the range and bearing from that position to the closest-in-time point on another track. The existing `range_bearing` tool operates on whole tracks (multi-feature time series), but doesn't support the granular "single position to single measurement" use case enabled by nested child selection (#053).

## Proposed Solution

Create a **language-neutral tool specification** (following the #049 tool documentation model) for a new calc tool:

- **Input**: A selected track-position (via path like `track-001/positions/4`) + a second track
- **Operation**: Find the position on the other track with the closest timestamp to the selected position (snap to nearest recorded point — no interpolation)
- **Output**: Single measurement result containing range (nautical miles) and bearing (degrees), plus metadata identifying which position on the other track was matched

This is one of two related tools (the other being a track-to-point distance time-series tool, captured separately).

## Success Criteria

- Language-neutral tool spec following `049-tool-documentation-model` template (9 required sections)
- Golden I/O examples with `.input.json` and `.output.json` fixtures
- Spec covers edge cases: no temporal overlap, single-point tracks, identical timestamps
- Uses existing Haversine/bearing math from `range_bearing.py` (algorithm section references these)
- Input schema requires nested child selection path for the track-position

## Constraints

- Must follow the tool documentation model from #049 (currently implementing)
- Snap-to-nearest semantics only (no interpolation between positions)
- Output is a single measurement, not a time series or geometry
- Reuses existing great-circle math (Haversine for range, spherical trig for bearing)
- Must work offline (CONSTITUTION Art. I)

## Out of Scope

- Track-to-point distance time-series tool (separate backlog item)
- Linear interpolation between bracketing positions
- Connecting line geometry in output
- Python/TypeScript implementation (spec only — implementation via `/tool.implement`)
