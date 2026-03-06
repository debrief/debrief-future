# Research: Move Track Tool (#079)

**Date**: 2026-03-06
**Feature**: 079-move-track

## Decision 1: Distance Units — Nautical Miles with Internal Conversion

**Decision**: Accept `range_nm` (nautical miles) as the user-facing parameter; convert internally to km for the Vincenty formula (`distance_km = range_nm * 1.852`).

**Rationale**: Maritime domain uses nautical miles universally. The E03 downstream tool (buffer-zone-generator #080) also uses nm. Consistency across the E03 cascade matters more than consistency with the move-shape tool's `distance_km` parameter.

**Alternatives considered**:
- `distance_km` (consistent with move-shape) — rejected because maritime analysts think in nm
- Accept both units — rejected as unnecessary complexity

## Decision 2: Vincenty Formula — Reuse from move-shape

**Decision**: Copy the `translate_point` function from `move_shape.py` into `move_track.py` (Python) and from `moveShape.ts` into `moveTrack.ts` (TypeScript). Do not extract to a shared utility.

**Rationale**: The function is ~15 lines. Extracting to a shared module creates coupling between unrelated tools. When tools are eventually reorganised, each should be self-contained. The TEMPLATE.md model keeps tools independent.

**Alternatives considered**:
- Shared `geo_utils` module — rejected; premature abstraction for 2 uses
- Import from move_shape — rejected; creates cross-tool dependency

## Decision 3: Result Type — `mutation/track/moved`

**Decision**: Use `mutation/track/moved` as the result subtype (full: `mutation/track/moved`).

**Rationale**: Follows the `{top_type}/{domain}/{specific_type}` convention. "moved" is clearer than "translated" for a track offset operation. Distinguishes from other track mutations like `track/courses_speeds`.

**Alternatives considered**:
- `mutation/track/translated` — rejected; "translated" is more mathematical, less intuitive for analysts
- `mutation/track/offset` — acceptable but "moved" is more natural language

## Decision 4: Coordinate Handling — Translate lon/lat Only, Preserve Rest

**Decision**: For each coordinate tuple `[lon, lat, alt, timestamp_ms]`, translate only the first two elements (longitude, latitude). Preserve altitude and timestamp unchanged. For compound tracks (MultiLineString), iterate all line segments.

**Rationale**: The move operation is a 2D geographic offset. Altitude and time are independent dimensions. This matches how move-shape handles extra coordinate data.

**Alternatives considered**:
- Strip extra coordinate components — rejected; destroys temporal data needed for E03 cascade
- Recalculate course/speed — not needed; downstream tools handle derived properties

## Decision 5: Context Type — MULTI

**Decision**: Use `ContextType.MULTI` to accept one or more track features.

**Rationale**: Consistent with move-shape. Allows bulk translation of multiple tracks in a single invocation. The E03 demo uses a single track, but the tool should be general-purpose.

**Alternatives considered**:
- `ContextType.SINGLE` — rejected; unnecessarily limits the tool

## Decision 6: Tool Registration — Standard __init__.py Chain

**Decision**: Create `move_track.py` in `services/calc/debrief_calc/tools/track/manipulation/` and add import to `__init__.py`. The `@tool` decorator auto-registers at import time.

**Rationale**: This is the established pattern. All existing tools follow it. No custom registration needed.

## Decision 7: TypeScript Implementation Location

**Decision**: Create `moveTrack.ts` in `apps/vscode/src/tools/track/manipulation/` following the moveShape pattern. Also create the web-shell equivalent.

**Rationale**: Both frontends need the tool. The VS Code extension has the tool directly; web-shell shares via the same import path pattern.

## Decision 8: Parameter Defaults

**Decision**: `direction` defaults to 90 (East), `range_nm` defaults to 5.

**Rationale**: 90° East is the move-shape convention. 5 nm is a reasonable default offset for maritime analysis at tactical scales.
