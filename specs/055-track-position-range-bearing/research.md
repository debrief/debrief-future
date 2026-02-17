# Research: Track-Position to Track Range/Bearing Tool Spec

**Feature**: 055-track-position-range-bearing | **Date**: 2026-02-17

## Research Questions

### R1: What category path should the tool spec use?

**Decision**: `track/measurement`

**Rationale**: Existing measurement tools (range-calc, bearing-calc, course-calc, speed-calc, etc.) all live under `track/measurement/`. This new tool measures range and bearing between positions on two tracks — the same domain as range-calc and bearing-calc. The key difference is the input mechanism (a selected track-position via nested child selection path, rather than two whole tracks at a given time), but the output is still a measurement artifact.

**Alternatives considered**:
- `track/analysis` — reserved for tools that produce derived analysis features (e.g., CPA points, intercept solutions), not scalar measurements
- `track/position-measurement` — unnecessarily deep; the existing measurement tools already handle point-based calculations
- `position/measurement` — "position" is not an established top-level domain in the tool taxonomy

### R2: What result type path should the tool use?

**Decision**: `artifact/measurement/position_range_bearing`

**Rationale**: Following the ToolResponse naming convention from #041:
- Top type: `artifact` — producing a scalar measurement, not mutating features or creating new GeoJSON
- Domain: `measurement` — consistent with `artifact/measurement/range` (range-calc) and `artifact/measurement/bearing` (bearing-calc)
- Specific type: `position_range_bearing` — distinguishes from whole-track `range_bearing_series`

This follows the established pattern where measurement tools return artifacts rather than mutations.

**Alternatives considered**:
- `artifact/dataset/position_range_bearing` — "dataset" implies a series or collection; this is a single measurement
- `artifact/measurement/range_bearing` — too similar to the existing `dataset/range_bearing_series` from the whole-track tool; the "position_" prefix clarifies scope
- `mutation/track/range_bearing` — tool doesn't mutate any features

### R3: How should timestamps be compared for snap-to-nearest matching?

**Decision**: Compare absolute time difference in milliseconds (epoch ms). Take the position with the minimum `|selected_time - candidate_time|`. On ties, use the earlier position (lower index).

**Rationale**: Timestamps in the project are stored as epoch milliseconds in the `times` array (see `range_bearing.py` `_extract_times()`). Absolute difference is the simplest and most intuitive metric — it makes no assumption about whether the second track's positions are before or after the selected position.

**Alternatives considered**:
- Compare ISO 8601 strings — error-prone, requires parsing; epoch ms is already the internal format
- Use only forward-in-time matching — would miss the closest match if it's in the past
- Interpolate between bracketing positions — explicitly ruled out by the spec ("snap-to-nearest semantics only")

### R4: What is the input format for the selected track-position?

**Decision**: The tool receives two inputs:
1. The resolved position data from the first track: coordinates `[lon, lat]` and timestamp (epoch ms), extracted from the selection path (e.g., `track-alpha/positions/4`)
2. The second track as a full GeoJSON Feature (LineString with `times` array)

The tool algorithm does not perform selection path resolution itself — the caller (CalcService or frontend) resolves the path using the #053 nested child selection model and passes the resolved position data.

**Rationale**: Separation of concerns — path resolution is a session-state/selection concern, not a measurement concern. The existing range-calc and bearing-calc tools also receive pre-resolved position data via `get_position_at_time()`. Keeping the tool focused on measurement makes it testable with simple JSON fixtures.

**Alternatives considered**:
- Pass the full first track + selection path, let the tool resolve — adds coupling to the selection model; harder to test with golden fixtures
- Pass both resolved positions (skip the temporal matching) — would move the snap-to-nearest logic outside the tool, which is its core differentiator

### R5: What golden I/O examples are needed?

**Decision**: Two golden example pairs (minimum from SC-002):

1. **`position-range-bearing.basic.{input,output}.json`** — Selected position on track-alpha at [-1.0, 50.0] with timestamp 10:30:00Z. Track-bravo has 3 positions; the closest in time is at [-0.95, 50.05] at 10:31:00Z. Expected output: range ~3.67 nm, bearing ~32.8 degrees.

2. **`position-range-bearing.single-position.{input,output}.json`** — Selected position on track-alpha at [-1.0, 50.0]. Track-bravo has only 1 position (at a very different time). The single position is always matched. Tests the single-position edge case.

**Rationale**: The basic example validates the core algorithm (temporal matching + Haversine + bearing). The single-position example validates the key edge case. Together they cover the two most important scenarios. Coordinate values are chosen to match existing examples in range-calc and bearing-calc for consistency.

### R6: How should the tool handle the MCP input format?

**Decision**: Follow the existing FeatureCollection-based convention. The tool receives a FeatureCollection where:
- `features[0]`: the first track (containing the selected position, with selection metadata in `properties.tool`)
- `features[1]`: the second track
- `properties.tool.params.selected_position_index`: the index into features[0]'s coordinates/times arrays

The `properties.tool` convention is already used by range-calc and bearing-calc for passing time and units.

**Rationale**: Consistent with existing MCP tool input patterns. The CalcService resolves the selection path to an index before invoking the tool.

**Alternatives considered**:
- Separate parameters outside FeatureCollection — breaks the pattern; MCP tools receive a single FeatureCollection
- Inline the resolved coordinates in params — loses the provenance link to the source track and position

## Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| #049 Tool documentation model | Complete | Template at `shared/tools/TEMPLATE.md` |
| #053 Nested child selection | Complete | Defines selection path format |
| #041 Tool results data model | Complete | Defines ToolResponse, artifact types |
| Existing math in `range_bearing.py` | Complete | `_calculate_range()`, `_calculate_bearing()` |
| `track/measurement/` tool directory | Complete | Existing category with 19 tools |

## Open Questions

None — all research questions resolved.
