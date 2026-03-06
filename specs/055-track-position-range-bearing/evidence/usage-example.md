# Usage Example: Position Range Bearing Tool Spec

**Feature**: 055-track-position-range-bearing | **Date**: 2026-02-17

## How Implementers Use This Spec

This tool specification is consumed by implementers building the `position-range-bearing` tool in Python and TypeScript. The spec provides everything needed for implementation without additional clarification (SC-005).

## Implementation Guide

### Step 1: Read the Algorithm

The spec at `shared/tools/track/measurement/position-range-bearing.1.0.md` contains three pseudocode functions:

1. **`position_range_bearing()`** — main entry point with input validation, temporal matching, and response building
2. **`haversine_distance_nm()`** — Haversine great-circle distance returning nautical miles
3. **`initial_bearing_deg()`** — forward azimuth returning degrees [0, 360)

### Step 2: Implement in Python

```python
# Reference: services/calc/debrief_calc/tools/range_bearing.py
# The existing _calculate_range() and _calculate_bearing() functions
# use the same formulas specified in the tool spec.

@tool(
    name="position-range-bearing",
    description="Range and bearing from selected position to nearest-in-time position on another track",
    input_kinds=["TRACK"],
    output_kind="measurement/position_range_bearing",
    context_type=ContextType.MULTI,
    parameters=[
        {"name": "selected_position_index", "type": "integer", "required": True}
    ],
)
def position_range_bearing(context, params):
    selected_index = params["selected_position_index"]
    # ... temporal matching + Haversine + bearing ...
```

### Step 3: Validate Against Golden Examples

```bash
# Run the implementation against the golden input
python -c "
import json
from debrief_calc.tools.track.measurement.position_range_bearing import position_range_bearing

with open('shared/tools/track/measurement/position-range-bearing.basic.input.json') as f:
    input_data = json.load(f)

result = position_range_bearing(input_data)

with open('shared/tools/track/measurement/position-range-bearing.basic.output.json') as f:
    expected = json.load(f)

# Compare result to expected output (tolerance: 0.01 nm range, 0.1 deg bearing)
assert abs(result['range_nm'] - 3.57) < 0.01
assert abs(result['bearing_deg'] - 32.7) < 0.1
print('Golden example validation passed')
"
```

### Step 4: Register the Tool

Follow the Registration section in the spec to wire the tool into:
1. Python `debrief-calc` (via `@tool` decorator and `__init__.py` import chain)
2. TypeScript VS Code extension (via `MCPToolDefinition` export)
3. Web-shell (via `toolService.ts` registry)

## Key Design Decisions for Implementers

| Decision | Value | Rationale |
|----------|-------|-----------|
| Temporal matching | Snap-to-nearest (no interpolation) | Simpler, avoids assumptions about track trajectory between points |
| Tiebreaker | Earlier index (lower i) | Deterministic behaviour on equidistant matches |
| Earth radius | 3440.065 nm | Consistent with existing `range_bearing.py` |
| Range precision | 2 decimal places | Matches existing measurement tool convention |
| Bearing precision | 1 decimal place | Matches existing bearing-calc convention |
| Output format | Single measurement (not time series) | Differentiates from whole-track `range-bearing` tool |
