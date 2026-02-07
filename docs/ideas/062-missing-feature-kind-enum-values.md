# Add missing FeatureKindEnum values for tool migration

## Problem

The tool documentation effort (PR #193) identified 7 `FeatureKindEnum` values that 63 tool specifications and 151 golden I/O fixtures reference, but which don't yet exist in `shared/schemas/src/linkml/common.yaml`. This blocks implementation of 30+ tools that produce or consume features with these kinds.

## Proposed Solution

1. Add 7 new values to `FeatureKindEnum` in `common.yaml`:
   - `SENSOR` — sensor contact data (bearings, ranges, frequencies)
   - `TMA_SEGMENT` — Target Motion Analysis segment with estimated course/speed
   - `TRACK_SEGMENT` — sub-segment of a track (infill between known positions)
   - `TUAS_SOLUTION` — Target Under Active Sonar solution
   - `LIGHTWEIGHT_TRACK` — simplified track with fewer properties
   - `FREQUENCY_RESIDUALS` — frequency calibration residuals
   - `ZONE` — spatial zone/area for sensor analysis

2. Create corresponding Feature + Properties classes in `geojson.yaml`:
   - `SensorFeature` + `SensorProperties` (highest priority — 9+ tools)
   - `TMASegmentFeature` + `TMASegmentProperties` (5+ tools)
   - `TrackSegmentFeature` + `TrackSegmentProperties`
   - `TUASSolutionFeature` (may fold into TMA)
   - `LightweightTrackFeature`

3. Regenerate derived schemas (Pydantic, JSON Schema, TypeScript)

## Success Criteria

- All 7 values present in `FeatureKindEnum`
- Feature classes with required properties as documented in schema gap analysis
- Generated Pydantic models validate tool golden I/O fixtures
- Schema adherence tests pass (golden fixtures, round-trip, structural comparison)

## Constraints

- Must follow existing LinkML patterns in `shared/schemas/src/linkml/`
- Must maintain Article II (Schema Integrity) compliance
- `ZONE` may map to existing `CIRCLE` or `RECTANGLE` — needs design decision

## Out of Scope

- Tool implementation (separate backlog items)
- Extending `TimestampedPosition` with inter-feature properties (bearing, range, frequency) — separate design decision needed

## Reference

- Full analysis: `specs/001-document-debrief-algorithms/evidence/schema-gap-analysis.md`
- PR #193: tool documentation with 63 specs and 151 golden I/O pairs
